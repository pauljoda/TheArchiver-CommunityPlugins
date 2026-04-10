import type { PluginViewAPI, SubredditInfo } from "./types";
import { fetchPostMetadata } from "./nfo-parser";
import { nextFrame } from "./async-utils";
import { isImageFile } from "../../../_shared/view/media-player";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
    const firstChild = [...dirs].sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    )[0];
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
      // Children are posts — inspect the newest child only so folder grids
      // paint quickly instead of recursively scanning the whole subtree.
      try {
        const postFiles = await api.fetchFiles(firstChild.path);
        const img = postFiles.find(
          (f) => !f.isDirectory && isImageFile(f.name)
        );

        if (img) {
          preview = {
            type: "image",
            src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
          };
        } else {
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
        }
      } catch {
        // fall through to empty
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

function getDisplayName(sub: Pick<SubredditInfo, "name" | "path">, depth: number): string {
  const nameLower = sub.name.toLowerCase();
  const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
  const isUser =
    !isPlatformFolder && (sub.name.startsWith("u_") || sub.name.startsWith("u/"));

  if (isPlatformFolder || depth === 0) {
    // Top-level: platform folders like "Reddit", "Bluesky", "Twitter" — no prefix
    return sub.name;
  }

  if (isUser) {
    return "u/" + sub.name.replace(/^u[_/]/, "");
  }

  // Inside a platform folder — use platform-appropriate prefix
  const pathLower = sub.path.toLowerCase();
  const inBluesky = pathLower.includes("/bluesky/");
  const inTwitter = pathLower.includes("/twitter/");
  return inBluesky || inTwitter ? "@" + sub.name : "r/" + sub.name;
}

function createSubredditCard(
  entry: { name: string; path: string },
  depth: number
): HTMLElement {
  const card = document.createElement("div");
  card.className = "reddit-card reddit-card-loading";
  card.dataset.path = entry.path;

  const displayName = getDisplayName(entry, depth);
  const nameLower = entry.name.toLowerCase();
  const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
  const isUser =
    !isPlatformFolder && (entry.name.startsWith("u_") || entry.name.startsWith("u/"));

  card.innerHTML = `
    <div class="reddit-card-preview-slot">
      ${renderPreview({ type: "empty" }, isUser)}
    </div>
    <div class="reddit-card-body">
      <div class="reddit-card-title">${escapeHtml(displayName)}</div>
      <div class="reddit-card-meta">
        <span class="reddit-card-meta-item">Loading…</span>
      </div>
    </div>
  `;

  return card;
}

function updateSubredditCard(
  card: HTMLElement,
  sub: SubredditInfo,
  depth: number
): void {
  const nameLower = sub.name.toLowerCase();
  const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
  const isUser =
    !isPlatformFolder && (sub.name.startsWith("u_") || sub.name.startsWith("u/"));

  const previewSlot = card.querySelector<HTMLElement>(".reddit-card-preview-slot");
  const title = card.querySelector<HTMLElement>(".reddit-card-title");
  const meta = card.querySelector<HTMLElement>(".reddit-card-meta");

  if (previewSlot) {
    previewSlot.innerHTML = renderPreview(sub.preview, isUser);
  }
  if (title) {
    title.textContent = getDisplayName(sub, depth);
  }
  if (meta) {
    meta.innerHTML = `
      <span class="reddit-card-meta-item">
        ${sub.postCount} ${sub.postCount === 1 ? "item" : "items"}
      </span>
    `;
  }

  card.classList.remove("reddit-card-loading");
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

  // Determine heading and depth
  const tracked = api.trackedDirectory.replace(/\/+$/, "");
  const current = rootPath.replace(/\/+$/, "");
  const isTopLevel = current === tracked;

  // Depth: 0 = top level (showing platform folders), 1+ = inside a platform
  const depth = isTopLevel
    ? 0
    : current.slice(tracked.length + 1).split("/").filter(Boolean).length;

  const heading = isTopLevel
    ? `${dirs.length} archived`
    : `${rootPath.split("/").pop()} — ${dirs.length} items`;

  container.innerHTML = "";

  const headingEl = document.createElement("div");
  headingEl.className = "reddit-section-heading";
  headingEl.textContent = heading;
  container.appendChild(headingEl);

  const grid = document.createElement("div");
  grid.className = "reddit-grid";
  container.appendChild(grid);

  const cardsByPath = new Map<string, HTMLElement>();
  const entriesByPath = new Map<string, { name: string; path: string }>();

  dirs.forEach((dir) => {
    entriesByPath.set(dir.path, dir);
    const card = createSubredditCard(dir, depth);
    cardsByPath.set(dir.path, card);
    grid.appendChild(card);
  });

  grid.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>(".reddit-card");
    const path = card?.dataset.path;
    if (path) {
      onNavigate(path);
    }
  });

  const hydrateQueue: Array<{ name: string; path: string }> = [];
  const queuedPaths = new Set<string>();
  let activeHydrators = 0;

  async function pumpHydrators(): Promise<void> {
    while (activeHydrators < 6 && hydrateQueue.length > 0) {
      const entry = hydrateQueue.shift();
      if (!entry) {
        break;
      }

      activeHydrators += 1;
      void (async () => {
        try {
          const info = await loadSubredditInfo(api, entry);
          const card = cardsByPath.get(entry.path);
          if (card?.isConnected) {
            updateSubredditCard(card, info, depth);
          }
        } finally {
          activeHydrators -= 1;
          queuedPaths.delete(entry.path);
          void pumpHydrators();
        }
      })();
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }

        const card = entry.target as HTMLElement;
        const path = card.dataset.path;
        if (!path || queuedPaths.has(path)) {
          observer.unobserve(card);
          continue;
        }

        const dir = entriesByPath.get(path);
        if (dir) {
          hydrateQueue.push(dir);
          queuedPaths.add(path);
          void pumpHydrators();
        }

        observer.unobserve(card);
      }
    },
    { rootMargin: "600px" }
  );

  cardsByPath.forEach((card) => observer.observe(card));

  dirs.slice(0, 8).forEach((dir) => {
    if (!queuedPaths.has(dir.path)) {
      hydrateQueue.push(dir);
      queuedPaths.add(dir.path);
    }
  });
  await nextFrame();
  void pumpHydrators();
}
