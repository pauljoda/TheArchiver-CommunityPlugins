import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { urlPatterns } from "./sites";
import { pluginSettings } from "./settings";

// Types inlined to avoid dependency on TheArchiver source at compile time
interface DownloadResult {
  success: boolean;
  message: string;
}

interface PluginSettingsAccessor {
  get<T = string>(key: string): T;
  set(key: string, value: string): Promise<void>;
}

interface PluginHelpers {
  html: unknown;
  io: {
    ensureDir: (path: string) => Promise<void>;
    fileExists: (path: string) => Promise<boolean>;
    downloadFile: (url: string, outputPath: string, options?: unknown) => Promise<void>;
    downloadFiles: (files: Array<{ url: string; outputPath: string }>, concurrency?: number, options?: unknown) => Promise<void>;
    createZip: (sourceDir: string, outputPath: string) => Promise<void>;
    listFiles: (dirPath: string, pattern?: RegExp) => Promise<string[]>;
    moveFile: (src: string, dest: string) => Promise<void>;
  };
  url: unknown;
  string: {
    sanitizeFilename: (input: string) => string;
    slugify: (input: string) => string;
    padNumber: (num: number, length: number) => string;
    removeNumbersAndSpaces: (input: string) => string;
  };
}

interface PluginLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

interface DownloadContext {
  url: string;
  rootDirectory: string;
  maxDownloadThreads: number;
  helpers: PluginHelpers;
  logger: PluginLogger;
  settings: PluginSettingsAccessor;
}

interface ActionContext {
  settings: PluginSettingsAccessor;
  logger: PluginLogger;
}

interface ActionResult {
  success: boolean;
  message: string;
  settingsUpdates?: Array<{ key: string; value: string }>;
}

interface ArchiverPlugin {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  urlPatterns: string[];
  settings?: unknown[];
  actions?: Record<string, (context: ActionContext) => Promise<ActionResult>>;
  download: (context: DownloadContext) => Promise<DownloadResult>;
}

function definePlugin(plugin: ArchiverPlugin): ArchiverPlugin {
  return plugin;
}

interface RedditPost {
  id: string;
  name: string;
  title: string;
  author: string;
  subreddit: string;
  subreddit_name_prefixed?: string;
  url: string;
  permalink: string;
  domain: string;
  selftext: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  edited: boolean | number;
  over_18: boolean;
  spoiler: boolean;
  stickied: boolean;
  locked: boolean;
  archived?: boolean;
  is_video: boolean;
  is_gallery?: boolean;
  post_hint?: string;
  link_flair_text?: string | null;
  author_flair_text?: string | null;
  thumbnail?: string;
  preview?: {
    images?: Array<{
      source: { url: string; width: number; height: number };
    }>;
  };
  media_metadata?: Record<
    string,
    {
      status: string;
      e: string;
      m: string;
      s: { u?: string; gif?: string; x: number; y: number };
    }
  >;
  gallery_data?: {
    items: Array<{ media_id: string; id: number; caption?: string }>;
  };
  crosspost_parent_list?: RedditPost[];
  media?: {
    reddit_video?: {
      fallback_url: string;
      height: number;
      width: number;
      duration: number;
    };
  };
}

interface ParsedRedditUrl {
  type: "post" | "user" | "subreddit";
  subreddit?: string;
  postId?: string;
  username?: string;
}

interface RedditListingResponse {
  kind: "Listing";
  data: {
    after: string | null;
    children: Array<{
      kind: string;
      data: RedditPost;
    }>;
  };
}

interface MediaItem {
  url: string;
  filename: string;
}

// =========================================
// Helpers
// =========================================

function execAsync(
  cmd: string,
  options?: { timeout?: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      { maxBuffer: 50 * 1024 * 1024, timeout: options?.timeout },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            Object.assign(error, {
              stdout: stdout?.toString() ?? "",
              stderr: stderr?.toString() ?? "",
            })
          );
        } else {
          resolve({
            stdout: stdout?.toString() ?? "",
            stderr: stderr?.toString() ?? "",
          });
        }
      }
    );
  });
}

function shellEscape(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/** Escape a string for safe inclusion in XML text content. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Get a setting value, returning empty string for falsy / "null" / "undefined" values.
 */
function getSetting(settings: PluginSettingsAccessor, key: string): string {
  const raw = settings.get(key);
  if (!raw || raw === "null" || raw === "undefined" || raw === "none") return "";
  return raw;
}

/**
 * Get a boolean setting, with a default value.
 */
function getBoolSetting(settings: PluginSettingsAccessor, key: string, defaultVal: boolean): boolean {
  const raw = getSetting(settings, key);
  if (raw === "") return defaultVal;
  return raw === "true";
}

/**
 * Resolve the plugin's tracked base folder.
 * `save_directory` is the canonical setting used by the host view registry,
 * while `library_folder` is retained as a legacy fallback.
 */
function getBaseFolder(settings: PluginSettingsAccessor): string {
  return getSetting(settings, "save_directory") || getSetting(settings, "library_folder") || "gallery-dl";
}

/**
 * Resolve the output directory for a download URL.
 * Checks the per-site directory overrides first, then falls back to the default library folder.
 */
function resolveOutputDir(
  url: string,
  rootDirectory: string,
  baseFolder: string,
  settings: PluginSettingsAccessor,
  logger: PluginLogger
): string {
  const baseOutputDir = path.join(rootDirectory, baseFolder);
  const raw = getSetting(settings, "site_directories");
  if (!raw) return baseOutputDir;

  let siteMap: Record<string, string>;
  try {
    siteMap = JSON.parse(raw);
  } catch {
    logger.warn("site_directories setting is not valid JSON, using default folder");
    return baseOutputDir;
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return baseOutputDir;
  }

  for (const [domain, folder] of Object.entries(siteMap)) {
    if (hostname === domain || hostname.endsWith("." + domain)) {
      const segments = folder.split(/[\\/]+/).filter(Boolean);
      if (segments.length === 0) {
        return baseOutputDir;
      }

      const relativePath =
        segments[0] === baseFolder ? segments : [baseFolder, ...segments];

      logger.info(`Site directory override: ${domain} -> ${relativePath.join("/")}`);
      return path.join(rootDirectory, ...relativePath);
    }
  }

  return baseOutputDir;
}

// =========================================
// gallery-dl Config Generation
// =========================================

/**
 * Build a gallery-dl configuration object from plugin settings.
 * This is written to a temp config file and passed via --config.
 */
function buildConfig(
  settings: PluginSettingsAccessor,
  outputDir: string,
  logger: PluginLogger
): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const extractor: Record<string, unknown> = {};
  const downloader: Record<string, unknown> = {};
  const postprocessors: Record<string, unknown>[] = [];

  // ── Base directory ──
  extractor["base-directory"] = outputDir;

  // ── Directory / filename templates ──
  const dirTemplate = getSetting(settings, "directory_template");
  if (dirTemplate) {
    extractor["directory"] = dirTemplate.split("/");
  }
  const fnTemplate = getSetting(settings, "filename_template");
  if (fnTemplate) {
    extractor["filename"] = fnTemplate;
  }

  // ── Skip / Archive ──
  const skipExisting = getSetting(settings, "skip_existing") || "true";
  if (skipExisting === "false") {
    extractor["skip"] = false;
  } else if (skipExisting === "true") {
    extractor["skip"] = true;
  } else {
    extractor["skip"] = skipExisting; // "abort:N", "terminate:N"
  }

  if (getBoolSetting(settings, "download_archive", true)) {
    extractor["archive"] = path.join(outputDir, ".gallery-dl-archive.sqlite3");
  }

  // ── Filters ──
  const fileFilter = getSetting(settings, "file_filter");
  if (fileFilter) extractor["file-filter"] = fileFilter;

  const postFilter = getSetting(settings, "post_filter");
  if (postFilter) extractor["post-filter"] = postFilter;

  const fileRange = getSetting(settings, "file_range");
  if (fileRange) extractor["file-range"] = fileRange;

  const imageRange = getSetting(settings, "image_range");
  if (imageRange) extractor["image-range"] = imageRange;

  // ── Rate limiting ──
  const sleepRequest = getSetting(settings, "sleep_request");
  if (sleepRequest) extractor["sleep-request"] = parseFloat(sleepRequest) || sleepRequest;

  const sleepDownload = getSetting(settings, "sleep_download");
  if (sleepDownload) extractor["sleep"] = parseFloat(sleepDownload) || sleepDownload;

  const retries = getSetting(settings, "retries");
  if (retries) extractor["retries"] = parseInt(retries, 10);

  const timeout = getSetting(settings, "timeout");
  if (timeout) extractor["timeout"] = parseFloat(timeout);

  // ── Network ──
  const proxy = getSetting(settings, "proxy");
  if (proxy) extractor["proxy"] = proxy;

  const userAgent = getSetting(settings, "user_agent");
  if (userAgent) extractor["user-agent"] = userAgent;

  const browser = getSetting(settings, "browser_emulation");
  if (browser) extractor["browser"] = browser;

  const verifySsl = getBoolSetting(settings, "verify_ssl", true);
  extractor["verify"] = verifySsl;

  // ── Cookies ──
  const cookiesFile = getSetting(settings, "cookies_file");
  const cookiesBrowser = getSetting(settings, "cookies_from_browser");

  if (cookiesBrowser) {
    // Browser cookie extraction: ["browser", "profile", null, null, ".domain"]
    const profile = getSetting(settings, "cookies_browser_profile") || null;
    const domain = getSetting(settings, "cookies_browser_domain") || null;
    const cookieSpec: (string | null)[] = [cookiesBrowser];
    if (profile || domain) {
      cookieSpec.push(profile);
      cookieSpec.push(null); // keyring
      cookieSpec.push(null); // container
      if (domain) cookieSpec.push(domain);
    }
    extractor["cookies"] = cookieSpec;
  } else if (cookiesFile) {
    if (fs.existsSync(cookiesFile)) {
      extractor["cookies"] = cookiesFile;
    } else {
      logger.warn(`Configured cookies file does not exist, skipping: ${cookiesFile}`);
    }
  }

  // ── Downloader ──
  const rateLimit = getSetting(settings, "rate_limit");
  if (rateLimit) {
    downloader["rate"] = rateLimit;
  }
  if (getBoolSetting(settings, "mtime", true)) {
    downloader["mtime"] = true;
  }
  downloader["verify"] = verifySsl;

  // ═══════════════════════════════════════
  // Site-specific authentication & options
  // ═══════════════════════════════════════

  // --- Pixiv ---
  const pixivToken = getSetting(settings, "pixiv_refresh_token");
  if (pixivToken) {
    extractor["pixiv"] = {
      "refresh-token": pixivToken,
      "ugoira": getBoolSetting(settings, "pixiv_ugoira", true),
    };
  }

  // --- DeviantArt ---
  const daToken = getSetting(settings, "deviantart_refresh_token");
  const daClientId = getSetting(settings, "deviantart_client_id");
  const daClientSecret = getSetting(settings, "deviantart_client_secret");
  if (daToken || daClientId) {
    const daCfg: Record<string, unknown> = {
      "mature": getBoolSetting(settings, "deviantart_mature", true),
      "original": getBoolSetting(settings, "deviantart_original", true),
    };
    if (daToken) daCfg["refresh-token"] = daToken;
    if (daClientId) daCfg["client-id"] = daClientId;
    if (daClientSecret) daCfg["client-secret"] = daClientSecret;
    extractor["deviantart"] = daCfg;
  }

  // --- Flickr ---
  const flickrToken = getSetting(settings, "flickr_access_token");
  const flickrSecret = getSetting(settings, "flickr_access_token_secret");
  if (flickrToken) {
    extractor["flickr"] = {
      "access-token": flickrToken,
      "access-token-secret": flickrSecret || "",
    };
  }

  // --- Reddit ---
  const redditClientId = getSetting(settings, "reddit_client_id");
  const redditUA =
    getSetting(settings, "reddit_user_agent") ||
    "TheArchiver/1.0 (reddit content archiver)";
  const redditWhitelist = getSetting(settings, "reddit_whitelist");
  const explicitSleepRequest = getSetting(settings, "sleep_request");
  const redditCfg: Record<string, unknown> = {
    "api": "rest",
    "comments": 0,
    "user-agent": redditUA,
  };
  if (redditClientId) redditCfg["client-id"] = redditClientId;
  if (redditWhitelist) {
    redditCfg["whitelist"] = redditWhitelist.split(",").map((s: string) => s.trim());
  }
  if (!explicitSleepRequest) {
    // Mirror Plugin-Social's conservative Reddit pacing (~9.2 req/min)
    // to reduce the chance of Reddit returning its block page.
    redditCfg["sleep-request"] = 6.5;
  }
  extractor["reddit"] = redditCfg;

  // --- Tumblr ---
  const tumblrToken = getSetting(settings, "tumblr_access_token");
  const tumblrSecret = getSetting(settings, "tumblr_access_token_secret");
  if (tumblrToken) {
    extractor["tumblr"] = {
      "access-token": tumblrToken,
      "access-token-secret": tumblrSecret || "",
    };
  }

  // --- SmugMug ---
  const smugToken = getSetting(settings, "smugmug_access_token");
  const smugSecret = getSetting(settings, "smugmug_access_token_secret");
  if (smugToken) {
    extractor["smugmug"] = {
      "access-token": smugToken,
      "access-token-secret": smugSecret || "",
    };
  }

  // --- Mastodon ---
  const mastodonInstance = getSetting(settings, "mastodon_instance");
  const mastodonToken = getSetting(settings, "mastodon_access_token");
  if (mastodonInstance && mastodonToken) {
    extractor["mastodon"] = {
      [mastodonInstance]: {
        "root": `https://${mastodonInstance}`,
        "access-token": mastodonToken,
      },
    };
  }

  // --- Bluesky ---
  const bskyUser = getSetting(settings, "bluesky_username");
  const bskyPass = getSetting(settings, "bluesky_password");
  if (bskyUser && bskyPass) {
    extractor["bluesky"] = {
      "username": bskyUser,
      "password": bskyPass,
    };
  }

  // --- Sankaku ---
  const sankakuUser = getSetting(settings, "sankaku_username");
  const sankakuPass = getSetting(settings, "sankaku_password");
  if (sankakuUser && sankakuPass) {
    extractor["sankaku"] = {
      "username": sankakuUser,
      "password": sankakuPass,
    };
  }

  // --- Nijie ---
  const nijieUser = getSetting(settings, "nijie_username");
  const nijiePass = getSetting(settings, "nijie_password");
  if (nijieUser && nijiePass) {
    extractor["nijie"] = {
      "username": nijieUser,
      "password": nijiePass,
    };
  }

  // --- Inkbunny ---
  const inkbunnyUser = getSetting(settings, "inkbunny_username");
  const inkbunnyPass = getSetting(settings, "inkbunny_password");
  if (inkbunnyUser && inkbunnyPass) {
    extractor["inkbunny"] = {
      "username": inkbunnyUser,
      "password": inkbunnyPass,
    };
  }

  // --- MangaDex ---
  const mangadexUser = getSetting(settings, "mangadex_username");
  const mangadexPass = getSetting(settings, "mangadex_password");
  if (mangadexUser && mangadexPass) {
    extractor["mangadex"] = {
      "username": mangadexUser,
      "password": mangadexPass,
    };
  }

  // --- SubscribeStar ---
  const ssUser = getSetting(settings, "subscribestar_username");
  const ssPass = getSetting(settings, "subscribestar_password");
  if (ssUser && ssPass) {
    extractor["subscribestar"] = {
      "username": ssUser,
      "password": ssPass,
    };
  }

  // --- Newgrounds ---
  const ngUser = getSetting(settings, "newgrounds_username");
  const ngPass = getSetting(settings, "newgrounds_password");
  if (ngUser && ngPass) {
    extractor["newgrounds"] = {
      "username": ngUser,
      "password": ngPass,
    };
  }

  // --- Zerochan ---
  const zcUser = getSetting(settings, "zerochan_username");
  const zcPass = getSetting(settings, "zerochan_password");
  if (zcUser && zcPass) {
    extractor["zerochan"] = {
      "username": zcUser,
      "password": zcPass,
    };
  }

  // --- Aryion ---
  const aryionUser = getSetting(settings, "aryion_username");
  const aryionPass = getSetting(settings, "aryion_password");
  if (aryionUser && aryionPass) {
    extractor["aryion"] = {
      "username": aryionUser,
      "password": aryionPass,
    };
  }

  // --- Tapas ---
  const tapasUser = getSetting(settings, "tapas_username");
  const tapasPass = getSetting(settings, "tapas_password");
  if (tapasUser && tapasPass) {
    extractor["tapas"] = {
      "username": tapasUser,
      "password": tapasPass,
    };
  }

  // --- Danbooru ---
  const danbooruUser = getSetting(settings, "danbooru_username");
  const danbooruKey = getSetting(settings, "danbooru_api_key");
  if (danbooruUser && danbooruKey) {
    extractor["danbooru"] = {
      "username": danbooruUser,
      "password": danbooruKey,
    };
  }

  // --- e621 ---
  const e621User = getSetting(settings, "e621_username");
  const e621Key = getSetting(settings, "e621_api_key");
  if (e621User && e621Key) {
    extractor["e621"] = {
      "username": e621User,
      "password": e621Key,
    };
  }

  // --- Gelbooru ---
  const gelbooruKey = getSetting(settings, "gelbooru_api_key");
  const gelbooruUserId = getSetting(settings, "gelbooru_user_id");
  if (gelbooruKey) {
    extractor["gelbooru"] = {
      "api-key": gelbooruKey,
      "user-id": gelbooruUserId || "",
    };
  }

  // --- Civitai ---
  const civitaiKey = getSetting(settings, "civitai_api_key");
  if (civitaiKey) {
    extractor["civitai"] = { "api-key": civitaiKey };
  }

  // --- Wallhaven ---
  const wallhavenKey = getSetting(settings, "wallhaven_api_key");
  if (wallhavenKey) {
    extractor["wallhaven"] = { "api-key": wallhavenKey };
  }

  // --- Weasyl ---
  const weasylKey = getSetting(settings, "weasyl_api_key");
  if (weasylKey) {
    extractor["weasyl"] = { "api-key": weasylKey };
  }

  // --- Imgur ---
  const imgurClientId = getSetting(settings, "imgur_client_id");
  if (imgurClientId) {
    extractor["imgur"] = { "client-id": imgurClientId };
  }

  // --- Discord ---
  const discordToken = getSetting(settings, "discord_token");
  if (discordToken) {
    extractor["discord"] = { "token": discordToken };
  }

  // --- Fansly ---
  const fanslyToken = getSetting(settings, "fansly_token");
  if (fanslyToken) {
    extractor["fansly"] = { "token": fanslyToken };
  }

  // --- Gofile ---
  const gofileToken = getSetting(settings, "gofile_api_token");
  if (gofileToken) {
    extractor["gofile"] = { "api-token": gofileToken };
  }

  // --- ImageChest ---
  const imgchestToken = getSetting(settings, "imagechest_access_token");
  if (imgchestToken) {
    extractor["imagechest"] = { "access-token": imgchestToken };
  }

  // --- Twitter-specific ---
  const twitterCfg: Record<string, unknown> = {};
  if (!getBoolSetting(settings, "twitter_text_tweets", false)) {
    twitterCfg["text-tweets"] = false;
  } else {
    twitterCfg["text-tweets"] = true;
  }
  twitterCfg["retweets"] = getBoolSetting(settings, "twitter_retweets", false);
  twitterCfg["quoted"] = getBoolSetting(settings, "twitter_quoted", false);
  if (Object.keys(twitterCfg).length > 0) {
    extractor["twitter"] = twitterCfg;
  }

  // --- Instagram-specific ---
  const igInclude = getSetting(settings, "instagram_include");
  if (igInclude) {
    extractor["instagram"] = {
      "include": igInclude,
    };
  }

  // --- ExHentai-specific ---
  const exSleep = getSetting(settings, "exhentai_sleep");
  if (exSleep) {
    const exCfg: Record<string, unknown> = {};
    if (exSleep.includes("-")) {
      exCfg["sleep-request"] = exSleep;
    } else {
      exCfg["sleep-request"] = parseFloat(exSleep) || 3.0;
    }
    extractor["exhentai"] = exCfg;
  }

  // --- Kemono-specific ---
  const kemonoFavs = getBoolSetting(settings, "kemono_favorites", false);
  const kemonoComments = getBoolSetting(settings, "kemono_comments", false);
  if (kemonoFavs || kemonoComments) {
    extractor["kemono"] = {
      "favorites": kemonoFavs,
      "comments": kemonoComments,
    };
  }

  // ═══════════════════════════════════════
  // Post-processors
  // ═══════════════════════════════════════

  // Metadata JSON
  if (getBoolSetting(settings, "write_metadata", true)) {
    postprocessors.push({
      "name": "metadata",
      "mode": "json",
      "event": "post",
    });
  }

  // Tag files
  if (getBoolSetting(settings, "write_tags", false)) {
    postprocessors.push({
      "name": "metadata",
      "mode": "tags",
      "event": "post",
    });
  }

  // CBZ manga archiving
  if (getBoolSetting(settings, "zip_manga", false)) {
    postprocessors.push({
      "name": "zip",
      "compression": "stored",
      "extension": "cbz",
    });
  }

  // Ugoira conversion
  const ugoiraFormat = getSetting(settings, "ugoira_convert");
  if (ugoiraFormat) {
    const ugoiraPP: Record<string, unknown> = {
      "name": "ugoira",
      "extension": ugoiraFormat,
      "ffmpeg-twopass": ugoiraFormat === "webm",
      "libx264-prevent-odd": ugoiraFormat === "mp4",
    };
    if (ugoiraFormat === "gif") {
      ugoiraPP["ffmpeg-args"] = [
        "-filter_complex", "[0:v] split [a][b];[a] palettegen=stats_mode=single [p];[b][p] paletteuse=dither=bayer:bayer_scale=5:new=1",
      ];
    }
    postprocessors.push(ugoiraPP);
  }

  // Exec after download
  const execAfter = getSetting(settings, "exec_after");
  if (execAfter) {
    postprocessors.push({
      "name": "exec",
      "command": execAfter,
      "event": "after",
    });
  }

  // Assign postprocessors
  if (postprocessors.length > 0) {
    extractor["postprocessors"] = postprocessors;
  }

  // ── Assemble config ──
  config["extractor"] = extractor;
  if (Object.keys(downloader).length > 0) {
    config["downloader"] = downloader;
  }

  // Output logging
  if (getBoolSetting(settings, "verbose", false)) {
    config["output"] = {
      "log": { "level": "debug" },
    };
  }

  return config;
}

/**
 * Merge a user-provided custom config (JSON) with the generated config.
 * Generated config keys take precedence.
 */
function mergeConfigs(
  generated: Record<string, unknown>,
  custom: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...custom };

  for (const [key, value] of Object.entries(generated)) {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof merged[key] === "object" &&
      merged[key] !== null &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = mergeConfigs(
        value as Record<string, unknown>,
        merged[key] as Record<string, unknown>
      );
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function sanitizeGalleryDlErrorOutput(raw: string): string {
  if (!raw) return raw;

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes("InsecureRequestWarning"))
    .filter((line) => !line.includes("urllib3/connectionpool.py"))
    .filter((line) => !line.includes("warnings.warn("));

  const cleaned = lines.join("\n");

  if (cleaned.includes("You've been blocked by network security")) {
    return "Reddit blocked the request with its network security page. This is usually an IP/account/access-policy issue, not a macOS-specific TLS problem.";
  }

  return cleaned;
}

// =========================================
// Direct Reddit Downloader
// =========================================

const REDDIT_USER_AGENT = "TheArchiver/1.0 (reddit content archiver)";
const REDDIT_MIN_REQUEST_INTERVAL_MS = 6500;
const REDDIT_DEFAULT_LISTING_COUNT = 100;
let lastRedditRequestTime = 0;

function parseRedditUrl(url: string): ParsedRedditUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^(www\.|old\.)/, "");
  if (hostname === "redd.it") {
    const postId = parsed.pathname.split("/").filter(Boolean)[0];
    return postId ? { type: "post", postId } : null;
  }
  if (hostname !== "reddit.com") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (segments.length >= 4 && segments[0] === "r" && segments[2] === "comments") {
    return { type: "post", subreddit: segments[1], postId: segments[3] };
  }
  if (segments.length >= 2 && (segments[0] === "comments" || segments[0] === "gallery")) {
    return { type: "post", postId: segments[1] };
  }
  if (segments.length >= 2 && (segments[0] === "u" || segments[0] === "user")) {
    return { type: "user", username: segments[1] };
  }
  if (segments.length >= 2 && segments[0] === "r") {
    return { type: "subreddit", subreddit: segments[1] };
  }

  return null;
}

async function fetchRedditJson(url: string, logger: PluginLogger): Promise<unknown> {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set("raw_json", "1");
  const fetchUrl = parsedUrl.toString();
  logger.info(`Fetching Reddit JSON: ${fetchUrl}`);

  const res = await fetch(fetchUrl, {
    headers: {
      "User-Agent": REDDIT_USER_AGENT,
      "Accept": "application/json",
    },
    redirect: "follow",
  });

  if (res.status === 429) {
    logger.warn("Rate limited by Reddit. Waiting 60 seconds before retry...");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    return fetchRedditJson(url, logger);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (text.includes("You've been blocked by network security")) {
      throw new Error(
        "Reddit blocked the request with its network security page. This public JSON route is currently blocked from this environment."
      );
    }
    throw new Error(`Reddit API returned ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

async function rateLimitedRedditFetch(url: string, logger: PluginLogger): Promise<unknown> {
  const now = Date.now();
  const elapsed = now - lastRedditRequestTime;
  if (elapsed < REDDIT_MIN_REQUEST_INTERVAL_MS) {
    const waitTime = REDDIT_MIN_REQUEST_INTERVAL_MS - elapsed;
    logger.info(`Rate limiting Reddit requests: waiting ${waitTime}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastRedditRequestTime = Date.now();
  return fetchRedditJson(url, logger);
}

async function fetchAllRedditPosts(
  baseJsonUrl: string,
  maxPosts: number,
  logger: PluginLogger
): Promise<RedditPost[]> {
  const effectiveMax = maxPosts === -1 ? 1000 : Math.min(maxPosts, 1000);
  const results: RedditPost[] = [];
  let after: string | null = null;

  while (results.length < effectiveMax) {
    const url = new URL(baseJsonUrl);
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const response = (await rateLimitedRedditFetch(
      url.toString(),
      logger
    )) as RedditListingResponse;

    if (!response?.data?.children?.length) break;

    const posts = response.data.children
      .filter((child) => child.kind === "t3")
      .map((child) => child.data);
    if (posts.length === 0) break;

    results.push(...posts);
    after = response.data.after;
    if (!after) break;
  }

  return results.slice(0, effectiveMax);
}

function getMimeExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpg": "jpg",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  return map[mime.toLowerCase()] || "jpg";
}

function truncateTitle(title: string, maxLen = 100): string {
  if (title.length <= maxLen) return title;
  return title.substring(0, maxLen).replace(/[-_\s]+$/, "");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

function filenameFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const base = path.basename(pathname);
    return base && path.extname(base) ? base : null;
  } catch {
    return null;
  }
}

function isVideoRedditPost(post: RedditPost): boolean {
  return (
    post.is_video === true ||
    post.post_hint === "hosted:video" ||
    post.post_hint === "rich:video" ||
    (post.domain === "v.redd.it" && !post.is_gallery)
  );
}

function extractRedditMediaItems(
  post: RedditPost,
  sanitizeFilename: (s: string) => string
): MediaItem[] {
  const sourcePost =
    post.crosspost_parent_list && post.crosspost_parent_list.length > 0
      ? post.crosspost_parent_list[0]
      : post;

  if (isVideoRedditPost(sourcePost)) return [];

  const items: MediaItem[] = [];

  if (sourcePost.is_gallery && sourcePost.media_metadata) {
    const galleryItems = sourcePost.gallery_data?.items;
    const orderedIds = galleryItems
      ? galleryItems.map((item) => item.media_id)
      : Object.keys(sourcePost.media_metadata);
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
      if (meta.e === "AnimatedImage" && meta.s?.gif) imageUrl = meta.s.gif;
      else if (meta.s?.u) imageUrl = meta.s.u;
      if (!imageUrl) continue;

      imageUrl = decodeHtmlEntities(imageUrl);
      index++;
      const ext = getMimeExtension(meta.m);
      const caption = captionMap.get(mediaId);
      const filename = caption
        ? `${sanitizeFilename(truncateTitle(caption, 80))}.${ext}`
        : `Image ${index}.${ext}`;
      items.push({ url: imageUrl, filename });
    }
    return items;
  }

  if (
    sourcePost.post_hint === "image" ||
    sourcePost.domain === "i.redd.it" ||
    sourcePost.domain === "i.imgur.com"
  ) {
    const originalName = filenameFromUrl(sourcePost.url);
    items.push({ url: sourcePost.url, filename: originalName || "Image 1.jpg" });
    return items;
  }

  if (sourcePost.preview?.images?.[0]?.source?.url) {
    const previewUrl = decodeHtmlEntities(sourcePost.preview.images[0].source.url);
    try {
      const previewHost = new URL(previewUrl).hostname;
      if (previewHost === "i.redd.it" || previewHost === "preview.redd.it") {
        items.push({
          url: previewUrl,
          filename: filenameFromUrl(previewUrl) || "Image 1.jpg",
        });
        return items;
      }
    } catch {
      // ignore invalid preview URL
    }
  }

  return items;
}

function writeRedditCommentsFromListing(
  commentsData: unknown,
  postDir: string,
  logger: PluginLogger
): void {
  const listing = commentsData as {
    data?: { children?: unknown[] };
  };
  if (!Array.isArray(listing?.data?.children)) return;

  const commentsPath = path.join(postDir, "Comments.json");
  const comments = processRedditComments(listing.data.children);
  try {
    fs.writeFileSync(commentsPath, JSON.stringify(comments, null, 2), "utf8");
    logger.info(`Wrote ${comments.length} Reddit comments: ${commentsPath}`);
  } catch (err) {
    logger.warn(`Failed to write Reddit comments: ${err}`);
  }
}

function buildRedditCommentsUrl(post: RedditPost): string {
  if (post.permalink) {
    const permalink = post.permalink.startsWith("http")
      ? post.permalink
      : `https://www.reddit.com${post.permalink}`;
    return permalink.replace(/\/+$/, "") + ".json";
  }

  if (post.subreddit) {
    return `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`;
  }

  return `https://www.reddit.com/comments/${post.id}.json`;
}

function redditPostFolderName(
  post: RedditPost,
  sanitizeFilename: (s: string) => string
): string {
  return sanitizeFilename(truncateTitle(post.title, 100)) || post.id;
}

async function downloadRedditPostToFolder(
  context: DownloadContext,
  post: RedditPost,
  postDir: string,
  sourceUrl: string,
  fetchComments: boolean
): Promise<{ downloaded: number; skipped: number; isVideo: boolean }> {
  const { helpers, logger } = context;

  await helpers.io.ensureDir(postDir);
  writeRedditPostNfo(post as unknown as Record<string, unknown>, sourceUrl, postDir, logger);

  if (fetchComments) {
    try {
      const commentUrl = buildRedditCommentsUrl(post);
      const response = (await rateLimitedRedditFetch(commentUrl, logger)) as unknown[];
      if (Array.isArray(response) && response.length >= 2) {
        writeRedditCommentsFromListing(response[1], postDir, logger);
      } else {
        writeRedditCommentsFromListing({ data: { children: [] } }, postDir, logger);
      }
    } catch (err) {
      logger.warn(`Failed to fetch comments for post ${post.id}: ${err}`);
      writeRedditCommentsFromListing({ data: { children: [] } }, postDir, logger);
    }
  }

  if (isVideoRedditPost(post)) {
    return { downloaded: 0, skipped: 0, isVideo: true };
  }

  const mediaItems = extractRedditMediaItems(post, helpers.string.sanitizeFilename);
  if (mediaItems.length === 0) {
    return { downloaded: 0, skipped: 0, isVideo: false };
  }

  const downloads: Array<{ url: string; outputPath: string }> = [];
  let skipped = 0;

  for (const item of mediaItems) {
    const outputPath = path.join(postDir, item.filename);
    if (await helpers.io.fileExists(outputPath)) skipped++;
    else downloads.push({ url: item.url, outputPath });
  }

  if (downloads.length > 0) {
    await helpers.io.downloadFiles(downloads, context.maxDownloadThreads);
  }

  return { downloaded: downloads.length, skipped, isVideo: false };
}

async function handleDirectRedditDownload(context: DownloadContext): Promise<DownloadResult> {
  const parsed = parseRedditUrl(context.url);
  if (!parsed) {
    return { success: false, message: "Could not parse Reddit URL" };
  }

  const { url, rootDirectory, settings, logger, helpers } = context;
  const baseFolder = getBaseFolder(settings);
  const siteRoot = resolveOutputDir(url, rootDirectory, baseFolder, settings, logger);
  const fetchComments = getBoolSetting(settings, "write_metadata", true);

  if (parsed.type === "post") {
    const jsonUrl = parsed.subreddit
      ? `https://www.reddit.com/r/${parsed.subreddit}/comments/${parsed.postId}.json`
      : `https://www.reddit.com/comments/${parsed.postId}.json`;
    const response = (await rateLimitedRedditFetch(jsonUrl, logger)) as unknown[];
    if (!Array.isArray(response) || response.length < 1) {
      return { success: false, message: "Unexpected response from Reddit" };
    }
    const postListing = response[0] as RedditListingResponse;
    const post = postListing?.data?.children?.[0]?.data;
    if (!post) return { success: false, message: "Could not find Reddit post data" };

    const postDir = path.join(
      siteRoot,
      post.subreddit,
      redditPostFolderName(post, helpers.string.sanitizeFilename)
    );
    const result = await downloadRedditPostToFolder(context, post, postDir, url, fetchComments);
    if (result.isVideo) {
      return {
        success: true,
        message: `Archived Reddit video post metadata to ${postDir}`,
      };
    }
    return {
      success: true,
      message: `Archived Reddit post to ${postDir}`,
    };
  }

  if (parsed.type === "user") {
    const posts = await fetchAllRedditPosts(
      `https://www.reddit.com/user/${parsed.username}/submitted.json`,
      REDDIT_DEFAULT_LISTING_COUNT,
      logger
    );
    if (posts.length === 0) {
      return { success: false, message: `No posts found for u/${parsed.username}` };
    }

    let totalDownloaded = 0;
    for (const post of posts) {
      const postDir = path.join(
        siteRoot,
        parsed.username!,
        post.subreddit,
        redditPostFolderName(post, helpers.string.sanitizeFilename)
      );
      const result = await downloadRedditPostToFolder(context, post, postDir, url, fetchComments);
      totalDownloaded += result.downloaded;
    }
    return {
      success: true,
      message: `Archived ${posts.length} Reddit posts from u/${parsed.username} (${totalDownloaded} media files)`,
    };
  }

  const posts = await fetchAllRedditPosts(
    `https://www.reddit.com/r/${parsed.subreddit}/hot.json`,
    REDDIT_DEFAULT_LISTING_COUNT,
    logger
  );
  if (posts.length === 0) {
    return { success: false, message: `No posts found in r/${parsed.subreddit}` };
  }

  let totalDownloaded = 0;
  for (const post of posts) {
    const postDir = path.join(
      siteRoot,
      parsed.subreddit!,
      redditPostFolderName(post, helpers.string.sanitizeFilename)
    );
    const result = await downloadRedditPostToFolder(context, post, postDir, url, fetchComments);
    totalDownloaded += result.downloaded;
  }
  return {
    success: true,
    message: `Archived ${posts.length} Reddit posts from r/${parsed.subreddit} (${totalDownloaded} media files)`,
  };
}

// =========================================
// Social Media Post-Processing
// =========================================

/** Detect which social platform a URL belongs to */
function detectSocialPlatform(url: string): "reddit" | "bluesky" | "twitter" | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("reddit.com") || hostname.includes("redd.it")) return "reddit";
    if (hostname.includes("bsky.app") || hostname.includes("bsky.social")) return "bluesky";
    if (hostname.includes("twitter.com") || hostname.includes("x.com") || hostname.includes("nitter")) return "twitter";
    return null;
  } catch {
    return null;
  }
}

/**
 * After gallery-dl downloads social media content, scan for its JSON metadata
 * and generate Post.nfo + Comments/Replies files for the viewer.
 */
async function enrichSocialMetadata(
  outputDir: string,
  sourceUrl: string,
  platform: "reddit" | "bluesky" | "twitter",
  logger: PluginLogger
): Promise<void> {
  logger.info(`Enriching ${platform} metadata for viewer compatibility...`);

  // Find gallery-dl JSON metadata files
  const metaFiles = await findJsonMetadata(outputDir);

  for (const metaFile of metaFiles) {
    try {
      const raw = fs.readFileSync(metaFile, "utf8");
      const meta = JSON.parse(raw);
      const dir = path.dirname(metaFile);
      const nfoPath = path.join(dir, "Post.nfo");

      // Skip if Post.nfo already exists
      if (fs.existsSync(nfoPath)) continue;

      switch (platform) {
        case "reddit":
          writeRedditPostNfo(meta, sourceUrl, dir, logger);
          await fetchRedditComments(meta, dir, logger);
          break;
        case "bluesky":
          writeBlueskyPostNfo(meta, sourceUrl, dir, logger);
          await fetchBlueskyReplies(meta, dir, logger);
          break;
        case "twitter":
          writeTwitterPostNfo(meta, sourceUrl, dir, logger);
          break;
      }
    } catch (err) {
      logger.warn(`Failed to enrich metadata from ${metaFile}: ${err}`);
    }
  }
}

// ── Reddit NFO Generation ──

function writeRedditPostNfo(
  meta: Record<string, unknown>,
  sourceUrl: string,
  dir: string,
  logger: PluginLogger
): void {
  const nfoPath = path.join(dir, "Post.nfo");
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<postdetails>`,
  ];

  const add = (tag: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "") {
      lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
    }
  };

  // gallery-dl reddit metadata fields
  add("id", meta.id);
  add("fullname", meta.fullname || (meta.id ? `t3_${meta.id}` : ""));
  add("author", meta.author || meta.user || "[deleted]");
  add("subreddit", meta.subreddit);
  add("subreddit_prefixed", meta.subreddit ? `r/${meta.subreddit}` : "");
  add("title", meta.title || meta.description);
  add("url", meta.permalink ? `https://www.reddit.com${meta.permalink}` : sourceUrl);
  add("source_url", sourceUrl);
  add("score", meta.score);
  add("upvote_ratio", meta.upvote_ratio);
  add("num_comments", meta.num_comments);
  add("created", meta.date || (meta.created_utc ? new Date((meta.created_utc as number) * 1000).toISOString() : ""));
  add("over_18", meta.over_18);
  add("spoiler", meta.spoiler);
  add("stickied", meta.stickied);
  add("locked", meta.locked);
  add("is_video", meta.is_video);
  add("is_gallery", meta.is_gallery);
  add("post_hint", meta.post_hint);
  add("flair", meta.link_flair_text || meta.flair);
  add("selftext", meta.selftext);
  add("domain", meta.domain);
  add("media_url", meta.url);

  lines.push(`</postdetails>`);

  try {
    fs.writeFileSync(nfoPath, lines.join("\n") + "\n", "utf8");
    logger.info(`Wrote Reddit Post.nfo: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write Reddit Post.nfo: ${err}`);
  }
}

async function fetchRedditComments(
  meta: Record<string, unknown>,
  dir: string,
  logger: PluginLogger
): Promise<void> {
  const commentsPath = path.join(dir, "Comments.json");
  if (fs.existsSync(commentsPath)) return;

  const postId = meta.id as string;
  if (!postId) return;

  try {
    const permalink = meta.permalink as string | undefined;
    const subreddit = meta.subreddit as string | undefined;
    const normalizedPermalink = permalink
      ? String(permalink).startsWith("http")
        ? String(permalink)
        : `https://www.reddit.com${String(permalink)}`
      : undefined;
    const url = permalink
      ? `${normalizedPermalink!.replace(/\/+$/, "")}.json`
      : subreddit
        ? `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`
        : `https://www.reddit.com/comments/${postId}.json`;
    logger.info(`Fetching Reddit comments: ${url}`);

    const data = await fetchRedditJson(url, logger) as unknown[];
    if (!Array.isArray(data) || data.length < 2) return;

    const commentListing = data[1] as { data?: { children?: unknown[] } };
    const children = commentListing?.data?.children;
    if (!Array.isArray(children)) {
      fs.writeFileSync(commentsPath, JSON.stringify([], null, 2), "utf8");
      return;
    }

    const comments = processRedditComments(children);
    fs.writeFileSync(commentsPath, JSON.stringify(comments, null, 2), "utf8");
    logger.info(`Saved ${comments.length} Reddit comments to: ${commentsPath}`);
  } catch (err) {
    logger.warn(`Failed to fetch Reddit comments: ${err}`);
    try {
      fs.writeFileSync(commentsPath, JSON.stringify([], null, 2), "utf8");
    } catch {
      // ignore secondary write failure
    }
  }
}

interface RedditCommentData {
  author?: string;
  body?: string;
  score?: number;
  created_utc?: number;
  edited?: boolean | number;
  is_submitter?: boolean;
  stickied?: boolean;
  distinguished?: string | null;
  author_flair_text?: string | null;
  depth?: number;
  replies?: { data?: { children?: unknown[] } } | string;
}

function processRedditComments(children: unknown[]): unknown[] {
  const result: unknown[] = [];

  for (const child of children) {
    const c = child as { kind: string; data: RedditCommentData & { count?: number; children?: string[] } };

    if (c.kind === "more") {
      result.push({
        kind: "more",
        count: c.data.count || 0,
        children_ids: c.data.children || [],
      });
      continue;
    }

    if (c.kind !== "t1") continue;

    const d = c.data;
    const comment: Record<string, unknown> = {
      author: d.author || "[deleted]",
      body: d.body || "",
      score: d.score || 0,
      created_utc: d.created_utc || 0,
      edited: d.edited || false,
      is_submitter: d.is_submitter || false,
      stickied: d.stickied || false,
      distinguished: d.distinguished || null,
      author_flair_text: d.author_flair_text || null,
      depth: d.depth || 0,
      replies: [],
    };

    // Process nested replies
    if (d.replies && typeof d.replies === "object") {
      const replyData = d.replies as { data?: { children?: unknown[] } };
      if (replyData.data?.children) {
        comment.replies = processRedditComments(replyData.data.children);
      }
    }

    result.push(comment);
  }

  return result;
}

// ── Bluesky NFO Generation ──

function writeBlueskyPostNfo(
  meta: Record<string, unknown>,
  sourceUrl: string,
  dir: string,
  logger: PluginLogger
): void {
  const nfoPath = path.join(dir, "Post.nfo");
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<blueskypost>`,
  ];

  const add = (tag: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "") {
      lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
    }
  };

  // gallery-dl bluesky metadata fields
  const record = (meta.record || meta) as Record<string, unknown>;
  const author = (meta.author || {}) as Record<string, unknown>;

  add("uri", meta.uri);
  add("cid", meta.cid);
  add("text", record.text || meta.text || meta.description);
  add("handle", author.handle || meta.user || meta.handle);
  add("did", author.did || meta.did);
  add("display_name", author.displayName || author.display_name || meta.display_name);
  add("avatar_url", author.avatar || meta.avatar);
  add("url", sourceUrl);
  add("source_url", sourceUrl);
  add("created", record.createdAt || meta.date || meta.created_at);

  // Engagement
  add("like_count", meta.likeCount ?? meta.like_count ?? 0);
  add("reply_count", meta.replyCount ?? meta.reply_count ?? 0);
  add("repost_count", meta.repostCount ?? meta.repost_count ?? 0);
  add("quote_count", meta.quoteCount ?? meta.quote_count ?? 0);

  // Facets (rich text annotations)
  const facets = (record.facets || meta.facets) as Array<Record<string, unknown>> | undefined;
  if (facets && facets.length > 0) {
    lines.push("  <facets>");
    for (const facet of facets) {
      const index = facet.index as { byteStart?: number; byteEnd?: number } | undefined;
      const features = facet.features as Array<Record<string, unknown>> | undefined;
      if (!index || !features) continue;

      for (const feature of features) {
        const $type = feature.$type as string;
        let type = "link";
        const attrs: string[] = [];

        if ($type?.includes("link")) {
          type = "link";
          attrs.push(`uri="${xmlEscape(String(feature.uri || ""))}"`);
        } else if ($type?.includes("mention")) {
          type = "mention";
          attrs.push(`did="${xmlEscape(String(feature.did || ""))}"`);
        } else if ($type?.includes("tag")) {
          type = "tag";
          attrs.push(`tag="${xmlEscape(String(feature.tag || ""))}"`);
        }

        lines.push(`    <facet type="${type}" byte_start="${index.byteStart || 0}" byte_end="${index.byteEnd || 0}" ${attrs.join(" ")} />`);
      }
    }
    lines.push("  </facets>");
  }

  // Embed: external link
  const embed = (record.embed || meta.embed) as Record<string, unknown> | undefined;
  if (embed) {
    const external = (embed.external || embed) as Record<string, unknown> | undefined;
    if (external?.uri) {
      lines.push("  <external_link>");
      add("link_uri", external.uri);
      add("link_title", external.title);
      add("link_description", external.description);
      add("link_thumb", (external.thumb as Record<string, unknown>)?.ref || external.thumb);
      lines.push("  </external_link>");
    }
  }

  // Image count
  if (meta.image_count || meta.imageCount) {
    add("image_count", meta.image_count || meta.imageCount);
  }

  lines.push(`</blueskypost>`);

  try {
    fs.writeFileSync(nfoPath, lines.join("\n") + "\n", "utf8");
    logger.info(`Wrote Bluesky Post.nfo: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write Bluesky Post.nfo: ${err}`);
  }
}

async function fetchBlueskyReplies(
  meta: Record<string, unknown>,
  dir: string,
  logger: PluginLogger
): Promise<void> {
  const repliesPath = path.join(dir, "Replies.json");
  if (fs.existsSync(repliesPath)) return;

  // Extract post URI parts
  const uri = meta.uri as string;
  if (!uri) return;

  // URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
  const uriParts = uri.split("/");
  const rkey = uriParts[uriParts.length - 1];
  const did = uriParts[2];
  if (!rkey || !did) return;

  try {
    const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=10`;
    logger.info(`Fetching Bluesky replies...`);

    const res = await fetch(apiUrl, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      logger.warn(`Failed to fetch Bluesky replies: ${res.status}`);
      return;
    }

    const data = await res.json() as { thread?: { replies?: unknown[] } };
    if (!data.thread?.replies?.length) return;

    const replies = processBlueskyReplies(data.thread.replies);
    fs.writeFileSync(repliesPath, JSON.stringify(replies, null, 2), "utf8");
    logger.info(`Saved ${replies.length} Bluesky replies to: ${repliesPath}`);
  } catch (err) {
    logger.warn(`Failed to fetch Bluesky replies: ${err}`);
  }
}

function processBlueskyReplies(replies: unknown[]): unknown[] {
  const result: unknown[] = [];

  for (const reply of replies) {
    const r = reply as {
      post?: {
        author?: { handle?: string; displayName?: string; avatar?: string };
        record?: { text?: string; createdAt?: string; facets?: unknown[] };
        likeCount?: number;
        repostCount?: number;
        replyCount?: number;
      };
      replies?: unknown[];
    };

    if (!r.post) continue;

    const p = r.post;
    const entry: Record<string, unknown> = {
      author: p.author?.handle || "unknown",
      displayName: p.author?.displayName,
      avatarUrl: p.author?.avatar,
      text: p.record?.text || "",
      createdAt: p.record?.createdAt || "",
      likeCount: p.likeCount || 0,
      repostCount: p.repostCount || 0,
      replyCount: p.replyCount || 0,
      facets: p.record?.facets,
      depth: 0,
      replies: r.replies ? processBlueskyReplies(r.replies) : [],
    };

    result.push(entry);
  }

  return result;
}

// ── Twitter NFO Generation ──

function writeTwitterPostNfo(
  meta: Record<string, unknown>,
  sourceUrl: string,
  dir: string,
  logger: PluginLogger
): void {
  const nfoPath = path.join(dir, "Post.nfo");
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<twitterpost>`,
  ];

  const add = (tag: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "") {
      lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
    }
  };

  // gallery-dl twitter metadata
  const user = (meta.user || meta.author || {}) as Record<string, unknown>;

  add("id", meta.tweet_id || meta.id);
  add("screen_name", user.screen_name || user.name || meta.user || meta.author);
  add("name", user.name || user.screen_name || meta.user);
  add("user_id", user.id || user.id_str);
  add("text", meta.content || meta.text || meta.description);
  add("url", sourceUrl);
  add("source_url", sourceUrl);
  add("profile_image_url", user.profile_image_url_https || user.profile_image_url || meta.avatar);
  add("verified", user.verified);
  add("created", meta.date || meta.created_at);
  add("favorite_count", meta.favorite_count ?? meta.like_count ?? 0);
  add("retweet_count", meta.retweet_count ?? 0);
  add("reply_count", meta.reply_count ?? 0);
  add("quote_count", meta.quote_count ?? 0);
  add("lang", meta.lang);

  // Reply info
  if (meta.in_reply_to_status_id || meta.in_reply_to_screen_name) {
    lines.push("  <reply>");
    add("in_reply_to_id", meta.in_reply_to_status_id);
    add("in_reply_to_user", meta.in_reply_to_screen_name);
    lines.push("  </reply>");
  }

  // Entities: hashtags
  const entities = (meta.entities || {}) as Record<string, unknown>;
  const hashtags = entities.hashtags as Array<{ text?: string }> | undefined;
  if (hashtags && hashtags.length > 0) {
    lines.push("  <hashtags>");
    for (const ht of hashtags) {
      if (ht.text) lines.push(`    <hashtag>${xmlEscape(ht.text)}</hashtag>`);
    }
    lines.push("  </hashtags>");
  }

  // Entities: mentions
  const mentions = entities.user_mentions as Array<{ screen_name?: string }> | undefined;
  if (mentions && mentions.length > 0) {
    lines.push("  <mentions>");
    for (const m of mentions) {
      if (m.screen_name) lines.push(`    <mention screen_name="${xmlEscape(m.screen_name)}" />`);
    }
    lines.push("  </mentions>");
  }

  // Entities: links (expanded URLs)
  const urls = entities.urls as Array<{ display_url?: string; expanded_url?: string }> | undefined;
  if (urls && urls.length > 0) {
    lines.push("  <links>");
    for (const u of urls) {
      lines.push(`    <link display="${xmlEscape(u.display_url || "")}" expanded="${xmlEscape(u.expanded_url || "")}" />`);
    }
    lines.push("  </links>");
  }

  // Media counts
  if (meta.image_count) add("image_count", meta.image_count);
  if (meta.has_video) add("has_video", "true");
  if (meta.sensitive || meta.possibly_sensitive) add("sensitive", "true");

  lines.push(`</twitterpost>`);

  try {
    fs.writeFileSync(nfoPath, lines.join("\n") + "\n", "utf8");
    logger.info(`Wrote Twitter Post.nfo: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write Twitter Post.nfo: ${err}`);
  }
}

// =========================================
// NFO Sidecar Generation (generic)
// =========================================

/**
 * Scan the output directory for downloaded .json metadata files
 * and generate .nfo sidecars for media managers.
 */
function writeNfoFromMetadata(
  metaJsonPath: string,
  sourceUrl: string,
  logger: PluginLogger
): void {
  try {
    const raw = fs.readFileSync(metaJsonPath, "utf8");
    const meta = JSON.parse(raw);

    // Find the corresponding media file
    const dir = path.dirname(metaJsonPath);
    const baseName = path.basename(metaJsonPath, ".json");
    const nfoPath = path.join(dir, baseName + ".nfo");

    const title = meta.title || meta.filename || baseName;
    const lines: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<episodedetails>`,
      `  <title>${xmlEscape(String(title))}</title>`,
      `  <url>${xmlEscape(sourceUrl)}</url>`,
    ];

    const add = (tag: string, value: unknown) => {
      if (value !== undefined && value !== null && value !== "" && value !== "NA") {
        lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
      }
    };

    add("plot", meta.description || meta.content);
    add("studio", meta.uploader || meta.user || meta.author);
    add("channel", meta.category);
    add("subcategory", meta.subcategory);
    add("uniqueid", meta.id);
    add("source", meta.category);

    if (meta.date) {
      const d = String(meta.date);
      if (d.length >= 10) {
        add("aired", d.slice(0, 10));
      }
    }

    // Tags
    const tags = meta.tags || meta.tag_string;
    if (Array.isArray(tags)) {
      for (const tag of tags.slice(0, 30)) {
        add("tag", tag);
      }
    } else if (typeof tags === "string") {
      for (const tag of tags.split(" ").slice(0, 30)) {
        if (tag) add("tag", tag);
      }
    }

    // Score / rating
    if (typeof meta.score === "number") {
      add("rating", meta.score);
    }

    // Dimensions
    if (meta.width && meta.height) {
      add("resolution", `${meta.width}x${meta.height}`);
    }

    // Site tag
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
      const siteName = host.split(".")[0];
      if (siteName) add("tag", siteName);
    } catch {
      // invalid URL
    }

    lines.push(`</episodedetails>`);
    fs.writeFileSync(nfoPath, lines.join("\n") + "\n", "utf8");
    logger.info(`Wrote NFO: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to generate NFO from ${metaJsonPath}: ${err}`);
  }
}

// =========================================
// OAuth Action Handlers
// =========================================

/**
 * Run a gallery-dl OAuth flow and capture the output token.
 */
async function runOAuthFlow(
  site: string,
  logger: PluginLogger
): Promise<{ success: boolean; token?: string; message: string; rawOutput?: string }> {
  const oauthCmd = site.includes(":")
    ? `gallery-dl oauth:${site}`
    : `gallery-dl oauth:${site}`;

  logger.info(`Starting OAuth flow: ${oauthCmd}`);
  logger.info("A browser window should open for authorization...");

  try {
    // Run with a generous timeout for user interaction
    const { stdout, stderr } = await execAsync(oauthCmd, { timeout: 300000 });

    const output = stdout + "\n" + stderr;
    logger.info(`OAuth output: ${output}`);

    // Extract refresh token from output
    // gallery-dl outputs the token in various formats depending on the site
    const tokenMatch =
      output.match(/refresh[_-]token\s*[:=]\s*["']?(\S+?)["']?\s*$/m) ||
      output.match(/access[_-]token\s*[:=]\s*["']?(\S+?)["']?\s*$/m) ||
      output.match(/token\s*[:=]\s*["']?(\S+?)["']?\s*$/m);

    if (tokenMatch) {
      return {
        success: true,
        token: tokenMatch[1],
        message: `OAuth successful. Token obtained.`,
        rawOutput: output,
      };
    }

    // Even without a parseable token, the flow may have succeeded
    // (some sites write directly to the cache)
    return {
      success: true,
      message: `OAuth flow completed. Check output: ${output.slice(0, 200)}`,
      rawOutput: output,
    };
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    const errorOutput = err.stderr || err.stdout || err.message;

    // If timed out, it's likely waiting for user interaction
    if (err.message?.includes("TIMEOUT") || err.message?.includes("timed out")) {
      return {
        success: false,
        message:
          "OAuth flow timed out. Please run the following command in your terminal manually:\n" +
          `  ${oauthCmd}\n` +
          "Then paste the resulting token into the settings field above.",
      };
    }

    return {
      success: false,
      message: `OAuth failed: ${errorOutput}`,
    };
  }
}

// =========================================
// Plugin
// =========================================

const plugin = definePlugin({
  name: "gallery-dl",
  version: "1.0.0",
  description:
    "Download images and media from Pixiv, Twitter, Instagram, DeviantArt, Danbooru, " +
    "ExHentai, Patreon, Kemono, and 400+ other sites using gallery-dl",
  author: "TheArchiver",
  urlPatterns,
  settings: pluginSettings,

  actions: {
    // ── Pixiv OAuth ──
    async pixiv_authenticate({ settings, logger }): Promise<ActionResult> {
      const result = await runOAuthFlow("pixiv", logger);

      if (result.success && result.token) {
        return {
          success: true,
          message: `Pixiv authenticated! Refresh token saved.`,
          settingsUpdates: [
            { key: "pixiv_refresh_token", value: result.token },
          ],
        };
      }

      return {
        success: result.success,
        message: result.message,
      };
    },

    // ── DeviantArt OAuth ──
    async deviantart_authenticate({ settings, logger }): Promise<ActionResult> {
      const result = await runOAuthFlow("deviantart", logger);

      if (result.success && result.token) {
        return {
          success: true,
          message: `DeviantArt authenticated! Refresh token saved.`,
          settingsUpdates: [
            { key: "deviantart_refresh_token", value: result.token },
          ],
        };
      }

      return {
        success: result.success,
        message: result.message,
      };
    },

    // ── Flickr OAuth ──
    async flickr_authenticate({ settings, logger }): Promise<ActionResult> {
      const result = await runOAuthFlow("flickr", logger);

      if (result.success && result.token) {
        // Flickr returns both access-token and access-token-secret
        const output = result.rawOutput || result.message;
        const secretMatch = output.match(/access[_-]token[_-]secret\s*[:=]\s*["']?(\S+?)["']?\s*$/m);

        const updates: Array<{ key: string; value: string }> = [
          { key: "flickr_access_token", value: result.token },
        ];
        if (secretMatch) {
          updates.push({ key: "flickr_access_token_secret", value: secretMatch[1] });
        }

        return {
          success: true,
          message: `Flickr authenticated!`,
          settingsUpdates: updates,
        };
      }

      return {
        success: result.success,
        message: result.message,
      };
    },

    // ── Tumblr OAuth ──
    async tumblr_authenticate({ settings, logger }): Promise<ActionResult> {
      const result = await runOAuthFlow("tumblr", logger);

      if (result.success && result.token) {
        return {
          success: true,
          message: `Tumblr authenticated!`,
          settingsUpdates: [
            { key: "tumblr_access_token", value: result.token },
          ],
        };
      }

      return {
        success: result.success,
        message: result.message,
      };
    },
  },

  async download(context: DownloadContext): Promise<DownloadResult> {
    const { url, rootDirectory, helpers, logger, settings } = context;

    logger.info(`Starting gallery-dl download for: ${url}`);

    if (parseRedditUrl(url)) {
      logger.info("Reddit URL detected; using direct Reddit downloader instead of gallery-dl");
      return handleDirectRedditDownload(context);
    }

    // ── Read settings ──
    const baseFolder = getBaseFolder(settings);
    const legacyLibraryFolder = getSetting(settings, "library_folder");

    if (!getSetting(settings, "save_directory") && legacyLibraryFolder) {
      try {
        await settings.set("save_directory", legacyLibraryFolder);
        logger.info(`Migrated legacy library_folder to save_directory: ${legacyLibraryFolder}`);
      } catch (err) {
        logger.warn(`Failed to migrate legacy library_folder setting: ${err}`);
      }
    }

    // ── Resolve output directory ──
    const outputDir = resolveOutputDir(url, rootDirectory, baseFolder, settings, logger);
    await helpers.io.ensureDir(outputDir);

    // ── Verify gallery-dl is available ──
    try {
      const { stdout } = await execAsync("gallery-dl --version");
      logger.info(`gallery-dl version: ${stdout.trim()}`);
    } catch {
      return {
        success: false,
        message:
          "gallery-dl is not installed or not in PATH. " +
          "Install via: pip install gallery-dl (or pipx install gallery-dl)",
      };
    }

    // ── Build configuration ──
    const generatedConfig = buildConfig(settings, outputDir, logger);

    // Merge with custom config if provided
    const customConfigPath = getSetting(settings, "custom_config");
    let finalConfig = generatedConfig;
    if (customConfigPath) {
      try {
        const customRaw = fs.readFileSync(customConfigPath, "utf8");
        const customConfig = JSON.parse(customRaw);
        finalConfig = mergeConfigs(generatedConfig, customConfig);
        logger.info("Merged custom config file with generated settings");
      } catch (err) {
        logger.warn(`Failed to read custom config: ${err}. Using generated config only.`);
      }
    }

    // Write config to temp file
    const configDir = path.join(outputDir, ".gallery-dl-plugin");
    await helpers.io.ensureDir(configDir);
    const configPath = path.join(configDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2), "utf8");
    logger.info(`Wrote gallery-dl config: ${configPath}`);

    // ── Build command ──
    const args: string[] = [];

    // Use our generated config alongside the global config
    // (--config-ignore skips global, then --config loads ours)
    args.push("--config-ignore", "--config", shellEscape(configPath));

    // Verbose logging if enabled
    if (getBoolSetting(settings, "verbose", false)) {
      args.push("--verbose");
    }

    // Extra user-specified arguments
    const extraArgs = getSetting(settings, "extra_args");
    if (extraArgs) {
      args.push(extraArgs);
    }

    // The URL to download
    args.push(shellEscape(url));

    const command = `gallery-dl ${args.join(" ")}`;
    logger.info(`Running: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);

      // Log gallery-dl output
      if (stdout) {
        const lines = stdout.split("\n").filter(Boolean);
        let downloadCount = 0;
        let skipCount = 0;

        for (const line of lines) {
          if (line.startsWith("#")) {
            // gallery-dl outputs filenames prefixed with #
            downloadCount++;
            logger.info(`Downloaded: ${line.substring(1).trim()}`);
          } else if (line.includes("skipping")) {
            skipCount++;
          } else {
            logger.info(line);
          }
        }

        logger.info(`Downloads: ${downloadCount}, Skipped: ${skipCount}`);
      }

      if (stderr) {
        for (const line of stderr.split("\n").filter(Boolean)) {
          if (line.includes("WARNING") || line.includes("warning")) {
            logger.warn(line);
          } else if (line.includes("ERROR") || line.includes("error")) {
            logger.error(line);
          } else {
            logger.info(line);
          }
        }
      }

      // Social media enrichment: convert gallery-dl metadata to Post.nfo + fetch comments/replies
      const socialPlatform = detectSocialPlatform(url);
      if (socialPlatform && getBoolSetting(settings, "write_metadata", true)) {
        try {
          await enrichSocialMetadata(outputDir, url, socialPlatform, logger);
        } catch (err) {
          logger.warn(`Social metadata enrichment error: ${err}`);
        }
      }

      // Generate NFO sidecars if enabled
      if (getBoolSetting(settings, "write_info_nfo", false) && getBoolSetting(settings, "write_metadata", true)) {
        try {
          const jsonFiles = await findJsonMetadata(outputDir);
          for (const jsonFile of jsonFiles) {
            const nfoFile = jsonFile.replace(/\.json$/, ".nfo");
            if (!fs.existsSync(nfoFile)) {
              writeNfoFromMetadata(jsonFile, url, logger);
            }
          }
        } catch (err) {
          logger.warn(`NFO generation error: ${err}`);
        }
      }

      return {
        success: true,
        message: `Downloaded to ${outputDir}`,
      };
    } catch (error: unknown) {
      const err = error as Error & { stderr?: string; stdout?: string; code?: number };
      const errorOutput = sanitizeGalleryDlErrorOutput(
        err.stderr || err.stdout || err.message
      );

      // gallery-dl exit code 1 can mean "no extractor found"
      if (errorOutput.includes("No suitable extractor")) {
        logger.error(`No gallery-dl extractor found for: ${url}`);
        return {
          success: false,
          message: `No gallery-dl extractor found for this URL. The site may not be supported, or the URL format may be incorrect.`,
        };
      }

      // Authentication errors
      if (
        errorOutput.includes("401") ||
        errorOutput.includes("403") ||
        errorOutput.includes("authentication") ||
        errorOutput.includes("login")
      ) {
        logger.error(`Authentication required: ${errorOutput}`);
        return {
          success: false,
          message:
            `Authentication required for this URL. ` +
            `Please configure credentials in the plugin settings. ` +
            `Error: ${errorOutput.slice(0, 300)}`,
        };
      }

      if (errorOutput.includes("Reddit blocked the request with its network security page")) {
        logger.error(errorOutput);
        return {
          success: false,
          message:
            "Reddit blocked the request with its network security page. " +
            "This is not macOS-specific. Try browser cookies or Reddit API credentials, " +
            "and avoid proxies/VPNs or IPs Reddit distrusts.",
        };
      }

      // Some content was downloaded before the error
      if (err.stdout && (err.stdout.includes("#") || err.stdout.includes("/"))) {
        const downloadedLines = err.stdout.split("\n").filter((l: string) => l.startsWith("#") || l.startsWith("/"));
        const downloaded = downloadedLines.length;
        logger.warn(`Partial download: ${downloaded} files before error`);

        // Log the actual error from stderr
        if (err.stderr) {
          for (const line of err.stderr.split("\n").filter(Boolean)) {
            // Skip Python warnings (InsecureRequestWarning etc.)
            if (line.includes("Warning:") || line.includes("warnings.warn")) continue;
            logger.warn(line);
          }
        }

        // Still run social enrichment on partial downloads
        const socialPlatform = detectSocialPlatform(url);
        if (socialPlatform && getBoolSetting(settings, "write_metadata", true)) {
          try {
            await enrichSocialMetadata(outputDir, url, socialPlatform, logger);
          } catch (enrichErr) {
            logger.warn(`Social metadata enrichment error: ${enrichErr}`);
          }
        }

        return {
          success: true,
          message: `Partial download: ${downloaded} files downloaded before error. Check logs for details.`,
        };
      }

      logger.error(`gallery-dl failed: ${errorOutput}`);
      return {
        success: false,
        message: `gallery-dl failed: ${errorOutput.slice(0, 500)}`,
      };
    }
  },
});

/**
 * Recursively find .json metadata files in a directory.
 */
async function findJsonMetadata(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== ".gallery-dl-plugin") {
        results.push(...(await findJsonMetadata(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith(".")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory read error, skip
  }
  return results;
}

export default plugin;
