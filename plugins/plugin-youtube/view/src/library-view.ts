import type { PluginViewAPI, FileEntry, ChannelInfo } from "./types";
import { findVideoFile, findThumbnail } from "./info-parser";

/**
 * Render the root library view: a grid of channel/playlist cards.
 * Each card shows the folder name, video count, and a preview thumbnail.
 */
export async function renderLibraryView(
  container: HTMLElement,
  api: PluginViewAPI,
  currentPath: string,
  entries: FileEntry[],
  navigate: (path: string) => void
): Promise<void> {
  const dirs = entries.filter((e) => e.isDirectory);

  if (dirs.length === 0) {
    container.innerHTML = `
      <div class="yt-empty">
        <div class="yt-empty-icon">&#127909;</div>
        <div class="yt-empty-text">No channels or playlists found</div>
      </div>
    `;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "yt-grid";
  container.appendChild(grid);

  // Load channel info in parallel (limit concurrency for large libraries)
  const channelPromises = dirs.map((dir) => loadChannelInfo(api, dir));
  const channels = await Promise.all(channelPromises);

  for (const channel of channels) {
    const card = createChannelCard(channel, api, navigate);
    grid.appendChild(card);
  }
}

async function loadChannelInfo(
  api: PluginViewAPI,
  dir: FileEntry
): Promise<ChannelInfo> {
  const info: ChannelInfo = {
    name: dir.name,
    path: dir.path,
    videoCount: 0,
  };

  try {
    const children = await api.fetchFiles(dir.path);
    const childDirs = children.filter((e) => e.isDirectory);
    const childFiles = children.filter((e) => !e.isDirectory);

    // Count: either child directories (each is a video) or video files directly
    const videoFiles = childFiles.filter((f) => /\.(mkv|mp4|webm|m4v)$/i.test(f.name));
    if (childDirs.length > 0) {
      info.videoCount = childDirs.length;
    } else {
      info.videoCount = videoFiles.length;
    }

    // Find a thumbnail: check for direct images, or dig into first child dir
    const thumb = findThumbnail(childFiles);
    if (thumb) {
      info.previewThumb = thumb.path;
    } else if (childDirs.length > 0) {
      try {
        const grandchildren = await api.fetchFiles(childDirs[0].path);
        const grandThumb = findThumbnail(grandchildren.filter((e) => !e.isDirectory));
        if (grandThumb) {
          info.previewThumb = grandThumb.path;
        } else {
          // Use video thumbnail from the core app's thumbnail API
          const grandVideo = findVideoFile(grandchildren);
          if (grandVideo) {
            info.previewThumb = grandVideo.path;
          }
        }
      } catch {
        // Ignore errors loading grandchildren
      }
    } else if (videoFiles.length > 0) {
      info.previewThumb = videoFiles[0].path;
    }
  } catch {
    // Failed to list directory
  }

  return info;
}

function createChannelCard(
  channel: ChannelInfo,
  api: PluginViewAPI,
  navigate: (path: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "yt-card";
  card.addEventListener("click", () => navigate(channel.path));

  // Thumbnail
  const thumbContainer = document.createElement("div");
  thumbContainer.className = "yt-card-thumb-container";

  if (channel.previewThumb) {
    const img = document.createElement("img");
    img.className = "yt-card-thumb";
    img.loading = "lazy";
    // Use the thumbnail API for video files, direct fetch for images
    if (/\.(mkv|mp4|webm|m4v|avi|mov)$/i.test(channel.previewThumb)) {
      img.src = `/api/files/thumbnail?path=${encodeURIComponent(channel.previewThumb)}`;
    } else {
      img.src = `/api/files/preview?path=${encodeURIComponent(channel.previewThumb)}`;
    }
    img.alt = channel.name;
    img.onerror = () => {
      img.replaceWith(createPlaceholder());
    };
    thumbContainer.appendChild(img);
  } else {
    thumbContainer.appendChild(createPlaceholder());
  }

  card.appendChild(thumbContainer);

  // Body
  const body = document.createElement("div");
  body.className = "yt-card-body";

  const title = document.createElement("div");
  title.className = "yt-card-title";
  title.textContent = channel.name;
  body.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "yt-card-meta";
  meta.textContent = `${channel.videoCount} video${channel.videoCount !== 1 ? "s" : ""}`;
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
