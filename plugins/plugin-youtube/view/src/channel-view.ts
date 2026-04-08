import type { PluginViewAPI, FileEntry, VideoInfo } from "./types";
import {
  findVideoFile,
  findInfoJson,
  findThumbnail,
  loadInfoJson,
  titleFromStem,
  stem,
  formatDuration,
  formatDate,
  formatCount,
} from "./info-parser";

/** Video file extensions */
const VIDEO_RE = /\.(mkv|mp4|webm|m4v|avi|mov|flv|wmv)$/i;

/**
 * Render the channel/playlist view: a grid of video cards.
 * Handles three structures:
 * 1. Flat: videos sit directly in the current directory
 * 2. Directory per video: each child dir contains a video + metadata
 * 3. Mixed: both direct video files and subdirectories exist
 */
export async function renderChannelView(
  container: HTMLElement,
  api: PluginViewAPI,
  currentPath: string,
  entries: FileEntry[],
  navigate: (path: string) => void,
  showVideo?: (video: VideoInfo) => void
): Promise<void> {
  const dirs = entries.filter((e) => e.isDirectory);
  const files = entries.filter((e) => !e.isDirectory);
  const directVideos = files.filter((f) => VIDEO_RE.test(f.name));

  if (dirs.length === 0 && directVideos.length === 0) {
    container.innerHTML = `
      <div class="yt-empty">
        <div class="yt-empty-icon">&#127909;</div>
        <div class="yt-empty-text">No videos found</div>
      </div>
    `;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "yt-grid";
  container.appendChild(grid);

  // Always render direct video files first when present
  if (directVideos.length > 0) {
    await renderFlatVideoCards(grid, api, currentPath, files, directVideos, navigate, showVideo);
  }

  // Also render subdirectory-based cards when subdirectories exist
  if (dirs.length > 0) {
    await renderDirVideoCards(grid, api, dirs, navigate);
  }
}

async function renderFlatVideoCards(
  grid: HTMLElement,
  api: PluginViewAPI,
  currentPath: string,
  allFiles: FileEntry[],
  videoFiles: FileEntry[],
  navigate: (path: string) => void,
  showVideo?: (video: VideoInfo) => void
): Promise<void> {
  // Group info.json files by stem for lookup
  const infoJsonByStem = new Map<string, FileEntry>();
  const thumbByStem = new Map<string, FileEntry>();

  for (const f of allFiles) {
    if (f.name.endsWith(".info.json")) {
      const s = f.name.replace(".info.json", "");
      infoJsonByStem.set(s, f);
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
      const s = stem(f.name);
      thumbByStem.set(s, f);
    }
  }

  // Load info for each video in parallel
  const cardPromises = videoFiles.map(async (videoEntry) => {
    const videoStem = stem(videoEntry.name);
    const infoEntry = infoJsonByStem.get(videoStem);
    const thumbEntry = thumbByStem.get(videoStem);

    let info = null;
    if (infoEntry) {
      info = await loadInfoJson(api, infoEntry.path);
    }

    return { videoEntry, info, thumbEntry };
  });

  const cards = await Promise.all(cardPromises);

  // Sort by upload date descending, then by name
  cards.sort((a, b) => {
    const dateA = a.info?.upload_date || "";
    const dateB = b.info?.upload_date || "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return a.videoEntry.name.localeCompare(b.videoEntry.name);
  });

  for (const { videoEntry, info, thumbEntry } of cards) {
    const videoInfo: VideoInfo = {
      path: currentPath,
      stem: stem(videoEntry.name),
      videoFile: videoEntry.path,
      thumbnail: thumbEntry?.path,
      info,
    };
    const onClick = showVideo
      ? () => showVideo(videoInfo)
      : () => navigate(currentPath);
    const card = createVideoCard(videoInfo, onClick);
    grid.appendChild(card);
  }
}

/**
 * Recursively search for a video file and its companions within a directory.
 * Tries direct children first, then digs one level into subdirectories.
 * Returns the files list that contains the video so callers can find metadata.
 */
async function findVideoInDir(
  api: PluginViewAPI,
  dirPath: string,
  depth = 0
): Promise<{ videoFile: FileEntry; allFiles: FileEntry[] } | null> {
  const MAX_DEPTH = 3;
  if (depth > MAX_DEPTH) return null;

  let entries: FileEntry[];
  try {
    entries = await api.fetchFiles(dirPath);
  } catch {
    return null;
  }

  const files = entries.filter((e) => !e.isDirectory);
  const videoFile = findVideoFile(files);
  if (videoFile) {
    return { videoFile, allFiles: files };
  }

  // No direct video — search subdirectories
  const subdirs = entries.filter(
    (e) => e.isDirectory && !e.name.endsWith(".trickplay")
  );
  for (const sub of subdirs) {
    const result = await findVideoInDir(api, sub.path, depth + 1);
    if (result) return result;
  }

  return null;
}

async function renderDirVideoCards(
  grid: HTMLElement,
  api: PluginViewAPI,
  dirs: FileEntry[],
  navigate: (path: string) => void
): Promise<void> {
  // Load video info for each directory in parallel
  const cardPromises = dirs.map(async (dir) => {
    try {
      const result = await findVideoInDir(api, dir.path);
      if (!result) return null;

      const { videoFile, allFiles } = result;
      const infoEntry = findInfoJson(allFiles);
      const thumbEntry = findThumbnail(allFiles);

      let info = null;
      if (infoEntry) {
        info = await loadInfoJson(api, infoEntry.path);
      }

      return {
        path: dir.path,
        stem: stem(videoFile.name),
        videoFile: videoFile.path,
        thumbnail: thumbEntry?.path,
        info,
      } as VideoInfo;
    } catch {
      return null;
    }
  });

  const videos = (await Promise.all(cardPromises)).filter(
    (v): v is VideoInfo => v !== null
  );

  // Sort by upload date descending
  videos.sort((a, b) => {
    const dateA = a.info?.upload_date || "";
    const dateB = b.info?.upload_date || "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return a.stem.localeCompare(b.stem);
  });

  for (const video of videos) {
    const card = createVideoCard(video, () => navigate(video.path));
    grid.appendChild(card);
  }
}

function createVideoCard(
  video: VideoInfo,
  onClick: () => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "yt-card";
  card.addEventListener("click", onClick);

  // Thumbnail container with optional duration badge
  const thumbContainer = document.createElement("div");
  thumbContainer.className = "yt-card-thumb-container";

  if (video.thumbnail) {
    const img = document.createElement("img");
    img.className = "yt-card-thumb";
    img.loading = "lazy";
    if (/\.(mkv|mp4|webm|m4v|avi|mov)$/i.test(video.thumbnail)) {
      img.src = `/api/files/thumbnail?path=${encodeURIComponent(video.thumbnail)}`;
    } else {
      img.src = `/api/files/preview?path=${encodeURIComponent(video.thumbnail)}`;
    }
    img.alt = video.info?.title || video.stem;
    img.onerror = () => {
      // Fall back to video thumbnail API
      img.src = `/api/files/thumbnail?path=${encodeURIComponent(video.videoFile)}`;
      img.onerror = () => {
        img.replaceWith(createPlaceholder());
      };
    };
    thumbContainer.appendChild(img);
  } else {
    // Try video thumbnail API
    const img = document.createElement("img");
    img.className = "yt-card-thumb";
    img.loading = "lazy";
    img.src = `/api/files/thumbnail?path=${encodeURIComponent(video.videoFile)}`;
    img.alt = video.info?.title || video.stem;
    img.onerror = () => {
      img.replaceWith(createPlaceholder());
    };
    thumbContainer.appendChild(img);
  }

  // Duration badge
  if (video.info?.duration) {
    const badge = document.createElement("div");
    badge.className = "yt-card-duration";
    badge.textContent = formatDuration(video.info.duration);
    thumbContainer.appendChild(badge);
  }

  card.appendChild(thumbContainer);

  // Body
  const body = document.createElement("div");
  body.className = "yt-card-body";

  const title = document.createElement("div");
  title.className = "yt-card-title";
  title.textContent = video.info?.title || titleFromStem(video.stem);
  body.appendChild(title);

  // Meta line: channel, date, views
  const meta = document.createElement("div");
  meta.className = "yt-card-meta";

  const parts: string[] = [];
  if (video.info?.channel || video.info?.uploader) {
    parts.push(video.info.channel || video.info.uploader || "");
  }
  if (video.info?.upload_date) {
    parts.push(formatDate(video.info.upload_date));
  }
  if (video.info?.view_count !== undefined) {
    parts.push(`${formatCount(video.info.view_count)} views`);
  }

  meta.textContent = parts.join(" \u00B7 ");
  body.appendChild(meta);

  card.appendChild(body);

  return card;
}

function createPlaceholder(): HTMLElement {
  const ph = document.createElement("div");
  ph.className = "yt-card-thumb-placeholder";
  ph.textContent = "\u{1F3AC}";
  return ph;
}
