"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // view/src/styles.ts
  function injectStyles(container) {
    const style = document.createElement("style");
    style.textContent = CSS;
    container.appendChild(style);
    return style;
  }
  var CSS = `
/* \u2500\u2500 Reset \u2500\u2500 */
.gallery-view * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.gallery-view {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--foreground);
  line-height: 1.5;
  padding: 1.5rem;
  min-height: 100%;
  max-width: 960px;
  margin: 0 auto;
}

/* \u2500\u2500 Loading \u2500\u2500 */
.gallery-loading {
  text-align: center;
  padding: 3rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

/* \u2500\u2500 Empty state \u2500\u2500 */
.gallery-empty {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
.gallery-empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.4;
}

/* \u2500\u2500 Breadcrumb \u2500\u2500 */
.gallery-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}
.gallery-breadcrumb-link {
  cursor: pointer;
  color: var(--primary);
  transition: opacity 0.15s;
}
.gallery-breadcrumb-link:hover {
  opacity: 0.7;
}
.gallery-breadcrumb-sep {
  opacity: 0.4;
  padding: 0 0.25rem;
}
.gallery-breadcrumb-current {
  color: var(--foreground);
}

/* \u2500\u2500 Header \u2500\u2500 */
.gallery-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}
.gallery-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.gallery-count {
  font-size: 0.8rem;
  color: var(--muted-foreground);
  font-family: 'JetBrains Mono', monospace;
}

/* \u2500\u2500 Feed \u2500\u2500 */
.gallery-feed {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* \u2500\u2500 Folder cards \u2500\u2500 */
.gallery-folder-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: var(--card);
}
.gallery-folder-card:hover {
  border-color: var(--primary);
  background: hsl(var(--accent) / 0.3);
}
.gallery-folder-thumb {
  position: relative;
  width: 80px;
  height: 60px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--muted);
  flex-shrink: 0;
}
.gallery-folder-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gallery-folder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.5rem;
  opacity: 0.4;
}
.gallery-folder-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  padding: 1px 4px;
  border-radius: 3px;
}
.gallery-folder-label {
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* \u2500\u2500 Media items \u2500\u2500 */
.gallery-media-item {
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--card);
}
.gallery-media-img {
  display: block;
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  background: var(--muted);
  cursor: pointer;
  transition: opacity 0.15s;
}
.gallery-media-img:hover {
  opacity: 0.9;
}
.gallery-media-video {
  display: block;
  width: 100%;
  max-height: 80vh;
  background: #000;
}
.gallery-media-caption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
}
.gallery-media-name {
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.gallery-media-meta {
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--muted-foreground);
  opacity: 0.6;
  white-space: nowrap;
  flex-shrink: 0;
}

/* \u2500\u2500 Controls bar \u2500\u2500 */
.gallery-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.gallery-controls-search {
  flex: 1;
  min-width: 0;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--foreground);
  font-family: inherit;
  font-size: 0.8125rem;
  padding: 0.4375rem 0.75rem;
  outline: none;
  transition: border-color 0.15s;
}
.gallery-controls-search:focus {
  border-color: var(--primary);
}
.gallery-controls-search::placeholder {
  color: var(--muted-foreground);
}
.gallery-controls-sort {
  appearance: none;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--foreground);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s;
  flex-shrink: 0;
}
.gallery-controls-sort:hover {
  border-color: var(--primary);
}
.gallery-no-results {
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  padding: 2rem 1rem;
}

/* \u2500\u2500 Caption link \u2500\u2500 */
.gallery-media-name-link {
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  transition: color 0.15s;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
}
.gallery-media-name-link:hover {
  color: var(--primary);
}

/* \u2500\u2500 Lightbox \u2500\u2500 */
.gallery-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.gallery-lightbox img {
  max-width: 95vw;
  max-height: 92vh;
  object-fit: contain;
  cursor: default;
  border-radius: 4px;
}
.gallery-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  background: none;
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  opacity: 0.7;
  z-index: 1;
  line-height: 1;
}
.gallery-lightbox-close:hover { opacity: 1; }
.gallery-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 2.5rem;
  width: 48px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  opacity: 0.5;
  transition: opacity 0.15s;
  z-index: 1;
}
.gallery-lightbox-nav:hover { opacity: 1; }
.gallery-lightbox-prev { left: 1rem; }
.gallery-lightbox-next { right: 1rem; }
.gallery-lightbox-counter {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  padding: 4px 12px;
  border-radius: 12px;
}
`;

  // ../_shared/view/media-player.ts
  var IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|avif|svg|tiff?)$/i;
  var VIDEO_EXT_RE = /\.(mp4|m4v|webm|mov|mkv|avi|flv|wmv|ogv)$/i;
  function isImageFile(name) {
    return IMAGE_EXT_RE.test(name);
  }
  function isVideoFile(name) {
    return VIDEO_EXT_RE.test(name);
  }
  function buildFileSrc(filePath) {
    return `/api/files/download?path=${encodeURIComponent(filePath)}`;
  }

  // view/src/card-helpers.ts
  var isImageFile2 = isImageFile;
  var isVideoFile2 = isVideoFile;
  var getFileUrl = buildFileSrc;

  // view/src/reddit-app.ts
  var MEDIA_RE = /\.(jpe?g|png|gif|webp|bmp|avif|mp4|m4v|webm|mov|avi|mkv)$/i;
  var BATCH_SIZE = 30;
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
  function formatRelativeDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDay = Math.floor(diffMs / 864e5);
      if (diffDay > 30) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : void 0
        });
      }
      if (diffDay > 0) return `${diffDay}d ago`;
      const diffHour = Math.floor(diffMs / 36e5);
      if (diffHour > 0) return `${diffHour}h ago`;
      const diffMin = Math.floor(diffMs / 6e4);
      if (diffMin > 0) return `${diffMin}m ago`;
      return "just now";
    } catch {
      return "";
    }
  }
  function createLightbox(images, startIndex) {
    let idx = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "gallery-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="gallery-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[idx].src}" alt="${escapeHtml(images[idx].name)}" />
      ${images.length > 1 ? `<button class="gallery-lightbox-nav gallery-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="gallery-lightbox-counter">${idx + 1} / ${images.length}</div>` : ""}
    `;
      overlay.querySelector(".gallery-lightbox-close").addEventListener("click", close);
      overlay.querySelector(".gallery-lightbox-prev")?.addEventListener("click", () => {
        idx = (idx - 1 + images.length) % images.length;
        update();
      });
      overlay.querySelector(".gallery-lightbox-next")?.addEventListener("click", () => {
        idx = (idx + 1) % images.length;
        update();
      });
    }
    function close() {
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    const handleKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") {
        idx = (idx - 1 + images.length) % images.length;
        update();
      } else if (e.key === "ArrowRight") {
        idx = (idx + 1) % images.length;
        update();
      }
    };
    document.addEventListener("keydown", handleKey);
    update();
    return overlay;
  }
  function renderBreadcrumb(currentPath, trackedDirectory, navigate) {
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
      const relative = current.startsWith(tracked + "/") ? current.slice(tracked.length + 1) : "";
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
  function renderFolderCard(dir, previewUrl, itemCount, navigate) {
    const card = document.createElement("div");
    card.className = "gallery-folder-card";
    card.addEventListener("click", () => navigate(dir.path));
    const thumb = document.createElement("div");
    thumb.className = "gallery-folder-thumb";
    if (previewUrl) {
      thumb.innerHTML = `<img src="${previewUrl}" alt="" loading="lazy" />`;
    } else {
      thumb.innerHTML = `<div class="gallery-folder-icon">\u{1F4C1}</div>`;
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
  function debounce(fn, ms) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }
  function renderMediaItem(file, allImages, imageIndex, openFile) {
    const item = document.createElement("div");
    item.className = "gallery-media-item";
    if (isVideoFile2(file.name)) {
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
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              video.play().catch(() => {
              });
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
    const caption = document.createElement("div");
    caption.className = "gallery-media-caption";
    const nameBtn = document.createElement("button");
    nameBtn.className = "gallery-media-name-link";
    nameBtn.textContent = file.name;
    nameBtn.title = "Open in preview";
    nameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openFile(file.path);
    });
    const metaSpan = document.createElement("span");
    metaSpan.className = "gallery-media-meta";
    const parts = [];
    if (file.size > 0) parts.push(formatFileSize(file.size));
    const dateStr = formatRelativeDate(file.modifiedAt);
    if (dateStr) parts.push(dateStr);
    metaSpan.textContent = parts.join(" \xB7 ");
    caption.appendChild(nameBtn);
    caption.appendChild(metaSpan);
    item.appendChild(caption);
    return item;
  }
  var RedditApp = class {
    constructor(container, api) {
      __publicField(this, "container");
      __publicField(this, "api");
      __publicField(this, "contentEl");
      this.container = container;
      this.api = api;
      this.container.innerHTML = "";
      this.container.classList.add("gallery-view");
      injectStyles(this.container);
      this.contentEl = document.createElement("div");
      this.container.appendChild(this.contentEl);
      this.renderCurrentPath();
    }
    async renderCurrentPath() {
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
          <div class="gallery-empty-icon">\u{1F4C2}</div>
          <span>No media found</span>
        </div>
      `;
        return;
      }
      let searchTerm = "";
      let sortMode = "name";
      const hasMedia = mediaFiles.length > 0;
      if (hasMedia) {
        const controls = document.createElement("div");
        controls.className = "gallery-controls";
        controls.innerHTML = `
        <input type="text" class="gallery-controls-search" placeholder="Search files..." aria-label="Search files" />
        <select class="gallery-controls-sort" aria-label="Sort files">
          <option value="name">Name</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="largest">Largest</option>
        </select>
      `;
        viewContainer.appendChild(controls);
        const searchInput = controls.querySelector(".gallery-controls-search");
        const sortSelect = controls.querySelector(".gallery-controls-sort");
        sortSelect.addEventListener("change", () => {
          sortMode = sortSelect.value;
          resetAndRender();
        });
        searchInput.addEventListener(
          "input",
          debounce(() => {
            searchTerm = searchInput.value.trim().toLowerCase();
            resetAndRender();
          }, 300)
        );
      }
      const feed = document.createElement("div");
      feed.className = "gallery-feed";
      viewContainer.appendChild(feed);
      const sentinel = document.createElement("div");
      sentinel.style.height = "1px";
      viewContainer.appendChild(sentinel);
      function buildFeedItems() {
        let filteredMedia = searchTerm ? mediaFiles.filter((f) => f.name.toLowerCase().includes(searchTerm)) : mediaFiles;
        filteredMedia = [...filteredMedia];
        switch (sortMode) {
          case "name":
            filteredMedia.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case "newest":
            filteredMedia.sort(
              (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
            );
            break;
          case "oldest":
            filteredMedia.sort(
              (a, b) => new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
            );
            break;
          case "largest":
            filteredMedia.sort((a, b) => b.size - a.size);
            break;
        }
        const lightboxImages = filteredMedia.filter((f) => isImageFile2(f.name)).map((f) => ({ src: getFileUrl(f.path), name: f.name }));
        const items = [];
        if (!searchTerm) {
          for (const dir of dirs) {
            items.push({ type: "dir", entry: dir });
          }
        }
        let imgIdx = 0;
        for (const file of filteredMedia) {
          const isImg = isImageFile2(file.name);
          items.push({
            type: "media",
            entry: file,
            imageIndex: isImg ? imgIdx : -1
          });
          if (isImg) imgIdx++;
        }
        currentLightboxImages = lightboxImages;
        return items;
      }
      let currentLightboxImages = [];
      let currentFeedItems = [];
      let loaded = 0;
      let isRendering = false;
      const renderBatch = () => {
        if (isRendering || loaded >= currentFeedItems.length) return;
        isRendering = true;
        const batch = currentFeedItems.slice(loaded, loaded + BATCH_SIZE);
        for (const item of batch) {
          if (item.type === "dir") {
            const card = renderFolderCard(
              item.entry,
              null,
              0,
              (p) => this.api.navigate(p)
            );
            feed.appendChild(card);
            const previewObserver = new IntersectionObserver(
              (observerEntries) => {
                if (observerEntries[0].isIntersecting) {
                  previewObserver.disconnect();
                  this.api.fetchFiles(item.entry.path).then((children) => {
                    const firstImg = children.find(
                      (c) => !c.isDirectory && isImageFile2(c.name)
                    );
                    const thumb = card.querySelector(".gallery-folder-thumb");
                    if (firstImg && thumb) {
                      thumb.innerHTML = `<img src="${getFileUrl(firstImg.path)}" alt="" loading="lazy" />`;
                    }
                    const badge = card.querySelector(".gallery-folder-badge");
                    if (badge) {
                      badge.textContent = `${children.length} item${children.length !== 1 ? "s" : ""}`;
                    }
                  }).catch(() => {
                  });
                }
              },
              { rootMargin: "200px" }
            );
            previewObserver.observe(card);
          } else {
            feed.appendChild(
              renderMediaItem(
                item.entry,
                currentLightboxImages,
                item.imageIndex,
                (p) => this.api.openFile(p)
              )
            );
          }
        }
        loaded += batch.length;
        viewContainer.appendChild(sentinel);
        isRendering = false;
      };
      const resetAndRender = () => {
        currentFeedItems = buildFeedItems();
        loaded = 0;
        feed.innerHTML = "";
        if (currentFeedItems.length === 0 && searchTerm) {
          feed.innerHTML = `<div class="gallery-no-results">No files match "${escapeHtml(searchTerm)}"</div>`;
          return;
        }
        renderBatch();
      };
      const scrollObserver = new IntersectionObserver(
        (observerEntries) => {
          if (observerEntries[0].isIntersecting && !isRendering && loaded < currentFeedItems.length) {
            renderBatch();
          }
        },
        { rootMargin: "600px" }
      );
      scrollObserver.observe(sentinel);
      currentFeedItems = buildFeedItems();
      renderBatch();
    }
    onPathChange(newPath, api) {
      this.api = api;
      this.renderCurrentPath();
    }
    destroy() {
      this.container.classList.remove("gallery-view");
      this.container.innerHTML = "";
    }
  };

  // view/src/index.ts
  var app = null;
  window.__archiver_register_view?.("gallery-dl-browser", {
    render(container, api) {
      app = new RedditApp(container, api);
    },
    destroy() {
      app?.destroy();
      app = null;
    },
    onPathChange(newPath, api) {
      app?.onPathChange(newPath, api);
    }
  });
})();
