import type {
  PluginViewAPI,
  Comment,
  ChangeStatus,
  PostEditHistoryEntry,
} from "./types";
import { fetchPostMetadata } from "./nfo-parser";
import { renderCommentTree } from "./comment-tree";
import { renderMarkdown } from "./markdown";
import {
  isImageFile,
  isVideoFile,
  isGifLikeFile,
} from "../../../_shared/view/media-player";

/**
 * Prefix-based detection for media files downloaded via gallery-dl from an
 * external host that the Reddit post linked to (redgifs.com, imgur.com, etc.).
 * Step 3 of the plan populates these; step 1 defines the detector so the
 * file-scan bucketing is already in place when step 3 ships.
 */
const EXTERNAL_MEDIA_PREFIXES = ["redgifs_", "imgur_", "streamable_", "gfycat_"];
function isExternalMediaFile(name: string): boolean {
  return EXTERNAL_MEDIA_PREFIXES.some((prefix) => name.startsWith(prefix));
}

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

// ─── Change-tracking (post-level) ───────────────────────────────────────────

const POST_CHIP_LABELS: Record<ChangeStatus, string> = {
  new: "NEW",
  edited: "EDITED",
  deleted: "DELETED",
};
const POST_CHIP_ORDER: ChangeStatus[] = ["new", "edited", "deleted"];

/** Render a chip for the post header. Returns an HTML string (inserted via innerHTML). */
function postChipHtml(status: ChangeStatus): string {
  return `<span class="reddit-chip reddit-chip--${status}">${POST_CHIP_LABELS[status]}</span>`;
}

/** Convert an ISO-dash snapshot timestamp to a human-readable string. */
function formatSnapshotTimestamp(isoDash: string): string {
  if (!isoDash) return "";
  const iso = isoDash.replace(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z$/,
    "$1T$2:$3:$4Z"
  );
  const d = new Date(iso);
  if (isNaN(d.getTime())) return isoDash;
  try {
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoDash;
  }
}

/**
 * Render the post's edit-history accordion. Post history entries carry
 * both title and selftext — both are shown per entry since either can
 * change independently. Entries are listed newest-first.
 */
function renderPostEditHistory(entries: PostEditHistoryEntry[]): HTMLElement {
  const details = document.createElement("details");
  details.className = "reddit-edit-history";

  const summary = document.createElement("summary");
  summary.className = "reddit-edit-history__summary";
  const n = entries.length;
  summary.textContent = `Edit history (${n} version${n === 1 ? "" : "s"})`;
  details.appendChild(summary);

  const entriesEl = document.createElement("div");
  entriesEl.className = "reddit-edit-history__entries";
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const entryEl = document.createElement("div");
    entryEl.className = "reddit-edit-history__entry";

    const ts = document.createElement("div");
    ts.className = "reddit-edit-history__timestamp";
    ts.textContent = formatSnapshotTimestamp(entry.timestamp);
    entryEl.appendChild(ts);

    if (entry.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "reddit-edit-history__title";
      titleEl.textContent = entry.title;
      entryEl.appendChild(titleEl);
    }

    if (entry.selftext) {
      const body = document.createElement("div");
      body.className = "reddit-edit-history__body";
      body.innerHTML = renderMarkdown(entry.selftext);
      entryEl.appendChild(body);
    }

    entriesEl.appendChild(entryEl);
  }
  details.appendChild(entriesEl);

  return details;
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

  // Split media files into two buckets:
  //   - native: Reddit-hosted images/videos saved by reddit.ts
  //       (`Image 1.jpg`, `Video.mp4`, `original_...mp4`, etc.)
  //   - external: media downloaded via gallery-dl from a linked host
  //       (`redgifs_<id>.mp4`, `imgur_<id>.jpg`, etc.) — populated in step 3
  const mediaFiles = files.filter(
    (f) => !f.isDirectory && (isImageFile(f.name) || isVideoFile(f.name))
  );
  const externalMedia = mediaFiles.filter((f) => isExternalMediaFile(f.name));
  const images = mediaFiles.filter(
    (f) => isImageFile(f.name) && !isExternalMediaFile(f.name)
  );
  const videos = mediaFiles.filter(
    (f) => isVideoFile(f.name) && !isExternalMediaFile(f.name)
  );
  const title = metadata?.title || postPath.split("/").pop() || "Post";

  const scoreClass = metadata
    ? metadata.score > 0
      ? "reddit-score-up"
      : metadata.score < 0
        ? "reddit-score-down"
        : "reddit-score-neutral"
    : "reddit-score-neutral";

  // Post-level change-tracking background (deleted > new). Applied to the
  // post wrapper below via the .reddit-post--{status} class.
  const postStatus = metadata?.changeStatus ?? [];
  const postWrapperClass = postStatus.includes("deleted")
    ? " reddit-post--deleted"
    : postStatus.includes("new")
      ? " reddit-post--new"
      : "";

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
    // Change-tracking chips stack after the existing metadata chips.
    for (const s of POST_CHIP_ORDER) {
      if (postStatus.includes(s)) {
        headerHtml += postChipHtml(s);
      }
    }
  }
  if (metadata?.url) {
    headerHtml += `<a class="social-open-original" href="${escapeHtml(metadata.url)}" target="_blank" rel="noopener noreferrer" title="Open original post">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      Original
    </a>`;
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
    const imageItems = images.map(
      (img) =>
        `/api/files/download?path=${encodeURIComponent(img.path)}`
    );

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
      const src = `/api/files/download?path=${encodeURIComponent(vid.path)}`;
      const isGif = isGifLikeFile(vid.name) || vid.name.includes(".gif.");
      videoHtml += `
        <video controls${isGif ? " autoplay loop muted playsinline" : ""} style="width:100%;max-height:70vh;border-radius:0.5rem;margin-bottom:1rem;background:var(--muted);">
          <source src="${src}" />
          Your browser does not support video playback.
        </video>
      `;
    });
  }

  // Build external-media section — media downloaded via gallery-dl from a
  // linked host (redgifs, imgur, streamable, gfycat). Rendered identically to
  // native media but in its own bucket so we can suppress the link-card below
  // when we've successfully archived the linked content.
  let externalMediaHtml = "";
  if (externalMedia.length > 0) {
    externalMediaHtml = `<div class="reddit-external-media">`;
    externalMedia.forEach((file) => {
      const src = `/api/files/download?path=${encodeURIComponent(file.path)}`;
      if (isVideoFile(file.name)) {
        const isGif = isGifLikeFile(file.name) || file.name.includes(".gif.");
        externalMediaHtml += `
          <video controls${isGif ? " autoplay loop muted playsinline" : ""} style="width:100%;max-height:70vh;border-radius:0.5rem;margin-bottom:1rem;background:var(--muted);">
            <source src="${src}" />
            Your browser does not support video playback.
          </video>
        `;
      } else if (isImageFile(file.name)) {
        externalMediaHtml += `<img class="reddit-external-img" src="${src}" alt="${escapeHtml(file.name)}" loading="lazy" style="width:100%;max-height:70vh;object-fit:contain;border-radius:0.5rem;margin-bottom:1rem;background:var(--muted);" />`;
      }
    });
    externalMediaHtml += `</div>`;
  }

  // Link post card — show when it's a link to an external domain AND we
  // couldn't (or didn't) download the linked content inline.
  let linkCardHtml = "";
  const isLinkPost =
    metadata?.domain &&
    metadata.domain !== "self." + metadata.subreddit &&
    metadata.domain !== "i.redd.it" &&
    metadata.domain !== "v.redd.it" &&
    metadata.domain !== "reddit.com" &&
    metadata.mediaUrl;

  if (isLinkPost && metadata?.mediaUrl && externalMedia.length === 0) {
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
  if (
    images.length === 0 &&
    videos.length === 0 &&
    externalMedia.length === 0 &&
    !metadata?.selftext &&
    !isLinkPost
  ) {
    emptyNotice = `
      <div class="reddit-empty" style="padding:2rem">
        <div class="reddit-empty-icon">📝</div>
        <span>No media or text content archived</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="reddit-post${postWrapperClass}">
      ${headerHtml}
      ${selftextHtml}
      <div id="reddit-post-edit-history-slot"></div>
      ${linkCardHtml}
      ${externalMediaHtml}
      ${videoHtml}
      ${galleryHtml}
      ${emptyNotice}
      <div id="reddit-comments-container"></div>
    </div>
  `;

  // Post-level edit history (rendered as DOM because it contains markdown-
  // rendered HTML from prior bodies and uses <details> for collapse).
  if (metadata?.editHistory && metadata.editHistory.length > 0) {
    const slot = container.querySelector("#reddit-post-edit-history-slot") as HTMLElement | null;
    if (slot) {
      slot.appendChild(renderPostEditHistory(metadata.editHistory));
    }
  }

  // Wire up lightbox on gallery images
  if (images.length > 0) {
    const imageUrls = images.map((img) => ({
      src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
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
    renderCommentTree(commentsContainer, comments, postPath);
  }
}
