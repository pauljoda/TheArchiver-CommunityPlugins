import type { PluginViewAPI, FileEntry, TwitterPostMetadata } from "./types";
import { fetchTwitterPostMetadata } from "./nfo-parser";

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
    if (diffDay > 0) return `${diffDay}d`;
    const diffHour = Math.floor(diffMs / 3600000);
    if (diffHour > 0) return `${diffHour}h`;
    const diffMin = Math.floor(diffMs / 60000);
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

const REPLY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const RETWEET_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
const LIKE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const VERIFIED_ICON = `<svg width="14" height="14" viewBox="0 0 22 22" fill="currentColor"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.587.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.272 1.893.143.634-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.899.584-.274 1.083-.705 1.437-1.245.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`;

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
    overlay.querySelector(".reddit-lightbox-close")!.addEventListener("click", () => { overlay.remove(); document.removeEventListener("keydown", handleKey); });
    overlay.querySelector(".reddit-lightbox-prev")?.addEventListener("click", () => { currentIndex = (currentIndex - 1 + images.length) % images.length; update(); });
    overlay.querySelector(".reddit-lightbox-next")?.addEventListener("click", () => { currentIndex = (currentIndex + 1) % images.length; update(); });
  }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) { overlay.remove(); document.removeEventListener("keydown", handleKey); } });
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", handleKey); }
    else if (e.key === "ArrowLeft") { currentIndex = (currentIndex - 1 + images.length) % images.length; update(); }
    else if (e.key === "ArrowRight") { currentIndex = (currentIndex + 1) % images.length; update(); }
  };
  document.addEventListener("keydown", handleKey);
  update();
  return overlay;
}

interface TimelinePost {
  path: string;
  metadata: TwitterPostMetadata;
  images: FileEntry[];
  videoFile?: FileEntry;
}

function renderTweetText(metadata: TwitterPostMetadata): HTMLElement {
  const el = document.createElement("div");
  el.className = "bluesky-post-text";

  let html = escapeHtml(metadata.text);

  // Replace t.co links
  if (metadata.links) {
    for (const link of metadata.links) {
      html = html.replace(
        new RegExp(`https?://t\\.co/\\w+`),
        `<a class="twitter-link" href="${escapeHtml(link.expanded)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.display)}</a>`
      );
    }
  }

  html = html.replace(
    /@(\w{1,15})/g,
    `<a class="twitter-mention" href="https://x.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>`
  );

  html = html.replace(
    /#(\w+)/g,
    `<span class="twitter-hashtag">#$1</span>`
  );

  html = html.replace(/\n/g, "<br>");
  el.innerHTML = html;
  return el;
}

function renderPostCard(
  post: TimelinePost,
  api: PluginViewAPI,
  profileAvatarUrl: string | null
): HTMLElement {
  const card = document.createElement("div");
  card.className = "bluesky-post-card";

  const meta = post.metadata;
  const avatarUrl = profileAvatarUrl || meta.profileImageUrl;

  // Header
  const header = document.createElement("div");
  header.className = "bluesky-post-header";

  let avatarHtml = "";
  if (avatarUrl) {
    avatarHtml = `<img class="bluesky-avatar" src="${escapeHtml(avatarUrl)}" alt="" />`;
  } else {
    avatarHtml = `<div class="bluesky-avatar bluesky-avatar-placeholder"></div>`;
  }

  const verifiedHtml = meta.verified ? `<span class="twitter-verified-sm">${VERIFIED_ICON}</span>` : "";

  header.innerHTML = `
    ${avatarHtml}
    <div class="bluesky-post-author-info">
      <span class="bluesky-display-name">${escapeHtml(meta.name)} ${verifiedHtml}</span>
      <span class="bluesky-handle">@${escapeHtml(meta.screenName)}</span>
    </div>
    <span class="bluesky-timestamp">${formatRelativeTime(meta.created)}</span>
  `;
  card.appendChild(header);

  // Tweet text
  const textEl = renderTweetText(meta);
  card.appendChild(textEl);

  // Images
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
    // GIF-type videos should autoplay and loop
    if (post.videoFile.name.includes(".gif.")) {
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
    }
    card.appendChild(videoEl);
  }

  // Quote tweet
  if (meta.quoteTweet && meta.quoteTweet.screenName) {
    const quoteCard = document.createElement("div");
    quoteCard.className = "bluesky-quote-card";
    quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml(meta.quoteTweet.name)}</span>
        <span class="bluesky-handle">@${escapeHtml(meta.quoteTweet.screenName)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml(meta.quoteTweet.text).replace(/\n/g, "<br>")}</div>
    `;
    card.appendChild(quoteCard);
  }

  // Engagement
  const engagement = document.createElement("div");
  engagement.className = "bluesky-engagement";
  engagement.innerHTML = `
    <span class="bluesky-metric">${REPLY_ICON} ${formatCount(meta.replyCount)}</span>
    <span class="bluesky-metric bluesky-metric-repost">${RETWEET_ICON} ${formatCount(meta.retweetCount)}</span>
    <span class="bluesky-metric bluesky-metric-like">${LIKE_ICON} ${formatCount(meta.favoriteCount)}</span>
  `;
  card.appendChild(engagement);

  return card;
}

const BATCH_SIZE = 20;

export async function renderTwitterTimeline(
  container: HTMLElement,
  api: PluginViewAPI,
  profilePath: string,
  onNavigate?: (path: string) => void
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading timeline...</div>`;

  const entries = await api.fetchFiles(profilePath);
  const postDirs = entries.filter((e) => e.isDirectory);

  if (postDirs.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">&#9729;</div>
        <span>No tweets archived yet</span>
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

  // Load all post metadata in parallel
  const postPromises = postDirs.map(async (dir) => {
    const [metadata, files] = await Promise.all([
      fetchTwitterPostMetadata(api, dir.path),
      api.fetchFiles(dir.path),
    ]);

    if (!metadata) return null;

    const images = files.filter(
      (f) =>
        !f.isDirectory &&
        isImageFile(f.name) &&
        f.name !== "Video Thumbnail.jpg"
    );

    const videoFile = files.find(
      (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
    );

    return {
      path: dir.path,
      metadata,
      images,
      videoFile,
    } as TimelinePost;
  });

  const allPosts = (await Promise.all(postPromises)).filter(
    (p): p is TimelinePost => p !== null
  );

  // Sort by creation date, newest first
  allPosts.sort((a, b) => {
    const dateA = new Date(a.metadata.created).getTime();
    const dateB = new Date(b.metadata.created).getTime();
    return dateB - dateA;
  });

  container.innerHTML = "";

  // Profile header
  if (allPosts.length > 0) {
    const first = allPosts[0].metadata;
    const profileHeader = document.createElement("div");
    profileHeader.className = "bluesky-profile-header";

    let avatarHtml = "";
    if (profileAvatarUrl) {
      avatarHtml = `<img class="bluesky-profile-avatar" src="${profileAvatarUrl}" alt="" />`;
    }

    const verifiedHtml = first.verified ? `<span class="twitter-verified">${VERIFIED_ICON}</span>` : "";

    profileHeader.innerHTML = `
      ${avatarHtml}
      <div class="bluesky-profile-info">
        <h2 class="bluesky-profile-name">${escapeHtml(first.name)} ${verifiedHtml}</h2>
        <span class="bluesky-profile-handle">@${escapeHtml(first.screenName)}</span>
        <span class="bluesky-profile-count">${allPosts.length} archived tweets</span>
      </div>
    `;
    container.appendChild(profileHeader);
  }

  const timeline = document.createElement("div");
  timeline.className = "bluesky-timeline";
  container.appendChild(timeline);

  let loadedCount = 0;

  function renderBatch(): void {
    const batch = allPosts.slice(loadedCount, loadedCount + BATCH_SIZE);
    for (const post of batch) {
      const card = renderPostCard(post, api, profileAvatarUrl);
      if (onNavigate) {
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          if (target.closest("a") || target.closest(".bluesky-post-image")) return;
          onNavigate(post.path);
        });
      }
      timeline.appendChild(card);
    }
    loadedCount += batch.length;

    const existingBtn = container.querySelector(".bluesky-load-more");
    if (existingBtn) existingBtn.remove();

    if (loadedCount < allPosts.length) {
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "bluesky-load-more";
      loadMoreBtn.textContent = `Load more (${allPosts.length - loadedCount} remaining)`;
      loadMoreBtn.addEventListener("click", () => {
        renderBatch();
      });
      container.appendChild(loadMoreBtn);
    }
  }

  renderBatch();
}
