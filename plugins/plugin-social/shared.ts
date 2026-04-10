import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

export const execFileAsync = promisify(execFile);

// =============================================================================
// Plugin Cache Directory
// =============================================================================
//
// The host app's `type: "file"` setting storage is opaque and, per user
// report, can lose uploaded files between reboots. To make cookies survive
// those restarts, plugin-social snapshots each successfully-read cookies.txt
// into its own cache under the user's home directory and falls back to the
// snapshot when the host-provided path is gone.

const PLUGIN_CACHE_ROOT = path.join(
  os.homedir(),
  ".thearchiver",
  "plugin-social"
);

export function redditAccountCachedCookiesPath(slot: number): string {
  return path.join(
    PLUGIN_CACHE_ROOT,
    "accounts",
    `account-${slot}-cookies.txt`
  );
}

// =============================================================================
// Core Plugin Types (re-exported from plugin-api.d.ts)
// =============================================================================

export type {
  DownloadResult,
  PluginSettingDefinition,
  PluginSettingsAccessor,
  PluginLogger,
  DownloadContext,
  ActionContext,
  ActionResult,
  ArchiverPlugin,
  PluginHelpers,
} from "./plugin-api";

import type { DownloadContext } from "./plugin-api";

export type StringHelpers = DownloadContext["helpers"]["string"];

// Reddit-specific types

export interface RedditPost {
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

export interface ParsedRedditUrl {
  type: "post" | "user" | "user_upvoted" | "subreddit";
  subreddit?: string;
  postId?: string;
  username?: string;
}

export interface MediaItem {
  url: string;
  filename: string;
}

/**
 * Change-tracking status for a single comment or post. Populated by the
 * diff/merge step in the Reddit downloader when a prior snapshot exists.
 * Multiple statuses can stack on one comment (e.g. a comment that was edited
 * in a previous scan and is now deleted carries both "edited" and "deleted").
 */
export type ChangeStatus = "new" | "edited" | "deleted";

/** A single prior version of a comment body captured during an edit. */
export interface CommentEditHistoryEntry {
  /**
   * ISO-dash timestamp identifying the snapshot this prior body came from
   * (e.g. "2026-04-10T14-30-22Z"). Matches the run-timestamp format used in
   * snapshot filenames.
   */
  timestamp: string;
  body: string;
  body_html?: string;
}

export interface CleanComment {
  /**
   * Reddit comment id (e.g. "abc123"). Stable across scans — used by the
   * change-tracker to match comments between snapshots. Kept optional for
   * forward/back compatibility with older Comments.json files.
   */
  id?: string;
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
  /**
   * Change-tracking annotations. Present only on the merged Comments.json,
   * never on raw timestamped snapshots.
   */
  changeStatus?: ChangeStatus[];
  editHistory?: CommentEditHistoryEntry[];
}

export interface MoreComments {
  kind: "more";
  count: number;
  children_ids: string[];
}

// Bluesky-specific types

export interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BlueskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
}

export interface BlueskyRecord {
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

export interface BlueskyImageView {
  thumb: string;
  fullsize: string;
  alt?: string;
  aspectRatio?: { width: number; height: number };
}

export interface BlueskyExternalView {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

export interface BlueskyEmbedView {
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

export interface BlueskyPost {
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

export interface BlueskyFeedItem {
  post: BlueskyPost;
  reason?: { $type: string };
}

export interface BlueskyFeedResponse {
  cursor?: string;
  feed: BlueskyFeedItem[];
}

export interface BlueskyProfileResponse {
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

export interface CleanBlueskyReply {
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

export interface ParsedBlueskyUrl {
  type: "profile" | "post";
  handle: string;
  rkey?: string;
}

export interface BlueskyThreadNode {
  $type?: string;
  post?: BlueskyPost;
  replies?: BlueskyThreadNode[];
  notFound?: boolean;
  blocked?: boolean;
}

// Twitter/X-specific types (Syndication API)

export interface TwitterUser {
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  is_blue_verified?: boolean;
}

export interface TwitterEntityUrl {
  display_url: string;
  expanded_url: string;
  url: string;
  indices: [number, number];
}

export interface TwitterEntityMention {
  screen_name: string;
  indices: [number, number];
}

export interface TwitterEntityHashtag {
  text: string;
  indices: [number, number];
}

export interface TwitterMediaDetail {
  media_url_https: string;
  type: "photo" | "video" | "animated_gif";
  original_info: { width: number; height: number };
  video_info?: {
    variants: Array<{ bitrate?: number; content_type: string; url: string }>;
  };
}

export interface TwitterTweet {
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

export interface ParsedTwitterUrl {
  type: "post";
  username: string;
  tweetId: string;
}

// =============================================================================
// Shared Utilities
// =============================================================================

export function formatUnixTimestamp(utc: number): string {
  return new Date(utc * 1000).toISOString();
}

// =============================================================================
// Reddit Account Slots
// =============================================================================

/**
 * The plugin pre-declares a fixed number of Reddit account slots. Each slot
 * stores a username and a cookies.txt file; download handlers look up the
 * matching account by username (case-insensitive) when a URL like
 * /user/<name>/upvoted comes in.
 *
 * Increasing this number is safe — add matching settings in index.ts and
 * manifest.json, and actions in the plugin's `actions` block.
 */
export const REDDIT_ACCOUNT_SLOT_COUNT = 5;

export interface RedditAccount {
  slot: number;
  /** Username as entered by the user in settings (may be empty). */
  configuredUsername: string;
  /** Username confirmed by a successful Test Connection call (may be empty). */
  verifiedUsername: string;
  /** Absolute path to the Netscape cookies.txt for this account (may be empty). */
  cookiesFile: string;
}

/**
 * Returns the effective display name for an account — verified if we have one,
 * otherwise the user-entered username, otherwise an empty string.
 */
export function redditAccountDisplayName(account: RedditAccount): string {
  return account.verifiedUsername || account.configuredUsername || "";
}

/** Reads all N account slots from settings, including empty ones. */
export function loadRedditAccountSlots(
  settings: import("./plugin-api").PluginSettingsAccessor
): RedditAccount[] {
  const slots: RedditAccount[] = [];
  for (let i = 1; i <= REDDIT_ACCOUNT_SLOT_COUNT; i++) {
    slots.push({
      slot: i,
      configuredUsername: (settings.get(`reddit_account_${i}_username`) || "").trim(),
      verifiedUsername: (settings.get(`reddit_account_${i}_verified_username`) || "").trim(),
      cookiesFile: (settings.get(`reddit_account_${i}_cookies_file`) || "").trim(),
    });
  }
  return slots;
}

/**
 * Finds the first configured account that matches the given Reddit username
 * (case-insensitive). Returns null if no slot's name matches. A slot is a
 * match as long as its name is set — whether cookies are actually resolvable
 * is decided later by {@link resolveRedditCookieHeader}, which also consults
 * the plugin's on-disk cache. That way a slot whose `cookies_file` setting
 * got wiped at reboot still matches as long as a cached snapshot exists.
 */
export function findRedditAccountByUsername(
  settings: import("./plugin-api").PluginSettingsAccessor,
  username: string
): RedditAccount | null {
  const target = username.trim().toLowerCase();
  if (!target) return null;
  for (const slot of loadRedditAccountSlots(settings)) {
    const name = redditAccountDisplayName(slot).toLowerCase();
    if (!name) continue;
    if (name === target) return slot;
  }
  return null;
}

// =============================================================================
// Reddit Cookie Helper (Netscape cookies.txt format)
// =============================================================================

/**
 * Parses a Netscape-format cookies.txt text buffer and returns a `Cookie`
 * header value containing only cookies scoped to reddit.com. Returns null if
 * the buffer contains no reddit.com cookies.
 *
 * Netscape format columns (tab-separated):
 *   domain \t includeSubdomains \t path \t secure \t expires \t name \t value
 */
export function buildCookieHeaderFromContent(text: string): string | null {
  const pairs: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Netscape format allows "#HttpOnly_" prefix lines; strip it and still parse.
    const parseLine = line.startsWith("#HttpOnly_") ? line.slice(10) : line;
    if (parseLine.startsWith("#")) continue;
    const parts = parseLine.split("\t");
    if (parts.length < 7) continue;
    const domain = parts[0];
    const name = parts[5];
    const value = parts[6];
    if (!domain || !name) continue;
    const bareDomain = domain.replace(/^\./, "").toLowerCase();
    if (bareDomain !== "reddit.com" && !bareDomain.endsWith(".reddit.com")) {
      continue;
    }
    pairs.push(`${name}=${value}`);
  }
  return pairs.length > 0 ? pairs.join("; ") : null;
}

/**
 * Reads a Netscape-format cookies.txt file and returns a `Cookie` header value
 * containing only cookies scoped to reddit.com. Returns null if the file is
 * missing, unreadable, or contains no reddit.com cookies.
 */
export function buildCookieHeaderFromFile(filePath: string): string | null {
  if (!filePath) return null;
  try {
    if (!fs.existsSync(filePath)) return null;
    const text = fs.readFileSync(filePath, "utf8");
    return buildCookieHeaderFromContent(text);
  } catch {
    return null;
  }
}

// ─── Resolver with persistent cache ───────────────────────────────────────

/**
 * Optional logger surface used by {@link resolveRedditCookieHeader}. Any
 * object with compatible info/warn methods (like `PluginLogger`) works.
 */
interface OptionalLogger {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
}

export interface ResolvedRedditCookies {
  cookieHeader: string;
  /** "live" = read from the host-provided file; "cache" = read from snapshot. */
  resolvedFrom: "live" | "cache";
  /** Absolute path of the source that actually supplied the bytes. */
  sourcePath: string;
}

/**
 * Resolves cookies for a Reddit account slot in a reboot-resilient way.
 *
 * Order of operations:
 *   1. If `userPickedPath` exists and yields reddit.com cookies, use those
 *      bytes AND snapshot them to the plugin's cache at
 *      `~/.thearchiver/plugin-social/accounts/account-<slot>-cookies.txt`
 *      so a subsequent reboot that loses the host's file storage still works.
 *   2. If the user-picked path is missing, unreadable, or empty of
 *      reddit.com cookies, fall back to the cached snapshot.
 *   3. If neither source is available, return null.
 *
 * Never throws. Best-effort caching failures (e.g. read-only home dir) are
 * logged via `logger.warn` but don't block the return of a valid header.
 */
export function resolveRedditCookieHeader(
  slot: number,
  userPickedPath: string,
  logger?: OptionalLogger
): ResolvedRedditCookies | null {
  const cachePath = redditAccountCachedCookiesPath(slot);

  // 1. Try the user-picked (host-provided) path first
  if (userPickedPath && fs.existsSync(userPickedPath)) {
    try {
      const content = fs.readFileSync(userPickedPath, "utf8");
      const header = buildCookieHeaderFromContent(content);
      if (header) {
        // Opportunistic snapshot for reboot resilience
        try {
          fs.mkdirSync(path.dirname(cachePath), { recursive: true });
          fs.writeFileSync(cachePath, content, "utf8");
          try {
            fs.chmodSync(cachePath, 0o600);
          } catch {
            /* best-effort; non-POSIX filesystems may not honor chmod */
          }
        } catch (err) {
          logger?.warn?.(
            `Reddit account ${slot}: failed to snapshot cookies to cache (${cachePath}): ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
        return {
          cookieHeader: header,
          resolvedFrom: "live",
          sourcePath: userPickedPath,
        };
      }
    } catch (err) {
      logger?.warn?.(
        `Reddit account ${slot}: failed to read user-picked cookies file at ${userPickedPath}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // 2. Fall back to the plugin-managed snapshot
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, "utf8");
      const header = buildCookieHeaderFromContent(content);
      if (header) {
        logger?.info?.(
          `Reddit account ${slot}: using cached cookies snapshot (host-provided file is missing or unreadable)`
        );
        return {
          cookieHeader: header,
          resolvedFrom: "cache",
          sourcePath: cachePath,
        };
      }
    } catch (err) {
      logger?.warn?.(
        `Reddit account ${slot}: cached cookies snapshot at ${cachePath} is unreadable: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return null;
}

