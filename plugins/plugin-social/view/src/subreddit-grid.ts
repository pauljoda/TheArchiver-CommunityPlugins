import type { PluginViewAPI, SubredditInfo } from "./types";
import { fetchPostMetadata } from "./nfo-parser";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
}

/** Files that are directory metadata, not post content */
const METADATA_FILES = new Set([
  "icon.jpg",
  "icon.png",
  "icon.webp",
  ".no-icon",
]);

async function loadSubredditInfo(
  api: PluginViewAPI,
  entry: { name: string; path: string }
): Promise<SubredditInfo> {
  const files = await api.fetchFiles(entry.path);
  const dirs = files.filter((f) => f.isDirectory);
  const contentFiles = files.filter(
    (f) => !f.isDirectory && !METADATA_FILES.has(f.name)
  );

  const postCount = dirs.length;
  let preview: SubredditInfo["preview"] = { type: "empty" };

  // Check if this directory's children are sub-directories (like user/{subreddit}/)
  // vs post directories. If there are no content files and dirs exist, check a child.
  const hasPostContent =
    contentFiles.some((f) => f.name === "Post.nfo") ||
    contentFiles.some((f) => isImageFile(f.name));

  if (hasPostContent) {
    // This IS a post directory somehow at the grid level — unlikely but handle it
    preview = { type: "empty" };
  } else if (dirs.length > 0) {
    // Check if children are posts or more directories
    const firstChild = dirs[0];
    let childFiles;
    try {
      childFiles = await api.fetchFiles(firstChild.path);
    } catch {
      childFiles = [];
    }

    const childContentFiles = childFiles.filter(
      (f) => !f.isDirectory && !METADATA_FILES.has(f.name)
    );
    const childDirs = childFiles.filter((f) => f.isDirectory);
    const childIsPost =
      childContentFiles.some((f) => f.name === "Post.nfo") ||
      childContentFiles.some((f) => isImageFile(f.name));

    if (childIsPost) {
      // Children are posts — try to find image thumbnail or text preview
      // Scan a few posts for an image
      let foundImage = false;
      for (const postDir of dirs.slice(0, 5)) {
        try {
          const postFiles = await api.fetchFiles(postDir.path);
          const img = postFiles.find(
            (f) => !f.isDirectory && isImageFile(f.name)
          );
          if (img) {
            preview = {
              type: "image",
              src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
            };
            foundImage = true;
            break;
          }
        } catch {
          // skip
        }
      }

      // No images found — try to get a text snippet from the first post
      if (!foundImage) {
        try {
          const meta = await fetchPostMetadata(api, firstChild.path);
          if (meta) {
            const snippet = meta.selftext
              ? meta.selftext.slice(0, 120)
              : meta.title;
            preview = {
              type: "text",
              title: meta.title || firstChild.name,
              snippet: snippet || "",
            };
          }
        } catch {
          // fall through to empty
        }
      }
    } else if (childDirs.length > 0) {
      // Children are directories (user profile → subreddit folders)
      // Show a mini grid preview of the sub-directory names
      const items = dirs.slice(0, 6).map((d) => d.name);
      preview = { type: "grid", items };
    }
  }

  return {
    name: entry.name,
    path: entry.path,
    postCount,
    preview,
  };
}

function renderPreview(
  preview: SubredditInfo["preview"],
  isUser: boolean
): string {
  switch (preview.type) {
    case "image":
      return `<img class="reddit-card-thumb" src="${preview.src}" alt="" loading="lazy" />`;

    case "text":
      return `
        <div class="reddit-card-text-preview">
          <div class="reddit-card-text-title">${escapeHtml(preview.title)}</div>
          <div class="reddit-card-text-snippet">${escapeHtml(preview.snippet)}${preview.snippet.length >= 120 ? "..." : ""}</div>
        </div>
      `;

    case "grid":
      return `
        <div class="reddit-card-grid-preview">
          ${preview.items.map((name) => `<div class="reddit-card-grid-item">${escapeHtml(name)}</div>`).join("")}
          ${preview.items.length >= 6 ? `<div class="reddit-card-grid-item reddit-card-grid-more">...</div>` : ""}
        </div>
      `;

    case "empty":
    default:
      return `<div class="reddit-card-thumb-placeholder">${isUser ? "👤" : "📁"}</div>`;
  }
}

/** Known platform folder names that should never get a prefix */
const PLATFORM_FOLDERS = new Set(["reddit", "bluesky", "twitter"]);

function renderSubredditCard(sub: SubredditInfo, depth: number): string {
  const nameLower = sub.name.toLowerCase();
  const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
  const isUser = !isPlatformFolder && (sub.name.startsWith("u_") || sub.name.startsWith("u/"));

  let displayName: string;
  if (isPlatformFolder || depth === 0) {
    // Top-level: platform folders like "Reddit", "Bluesky", "Twitter" — no prefix
    displayName = sub.name;
  } else if (isUser) {
    displayName = "u/" + sub.name.replace(/^u[_/]/, "");
  } else {
    // Inside a platform folder — use platform-appropriate prefix
    const pathLower = sub.path.toLowerCase();
    const inBluesky = pathLower.includes("/bluesky/");
    const inTwitter = pathLower.includes("/twitter/");
    displayName = inBluesky || inTwitter ? "@" + sub.name : "r/" + sub.name;
  }

  return `
    <div class="reddit-card" data-path="${escapeHtml(sub.path)}">
      ${renderPreview(sub.preview, isUser)}
      <div class="reddit-card-body">
        <div class="reddit-card-title">${escapeHtml(displayName)}</div>
        <div class="reddit-card-meta">
          <span class="reddit-card-meta-item">${sub.postCount} ${sub.postCount === 1 ? "item" : "items"}</span>
        </div>
      </div>
    </div>
  `;
}

export async function renderSubredditGrid(
  container: HTMLElement,
  api: PluginViewAPI,
  rootPath: string,
  onNavigate: (path: string) => void
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading...</div>`;

  const entries = await api.fetchFiles(rootPath);
  const dirs = entries.filter((e) => e.isDirectory);

  if (dirs.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">📭</div>
        <span>No content found</span>
      </div>
    `;
    return;
  }

  // Load subreddit info in parallel
  const subs = await Promise.all(
    dirs.map((dir) => loadSubredditInfo(api, dir))
  );

  // Sort by item count descending
  subs.sort((a, b) => b.postCount - a.postCount);

  // Determine heading and depth
  const tracked = api.trackedDirectory.replace(/\/+$/, "");
  const current = rootPath.replace(/\/+$/, "");
  const isTopLevel = current === tracked;

  // Depth: 0 = top level (showing platform folders), 1+ = inside a platform
  const depth = isTopLevel
    ? 0
    : current.slice(tracked.length + 1).split("/").filter(Boolean).length;

  const heading = isTopLevel
    ? `${subs.length} archived`
    : `${rootPath.split("/").pop()} — ${subs.length} items`;

  container.innerHTML = `
    <div class="reddit-section-heading">${escapeHtml(heading)}</div>
    <div class="reddit-grid">
      ${subs.map((s) => renderSubredditCard(s, depth)).join("")}
    </div>
  `;

  container.querySelectorAll<HTMLElement>(".reddit-card").forEach((card) => {
    card.addEventListener("click", () => {
      const path = card.dataset.path;
      if (path) onNavigate(path);
    });
  });
}
