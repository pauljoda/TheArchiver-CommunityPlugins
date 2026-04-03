import type { PluginViewAPI, Comment } from "./types";
import { fetchPostMetadata } from "./nfo-parser";
import { renderCommentTree } from "./comment-tree";
import { renderMarkdown } from "./markdown";
import { isImageFile, isVideoFile, getFileUrl } from "./card-helpers";

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

async function parseComments(
  api: PluginViewAPI,
  path: string
): Promise<Comment[]> {
  try {
    const res = await api.fetchFile(`${path}/Comments.json`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

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

export async function renderPostDetail(
  container: HTMLElement,
  api: PluginViewAPI,
  postPath: string
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading post...</div>`;

  const [files, metadata, comments] = await Promise.all([
    api.fetchFiles(postPath),
    fetchPostMetadata(api, postPath),
    parseComments(api, postPath),
  ]);

  const images = files.filter((f) => !f.isDirectory && isImageFile(f.name));
  const videos = files.filter((f) => !f.isDirectory && isVideoFile(f.name));
  const title = metadata?.title || postPath.split("/").pop() || "Post";

  const scoreClass = metadata
    ? metadata.score > 0
      ? "reddit-score-up"
      : metadata.score < 0
        ? "reddit-score-down"
        : "reddit-score-neutral"
    : "reddit-score-neutral";

  // Build header
  let headerHtml = `
    <div class="reddit-post-header">
      <h1 class="reddit-post-title">${escapeHtml(title)}</h1>
      <div class="reddit-post-byline">
  `;

  if (metadata) {
    headerHtml += `<span class="reddit-post-author">u/${escapeHtml(metadata.author)}</span>`;
    if (metadata.subreddit) {
      headerHtml += `<span class="reddit-card-meta-item">r/${escapeHtml(metadata.subreddit)}</span>`;
    }
    headerHtml += `<span class="reddit-score ${scoreClass}">${metadata.score > 0 ? "+" : ""}${metadata.score.toLocaleString()}</span>`;
    if (metadata.flair) {
      headerHtml += `<span class="reddit-flair">${escapeHtml(metadata.flair)}</span>`;
    }
    if (metadata.created) {
      headerHtml += `<span>${formatDate(metadata.created)}</span>`;
    }
    if (metadata.numComments !== undefined) {
      headerHtml += `<span>${metadata.numComments.toLocaleString()} comments</span>`;
    }
  }
  headerHtml += `</div></div>`;

  // Build selftext
  let selftextHtml = "";
  if (metadata?.selftext) {
    selftextHtml = `<div class="reddit-post-selftext">${renderMarkdown(metadata.selftext)}</div>`;
  }

  // Build gallery
  let galleryHtml = "";
  if (images.length > 0) {
    const imageItems = images.map((img) => getFileUrl(img.path));

    galleryHtml = `<div class="reddit-gallery">`;
    images.forEach((img, i) => {
      galleryHtml += `<img class="reddit-gallery-img" data-index="${i}" src="${imageItems[i]}" alt="${escapeHtml(img.name)}" loading="lazy" />`;
    });
    galleryHtml += `</div>`;
  }

  // Build video section
  let videoHtml = "";
  if (videos.length > 0) {
    videos.forEach((vid) => {
      const src = getFileUrl(vid.path);
      videoHtml += `
        <div class="reddit-post-video-frame">
          <video class="reddit-post-video" controls preload="metadata" playsinline>
          <source src="${src}" />
          Your browser does not support video playback.
          </video>
        </div>
      `;
    });
  }

  // Link post card — show when it's a link to an external domain
  let linkCardHtml = "";
  const isLinkPost =
    metadata?.domain &&
    metadata.domain !== "self." + metadata.subreddit &&
    metadata.domain !== "i.redd.it" &&
    metadata.domain !== "v.redd.it" &&
    metadata.domain !== "reddit.com" &&
    metadata.mediaUrl;

  if (isLinkPost && metadata?.mediaUrl) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(metadata.domain!)}&sz=64`;
    linkCardHtml = `
      <a class="reddit-link-card" href="${escapeHtml(metadata.mediaUrl)}" target="_blank" rel="noopener noreferrer">
        <img class="reddit-link-favicon" src="${faviconUrl}" alt="" />
        <div class="reddit-link-info">
          <div class="reddit-link-domain">${escapeHtml(metadata.domain!)}</div>
          <div class="reddit-link-url">${escapeHtml(metadata.mediaUrl)}</div>
        </div>
        <span class="reddit-link-external">↗</span>
      </a>
    `;
  }

  // No media, no selftext, and not a link — show text-only post notice
  let emptyNotice = "";
  if (images.length === 0 && videos.length === 0 && !metadata?.selftext && !isLinkPost) {
    emptyNotice = `
      <div class="reddit-empty" style="padding:2rem">
        <div class="reddit-empty-icon">📝</div>
        <span>No media or text content archived</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="reddit-post">
      ${headerHtml}
      ${selftextHtml}
      ${linkCardHtml}
      ${videoHtml}
      ${galleryHtml}
      ${emptyNotice}
      <div id="reddit-comments-container"></div>
    </div>
  `;

  // Wire up lightbox on gallery images
  if (images.length > 0) {
    const imageUrls = images.map((img) => ({
      src: getFileUrl(img.path),
      name: img.name,
    }));

    container.querySelectorAll<HTMLImageElement>(".reddit-gallery-img").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.index || "0", 10);
        document.body.appendChild(createLightbox(imageUrls, idx));
      });
    });
  }

  // Render comments
  const commentsContainer = container.querySelector("#reddit-comments-container") as HTMLElement;
  if (commentsContainer) {
    renderCommentTree(commentsContainer, comments);
  }
}
