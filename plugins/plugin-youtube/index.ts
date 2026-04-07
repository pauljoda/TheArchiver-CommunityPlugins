import path from "path";
import fs from "fs";
import { urlPatterns } from "./sites";
import { pluginSettings } from "./settings";
import type {
  DownloadResult,
  PluginSettingsAccessor,
  PluginLogger,
  DownloadContext,
  ArchiverPlugin,
} from "./plugin-api";

function definePlugin(plugin: ArchiverPlugin): ArchiverPlugin {
  return plugin;
}

// =========================================
// Helpers
// =========================================

/**
 * Normalize a video title for display.
 * Strips leading/trailing whitespace and control characters.
 * Falls back to converting an underscored filename slug to Title Case.
 */
function normalizeTitle(raw: string): string {
  // Remove control characters, normalize whitespace
  const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (cleaned) return cleaned;
  return "";
}

/**
 * Derive a normalized title from a filename stem when no metadata is available.
 * "some_video_title_123abc" → "Some Video Title 123abc"
 */
function titleFromStem(stem: string): string {
  // Remove trailing [id] bracket if present
  const withoutId = stem.replace(/\s*\[[^\]]+\]$/, "").trim();
  // Replace underscores/hyphens with spaces, then title-case
  return withoutId
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a yt-dlp date string (YYYYMMDD) to YYYY-MM-DD. */
function formatDate(raw: string): string {
  if (!raw || raw.length !== 8) return raw || "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/** Format duration in seconds to HH:MM:SS. */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Read the companion .info.json for a video file, or null if unavailable. */
function readInfoJson(videoFile: string): Record<string, unknown> | null {
  const ext = path.extname(videoFile);
  const base = videoFile.slice(0, -ext.length);
  const infoJsonPath = base + ".info.json";
  try {
    const raw = fs.readFileSync(infoJsonPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write a .nfo sidecar file next to the given video file.
 * Populates as much metadata as possible from the companion .info.json.
 */
function writeNfo(
  videoFile: string,
  sourceUrl: string,
  meta: Record<string, unknown> | null,
  logger: PluginLogger,
  xmlEscape: (str: string) => string
): void {
  const ext = path.extname(videoFile);
  const base = videoFile.slice(0, -ext.length);
  const nfoPath = base + ".nfo";

  // Resolve title
  let title = meta ? normalizeTitle((meta.title as string) ?? "") : "";
  if (!title) {
    title = titleFromStem(path.basename(base));
  }

  // Build XML lines
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<episodedetails>`,
    `  <title>${xmlEscape(title)}</title>`,
    `  <url>${xmlEscape(sourceUrl)}</url>`,
  ];

  if (meta) {
    const add = (tag: string, value: unknown) => {
      if (value !== undefined && value !== null && value !== "" && value !== "NA") {
        lines.push(`  <${tag}>${xmlEscape(String(value))}</${tag}>`);
      }
    };

    // Plot / description
    add("plot", meta.description);

    // Dates
    if (meta.upload_date) {
      add("aired", formatDate(meta.upload_date as string));
      add("premiered", formatDate(meta.upload_date as string));
    }

    // Duration
    if (typeof meta.duration === "number") {
      add("runtime", Math.round((meta.duration as number) / 60)); // minutes
      add("duration", formatDuration(meta.duration as number));
    }

    // Show / series info
    add("showtitle", meta.series || meta.playlist_title);
    if (typeof meta.season_number === "number") {
      add("season", meta.season_number);
    }
    if (typeof meta.episode_number === "number") {
      add("episode", meta.episode_number);
    }

    // Channel / uploader
    add("studio", meta.channel || meta.uploader);
    add("channel", meta.channel || meta.uploader);
    add("channel_id", meta.channel_id || meta.uploader_id);

    // Ratings / stats
    if (typeof meta.like_count === "number" || typeof meta.average_rating === "number") {
      add("rating", meta.average_rating ?? meta.like_count);
    }
    if (typeof meta.view_count === "number") {
      add("views", meta.view_count);
    }

    // Age rating
    if (typeof meta.age_limit === "number" && (meta.age_limit as number) > 0) {
      add("mpaa", `${meta.age_limit}+`);
    }

    // Thumbnail
    add("thumb", meta.thumbnail);

    // Categories / genres
    const categories = meta.categories as string[] | undefined;
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        add("genre", cat);
      }
    }

    // Tags
    const tags = meta.tags as string[] | undefined;
    if (Array.isArray(tags)) {
      for (const tag of tags.slice(0, 20)) {
        add("tag", tag);
      }
    }

    // Source site tag (e.g. "reddit" for reddit.com)
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
      const siteName = host.split(".")[0];
      if (siteName) {
        add("tag", siteName);
      }
    } catch {
      // invalid URL, skip site tag
    }

    // Video ID for unique identification
    add("uniqueid", meta.id);

    // Language
    if (meta.language) {
      add("language", meta.language);
    }

    // Extractor / source site
    add("source", meta.extractor);

    // Uploader / channel details
    add("uploader_id", meta.uploader_id);
    add("channel_url", meta.channel_url);

    // Upload timestamp
    if (typeof meta.timestamp === "number") {
      add("timestamp", new Date((meta.timestamp as number) * 1000).toISOString());
    }

    // Availability
    add("availability", meta.availability);

    // Resolution / quality info
    if (meta.resolution) {
      add("resolution", meta.resolution);
    }
    if (typeof meta.fps === "number") {
      add("fps", meta.fps);
    }

    // Follower count
    if (typeof meta.channel_follower_count === "number") {
      add("channel_followers", meta.channel_follower_count);
    }

    // Chapters
    const chapters = meta.chapters as Array<{ start_time: number; end_time: number; title: string }> | undefined;
    if (Array.isArray(chapters) && chapters.length > 0) {
      lines.push(`  <chapters>`);
      for (const ch of chapters) {
        lines.push(`    <chapter>`);
        lines.push(`      <name>${xmlEscape(ch.title || "")}</name>`);
        lines.push(`      <start>${formatDuration(ch.start_time)}</start>`);
        lines.push(`      <end>${formatDuration(ch.end_time)}</end>`);
        lines.push(`    </chapter>`);
      }
      lines.push(`  </chapters>`);
    }

    // Subtitles / captions available
    const subtitles = meta.subtitles as Record<string, unknown> | undefined;
    const autoCaptions = meta.automatic_captions as Record<string, unknown> | undefined;
    if (subtitles && Object.keys(subtitles).length > 0) {
      add("subtitle_languages", Object.keys(subtitles).join(", "));
    }
    if (autoCaptions && Object.keys(autoCaptions).length > 0) {
      add("auto_caption_languages", Object.keys(autoCaptions).slice(0, 10).join(", "));
    }
  }

  lines.push(`</episodedetails>`);

  const nfo = lines.join("\n") + "\n";

  try {
    fs.writeFileSync(nfoPath, nfo, "utf8");
    logger.info(`Wrote NFO: ${nfoPath}`);
  } catch (err) {
    logger.warn(`Failed to write NFO: ${err}`);
  }
}

// =========================================
// Plugin
// =========================================

const plugin = definePlugin({
  name: "yt-dlp",
  version: "1.0.0",
  description:
    "Download video and audio from YouTube, Twitch, TikTok, Vimeo, SoundCloud, and 1800+ other sites using yt-dlp",
  author: "TheArchiver",
  urlPatterns,
  settings: pluginSettings,

  async download(context: DownloadContext): Promise<DownloadResult> {
    const { url, rootDirectory, helpers, logger, settings } = context;
    const { shellEscape, xmlEscape } = helpers.string;
    const { execAsync } = helpers.process;
    const { resolveOutputDir } = helpers.url;

    logger.info(`Starting yt-dlp download for: ${url}`);

    // ── Read settings ──
    const libraryFolder = settings.get("library_folder") || "yt-dlp";
    const quality = settings.get("quality") || "best";
    const audioOnly = settings.get("audio_only") === "true";
    const embedMetadata = settings.get("embed_metadata") !== "false"; // default true
    const embedSubtitles = settings.get("embed_subtitles") === "true";
    const rawCookies = settings.get("cookies_file");
    const cookiesFile = rawCookies && rawCookies !== "null" ? rawCookies : "";
    const sponsorBlock = settings.get("sponsor_block") === "true";
    const rawExtraArgs = settings.get("extra_args");
    const extraArgs = rawExtraArgs && rawExtraArgs !== "null" ? rawExtraArgs : "";

    // ── Resolve output directory (per-site overrides or default) ──
    const outputDir = resolveOutputDir(
      url,
      rootDirectory,
      libraryFolder,
      settings.get("site_directories"),
      logger,
      { prependDefaultFolder: false }
    );
    await helpers.io.ensureDir(outputDir);

    // ── Verify yt-dlp is available ──
    try {
      const { stdout } = await execAsync("yt-dlp --version");
      logger.info(`yt-dlp version: ${stdout.trim()}`);
    } catch {
      return {
        success: false,
        message:
          "yt-dlp is not installed or not in PATH. Ensure yt-dlp is available in your environment.",
      };
    }

    // ── Check Deno for hanime.tv ──
    try {
      const hostname = new URL(url).hostname;
      if (hostname === "hanime.tv" || hostname.endsWith(".hanime.tv")) {
        try {
          await execAsync("deno --version");
        } catch {
          logger.warn(
            "Deno runtime not found. The hanime.tv extractor requires Deno. " +
              "Install from https://deno.land/ if hanime.tv downloads fail."
          );
        }
      }
    } catch {
      // URL parsing failed, skip Deno check
    }

    // ── Build yt-dlp command ──
    const args: string[] = [];

    // Point yt-dlp at bundled Python extractor plugins
    const pluginDirsPath = path.join(__dirname, "yt-dlp-plugins");
    args.push("--plugin-dirs", shellEscape(pluginDirsPath));

    // Use Node.js as the JavaScript runtime for yt-dlp (required for YouTube extraction)
    // Download challenge solver script from GitHub to handle YouTube's JS challenges
    args.push("--js-runtimes", "node", "--remote-components", "ejs:github");

    // Smart output template: adapts folder structure to content type
    // Uses yt-dlp's comma-fallback %(a,b,c|default)s and literal-prefix %(field&prefix|)s
    // NOTE: Do NOT use path.join() — it mangles unevaluated %() expressions
    // NOTE: Nested %() inside &/| is NOT supported by yt-dlp — use separate expressions

    // Group folder — series > playlist_title > channel > flat
    const groupFolder = "%(series,playlist_title,channel|)s";

    // Season subfolder — "Season X" when season_number exists, empty otherwise
    // %(field&literal)s produces literal only when field has a value
    const seasonFolder = "%(season_number&Season )s%(season_number|)s";

    // File prefix — episode_number (priority) > playlist_index > none
    // %(a,b|)03d picks the first available, zero-padded; empty if neither exists
    // %(a,b& - |)s appends " - " separator only when a number is present
    const filePrefix =
      "%(episode_number,playlist_index|)03d" +
      "%(episode_number,playlist_index& - |)s";

    const fileBody = "%(title)s [%(id)s].%(ext)s";

    // Assemble with / separators — yt-dlp normalizes empty segments (// → /)
    const outputTemplate =
      outputDir + "/" + groupFolder + "/" + seasonFolder + "/" + filePrefix + fileBody;

    args.push("-o", shellEscape(outputTemplate));

    if (audioOnly) {
      // Extract best audio, prefer AAC for broad compatibility
      args.push("-x", "--audio-quality", "0", "--audio-format", "m4a");
    } else {
      // Prefer h264+aac, fall back to best available
      if (quality === "best") {
        args.push(
          "-f",
          shellEscape(
            "bestvideo[vcodec~='^(avc|h264)']+bestaudio[acodec~='^(aac|mp4a)']/" +
              "bestvideo[vcodec~='^(avc|h264)']+bestaudio/" +
              "bestvideo+bestaudio/best"
          )
        );
      } else {
        args.push(
          "-f",
          shellEscape(
            `bestvideo[vcodec~='^(avc|h264)'][height<=${quality}]+bestaudio[acodec~='^(aac|mp4a)']/` +
              `bestvideo[vcodec~='^(avc|h264)'][height<=${quality}]+bestaudio/` +
              `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`
          )
        );
      }
      // MKV container: supports chapters, rich metadata, subtitles natively
      // No recode needed — MKV accepts virtually all codecs, preserving original quality
      args.push("--merge-output-format", "mkv");
    }

    if (embedMetadata) {
      args.push("--embed-metadata", "--embed-chapters");
    }

    if (embedSubtitles) {
      args.push("--embed-subs", "--sub-langs", "all");
    }

    if (cookiesFile.trim()) {
      args.push("--cookies", shellEscape(cookiesFile.trim()));
    }

    if (sponsorBlock) {
      args.push(
        "--sponsorblock-mark",
        "all",
        "--sponsorblock-chapter-title",
        shellEscape("[SponsorBlock]: %(category_names)l")
      );
    }

    // Prevent re-downloading if the file already exists
    args.push("--no-overwrites");

    // Write info json for metadata reference
    args.push("--write-info-json");

    // Replace filesystem-illegal characters (Windows compat) while keeping Unicode titles
    args.push("--windows-filenames");

    // Prevent "NA" from appearing as folder/file names when metadata is missing
    args.push("--output-na-placeholder", shellEscape(""));

    // Cap filename length to avoid OS 255-byte limit on long video titles
    args.push("--trim-filenames", "180");

    // Extra user-specified arguments — intentionally not shell-escaped so users can pass
    // complex flags like `--postprocessor-args "ffmpeg:-vf scale=1280:-2"`.
    // This is a user-controlled setting, not external input.
    if (extraArgs.trim()) {
      args.push(extraArgs.trim());
    }

    // The URL to download
    args.push(shellEscape(url));

    const command = `yt-dlp ${args.join(" ")}`;

    logger.info(`Running: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);

      // Log yt-dlp output
      if (stdout) {
        for (const line of stdout.split("\n").filter(Boolean)) {
          logger.info(line);
        }
      }
      if (stderr) {
        for (const line of stderr.split("\n").filter(Boolean)) {
          logger.warn(line);
        }
      }

      // Try to extract the final filename from yt-dlp output
      const mergeMatch = stdout.match(
        /\[Merger\] Merging formats into "(.+?)"/
      );
      const downloadMatch = stdout.match(
        /\[download\] Destination: (.+)/
      );
      const alreadyMatch = stdout.match(
        /\[download\] (.+?) has already been downloaded/
      );

      let finalFile =
        mergeMatch?.[1] ||
        downloadMatch?.[1] ||
        alreadyMatch?.[1] ||
        "unknown";

      logger.info(`Download complete: ${finalFile}`);

      if (finalFile !== "unknown") {
        finalFile = finalFile.trim();

        // Read metadata from .info.json (co-located by yt-dlp)
        const meta = readInfoJson(finalFile);

        // Write NFO sidecar with full metadata
        writeNfo(finalFile, url, meta, logger, xmlEscape);
      }

      return {
        success: true,
        message: `Downloaded to ${finalFile}`,
      };
    } catch (error: unknown) {
      const err = error as Error & { stderr?: string; stdout?: string };
      const errorOutput = err.stderr || err.stdout || err.message;

      logger.error(`yt-dlp failed: ${errorOutput}`);

      return {
        success: false,
        message: `yt-dlp failed: ${errorOutput}`,
      };
    }
  },
});

export default plugin;
