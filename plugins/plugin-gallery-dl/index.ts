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

  return cleaned;
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
    "Download images and media from Pixiv, Instagram, DeviantArt, Danbooru, " +
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
