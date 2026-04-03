import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// =============================================================================
// Section 1: Type Definitions
// =============================================================================

// Plugin types - matches TheArchiver's plugin interface
interface DownloadResult {
  success: boolean;
  message: string;
}

interface PluginSettingsAccessor {
  get<T = string>(key: string): T;
  set(key: string, value: string): Promise<void>;
}

interface PluginLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

interface DownloadContext {
  url: string;
  rootDirectory: string;
  maxDownloadThreads: number;
  helpers: {
    html: {
      fetchPage(
        url: string,
        options?: { userAgent?: string; cookies?: string }
      ): Promise<string>;
    };
    io: {
      downloadFile(
        url: string,
        outputPath: string,
        options?: Record<string, unknown>
      ): Promise<void>;
      downloadFiles(
        files: Array<{ url: string; outputPath: string }>,
        concurrency?: number,
        options?: Record<string, unknown>
      ): Promise<void>;
      ensureDir(dirPath: string): Promise<void>;
      fileExists(filePath: string): Promise<boolean>;
    };
    url: {
      extractHostname(urlString: string): string;
    };
    string: {
      sanitizeFilename(input: string): string;
    };
  };
  logger: PluginLogger;
  settings: PluginSettingsAccessor;
}

interface ArchiverPlugin {
  name: string;
  version?: string;
  description?: string;
  urlPatterns: string[];
  fileTypes?: string[];
  settings?: Array<{
    key: string;
    type: string;
    label: string;
    description?: string;
    required?: boolean;
    defaultValue?: string | number | boolean;
    hidden?: boolean;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      options?: Array<{ label: string; value: string }>;
    };
    sortOrder?: number;
  }>;
  actions?: Record<
    string,
    (context: {
      settings: PluginSettingsAccessor;
      logger: PluginLogger;
    }) => Promise<{ success: boolean; message: string }>
  >;
  download(context: DownloadContext): Promise<DownloadResult>;
}

// Reddit-specific types

interface RedditPost {
  id: string;
  name: string; // fullname e.g. "t3_abc123"
  title: string;
  author: string;
  subreddit: string;
  subreddit_name_prefixed: string;
  url: string;
  permalink: string;
  domain: string;
  selftext: string;
  selftext_html: string | null;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  edited: boolean | number;
  over_18: boolean;
  spoiler: boolean;
  stickied: boolean;
  locked: boolean;
  archived: boolean;
  is_video: boolean;
  is_gallery?: boolean;
  post_hint?: string;
  link_flair_text: string | null;
  author_flair_text: string | null;
  thumbnail: string;
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number };
      resolutions: Array<{ url: string; width: number; height: number }>;
    }>;
  };
  media_metadata?: Record<
    string,
    {
      status: string;
      e: string; // "Image" or "AnimatedImage"
      m: string; // MIME type e.g. "image/jpg"
      s: { u?: string; gif?: string; x: number; y: number };
    }
  >;
  gallery_data?: {
    items: Array<{ media_id: string; id: number; caption?: string }>;
  };
  crosspost_parent_list?: RedditPost[];
  is_gif?: boolean;
  media?: {
    reddit_video?: {
      fallback_url: string;
      height: number;
      width: number;
      duration: number;
      is_gif?: boolean;
      has_audio?: boolean;
    };
  };
  total_awards_received: number;
  all_awardings?: Array<{ name: string; count: number }>;
}

interface ParsedRedditUrl {
  type: "post" | "user" | "subreddit";
  subreddit?: string;
  postId?: string;
  username?: string;
}

interface MediaItem {
  url: string;
  filename: string;
}

interface CleanComment {
  author: string;
  body: string;
  body_html?: string;
  score: number;
  created_utc: number;
  edited: boolean | number;
  is_submitter: boolean;
  author_flair_text: string | null;
  stickied: boolean;
  distinguished: string | null;
  depth: number;
  replies: CleanComment[];
  media?: Record<string, string>; // maps media key (e.g. giphy ID) to local filename
}

interface MoreComments {
  kind: "more";
  count: number;
  children_ids: string[];
}

// Bluesky-specific types

interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface BlueskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
}

interface BlueskyRecord {
  text: string;
  createdAt: string;
  facets?: BlueskyFacet[];
  embed?: {
    $type: string;
    images?: Array<{ alt?: string; image: { ref: { $link: string }; mimeType: string } }>;
    external?: { uri: string; title: string; description: string };
    record?: { uri: string; cid: string };
    video?: { ref: { $link: string }; mimeType: string };
  };
  reply?: {
    root: { uri: string; cid: string };
    parent: { uri: string; cid: string };
  };
}

interface BlueskyImageView {
  thumb: string;
  fullsize: string;
  alt?: string;
  aspectRatio?: { width: number; height: number };
}

interface BlueskyExternalView {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

interface BlueskyEmbedView {
  $type: string;
  images?: BlueskyImageView[];
  external?: BlueskyExternalView;
  record?: {
    $type?: string;
    uri?: string;
    cid?: string;
    author?: BlueskyAuthor;
    value?: { text?: string; createdAt?: string };
    embeds?: BlueskyEmbedView[];
  };
  media?: BlueskyEmbedView;
  cid?: string;
  playlist?: string;
  thumbnail?: string;
  alt?: string;
  presentation?: string;
  aspectRatio?: { width: number; height: number };
}

interface BlueskyPost {
  uri: string;
  cid: string;
  author: BlueskyAuthor;
  record: BlueskyRecord;
  embed?: BlueskyEmbedView;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  quoteCount?: number;
  indexedAt: string;
}

interface BlueskyFeedItem {
  post: BlueskyPost;
  reason?: { $type: string };
}

interface BlueskyFeedResponse {
  cursor?: string;
  feed: BlueskyFeedItem[];
}

interface BlueskyProfileResponse {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

interface CleanBlueskyReply {
  author: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  facets?: BlueskyFacet[];
  depth: number;
  replies: CleanBlueskyReply[];
  images?: string[]; // local filenames of downloaded reply images
}

interface ParsedBlueskyUrl {
  type: "profile" | "post";
  handle: string;
  rkey?: string;
}

// Twitter/X-specific types (Syndication API)

interface TwitterUser {
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  is_blue_verified?: boolean;
}

interface TwitterEntityUrl {
  display_url: string;
  expanded_url: string;
  url: string;
  indices: [number, number];
}

interface TwitterEntityMention {
  screen_name: string;
  indices: [number, number];
}

interface TwitterEntityHashtag {
  text: string;
  indices: [number, number];
}

interface TwitterMediaDetail {
  media_url_https: string;
  type: "photo" | "video" | "animated_gif";
  original_info: { width: number; height: number };
  video_info?: {
    variants: Array<{ bitrate?: number; content_type: string; url: string }>;
  };
}

interface TwitterTweet {
  __typename?: string;
  id_str: string;
  text: string;
  created_at: string;
  user: TwitterUser;
  favorite_count: number;
  conversation_count?: number;
  reply_count?: number;
  retweet_count?: number;
  quote_count?: number;
  lang?: string;
  entities?: {
    urls?: TwitterEntityUrl[];
    user_mentions?: TwitterEntityMention[];
    hashtags?: TwitterEntityHashtag[];
  };
  mediaDetails?: TwitterMediaDetail[];
  photos?: Array<{ url: string; width: number; height: number }>;
  video?: {
    variants: Array<{ type: string; src: string }>;
    poster?: string;
  };
  quoted_tweet?: TwitterTweet;
  in_reply_to_status_id_str?: string;
  in_reply_to_screen_name?: string;
  possibly_sensitive?: boolean;
}

interface ParsedTwitterUrl {
  type: "post";
  username: string;
  tweetId: string;
}

// =============================================================================
// Section 2: URL Parser
// =============================================================================

function parseRedditUrl(url: string): ParsedRedditUrl | null {
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

function parseBlueskyUrl(url: string): ParsedBlueskyUrl | null {
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

function parseTwitterUrl(url: string): ParsedTwitterUrl | null {
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
// Section 3: Reddit API Client
// =============================================================================

const USER_AGENT = "TheArchiver/1.0 (reddit content archiver)";
const MIN_REQUEST_INTERVAL_MS = 6500; // ~9.2 req/min, safely under Reddit's 10/min
let lastRequestTime = 0;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

async function fetchRedditJson(
  url: string,
  logger: PluginLogger
): Promise<unknown> {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set("raw_json", "1");

  const fetchUrl = parsedUrl.toString();
  logger.info(`Fetching: ${fetchUrl}`);

  const res = await fetch(fetchUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    redirect: "follow",
  });

  if (res.status === 429) {
    logger.warn("Rate limited by Reddit. Waiting 60 seconds before retry...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    const retryRes = await fetch(fetchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      redirect: "follow",
    });

    if (!retryRes.ok) {
      throw new Error(
        `Reddit API returned ${retryRes.status} after retry: ${retryRes.statusText}`
      );
    }
    return retryRes.json();
  }

  if (!res.ok) {
    throw new Error(`Reddit API returned ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

async function rateLimitedFetch(
  url: string,
  logger: PluginLogger
): Promise<unknown> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - elapsed;
    logger.info(`Rate limiting: waiting ${waitTime}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
  return fetchRedditJson(url, logger);
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
// Section 3b: Bluesky API Client
// =============================================================================

const BLUESKY_API_BASE = "https://public.api.bsky.app";
const BLUESKY_MIN_REQUEST_INTERVAL_MS = 100;
let lastBlueskyRequestTime = 0;

async function fetchBlueskyJson(
  endpoint: string,
  params: Record<string, string>,
  logger: PluginLogger
): Promise<unknown> {
  const now = Date.now();
  const elapsed = now - lastBlueskyRequestTime;
  if (elapsed < BLUESKY_MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, BLUESKY_MIN_REQUEST_INTERVAL_MS - elapsed)
    );
  }
  lastBlueskyRequestTime = Date.now();

  const url = new URL(`${BLUESKY_API_BASE}/xrpc/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const fetchUrl = url.toString();
  logger.info(`Fetching: ${fetchUrl}`);

  const res = await fetch(fetchUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (res.status === 429) {
    logger.warn("Rate limited by Bluesky. Waiting 30 seconds before retry...");
    await new Promise((resolve) => setTimeout(resolve, 30000));
    const retryRes = await fetch(fetchUrl, {
      headers: { Accept: "application/json" },
    });
    if (!retryRes.ok) {
      throw new Error(
        `Bluesky API returned ${retryRes.status} after retry: ${retryRes.statusText}`
      );
    }
    return retryRes.json();
  }

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

interface BlueskyThreadNode {
  $type?: string;
  post?: BlueskyPost;
  replies?: BlueskyThreadNode[];
  notFound?: boolean;
  blocked?: boolean;
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
// Section 3c: Twitter Syndication API Client
// =============================================================================

const TWITTER_MIN_REQUEST_INTERVAL_MS = 500;
let lastTwitterRequestTime = 0;

function generateSyndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, "");
}

async function fetchTweetSyndication(
  tweetId: string,
  logger: PluginLogger
): Promise<TwitterTweet> {
  const now = Date.now();
  const elapsed = now - lastTwitterRequestTime;
  if (elapsed < TWITTER_MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, TWITTER_MIN_REQUEST_INTERVAL_MS - elapsed)
    );
  }
  lastTwitterRequestTime = Date.now();

  const token = generateSyndicationToken(tweetId);
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`;
  logger.info(`Fetching tweet: ${url}`);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TheArchiver/1.0 (social content archiver)",
    },
  });

  if (res.status === 404) {
    throw new Error(
      "Tweet not found. It may have been deleted, be from a private account, or the syndication API may not have access."
    );
  }

  if (res.status === 429) {
    logger.warn("Rate limited by Twitter. Waiting 30 seconds before retry...");
    await new Promise((resolve) => setTimeout(resolve, 30000));
    const retryRes = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TheArchiver/1.0 (social content archiver)",
      },
    });
    if (!retryRes.ok) {
      throw new Error(
        `Twitter syndication API returned ${retryRes.status} after retry: ${retryRes.statusText}`
      );
    }
    return retryRes.json() as Promise<TwitterTweet>;
  }

  if (!res.ok) {
    throw new Error(
      `Twitter syndication API returned ${res.status}: ${res.statusText}`
    );
  }

  return res.json() as Promise<TwitterTweet>;
}

// =============================================================================
// Section 4: Media Extractor
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

function getMimeExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpg": "jpg",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "image/tiff": "tiff",
  };
  return map[mime.toLowerCase()] || "jpg";
}

function truncateTitle(title: string, maxLen: number = 80): string {
  if (title.length <= maxLen) return title;
  return title.substring(0, maxLen).replace(/[-_\s]+$/, "");
}

function filenameFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const base = path.basename(pathname);
    // Only use if it looks like a real filename (has extension)
    if (base && path.extname(base)) return base;
  } catch {
    // ignore
  }
  return null;
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
  sanitizeFilename: (s: string) => string
): MediaItem[] {
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
        filename = `${sanitizeFilename(truncateTitle(caption, 80))}.${ext}`;
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
// Section 4b: Bluesky Media Extractor
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
  sanitizeFilename: (s: string) => string
): MediaItem[] {
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
          ? `${sanitizeFilename(truncateTitle(altName, 60))}.${ext}`
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
// Section 4c: Twitter Media Extractor
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
// Section 5: Metadata & Comments Writer
// =============================================================================

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatUnixTimestamp(utc: number): string {
  return new Date(utc * 1000).toISOString();
}

function buildPostNfo(post: RedditPost, sourceUrl: string): string {
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
  logger: PluginLogger
): void {
  const nfoPath = path.join(postDir, "Post.nfo");
  try {
    const content = buildPostNfo(post, sourceUrl);
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
// Section 5b-2: Comment Media Download
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
// Section 5c: Bluesky NFO Writer
// =============================================================================

function buildBlueskyPostNfo(post: BlueskyPost, sourceUrl: string): string {
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
  logger: PluginLogger
): void {
  const nfoPath = path.join(postDir, "Post.nfo");
  try {
    const content = buildBlueskyPostNfo(post, sourceUrl);
    fs.writeFileSync(nfoPath, content, "utf8");
    logger.info(`Wrote Bluesky NFO: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write Bluesky NFO: ${err}`);
  }
}

// =============================================================================
// Section 5d: Twitter NFO Writer
// =============================================================================

function buildTwitterPostNfo(tweet: TwitterTweet, sourceUrl: string): string {
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
  logger: PluginLogger
): void {
  const nfoPath = path.join(postDir, "Post.nfo");
  try {
    const content = buildTwitterPostNfo(tweet, sourceUrl);
    fs.writeFileSync(nfoPath, content, "utf8");
    logger.info(`Wrote Twitter NFO: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write Twitter NFO: ${err}`);
  }
}

// =============================================================================
// Section 5b: Icon Fetchers
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
// Section 6: Download Handlers
// =============================================================================

function postFolderName(
  post: RedditPost,
  sanitizeFilename: (s: string) => string
): string {
  const safeTitle = sanitizeFilename(truncateTitle(post.title, 100));
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
    writePostNfo(post, sourceUrl, postDir, logger);
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

  const mediaItems = extractMediaItems(post, helpers.string.sanitizeFilename);

  // Always create folder and save metadata — text-only and link posts are valuable content
  await helpers.io.ensureDir(postDir);

  // Always save metadata (Post.nfo) — this is the post's primary record
  writePostNfo(post, sourceUrl, postDir, logger);

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

  const folderName = postFolderName(post, helpers.string.sanitizeFilename);
  const postDir = path.join(rootDirectory, saveDir, redditSubfolder, post.subreddit, folderName);

  // Always create folder and save metadata — every post is worth archiving
  await helpers.io.ensureDir(postDir);
  writePostNfo(post, sourceUrl, postDir, logger);

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

  const mediaItems = extractMediaItems(post, helpers.string.sanitizeFilename);

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

    const folderName = postFolderName(post, helpers.string.sanitizeFilename);
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
    const folderName = postFolderName(post, helpers.string.sanitizeFilename);
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
// Section 6b: Bluesky Download Handlers
// =============================================================================

function blueskyPostFolderName(
  post: BlueskyPost,
  sanitizeFilename: (s: string) => string
): string {
  const rkey = post.uri.split("/").pop() || "unknown";
  const text = post.record.text.trim();

  if (!text) {
    return `[${rkey}]`;
  }

  const truncated = truncateTitle(text.replace(/\n/g, " "), 60);
  const safeName = sanitizeFilename(truncated);
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
  writeBlueskyPostNfo(post, sourceUrl, postDir, logger);

  // Save replies if thread data is available
  if (thread) {
    await writeBlueskyReplies(thread, postDir, logger, context);
  }

  const hasVideo = post.embed?.$type === "app.bsky.embed.video#view";
  const mediaItems = extractBlueskyMediaItems(post, helpers.string.sanitizeFilename);

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
    const folderName = blueskyPostFolderName(post, helpers.string.sanitizeFilename);
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

  const folderName = blueskyPostFolderName(post, helpers.string.sanitizeFilename);
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
// Section 6c: Twitter Download Handlers
// =============================================================================

function twitterPostFolderName(
  tweet: TwitterTweet,
  sanitizeFilename: (s: string) => string
): string {
  const id = tweet.id_str;
  const text = tweet.text.trim();

  if (!text) {
    return `[${id}]`;
  }

  const truncated = truncateTitle(text.replace(/\n/g, " "), 60);
  const safeName = sanitizeFilename(truncated);
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

  const folderName = twitterPostFolderName(tweet, helpers.string.sanitizeFilename);
  const userDir = path.join(rootDirectory, saveDir, twitterSubfolder, tweet.user.screen_name);
  const postDir = path.join(userDir, folderName);

  await helpers.io.ensureDir(postDir);
  writeTwitterPostNfo(tweet, sourceUrl, postDir, logger);

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
// Section 7: Plugin Export
// =============================================================================

const plugin: ArchiverPlugin = {
  name: "Socials",
  version: "1.0.0",
  description:
    "Download images, galleries, and metadata from social media platforms",
  urlPatterns: [
    "https://reddit.com",
    "https://www.reddit.com",
    "https://old.reddit.com",
    "https://bsky.app",
    "https://x.com",
    "https://twitter.com",
    "https://www.twitter.com",
    "https://mobile.twitter.com",
  ],
  settings: [
    {
      key: "save_directory",
      type: "string",
      label: "Save Directory",
      description:
        "Base folder name for saved social media content within the root directory",
      required: false,
      defaultValue: "Socials",
      sortOrder: 0,
    },
    {
      key: "reddit_subfolder",
      type: "string",
      label: "Reddit Subfolder",
      description:
        "Subfolder name for Reddit content within the save directory",
      required: false,
      defaultValue: "Reddit",
      sortOrder: 1,
    },
    {
      key: "subreddit_sort",
      type: "select",
      label: "Subreddit Sort",
      description: "Sort order when downloading from a subreddit",
      defaultValue: "hot",
      validation: {
        options: [
          { label: "Hot", value: "hot" },
          { label: "New", value: "new" },
          { label: "Top", value: "top" },
          { label: "Rising", value: "rising" },
        ],
      },
      sortOrder: 2,
    },
    {
      key: "subreddit_time_filter",
      type: "select",
      label: "Top Posts Time Filter",
      description: "Time range when sorting by 'top'",
      defaultValue: "all",
      validation: {
        options: [
          { label: "Past Hour", value: "hour" },
          { label: "Past 24 Hours", value: "day" },
          { label: "Past Week", value: "week" },
          { label: "Past Month", value: "month" },
          { label: "Past Year", value: "year" },
          { label: "All Time", value: "all" },
        ],
      },
      sortOrder: 3,
    },
    {
      key: "subreddit_post_count",
      type: "number",
      label: "Reddit Posts to Download",
      description:
        "Number of posts to fetch from subreddits/profiles. -1 for max (~1000, Reddit limit)",
      defaultValue: "100",
      sortOrder: 4,
    },
    {
      key: "save_metadata",
      type: "boolean",
      label: "Save Metadata",
      description:
        "Save post metadata (Post.nfo) and comments (Comments.json) alongside media files",
      defaultValue: "true",
      sortOrder: 5,
    },
    {
      key: "bluesky_subfolder",
      type: "string",
      label: "Bluesky Subfolder",
      description:
        "Subfolder name for Bluesky content within the save directory",
      required: false,
      defaultValue: "Bluesky",
      sortOrder: 10,
    },
    {
      key: "bluesky_post_count",
      type: "number",
      label: "Bluesky Posts to Download",
      description:
        "Number of posts to fetch from a Bluesky profile. -1 for all available posts",
      defaultValue: "100",
      sortOrder: 11,
    },
    {
      key: "twitter_subfolder",
      type: "string",
      label: "Twitter/X Subfolder",
      description:
        "Subfolder name for Twitter/X content within the save directory",
      required: false,
      defaultValue: "Twitter",
      sortOrder: 20,
    },
  ],

  async download(context: DownloadContext): Promise<DownloadResult> {
    const { url, logger } = context;

    // Try Reddit first
    const redditParsed = parseRedditUrl(url);
    if (redditParsed) {
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

    // Try Bluesky
    const blueskyParsed = parseBlueskyUrl(url);
    if (blueskyParsed) {
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

    // Try Twitter/X
    const twitterParsed = parseTwitterUrl(url);
    if (twitterParsed) {
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

    return {
      success: false,
      message:
        "URL not recognized. Supported formats: reddit.com/r/.../comments/..., reddit.com/u/..., reddit.com/r/..., bsky.app/profile/{handle}, bsky.app/profile/{handle}/post/{id}, x.com/{user}/status/{id}",
    };
  },
};

export default plugin;
