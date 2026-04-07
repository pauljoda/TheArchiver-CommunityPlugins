import Hls from "hls.js";
import type { PluginViewAPI, FileEntry, YtDlpInfo } from "./types";
import {
  findVideoFile,
  findInfoJson,
  loadInfoJson,
  titleFromStem,
  stem,
  formatDuration,
  formatDate,
  formatCount,
} from "./info-parser";
import { initTrickplay, destroyTrickplay } from "./trickplay";

/** Active HLS instance for cleanup */
let activeHls: Hls | null = null;
let activeSessionId: string | null = null;

/** Generate a UUID v4 */
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Start HLS streaming as a fallback for formats the browser can't decode natively */
function startHlsFallback(videoEl: HTMLVideoElement, videoFilePath: string): void {
  const directUrl = `/api/files/preview?path=${encodeURIComponent(videoFilePath)}`;

  if (Hls.isSupported()) {
    activeSessionId = uuid();
    const streamUrl =
      `/api/files/stream?path=${encodeURIComponent(videoFilePath)}` +
      `&sessionId=${activeSessionId}&seek=0`;

    activeHls = new Hls({ enableWorker: false });
    activeHls.loadSource(streamUrl);
    activeHls.attachMedia(videoEl);

    activeHls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      console.error("[yt-view] HLS fatal error:", data.type, data.details);
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        activeHls?.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        activeHls?.recoverMediaError();
      } else {
        // Unrecoverable — last resort: try direct anyway
        activeHls?.destroy();
        activeHls = null;
        videoEl.src = directUrl;
      }
    });
  } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari native HLS
    activeSessionId = uuid();
    videoEl.src =
      `/api/files/stream?path=${encodeURIComponent(videoFilePath)}` +
      `&sessionId=${activeSessionId}&seek=0`;
  } else {
    // No HLS support — try direct as last resort
    videoEl.src = directUrl;
  }
}

/** Clean up any active video playback and server-side ffmpeg session */
export function destroyVideoView(): void {
  if (activeHls) {
    activeHls.destroy();
    activeHls = null;
  }
  // Signal the server to kill the ffmpeg process immediately
  if (activeSessionId) {
    fetch(`/api/files/stream?sessionId=${activeSessionId}`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => {});
    activeSessionId = null;
  }
  destroyTrickplay();
}

/**
 * Render the video detail view: player + metadata + chapters.
 * Auto-detects the video file from directory entries.
 */
export async function renderVideoView(
  container: HTMLElement,
  api: PluginViewAPI,
  currentPath: string,
  entries: FileEntry[]
): Promise<void> {
  const files = entries.filter((e) => !e.isDirectory);
  const videoEntry = findVideoFile(files);

  if (!videoEntry) {
    container.innerHTML = `
      <div class="yt-empty">
        <div class="yt-empty-icon">&#127909;</div>
        <div class="yt-empty-text">No video file found</div>
      </div>
    `;
    return;
  }

  const infoJsonEntry = findInfoJson(files);
  let info: YtDlpInfo | null = null;
  if (infoJsonEntry) {
    info = await loadInfoJson(api, infoJsonEntry.path);
  }

  await renderVideoDetail(container, api, currentPath, videoEntry.path, stem(videoEntry.name), info);
}

/**
 * Render the video detail view for a specific video file (used by flat channel views).
 */
export async function renderVideoViewForFile(
  container: HTMLElement,
  api: PluginViewAPI,
  currentPath: string,
  video: { videoFile: string; stem: string; info?: YtDlpInfo | null }
): Promise<void> {
  await renderVideoDetail(container, api, currentPath, video.videoFile, video.stem, video.info || null);
}

/**
 * Core video detail renderer.
 */
async function renderVideoDetail(
  container: HTMLElement,
  api: PluginViewAPI,
  currentPath: string,
  videoFilePath: string,
  videoStem: string,
  info: YtDlpInfo | null
): Promise<void> {
  const title = info?.title || titleFromStem(videoStem);

  // Layout
  const layout = document.createElement("div");
  layout.className = "yt-video-layout";

  // ── Video Player ──
  const playerWrapper = document.createElement("div");
  playerWrapper.className = "yt-player-wrapper";

  const videoEl = document.createElement("video");
  videoEl.controls = true;
  videoEl.autoplay = false;
  videoEl.playsInline = true;
  playerWrapper.appendChild(videoEl);

  layout.appendChild(playerWrapper);

  // ── Title ──
  const titleEl = document.createElement("h1");
  titleEl.className = "yt-video-title";
  titleEl.textContent = title;
  layout.appendChild(titleEl);

  // ── Meta row: channel, date ──
  const metaRow = document.createElement("div");
  metaRow.className = "yt-video-meta-row";

  if (info?.channel || info?.uploader) {
    const channelEl = document.createElement("span");
    channelEl.className = "yt-video-channel";
    channelEl.textContent = info.channel || info.uploader || "";
    metaRow.appendChild(channelEl);
  }

  if (info?.upload_date) {
    const dateEl = document.createElement("span");
    dateEl.className = "yt-video-meta-item";
    dateEl.textContent = formatDate(info.upload_date);
    metaRow.appendChild(dateEl);
  }

  layout.appendChild(metaRow);

  // ── Stats row: views, likes, duration, resolution ──
  if (info) {
    const stats = document.createElement("div");
    stats.className = "yt-video-stats";

    const statItems: string[] = [];
    if (info.view_count !== undefined) {
      statItems.push(`${formatCount(info.view_count)} views`);
    }
    if (info.like_count !== undefined) {
      statItems.push(`${formatCount(info.like_count)} likes`);
    }
    if (info.duration !== undefined) {
      statItems.push(formatDuration(info.duration));
    }
    if (info.resolution) {
      statItems.push(info.resolution);
    }
    if (info.fps) {
      statItems.push(`${info.fps}fps`);
    }

    stats.textContent = statItems.join(" \u00B7 ");

    // Source link
    if (info.webpage_url) {
      const sep = document.createTextNode(" \u00B7 ");
      stats.appendChild(sep);
      const link = document.createElement("a");
      link.className = "yt-source-link";
      link.href = info.webpage_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open original";
      stats.appendChild(link);
    }

    layout.appendChild(stats);
  }

  // ── Description ──
  if (info?.description) {
    const descContainer = document.createElement("div");
    descContainer.className = "yt-video-description";

    const descText = document.createElement("div");
    descText.textContent = info.description;
    descContainer.appendChild(descText);

    const fade = document.createElement("div");
    fade.className = "yt-video-description-fade";
    descContainer.appendChild(fade);

    descContainer.addEventListener("click", () => {
      descContainer.classList.toggle("expanded");
    });

    layout.appendChild(descContainer);
  }

  // ── Chapters ──
  if (info?.chapters && info.chapters.length > 0) {
    const chaptersSection = document.createElement("div");
    chaptersSection.className = "yt-chapters";

    const chapTitle = document.createElement("div");
    chapTitle.className = "yt-chapters-title";
    chapTitle.textContent = `Chapters (${info.chapters.length})`;
    chaptersSection.appendChild(chapTitle);

    const chapList = document.createElement("div");
    chapList.className = "yt-chapter-list";

    for (const chapter of info.chapters) {
      const item = document.createElement("div");
      item.className = "yt-chapter-item";

      const time = document.createElement("span");
      time.className = "yt-chapter-time";
      time.textContent = formatDuration(chapter.start_time);

      const name = document.createElement("span");
      name.className = "yt-chapter-name";
      name.textContent = chapter.title;

      item.appendChild(time);
      item.appendChild(name);

      item.addEventListener("click", () => {
        videoEl.currentTime = chapter.start_time;
        videoEl.play();
        // Update active chapter styling
        chapList.querySelectorAll(".yt-chapter-item").forEach((el) =>
          el.classList.remove("active")
        );
        item.classList.add("active");
      });

      chapList.appendChild(item);
    }

    chaptersSection.appendChild(chapList);
    layout.appendChild(chaptersSection);

    // Update active chapter on timeupdate
    videoEl.addEventListener("timeupdate", () => {
      const currentTime = videoEl.currentTime;
      const chapters = info!.chapters!;
      let activeIdx = -1;
      for (let i = chapters.length - 1; i >= 0; i--) {
        if (currentTime >= chapters[i].start_time) {
          activeIdx = i;
          break;
        }
      }
      const items = chapList.querySelectorAll(".yt-chapter-item");
      items.forEach((el, i) => {
        el.classList.toggle("active", i === activeIdx);
      });
    });
  }

  // ── Tags ──
  if (info?.tags && info.tags.length > 0) {
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "yt-tags";

    for (const tag of info.tags.slice(0, 30)) {
      const tagEl = document.createElement("span");
      tagEl.className = "yt-tag";
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    }

    layout.appendChild(tagsContainer);
  }

  // ── Categories ──
  if (info?.categories && info.categories.length > 0) {
    const catsContainer = document.createElement("div");
    catsContainer.className = "yt-tags";

    for (const cat of info.categories) {
      const catEl = document.createElement("span");
      catEl.className = "yt-tag";
      catEl.textContent = cat;
      catsContainer.appendChild(catEl);
    }

    layout.appendChild(catsContainer);
  }

  container.appendChild(layout);

  // ── Initialize video playback ──
  // Prefer direct playback via the preview endpoint — it supports HTTP Range
  // requests which gives us proper seeking, duration, and buffering for free.
  // Only fall back to HLS transcoding if the browser can't decode the format.
  const previewUrl = `/api/files/preview?path=${encodeURIComponent(videoFilePath)}`;
  videoEl.src = previewUrl;

  videoEl.addEventListener(
    "error",
    () => {
      // Format not supported natively (e.g. MKV) — switch to HLS
      startHlsFallback(videoEl, videoFilePath);
    },
    { once: true }
  );

  // ── Initialize trickplay if available ──
  if (info?.duration) {
    initTrickplay(
      videoEl,
      playerWrapper,
      api,
      currentPath,
      videoStem,
      info.duration
    );
  }
}
