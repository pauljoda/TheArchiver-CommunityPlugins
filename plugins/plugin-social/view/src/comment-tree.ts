import type { Comment } from "./types";
import { renderMarkdown } from "./markdown";

type SortMode = "top" | "newest";

/** Depth colors cycle through the app's chart palette */
const DEPTH_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function depthColor(depth: number): string {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

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
 * returns the cleaned body + HTML for the media elements.
 */
function buildCommentMedia(body: string, media: Record<string, string> | undefined, postPath: string): { cleanBody: string; mediaEls: HTMLElement[] } {
  if (!media || Object.keys(media).length === 0) {
    return { cleanBody: body, mediaEls: [] };
  }

  let cleanBody = body;
  const mediaEls: HTMLElement[] = [];

  for (const [key, filename] of Object.entries(media)) {
    const src = `/api/files/download?path=${encodeURIComponent(postPath + "/comment_media/" + filename)}`;

    if (key.startsWith("giphy:")) {
      const giphyId = key.replace("giphy:", "");
      const pattern = new RegExp(`!\\[gif\\]\\(giphy\\|${giphyId}(?:\\|[^)]+)?\\)`, "g");
      cleanBody = cleanBody.replace(pattern, "").trim();
    } else if (key.startsWith("img:")) {
      const imgUrl = key.replace("img:", "");
      const escaped = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`!\\[img\\]\\(${escaped}\\)`, "g");
      cleanBody = cleanBody.replace(pattern, "").trim();
    }

    const img = document.createElement("img");
    img.className = "reddit-comment-media-img";
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    mediaEls.push(img);
  }

  return { cleanBody, mediaEls };
}

function sortComments(comments: Comment[], mode: SortMode): Comment[] {
  const sorted = [...comments];
  if (mode === "top") {
    sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else {
    sorted.sort((a, b) => (b.created_utc ?? 0) - (a.created_utc ?? 0));
  }
  return sorted;
}

function countAllReplies(comment: Comment): number {
  if (!comment.replies) return 0;
  let count = comment.replies.length;
  for (const r of comment.replies) {
    count += countAllReplies(r);
  }
  return count;
}

function renderComment(comment: Comment, postPath: string, depth: number, startCollapsed: boolean): HTMLElement {
  // Handle "more" comment stubs
  if ((comment as unknown as { kind: string }).kind === "more") {
    const more = comment as unknown as { count: number };
    const stub = document.createElement("div");
    stub.className = "reddit-comment";
    stub.style.opacity = "0.5";
    stub.style.fontSize = "0.75rem";
    stub.style.color = "var(--muted-foreground)";
    stub.textContent = `${more.count} more replies...`;
    return stub;
  }

  const el = document.createElement("div");
  el.className = "reddit-comment";

  // Header
  const header = document.createElement("div");
  header.className = "reddit-comment-header";

  const authorEl = document.createElement("span");
  authorEl.className = comment.is_submitter
    ? "reddit-comment-author reddit-comment-op"
    : "reddit-comment-author";
  authorEl.textContent = comment.author;
  header.appendChild(authorEl);

  if (comment.is_submitter) {
    const badge = document.createElement("span");
    badge.className = "reddit-op-badge";
    badge.textContent = "OP";
    header.appendChild(badge);
  }

  if (comment.distinguished === "moderator") {
    const badge = document.createElement("span");
    badge.className = "reddit-mod-badge";
    badge.textContent = "MOD";
    header.appendChild(badge);
  }

  if (comment.stickied) {
    const badge = document.createElement("span");
    badge.className = "reddit-mod-badge";
    badge.textContent = "\uD83D\uDCCC";
    header.appendChild(badge);
  }

  const scoreClass =
    comment.score > 0
      ? "reddit-score-up"
      : comment.score < 0
        ? "reddit-score-down"
        : "reddit-score-neutral";

  const scoreEl = document.createElement("span");
  scoreEl.className = `reddit-score ${scoreClass}`;
  scoreEl.textContent = `${comment.score > 0 ? "+" : ""}${comment.score}`;
  header.appendChild(scoreEl);

  const dateStr = formatDate(comment.created_utc);
  if (dateStr) {
    const dateEl = document.createElement("span");
    dateEl.className = "reddit-comment-date";
    dateEl.textContent = dateStr;
    header.appendChild(dateEl);
  }

  el.appendChild(header);

  // Body
  const { cleanBody, mediaEls } = buildCommentMedia(comment.body, comment.media, postPath);
  const bodyEl = document.createElement("div");
  bodyEl.className = "reddit-comment-body";
  bodyEl.innerHTML = renderMarkdown(cleanBody);
  el.appendChild(bodyEl);

  // Media
  if (mediaEls.length > 0) {
    const mediaContainer = document.createElement("div");
    mediaContainer.className = "reddit-comment-media";
    for (const img of mediaEls) {
      mediaContainer.appendChild(img);
    }
    el.appendChild(mediaContainer);
  }

  // Replies
  if (comment.replies && comment.replies.length > 0) {
    const totalReplies = countAllReplies(comment);
    const collapsed = startCollapsed;

    // Toggle button
    const toggle = document.createElement("button");
    toggle.className = "reddit-comment-toggle";
    toggle.innerHTML = `<span class="reddit-comment-toggle-icon ${collapsed ? "" : "expanded"}">\u25B6</span> <span class="reddit-comment-toggle-text">${totalReplies} ${totalReplies === 1 ? "reply" : "replies"}</span>`;
    el.appendChild(toggle);

    // Thread container with depth-colored line
    const thread = document.createElement("div");
    thread.className = "reddit-comment-thread";
    thread.style.setProperty("--thread-color", depthColor(depth));
    if (collapsed) thread.classList.add("collapsed");

    for (const reply of comment.replies) {
      thread.appendChild(renderComment(reply, postPath, depth + 1, false));
    }
    el.appendChild(thread);

    toggle.addEventListener("click", () => {
      const isCollapsed = thread.classList.toggle("collapsed");
      const icon = toggle.querySelector(".reddit-comment-toggle-icon")!;
      icon.classList.toggle("expanded", !isCollapsed);
    });

    // Click on the thread line border area to collapse
    thread.addEventListener("click", (e) => {
      const rect = thread.getBoundingClientRect();
      if (e.clientX < rect.left + 16) {
        e.stopPropagation();
        const isCollapsed = thread.classList.toggle("collapsed");
        const icon = toggle.querySelector(".reddit-comment-toggle-icon")!;
        icon.classList.toggle("expanded", !isCollapsed);
      }
    });
  }

  return el;
}

export function renderCommentTree(
  container: HTMLElement,
  comments: Comment[],
  postPath: string
): void {
  if (comments.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">\uD83D\uDCAC</div>
        <span>No comments</span>
      </div>
    `;
    return;
  }

  const section = document.createElement("div");
  section.className = "reddit-comments";

  // Header row with count and sort controls
  const headerRow = document.createElement("div");
  headerRow.className = "reddit-comments-header-row";

  const heading = document.createElement("div");
  heading.className = "reddit-comments-heading";
  heading.textContent = `Comments (${comments.length})`;
  headerRow.appendChild(heading);

  const sortBar = document.createElement("div");
  sortBar.className = "reddit-sort-bar";

  const topBtn = document.createElement("button");
  topBtn.className = "reddit-sort-btn active";
  topBtn.textContent = "Top";

  const newestBtn = document.createElement("button");
  newestBtn.className = "reddit-sort-btn";
  newestBtn.textContent = "Newest";

  sortBar.appendChild(topBtn);
  sortBar.appendChild(newestBtn);
  headerRow.appendChild(sortBar);

  section.appendChild(headerRow);

  const commentsList = document.createElement("div");
  commentsList.className = "reddit-comments-list";
  section.appendChild(commentsList);

  const renderList = (mode: SortMode) => {
    commentsList.innerHTML = "";
    const sorted = sortComments(comments, mode);
    for (const c of sorted) {
      // Root-level comments with replies start collapsed
      const hasReplies = !!(c.replies && c.replies.length > 0);
      commentsList.appendChild(renderComment(c, postPath, 0, hasReplies));
    }
  };

  topBtn.addEventListener("click", () => {
    topBtn.classList.add("active");
    newestBtn.classList.remove("active");
    renderList("top");
  });

  newestBtn.addEventListener("click", () => {
    newestBtn.classList.add("active");
    topBtn.classList.remove("active");
    renderList("newest");
  });

  // Initial render sorted by top
  renderList("top");

  container.innerHTML = "";
  container.appendChild(section);
}
