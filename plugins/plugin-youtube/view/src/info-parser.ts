import type { PluginViewAPI, FileEntry, YtDlpInfo, VideoInfo } from "./types";

/** Video file extensions */
const VIDEO_RE = /\.(mkv|mp4|webm|m4v|avi|mov|flv|wmv)$/i;

/** Image file extensions (for thumbnails) */
const IMAGE_RE = /\.(jpg|jpeg|png|webp)$/i;

/** Load and parse a .info.json file */
export async function loadInfoJson(
  api: PluginViewAPI,
  filePath: string
): Promise<YtDlpInfo | null> {
  try {
    const res = await api.fetchFile(filePath);
    if (!res.ok) return null;
    const data = await res.json();
    return data as YtDlpInfo;
  } catch {
    return null;
  }
}

/** Find the primary video file in a set of entries */
export function findVideoFile(entries: FileEntry[]): FileEntry | null {
  return entries.find((e) => !e.isDirectory && VIDEO_RE.test(e.name)) || null;
}

/** Find the first .info.json file in entries */
export function findInfoJson(entries: FileEntry[]): FileEntry | null {
  return entries.find((e) => !e.isDirectory && e.name.endsWith(".info.json")) || null;
}

/** Find a thumbnail image in entries */
export function findThumbnail(entries: FileEntry[]): FileEntry | null {
  return entries.find((e) => !e.isDirectory && IMAGE_RE.test(e.name)) || null;
}

/** Extract the filename stem (no extension) */
export function stem(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  return dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
}

/** Derive a display title from a filename stem when no metadata is available */
export function titleFromStem(s: string): string {
  // Remove trailing [id] bracket if present
  const withoutId = s.replace(/\s*\[[^\]]+\]$/, "").trim();
  return withoutId || s;
}

/** Format seconds to HH:MM:SS or MM:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Format a yt-dlp date string (YYYYMMDD) to human readable */
export function formatDate(raw: string): string {
  if (!raw || raw.length !== 8) return raw || "";
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a view count to human readable (e.g., 1.2M) */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return String(count);
}

/**
 * Build a VideoInfo for a directory containing video files.
 * Loads the .info.json if available for rich metadata.
 */
export async function buildVideoInfo(
  api: PluginViewAPI,
  dirPath: string,
  entries: FileEntry[]
): Promise<VideoInfo | null> {
  const videoEntry = findVideoFile(entries);
  if (!videoEntry) return null;

  const videoStem = stem(videoEntry.name);
  const infoJsonEntry = findInfoJson(entries);
  const thumbnailEntry = findThumbnail(entries);

  let info: YtDlpInfo | null = null;
  if (infoJsonEntry) {
    info = await loadInfoJson(api, infoJsonEntry.path);
  }

  return {
    path: dirPath,
    stem: videoStem,
    videoFile: videoEntry.path,
    thumbnail: thumbnailEntry?.path,
    info,
  };
}

/**
 * Build a VideoInfo from entries that are directly in the current dir
 * (flat structure where video files sit alongside .info.json).
 */
export function buildVideoInfoFromEntries(
  dirPath: string,
  videoEntry: FileEntry,
  infoJsonEntry: FileEntry | null,
  thumbnailEntry: FileEntry | null,
  info: YtDlpInfo | null
): VideoInfo {
  return {
    path: dirPath,
    stem: stem(videoEntry.name),
    videoFile: videoEntry.path,
    thumbnail: thumbnailEntry?.path,
    info,
  };
}
