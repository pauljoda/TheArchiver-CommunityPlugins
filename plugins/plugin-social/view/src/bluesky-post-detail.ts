import type { PluginViewAPI, BlueskyPostMetadata, BlueskyReply } from "./types";
import { fetchBlueskyPostMetadata } from "./nfo-parser";
import { renderBlueskyRichText } from "./bluesky-richtext";
import { isImageFile } from "../../../_shared/view/media-player";

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

async function parseReplies(
  api: PluginViewAPI,
  postPath: string
): Promise<BlueskyReply[]> {
  try {
    const res = await api.fetchFile(`${postPath}/Replies.json`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Convert BlueskyReply facets (raw AT Protocol format) to the format
 * expected by renderBlueskyRichText.
 */
function convertReplyFacets(
  facets?: BlueskyReply["facets"]
): BlueskyPostMetadata["facets"] {
  if (!facets || facets.length === 0) return undefined;

  const result: NonNullable<BlueskyPostMetadata["facets"]> = [];
  for (const facet of facets) {
    for (const feature of facet.features) {
      if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
        result.push({ type: "link", byteStart: facet.index.byteStart, byteEnd: facet.index.byteEnd, uri: feature.uri });
      } else if (feature.$type === "app.bsky.richtext.facet#mention" && feature.did) {
        result.push({ type: "mention", byteStart: facet.index.byteStart, byteEnd: facet.index.byteEnd, did: feature.did });
      } else if (feature.$type === "app.bsky.richtext.facet#tag" && feature.tag) {
        result.push({ type: "tag", byteStart: facet.index.byteStart, byteEnd: facet.index.byteEnd, tag: feature.tag });
      }
    }
  }
  return result.length > 0 ? result : undefined;
}

function renderReply(reply: BlueskyReply, postPath: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "bluesky-reply";

  const displayName = reply.displayName || reply.author;

  // Header
  const header = document.createElement("div");
  header.className = "bluesky-reply-header";

  let avatarHtml = "";
  if (reply.avatarUrl) {
    avatarHtml = `<img class="bluesky-reply-avatar" src="${escapeHtml(reply.avatarUrl)}" alt="" />`;
  } else {
    avatarHtml = `<div class="bluesky-reply-avatar bluesky-avatar-placeholder"></div>`;
  }

  header.innerHTML = `
    ${avatarHtml}
    <span class="bluesky-display-name">${escapeHtml(displayName)}</span>
    <span class="bluesky-handle">@${escapeHtml(reply.author)}</span>
    <span class="bluesky-timestamp">${formatRelativeTime(reply.createdAt)}</span>
  `;
  el.appendChild(header);

  // Reply text with rich text
  const facets = convertReplyFacets(reply.facets);
  const textEl = renderBlueskyRichText(reply.text, facets);
  textEl.className = "bluesky-reply-text";
  el.appendChild(textEl);

  // Reply images (downloaded locally)
  if (reply.images && reply.images.length > 0) {
    const mediaContainer = document.createElement("div");
    mediaContainer.className = "bluesky-reply-media";
    for (const filename of reply.images) {
      const src = `/api/files/download?path=${encodeURIComponent(postPath + "/reply_media/" + filename)}`;
      const img = document.createElement("img");
      img.className = "bluesky-reply-media-img";
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      mediaContainer.appendChild(img);
    }
    el.appendChild(mediaContainer);
  }

  // Engagement
  const engagement = document.createElement("div");
  engagement.className = "bluesky-reply-engagement";
  engagement.innerHTML = `
    <span class="bluesky-metric">${REPLY_ICON} ${formatCount(reply.replyCount)}</span>
    <span class="bluesky-metric">${REPOST_ICON} ${formatCount(reply.repostCount)}</span>
    <span class="bluesky-metric">${LIKE_ICON} ${formatCount(reply.likeCount)}</span>
  `;
  el.appendChild(engagement);

  // Nested replies
  if (reply.replies && reply.replies.length > 0) {
    const thread = document.createElement("div");
    thread.className = "bluesky-reply-thread";
    for (const child of reply.replies) {
      thread.appendChild(renderReply(child, postPath));
    }
    el.appendChild(thread);
  }

  return el;
}

export async function renderBlueskyPostDetail(
  container: HTMLElement,
  api: PluginViewAPI,
  postPath: string
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading post...</div>`;

  const [files, metadata, replies] = await Promise.all([
    api.fetchFiles(postPath),
    fetchBlueskyPostMetadata(api, postPath),
    parseReplies(api, postPath),
  ]);

  if (!metadata) {
    container.innerHTML = `<div class="reddit-empty"><span>Could not load post metadata</span></div>`;
    return;
  }

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

  const avatarUrl = profileAvatarUrl || metadata.avatarUrl;
  const displayName = metadata.displayName || metadata.authorHandle;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "bluesky-detail";

  // Post header
  const header = document.createElement("div");
  header.className = "bluesky-detail-header";

  let avatarHtml = "";
  if (avatarUrl) {
    avatarHtml = `<img class="bluesky-detail-avatar" src="${escapeHtml(avatarUrl)}" alt="" />`;
  }

  header.innerHTML = `
    ${avatarHtml}
    <div class="bluesky-detail-author">
      <span class="bluesky-display-name">${escapeHtml(displayName)}</span>
      <span class="bluesky-handle">@${escapeHtml(metadata.authorHandle)}</span>
    </div>
    ${metadata.url ? `<a class="social-open-original" href="${escapeHtml(metadata.url)}" target="_blank" rel="noopener noreferrer" title="Open original post" style="margin-left:auto;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      Original
    </a>` : ""}
  `;
  wrapper.appendChild(header);

  // Post text
  const textEl = renderBlueskyRichText(metadata.text, metadata.facets);
  textEl.className = "bluesky-detail-text";
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
    // GIF-type videos should autoplay and loop
    if (videoFile.name.includes(".gif.")) {
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
    }
    wrapper.appendChild(videoEl);
  }

  // External link card
  if (metadata.externalLink && metadata.externalLink.uri) {
    const linkCard = document.createElement("a");
    linkCard.className = "bluesky-external-card";
    linkCard.href = metadata.externalLink.uri;
    linkCard.target = "_blank";
    linkCard.rel = "noopener noreferrer";

    let thumbHtml = "";
    if (thumbnailFile) {
      const thumbSrc = `/api/files/download?path=${encodeURIComponent(thumbnailFile.path)}`;
      thumbHtml = `<img class="bluesky-external-thumb" src="${thumbSrc}" alt="" />`;
    } else if (metadata.externalLink.thumb) {
      thumbHtml = `<img class="bluesky-external-thumb" src="${escapeHtml(metadata.externalLink.thumb)}" alt="" />`;
    }

    let domain = "";
    try { domain = new URL(metadata.externalLink.uri).hostname; } catch { domain = metadata.externalLink.uri; }

    linkCard.innerHTML = `
      ${thumbHtml}
      <div class="bluesky-external-info">
        <span class="bluesky-external-domain">${escapeHtml(domain)}</span>
        <span class="bluesky-external-title">${escapeHtml(metadata.externalLink.title)}</span>
        ${metadata.externalLink.description ? `<span class="bluesky-external-desc">${escapeHtml(metadata.externalLink.description)}</span>` : ""}
      </div>
    `;
    wrapper.appendChild(linkCard);
  }

  // Quote post
  if (metadata.quotePost && metadata.quotePost.authorHandle) {
    const quoteCard = document.createElement("div");
    quoteCard.className = "bluesky-quote-card";
    const quoteDisplayName = metadata.quotePost.displayName || metadata.quotePost.authorHandle;
    quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml(quoteDisplayName)}</span>
        <span class="bluesky-handle">@${escapeHtml(metadata.quotePost.authorHandle)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml(metadata.quotePost.text).replace(/\n/g, "<br>")}</div>
    `;
    wrapper.appendChild(quoteCard);
  }

  // Engagement + timestamp
  const stats = document.createElement("div");
  stats.className = "bluesky-detail-stats";
  stats.innerHTML = `
    <span class="bluesky-detail-date">${formatDate(metadata.created)}</span>
    <div class="bluesky-detail-counts">
      <span class="bluesky-detail-count">${REPLY_ICON} <strong>${formatCount(metadata.replyCount)}</strong> replies</span>
      <span class="bluesky-detail-count">${REPOST_ICON} <strong>${formatCount(metadata.repostCount)}</strong> reposts</span>
      <span class="bluesky-detail-count">${LIKE_ICON} <strong>${formatCount(metadata.likeCount)}</strong> likes</span>
    </div>
  `;
  wrapper.appendChild(stats);

  // Replies section
  if (replies.length > 0) {
    const repliesSection = document.createElement("div");
    repliesSection.className = "bluesky-replies-section";

    const heading = document.createElement("div");
    heading.className = "bluesky-replies-heading";
    heading.textContent = `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`;
    repliesSection.appendChild(heading);

    for (const reply of replies) {
      repliesSection.appendChild(renderReply(reply, postPath));
    }
    wrapper.appendChild(repliesSection);
  }

  container.appendChild(wrapper);
}
