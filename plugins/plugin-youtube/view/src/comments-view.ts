import type { YtDlpComment } from "./types";

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

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return "";
  try {
    return new Date(ts * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatLikes(count: number | undefined): string {
  if (count === undefined || count <= 0) return "";
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(count);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sortComments(comments: YtDlpComment[], mode: SortMode): YtDlpComment[] {
  const sorted = [...comments];
  if (mode === "top") {
    sorted.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
  } else {
    sorted.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }
  return sorted;
}

function countAllReplies(commentId: string, allById: Map<string, YtDlpComment[]>): number {
  const direct = allById.get(commentId) ?? [];
  let count = direct.length;
  for (const r of direct) {
    count += countAllReplies(r.id, allById);
  }
  return count;
}

function renderComment(
  comment: YtDlpComment,
  replies: YtDlpComment[],
  allById: Map<string, YtDlpComment[]>,
  depth: number,
  startCollapsed: boolean
): HTMLElement {
  const el = document.createElement("div");
  el.className = "yt-comment";

  const header = document.createElement("div");
  header.className = "yt-comment-header";

  const author = document.createElement("span");
  author.className = comment.author_is_uploader
    ? "yt-comment-author yt-comment-uploader"
    : "yt-comment-author";
  author.textContent = comment.author || "Anonymous";
  header.appendChild(author);

  if (comment.author_is_uploader) {
    const badge = document.createElement("span");
    badge.className = "yt-comment-badge";
    badge.textContent = "Creator";
    header.appendChild(badge);
  }

  if (comment.is_favorited) {
    const badge = document.createElement("span");
    badge.className = "yt-comment-badge yt-comment-badge-heart";
    badge.textContent = "\u2665 Liked by creator";
    header.appendChild(badge);
  }

  const date = formatTimestamp(comment.timestamp);
  if (date) {
    const dateEl = document.createElement("span");
    dateEl.className = "yt-comment-date";
    dateEl.textContent = date;
    header.appendChild(dateEl);
  }

  el.appendChild(header);

  const body = document.createElement("div");
  body.className = "yt-comment-body";
  body.innerHTML = escapeHtml(comment.text || "").replace(/\n/g, "<br>");
  el.appendChild(body);

  const likes = formatLikes(comment.like_count);
  if (likes) {
    const likesEl = document.createElement("div");
    likesEl.className = "yt-comment-likes";
    likesEl.textContent = `\uD83D\uDC4D ${likes}`;
    el.appendChild(likesEl);
  }

  if (replies.length > 0) {
    const totalReplies = countAllReplies(comment.id, allById);
    const collapsed = startCollapsed;

    // Toggle button
    const toggle = document.createElement("button");
    toggle.className = "yt-comment-toggle";
    toggle.innerHTML = `<span class="yt-comment-toggle-icon ${collapsed ? "" : "expanded"}">\u25B6</span> <span class="yt-comment-toggle-text">${totalReplies} ${totalReplies === 1 ? "reply" : "replies"}</span>`;
    el.appendChild(toggle);

    // Replies container with depth-colored thread line
    const repliesEl = document.createElement("div");
    repliesEl.className = "yt-comment-replies";
    repliesEl.style.setProperty("--thread-color", depthColor(depth));
    if (collapsed) repliesEl.classList.add("collapsed");

    for (const reply of replies) {
      const replyReplies = allById.get(reply.id) ?? [];
      repliesEl.appendChild(renderComment(reply, replyReplies, allById, depth + 1, false));
    }
    el.appendChild(repliesEl);

    // Clickable thread line to collapse
    const threadLine = repliesEl;

    toggle.addEventListener("click", () => {
      const isCollapsed = repliesEl.classList.toggle("collapsed");
      const icon = toggle.querySelector(".yt-comment-toggle-icon")!;
      icon.classList.toggle("expanded", !isCollapsed);
    });

    // Click on the thread line border area to collapse
    repliesEl.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      // Only collapse when clicking the thread line itself (the left padding area)
      const rect = repliesEl.getBoundingClientRect();
      if (e.clientX < rect.left + 16) {
        e.stopPropagation();
        const isCollapsed = repliesEl.classList.toggle("collapsed");
        const icon = toggle.querySelector(".yt-comment-toggle-icon")!;
        icon.classList.toggle("expanded", !isCollapsed);
      }
    });
  }

  return el;
}

export function renderComments(container: HTMLElement, comments: YtDlpComment[], totalCount?: number): void {
  // Build lookup: parent id → children
  const byParent = new Map<string, YtDlpComment[]>();
  for (const c of comments) {
    const key = c.parent === "root" ? "root" : c.parent;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }

  // Build lookup: comment id → its children
  const byId = new Map<string, YtDlpComment[]>();
  for (const c of comments) {
    byId.set(c.id, byParent.get(c.id) ?? []);
  }

  const topLevel = byParent.get("root") ?? [];

  const section = document.createElement("div");
  section.className = "yt-comments-section";

  // Header row with count and sort controls
  const headerRow = document.createElement("div");
  headerRow.className = "yt-comments-header-row";

  const heading = document.createElement("div");
  heading.className = "yt-comments-heading";
  const displayCount = totalCount ?? comments.length;
  heading.textContent = `Comments (${displayCount.toLocaleString()})`;
  headerRow.appendChild(heading);

  const commentsList = document.createElement("div");
  commentsList.className = "yt-comments-list";

  if (topLevel.length > 0) {
    const sortBar = document.createElement("div");
    sortBar.className = "yt-sort-bar";

    const topBtn = document.createElement("button");
    topBtn.className = "yt-sort-btn active";
    topBtn.textContent = "Top";

    const newestBtn = document.createElement("button");
    newestBtn.className = "yt-sort-btn";
    newestBtn.textContent = "Newest";

    const renderList = (mode: SortMode) => {
      commentsList.innerHTML = "";
      const sorted = sortComments(topLevel, mode);
      for (const comment of sorted) {
        const replies = byId.get(comment.id) ?? [];
        // Root-level comments with replies start collapsed
        commentsList.appendChild(renderComment(comment, replies, byId, 0, replies.length > 0));
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

    sortBar.appendChild(topBtn);
    sortBar.appendChild(newestBtn);
    headerRow.appendChild(sortBar);

    section.appendChild(headerRow);

    // Initial render sorted by top
    renderList("top");
    section.appendChild(commentsList);
  } else {
    section.appendChild(headerRow);
    const empty = document.createElement("div");
    empty.className = "yt-comments-empty";
    empty.textContent = "No comments";
    section.appendChild(empty);
  }

  container.appendChild(section);
}
