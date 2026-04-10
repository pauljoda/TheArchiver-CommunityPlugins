import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";

import { runGalleryDl } from "./_shared/runtime/gallery-dl-runner";

import {
  execFileAsync,
  formatUnixTimestamp,
  findRedditAccountByUsername,
  loadRedditAccountSlots,
  redditAccountDisplayName,
  resolveRedditCookieHeader,
  sanitizeRelativeFolder,
  type DownloadResult,
  type DownloadContext,
  type PluginLogger,
  type StringHelpers,
  type RedditPost,
  type ParsedRedditUrl,
  type MediaItem,
  type CleanComment,
  type MoreComments,
  type ChangeStatus,
  type CommentEditHistoryEntry,
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

  // /u/{name}/upvoted or /user/{name}/upvoted (requires authentication)
  if (
    segments.length >= 3 &&
    (segments[0] === "u" || segments[0] === "user") &&
    segments[2] === "upvoted"
  ) {
    return {
      type: "user_upvoted",
      username: segments[1],
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

/**
 * Detect the class of fetch errors that are worth retrying — TCP resets,
 * TLS handshake failures, DNS blips, undici socket errors. These surface as
 * a `TypeError: fetch failed` at the top level with a nested `cause.code`.
 * 429/5xx status codes are NOT handled here — they come back as a non-OK
 * Response and are caught by the rate limiter's own retryOnStatus list.
 */
function isTransientFetchError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    name?: string;
    message?: string;
    code?: string;
    cause?: { code?: string; name?: string; message?: string } | unknown;
  };
  const msg = (e.message || "").toLowerCase();
  if (msg.includes("fetch failed")) return true;
  if (msg.includes("socket hang up")) return true;
  if (msg.includes("other side closed")) return true;
  const causeCode =
    typeof e.cause === "object" && e.cause !== null
      ? (e.cause as { code?: string }).code
      : undefined;
  const code = e.code || causeCode;
  if (code) {
    const transient = new Set([
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENETUNREACH",
      "EAI_AGAIN",
      "UND_ERR_SOCKET",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
    ]);
    if (transient.has(code)) return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backoff schedule: 5s, 15s, 45s, then give up (4 total attempts). */
const FETCH_RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

async function rateLimitedFetch(
  url: string,
  logger: PluginLogger,
  cookieHeader?: string | null
): Promise<unknown> {
  if (!redditFetch) {
    throw new Error("Reddit rate limiter not initialized — downloadReddit() must be called first");
  }

  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set("raw_json", "1");

  const fetchUrl = parsedUrl.toString();
  logger.info(`Fetching: ${fetchUrl}`);

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }

  const maxAttempts = FETCH_RETRY_DELAYS_MS.length + 1;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await redditFetch(fetchUrl, {
        headers,
        redirect: "follow",
        logger,
      });
      if (!res.ok) {
        throw new Error(`Reddit API returned ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (!isTransientFetchError(err) || attempt >= maxAttempts) {
        throw err;
      }
      const delayMs = FETCH_RETRY_DELAYS_MS[attempt - 1];
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Transient fetch error (attempt ${attempt}/${maxAttempts}) for ${fetchUrl}: ${msg}. Backing off ${Math.round(
          delayMs / 1000
        )}s before retry...`
      );
      await sleep(delayMs);
    }
  }
  // Unreachable in practice — the loop either returns or throws — but TS
  // can't prove that, so re-throw the last captured error.
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Reddit fetch failed: ${String(lastErr)}`);
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
  logger: PluginLogger,
  cookieHeader?: string | null
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
      logger,
      cookieHeader
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

/**
 * Tracking context for a post that was discovered via the user's
 * `/upvoted` listing. Reddit doesn't expose the real upvote timestamp so we
 * persist the run's archive time + the post's index within the listing.
 * Lower `position` = more recently upvoted (Reddit sorts the upvoted listing
 * newest-upvote-first). Sorting by `(archivedAt DESC, position ASC)` gives a
 * stable global order where the most recent upvotes from the most recent
 * archive run float to the top.
 */
export interface UpvotedContext {
  archivedAt: string;
  position: number;
}

// =============================================================================
// Change Tracking
// =============================================================================
//
// Across successive downloads of the same Reddit post we want to know which
// comments were added, edited, or deleted since last time. Reddit itself
// surfaces no such diff — a user can edit or delete a comment and subsequent
// API responses simply hand us the new body (or "[deleted]"). To preserve
// that history we keep two files on disk per post for comments (and the
// analogous pair for the post itself):
//
//   Comments.json                       — annotated merged state (view reads)
//   Comments-YYYY-MM-DDTHH-MM-SSZ.json  — raw snapshot of the latest fetch,
//                                          used as the diff input on the next run
//
// After each run we prune all older snapshot files so exactly one snapshot
// survives. The merged file accumulates `changeStatus` and `editHistory`
// annotations on every comment / the post itself.
//
// Matching across snapshots is keyed by Reddit's stable comment `id`. The
// post is matched by directory (there's only one post per directory).
//
// Decisions baked into this module:
//   - First download is the baseline: priorRaw is null, merged = rawNew,
//     no chips.
//   - A comment that has completely vanished from the new fetch (not even
//     an "[deleted]" stub) is treated as deleted: grafted back into the
//     merged tree with its last-known body.
//   - A body flipping to "[deleted]" / "[removed]" marks the comment deleted
//     AND replaces the merged body with the last-known non-deleted text.
//   - A body change that is NOT a deletion marker is treated as an edit: the
//     merged body stays current and the prior body is appended to
//     editHistory with the PRIOR run's timestamp.
//   - `"new"` is carried from priorMerged minus itself (a comment that was
//     new last scan is no longer new this scan), then set on any id not
//     present in priorRaw.
//   - `"deleted"` in priorMerged is cleared only if the new body is not a
//     deletion marker (mod un-removes are rare but possible).
//
// The module exports a small surface used from `handleSinglePost`. Everything
// else is private.

/**
 * Build a run timestamp in the shape used for snapshot filenames:
 * "2026-04-10T14-30-22Z". Filesystem-safe on all platforms and sorts
 * lexically in chronological order, so "latest snapshot" is just the
 * biggest filename.
 */
export function makeRunTimestamp(date: Date = new Date()): string {
  const iso = date.toISOString(); // "2026-04-10T14:30:22.123Z"
  // Replace ":" and "." with "-" and drop the fractional seconds
  return iso.replace(/\.\d+Z$/, "Z").replace(/:/g, "-");
}

const SNAPSHOT_TIMESTAMP_RE = /-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)\./;

function snapshotFilenameRegex(
  prefix: "Comments" | "Post",
  ext: "json" | "nfo"
): RegExp {
  return new RegExp(
    `^${prefix}-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}Z\\.${ext}$`
  );
}

/**
 * Return the filename (not full path) of the most recent snapshot in
 * `postDir` matching `{prefix}-{ts}.{ext}`, or null if none exist.
 */
export function findLatestSnapshot(
  postDir: string,
  prefix: "Comments" | "Post",
  ext: "json" | "nfo"
): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(postDir);
  } catch {
    return null;
  }
  const re = snapshotFilenameRegex(prefix, ext);
  const matches = entries.filter((name) => re.test(name));
  if (matches.length === 0) return null;
  matches.sort(); // lexical sort on ISO-ish timestamp
  return matches[matches.length - 1];
}

/** Extract the timestamp segment out of a snapshot filename, or null. */
export function snapshotTimestamp(filename: string): string | null {
  const m = filename.match(SNAPSHOT_TIMESTAMP_RE);
  return m ? m[1] : null;
}

/**
 * Delete every snapshot in `postDir` that matches `{prefix}-*.{ext}` except
 * the one named `keepFilename`. Errors are swallowed individually so a
 * permission issue on one file doesn't block cleanup of the rest.
 */
export function pruneOldSnapshots(
  postDir: string,
  prefix: "Comments" | "Post",
  ext: "json" | "nfo",
  keepFilename: string,
  logger?: PluginLogger
): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(postDir);
  } catch {
    return;
  }
  const re = snapshotFilenameRegex(prefix, ext);
  for (const name of entries) {
    if (!re.test(name)) continue;
    if (name === keepFilename) continue;
    try {
      fs.unlinkSync(path.join(postDir, name));
    } catch (err) {
      logger?.warn(
        `Failed to prune old snapshot ${name}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}

/**
 * True when a comment/post body has been scrubbed by Reddit to indicate a
 * deletion or removal. Both user-deleted and mod-removed comments show up
 * as one of these two markers.
 */
function isDeletionMarker(body: string): boolean {
  const trimmed = body.trim();
  return trimmed === "[deleted]" || trimmed === "[removed]";
}

// --- Flatten helpers ------------------------------------------------------

interface FlatCommentRef {
  comment: CleanComment;
  parentId: string | null;
}

/**
 * Walk a comment tree and return a Map keyed by comment id. Comments without
 * an id (old data, "more" stubs) are skipped — they can't participate in
 * diffing anyway.
 */
function flattenCommentsById(
  tree: CleanComment[] | null | undefined
): Map<string, FlatCommentRef> {
  const map = new Map<string, FlatCommentRef>();
  if (!tree) return map;
  const walk = (list: CleanComment[], parentId: string | null): void => {
    for (const c of list) {
      if (c && typeof c === "object" && (c as { kind?: string }).kind === "more") {
        continue;
      }
      if (c.id) {
        map.set(c.id, { comment: c, parentId });
      }
      if (c.replies && c.replies.length > 0) {
        walk(c.replies, c.id ?? parentId);
      }
    }
  };
  walk(tree, null);
  return map;
}

/** Deep-clone a comment tree via JSON round-trip (plain-data only). */
function cloneCommentTree(tree: CleanComment[]): CleanComment[] {
  return JSON.parse(JSON.stringify(tree)) as CleanComment[];
}

/** Deep-clone a single comment (and all its replies). */
function cloneComment(c: CleanComment): CleanComment {
  return JSON.parse(JSON.stringify(c)) as CleanComment;
}

function uniqueStatus(arr: ChangeStatus[]): ChangeStatus[] {
  const out: ChangeStatus[] = [];
  for (const s of arr) {
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

// --- Comment diff/merge ---------------------------------------------------

/**
 * Diff the new raw comment tree against prior snapshots and produce the
 * annotated merged tree that will be written to `Comments.json`.
 *
 * @param priorRaw      Comments from the previous run's raw snapshot. Used
 *                      as the source of truth for what bodies looked like
 *                      last time we fetched from Reddit.
 * @param priorMerged   The previous `Comments.json` (annotated). Source of
 *                      any accumulated `editHistory` and carried
 *                      `changeStatus`.
 * @param newRaw        The comment tree we just fetched (unannotated).
 * @param priorTs       ISO-dash timestamp of the prior raw snapshot. Used
 *                      as the `timestamp` on new editHistory entries.
 *                      Null on the very first run.
 */
export function diffAndMergeComments(
  priorRaw: CleanComment[] | null,
  priorMerged: CleanComment[] | null,
  newRaw: CleanComment[],
  priorTs: string | null
): CleanComment[] {
  // Baseline case: no prior data, emit the fresh tree as-is with no chips.
  if (!priorRaw && !priorMerged) {
    return cloneCommentTree(newRaw);
  }

  const priorRawMap = flattenCommentsById(priorRaw);
  const priorMergedMap = flattenCommentsById(priorMerged);
  const newRawMap = flattenCommentsById(newRaw);

  // Step 1: build the annotated tree by walking the fresh tree.
  const merged = cloneCommentTree(newRaw);
  const annotate = (list: CleanComment[]): void => {
    for (const c of list) {
      if (c && (c as { kind?: string }).kind === "more") continue;
      annotateOne(c);
      if (c.replies && c.replies.length > 0) annotate(c.replies);
    }
  };
  const annotateOne = (c: CleanComment): void => {
    if (!c.id) return;

    const prevRaw = priorRawMap.get(c.id)?.comment;
    const prevMerged = priorMergedMap.get(c.id)?.comment;

    // Carry forward edit history from the merged file. New edits found
    // this scan are appended below.
    const history: CommentEditHistoryEntry[] = prevMerged?.editHistory
      ? prevMerged.editHistory.map((e) => ({ ...e }))
      : [];

    // Carry forward prior statuses — but drop "new" (it only applies to
    // the scan in which the comment first appeared).
    const carried: ChangeStatus[] = (prevMerged?.changeStatus ?? []).filter(
      (s) => s !== "new"
    );

    const statuses: ChangeStatus[] = [...carried];

    if (!prevRaw) {
      // Not in the prior raw snapshot.
      // We only add "new" when we actually had a prior raw to diff against —
      // on the very first run (priorRaw is null, handled via early return
      // above) this code is skipped entirely. A comment that exists in the
      // merged file but not in the raw snapshot is a carry-forward from an
      // earlier crash; treat it as "new" relative to this run.
      statuses.push("new");
    } else {
      const priorBody = prevRaw.body || "";
      const newBody = c.body || "";
      const newIsDeletionMarker = isDeletionMarker(newBody);
      const priorWasDeletionMarker = isDeletionMarker(priorBody);

      if (newIsDeletionMarker && !priorWasDeletionMarker) {
        // Transition INTO deleted state. Mark deleted, substitute the
        // merged body with the last-known non-deleted text so the view
        // can still show what was archived.
        statuses.push("deleted");
        c.body = prevMerged?.body && !isDeletionMarker(prevMerged.body)
          ? prevMerged.body
          : priorBody;
        if (prevMerged?.body_html && !isDeletionMarker(prevMerged.body)) {
          c.body_html = prevMerged.body_html;
        } else if (prevRaw.body_html) {
          c.body_html = prevRaw.body_html;
        }
      } else if (!newIsDeletionMarker && newBody !== priorBody) {
        // Real edit. Record the prior body in history and mark edited.
        // Also clear any stale "deleted" status if the comment was
        // previously deleted and has now been restored (rare mod action).
        const idx = statuses.indexOf("deleted");
        if (idx >= 0) statuses.splice(idx, 1);
        statuses.push("edited");
        if (priorTs) {
          history.push({
            timestamp: priorTs,
            body: priorBody,
            body_html: prevRaw.body_html,
          });
        }
      }
      // else: body unchanged — no new status this scan.
    }

    const deduped = uniqueStatus(statuses);
    c.changeStatus = deduped.length > 0 ? deduped : undefined;
    c.editHistory = history.length > 0 ? history : undefined;
  };
  annotate(merged);

  // Step 2: graft any comments that were in the prior merged tree but are
  // missing from the new fetch. Treat them as deleted and attach under
  // their original parent if it still exists, otherwise at the tree root.
  const mergedMap = flattenCommentsById(merged);
  const missingIds: string[] = [];
  for (const id of priorMergedMap.keys()) {
    if (!newRawMap.has(id) && !mergedMap.has(id)) {
      missingIds.push(id);
    }
  }

  // Sort missing ids so that parents are grafted before their children —
  // this way a grafted parent can receive its grafted children below it
  // rather than forcing them to escalate to the root.
  const originalDepth = (id: string): number => {
    let d = 0;
    let cur: FlatCommentRef | undefined = priorMergedMap.get(id);
    while (cur && cur.parentId) {
      d++;
      cur = priorMergedMap.get(cur.parentId);
    }
    return d;
  };
  missingIds.sort((a, b) => originalDepth(a) - originalDepth(b));

  for (const id of missingIds) {
    const ref = priorMergedMap.get(id);
    if (!ref) continue;
    const grafted = cloneComment(ref.comment);
    const statuses = uniqueStatus([
      ...(grafted.changeStatus ?? []).filter((s) => s !== "new"),
      "deleted",
    ]);
    grafted.changeStatus = statuses;
    // Children are grafted independently below; clear them here so a
    // grafted parent doesn't double-import children that will be grafted
    // back under their own missing id. If a child is ALSO missing, the
    // missingIds pass will reattach it; if a child is present in the new
    // fetch, it already lives in the merged tree where it belongs.
    grafted.replies = [];

    // Find an attachment point in the current merged tree.
    let attached = false;
    let ancestorId = ref.parentId;
    while (ancestorId) {
      const ancestorRef = mergedMap.get(ancestorId);
      if (ancestorRef) {
        ancestorRef.comment.replies = ancestorRef.comment.replies || [];
        ancestorRef.comment.replies.push(grafted);
        attached = true;
        break;
      }
      // Walk further up the prior tree looking for a surviving ancestor.
      ancestorId = priorMergedMap.get(ancestorId)?.parentId ?? null;
    }
    if (!attached) {
      merged.push(grafted);
    }
    mergedMap.set(id, { comment: grafted, parentId: ref.parentId });
  }

  return merged;
}

// --- Post XML (minimal Node-side parser for change tracking) --------------

/**
 * Extract a subset of Post.nfo fields we need for diff/merge. This is a
 * deliberately small regex-based parser — we don't have a DOM on the
 * Node side and pulling in a full XML library is overkill for four tags.
 * The view-side parser (nfo-parser.ts) uses DOMParser and is authoritative
 * for rendering; this exists only to feed the change-tracker.
 */
interface ParsedPostSnapshot {
  title: string;
  selftext: string;
  author: string;
  changeStatus: ChangeStatus[];
  editHistory: Array<{ timestamp: string; title: string; selftext: string }>;
}

function xmlUnescape(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(xml: string, tag: string): string {
  // Non-greedy, first occurrence only. Good enough for our flat schema
  // where each tag appears at most once at the top level of <postdetails>.
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  return m ? xmlUnescape(m[1]) : "";
}

export function parsePostSnapshotXml(xml: string): ParsedPostSnapshot {
  const title = extractTag(xml, "title");
  const selftext = extractTag(xml, "selftext");
  const author = extractTag(xml, "author");

  const changeStatusRaw = extractTag(xml, "change_status");
  const changeStatus: ChangeStatus[] = changeStatusRaw
    ? (changeStatusRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s === "new" || s === "edited" || s === "deleted") as ChangeStatus[])
    : [];

  const editHistory: Array<{ timestamp: string; title: string; selftext: string }> = [];
  const historyBlockMatch = xml.match(/<edit_history>([\s\S]*?)<\/edit_history>/);
  if (historyBlockMatch) {
    const block = historyBlockMatch[1];
    const entryRe = /<entry\s+timestamp="([^"]+)">([\s\S]*?)<\/entry>/g;
    let em: RegExpExecArray | null;
    while ((em = entryRe.exec(block)) !== null) {
      const entryInner = em[2];
      editHistory.push({
        timestamp: em[1],
        title: extractTag(entryInner, "title"),
        selftext: extractTag(entryInner, "selftext"),
      });
    }
  }

  return { title, selftext, author, changeStatus, editHistory };
}

// --- Post diff/merge ------------------------------------------------------

export interface PostAnnotation {
  changeStatus: ChangeStatus[];
  editHistory: Array<{ timestamp: string; title: string; selftext: string }>;
  /**
   * The title/selftext that should be written into the merged Post.nfo.
   * For a deleted post these override the fresh values with the last-known
   * pre-deletion text; for all other cases they match the fresh post.
   */
  effectiveTitle: string;
  effectiveSelftext: string;
}

export function diffAndMergePost(
  priorRawXml: string | null,
  priorMergedXml: string | null,
  newPost: RedditPost,
  priorTs: string | null
): PostAnnotation {
  // No prior state at all → baseline, no annotation.
  if (!priorRawXml && !priorMergedXml) {
    return {
      changeStatus: [],
      editHistory: [],
      effectiveTitle: newPost.title,
      effectiveSelftext: newPost.selftext || "",
    };
  }

  const prevRaw = priorRawXml ? parsePostSnapshotXml(priorRawXml) : null;
  const prevMerged = priorMergedXml ? parsePostSnapshotXml(priorMergedXml) : null;

  // Carry forward edit history & statuses, minus "new" (posts never carry
  // "new"; the first download is always the baseline).
  const history = prevMerged ? [...prevMerged.editHistory] : [];
  const carried: ChangeStatus[] = (prevMerged?.changeStatus ?? []).filter(
    (s) => s !== "new"
  );
  const statuses: ChangeStatus[] = [...carried];

  const newTitle = newPost.title || "";
  const newSelftext = newPost.selftext || "";
  const newAuthor = newPost.author || "";

  let effectiveTitle = newTitle;
  let effectiveSelftext = newSelftext;

  // Pick the "previous" state to diff against — prefer raw snapshot.
  const prev = prevRaw ?? prevMerged;
  if (prev) {
    const prevTitle = prev.title;
    const prevSelftext = prev.selftext;
    const prevAuthor = prev.author;

    const newIsDeletionMarker =
      isDeletionMarker(newSelftext) ||
      newAuthor === "[deleted]" ||
      newAuthor === "[removed]";
    const prevWasDeletionMarker =
      isDeletionMarker(prevSelftext) ||
      prevAuthor === "[deleted]" ||
      prevAuthor === "[removed]";

    if (newIsDeletionMarker && !prevWasDeletionMarker) {
      // Flipped into deleted state. Keep the pre-deletion body visible.
      statuses.push("deleted");
      // Prefer the merged file's effective body (which may itself reflect
      // an earlier recovery) over the raw snapshot.
      const mergedBodyLooksDeleted =
        !prevMerged ||
        isDeletionMarker(prevMerged.selftext) ||
        prevMerged.selftext === "";
      effectiveTitle = mergedBodyLooksDeleted ? prev.title : prevMerged!.title;
      effectiveSelftext = mergedBodyLooksDeleted
        ? prev.selftext
        : prevMerged!.selftext;
    } else if (
      !newIsDeletionMarker &&
      (newTitle !== prevTitle || newSelftext !== prevSelftext)
    ) {
      // Real edit.
      const deletedIdx = statuses.indexOf("deleted");
      if (deletedIdx >= 0) statuses.splice(deletedIdx, 1);
      statuses.push("edited");
      if (priorTs) {
        history.push({
          timestamp: priorTs,
          title: prevTitle,
          selftext: prevSelftext,
        });
      }
    }
  }

  return {
    changeStatus: uniqueStatus(statuses),
    editHistory: history,
    effectiveTitle,
    effectiveSelftext,
  };
}

function buildPostNfo(
  post: RedditPost,
  sourceUrl: string,
  xmlEscape: (s: string) => string,
  upvoted?: UpvotedContext,
  annotation?: PostAnnotation
): string {
  // If the post has been annotated by the change-tracker, the title and
  // selftext written to Post.nfo are the "effective" values — which may
  // differ from the fresh Reddit fetch when the post has been deleted and
  // we're preserving the last-known pre-deletion body.
  const effectiveTitle = annotation ? annotation.effectiveTitle : post.title;
  const effectiveSelftext = annotation ? annotation.effectiveSelftext : post.selftext;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<postdetails>`,
    `  <title>${xmlEscape(effectiveTitle)}</title>`,
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

  // Upvoted-listing context — when present, this post was seen via the
  // user's /upvoted feed. `upvoted_archived_at` is the run's start time
  // (shared by every post in the run) and `upvoted_position` is the index
  // within the listing (0 = most recent upvote). See {@link UpvotedContext}.
  if (upvoted) {
    add("upvoted_archived_at", upvoted.archivedAt);
    add("upvoted_position", upvoted.position);
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

  // Self-text / post body (uses effective value — see annotation note above)
  if (effectiveSelftext && effectiveSelftext.trim()) {
    lines.push(`  <selftext>${xmlEscape(effectiveSelftext)}</selftext>`);
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

  // Change-tracking annotations (written only on the merged Post.nfo, never
  // on the raw per-run snapshots). The view reads these to render chips and
  // the edit-history dropdown.
  if (annotation && annotation.changeStatus.length > 0) {
    lines.push(`  <change_status>${xmlEscape(annotation.changeStatus.join(","))}</change_status>`);
  }
  if (annotation && annotation.editHistory.length > 0) {
    lines.push(`  <edit_history>`);
    for (const entry of annotation.editHistory) {
      lines.push(`    <entry timestamp="${xmlEscape(entry.timestamp)}">`);
      lines.push(`      <title>${xmlEscape(entry.title)}</title>`);
      if (entry.selftext) {
        lines.push(`      <selftext>${xmlEscape(entry.selftext)}</selftext>`);
      }
      lines.push(`    </entry>`);
    }
    lines.push(`  </edit_history>`);
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
      id: (c.id as string) || undefined,
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

/**
 * Reads the upvoted-context fields from an existing Post.nfo file if present.
 * Used by {@link writePostNfo} to make the first-archive upvoted order
 * immutable: subsequent re-writes of the same post preserve the original
 * `upvoted_archived_at` + `upvoted_position` rather than clobbering them with
 * the current run's values (which would corrupt the historical order).
 */
function readExistingUpvotedContext(nfoPath: string): UpvotedContext | null {
  try {
    if (!fs.existsSync(nfoPath)) return null;
    const existing = fs.readFileSync(nfoPath, "utf8");
    const atMatch = existing.match(
      /<upvoted_archived_at>([^<]+)<\/upvoted_archived_at>/
    );
    const posMatch = existing.match(
      /<upvoted_position>(\d+)<\/upvoted_position>/
    );
    if (!atMatch) return null;
    const position = posMatch ? parseInt(posMatch[1], 10) : 0;
    return { archivedAt: atMatch[1], position };
  } catch {
    return null;
  }
}

/**
 * Best-effort text file read. Returns null on any error — callers treat a
 * missing or unreadable file the same as "no prior state".
 */
function safeReadTextFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function writePostNfo(
  post: RedditPost,
  sourceUrl: string,
  postDir: string,
  logger: PluginLogger,
  xmlEscape: (s: string) => string,
  upvoted?: UpvotedContext,
  runTimestamp?: string
): void {
  const nfoPath = path.join(postDir, "Post.nfo");
  try {
    // Preserve existing upvoted context if already present on disk. The
    // first time we see a post in the upvoted listing, its archive time +
    // position become immutable — a later re-run that re-visits the same
    // post must not stomp them with the new run's timestamp.
    const existingUpvoted = readExistingUpvotedContext(nfoPath);
    const finalUpvoted = existingUpvoted ?? upvoted;

    // Change-tracking mode: when a runTimestamp is provided, also write a
    // raw per-run snapshot (Post-{ts}.nfo) and an annotated merged Post.nfo
    // that carries any edit/delete history detected against the prior run.
    if (runTimestamp) {
      const priorSnapFile = findLatestSnapshot(postDir, "Post", "nfo");
      const priorTs = priorSnapFile ? snapshotTimestamp(priorSnapFile) : null;
      const priorRawXml = priorSnapFile
        ? safeReadTextFile(path.join(postDir, priorSnapFile))
        : null;
      const priorMergedXml = fs.existsSync(nfoPath) ? safeReadTextFile(nfoPath) : null;

      const annotation = diffAndMergePost(priorRawXml, priorMergedXml, post, priorTs);

      // Raw snapshot first — unannotated, exactly what we fetched. Future
      // runs diff against this file.
      const rawContent = buildPostNfo(post, sourceUrl, xmlEscape, finalUpvoted);
      const snapshotName = `Post-${runTimestamp}.nfo`;
      fs.writeFileSync(path.join(postDir, snapshotName), rawContent, "utf8");

      // Merged annotated file (what the view renders).
      const mergedContent = buildPostNfo(
        post,
        sourceUrl,
        xmlEscape,
        finalUpvoted,
        annotation
      );
      fs.writeFileSync(nfoPath, mergedContent, "utf8");

      pruneOldSnapshots(postDir, "Post", "nfo", snapshotName, logger);

      if (annotation.changeStatus.length > 0) {
        logger.info(
          `Wrote NFO (change-tracked: ${annotation.changeStatus.join(",")}): ${nfoPath}`
        );
      } else {
        logger.info(`Wrote NFO (change-tracked): ${nfoPath}`);
      }
      return;
    }

    // Legacy path (should no longer be reached, but kept as a safety net).
    const content = buildPostNfo(post, sourceUrl, xmlEscape, finalUpvoted);
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
  context?: DownloadContext,
  runTimestamp?: string
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

    const rawClean = processCommentTree(listing.data.children);
    // The tree may contain "more" stubs alongside real comments. For the
    // change-tracker we want only real CleanComment nodes — the differ
    // handles stubs defensively but keeping them out simplifies reasoning.
    // We DO still want to preserve the stubs in the output for the view,
    // so we write the raw tree as-is and only pass the walking differ a
    // tree that happens to include stubs (which it skips).
    const cleanComments = rawClean as CleanComment[];

    // Download comment media (giphy GIFs, images) for the new fetch only.
    // Previously-downloaded media for grafted (deleted) comments already
    // lives under comment_media/ from earlier runs.
    if (context && cleanComments.length > 0) {
      await downloadCommentMedia(
        cleanComments,
        postDir,
        context.helpers,
        context.maxDownloadThreads,
        logger
      );
    }

    // Change-tracking mode: write both a raw snapshot and an annotated
    // merged Comments.json. If `runTimestamp` is absent we fall back to
    // the legacy single-file write.
    if (runTimestamp) {
      const priorSnapFile = findLatestSnapshot(postDir, "Comments", "json");
      const priorTs = priorSnapFile ? snapshotTimestamp(priorSnapFile) : null;

      const priorRawText = priorSnapFile
        ? safeReadTextFile(path.join(postDir, priorSnapFile))
        : null;
      const priorMergedText = fs.existsSync(commentsPath)
        ? safeReadTextFile(commentsPath)
        : null;

      const priorRaw: CleanComment[] | null = priorRawText
        ? safeParseJsonArray(priorRawText, logger, "prior raw snapshot")
        : null;
      const priorMerged: CleanComment[] | null = priorMergedText
        ? safeParseJsonArray(priorMergedText, logger, "prior merged Comments.json")
        : null;

      // No prior state AND no new comments → nothing to do.
      if (!priorRaw && !priorMerged && cleanComments.length === 0) {
        logger.info("No comments to save");
        return;
      }

      const merged = diffAndMergeComments(
        priorRaw,
        priorMerged,
        cleanComments,
        priorTs
      );

      // Write raw snapshot first (no annotations — the differ's next input).
      const snapshotName = `Comments-${runTimestamp}.json`;
      fs.writeFileSync(
        path.join(postDir, snapshotName),
        JSON.stringify(cleanComments, null, 2),
        "utf8"
      );

      // Write merged annotated file (what the view reads).
      fs.writeFileSync(commentsPath, JSON.stringify(merged, null, 2), "utf8");

      pruneOldSnapshots(postDir, "Comments", "json", snapshotName, logger);

      logger.info(
        `Wrote ${merged.length} top-level comments (change-tracked): ${commentsPath}`
      );
      return;
    }

    // Legacy path.
    if (cleanComments.length === 0) {
      logger.info("No comments to save");
      return;
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

/**
 * Parse a JSON string expecting a top-level array. Returns null on any
 * failure (with a warning) so the caller can treat corrupted prior state
 * as missing state and fall back to baseline behavior.
 */
function safeParseJsonArray(
  text: string,
  logger: PluginLogger,
  label: string
): CleanComment[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as CleanComment[];
    logger.warn(`${label}: expected JSON array, got ${typeof parsed}`);
    return null;
  } catch (err) {
    logger.warn(
      `${label}: JSON parse failed (${
        err instanceof Error ? err.message : String(err)
      })`
    );
    return null;
  }
}

// =============================================================================
// Comment Media Download
// =============================================================================

const COMMENT_IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp)(?:$|\?)/i;
const REDDIT_IMAGE_HOSTS = new Set([
  "preview.redd.it",
  "i.redd.it",
  "external-preview.redd.it",
]);

function hashUrlShort(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
}

/**
 * Computes a deterministic, collision-resistant filename for an image URL.
 * Combines an 8-char SHA-1 prefix of the full URL with the URL path's basename,
 * so (a) the same URL always maps to the same file and (b) different URLs that
 * happen to share a basename never overwrite each other.
 */
function buildCommentImageFilename(
  url: string,
  sanitize: (s: string) => string
): string {
  const hash = hashUrlShort(url);
  let base = "";
  try {
    const urlObj = new URL(url);
    base = path.basename(urlObj.pathname);
    // Strip any accidental trailing punctuation that might have survived
    base = base.replace(/[^\w.\-]+$/g, "");
  } catch {
    base = "";
  }
  if (!base) base = "image.jpg";
  return sanitize(`${hash}_${base}`);
}

/**
 * Extract media references from Reddit comment bodies.
 * Handles:
 *   - ![gif](giphy|ID) / ![gif](giphy|ID|variant)
 *   - ![img](URL) markdown syntax
 *   - Raw http(s) image URLs on Reddit image CDNs (preview.redd.it, i.redd.it,
 *     external-preview.redd.it) or any raw URL whose path ends in a known
 *     image extension — these are the auto-linked URLs users paste into
 *     comments, which Reddit returns verbatim in the body text.
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
      // Track URLs captured via markdown patterns so the raw-URL pass doesn't
      // double-capture them.
      const capturedUrls = new Set<string>();

      // 1. ![gif](giphy|ID) / ![gif](giphy|ID|variant)
      const giphyRegex = /!\[gif\]\(giphy\|([a-zA-Z0-9]+)(?:\|[^)]+)?\)/g;
      let match;
      while ((match = giphyRegex.exec(body)) !== null) {
        const giphyId = match[1];
        const key = `giphy:${giphyId}`;
        const url = `https://i.giphy.com/media/${giphyId}/giphy.gif`;
        const filename = sanitize(`giphy_${giphyId}.gif`);
        items.push({ key, url, filename, comment });
      }

      // 2. ![img](URL) markdown syntax — image extensions only
      const imgRegex = /!\[img\]\((https?:\/\/[^)]+\.(?:jpe?g|png|gif|webp|avif|bmp)(?:\?[^)]*)?)\)/gi;
      while ((match = imgRegex.exec(body)) !== null) {
        const imgUrl = match[1];
        capturedUrls.add(imgUrl);
        const key = `img:${imgUrl}`;
        const filename = buildCommentImageFilename(imgUrl, sanitize);
        items.push({ key, url: imgUrl, filename, comment });
      }

      // 3. Raw http(s) URLs (auto-linked by Reddit, not wrapped in markdown).
      // Strip the markdown image/gif syntax first so we don't re-match URLs
      // embedded inside `![img](...)`.
      const bodyForRawScan = body
        .replace(giphyRegex, "")
        .replace(/!\[img\]\([^)]+\)/g, "");

      const rawUrlRegex = /https?:\/\/[^\s<>"'`\]\)]+/g;
      let rawMatch: RegExpExecArray | null;
      const seenInComment = new Set<string>();
      while ((rawMatch = rawUrlRegex.exec(bodyForRawScan)) !== null) {
        // Trim trailing punctuation that's almost certainly not part of the URL
        // (sentence terminators, closing brackets).
        let url = rawMatch[0].replace(/[.,;:!?)\]]+$/, "");
        if (!url) continue;
        if (capturedUrls.has(url)) continue;
        if (seenInComment.has(url)) continue;
        seenInComment.add(url);

        let urlObj: URL;
        try {
          urlObj = new URL(url);
        } catch {
          continue;
        }

        const host = urlObj.hostname.toLowerCase();
        const isRedditImageHost = REDDIT_IMAGE_HOSTS.has(host);
        const hasImageExt = COMMENT_IMAGE_EXT_RE.test(urlObj.pathname);
        if (!isRedditImageHost && !hasImageExt) continue;

        const key = `img:${url}`;
        const filename = buildCommentImageFilename(url, sanitize);
        items.push({ key, url, filename, comment });
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
 * Download all media referenced in Reddit comments and update comments with
 * local media mappings. For each item:
 *   - If the download succeeds (file exists on disk afterward), `comment.media[key]`
 *     points at the local filename and the view strips the URL from the body
 *     and renders the local image.
 *   - If the download fails, the `media[key]` entry is removed so the view
 *     leaves the original URL in the comment body as a plain link.
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

  // Tentatively assign local filenames on each comment, then verify afterward.
  const seen = new Set<string>();
  const downloads: Array<{ url: string; outputPath: string }> = [];

  for (const item of mediaItems) {
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
    } catch (err) {
      logger.warn(`Some comment media downloads failed: ${err}`);
    }
  }

  // Verify every referenced file actually exists on disk; drop entries that
  // don't so the view can render the plain URL instead of a broken image.
  let kept = 0;
  let dropped = 0;
  for (const item of mediaItems) {
    const outputPath = path.join(mediaDir, item.filename);
    const ok = await helpers.io.fileExists(outputPath);
    if (ok) {
      kept++;
    } else {
      dropped++;
      if (item.comment.media) {
        delete item.comment.media[item.key];
        if (Object.keys(item.comment.media).length === 0) {
          delete item.comment.media;
        }
      }
    }
  }

  if (dropped > 0) {
    logger.warn(
      `Comment media: ${kept} saved, ${dropped} failed to download (will render as plain URLs)`
    );
  } else if (kept > 0) {
    logger.info(`Downloaded ${kept} comment media files`);
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

// =============================================================================
// External-media download (gallery-dl delegate)
// =============================================================================
//
// When a Reddit post links to a host we know gallery-dl can handle
// (redgifs, imgur, streamable, gfycat), spawn gallery-dl and drop the media
// directly into the post folder with a recognizable prefix so the view can
// (a) render it inline via the shared media player and (b) suppress the
// external "link card" placeholder. Failures are soft — the link card remains
// as the graceful fallback.

/** Curated external hosts that get auto-archived via gallery-dl. */
const EXTERNAL_MEDIA_HOSTS: Record<string, { prefix: string; site: string }> = {
  "redgifs.com":    { prefix: "redgifs",    site: "redgifs" },
  "imgur.com":      { prefix: "imgur",      site: "imgur" },
  "i.imgur.com":    { prefix: "imgur",      site: "imgur" },
  "streamable.com": { prefix: "streamable", site: "streamable" },
  "gfycat.com":     { prefix: "gfycat",     site: "gfycat" },
};

/** Normalize a hostname for allow-list lookup (strips common www./m. prefixes). */
function normalizeHost(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^(www\.|m\.|old\.|new\.)/, "");
}

/**
 * Decide whether a post's linked URL should be auto-archived via gallery-dl.
 * Checks the top-level `post.url` first, then falls back to
 * `crosspost_parent_list[0].url` for crossposts.
 */
function pickExternalMediaUrl(
  post: RedditPost
): { url: string; prefix: string; site: string } | null {
  const candidates: string[] = [];
  if (post.url) candidates.push(post.url);
  const parent = post.crosspost_parent_list?.[0];
  if (parent?.url) candidates.push(parent.url);

  for (const candidate of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }
    const host = normalizeHost(parsed.hostname);
    // Exact match first
    if (EXTERNAL_MEDIA_HOSTS[host]) {
      return { url: candidate, ...EXTERNAL_MEDIA_HOSTS[host] };
    }
    // Subdomain match: foo.redgifs.com → redgifs.com
    for (const rootHost of Object.keys(EXTERNAL_MEDIA_HOSTS)) {
      if (host.endsWith(`.${rootHost}`)) {
        return { url: candidate, ...EXTERNAL_MEDIA_HOSTS[rootHost] };
      }
    }
  }
  return null;
}

/**
 * Build a minimal gallery-dl config that writes the downloaded file directly
 * into `postDir` with a recognizable prefix so the view's file-scan can
 * distinguish it from native Reddit media.
 *
 * The config overrides the `directory` template to an empty array (no nested
 * subfolders) and sets a per-site `filename` template with a distinctive
 * prefix (e.g. `redgifs_<id>.<ext>`).
 */
function buildExternalMediaConfig(
  postDir: string,
  prefix: string,
  site: string
): Record<string, unknown> {
  const extractor: Record<string, unknown> = {
    "base-directory": postDir,
    // Empty array → no nested subdirectories beneath base-directory
    directory: [],
    // Gentle default: 1 request-second between requests so we don't hammer
    // the external host when a post loop processes many linked URLs.
    "sleep-request": 1.0,
  };
  extractor[site] = {
    filename: `${prefix}_{id}.{extension}`,
  };
  return { extractor };
}

/**
 * Opportunistic external-media archive for a single Reddit post. Returns
 * `true` if at least one file was downloaded, `false` otherwise. Never
 * throws — any failure (missing gallery-dl, unsupported URL, timeout,
 * network error) is logged and the call silently returns false.
 */
async function maybeDownloadExternalMedia(
  context: DownloadContext,
  post: RedditPost,
  postDir: string
): Promise<boolean> {
  const picked = pickExternalMediaUrl(post);
  if (!picked) return false;

  const { logger, helpers } = context;
  logger.info(`Post links to ${picked.site}; attempting gallery-dl archive of ${picked.url}`);

  try {
    await helpers.io.ensureDir(postDir);
    const config = buildExternalMediaConfig(postDir, picked.prefix, picked.site);
    const result = await runGalleryDl({
      url: picked.url,
      outputDir: postDir,
      config,
      // Use os.tmpdir() so the throwaway config file doesn't clutter the
      // user-visible post folder.
      configFileDir: os.tmpdir(),
      // Generous per-link timeout — gallery-dl covers slow hosts gracefully.
      timeoutMs: 3 * 60 * 1000,
      logger,
      shell: helpers.string,
      io: helpers.io,
    });

    if (result.success && result.downloadedFiles.length > 0) {
      logger.info(
        `gallery-dl archived ${result.downloadedFiles.length} file(s) for ${picked.site}: ${result.downloadedFiles
          .map((f) => path.basename(f))
          .join(", ")}`
      );
      return true;
    }
    if (result.success) {
      logger.info(`gallery-dl reported success but no files were written for ${picked.url}`);
      return false;
    }
    logger.warn(
      `gallery-dl failed for ${picked.url}: ${result.message}. Post will render with the external link card.`
    );
    return false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`maybeDownloadExternalMedia error: ${msg}`);
    return false;
  }
}

async function downloadPostToFolder(
  context: DownloadContext,
  post: RedditPost,
  postDir: string,
  sourceUrl: string,
  saveMetadata: boolean,
  fetchComments: boolean,
  upvotedContext?: UpvotedContext
): Promise<{ downloaded: number; skipped: number; isVideo: boolean; metadataSaved: boolean }> {
  const { helpers, logger } = context;

  // One timestamp per post per run — shared between Post.nfo and
  // Comments.json so the snapshot pair stays in lockstep for the
  // change-tracker.
  const runTimestamp = makeRunTimestamp();

  if (isVideoPost(post) && !isGifVideoPost(post)) {
    // Download video with audio muxing via ffmpeg
    await helpers.io.ensureDir(postDir);
    writePostNfo(post, sourceUrl, postDir, logger, helpers.string.xmlEscape, upvotedContext, runTimestamp);
    // Video posts don't carry an external media URL, but call the helper
    // anyway — it's a no-op for non-curated hosts.
    await maybeDownloadExternalMedia(context, post, postDir);
    if (fetchComments) {
      try {
        const commentUrl = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`;
        const commentResponse = (await rateLimitedFetch(
          commentUrl,
          logger
        )) as unknown[];
        if (Array.isArray(commentResponse) && commentResponse.length >= 2) {
          await writePostComments(commentResponse[1], postDir, logger, context, runTimestamp);
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
  writePostNfo(post, sourceUrl, postDir, logger, helpers.string.xmlEscape, upvotedContext, runTimestamp);

  // External-media archive (redgifs/imgur/streamable/gfycat) — opportunistic,
  // never blocks the native flow on failure.
  await maybeDownloadExternalMedia(context, post, postDir);

  if (fetchComments) {
    try {
      const commentUrl = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`;
      const commentResponse = (await rateLimitedFetch(
        commentUrl,
        logger
      )) as unknown[];
      if (Array.isArray(commentResponse) && commentResponse.length >= 2) {
        await writePostComments(commentResponse[1], postDir, logger, context, runTimestamp);
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

  // One timestamp per post per run — shared between Post.nfo and
  // Comments.json so the change-tracker diffs lockstepped snapshots.
  const runTimestamp = makeRunTimestamp();
  writePostNfo(post, sourceUrl, postDir, logger, helpers.string.xmlEscape, undefined, runTimestamp);

  // Opportunistic external-media archive: if this post links to a
  // gallery-dl-supported host (redgifs, imgur, streamable, gfycat), pull the
  // media into the post folder so the view can render it inline instead of
  // the external link-card placeholder.
  await maybeDownloadExternalMedia(context, post, postDir);

  if (response.length >= 2) {
    await writePostComments(response[1], postDir, logger, context, runTimestamp);
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
  let totalFailed = 0;
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

    try {
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
    } catch (err) {
      totalFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Failed to archive post "${post.title}" (${post.id}) from r/${post.subreddit}: ${msg}. Continuing with the next post.`
      );
    }
  }

  // Fetch and save user icon
  await fetchAndSaveUserIcon(context, username, path.join(rootDirectory, saveDir, redditSubfolder, username));

  const parts: string[] = [
    `u/${username}: Archived ${totalArchived} posts (${totalDownloaded} media files downloaded)`,
  ];
  if (totalSkipped > 0) parts.push(`${totalSkipped} already existed`);
  if (totalFailed > 0)
    parts.push(`${totalFailed} post(s) failed and were skipped (see logs)`);
  if (videoPosts > 0)
    parts.push(`${videoPosts} video post(s) (metadata saved, use yt-dlp for video)`);
  parts.push(
    `across ${subredditsFound.size} subreddit(s): ${Array.from(subredditsFound).slice(0, 10).join(", ")}${subredditsFound.size > 10 ? "..." : ""}`
  );

  return { success: true, message: parts.join(". ") };
}

async function handleUserUpvoted(
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

  const account = findRedditAccountByUsername(settings, username);
  if (!account) {
    const configured = loadRedditAccountSlots(settings)
      .map((s) => redditAccountDisplayName(s))
      .filter((n) => n.length > 0);
    const configuredHint = configured.length
      ? ` Configured accounts: ${configured.map((n) => `u/${n}`).join(", ")}.`
      : " No Reddit accounts are configured yet.";
    return {
      success: false,
      message:
        `No configured Reddit account matches u/${username}. ` +
        `Open plugin settings → Reddit Account N, set the username to '${username}', ` +
        `upload a cookies.txt file, and click 'Test Connection'.` +
        configuredHint,
    };
  }

  const resolved = resolveRedditCookieHeader(
    account.slot,
    account.cookiesFile,
    logger
  );
  if (!resolved) {
    const hint = account.cookiesFile
      ? `The configured cookies file (${account.cookiesFile}) is missing or unreadable, and no cached snapshot is available for slot ${account.slot}.`
      : `No cookies file is configured for slot ${account.slot} and no cached snapshot exists.`;
    return {
      success: false,
      message:
        `Account slot ${account.slot} (u/${redditAccountDisplayName(account)}) has no usable cookies. ` +
        `${hint} ` +
        `Re-upload cookies.txt in plugin settings and click Test Connection — the plugin will snapshot ` +
        `the file to ~/.thearchiver/plugin-social/accounts/ so it survives host reboots next time.`,
    };
  }
  const cookieHeader = resolved.cookieHeader;

  logger.info(
    `Fetching upvoted posts for u/${username} using account slot ${account.slot} (cookies from ${resolved.resolvedFrom}: ${resolved.sourcePath})`
  );
  const baseUrl = `https://www.reddit.com/user/${username}/upvoted.json`;

  let posts: RedditPost[];
  try {
    posts = await fetchAllPosts(baseUrl, postCount, logger, cookieHeader);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("403")) {
      return {
        success: false,
        message:
          `Reddit returned 403 for u/${username}/upvoted. ` +
          `Upvoted listings are private — the cookies must belong to u/${username}, ` +
          `and the account's preferences must have "Make my votes public" enabled on reddit.com/prefs.`,
      };
    }
    throw err;
  }

  if (posts.length === 0) {
    return {
      success: false,
      message:
        `No upvoted posts returned for u/${username}. ` +
        `Make sure the cookies are fresh and belong to this user, and that ` +
        `"Make my votes public" is enabled on reddit.com/prefs.`,
    };
  }

  logger.info(`Found ${posts.length} upvoted posts for u/${username}`);

  // ── Resolve destination folder ───────────────────────────────────────
  //
  // Layout: {root}/{saveDir}/{redditSubfolder}/{username}/Upvoted/{Post Title}/
  //
  // If the matched account has a custom `upvotedFolder` set, that path
  // replaces the entire default structure — e.g.
  // `Archive/alice-upvotes` → <root>/Archive/alice-upvotes/<Post Title>/.
  //
  // We read the setting DIRECTLY via `settings.get()` here (rather than
  // relying solely on what findRedditAccountByUsername returned) so the
  // diagnostic logs below capture the raw host-side value. This lets us
  // debug "my custom folder isn't being used" reports by comparing:
  //   1. What the host returns for the setting key
  //   2. What sanitizeRelativeFolder produces from it
  //   3. What path is actually picked
  const rawCustomFolderSetting = settings.get(
    `reddit_account_${account.slot}_upvoted_folder`
  );
  const customFolderSanitized = sanitizeRelativeFolder(
    (rawCustomFolderSetting as string | undefined | null) || ""
  );
  logger.info(
    `Upvoted folder resolution for slot ${account.slot}: ` +
      `raw setting value = ${JSON.stringify(rawCustomFolderSetting)}, ` +
      `sanitised = ${JSON.stringify(customFolderSanitized)}, ` +
      `account.upvotedFolder = ${JSON.stringify(account.upvotedFolder)}`
  );

  // Prefer the freshly-read value over the snapshot in `account.upvotedFolder`
  // so any race between slot load and download start can't serve stale data.
  const effectiveCustomFolder = customFolderSanitized || account.upvotedFolder;
  const upvotedBase = effectiveCustomFolder
    ? path.join(rootDirectory, effectiveCustomFolder)
    : path.join(
        rootDirectory,
        saveDir,
        redditSubfolder,
        username,
        "Upvoted"
      );
  if (effectiveCustomFolder) {
    logger.info(
      `Using CUSTOM upvoted folder for slot ${account.slot}: ${effectiveCustomFolder} → ${upvotedBase}`
    );
  } else {
    logger.info(
      `Using DEFAULT upvoted folder for slot ${account.slot}: ${upvotedBase} ` +
        `(no custom folder set; raw setting was ${JSON.stringify(rawCustomFolderSetting)})`
    );
  }

  let totalDownloaded = 0;
  let totalSkipped = 0;
  let videoPosts = 0;
  let totalArchived = 0;
  let totalFailed = 0;
  const subredditsFound = new Set<string>();
  // Track which subreddits we've already tried to fetch icons for this run,
  // so we only do the extra /about.json call once per unique subreddit. The
  // icons are saved to <redditRoot>/<subreddit>/icon.* so the mixed-subreddit
  // timeline view can render per-card icons even when the user has never
  // downloaded those subreddits directly.
  const subredditIconsAttempted = new Set<string>();

  // Snapshot of "when this run started" — shared by every post archived in
  // this pass. Combined with the per-post `position` index below, it gives a
  // stable (archivedAt DESC, position ASC) sort key that preserves the
  // upvoted listing order globally across multiple runs.
  const runArchivedAt = new Date().toISOString();

  for (let postIndex = 0; postIndex < posts.length; postIndex++) {
    const post = posts[postIndex];
    subredditsFound.add(post.subreddit);

    if (!subredditIconsAttempted.has(post.subreddit)) {
      subredditIconsAttempted.add(post.subreddit);
      try {
        await fetchAndSaveSubredditIcon(
          context,
          post.subreddit,
          path.join(rootDirectory, saveDir, redditSubfolder, post.subreddit)
        );
      } catch (err) {
        // Icon fetch is best-effort; never let it block post archiving.
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          `Failed to fetch icon for r/${post.subreddit} during upvoted run: ${msg}`
        );
      }
    }

    const folderName = postFolderName(post, helpers.string);
    const postDir = path.join(upvotedBase, folderName);

    try {
      const result = await downloadPostToFolder(
        context,
        post,
        postDir,
        sourceUrl,
        saveMetadata,
        saveMetadata,
        { archivedAt: runArchivedAt, position: postIndex }
      );

      totalArchived++;
      if (result.isVideo) videoPosts++;
      totalDownloaded += result.downloaded;
      totalSkipped += result.skipped;
    } catch (err) {
      totalFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Failed to archive upvoted post "${post.title}" (${post.id}) from r/${post.subreddit}: ${msg}. Continuing with the next post.`
      );
    }
  }

  // Fetch and save user icon at the same level as the post folders
  await fetchAndSaveUserIcon(
    context,
    username,
    path.join(rootDirectory, saveDir, redditSubfolder, username)
  );

  const parts: string[] = [
    `u/${username} upvoted: Archived ${totalArchived} posts (${totalDownloaded} media files downloaded)`,
  ];
  if (totalSkipped > 0) parts.push(`${totalSkipped} already existed`);
  if (totalFailed > 0)
    parts.push(`${totalFailed} post(s) failed and were skipped (see logs)`);
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
  let totalFailed = 0;

  for (const post of posts) {
    const folderName = postFolderName(post, helpers.string);
    const postDir = path.join(rootDirectory, saveDir, redditSubfolder, subreddit, folderName);

    try {
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
    } catch (err) {
      totalFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Failed to archive post "${post.title}" (${post.id}): ${msg}. Continuing with the next post.`
      );
    }
  }

  // Fetch and save subreddit icon
  await fetchAndSaveSubredditIcon(context, subreddit, path.join(rootDirectory, saveDir, redditSubfolder, subreddit));

  const parts: string[] = [
    `r/${subreddit}: Archived ${totalArchived} posts (${totalDownloaded} media files downloaded)`,
  ];
  if (totalSkipped > 0) parts.push(`${totalSkipped} already existed`);
  if (totalFailed > 0)
    parts.push(`${totalFailed} post(s) failed and were skipped (see logs)`);
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
      case "user_upvoted":
        return await handleUserUpvoted(context, redditParsed);
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
