import type { Comment, ChangeStatus, CommentEditHistoryEntry } from "./types";
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

// ─── Change-tracking chips & edit history ───────────────────────────────────

const CHIP_LABELS: Record<ChangeStatus, string> = {
  new: "NEW",
  edited: "EDITED",
  deleted: "DELETED",
  removed: "REMOVED",
};

/** Stacking order for chips when a comment has multiple statuses. */
const CHIP_ORDER: ChangeStatus[] = ["new", "edited", "deleted", "removed"];

function makeChangeChip(status: ChangeStatus): HTMLElement {
  const chip = document.createElement("span");
  chip.className = `reddit-chip reddit-chip--${status}`;
  chip.textContent = CHIP_LABELS[status];
  return chip;
}

/**
 * Convert an ISO-dash snapshot timestamp (e.g. "2026-04-09T14-30-22Z") into
 * a human-friendly string. Falls back to the raw input on any parse failure.
 */
function formatSnapshotTimestamp(isoDash: string): string {
  if (!isoDash) return "";
  // Reinflate the dashes back into a parseable ISO string. Date portion stays
  // the same; time portion "14-30-22Z" → "14:30:22Z".
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
 * Render a <details> accordion listing every prior body we've recorded for
 * this comment. Entries are shown newest-first so the most recent previous
 * version is immediately visible when expanded.
 */
function renderCommentEditHistory(
  entries: CommentEditHistoryEntry[]
): HTMLElement {
  const details = document.createElement("details");
  details.className = "reddit-edit-history";

  const summary = document.createElement("summary");
  summary.className = "reddit-edit-history__summary";
  const n = entries.length;
  summary.textContent = `Edit history (${n} version${n === 1 ? "" : "s"})`;
  details.appendChild(summary);

  const entriesEl = document.createElement("div");
  entriesEl.className = "reddit-edit-history__entries";
  // Newest prior version first.
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const entryEl = document.createElement("div");
    entryEl.className = "reddit-edit-history__entry";

    const ts = document.createElement("div");
    ts.className = "reddit-edit-history__timestamp";
    ts.textContent = formatSnapshotTimestamp(entry.timestamp);
    entryEl.appendChild(ts);

    const body = document.createElement("div");
    body.className = "reddit-edit-history__body";
    body.innerHTML = renderMarkdown(entry.body || "");
    entryEl.appendChild(body);

    entriesEl.appendChild(entryEl);
  }
  details.appendChild(entriesEl);

  return details;
}

/**
 * Render embedded media (giphy GIFs, images) from a post/comment media map.
 * Strips the ![gif](giphy|...) / ![img](...) patterns from the body and
 * returns the cleaned body + HTML for the media elements.
 *
 * `subdir` selects the on-disk media folder (`comment_media` for comments,
 * `post_media` for post selftext) so the same helper serves both callers.
 */
export function buildBodyMedia(
  body: string,
  media: Record<string, string> | undefined,
  postPath: string,
  subdir: "comment_media" | "post_media",
  imgClassName: string
): { cleanBody: string; mediaEls: HTMLElement[] } {
  if (!media || Object.keys(media).length === 0) {
    return { cleanBody: body, mediaEls: [] };
  }

  let cleanBody = body;
  const mediaEls: HTMLElement[] = [];

  for (const [key, filename] of Object.entries(media)) {
    const src = `/api/files/download?path=${encodeURIComponent(postPath + "/" + subdir + "/" + filename)}`;

    if (key.startsWith("giphy:")) {
      const giphyId = key.replace("giphy:", "");
      const pattern = new RegExp(`!\\[gif\\]\\(giphy\\|${giphyId}(?:\\|[^)]+)?\\)`, "g");
      cleanBody = cleanBody.replace(pattern, "").trim();
    } else if (key.startsWith("img:")) {
      const imgUrl = key.replace("img:", "");
      const escaped = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Prefer markdown-syntax strip. We accept both `![img](X)` and
      // `![gif](X)` (post selftext via the rich editor uses either prefix
      // for inline media_metadata references), and allow an optional
      // `"caption"` suffix which Reddit emits for captioned uploads.
      // If the body didn't use markdown form (e.g. a plain preview.redd.it
      // URL auto-linked by Reddit), strip the raw URL instead and collapse
      // any surrounding whitespace/newlines.
      const markdownPattern = new RegExp(
        `!\\[(?:img|gif)\\]\\(${escaped}(?:\\s+"[^"]*")?\\)`,
        "g"
      );
      const afterMarkdown = cleanBody.replace(markdownPattern, "");
      if (afterMarkdown !== cleanBody) {
        cleanBody = afterMarkdown.replace(/\n{3,}/g, "\n\n").trim();
      } else {
        const rawPattern = new RegExp(`[ \\t]*${escaped}[ \\t]*`, "g");
        cleanBody = cleanBody.replace(rawPattern, " ");
        // Collapse runs of blank lines left behind, then trim.
        cleanBody = cleanBody.replace(/\n{3,}/g, "\n\n").trim();
      }
    }

    const img = document.createElement("img");
    img.className = imgClassName;
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

  // Change-tracking background: deleted/removed take priority over new.
  // Edited has no background — only a chip + edit-history dropdown.
  // "deleted" and "removed" share the same wrapper class (and therefore
  // the same red palette) — they are distinguished only by the chip label.
  const status = comment.changeStatus ?? [];
  if (status.includes("deleted") || status.includes("removed")) {
    el.classList.add("reddit-comment--deleted");
  } else if (status.includes("new")) {
    el.classList.add("reddit-comment--new");
  }

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

  // Change-tracking chips — stack in a fixed order (new, edited, deleted).
  for (const s of CHIP_ORDER) {
    if (status.includes(s)) {
      header.appendChild(makeChangeChip(s));
    }
  }

  el.appendChild(header);

  // Body
  const { cleanBody, mediaEls } = buildBodyMedia(
    comment.body,
    comment.media,
    postPath,
    "comment_media",
    "reddit-comment-media-img"
  );
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

  // Change-tracking edit history — collapsed by default, listed newest-first.
  if (comment.editHistory && comment.editHistory.length > 0) {
    el.appendChild(renderCommentEditHistory(comment.editHistory));
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
