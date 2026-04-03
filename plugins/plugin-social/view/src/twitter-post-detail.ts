import type { PluginViewAPI, TwitterPostMetadata } from "./types";
import { fetchTwitterPostMetadata } from "./nfo-parser";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
const VERIFIED_ICON = `<svg width="16" height="16" viewBox="0 0 22 22" fill="currentColor"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.587.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.272 1.893.143.634-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.899.584-.274 1.083-.705 1.437-1.245.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`;

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

/**
 * Render tweet text with inline links, mentions, and hashtags.
 */
function renderTwitterRichText(metadata: TwitterPostMetadata): HTMLElement {
  const el = document.createElement("div");
  let html = escapeHtml(metadata.text);

  // Replace t.co links with display URLs
  if (metadata.links) {
    for (const link of metadata.links) {
      const escapedDisplay = escapeHtml(link.display);
      const escapedExpanded = escapeHtml(link.expanded);
      // Match the t.co URL pattern in the text
      html = html.replace(
        new RegExp(`https?://t\\.co/\\w+`),
        `<a class="twitter-link" href="${escapedExpanded}" target="_blank" rel="noopener noreferrer">${escapedDisplay}</a>`
      );
    }
  }

  // Highlight @mentions
  html = html.replace(
    /@(\w{1,15})/g,
    `<a class="twitter-mention" href="https://x.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>`
  );

  // Highlight #hashtags
  html = html.replace(
    /#(\w+)/g,
    `<span class="twitter-hashtag">#$1</span>`
  );

  // Preserve newlines
  html = html.replace(/\n/g, "<br>");

  el.innerHTML = html;
  return el;
}

export async function renderTwitterPostDetail(
  container: HTMLElement,
  api: PluginViewAPI,
  postPath: string
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading tweet...</div>`;

  const [files, metadata] = await Promise.all([
    api.fetchFiles(postPath),
    fetchTwitterPostMetadata(api, postPath),
  ]);

  if (!metadata) {
    container.innerHTML = `<div class="reddit-empty"><span>Could not load tweet metadata</span></div>`;
    return;
  }

  const images = files.filter(
    (f) =>
      !f.isDirectory &&
      isImageFile(f.name) &&
      f.name !== "Video Thumbnail.jpg"
  );
  const videoFile = files.find(
    (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
  );

  // Check for profile avatar in parent directory
  const parentPath = postPath.split("/").slice(0, -1).join("/");
  let profileAvatarUrl: string | null = null;
  try {
    const parentFiles = await api.fetchFiles(parentPath);
    const iconFile = parentFiles.find(
      (f) => !f.isDirectory && (f.name === "icon.jpg" || f.name === "icon.png" || f.name === "icon.webp")
    );
    if (iconFile) {
      profileAvatarUrl = `/api/files/download?path=${encodeURIComponent(iconFile.path)}`;
    }
  } catch {
    // ignore
  }

  const avatarUrl = profileAvatarUrl || metadata.profileImageUrl;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "twitter-detail";

  // Post header
  const header = document.createElement("div");
  header.className = "twitter-detail-header";

  let avatarHtml = "";
  if (avatarUrl) {
    avatarHtml = `<img class="twitter-detail-avatar" src="${escapeHtml(avatarUrl)}" alt="" />`;
  }

  const verifiedHtml = metadata.verified ? `<span class="twitter-verified">${VERIFIED_ICON}</span>` : "";

  header.innerHTML = `
    ${avatarHtml}
    <div class="twitter-detail-author">
      <span class="twitter-display-name">${escapeHtml(metadata.name)} ${verifiedHtml}</span>
      <span class="twitter-handle">@${escapeHtml(metadata.screenName)}</span>
    </div>
    ${metadata.url ? `<a class="social-open-original" href="${escapeHtml(metadata.url)}" target="_blank" rel="noopener noreferrer" title="Open original post" style="margin-left:auto;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      Original
    </a>` : ""}
  `;
  wrapper.appendChild(header);

  // Reply indicator
  if (metadata.replyTo && metadata.replyTo.screenName) {
    const replyIndicator = document.createElement("div");
    replyIndicator.className = "twitter-reply-indicator";
    replyIndicator.innerHTML = `Replying to <a class="twitter-mention" href="https://x.com/${escapeHtml(metadata.replyTo.screenName)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(metadata.replyTo.screenName)}</a>`;
    wrapper.appendChild(replyIndicator);
  }

  // Tweet text
  const textEl = renderTwitterRichText(metadata);
  textEl.className = "twitter-detail-text";
  wrapper.appendChild(textEl);

  // Images
  if (images.length > 0) {
    const imageGrid = document.createElement("div");
    const count = images.length;
    imageGrid.className = `bluesky-post-images bluesky-images-${Math.min(count, 4)}`;

    const imageUrls = images.map((img) => ({
      src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
      name: img.name,
    }));

    images.forEach((img, i) => {
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
    wrapper.appendChild(imageGrid);
  }

  // Video
  if (videoFile) {
    const videoEl = document.createElement("video");
    videoEl.className = "twitter-video";
    videoEl.src = `/api/files/download?path=${encodeURIComponent(videoFile.path)}`;
    videoEl.controls = true;
    videoEl.preload = "metadata";
    // GIF-type videos should autoplay and loop like actual GIFs
    if (videoFile.name.includes(".gif.")) {
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
    }
    wrapper.appendChild(videoEl);
  }

  // Quote tweet card
  if (metadata.quoteTweet && metadata.quoteTweet.screenName) {
    const quoteCard = document.createElement("div");
    quoteCard.className = "bluesky-quote-card";
    quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml(metadata.quoteTweet.name)}</span>
        <span class="bluesky-handle">@${escapeHtml(metadata.quoteTweet.screenName)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml(metadata.quoteTweet.text).replace(/\n/g, "<br>")}</div>
    `;
    wrapper.appendChild(quoteCard);
  }

  // Engagement + timestamp
  const stats = document.createElement("div");
  stats.className = "twitter-detail-stats";
  stats.innerHTML = `
    <span class="bluesky-detail-date">${formatDate(metadata.created)}</span>
    <div class="bluesky-detail-counts">
      <span class="bluesky-detail-count">${REPLY_ICON} <strong>${formatCount(metadata.replyCount)}</strong> replies</span>
      <span class="bluesky-detail-count">${RETWEET_ICON} <strong>${formatCount(metadata.retweetCount)}</strong> retweets</span>
      <span class="bluesky-detail-count">${LIKE_ICON} <strong>${formatCount(metadata.favoriteCount)}</strong> likes</span>
    </div>
  `;
  wrapper.appendChild(stats);

  container.appendChild(wrapper);
}
