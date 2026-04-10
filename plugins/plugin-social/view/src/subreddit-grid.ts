import type { PluginViewAPI, SubredditInfo } from "./types";
import { fetchPostMetadata } from "./nfo-parser";
import { mapLimit, nextFrame } from "./async-utils";
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

/**
 * Cheap "does this folder have any real content?" probe. Returns true when
 * the folder is effectively empty (only metadata files like `icon.png`, no
 * sub-directories, no post data). Used to pre-filter the grid so icon-only
 * folders left behind by the upvoted-run icon fetcher never become cards
 * in the first place — which eliminates the render-then-remove flicker.
 *
 * A single `fetchFiles` call per folder is cheap enough to run with
 * concurrency against ~dozens of folders upfront.
 */
async function isFolderEmpty(
  api: PluginViewAPI,
  dirPath: string
): Promise<boolean> {
  try {
    const files = await api.fetchFiles(dirPath);
    const hasDirs = files.some((f) => f.isDirectory);
    const hasRealFiles = files.some(
      (f) => !f.isDirectory && !METADATA_FILES.has(f.name)
    );
    return !hasDirs && !hasRealFiles;
  } catch {
    // If we can't list the folder, treat it as non-empty so we don't
    // accidentally hide folders the user actually cares about.
    return false;
  }
}

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
  // A folder is "empty" if it has no sub-directories and no non-metadata
  // files. This catches icon-only leftovers from the upvoted-run subreddit
  // icon fetcher (`<redditRoot>/<subreddit>/icon.png` with no posts inside).
  const isEmpty = dirs.length === 0 && contentFiles.length === 0;
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
    isEmpty,
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

function createSubredditCard(
  entry: { name: string; path: string }
): HTMLElement {
  const card = document.createElement("div");
  card.className = "reddit-card reddit-card-loading";
  card.dataset.path = entry.path;

  card.innerHTML = `
    <div class="reddit-card-preview-slot">
      ${renderPreview({ type: "empty" }, false)}
    </div>
    <div class="reddit-card-body">
      <div class="reddit-card-title">${escapeHtml(entry.name)}</div>
      <div class="reddit-card-meta">
        <span class="reddit-card-meta-item">Loading…</span>
      </div>
    </div>
  `;

  return card;
}

function updateSubredditCard(card: HTMLElement, sub: SubredditInfo): void {
  const previewSlot = card.querySelector<HTMLElement>(".reddit-card-preview-slot");
  const title = card.querySelector<HTMLElement>(".reddit-card-title");
  const meta = card.querySelector<HTMLElement>(".reddit-card-meta");

  if (previewSlot) {
    previewSlot.innerHTML = renderPreview(sub.preview, false);
  }
  if (title) {
    // Just use the folder name as it lives on disk — no "r/" / "u/" / "@"
    // prefixing. The previous logic mis-guessed user folders and special
    // subfolders like "Upvoted", so dropping it entirely gives the user
    // exactly what they see on disk.
    title.textContent = sub.name;
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
  const allDirs = entries.filter((e) => e.isDirectory);

  if (allDirs.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">📭</div>
        <span>No content found</span>
      </div>
    `;
    return;
  }

  // ── Pre-filter pass: drop icon-only / fully-empty folders BEFORE rendering ──
  // These are leftovers from the upvoted-run subreddit icon fetcher. Hiding
  // them during the hydration pass (as we did before) caused a visible
  // render-then-remove cascade. Probing upfront with a single concurrent
  // fetchFiles-per-dir costs ~50-200ms on local disk for ~50 folders, which
  // is worth paying for a clean render.
  container.innerHTML = `<div class="reddit-loading">Loading…</div>`;

  const emptyFlags = await mapLimit(allDirs, 8, (dir) =>
    isFolderEmpty(api, dir.path)
  );
  const dirs = allDirs.filter((_dir, i) => !emptyFlags[i]);

  if (dirs.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">📭</div>
        <span>No content found</span>
      </div>
    `;
    return;
  }

  // Heading
  const tracked = api.trackedDirectory.replace(/\/+$/, "");
  const current = rootPath.replace(/\/+$/, "");
  const isTopLevel = current === tracked;

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
    const card = createSubredditCard(dir);
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
            updateSubredditCard(card, info);
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
