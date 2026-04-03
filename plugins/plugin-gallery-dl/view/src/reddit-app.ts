import type { PluginViewAPI, FileEntry } from "./types";
import { injectStyles } from "./styles";
import { isImageFile, isVideoFile, getFileUrl } from "./card-helpers";

const MEDIA_RE = /\.(jpe?g|png|gif|webp|bmp|avif|mp4|m4v|webm|mov|avi|mkv)$/i;
const BATCH_SIZE = 30;

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffDay > 30) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
    if (diffDay > 0) return `${diffDay}d ago`;
    const diffHour = Math.floor(diffMs / 3600000);
    if (diffHour > 0) return `${diffHour}h ago`;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin > 0) return `${diffMin}m ago`;
    return "just now";
  } catch {
    return "";
  }
}

// ── Lightbox ──────────────────────────────────────────────
function createLightbox(
  images: { src: string; name: string }[],
  startIndex: number
): HTMLElement {
  let idx = startIndex;
  const overlay = document.createElement("div");
  overlay.className = "gallery-lightbox";

  function update(): void {
    overlay.innerHTML = `
      <button class="gallery-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[idx].src}" alt="${escapeHtml(images[idx].name)}" />
      ${images.length > 1 ? `<button class="gallery-lightbox-nav gallery-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="gallery-lightbox-counter">${idx + 1} / ${images.length}</div>` : ""}
    `;
    overlay.querySelector(".gallery-lightbox-close")!.addEventListener("click", close);
    overlay.querySelector(".gallery-lightbox-prev")?.addEventListener("click", () => { idx = (idx - 1 + images.length) % images.length; update(); });
    overlay.querySelector(".gallery-lightbox-next")?.addEventListener("click", () => { idx = (idx + 1) % images.length; update(); });
  }

  function close(): void {
    overlay.remove();
    document.removeEventListener("keydown", handleKey);
  }

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") { idx = (idx - 1 + images.length) % images.length; update(); }
    else if (e.key === "ArrowRight") { idx = (idx + 1) % images.length; update(); }
  };
  document.addEventListener("keydown", handleKey);
  update();
  return overlay;
}

// ── Breadcrumb ────────────────────────────────────────────
function renderBreadcrumb(
  currentPath: string,
  trackedDirectory: string,
  navigate: (path: string) => void
): HTMLElement {
  const bc = document.createElement("div");
  bc.className = "gallery-breadcrumb";

  const tracked = trackedDirectory.replace(/\/+$/, "");
  const current = currentPath.replace(/\/+$/, "");

  const rootLink = document.createElement("span");
  rootLink.className = "gallery-breadcrumb-link";
  rootLink.textContent = tracked;
  rootLink.addEventListener("click", () => navigate(tracked));
  bc.appendChild(rootLink);

  if (current !== tracked) {
    const relative = current.startsWith(tracked + "/")
      ? current.slice(tracked.length + 1)
      : "";
    relative.split("/").filter(Boolean).forEach((part, i, parts) => {
      const sep = document.createElement("span");
      sep.className = "gallery-breadcrumb-sep";
      sep.textContent = " / ";
      bc.appendChild(sep);

      if (i < parts.length - 1) {
        const link = document.createElement("span");
        link.className = "gallery-breadcrumb-link";
        link.textContent = part;
        const linkPath = tracked + "/" + parts.slice(0, i + 1).join("/");
        link.addEventListener("click", () => navigate(linkPath));
        bc.appendChild(link);
      } else {
        const span = document.createElement("span");
        span.className = "gallery-breadcrumb-current";
        span.textContent = part;
        bc.appendChild(span);
      }
    });
  }

  return bc;
}

// ── Folder card ───────────────────────────────────────────
function renderFolderCard(
  dir: FileEntry,
  previewUrl: string | null,
  itemCount: number,
  navigate: (path: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "gallery-folder-card";
  card.addEventListener("click", () => navigate(dir.path));

  const thumb = document.createElement("div");
  thumb.className = "gallery-folder-thumb";
  if (previewUrl) {
    thumb.innerHTML = `<img src="${previewUrl}" alt="" loading="lazy" />`;
  } else {
    thumb.innerHTML = `<div class="gallery-folder-icon">📁</div>`;
  }

  const countBadge = document.createElement("div");
  countBadge.className = "gallery-folder-badge";
  countBadge.textContent = `${itemCount} item${itemCount !== 1 ? "s" : ""}`;
  thumb.appendChild(countBadge);

  const label = document.createElement("div");
  label.className = "gallery-folder-label";
  label.textContent = dir.name;

  card.appendChild(thumb);
  card.appendChild(label);
  return card;
}

// ── Media item (image or video in the feed) ───────────────
function renderMediaItem(
  file: FileEntry,
  allImages: { src: string; name: string }[],
  imageIndex: number,
  openFile: (path: string) => void
): HTMLElement {
  const item = document.createElement("div");
  item.className = "gallery-media-item";

  if (isVideoFile(file.name)) {
    const video = document.createElement("video");
    video.className = "gallery-media-video";
    video.src = getFileUrl(file.path);
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const isGif = file.name.includes(".gif.") || file.name.endsWith(".gif");
    if (isGif) {
      video.loop = true;
    }
    // Autoplay when visible, pause when scrolled away
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(video);
    item.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.className = "gallery-media-img";
    img.src = getFileUrl(file.path);
    img.alt = file.name;
    img.loading = "lazy";
    img.addEventListener("click", () => {
      document.body.appendChild(createLightbox(allImages, imageIndex));
    });
    item.appendChild(img);
  }

  // Caption
  const caption = document.createElement("div");
  caption.className = "gallery-media-caption";
  const nameSpan = document.createElement("span");
  nameSpan.className = "gallery-media-name";
  nameSpan.textContent = file.name;
  const metaSpan = document.createElement("span");
  metaSpan.className = "gallery-media-meta";
  const parts: string[] = [];
  if (file.size > 0) parts.push(formatFileSize(file.size));
  const dateStr = formatRelativeDate(file.modifiedAt);
  if (dateStr) parts.push(dateStr);
  metaSpan.textContent = parts.join(" · ");
  caption.appendChild(nameSpan);
  caption.appendChild(metaSpan);
  item.appendChild(caption);

  return item;
}

// ── Main app ──────────────────────────────────────────────
export class RedditApp {
  private container: HTMLElement;
  private api: PluginViewAPI;
  private contentEl: HTMLElement;

  constructor(container: HTMLElement, api: PluginViewAPI) {
    this.container = container;
    this.api = api;
    this.container.innerHTML = "";
    this.container.classList.add("gallery-view");
    injectStyles(this.container);
    this.contentEl = document.createElement("div");
    this.container.appendChild(this.contentEl);
    this.renderCurrentPath();
  }

  async renderCurrentPath(): Promise<void> {
    const { currentPath, trackedDirectory } = this.api;
    this.contentEl.innerHTML = "";

    const tracked = trackedDirectory.replace(/\/+$/, "");
    const current = currentPath.replace(/\/+$/, "");

    if (current !== tracked) {
      this.contentEl.appendChild(
        renderBreadcrumb(currentPath, trackedDirectory, (p) => this.api.navigate(p))
      );
    }

    const viewContainer = document.createElement("div");
    viewContainer.innerHTML = `<div class="gallery-loading">Loading...</div>`;
    this.contentEl.appendChild(viewContainer);

    const entries = await this.api.fetchFiles(currentPath);
    viewContainer.innerHTML = "";

    const dirs = entries.filter((e) => e.isDirectory);
    const mediaFiles = entries.filter(
      (e) => !e.isDirectory && MEDIA_RE.test(e.name)
    );

    // Header
    const dirName = currentPath.split("/").pop() || "";
    const header = document.createElement("div");
    header.className = "gallery-header";
    const totalItems = dirs.length + mediaFiles.length;
    header.innerHTML = `
      <h2 class="gallery-title">${escapeHtml(dirName)}</h2>
      <span class="gallery-count">${totalItems} item${totalItems !== 1 ? "s" : ""}</span>
    `;
    viewContainer.appendChild(header);

    if (totalItems === 0) {
      viewContainer.innerHTML += `
        <div class="gallery-empty">
          <div class="gallery-empty-icon">📂</div>
          <span>No media found</span>
        </div>
      `;
      return;
    }

    const feed = document.createElement("div");
    feed.className = "gallery-feed";
    viewContainer.appendChild(feed);

    // Build image list for lightbox navigation (images only, not videos)
    const allImages = mediaFiles
      .filter((f) => isImageFile(f.name))
      .map((f) => ({ src: getFileUrl(f.path), name: f.name }));

    // Combine dirs and media into a single ordered list:
    // Directories first, then media files
    type FeedItem =
      | { type: "dir"; entry: FileEntry }
      | { type: "media"; entry: FileEntry; imageIndex: number };

    const feedItems: FeedItem[] = [];

    // Add folders
    for (const dir of dirs) {
      feedItems.push({ type: "dir", entry: dir });
    }

    // Add media files with their image index for lightbox
    let imgIdx = 0;
    for (const file of mediaFiles) {
      const isImg = isImageFile(file.name);
      feedItems.push({
        type: "media",
        entry: file,
        imageIndex: isImg ? imgIdx : -1,
      });
      if (isImg) imgIdx++;
    }

    // Batch render — no async API calls per item to avoid overwhelming the server
    let loaded = 0;

    const renderBatch = (): void => {
      const batch = feedItems.slice(loaded, loaded + BATCH_SIZE);
      for (const item of batch) {
        if (item.type === "dir") {
          const card = renderFolderCard(item.entry, null, 0, (p) =>
            this.api.navigate(p)
          );
          feed.appendChild(card);

          // Lazy-load preview when folder card scrolls into view
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                observer.disconnect();
                this.api.fetchFiles(item.entry.path).then((children) => {
                  const firstImg = children.find(
                    (c) => !c.isDirectory && isImageFile(c.name)
                  );
                  const thumb = card.querySelector(".gallery-folder-thumb") as HTMLElement;
                  if (firstImg && thumb) {
                    thumb.innerHTML = `<img src="${getFileUrl(firstImg.path)}" alt="" loading="lazy" />`;
                  }
                  const badge = card.querySelector(".gallery-folder-badge");
                  if (badge) {
                    badge.textContent = `${children.length} item${children.length !== 1 ? "s" : ""}`;
                  }
                }).catch(() => {});
              }
            },
            { rootMargin: "200px" }
          );
          observer.observe(card);
        } else {
          feed.appendChild(
            renderMediaItem(
              item.entry,
              allImages,
              item.imageIndex,
              (p) => this.api.openFile(p)
            )
          );
        }
      }
      loaded += batch.length;

      // Load more button
      const existing = viewContainer.querySelector(".gallery-load-more");
      if (existing) existing.remove();

      if (loaded < feedItems.length) {
        const btn = document.createElement("button");
        btn.className = "gallery-load-more";
        btn.textContent = `Load more (${feedItems.length - loaded} remaining)`;
        btn.addEventListener("click", () => renderBatch());
        viewContainer.appendChild(btn);
      }
    };

    renderBatch();
  }

  onPathChange(newPath: string, api: PluginViewAPI): void {
    this.api = api;
    this.renderCurrentPath();
  }

  destroy(): void {
    this.container.classList.remove("gallery-view");
    this.container.innerHTML = "";
  }
}
