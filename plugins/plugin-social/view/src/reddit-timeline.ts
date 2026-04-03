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

  // Load all post metadata in parallel
  const postPromises = postDirs.map(async (dir) => {
    const [metadata, files] = await Promise.all([
      fetchPostMetadata(api, dir.path),
      api.fetchFiles(dir.path),
    ]);

    if (!metadata) return null;

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

    return {
      path: dir.path,
      metadata,
      images,
      videoFile,
    } as RedditTimelinePost;
  });

  const allPosts = (await Promise.all(postPromises)).filter(
    (p): p is RedditTimelinePost => p !== null
  );

  // Sort state
  let sortMode: "new" | "top" = "new";

  function applySort(): void {
    if (sortMode === "new") {
      allPosts.sort(
        (a, b) =>
          new Date(b.metadata.created).getTime() -
          new Date(a.metadata.created).getTime()
      );
    } else {
      allPosts.sort((a, b) => b.metadata.score - a.metadata.score);
    }
  }

  applySort();

  container.innerHTML = "";

  // -- Profile header with subreddit info + sort toggle --
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
      <span class="rdt-profile-count">${allPosts.length} archived posts</span>
    </div>
    <div class="rdt-profile-controls">
      <select class="rdt-sort-select" aria-label="Sort posts">
        <option value="new">Newest</option>
        <option value="top">Top</option>
      </select>
    </div>
  `;
  container.appendChild(profileHeader);

  const sortSelect = profileHeader.querySelector<HTMLSelectElement>(
    ".rdt-sort-select"
  )!;

  // -- Timeline container --
  const timeline = document.createElement("div");
  timeline.className = "rdt-timeline";
  container.appendChild(timeline);

  let loadedCount = 0;

  function renderBatch(): void {
    const batch = allPosts.slice(loadedCount, loadedCount + BATCH_SIZE);
    for (const post of batch) {
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
    loadedCount += batch.length;

    // Remove existing load more button
    const existingBtn = container.querySelector(".rdt-load-more");
    if (existingBtn) existingBtn.remove();

    // Add load more button if there are more posts
    if (loadedCount < allPosts.length) {
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "rdt-load-more";
      loadMoreBtn.textContent = `Load more (${allPosts.length - loadedCount} remaining)`;
      loadMoreBtn.addEventListener("click", () => {
        renderBatch();
      });
      container.appendChild(loadMoreBtn);
    }
  }

  // Sort toggle handler
  sortSelect.addEventListener("change", () => {
    sortMode = sortSelect.value as "new" | "top";
    applySort();
    loadedCount = 0;
    timeline.innerHTML = "";
    const existingBtn = container.querySelector(".rdt-load-more");
    if (existingBtn) existingBtn.remove();
    renderBatch();
  });

  renderBatch();
}
