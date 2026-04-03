import type { Comment } from "./types";
import { renderMarkdown } from "./markdown";

function formatDate(utc: number): string {
  if (!utc || utc <= 0) return "";
  try {
    const date = new Date(utc * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render embedded media (giphy GIFs, images) from a comment's media map.
 * Strips the ![gif](giphy|...) / ![img](...) patterns from the body and
 * returns the cleaned body + HTML for the media.
 */
function renderCommentMedia(body: string, media: Record<string, string> | undefined, postPath: string): { cleanBody: string; mediaHtml: string } {
  if (!media || Object.keys(media).length === 0) {
    return { cleanBody: body, mediaHtml: "" };
  }

  let cleanBody = body;
  const mediaImages: string[] = [];

  for (const [key, filename] of Object.entries(media)) {
    const src = `/api/files/download?path=${encodeURIComponent(postPath + "/comment_media/" + filename)}`;
    mediaImages.push(src);

    if (key.startsWith("giphy:")) {
      // Remove ![gif](giphy|ID) or ![gif](giphy|ID|variant) from body
      const giphyId = key.replace("giphy:", "");
      const pattern = new RegExp(`!\\[gif\\]\\(giphy\\|${giphyId}(?:\\|[^)]+)?\\)`, "g");
      cleanBody = cleanBody.replace(pattern, "").trim();
    } else if (key.startsWith("img:")) {
      // Remove ![img](URL) from body
      const imgUrl = key.replace("img:", "");
      const escaped = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`!\\[img\\]\\(${escaped}\\)`, "g");
      cleanBody = cleanBody.replace(pattern, "").trim();
    }
  }

  let mediaHtml = "";
  if (mediaImages.length > 0) {
    mediaHtml = `<div class="reddit-comment-media">`;
    for (const src of mediaImages) {
      mediaHtml += `<img class="reddit-comment-media-img" src="${src}" alt="" loading="lazy" />`;
    }
    mediaHtml += `</div>`;
  }

  return { cleanBody, mediaHtml };
}

function renderComment(comment: Comment, postPath: string): string {
  // Handle "more" comment stubs
  if ((comment as unknown as { kind: string }).kind === "more") {
    const more = comment as unknown as { count: number };
    return `<div class="reddit-comment" style="opacity:0.5;font-size:0.75rem;color:var(--muted-foreground);">
      ${more.count} more replies...
    </div>`;
  }

  const scoreClass =
    comment.score > 0
      ? "reddit-score-up"
      : comment.score < 0
        ? "reddit-score-down"
        : "reddit-score-neutral";

  const { cleanBody, mediaHtml } = renderCommentMedia(comment.body, comment.media, postPath);
  const bodyHtml = renderMarkdown(cleanBody);

  const authorClass = comment.is_submitter
    ? "reddit-comment-author reddit-comment-op"
    : "reddit-comment-author";

  const opBadge = comment.is_submitter
    ? ` <span class="reddit-op-badge">OP</span>`
    : "";

  const stickyBadge = comment.stickied
    ? ` <span class="reddit-mod-badge">📌</span>`
    : "";

  const modBadge = comment.distinguished === "moderator"
    ? ` <span class="reddit-mod-badge">MOD</span>`
    : "";

  const dateStr = formatDate(comment.created_utc);

  const repliesHtml =
    comment.replies && comment.replies.length > 0
      ? `<div class="reddit-comment-thread">
          ${comment.replies.map((r) => renderComment(r, postPath)).join("")}
        </div>`
      : "";

  return `
    <div class="reddit-comment">
      <div class="reddit-comment-header">
        <span class="${authorClass}">${escapeHtml(comment.author)}</span>${opBadge}${modBadge}${stickyBadge}
        <span class="reddit-score ${scoreClass}">${comment.score > 0 ? "+" : ""}${comment.score}</span>
        ${dateStr ? `<span class="reddit-comment-date">${dateStr}</span>` : ""}
      </div>
      <div class="reddit-comment-body">${bodyHtml}</div>
      ${mediaHtml}
      ${repliesHtml}
    </div>
  `;
}

export function renderCommentTree(
  container: HTMLElement,
  comments: Comment[],
  postPath: string
): void {
  if (comments.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">💬</div>
        <span>No comments</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="reddit-comments">
      <div class="reddit-comments-heading">Comments (${comments.length})</div>
      ${comments.map((c) => renderComment(c, postPath)).join("")}
    </div>
  `;
}
