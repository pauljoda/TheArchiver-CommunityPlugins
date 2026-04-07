import path from "path";
import fs from "fs";

import {
  type DownloadResult,
  type DownloadContext,
  type PluginLogger,
  type StringHelpers,
  type MediaItem,
  type BlueskyPost,
  type BlueskyEmbedView,
  type BlueskyFeedResponse,
  type BlueskyProfileResponse,
  type BlueskyThreadNode,
  type CleanBlueskyReply,
  type ParsedBlueskyUrl,
} from "./shared";

// =============================================================================
// URL Parser
// =============================================================================

export function parseBlueskyUrl(url: string): ParsedBlueskyUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  if (hostname !== "bsky.app") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);

  // /profile/{handle}/post/{rkey}
  if (
    segments.length >= 4 &&
    segments[0] === "profile" &&
    segments[2] === "post"
  ) {
    return {
      type: "post",
      handle: segments[1],
      rkey: segments[3],
    };
  }

  // /profile/{handle}
  if (segments.length >= 2 && segments[0] === "profile") {
    return {
      type: "profile",
      handle: segments[1],
    };
  }

  return null;
}

// =============================================================================
// Bluesky API Client
// =============================================================================

const BLUESKY_API_BASE = "https://public.api.bsky.app";

// Rate-limited fetch function, initialized in downloadBluesky() via helpers.http.createRateLimiter()
let blueskyFetch: ((url: string, options?: RequestInit & { logger?: PluginLogger }) => Promise<Response>) | null = null;

async function fetchBlueskyJson(
  endpoint: string,
  params: Record<string, string>,
  logger: PluginLogger
): Promise<unknown> {
  if (!blueskyFetch) {
    throw new Error("Bluesky rate limiter not initialized — downloadBluesky() must be called first");
  }

  const url = new URL(`${BLUESKY_API_BASE}/xrpc/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const fetchUrl = url.toString();
  logger.info(`Fetching: ${fetchUrl}`);

  const res = await blueskyFetch(fetchUrl, {
    headers: {
      Accept: "application/json",
    },
    logger,
  });

  if (!res.ok) {
    throw new Error(`Bluesky API returned ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

async function fetchBlueskyProfile(
  handle: string,
  logger: PluginLogger
): Promise<BlueskyProfileResponse> {
  const data = await fetchBlueskyJson(
    "app.bsky.actor.getProfile",
    { actor: handle },
    logger
  );
  return data as BlueskyProfileResponse;
}

async function fetchBlueskyAuthorFeed(
  handle: string,
  limit: number,
  logger: PluginLogger
): Promise<BlueskyPost[]> {
  const effectiveMax = limit === -1 ? 10000 : limit;
  const results: BlueskyPost[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (results.length < effectiveMax) {
    page++;
    const params: Record<string, string> = {
      actor: handle,
      limit: String(Math.min(50, effectiveMax - results.length)),
      filter: "posts_no_replies",
    };
    if (cursor) params.cursor = cursor;

    logger.info(
      `Fetching Bluesky feed page ${page} (${results.length} posts so far)...`
    );

    const response = (await fetchBlueskyJson(
      "app.bsky.feed.getAuthorFeed",
      params,
      logger
    )) as BlueskyFeedResponse;

    if (!response?.feed || response.feed.length === 0) {
      logger.info("No more posts found");
      break;
    }

    // Filter out reposts — only keep original posts by this author
    for (const item of response.feed) {
      if (!item.reason && item.post.author.handle === handle) {
        results.push(item.post);
      }
    }

    cursor = response.cursor;
    if (!cursor) {
      logger.info("Reached end of feed (no more pages)");
      break;
    }
  }

  return results.slice(0, effectiveMax);
}

async function fetchBlueskyPostThread(
  handle: string,
  rkey: string,
  logger: PluginLogger,
  depth: number = 0
): Promise<{ post: BlueskyPost; thread: BlueskyThreadNode }> {
  const atUri = `at://${handle}/app.bsky.feed.post/${rkey}`;
  logger.info(`Fetching Bluesky post thread: ${atUri} (depth: ${depth})`);

  const response = (await fetchBlueskyJson(
    "app.bsky.feed.getPostThread",
    { uri: atUri, depth: String(depth), parentHeight: "0" },
    logger
  )) as { thread: BlueskyThreadNode };

  if (!response?.thread?.post) {
    throw new Error("Could not find post in thread response");
  }

  return { post: response.thread.post, thread: response.thread };
}

// =============================================================================
// Reply Processing
// =============================================================================

function processBlueskyReplies(
  replies: BlueskyThreadNode[] | undefined,
  depth: number = 0
): CleanBlueskyReply[] {
  if (!replies || replies.length === 0) return [];

  const results: CleanBlueskyReply[] = [];

  for (const node of replies) {
    if (node.notFound || node.blocked || !node.post) continue;

    const post = node.post;
    const reply: CleanBlueskyReply = {
      author: post.author.handle,
      displayName: post.author.displayName,
      avatarUrl: post.author.avatar,
      text: post.record.text,
      createdAt: post.record.createdAt,
      likeCount: post.likeCount ?? 0,
      repostCount: post.repostCount ?? 0,
      replyCount: post.replyCount ?? 0,
      depth,
      replies: [],
    };

    if (post.record.facets && post.record.facets.length > 0) {
      reply.facets = post.record.facets;
    }

    // Recurse into child replies
    if (node.replies && node.replies.length > 0) {
      reply.replies = processBlueskyReplies(node.replies, depth + 1);
    }

    results.push(reply);
  }

  return results;
}

async function writeBlueskyReplies(
  thread: BlueskyThreadNode,
  postDir: string,
  logger: PluginLogger,
  context?: DownloadContext
): Promise<void> {
  const repliesPath = path.join(postDir, "Replies.json");

  try {
    const replies = processBlueskyReplies(thread.replies);

    if (replies.length === 0) {
      return;
    }

    // Download reply media (images embedded in replies)
    if (context) {
      await downloadBlueskyReplyMedia(
        thread,
        replies,
        postDir,
        context.helpers,
        context.maxDownloadThreads,
        logger
      );
    }

    fs.writeFileSync(repliesPath, JSON.stringify(replies, null, 2), "utf8");
    logger.info(`Wrote ${replies.length} top-level replies: ${repliesPath}`);
  } catch (err) {
    logger.warn(`Failed to write replies: ${err}`);
  }
}

// =============================================================================
// Media Extractor
// =============================================================================

function buildBlobUrl(did: string, cid: string): string {
  return `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

function extractBlueskyVideo(
  videoEmbed: BlueskyEmbedView,
  post: BlueskyPost,
  items: MediaItem[]
): void {
  const did = post.author?.did;
  const isGif = videoEmbed.presentation === "gif";
  const filename = isGif ? "Video.gif.mp4" : "Video.mp4";

  // Priority 1: Use CID from embed view (same as blob CID)
  if (videoEmbed.cid && did) {
    items.push({ url: buildBlobUrl(did, videoEmbed.cid), filename });
  }
  // Priority 2: Use blob ref from the post record
  else if (post.record?.embed?.video?.ref?.$link && did) {
    items.push({ url: buildBlobUrl(did, post.record.embed.video.ref.$link), filename });
  }
  // Priority 3: Extract DID/CID from playlist URL
  else if (videoEmbed.playlist) {
    try {
      const playlistUrl = new URL(videoEmbed.playlist);
      const segments = playlistUrl.pathname.split("/").filter(Boolean);
      // segments: ["watch", DID (percent-encoded), CID, "playlist.m3u8"]
      if (segments.length >= 3) {
        const playlistDid = decodeURIComponent(segments[1]);
        const playlistCid = decodeURIComponent(segments[2]);
        items.push({ url: buildBlobUrl(playlistDid, playlistCid), filename });
      }
    } catch {
      // ignore parse failure
    }
  }

  // Also save thumbnail as a preview
  if (videoEmbed.thumbnail) {
    items.push({ url: videoEmbed.thumbnail, filename: "Video Thumbnail.jpg" });
  }
}

function extractBlueskyMediaItems(
  post: BlueskyPost,
  stringHelpers: StringHelpers
): MediaItem[] {
  const { buildFilename } = stringHelpers;
  const embed = post.embed;
  if (!embed) return [];

  const items: MediaItem[] = [];

  function extractImages(emb: BlueskyEmbedView): void {
    if (
      emb.$type === "app.bsky.embed.images#view" &&
      emb.images
    ) {
      let index = 0;
      for (const img of emb.images) {
        index++;
        const url = img.fullsize;
        if (!url) continue;

        // Try to get extension from URL
        let ext = "jpg";
        try {
          const pathname = new URL(url).pathname;
          const urlExt = pathname.split(".").pop()?.toLowerCase();
          if (urlExt && ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(urlExt)) {
            ext = urlExt === "jpeg" ? "jpg" : urlExt;
          }
        } catch {
          // ignore
        }

        const altName = img.alt?.trim();
        const filename = altName
          ? buildFilename(altName, ext, 60)
          : `Image ${index}.${ext}`;

        items.push({ url, filename });
      }
    }
  }

  // Direct images embed
  extractImages(embed);

  // External link thumbnail
  if (
    embed.$type === "app.bsky.embed.external#view" &&
    embed.external?.thumb
  ) {
    items.push({ url: embed.external.thumb, filename: "Thumbnail.jpg" });
  }

  // Record with media (quote post + images)
  if (
    embed.$type === "app.bsky.embed.recordWithMedia#view" &&
    embed.media
  ) {
    extractImages(embed.media);
    // Also check for external thumbnail in media portion
    if (
      embed.media.$type === "app.bsky.embed.external#view" &&
      embed.media.external?.thumb
    ) {
      items.push({ url: embed.media.external.thumb, filename: "Thumbnail.jpg" });
    }
    // Video in quote post
    if (embed.media.$type === "app.bsky.embed.video#view") {
      extractBlueskyVideo(embed.media, post, items);
    }
  }

  // Video — download actual video via getBlob, fall back to thumbnail
  if (embed.$type === "app.bsky.embed.video#view") {
    extractBlueskyVideo(embed, post, items);
  }

  return items;
}

// =============================================================================
// Reply Media Download
// =============================================================================

/**
 * Extract image URLs from Bluesky reply embeds and build download items.
 */
function extractBlueskyReplyMedia(
  replies: BlueskyThreadNode[] | undefined,
  sanitize: (s: string) => string,
  prefix: string = ""
): Array<{ url: string; filename: string; replyPath: string }> {
  if (!replies || replies.length === 0) return [];

  const items: Array<{ url: string; filename: string; replyPath: string }> = [];

  for (let i = 0; i < replies.length; i++) {
    const node = replies[i];
    if (node.notFound || node.blocked || !node.post) continue;

    const replyPath = prefix ? `${prefix}.${i}` : `${i}`;
    const embed = node.post.embed;

    // Check for image embeds
    if (embed?.images && embed.images.length > 0) {
      for (let j = 0; j < embed.images.length; j++) {
        const img = embed.images[j];
        const url = img.fullsize || img.thumb;
        if (!url) continue;
        // Extract extension from URL or default to jpg
        let ext = "jpg";
        try {
          const urlPath = new URL(url).pathname;
          const urlExt = path.extname(urlPath).replace(".", "");
          if (urlExt) ext = urlExt;
        } catch { /* use default */ }
        const filename = sanitize(`reply_${replyPath}_${j}.${ext}`);
        items.push({ url, filename, replyPath });
      }
    }

    // Also check media embed (for recordWithMedia types)
    if (embed?.media?.images && embed.media.images.length > 0) {
      for (let j = 0; j < embed.media.images.length; j++) {
        const img = embed.media.images[j];
        const url = img.fullsize || img.thumb;
        if (!url) continue;
        let ext = "jpg";
        try {
          const urlPath = new URL(url).pathname;
          const urlExt = path.extname(urlPath).replace(".", "");
          if (urlExt) ext = urlExt;
        } catch { /* use default */ }
        const filename = sanitize(`reply_${replyPath}_${j}.${ext}`);
        items.push({ url, filename, replyPath });
      }
    }

    // Recurse
    if (node.replies && node.replies.length > 0) {
      items.push(...extractBlueskyReplyMedia(node.replies, sanitize, replyPath));
    }
  }

  return items;
}

/**
 * Assign downloaded image filenames to CleanBlueskyReply objects based on reply path.
 */
function assignBlueskyReplyImages(
  replies: CleanBlueskyReply[],
  mediaMap: Map<string, string[]>,
  prefix: string = ""
): void {
  for (let i = 0; i < replies.length; i++) {
    const replyPath = prefix ? `${prefix}.${i}` : `${i}`;
    const images = mediaMap.get(replyPath);
    if (images && images.length > 0) {
      replies[i].images = images;
    }
    if (replies[i].replies && replies[i].replies.length > 0) {
      assignBlueskyReplyImages(replies[i].replies, mediaMap, replyPath);
    }
  }
}

/**
 * Download Bluesky reply media and update reply objects with local filenames.
 */
async function downloadBlueskyReplyMedia(
  thread: BlueskyThreadNode,
  cleanReplies: CleanBlueskyReply[],
  postDir: string,
  helpers: DownloadContext["helpers"],
  maxThreads: number,
  logger: PluginLogger
): Promise<void> {
  const mediaItems = extractBlueskyReplyMedia(thread.replies, helpers.string.sanitizeFilename);
  if (mediaItems.length === 0) return;

  const mediaDir = path.join(postDir, "reply_media");
  await helpers.io.ensureDir(mediaDir);

  // Build a map of replyPath -> filenames
  const mediaMap = new Map<string, string[]>();
  const downloads: Array<{ url: string; outputPath: string }> = [];

  for (const item of mediaItems) {
    if (!mediaMap.has(item.replyPath)) {
      mediaMap.set(item.replyPath, []);
    }
    mediaMap.get(item.replyPath)!.push(item.filename);

    const outputPath = path.join(mediaDir, item.filename);
    if (!(await helpers.io.fileExists(outputPath))) {
      downloads.push({ url: item.url, outputPath });
    }
  }

  // Assign filenames to clean replies
  assignBlueskyReplyImages(cleanReplies, mediaMap);

  if (downloads.length > 0) {
    logger.info(`Downloading ${downloads.length} reply media files...`);
    try {
      await helpers.io.downloadFiles(downloads, maxThreads);
      logger.info(`Downloaded ${downloads.length} reply media files`);
    } catch (err) {
      logger.warn(`Some reply media downloads failed: ${err}`);
    }
  }
}

// =============================================================================
// NFO Writer
// =============================================================================

function buildBlueskyPostNfo(post: BlueskyPost, sourceUrl: string, xmlEscape: (s: string) => string): string {
  const rkey = post.uri.split("/").pop() || "";
  const postUrl = `https://bsky.app/profile/${post.author.handle}/post/${rkey}`;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<blueskypost>`,
    `  <text>${xmlEscape(post.record.text)}</text>`,
    `  <url>${xmlEscape(postUrl)}</url>`,
    `  <source_url>${xmlEscape(sourceUrl)}</source_url>`,
  ];

  const add = (tag: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "") {
      lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
    }
  };

  add("uri", post.uri);
  add("cid", post.cid);
  add("handle", post.author.handle);
  add("did", post.author.did);
  add("display_name", post.author.displayName);
  add("avatar_url", post.author.avatar);
  add("created", post.record.createdAt);
  add("indexed_at", post.indexedAt);
  add("like_count", post.likeCount ?? 0);
  add("reply_count", post.replyCount ?? 0);
  add("repost_count", post.repostCount ?? 0);
  add("quote_count", post.quoteCount ?? 0);

  // Is this a reply?
  if (post.record.reply) {
    lines.push(`  <reply>`);
    add("parent_uri", post.record.reply.parent.uri);
    add("root_uri", post.record.reply.root.uri);
    lines.push(`  </reply>`);
  }

  // Facets (rich text annotations)
  if (post.record.facets && post.record.facets.length > 0) {
    lines.push(`  <facets>`);
    for (const facet of post.record.facets) {
      for (const feature of facet.features) {
        if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
          lines.push(
            `    <facet type="link" byte_start="${facet.index.byteStart}" byte_end="${facet.index.byteEnd}" uri="${xmlEscape(feature.uri)}" />`
          );
        } else if (feature.$type === "app.bsky.richtext.facet#mention" && feature.did) {
          lines.push(
            `    <facet type="mention" byte_start="${facet.index.byteStart}" byte_end="${facet.index.byteEnd}" did="${xmlEscape(feature.did)}" />`
          );
        } else if (feature.$type === "app.bsky.richtext.facet#tag" && feature.tag) {
          lines.push(
            `    <facet type="tag" byte_start="${facet.index.byteStart}" byte_end="${facet.index.byteEnd}" tag="${xmlEscape(feature.tag)}" />`
          );
        }
      }
    }
    lines.push(`  </facets>`);
  }

  // Embed metadata
  const embed = post.embed;
  if (embed) {
    if (embed.$type === "app.bsky.embed.external#view" && embed.external) {
      lines.push(`  <external_link>`);
      add("link_uri", embed.external.uri);
      add("link_title", embed.external.title);
      add("link_description", embed.external.description);
      if (embed.external.thumb) add("link_thumb", embed.external.thumb);
      lines.push(`  </external_link>`);
    }

    if (embed.$type === "app.bsky.embed.record#view" && embed.record) {
      lines.push(`  <quote_post>`);
      add("quote_uri", embed.record.uri);
      if (embed.record.author) {
        add("quote_author", embed.record.author.handle);
        add("quote_display_name", embed.record.author.displayName);
      }
      if (embed.record.value?.text) {
        add("quote_text", embed.record.value.text);
      }
      lines.push(`  </quote_post>`);
    }

    if (embed.$type === "app.bsky.embed.video#view") {
      lines.push(`  <video>`);
      if (embed.playlist) add("video_playlist", embed.playlist);
      if (embed.alt) add("video_alt", embed.alt);
      if (embed.aspectRatio) {
        add("video_width", embed.aspectRatio.width);
        add("video_height", embed.aspectRatio.height);
      }
      lines.push(`  </video>`);
    }

    // Image count for reference
    if (embed.$type === "app.bsky.embed.images#view" && embed.images) {
      add("image_count", embed.images.length);
    }
  }

  lines.push(`</blueskypost>`);
  return lines.join("\n") + "\n";
}

function writeBlueskyPostNfo(
  post: BlueskyPost,
  sourceUrl: string,
  postDir: string,
  logger: PluginLogger,
  xmlEscape: (s: string) => string
): void {
  const nfoPath = path.join(postDir, "Post.nfo");
  try {
    const content = buildBlueskyPostNfo(post, sourceUrl, xmlEscape);
    fs.writeFileSync(nfoPath, content, "utf8");
    logger.info(`Wrote Bluesky NFO: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write Bluesky NFO: ${err}`);
  }
}

// =============================================================================
// Icon Fetcher
// =============================================================================

async function fetchAndSaveBlueskyAvatar(
  context: DownloadContext,
  handle: string,
  avatarUrl: string | undefined,
  handleDir: string
): Promise<void> {
  const { helpers, logger } = context;

  if (!avatarUrl) return;

  if (
    (await helpers.io.fileExists(path.join(handleDir, "icon.jpg"))) ||
    (await helpers.io.fileExists(path.join(handleDir, "icon.png")))
  ) {
    return;
  }

  try {
    const ext = avatarUrl.toLowerCase().includes(".png") ? "png" : "jpg";
    const iconPath = path.join(handleDir, `icon.${ext}`);
    await helpers.io.ensureDir(handleDir);
    await helpers.io.downloadFile(avatarUrl, iconPath);
    logger.info(`Saved avatar for @${handle}`);
  } catch (err) {
    logger.warn(`Failed to fetch avatar for @${handle}: ${err}`);
  }
}

// =============================================================================
// Download Handlers
// =============================================================================

function blueskyPostFolderName(
  post: BlueskyPost,
  stringHelpers: StringHelpers
): string {
  const rkey = post.uri.split("/").pop() || "unknown";
  const text = post.record.text.trim();

  if (!text) {
    return `[${rkey}]`;
  }

  const truncated = stringHelpers.truncateTitle(text.replace(/\n/g, " "), 60);
  const safeName = stringHelpers.sanitizeFilename(truncated);
  return safeName ? `${safeName} [${rkey}]` : `[${rkey}]`;
}

async function downloadBlueskyPostToFolder(
  context: DownloadContext,
  post: BlueskyPost,
  postDir: string,
  sourceUrl: string,
  thread?: BlueskyThreadNode
): Promise<{ downloaded: number; skipped: number; hasVideo: boolean }> {
  const { helpers, logger } = context;

  await helpers.io.ensureDir(postDir);
  writeBlueskyPostNfo(post, sourceUrl, postDir, logger, helpers.string.xmlEscape);

  // Save replies if thread data is available
  if (thread) {
    await writeBlueskyReplies(thread, postDir, logger, context);
  }

  const hasVideo = post.embed?.$type === "app.bsky.embed.video#view";
  const mediaItems = extractBlueskyMediaItems(post, helpers.string);

  if (mediaItems.length === 0) {
    return { downloaded: 0, skipped: 0, hasVideo };
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

  return { downloaded: downloads.length, skipped, hasVideo };
}

async function handleBlueskyProfile(
  context: DownloadContext,
  parsed: ParsedBlueskyUrl
): Promise<DownloadResult> {
  const { rootDirectory, helpers, logger, settings, url: sourceUrl } = context;
  const saveDir = settings.get("save_directory") || "Socials";
  const blueskySubfolder = settings.get("bluesky_subfolder") || "Bluesky";
  const postCountStr = settings.get("bluesky_post_count");
  const postCount = postCountStr ? parseInt(postCountStr, 10) : 100;

  const handle = parsed.handle;
  logger.info(`Fetching Bluesky profile for @${handle}...`);

  const profile = await fetchBlueskyProfile(handle, logger);
  logger.info(
    `Profile: @${profile.handle} (${profile.displayName || "no display name"}), ${profile.postsCount ?? "?"} posts`
  );

  logger.info(`Fetching feed for @${handle}...`);
  const posts = await fetchBlueskyAuthorFeed(handle, postCount, logger);

  if (posts.length === 0) {
    return {
      success: false,
      message: `No posts found for @${handle}. The user may not exist or has no public posts.`,
    };
  }

  logger.info(`Found ${posts.length} posts by @${handle}`);

  const handleDir = path.join(rootDirectory, saveDir, blueskySubfolder, handle);
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let videoPosts = 0;
  let totalArchived = 0;

  for (const post of posts) {
    const folderName = blueskyPostFolderName(post, helpers.string);
    const postDir = path.join(handleDir, folderName);

    // Fetch thread with replies if the post has any
    let thread: BlueskyThreadNode | undefined;
    if ((post.replyCount ?? 0) > 0) {
      try {
        const rkey = post.uri.split("/").pop()!;
        const threadResult = await fetchBlueskyPostThread(
          post.author.handle,
          rkey,
          logger,
          10
        );
        thread = threadResult.thread;
      } catch (err) {
        logger.warn(`Failed to fetch replies for post: ${err}`);
      }
    }

    const result = await downloadBlueskyPostToFolder(
      context,
      post,
      postDir,
      sourceUrl,
      thread
    );

    totalArchived++;
    if (result.hasVideo) videoPosts++;
    totalDownloaded += result.downloaded;
    totalSkipped += result.skipped;
  }

  // Save avatar
  await fetchAndSaveBlueskyAvatar(context, handle, profile.avatar, handleDir);

  const parts: string[] = [
    `@${handle}: Archived ${totalArchived} posts (${totalDownloaded} media files downloaded)`,
  ];
  if (totalSkipped > 0) parts.push(`${totalSkipped} already existed`);
  if (videoPosts > 0) parts.push(`${videoPosts} video post(s) (video downloaded)`);

  return { success: true, message: parts.join(". ") };
}

async function handleBlueskyPost(
  context: DownloadContext,
  parsed: ParsedBlueskyUrl
): Promise<DownloadResult> {
  const { rootDirectory, helpers, logger, settings, url: sourceUrl } = context;
  const saveDir = settings.get("save_directory") || "Socials";
  const blueskySubfolder = settings.get("bluesky_subfolder") || "Bluesky";

  const handle = parsed.handle;
  const rkey = parsed.rkey;
  if (!rkey) {
    return {
      success: false,
      message: "Could not determine post ID from URL",
    };
  }

  logger.info(`Fetching Bluesky post by @${handle}, rkey: ${rkey}`);
  const { post, thread } = await fetchBlueskyPostThread(handle, rkey, logger, 100);

  const folderName = blueskyPostFolderName(post, helpers.string);
  const handleDir = path.join(rootDirectory, saveDir, blueskySubfolder, post.author.handle);
  const postDir = path.join(handleDir, folderName);

  const result = await downloadBlueskyPostToFolder(
    context,
    post,
    postDir,
    sourceUrl,
    thread
  );

  // Save avatar
  await fetchAndSaveBlueskyAvatar(context, handle, post.author.avatar, handleDir);

  const textPreview = post.record.text.substring(0, 60);
  const parts: string[] = [];
  if (result.downloaded > 0) {
    parts.push(`Downloaded ${result.downloaded} file(s) from "${textPreview}..."`);
  } else {
    parts.push(`Archived post "${textPreview}${post.record.text.length > 60 ? "..." : ""}"`);
  }
  if (result.skipped > 0) parts.push(`${result.skipped} already existed`);
  parts.push("metadata saved");

  return { success: true, message: parts.join(". ") };
}

// =============================================================================
// Main Export
// =============================================================================

export async function downloadBluesky(context: DownloadContext): Promise<DownloadResult> {
  const { url, logger, helpers } = context;

  // Initialize the rate-limited fetch for Bluesky API calls
  blueskyFetch = helpers.http.createRateLimiter({
    minIntervalMs: 100,
    retryOnStatus: [429],
    retryDelayMs: 30000,
  });

  const blueskyParsed = parseBlueskyUrl(url);
  if (!blueskyParsed) {
    return {
      success: false,
      message: "URL not recognized as a Bluesky URL",
    };
  }

  logger.info(`Bluesky plugin processing: ${url}`);
  try {
    switch (blueskyParsed.type) {
      case "profile":
        return await handleBlueskyProfile(context, blueskyParsed);
      case "post":
        return await handleBlueskyPost(context, blueskyParsed);
      default:
        return {
          success: false,
          message: "Unrecognized Bluesky URL type",
        };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Bluesky plugin error: ${errorMsg}`);

    if (errorMsg.includes("400")) {
      return {
        success: false,
        message:
          "Bluesky returned 400 Bad Request. The handle or post ID may be invalid.",
      };
    }
    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      return {
        success: false,
        message:
          "Bluesky returned 404 Not Found. The user or post may not exist or has been deleted.",
      };
    }

    return {
      success: false,
      message: `Bluesky download failed: ${errorMsg}`,
    };
  }
}
