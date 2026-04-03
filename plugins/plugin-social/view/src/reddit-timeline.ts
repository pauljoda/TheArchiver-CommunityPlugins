import type { PluginViewAPI, FileEntry, PostMetadata } from "./types";
import { fetchPostMetadata } from "./nfo-parser";

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
    return "now";
  } catch {
    return dateStr;
  }
}

function formatScore(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
}

// SVG icons matching Reddit's UI
const UPVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l-7 7h4v7h6v-7h4L10 3z"/></svg>`;
const DOWNVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17l7-7h-4V3H7v7H3l7 7z"/></svg>`;
const COMMENT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const SHARE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
const AWARD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;

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

interface RedditTimelinePost {
  path: string;
  metadata: PostMetadata;
  images: FileEntry[];
  videoFile?: FileEntry;
}

function buildMediaBlock(
  post: RedditTimelinePost
): HTMLElement | null {
  const meta = post.metadata;

  // Video file on disk
  if (post.videoFile) {
    const wrap = document.createElement("div");
    wrap.className = "rdt-media-wrap";
    const video = document.createElement("video");
    video.className = "rdt-media-video";
    video.src = `/api/files/download?path=${encodeURIComponent(post.videoFile.path)}`;
    video.controls = true;
    video.preload = "metadata";
    wrap.appendChild(video);
    return wrap;
  }

  // Images (incl. gallery)
  if (post.images.length > 0) {
    const wrap = document.createElement("div");
    wrap.className =
      "rdt-media-wrap" + (post.images.length > 1 ? " rdt-media-gallery" : "");

    const imageUrls = post.images.map((img) => ({
      src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
      name: img.name,
    }));

    const imgEl = document.createElement("img");
    imgEl.className = "rdt-media-img";
    imgEl.src = imageUrls[0].src;
    imgEl.alt = post.images[0].name;
    imgEl.loading = "lazy";
    imgEl.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.appendChild(createLightbox(imageUrls, 0));
    });
    wrap.appendChild(imgEl);

    if (post.images.length > 1) {
      const badge = document.createElement("div");
      badge.className = "rdt-gallery-more";
      badge.textContent = `+${post.images.length - 1} more`;
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        document.body.appendChild(createLightbox(imageUrls, 0));
      });
      wrap.appendChild(badge);
    }
    return wrap;
  }

  // Selftext preview
  if (meta.selftext && meta.selftext.trim().length > 0) {
    const preview = document.createElement("div");
    preview.className = "rdt-selftext-preview";
    preview.textContent = meta.selftext.slice(0, 600);
    return preview;
  }

  // External link preview
  const isSelf =
    !meta.domain ||
    meta.domain.startsWith("self.") ||
    meta.domain === "reddit.com";
  if (!isSelf && meta.domain && !meta.isVideo) {
    const preview = document.createElement("div");
    preview.className = "rdt-link-preview";
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(meta.domain)}&sz=32`;
    preview.innerHTML = `
      <img class="rdt-link-favicon" src="${faviconUrl}" alt="" />
      <span class="rdt-link-domain">${escapeHtml(meta.domain)}</span>
    `;
    return preview;
  }

  return null;
}

function renderPostCard(
  post: RedditTimelinePost,
  api: PluginViewAPI,
  subredditAvatarUrl: string | null
): HTMLElement {
  const card = document.createElement("div");
  card.className = "rdt-post-card";
  const meta = post.metadata;

  // -- Header: subreddit icon + r/subreddit · author · time --
  const header = document.createElement("div");
  header.className = "rdt-post-header";

  let avatarHtml = "";
  if (subredditAvatarUrl) {
    avatarHtml = `<img class="rdt-subreddit-icon" src="${escapeHtml(subredditAvatarUrl)}" alt="" />`;
  } else {
    avatarHtml = `<div class="rdt-subreddit-icon rdt-subreddit-icon-placeholder"></div>`;
  }

  header.innerHTML = `
    ${avatarHtml}
    <span class="rdt-subreddit">r/${escapeHtml(meta.subreddit)}</span>
    <span class="rdt-meta-sep">&middot;</span>
    <span class="rdt-timestamp">${formatRelativeTime(meta.created)}</span>
  `;
  card.appendChild(header);

  // -- Badges row (NSFW, Spoiler, Flair) --
  const hasFlair = meta.flair && meta.flair.trim().length > 0;
  const isNsfw = meta.over18 === true;
  const isSpoiler = meta.spoiler === true;
  if (isNsfw || isSpoiler || hasFlair) {
    const badges = document.createElement("div");
    badges.className = "rdt-badges";
    if (isNsfw) {
      badges.innerHTML += `<span class="rdt-badge rdt-badge-nsfw">NSFW</span>`;
    }
    if (isSpoiler) {
      badges.innerHTML += `<span class="rdt-badge rdt-badge-spoiler">Spoiler</span>`;
    }
    if (hasFlair) {
      badges.innerHTML += `<span class="rdt-flair">${escapeHtml(meta.flair!)}</span>`;
    }
    card.appendChild(badges);
  }

  // -- Title --
  const titleEl = document.createElement("h3");
  titleEl.className = "rdt-post-title";
  titleEl.textContent = meta.title;
  card.appendChild(titleEl);

  // -- Media / content block --
  const mediaEl = buildMediaBlock(post);
  if (mediaEl) card.appendChild(mediaEl);

  // -- Engagement bar: upvote score, comments, award, share --
  const scoreClass =
    meta.score > 0
      ? "rdt-score-up"
      : meta.score < 0
        ? "rdt-score-down"
        : "rdt-score-neutral";
  const commentCount = meta.numComments ?? 0;

  const engagement = document.createElement("div");
  engagement.className = "rdt-engagement";
  engagement.innerHTML = `
    <span class="rdt-engage-btn rdt-engage-votes">
      <span class="rdt-vote-up">${UPVOTE_ICON}</span>
      <span class="rdt-vote-score ${scoreClass}">${formatScore(meta.score)}</span>
      <span class="rdt-vote-down">${DOWNVOTE_ICON}</span>
    </span>
    <span class="rdt-engage-btn rdt-engage-comments">
      ${COMMENT_ICON}
      <span>${formatScore(commentCount)}</span>
    </span>
    <span class="rdt-engage-btn">
      ${AWARD_ICON}
    </span>
    <span class="rdt-engage-btn">
      ${SHARE_ICON}
      <span>Share</span>
    </span>
  `;
  card.appendChild(engagement);

  return card;
}

const BATCH_SIZE = 20;

interface PostStub {
  path: string;
  metadata: PostMetadata;
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

async function enrichPost(
  api: PluginViewAPI,
  stub: PostStub
): Promise<RedditTimelinePost> {
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

  return { path: stub.path, metadata: stub.metadata, images, videoFile };
}

function matchesRedditSearch(stub: PostStub, term: string): boolean {
  const m = stub.metadata;
  return (
    m.title.toLowerCase().includes(term) ||
    m.author.toLowerCase().includes(term) ||
    (m.flair || "").toLowerCase().includes(term) ||
    (m.selftext || "").toLowerCase().includes(term)
  );
}

export async function renderRedditTimeline(
  container: HTMLElement,
  api: PluginViewAPI,
  subredditPath: string,
  onNavigate?: (path: string) => void
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading timeline...</div>`;

  const entries = await api.fetchFiles(subredditPath);
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

  // Check for subreddit avatar icon
  const iconFiles = entries.filter(
    (e) =>
      !e.isDirectory &&
      (e.name === "icon.jpg" ||
        e.name === "icon.png" ||
        e.name === "icon.webp")
  );
  const subredditAvatarUrl =
    iconFiles.length > 0
      ? `/api/files/download?path=${encodeURIComponent(iconFiles[0].path)}`
      : null;

  // Load all metadata upfront (lightweight — just Post.nfo parsing)
  const stubs = (
    await Promise.all(
      postDirs.map(async (dir) => {
        const metadata = await fetchPostMetadata(api, dir.path);
        return metadata ? ({ path: dir.path, metadata } as PostStub) : null;
      })
    )
  ).filter((s): s is PostStub => s !== null);

  // Sort state
  let sortMode: "new" | "top" = "new";
  let searchTerm = "";

  function applySortAndFilter(): PostStub[] {
    let list = searchTerm
      ? stubs.filter((s) => matchesRedditSearch(s, searchTerm))
      : stubs;

    // Need a copy to avoid mutating the original when filtering
    list = [...list];

    if (sortMode === "new") {
      list.sort(
        (a, b) =>
          new Date(b.metadata.created).getTime() -
          new Date(a.metadata.created).getTime()
      );
    } else {
      list.sort((a, b) => b.metadata.score - a.metadata.score);
    }
    return list;
  }

  let filtered = applySortAndFilter();
  let renderedCount = 0;
  let isLoading = false;

  container.innerHTML = "";

  // -- Profile header --
  const subredditName = subredditPath.split("/").pop() || "";
  const profileHeader = document.createElement("div");
  profileHeader.className = "rdt-profile-header";

  let avatarHtml = "";
  if (subredditAvatarUrl) {
    avatarHtml = `<img class="rdt-profile-avatar" src="${subredditAvatarUrl}" alt="" />`;
  }

  profileHeader.innerHTML = `
    ${avatarHtml}
    <div class="rdt-profile-info">
      <h2 class="rdt-profile-name">r/${escapeHtml(subredditName)}</h2>
      <span class="rdt-profile-count">${stubs.length} archived posts</span>
    </div>
  `;
  container.appendChild(profileHeader);

  // -- Controls bar: search + sort --
  const controls = document.createElement("div");
  controls.className = "rdt-controls";
  controls.innerHTML = `
    <input type="text" class="timeline-search" placeholder="Search posts..." aria-label="Search posts" />
    <select class="rdt-sort-select" aria-label="Sort posts">
      <option value="new">Newest</option>
      <option value="top">Top</option>
    </select>
  `;
  container.appendChild(controls);

  const searchInput = controls.querySelector<HTMLInputElement>(".timeline-search")!;
  const sortSelect = controls.querySelector<HTMLSelectElement>(".rdt-sort-select")!;

  // -- Timeline container --
  const timeline = document.createElement("div");
  timeline.className = "rdt-timeline";
  container.appendChild(timeline);

  // -- Sentinel for infinite scroll --
  const sentinel = document.createElement("div");
  sentinel.style.height = "1px";
  container.appendChild(sentinel);

  function appendPostCard(post: RedditTimelinePost): void {
    const card = renderPostCard(post, api, subredditAvatarUrl);
    if (onNavigate) {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest(".rdt-media-wrap") ||
          target.closest("a") ||
          target.closest("video")
        )
          return;
        onNavigate(post.path);
      });
    }
    timeline.appendChild(card);
  }

  async function renderNextBatch(): Promise<void> {
    if (isLoading || renderedCount >= filtered.length) return;
    isLoading = true;

    const batch = filtered.slice(renderedCount, renderedCount + BATCH_SIZE);
    const enriched = await Promise.all(
      batch.map((stub) => enrichPost(api, stub))
    );

    for (const post of enriched) appendPostCard(post);
    renderedCount += enriched.length;

    isLoading = false;
  }

  async function resetAndRender(): Promise<void> {
    filtered = applySortAndFilter();
    renderedCount = 0;
    timeline.innerHTML = "";

    if (filtered.length === 0 && searchTerm) {
      timeline.innerHTML = `<div class="timeline-no-results">No posts match "${escapeHtml(searchTerm)}"</div>`;
      return;
    }

    await renderNextBatch();
  }

  // IntersectionObserver for infinite scroll
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isLoading && renderedCount < filtered.length) {
        renderNextBatch();
      }
    },
    { rootMargin: "600px" }
  );
  observer.observe(sentinel);

  // Sort handler
  sortSelect.addEventListener("change", () => {
    sortMode = sortSelect.value as "new" | "top";
    resetAndRender();
  });

  // Search handler (debounced)
  searchInput.addEventListener(
    "input",
    debounce(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      resetAndRender();
    }, 300)
  );

  // Initial render
  await renderNextBatch();
}
