import path from "path";
import fs from "fs";

import {
  type DownloadResult,
  type DownloadContext,
  type PluginLogger,
  type StringHelpers,
  type MediaItem,
  type TwitterTweet,
  type ParsedTwitterUrl,
} from "./shared";

// =============================================================================
// URL Parser
// =============================================================================

export function parseTwitterUrl(url: string): ParsedTwitterUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^(www\.|mobile\.)/, "");
  if (hostname !== "x.com" && hostname !== "twitter.com") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);

  // /{username}/status/{tweetId}
  if (
    segments.length >= 3 &&
    segments[1] === "status" &&
    /^\d+$/.test(segments[2])
  ) {
    return {
      type: "post",
      username: segments[0],
      tweetId: segments[2],
    };
  }

  return null;
}

// =============================================================================
// Twitter Syndication API Client
// =============================================================================

// Rate-limited fetch function, initialized in downloadTwitter() via helpers.http.createRateLimiter()
let twitterFetch: ((url: string, options?: RequestInit & { logger?: PluginLogger }) => Promise<Response>) | null = null;

function generateSyndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, "");
}

async function fetchTweetSyndication(
  tweetId: string,
  logger: PluginLogger
): Promise<TwitterTweet> {
  if (!twitterFetch) {
    throw new Error("Twitter rate limiter not initialized — downloadTwitter() must be called first");
  }

  const token = generateSyndicationToken(tweetId);
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`;
  logger.info(`Fetching tweet: ${url}`);

  const res = await twitterFetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TheArchiver/1.0 (social content archiver)",
    },
    logger,
  });

  if (res.status === 404) {
    throw new Error(
      "Tweet not found. It may have been deleted, be from a private account, or the syndication API may not have access."
    );
  }

  if (!res.ok) {
    throw new Error(
      `Twitter syndication API returned ${res.status}: ${res.statusText}`
    );
  }

  return res.json() as Promise<TwitterTweet>;
}

// =============================================================================
// Media Extractor
// =============================================================================

function extractTwitterMediaItems(
  tweet: TwitterTweet,
  sanitizeFilename: (s: string) => string
): MediaItem[] {
  const items: MediaItem[] = [];

  // Photos from mediaDetails or photos array
  if (tweet.mediaDetails) {
    let photoIndex = 0;
    for (const media of tweet.mediaDetails) {
      if (media.type === "photo") {
        photoIndex++;
        const url = media.media_url_https;
        // Get highest quality: append :orig
        const highResUrl = url.includes("?")
          ? url
          : `${url}?name=orig`;

        let ext = "jpg";
        try {
          const pathname = new URL(url).pathname;
          const urlExt = pathname.split(".").pop()?.toLowerCase();
          if (
            urlExt &&
            ["jpg", "jpeg", "png", "gif", "webp"].includes(urlExt)
          ) {
            ext = urlExt === "jpeg" ? "jpg" : urlExt;
          }
        } catch {
          // ignore
        }

        items.push({
          url: highResUrl,
          filename: `Image ${photoIndex}.${ext}`,
        });
      } else if (
        media.type === "video" ||
        media.type === "animated_gif"
      ) {
        // Get the highest bitrate video variant
        if (media.video_info?.variants) {
          const mp4Variants = media.video_info.variants
            .filter((v) => v.content_type === "video/mp4" && v.bitrate !== undefined)
            .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

          if (mp4Variants.length > 0) {
            items.push({
              url: mp4Variants[0].url,
              filename:
                media.type === "animated_gif" ? "Animation.mp4" : "Video.mp4",
            });
          }
        }
      }
    }
  } else if (tweet.photos) {
    // Fallback to photos array
    let photoIndex = 0;
    for (const photo of tweet.photos) {
      photoIndex++;
      const url = photo.url;
      let ext = "jpg";
      try {
        const pathname = new URL(url).pathname;
        const urlExt = pathname.split(".").pop()?.toLowerCase();
        if (
          urlExt &&
          ["jpg", "jpeg", "png", "gif", "webp"].includes(urlExt)
        ) {
          ext = urlExt === "jpeg" ? "jpg" : urlExt;
        }
      } catch {
        // ignore
      }
      items.push({
        url: url.includes("?") ? url : `${url}?name=orig`,
        filename: `Image ${photoIndex}.${ext}`,
      });
    }
  }

  // Video poster as fallback if no video file was extracted
  if (
    items.length === 0 &&
    tweet.video?.poster
  ) {
    items.push({
      url: tweet.video.poster,
      filename: "Video Thumbnail.jpg",
    });
  }

  return items;
}

// =============================================================================
// NFO Writer
// =============================================================================

function buildTwitterPostNfo(tweet: TwitterTweet, sourceUrl: string, xmlEscape: (s: string) => string): string {
  const tweetUrl = `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<twitterpost>`,
    `  <text>${xmlEscape(tweet.text)}</text>`,
    `  <url>${xmlEscape(tweetUrl)}</url>`,
    `  <source_url>${xmlEscape(sourceUrl)}</source_url>`,
  ];

  const add = (tag: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "") {
      lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
    }
  };

  add("id", tweet.id_str);
  add("screen_name", tweet.user.screen_name);
  add("name", tweet.user.name);
  add("user_id", tweet.user.id_str);
  add("profile_image_url", tweet.user.profile_image_url_https);
  add("verified", tweet.user.is_blue_verified ?? false);
  add("created", tweet.created_at);
  add("favorite_count", tweet.favorite_count ?? 0);
  add("retweet_count", tweet.retweet_count ?? 0);
  add("reply_count", tweet.reply_count ?? tweet.conversation_count ?? 0);
  add("quote_count", tweet.quote_count ?? 0);
  if (tweet.lang) add("lang", tweet.lang);

  // Reply info
  if (tweet.in_reply_to_status_id_str) {
    lines.push(`  <reply>`);
    add("in_reply_to_id", tweet.in_reply_to_status_id_str);
    if (tweet.in_reply_to_screen_name) {
      add("in_reply_to_user", tweet.in_reply_to_screen_name);
    }
    lines.push(`  </reply>`);
  }

  // Entities
  if (tweet.entities) {
    if (tweet.entities.urls && tweet.entities.urls.length > 0) {
      lines.push(`  <links>`);
      for (const url of tweet.entities.urls) {
        lines.push(
          `    <link display="${xmlEscape(url.display_url)}" expanded="${xmlEscape(url.expanded_url)}" />`
        );
      }
      lines.push(`  </links>`);
    }

    if (
      tweet.entities.user_mentions &&
      tweet.entities.user_mentions.length > 0
    ) {
      lines.push(`  <mentions>`);
      for (const mention of tweet.entities.user_mentions) {
        lines.push(
          `    <mention screen_name="${xmlEscape(mention.screen_name)}" />`
        );
      }
      lines.push(`  </mentions>`);
    }

    if (tweet.entities.hashtags && tweet.entities.hashtags.length > 0) {
      lines.push(`  <hashtags>`);
      for (const tag of tweet.entities.hashtags) {
        lines.push(`    <hashtag>${xmlEscape(tag.text)}</hashtag>`);
      }
      lines.push(`  </hashtags>`);
    }
  }

  // Quote tweet
  if (tweet.quoted_tweet) {
    const qt = tweet.quoted_tweet;
    lines.push(`  <quote_tweet>`);
    add("quote_id", qt.id_str);
    add("quote_screen_name", qt.user.screen_name);
    add("quote_name", qt.user.name);
    add("quote_text", qt.text);
    lines.push(`  </quote_tweet>`);
  }

  // Media counts
  const photoCount =
    tweet.mediaDetails?.filter((m) => m.type === "photo").length ??
    tweet.photos?.length ??
    0;
  if (photoCount > 0) add("image_count", photoCount);

  const hasVideo = tweet.mediaDetails?.some(
    (m) => m.type === "video" || m.type === "animated_gif"
  );
  if (hasVideo) add("has_video", true);

  if (tweet.possibly_sensitive) add("sensitive", true);

  lines.push(`</twitterpost>`);
  return lines.join("\n") + "\n";
}

function writeTwitterPostNfo(
  tweet: TwitterTweet,
  sourceUrl: string,
  postDir: string,
  logger: PluginLogger,
  xmlEscape: (s: string) => string
): void {
  const nfoPath = path.join(postDir, "Post.nfo");
  try {
    const content = buildTwitterPostNfo(tweet, sourceUrl, xmlEscape);
    fs.writeFileSync(nfoPath, content, "utf8");
    logger.info(`Wrote Twitter NFO: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write Twitter NFO: ${err}`);
  }
}

// =============================================================================
// Icon Fetcher
// =============================================================================

async function fetchAndSaveTwitterAvatar(
  context: DownloadContext,
  screenName: string,
  profileImageUrl: string | undefined,
  userDir: string
): Promise<void> {
  const { helpers, logger } = context;

  if (!profileImageUrl) return;

  if (
    (await helpers.io.fileExists(path.join(userDir, "icon.jpg"))) ||
    (await helpers.io.fileExists(path.join(userDir, "icon.png")))
  ) {
    return;
  }

  try {
    // Twitter profile images: replace _normal with _400x400 for higher res
    const highResUrl = profileImageUrl.replace("_normal", "_400x400");
    const ext = highResUrl.toLowerCase().includes(".png") ? "png" : "jpg";
    const iconPath = path.join(userDir, `icon.${ext}`);
    await helpers.io.ensureDir(userDir);
    await helpers.io.downloadFile(highResUrl, iconPath);
    logger.info(`Saved avatar for @${screenName}`);
  } catch (err) {
    logger.warn(`Failed to fetch avatar for @${screenName}: ${err}`);
  }
}

// =============================================================================
// Download Handler
// =============================================================================

function twitterPostFolderName(
  tweet: TwitterTweet,
  stringHelpers: StringHelpers
): string {
  const id = tweet.id_str;
  const text = tweet.text.trim();

  if (!text) {
    return `[${id}]`;
  }

  const truncated = stringHelpers.truncateTitle(text.replace(/\n/g, " "), 60);
  const safeName = stringHelpers.sanitizeFilename(truncated);
  return safeName ? `${safeName} [${id}]` : `[${id}]`;
}

async function handleTwitterPost(
  context: DownloadContext,
  parsed: ParsedTwitterUrl
): Promise<DownloadResult> {
  const { rootDirectory, helpers, logger, settings, url: sourceUrl } = context;
  const saveDir = settings.get("save_directory") || "Socials";
  const twitterSubfolder = settings.get("twitter_subfolder") || "Twitter";

  const { username, tweetId } = parsed;

  logger.info(`Fetching tweet ${tweetId} by @${username}`);
  const tweet = await fetchTweetSyndication(tweetId, logger);

  if (!tweet || !tweet.id_str) {
    return {
      success: false,
      message: "Could not fetch tweet data. The tweet may be private, deleted, or unavailable via the syndication API.",
    };
  }

  const folderName = twitterPostFolderName(tweet, helpers.string);
  const userDir = path.join(rootDirectory, saveDir, twitterSubfolder, tweet.user.screen_name);
  const postDir = path.join(userDir, folderName);

  await helpers.io.ensureDir(postDir);
  writeTwitterPostNfo(tweet, sourceUrl, postDir, logger, helpers.string.xmlEscape);

  // Save quote tweet as a separate JSON if present
  if (tweet.quoted_tweet) {
    try {
      const quotePath = path.join(postDir, "QuoteTweet.json");
      fs.writeFileSync(
        quotePath,
        JSON.stringify(tweet.quoted_tweet, null, 2),
        "utf8"
      );
      logger.info(`Saved quote tweet data: ${quotePath}`);
    } catch (err) {
      logger.warn(`Failed to write quote tweet: ${err}`);
    }
  }

  const mediaItems = extractTwitterMediaItems(tweet, helpers.string.sanitizeFilename);

  let downloaded = 0;
  let skipped = 0;

  if (mediaItems.length > 0) {
    const downloads: Array<{ url: string; outputPath: string }> = [];

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
      downloaded = downloads.length;
    }
  }

  // Save user avatar
  await fetchAndSaveTwitterAvatar(
    context,
    tweet.user.screen_name,
    tweet.user.profile_image_url_https,
    userDir
  );

  const textPreview = tweet.text.substring(0, 60);
  const parts: string[] = [];
  if (downloaded > 0) {
    parts.push(`Downloaded ${downloaded} file(s) from @${tweet.user.screen_name}: "${textPreview}..."`);
  } else {
    parts.push(`Archived tweet by @${tweet.user.screen_name}: "${textPreview}${tweet.text.length > 60 ? "..." : ""}"`);
  }
  if (skipped > 0) parts.push(`${skipped} already existed`);
  parts.push("metadata saved");

  return { success: true, message: parts.join(". ") };
}

// =============================================================================
// Main Export
// =============================================================================

export async function downloadTwitter(context: DownloadContext): Promise<DownloadResult> {
  const { url, logger, helpers } = context;

  // Initialize the rate-limited fetch for Twitter API calls
  twitterFetch = helpers.http.createRateLimiter({
    minIntervalMs: 500,
    retryOnStatus: [429],
    retryDelayMs: 30000,
  });

  const twitterParsed = parseTwitterUrl(url);
  if (!twitterParsed) {
    return {
      success: false,
      message: "URL not recognized as a Twitter/X URL",
    };
  }

  logger.info(`Twitter plugin processing: ${url}`);
  try {
    return await handleTwitterPost(context, twitterParsed);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Twitter plugin error: ${errorMsg}`);

    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      return {
        success: false,
        message:
          "Tweet not found. It may have been deleted, be from a private account, or unavailable via the syndication API.",
      };
    }

    return {
      success: false,
      message: `Twitter download failed: ${errorMsg}`,
    };
  }
}
