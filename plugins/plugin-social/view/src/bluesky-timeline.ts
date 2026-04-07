import type { PluginViewAPI, FileEntry, BlueskyPostMetadata } from "./types";
import { fetchBlueskyPostMetadata } from "./nfo-parser";
import { renderBlueskyRichText } from "./bluesky-richtext";
import { LazyFeedCard } from "./lazy-feed-card";
import { chunkArray, mapLimit, nextFrame } from "./async-utils";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
    if (diffDay > 0) return `${diffDay}d`;
    if (diffHour > 0) return `${diffHour}h`;
    if (diffMin > 0) return `${diffMin}m`;
    return "now";
  } catch {
    return dateStr;
  }
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
}

// SVG icons for engagement metrics
const REPLY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const REPOST_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
const LIKE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

function createLightbox(
  images: { src: string; name: string }[],
  startIndex: number
): HTMLElement {
  let currentIndex = startIndex;

  const overlay = document.createElement("div");
  overlay.className = "reddit-lightbox";

  function update(): void {
    overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;

    overlay.querySelector(".reddit-lightbox-close")!.addEventListener("click", () => {
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
    });
    overlay.querySelector(".reddit-lightbox-prev")?.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      update();
    });
    overlay.querySelector(".reddit-lightbox-next")?.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % images.length;
      update();
    });
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
    }
  });

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
    } else if (e.key === "ArrowLeft") {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      update();
    } else if (e.key === "ArrowRight") {
      currentIndex = (currentIndex + 1) % images.length;
      update();
    }
  };
  document.addEventListener("keydown", handleKey);

  update();
  return overlay;
}

interface TimelinePost {
  path: string;
  metadata: BlueskyPostMetadata;
  images: FileEntry[];
  videoFile?: FileEntry;
  thumbnailFile?: FileEntry;
}

function renderPostCard(
  post: TimelinePost,
  api: PluginViewAPI,
  profileAvatarUrl: string | null
): HTMLElement {
  const card = document.createElement("div");
  card.className = "bluesky-post-card";

  const meta = post.metadata;

  // Use the profile-level avatar or the per-post one
  const avatarUrl = profileAvatarUrl || meta.avatarUrl;

  // Header: avatar + name + handle + timestamp
  const header = document.createElement("div");
  header.className = "bluesky-post-header";

  let avatarHtml = "";
  if (avatarUrl) {
    avatarHtml = `<img class="bluesky-avatar" src="${escapeHtml(avatarUrl)}" alt="" />`;
  } else {
    avatarHtml = `<div class="bluesky-avatar bluesky-avatar-placeholder"></div>`;
  }

  const displayName = meta.displayName || meta.authorHandle;
  header.innerHTML = `
    ${avatarHtml}
    <div class="bluesky-post-author-info">
      <span class="bluesky-display-name">${escapeHtml(displayName)}</span>
      <span class="bluesky-handle">@${escapeHtml(meta.authorHandle)}</span>
    </div>
    <span class="bluesky-timestamp">${formatRelativeTime(meta.created)}</span>
  `;
  card.appendChild(header);

  // Post text with rich text
  const textEl = renderBlueskyRichText(meta.text, meta.facets);
  card.appendChild(textEl);

  // Embedded images
  if (post.images.length > 0) {
    const imageGrid = document.createElement("div");
    const count = post.images.length;
    imageGrid.className = `bluesky-post-images bluesky-images-${Math.min(count, 4)}`;

    const imageUrls = post.images.map((img) => ({
      src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
      name: img.name,
    }));

    post.images.forEach((img, i) => {
      const imgEl = document.createElement("img");
      imgEl.className = "bluesky-post-image";
      imgEl.src = imageUrls[i].src;
      imgEl.alt = img.name;
      imgEl.loading = "lazy";
      imgEl.addEventListener("click", () => {
        document.body.appendChild(createLightbox(imageUrls, i));
      });
      imageGrid.appendChild(imgEl);
    });

    card.appendChild(imageGrid);
  }

  // Video
  if (post.videoFile) {
    const videoEl = document.createElement("video");
    videoEl.className = "twitter-video";
    videoEl.src = `/api/files/download?path=${encodeURIComponent(post.videoFile.path)}`;
    videoEl.controls = true;
    videoEl.preload = "metadata";
    videoEl.style.cssText = "width:100%;max-height:500px;border-radius:0.75rem;margin-top:0.75rem;background:var(--muted);";
    if (post.videoFile.name.includes(".gif.")) {
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
    }
    card.appendChild(videoEl);
  }

  // External link card
  if (meta.externalLink && meta.externalLink.uri) {
    const linkCard = document.createElement("a");
    linkCard.className = "bluesky-external-card";
    linkCard.href = meta.externalLink.uri;
    linkCard.target = "_blank";
    linkCard.rel = "noopener noreferrer";

    let thumbHtml = "";
    if (post.thumbnailFile) {
      const thumbSrc = `/api/files/download?path=${encodeURIComponent(post.thumbnailFile.path)}`;
      thumbHtml = `<img class="bluesky-external-thumb" src="${thumbSrc}" alt="" />`;
    } else if (meta.externalLink.thumb) {
      thumbHtml = `<img class="bluesky-external-thumb" src="${escapeHtml(meta.externalLink.thumb)}" alt="" />`;
    }

    let domain = "";
    try {
      domain = new URL(meta.externalLink.uri).hostname;
    } catch {
      domain = meta.externalLink.uri;
    }

    linkCard.innerHTML = `
      ${thumbHtml}
      <div class="bluesky-external-info">
        <span class="bluesky-external-domain">${escapeHtml(domain)}</span>
        <span class="bluesky-external-title">${escapeHtml(meta.externalLink.title)}</span>
        ${meta.externalLink.description ? `<span class="bluesky-external-desc">${escapeHtml(meta.externalLink.description)}</span>` : ""}
      </div>
    `;
    card.appendChild(linkCard);
  }

  // Quote post card
  if (meta.quotePost && meta.quotePost.authorHandle) {
    const quoteCard = document.createElement("div");
    quoteCard.className = "bluesky-quote-card";

    const quoteDisplayName = meta.quotePost.displayName || meta.quotePost.authorHandle;
    quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml(quoteDisplayName)}</span>
        <span class="bluesky-handle">@${escapeHtml(meta.quotePost.authorHandle)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml(meta.quotePost.text).replace(/\n/g, "<br>")}</div>
    `;
    card.appendChild(quoteCard);
  }

  // Engagement metrics
  const engagement = document.createElement("div");
  engagement.className = "bluesky-engagement";
  engagement.innerHTML = `
    <span class="bluesky-metric">${REPLY_ICON} ${formatCount(meta.replyCount)}</span>
    <span class="bluesky-metric bluesky-metric-repost">${REPOST_ICON} ${formatCount(meta.repostCount)}</span>
    <span class="bluesky-metric bluesky-metric-like">${LIKE_ICON} ${formatCount(meta.likeCount)}</span>
  `;
  card.appendChild(engagement);

  return card;
}

const BATCH_SIZE = 20;
const INITIAL_INDEX_BATCH = 24;
const INDEX_BATCH_SIZE = 48;
const INDEX_CONCURRENCY = 8;

interface PostStub {
  path: string;
  metadata: BlueskyPostMetadata;
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

async function enrichBlueskyPost(
  api: PluginViewAPI,
  stub: PostStub
): Promise<TimelinePost> {
  const files = await api.fetchFiles(stub.path);

  const images = files.filter(
    (f) =>
      !f.isDirectory &&
      isImageFile(f.name) &&
      f.name !== "Video Thumbnail.jpg" &&
      f.name !== "Thumbnail.jpg"
  );

  const videoFile = files.find(
    (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
  );

  const thumbnailFile = files.find(
    (f) => !f.isDirectory && f.name === "Thumbnail.jpg"
  );

  return { path: stub.path, metadata: stub.metadata, images, videoFile, thumbnailFile };
}

function matchesBlueskySearch(stub: PostStub, term: string): boolean {
  const m = stub.metadata;
  return (
    m.text.toLowerCase().includes(term) ||
    m.authorHandle.toLowerCase().includes(term) ||
    (m.displayName || "").toLowerCase().includes(term)
  );
}

export async function renderBlueskyTimeline(
  container: HTMLElement,
  api: PluginViewAPI,
  profilePath: string,
  onNavigate?: (path: string) => void
): Promise<() => void> {
  container.innerHTML = `<div class="reddit-loading">Loading timeline...</div>`;

  const entries = await api.fetchFiles(profilePath);
  const postDirs = entries.filter((e) => e.isDirectory);

  if (postDirs.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">&#9729;</div>
        <span>No posts archived yet</span>
      </div>
    `;
    return;
  }

  // Check for profile avatar
  const iconFiles = entries.filter(
    (e) => !e.isDirectory && (e.name === "icon.jpg" || e.name === "icon.png" || e.name === "icon.webp")
  );
  const profileAvatarUrl = iconFiles.length > 0
    ? `/api/files/download?path=${encodeURIComponent(iconFiles[0].path)}`
    : null;

  const orderedPostDirs = [...postDirs].sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  async function loadStubBatch(dirs: FileEntry[]): Promise<PostStub[]> {
    const stubs = await mapLimit(dirs, INDEX_CONCURRENCY, async (dir) => {
      const metadata = await fetchBlueskyPostMetadata(api, dir.path);
      return metadata ? ({ path: dir.path, metadata } as PostStub) : null;
    });

    return stubs.filter((stub): stub is PostStub => stub !== null);
  }

  const indexedStubs = await loadStubBatch(
    orderedPostDirs.slice(0, INITIAL_INDEX_BATCH)
  );

  // Sort/search state
  let sortMode: "new" | "old" = "new";
  let searchTerm = "";
  let indexingStatus = `Indexed ${indexedStubs.length}/${postDirs.length}`;
  let indexPromise: Promise<void> | null = null;
  let isIndexComplete = indexedStubs.length >= orderedPostDirs.length;

  function applySortAndFilter(): PostStub[] {
    const source = indexedStubs;
    let list = searchTerm
      ? source.filter((s) => matchesBlueskySearch(s, searchTerm))
      : [...source];

    const dir = sortMode === "new" ? -1 : 1;
    list.sort(
      (a, b) =>
        dir *
        (new Date(a.metadata.created).getTime() -
          new Date(b.metadata.created).getTime())
    );
    return list;
  }

  let filtered = applySortAndFilter();
  let renderedCount = 0;
  let isLoading = false;
  let scrollObserver: IntersectionObserver | null = null;
  const lazyCards: LazyFeedCard[] = [];
  let isDisposed = false;

  container.innerHTML = "";

  // Profile header
  if (indexedStubs.length > 0) {
    const first = indexedStubs[0].metadata;
    const profileHeader = document.createElement("div");
    profileHeader.className = "bluesky-profile-header";

    let avatarHtml = "";
    if (profileAvatarUrl) {
      avatarHtml = `<img class="bluesky-profile-avatar" src="${profileAvatarUrl}" alt="" />`;
    }

    profileHeader.innerHTML = `
      ${avatarHtml}
      <div class="bluesky-profile-info">
        <h2 class="bluesky-profile-name">${escapeHtml(first.displayName || first.authorHandle)}</h2>
        <span class="bluesky-profile-handle">@${escapeHtml(first.authorHandle)}</span>
        <span class="bluesky-profile-count">${postDirs.length} archived posts</span>
      </div>
    `;
    container.appendChild(profileHeader);
  }

  // Controls bar: search + sort
  const controls = document.createElement("div");
  controls.className = "bluesky-controls";
  controls.innerHTML = `
    <input type="text" class="timeline-search" placeholder="Search posts..." aria-label="Search posts" />
    <select class="timeline-sort" aria-label="Sort posts">
      <option value="new">Newest</option>
      <option value="old">Oldest</option>
    </select>
    <span class="timeline-status">${escapeHtml(indexingStatus)}</span>
  `;
  container.appendChild(controls);

  const searchInput = controls.querySelector<HTMLInputElement>(".timeline-search")!;
  const sortSelect = controls.querySelector<HTMLSelectElement>(".timeline-sort")!;
  const statusEl = controls.querySelector<HTMLElement>(".timeline-status")!;

  const timeline = document.createElement("div");
  timeline.className = "bluesky-timeline";
  container.appendChild(timeline);

  const sentinel = document.createElement("div");
  sentinel.className = "timeline-load-sentinel";
  container.appendChild(sentinel);

  function clearRenderedCards(): void {
    while (lazyCards.length > 0) {
      lazyCards.pop()?.destroy();
    }
  }

  function updateIndexStatus(status?: string): void {
    if (isDisposed) {
      return;
    }
    indexingStatus = status ?? `Indexed ${indexedStubs.length}/${postDirs.length}`;
    statusEl.textContent = isIndexComplete ? "" : indexingStatus;
  }

  function appendPostCard(post: TimelinePost, index: number): void {
    const lazyCard = new LazyFeedCard({
      estimatedHeight: 320,
      initiallyRendered: index < 8,
      renderMargin: "500px",
      render: () => {
        const card = renderPostCard(post, api, profileAvatarUrl);
        if (onNavigate) {
          card.style.cursor = "pointer";
          card.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            if (target.closest("a") || target.closest(".bluesky-post-image")) {
              return;
            }
            onNavigate(post.path);
          });
        }
        return card;
      },
    });
    lazyCard.mount(timeline);
    lazyCards.push(lazyCard);
  }

  async function renderNextBatch(): Promise<void> {
    if (isDisposed) {
      return;
    }

    if (isLoading || renderedCount >= filtered.length) {
      return;
    }

    isLoading = true;
    const batch = filtered.slice(renderedCount, renderedCount + BATCH_SIZE);
    const enriched = await Promise.all(
      batch.map((stub) => enrichBlueskyPost(api, stub))
    );
    const startIndex = renderedCount;

    for (let index = 0; index < enriched.length; index += 1) {
      appendPostCard(enriched[index], startIndex + index);
    }

    renderedCount += enriched.length;
    isLoading = false;
  }

  async function resetAndRender(): Promise<void> {
    if (isDisposed) {
      return;
    }

    filtered = applySortAndFilter();
    renderedCount = 0;
    isLoading = false;
    clearRenderedCards();
    timeline.innerHTML = "";

    if (filtered.length === 0 && searchTerm) {
      timeline.innerHTML = `<div class="timeline-no-results">No posts match "${escapeHtml(searchTerm)}"</div>`;
      return;
    }

    await renderNextBatch();
  }

  async function ensureIndexedForCurrentFilters(): Promise<void> {
    const needsFullIndex = Boolean(searchTerm) || sortMode === "old";
    if (!needsFullIndex || isIndexComplete || !indexPromise) {
      return;
    }

    updateIndexStatus("Finishing index…");
    await indexPromise;
    updateIndexStatus();
  }

  indexPromise = (async () => {
    const remainingBatches = chunkArray(
      orderedPostDirs.slice(INITIAL_INDEX_BATCH),
      INDEX_BATCH_SIZE
    );

    for (const batch of remainingBatches) {
      const loaded = await loadStubBatch(batch);
      indexedStubs.push(...loaded);
      updateIndexStatus();

      if (!searchTerm && sortMode === "new") {
        filtered = applySortAndFilter();
        await nextFrame();
        void renderNextBatch();
      }
    }

    isIndexComplete = true;
    updateIndexStatus();
  })();

  scrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !isLoading && renderedCount < filtered.length) {
        void renderNextBatch();
      }
    },
    { rootMargin: "600px" }
  );
  scrollObserver.observe(sentinel);

  // Sort handler
  const runSortChange = async () => {
    sortMode = sortSelect.value as "new" | "old";
    await ensureIndexedForCurrentFilters();
    await resetAndRender();
  };
  const handleSortChange = () => {
    void runSortChange();
  };
  sortSelect.addEventListener("change", handleSortChange);

  // Search handler (debounced)
  const handleSearchInput = debounce(() => {
    searchTerm = searchInput.value.trim().toLowerCase();
    void (async () => {
      await ensureIndexedForCurrentFilters();
      await resetAndRender();
    })();
  }, 300);
  searchInput.addEventListener(
    "input",
    handleSearchInput
  );

  // Initial render
  await resetAndRender();

  return () => {
    isDisposed = true;
    scrollObserver?.disconnect();
    clearRenderedCards();
    sortSelect.removeEventListener("change", handleSortChange);
    searchInput.removeEventListener("input", handleSearchInput);
  };
}
