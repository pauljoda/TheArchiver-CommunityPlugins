import path from "path";
import fs from "fs";

import {
  execFileAsync,
  formatUnixTimestamp,
  type DownloadResult,
  type DownloadContext,
  type PluginLogger,
  type StringHelpers,
  type RedditPost,
  type ParsedRedditUrl,
  type MediaItem,
  type CleanComment,
  type MoreComments,
} from "./shared";

// =============================================================================
// URL Parser
// =============================================================================

export function parseRedditUrl(url: string): ParsedRedditUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // Normalize hostname
  const hostname = parsed.hostname.replace(/^(www\.|old\.)/, "");
  if (hostname !== "reddit.com") {
    return null;
  }

  // Split path into segments, filter empties
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  // /r/{sub}/comments/{id}/...
  if (
    segments.length >= 4 &&
    segments[0] === "r" &&
    segments[2] === "comments"
  ) {
    return {
      type: "post",
      subreddit: segments[1],
      postId: segments[3],
    };
  }

  // /comments/{id}/... (shorthand)
  if (segments.length >= 2 && segments[0] === "comments") {
    return {
      type: "post",
      postId: segments[1],
    };
  }

  // /gallery/{id}
  if (segments.length >= 2 && segments[0] === "gallery") {
    return {
      type: "post",
      postId: segments[1],
    };
  }

  // /u/{name} or /user/{name}
  if (
    segments.length >= 2 &&
    (segments[0] === "u" || segments[0] === "user")
  ) {
    return {
      type: "user",
      username: segments[1],
    };
  }

  // /r/{sub} (not followed by "comments")
  if (segments.length >= 2 && segments[0] === "r") {
    return {
      type: "subreddit",
      subreddit: segments[1],
    };
  }

  return null;
}

// =============================================================================
// Reddit API Client
// =============================================================================

const USER_AGENT = "TheArchiver/1.0 (reddit content archiver)";

// Rate-limited fetch function, initialized in downloadReddit() via helpers.http.createRateLimiter()
let redditFetch: ((url: string, options?: RequestInit & { logger?: PluginLogger }) => Promise<Response>) | null = null;

async function rateLimitedFetch(
  url: string,
  logger: PluginLogger
): Promise<unknown> {
  if (!redditFetch) {
    throw new Error("Reddit rate limiter not initialized — downloadReddit() must be called first");
  }

  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set("raw_json", "1");

  const fetchUrl = parsedUrl.toString();
  logger.info(`Fetching: ${fetchUrl}`);

  const res = await redditFetch(fetchUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    redirect: "follow",
    logger,
  });

  if (!res.ok) {
    throw new Error(`Reddit API returned ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

interface RedditListingResponse {
  kind: "Listing";
  data: {
    after: string | null;
    before: string | null;
    children: Array<{
      kind: string;
      data: RedditPost;
    }>;
  };
}

async function fetchAllPosts(
  baseJsonUrl: string,
  maxPosts: number,
  logger: PluginLogger
): Promise<RedditPost[]> {
  const effectiveMax = maxPosts === -1 ? 1000 : Math.min(maxPosts, 1000);
  const results: RedditPost[] = [];
  let after: string | null = null;
  let page = 0;

  while (results.length < effectiveMax) {
    page++;
    const url = new URL(baseJsonUrl);
    url.searchParams.set("limit", "100");
    if (after) {
      url.searchParams.set("after", after);
    }

    logger.info(
      `Fetching page ${page} (${results.length} posts so far)...`
    );
    const response = (await rateLimitedFetch(
      url.toString(),
      logger
    )) as RedditListingResponse;

    if (!response?.data?.children) {
      logger.warn("Unexpected response format, stopping pagination");
      break;
    }

    const posts = response.data.children
      .filter((child) => child.kind === "t3")
      .map((child) => child.data);

    if (posts.length === 0) {
      logger.info("No more posts found");
      break;
    }

    results.push(...posts);
    after = response.data.after;

    if (!after) {
      logger.info("Reached end of listing (no more pages)");
      break;
    }
  }

  // Trim to exact count
  return results.slice(0, effectiveMax);
}

// =============================================================================
// Media Extractor
// =============================================================================

function isGifVideoPost(post: RedditPost): boolean {
  // Reddit converts GIFs to silent MP4 videos — the fallback_url is a complete file
  const rv = post.media?.reddit_video;
  return (
    (post.is_video === true || post.post_hint === "hosted:video" || (post.domain === "v.redd.it" && !post.is_gallery)) &&
    (post.is_gif === true || rv?.is_gif === true || rv?.has_audio === false)
  );
}

function isVideoPost(post: RedditPost): boolean {
  return (
    post.is_video === true ||
    post.post_hint === "hosted:video" ||
    post.post_hint === "rich:video" ||
    (post.domain === "v.redd.it" && !post.is_gallery)
  );
}

async function downloadRedditVideo(
  post: RedditPost,
  postDir: string,
  helpers: DownloadContext["helpers"],
  logger: PluginLogger
): Promise<{ downloaded: boolean; filename: string }> {
  const sourcePost =
    post.crosspost_parent_list && post.crosspost_parent_list.length > 0
      ? post.crosspost_parent_list[0]
      : post;

  const rv = sourcePost.media?.reddit_video;
  if (!rv?.fallback_url) {
    return { downloaded: false, filename: "" };
  }

  // Preserve query string — Reddit requires it for authentication
  const parsedFallback = new URL(rv.fallback_url);
  const queryString = parsedFallback.search; // e.g. "?source=fallback"
  const fallbackNoQuery = `${parsedFallback.origin}${parsedFallback.pathname}`;
  const baseUrl = fallbackNoQuery.substring(0, fallbackNoQuery.lastIndexOf("/"));

  // Detect naming convention: Reddit uses CMAF_ (newer) or DASH_ (older)
  const videoFilename = path.basename(parsedFallback.pathname); // e.g. "CMAF_480.mp4" or "DASH_720.mp4"
  const prefix = videoFilename.startsWith("CMAF_") ? "CMAF" : "DASH";

  const videoTempPath = path.join(postDir, "Video-temp.mp4");
  const audioTempPath = path.join(postDir, "Audio-temp.mp4");
  const outputPath = path.join(postDir, "Video.mp4");

  // If already downloaded, skip
  if (await helpers.io.fileExists(outputPath)) {
    logger.info("Video already exists, skipping");
    return { downloaded: false, filename: "Video.mp4" };
  }

  await helpers.io.ensureDir(postDir);

  // Download video stream (use original fallback URL with query params)
  logger.info(`Downloading video stream: ${rv.fallback_url}`);
  await helpers.io.downloadFile(rv.fallback_url, videoTempPath);

  // Try to download audio stream — some videos genuinely have no audio
  // Try both CMAF and DASH naming patterns, with query string for auth
  const audioVariants = [
    `${prefix}_AUDIO_128.mp4`,
    `${prefix}_AUDIO_64.mp4`,
    // Also try the other convention as fallback
    `${prefix === "CMAF" ? "DASH" : "CMAF"}_AUDIO_128.mp4`,
    `${prefix === "CMAF" ? "DASH" : "CMAF"}_AUDIO_64.mp4`,
    "DASH_audio.mp4",
    "DASH_audio",
    "audio",
  ];

  let hasAudio = false;
  for (const audioFile of audioVariants) {
    try {
      const audioUrl = `${baseUrl}/${audioFile}${queryString}`;
      logger.info(`Trying audio: ${audioUrl}`);
      await helpers.io.downloadFile(audioUrl, audioTempPath);
      hasAudio = true;
      break;
    } catch {
      // continue trying next variant
    }
  }

  if (!hasAudio) {
    logger.info("No audio stream available — saving video-only");
  }

  if (hasAudio) {
    // Mux video + audio with ffmpeg
    try {
      logger.info("Muxing video and audio with ffmpeg");
      await execFileAsync("ffmpeg", [
        "-i", videoTempPath,
        "-i", audioTempPath,
        "-c", "copy",
        "-y",
        outputPath,
      ]);

      // Clean up temp files
      fs.unlinkSync(videoTempPath);
      fs.unlinkSync(audioTempPath);
    } catch (err) {
      logger.warn(`ffmpeg mux failed: ${err}. Saving video stream without audio.`);
      // Fall back to video-only
      fs.renameSync(videoTempPath, outputPath);
      try { fs.unlinkSync(audioTempPath); } catch { /* ignore */ }
    }
  } else {
    // No audio — just rename the video file
    fs.renameSync(videoTempPath, outputPath);
  }

  return { downloaded: true, filename: "Video.mp4" };
}

function extractMediaItems(
  post: RedditPost,
  stringHelpers: StringHelpers
): MediaItem[] {
  const { sanitizeFilename, truncateTitle, filenameFromUrl, getMimeExtension, decodeHtmlEntities, buildFilename } = stringHelpers;
  // Handle crossposts — the original post has the actual media
  const sourcePost =
    post.crosspost_parent_list && post.crosspost_parent_list.length > 0
      ? post.crosspost_parent_list[0]
      : post;

  // GIF/silent video posts — download fallback_url directly (no audio muxing needed)
  if (isGifVideoPost(sourcePost) && sourcePost.media?.reddit_video?.fallback_url) {
    return [{ url: sourcePost.media.reddit_video.fallback_url, filename: "Video.mp4" }];
  }

  // Regular videos with audio — handled by downloadRedditVideo(), not here
  if (isVideoPost(sourcePost)) {
    return [];
  }

  const items: MediaItem[] = [];

  // Gallery posts
  if (sourcePost.is_gallery && sourcePost.media_metadata) {
    const galleryItems = sourcePost.gallery_data?.items;
    const orderedIds: string[] = galleryItems
      ? galleryItems.map((item) => item.media_id)
      : Object.keys(sourcePost.media_metadata);

    // Build a caption lookup from gallery_data
    const captionMap = new Map<string, string>();
    if (galleryItems) {
      for (const item of galleryItems) {
        if (item.caption) captionMap.set(item.media_id, item.caption);
      }
    }

    let index = 0;
    for (const mediaId of orderedIds) {
      const meta = sourcePost.media_metadata[mediaId];
      if (!meta || meta.status !== "valid") continue;

      let imageUrl: string | undefined;
      if (meta.e === "AnimatedImage" && meta.s?.gif) {
        imageUrl = meta.s.gif;
      } else if (meta.s?.u) {
        imageUrl = meta.s.u;
      }

      if (!imageUrl) continue;
      imageUrl = decodeHtmlEntities(imageUrl);

      const ext = getMimeExtension(meta.m);
      index++;

      // Use caption if available, otherwise "Image N"
      const caption = captionMap.get(mediaId);
      let filename: string;
      if (caption) {
        filename = buildFilename(caption, ext, 80);
      } else {
        filename = `Image ${index}.${ext}`;
      }

      items.push({ url: imageUrl, filename });
    }
    return items;
  }

  // Direct image posts
  if (
    sourcePost.post_hint === "image" ||
    sourcePost.domain === "i.redd.it" ||
    sourcePost.domain === "i.imgur.com"
  ) {
    const imageUrl = sourcePost.url;
    // Try to use the original filename from the URL
    const originalName = filenameFromUrl(imageUrl);
    const filename = originalName || "Image 1.jpg";

    items.push({ url: imageUrl, filename });
    return items;
  }

  // Link posts with a Reddit-hosted preview image
  if (sourcePost.preview?.images?.[0]?.source?.url) {
    const previewUrl = decodeHtmlEntities(
      sourcePost.preview.images[0].source.url
    );
    try {
      const previewHost = new URL(previewUrl).hostname;
      if (
        previewHost === "i.redd.it" ||
        previewHost === "preview.redd.it"
      ) {
        const originalName = filenameFromUrl(previewUrl);
        const filename = originalName || "Image 1.jpg";

        items.push({ url: previewUrl, filename });
        return items;
      }
    } catch {
      // Invalid preview URL, skip
    }
  }

  // No downloadable media found
  return [];
}

// =============================================================================
// Metadata & Comments Writer
// =============================================================================

function buildPostNfo(post: RedditPost, sourceUrl: string, xmlEscape: (s: string) => string): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<postdetails>`,
    `  <title>${xmlEscape(post.title)}</title>`,
    `  <url>https://www.reddit.com${xmlEscape(post.permalink)}</url>`,
    `  <source_url>${xmlEscape(sourceUrl)}</source_url>`,
  ];

  const add = (tag: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "") {
      lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
    }
  };

  // Core post metadata
  add("id", post.id);
  add("fullname", post.name);
  add("author", post.author);
  add("subreddit", post.subreddit);
  add("subreddit_prefixed", post.subreddit_name_prefixed);
  add("domain", post.domain);
  add("score", post.score);
  add("upvote_ratio", post.upvote_ratio);
  add("num_comments", post.num_comments);
  add("created", formatUnixTimestamp(post.created_utc));

  if (typeof post.edited === "number" && post.edited > 0) {
    add("edited", formatUnixTimestamp(post.edited));
  }

  // Flags
  add("over_18", post.over_18);
  add("spoiler", post.spoiler);
  add("stickied", post.stickied);
  add("locked", post.locked);
  add("archived", post.archived);
  add("is_video", post.is_video);
  if (post.is_gallery) add("is_gallery", post.is_gallery);

  // Content classification
  if (post.post_hint) add("post_hint", post.post_hint);
  if (post.link_flair_text) add("flair", post.link_flair_text);
  if (post.author_flair_text) add("author_flair", post.author_flair_text);

  // Self-text / post body
  if (post.selftext && post.selftext.trim()) {
    lines.push(`  <selftext>${xmlEscape(post.selftext)}</selftext>`);
  }

  // Media URL
  if (post.url && post.url !== `https://www.reddit.com${post.permalink}`) {
    add("media_url", post.url);
  }

  // Thumbnail
  if (
    post.thumbnail &&
    post.thumbnail !== "self" &&
    post.thumbnail !== "default" &&
    post.thumbnail !== "nsfw" &&
    post.thumbnail !== "spoiler"
  ) {
    add("thumbnail", post.thumbnail);
  }

  // Awards
  add("total_awards", post.total_awards_received);
  if (post.all_awardings && post.all_awardings.length > 0) {
    lines.push(`  <awards>`);
    for (const award of post.all_awardings) {
      lines.push(
        `    <award name="${xmlEscape(award.name)}" count="${award.count}" />`
      );
    }
    lines.push(`  </awards>`);
  }

  // Gallery item captions
  if (post.gallery_data?.items) {
    const captioned = post.gallery_data.items.filter((i) => i.caption);
    if (captioned.length > 0) {
      lines.push(`  <gallery_captions>`);
      for (const item of captioned) {
        if (item.caption) {
          lines.push(
            `    <caption media_id="${xmlEscape(item.media_id)}">${xmlEscape(item.caption)}</caption>`
          );
        }
      }
      lines.push(`  </gallery_captions>`);
    }
  }

  // Video metadata (included even though we defer to yt-dlp, for reference)
  if (post.media?.reddit_video) {
    const rv = post.media.reddit_video;
    lines.push(`  <video>`);
    add("video_width", rv.width);
    add("video_height", rv.height);
    add("video_duration", rv.duration);
    lines.push(`  </video>`);
  }

  // Crosspost info
  if (
    post.crosspost_parent_list &&
    post.crosspost_parent_list.length > 0
  ) {
    const original = post.crosspost_parent_list[0];
    lines.push(`  <crosspost_from>`);
    lines.push(
      `    <original_id>${xmlEscape(original.id)}</original_id>`
    );
    lines.push(
      `    <original_subreddit>${xmlEscape(original.subreddit)}</original_subreddit>`
    );
    lines.push(
      `    <original_author>${xmlEscape(original.author)}</original_author>`
    );
    lines.push(
      `    <original_url>https://www.reddit.com${xmlEscape(original.permalink)}</original_url>`
    );
    lines.push(`  </crosspost_from>`);
  }

  lines.push(`</postdetails>`);
  return lines.join("\n") + "\n";
}

function processCommentTree(
  children: Array<{ kind: string; data: Record<string, unknown> }>
): Array<CleanComment | MoreComments> {
  const results: Array<CleanComment | MoreComments> = [];

  for (const child of children) {
    if (child.kind === "more") {
      const data = child.data as { count: number; children: string[] };
      if (data.count > 0) {
        results.push({
          kind: "more",
          count: data.count,
          children_ids: data.children || [],
        });
      }
      continue;
    }

    if (child.kind !== "t1") continue;

    const c = child.data as Record<string, unknown>;

    const comment: CleanComment = {
      author: (c.author as string) || "[deleted]",
      body: (c.body as string) || "",
      body_html: (c.body_html as string | null) || undefined,
      score: (c.score as number) || 0,
      created_utc: (c.created_utc as number) || 0,
      edited: (c.edited as boolean | number) || false,
      is_submitter: (c.is_submitter as boolean) || false,
      author_flair_text: (c.author_flair_text as string | null) || null,
      stickied: (c.stickied as boolean) || false,
      distinguished: (c.distinguished as string | null) || null,
      depth: (c.depth as number) || 0,
      replies: [],
    };

    // Recurse into replies
    const replies = c.replies as
      | {
          kind: string;
          data: {
            children: Array<{
              kind: string;
              data: Record<string, unknown>;
            }>;
          };
        }
      | ""
      | null;
    if (replies && typeof replies === "object" && replies.data?.children) {
      const nested = processCommentTree(replies.data.children);
      for (const item of nested) {
        if ("kind" in item && item.kind === "more") {
          // Attach "more" stubs at this level for visibility
          comment.replies.push(item as unknown as CleanComment);
        } else {
          comment.replies.push(item as CleanComment);
        }
      }
    }

    results.push(comment);
  }

  return results;
}

function writePostNfo(
  post: RedditPost,
  sourceUrl: string,
  postDir: string,
  logger: PluginLogger,
  xmlEscape: (s: string) => string
): void {
  const nfoPath = path.join(postDir, "Post.nfo");
  try {
    const content = buildPostNfo(post, sourceUrl, xmlEscape);
    fs.writeFileSync(nfoPath, content, "utf8");
    logger.info(`Wrote NFO: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write NFO: ${err}`);
  }
}

async function writePostComments(
  commentsData: unknown,
  postDir: string,
  logger: PluginLogger,
  context?: DownloadContext
): Promise<void> {
  const commentsPath = path.join(postDir, "Comments.json");

  try {
    // Reddit returns comments as response[1]
    const listing = commentsData as {
      kind: string;
      data: {
        children: Array<{
          kind: string;
          data: Record<string, unknown>;
        }>;
      };
    };

    if (!listing?.data?.children) {
      logger.warn("No comments data found");
      return;
    }

    const cleanComments = processCommentTree(listing.data.children);

    if (cleanComments.length === 0) {
      logger.info("No comments to save");
      return;
    }

    // Download comment media (giphy GIFs, images)
    if (context) {
      await downloadCommentMedia(
        cleanComments,
        postDir,
        context.helpers,
        context.maxDownloadThreads,
        logger
      );
    }

    fs.writeFileSync(
      commentsPath,
      JSON.stringify(cleanComments, null, 2),
      "utf8"
    );
    logger.info(
      `Wrote ${cleanComments.length} top-level comments: ${commentsPath}`
    );
  } catch (err) {
    logger.warn(`Failed to write comments: ${err}`);
  }
}

// =============================================================================
// Comment Media Download
// =============================================================================

/**
 * Extract media references from Reddit comment bodies.
 * Handles: ![gif](giphy|ID), ![gif](giphy|ID|variant), ![img](URL)
 * Returns an array of { key, url, filename } for each media item found.
 */
function extractCommentMedia(
  comments: Array<CleanComment | MoreComments>,
  sanitize: (s: string) => string
): Array<{ key: string; url: string; filename: string; comment: CleanComment }> {
  const items: Array<{ key: string; url: string; filename: string; comment: CleanComment }> = [];

  function walk(list: Array<CleanComment | MoreComments>): void {
    for (const item of list) {
      if ("kind" in item && (item as unknown as { kind: string }).kind === "more") continue;
      const comment = item as CleanComment;
      const body = comment.body || "";

      // Match ![gif](giphy|ID) or ![gif](giphy|ID|variant)
      const giphyRegex = /!\[gif\]\(giphy\|([a-zA-Z0-9]+)(?:\|[^)]+)?\)/g;
      let match;
      while ((match = giphyRegex.exec(body)) !== null) {
        const giphyId = match[1];
        const key = `giphy:${giphyId}`;
        const url = `https://i.giphy.com/media/${giphyId}/giphy.gif`;
        const filename = sanitize(`giphy_${giphyId}.gif`);
        items.push({ key, url, filename, comment });
      }

      // Match ![img](URL) with image extensions
      const imgRegex = /!\[img\]\((https?:\/\/[^)]+\.(?:jpe?g|png|gif|webp|avif|bmp)(?:\?[^)]*)?)\)/gi;
      while ((match = imgRegex.exec(body)) !== null) {
        const imgUrl = match[1];
        const key = `img:${imgUrl}`;
        const urlObj = new URL(imgUrl);
        const basename = path.basename(urlObj.pathname);
        const filename = sanitize(basename || `image_${items.length}.jpg`);
        items.push({ key, url: imgUrl, filename, comment });
      }

      if (comment.replies && comment.replies.length > 0) {
        walk(comment.replies);
      }
    }
  }

  walk(comments);
  return items;
}

/**
 * Download all media referenced in Reddit comments and update comments with local media mappings.
 */
async function downloadCommentMedia(
  comments: Array<CleanComment | MoreComments>,
  postDir: string,
  helpers: DownloadContext["helpers"],
  maxThreads: number,
  logger: PluginLogger
): Promise<void> {
  const mediaItems = extractCommentMedia(comments, helpers.string.sanitizeFilename);
  if (mediaItems.length === 0) return;

  const mediaDir = path.join(postDir, "comment_media");
  await helpers.io.ensureDir(mediaDir);

  // Deduplicate by filename
  const seen = new Set<string>();
  const downloads: Array<{ url: string; outputPath: string }> = [];

  for (const item of mediaItems) {
    // Initialize media map on the comment
    if (!item.comment.media) {
      item.comment.media = {};
    }
    item.comment.media[item.key] = item.filename;

    if (!seen.has(item.filename)) {
      seen.add(item.filename);
      const outputPath = path.join(mediaDir, item.filename);
      if (!(await helpers.io.fileExists(outputPath))) {
        downloads.push({ url: item.url, outputPath });
      }
    }
  }

  if (downloads.length > 0) {
    logger.info(`Downloading ${downloads.length} comment media files...`);
    try {
      await helpers.io.downloadFiles(downloads, maxThreads);
      logger.info(`Downloaded ${downloads.length} comment media files`);
    } catch (err) {
      logger.warn(`Some comment media downloads failed: ${err}`);
    }
  }
}

// =============================================================================
// Icon Fetchers
// =============================================================================

async function fetchAndSaveSubredditIcon(
  context: DownloadContext,
  subreddit: string,
  subredditDir: string
): Promise<void> {
  const { helpers, logger } = context;

  // Skip if icon already exists
  if (
    (await helpers.io.fileExists(path.join(subredditDir, "icon.jpg"))) ||
    (await helpers.io.fileExists(path.join(subredditDir, "icon.png")))
  ) {
    return;
  }

  try {
    const aboutUrl = `https://www.reddit.com/r/${subreddit}/about.json`;
    const response = (await rateLimitedFetch(aboutUrl, logger)) as {
      data?: {
        community_icon?: string;
        icon_img?: string;
        header_img?: string;
      };
    };

    if (!response?.data) return;

    // Try community_icon first (higher res), then icon_img, then header_img
    let iconUrl =
      response.data.community_icon ||
      response.data.icon_img ||
      response.data.header_img;

    if (!iconUrl) return;

    // Reddit sometimes HTML-encodes the URL
    iconUrl = iconUrl.replace(/&amp;/g, "&").split("?")[0];
    if (!iconUrl || iconUrl === "null" || iconUrl === "") return;

    const ext = iconUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const iconPath = path.join(subredditDir, `icon.${ext}`);

    await helpers.io.ensureDir(subredditDir);
    await helpers.io.downloadFile(iconUrl, iconPath);
    logger.info(`Saved subreddit icon for r/${subreddit}`);
  } catch (err) {
    logger.warn(`Failed to fetch icon for r/${subreddit}: ${err}`);
  }
}

async function fetchAndSaveUserIcon(
  context: DownloadContext,
  username: string,
  userDir: string
): Promise<void> {
  const { helpers, logger } = context;

  // Skip if icon already exists
  if (
    (await helpers.io.fileExists(path.join(userDir, "icon.jpg"))) ||
    (await helpers.io.fileExists(path.join(userDir, "icon.png")))
  ) {
    return;
  }

  try {
    const aboutUrl = `https://www.reddit.com/user/${username}/about.json`;
    const response = (await rateLimitedFetch(aboutUrl, logger)) as {
      data?: {
        icon_img?: string;
        snoovatar_img?: string;
      };
    };

    if (!response?.data) return;

    let iconUrl = response.data.snoovatar_img || response.data.icon_img;

    if (!iconUrl) return;

    iconUrl = iconUrl.replace(/&amp;/g, "&").split("?")[0];
    if (!iconUrl || iconUrl === "null" || iconUrl === "") return;

    const ext = iconUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const iconPath = path.join(userDir, `icon.${ext}`);

    await helpers.io.ensureDir(userDir);
    await helpers.io.downloadFile(iconUrl, iconPath);
    logger.info(`Saved user icon for u/${username}`);
  } catch (err) {
    logger.warn(`Failed to fetch icon for u/${username}: ${err}`);
  }
}

// =============================================================================
// Download Handlers
// =============================================================================

function postFolderName(
  post: RedditPost,
  stringHelpers: StringHelpers
): string {
  const safeTitle = stringHelpers.sanitizeFilename(stringHelpers.truncateTitle(post.title, 100));
  return safeTitle || post.id;
}

async function downloadPostToFolder(
  context: DownloadContext,
  post: RedditPost,
  postDir: string,
  sourceUrl: string,
  saveMetadata: boolean,
  fetchComments: boolean
): Promise<{ downloaded: number; skipped: number; isVideo: boolean; metadataSaved: boolean }> {
  const { helpers, logger } = context;

  if (isVideoPost(post) && !isGifVideoPost(post)) {
    // Download video with audio muxing via ffmpeg
    await helpers.io.ensureDir(postDir);
    writePostNfo(post, sourceUrl, postDir, logger, helpers.string.xmlEscape);
    if (fetchComments) {
      try {
        const commentUrl = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`;
        const commentResponse = (await rateLimitedFetch(
          commentUrl,
          logger
        )) as unknown[];
        if (Array.isArray(commentResponse) && commentResponse.length >= 2) {
          await writePostComments(commentResponse[1], postDir, logger, context);
        }
      } catch (err) {
        logger.warn(`Failed to fetch comments for post ${post.id}: ${err}`);
      }
    }
    const videoResult = await downloadRedditVideo(post, postDir, helpers, logger);
    return { downloaded: videoResult.downloaded ? 1 : 0, skipped: videoResult.downloaded ? 0 : 1, isVideo: true, metadataSaved: true };
  }

  const mediaItems = extractMediaItems(post, helpers.string);

  // Always create folder and save metadata — text-only and link posts are valuable content
  await helpers.io.ensureDir(postDir);

  // Always save metadata (Post.nfo) — this is the post's primary record
  writePostNfo(post, sourceUrl, postDir, logger, helpers.string.xmlEscape);

  if (fetchComments) {
    try {
      const commentUrl = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`;
      const commentResponse = (await rateLimitedFetch(
        commentUrl,
        logger
      )) as unknown[];
      if (Array.isArray(commentResponse) && commentResponse.length >= 2) {
        await writePostComments(commentResponse[1], postDir, logger, context);
      }
    } catch (err) {
      logger.warn(`Failed to fetch comments for post ${post.id}: ${err}`);
    }
  }

  if (mediaItems.length === 0) {
    return { downloaded: 0, skipped: 0, isVideo: false, metadataSaved: true };
  }

  const downloads: Array<{ url: string; outputPath: string }> = [];
  let skipped = 0;

  for (const item of mediaItems) {
    const outputPath = path.join(postDir, item.filename);
    if (await helpers.io.fileExists(outputPath)) {
      logger.info(`Already exists, skipping: ${item.filename}`);
      skipped++;
    } else {
      downloads.push({ url: item.url, outputPath });
    }
  }

  if (downloads.length > 0) {
    await helpers.io.downloadFiles(downloads, context.maxDownloadThreads);
  }

  return { downloaded: downloads.length, skipped, isVideo: false, metadataSaved: true };
}

async function handleSinglePost(
  context: DownloadContext,
  parsed: ParsedRedditUrl
): Promise<DownloadResult> {
  const { rootDirectory, helpers, logger, settings, url: sourceUrl } = context;
  const saveDir = settings.get("save_directory") || "Socials";
  const redditSubfolder = settings.get("reddit_subfolder") || "Reddit";
  const saveMetadata = settings.get("save_metadata") !== "false";

  // Build the JSON URL for this post
  let jsonUrl: string;
  if (parsed.subreddit && parsed.postId) {
    jsonUrl = `https://www.reddit.com/r/${parsed.subreddit}/comments/${parsed.postId}.json`;
  } else if (parsed.postId) {
    jsonUrl = `https://www.reddit.com/comments/${parsed.postId}.json`;
  } else {
    return {
      success: false,
      message: "Could not determine post ID from URL",
    };
  }

  logger.info(`Fetching post: ${jsonUrl}`);
  const response = (await rateLimitedFetch(jsonUrl, logger)) as unknown[];

  if (!Array.isArray(response) || response.length < 1) {
    return {
      success: false,
      message:
        "Unexpected response from Reddit. The post may be private or deleted.",
    };
  }

  const postListing = response[0] as RedditListingResponse;
  if (!postListing?.data?.children?.[0]?.data) {
    return {
      success: false,
      message: "Could not find post data in Reddit response",
    };
  }

  const post = postListing.data.children[0].data;

  const folderName = postFolderName(post, helpers.string);
  const postDir = path.join(rootDirectory, saveDir, redditSubfolder, post.subreddit, folderName);

  // Always create folder and save metadata — every post is worth archiving
  await helpers.io.ensureDir(postDir);
  writePostNfo(post, sourceUrl, postDir, logger, helpers.string.xmlEscape);

  if (response.length >= 2) {
    await writePostComments(response[1], postDir, logger, context);
  }

  if (isVideoPost(post) && !isGifVideoPost(post)) {
    const videoResult = await downloadRedditVideo(post, postDir, helpers, logger);
    if (videoResult.downloaded) {
      await fetchAndSaveSubredditIcon(context, post.subreddit, path.join(rootDirectory, saveDir, redditSubfolder, post.subreddit));
      return {
        success: true,
        message: `Downloaded video "${post.title}" with metadata and comments`,
      };
    }
    return {
      success: true,
      message: `Video already archived for "${post.title}"`,
    };
  }

  const mediaItems = extractMediaItems(post, helpers.string);

  if (mediaItems.length === 0) {
    const postType = post.selftext?.trim()
      ? "text"
      : post.domain
        ? "link"
        : "text";
    return {
      success: true,
      message: `Archived ${postType} post "${post.title}" with metadata and comments`,
    };
  }

  const downloads: Array<{ url: string; outputPath: string }> = [];
  let skipped = 0;

  for (const item of mediaItems) {
    const outputPath = path.join(postDir, item.filename);
    if (await helpers.io.fileExists(outputPath)) {
      logger.info(`Already exists, skipping: ${item.filename}`);
      skipped++;
    } else {
      downloads.push({ url: item.url, outputPath });
    }
  }

  if (downloads.length > 0) {
    logger.info(`Downloading ${downloads.length} file(s) to: ${postDir}`);
    await helpers.io.downloadFiles(downloads, context.maxDownloadThreads);
  }

  const parts: string[] = [];
  parts.push(`Downloaded ${downloads.length} file(s) from "${post.title}"`);
  if (skipped > 0) parts.push(`${skipped} already existed`);
  parts.push("metadata saved");

  // Best-effort: save subreddit icon
  await fetchAndSaveSubredditIcon(context, post.subreddit, path.join(rootDirectory, saveDir, redditSubfolder, post.subreddit));

  return { success: true, message: parts.join(". ") };
}

async function handleUserProfile(
  context: DownloadContext,
  parsed: ParsedRedditUrl
): Promise<DownloadResult> {
  const { rootDirectory, helpers, logger, settings, url: sourceUrl } = context;
  const saveDir = settings.get("save_directory") || "Socials";
  const redditSubfolder = settings.get("reddit_subfolder") || "Reddit";
  const saveMetadata = settings.get("save_metadata") !== "false";
  const postCountStr = settings.get("subreddit_post_count");
  const postCount = postCountStr ? parseInt(postCountStr, 10) : 100;

  const username = parsed.username;
  if (!username) {
    return {
      success: false,
      message: "Could not determine username from URL",
    };
  }

  logger.info(`Fetching posts by u/${username}...`);
  const baseUrl = `https://www.reddit.com/user/${username}/submitted.json`;
  const posts = await fetchAllPosts(baseUrl, postCount, logger);

  if (posts.length === 0) {
    return {
      success: false,
      message: `No posts found for u/${username}. The user may not exist or has no submissions.`,
    };
  }

  logger.info(`Found ${posts.length} posts by u/${username}`);

  // Socials/Reddit/{username}/{subreddit}/{Post Title}/
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let videoPosts = 0;
  let totalArchived = 0;
  const subredditsFound = new Set<string>();

  for (const post of posts) {
    subredditsFound.add(post.subreddit);

    const folderName = postFolderName(post, helpers.string);
    const postDir = path.join(
      rootDirectory,
      saveDir,
      redditSubfolder,
      username,
      post.subreddit,
      folderName
    );

    const result = await downloadPostToFolder(
      context,
      post,
      postDir,
      sourceUrl,
      saveMetadata,
      saveMetadata
    );

    totalArchived++;
    if (result.isVideo) videoPosts++;
    totalDownloaded += result.downloaded;
    totalSkipped += result.skipped;
  }

  // Fetch and save user icon
  await fetchAndSaveUserIcon(context, username, path.join(rootDirectory, saveDir, redditSubfolder, username));

  const parts: string[] = [
    `u/${username}: Archived ${totalArchived} posts (${totalDownloaded} media files downloaded)`,
  ];
  if (totalSkipped > 0) parts.push(`${totalSkipped} already existed`);
  if (videoPosts > 0)
    parts.push(`${videoPosts} video post(s) (metadata saved, use yt-dlp for video)`);
  parts.push(
    `across ${subredditsFound.size} subreddit(s): ${Array.from(subredditsFound).slice(0, 10).join(", ")}${subredditsFound.size > 10 ? "..." : ""}`
  );

  return { success: true, message: parts.join(". ") };
}

async function handleSubreddit(
  context: DownloadContext,
  parsed: ParsedRedditUrl
): Promise<DownloadResult> {
  const { rootDirectory, helpers, logger, settings, url: sourceUrl } = context;
  const saveDir = settings.get("save_directory") || "Socials";
  const redditSubfolder = settings.get("reddit_subfolder") || "Reddit";
  const saveMetadata = settings.get("save_metadata") !== "false";
  const sort = settings.get("subreddit_sort") || "hot";
  const timeFilter = settings.get("subreddit_time_filter") || "all";
  const postCountStr = settings.get("subreddit_post_count");
  const postCount = postCountStr ? parseInt(postCountStr, 10) : 100;

  const subreddit = parsed.subreddit;
  if (!subreddit) {
    return {
      success: false,
      message: "Could not determine subreddit name from URL",
    };
  }

  logger.info(
    `Fetching r/${subreddit} (sort: ${sort}, time: ${timeFilter}, count: ${postCount})...`
  );

  let baseUrl = `https://www.reddit.com/r/${subreddit}/${sort}.json`;
  if (sort === "top") {
    baseUrl += `?t=${timeFilter}`;
  }

  const posts = await fetchAllPosts(baseUrl, postCount, logger);

  if (posts.length === 0) {
    return {
      success: false,
      message: `No posts found in r/${subreddit}. The subreddit may not exist or is empty.`,
    };
  }

  logger.info(`Found ${posts.length} posts in r/${subreddit}`);

  // Socials/Reddit/{subreddit}/{Post Title}/
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let videoPosts = 0;
  let totalArchived = 0;

  for (const post of posts) {
    const folderName = postFolderName(post, helpers.string);
    const postDir = path.join(rootDirectory, saveDir, redditSubfolder, subreddit, folderName);

    const result = await downloadPostToFolder(
      context,
      post,
      postDir,
      sourceUrl,
      saveMetadata,
      saveMetadata
    );

    totalArchived++;
    if (result.isVideo) videoPosts++;
    totalDownloaded += result.downloaded;
    totalSkipped += result.skipped;
  }

  // Fetch and save subreddit icon
  await fetchAndSaveSubredditIcon(context, subreddit, path.join(rootDirectory, saveDir, redditSubfolder, subreddit));

  const parts: string[] = [
    `r/${subreddit}: Archived ${totalArchived} posts (${totalDownloaded} media files downloaded)`,
  ];
  if (totalSkipped > 0) parts.push(`${totalSkipped} already existed`);
  if (videoPosts > 0)
    parts.push(`${videoPosts} video post(s) (metadata saved, use yt-dlp for video)`);

  return { success: true, message: parts.join(". ") };
}

// =============================================================================
// Main Export
// =============================================================================

export async function downloadReddit(context: DownloadContext): Promise<DownloadResult> {
  const { url, logger, helpers } = context;

  // Initialize the rate-limited fetch for Reddit API calls
  redditFetch = helpers.http.createRateLimiter({
    minIntervalMs: 6500,
    retryOnStatus: [429],
    retryDelayMs: 60000,
  });

  const redditParsed = parseRedditUrl(url);
  if (!redditParsed) {
    return {
      success: false,
      message: "URL not recognized as a Reddit URL",
    };
  }

  logger.info(`Reddit plugin processing: ${url}`);
  try {
    switch (redditParsed.type) {
      case "post":
        return await handleSinglePost(context, redditParsed);
      case "user":
        return await handleUserProfile(context, redditParsed);
      case "subreddit":
        return await handleSubreddit(context, redditParsed);
      default:
        return {
          success: false,
          message: "Unrecognized Reddit URL type",
        };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Reddit plugin error: ${errorMsg}`);

    if (errorMsg.includes("403")) {
      return {
        success: false,
        message:
          "Reddit returned 403 Forbidden. The content may be private, quarantined, or age-restricted.",
      };
    }
    if (errorMsg.includes("404")) {
      return {
        success: false,
        message:
          "Reddit returned 404 Not Found. The post, user, or subreddit may not exist or has been deleted.",
      };
    }

    return {
      success: false,
      message: `Reddit download failed: ${errorMsg}`,
    };
  }
}
