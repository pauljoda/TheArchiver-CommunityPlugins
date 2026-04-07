import type { PluginViewAPI, FileEntry } from "./types";
import { injectStyles } from "./styles";
import { renderSubredditGrid } from "./subreddit-grid";
import { renderRedditTimeline } from "./reddit-timeline";
import { renderPostDetail } from "./post-detail";
import { renderBlueskyTimeline } from "./bluesky-timeline";
import { renderBlueskyPostDetail } from "./bluesky-post-detail";
import { renderTwitterTimeline } from "./twitter-timeline";
import { renderTwitterPostDetail } from "./twitter-post-detail";
import { detectNfoPlatform } from "./nfo-parser";
import { SocialViewCache } from "./cached-api";

/** Files that are directory metadata, not post content */
const METADATA_FILES = new Set([
  "icon.jpg",
  "icon.png",
  "icon.webp",
  ".no-icon",
]);

/**
 * Determine what kind of directory we're looking at by inspecting its contents.
 *
 * - "root": contains only subdirectories (+ optional metadata like icon.jpg)
 * - "post-list": contains subdirectories that are posts (have Post.nfo or media)
 * - "post": contains Post.nfo, Comments.json, or media files — this IS a post
 */
type ViewMode = "root" | "post-list" | "post";
type Platform = "reddit" | "bluesky" | "twitter" | "unknown";

interface ViewInfo {
  mode: ViewMode;
  platform: Platform;
}

type ViewCleanup = () => void;

/** Cached timeline state — kept alive so we can restore on back-navigation */
interface CachedTimeline {
  /** The path this timeline was rendered for */
  path: string;
  /** The DOM container holding the timeline (hidden when viewing a post) */
  container: HTMLElement;
  /** The breadcrumb element above the timeline */
  breadcrumb: HTMLElement | null;
  /** Cleanup function from the timeline renderer */
  cleanup?: ViewCleanup;
  /** Scroll position (on the container's scroll parent) when user left */
  scrollTop: number;
}

async function detectViewInfo(
  api: PluginViewAPI,
  dirPath: string,
  entries: FileEntry[]
): Promise<ViewInfo> {
  const dirs = entries.filter((e) => e.isDirectory);
  const contentFiles = entries.filter(
    (e) => !e.isDirectory && !METADATA_FILES.has(e.name)
  );

  const hasNfo = contentFiles.some((f) => f.name === "Post.nfo");
  const hasComments = contentFiles.some((f) => f.name === "Comments.json");
  const hasMedia = contentFiles.some((f) =>
    /\.(jpe?g|png|gif|webp|bmp|avif|mp4|webm|mov|avi|mkv)$/i.test(f.name)
  );

  if (hasNfo || hasComments || hasMedia) {
    const platform = hasNfo
      ? (await detectNfoPlatform(api, dirPath)) || "reddit"
      : "reddit";
    return { mode: "post", platform };
  }

  if (dirs.length === 0) {
    return { mode: "root", platform: "unknown" };
  }

  // Sample the first child directory
  try {
    const firstChild = dirs[0];
    const childEntries = await api.fetchFiles(firstChild.path);
    const childContentFiles = childEntries.filter(
      (e) => !e.isDirectory && !METADATA_FILES.has(e.name)
    );

    const childHasNfo = childContentFiles.some(
      (e) => e.name === "Post.nfo"
    );
    const childHasMedia = childContentFiles.some((e) =>
      /\.(jpe?g|png|gif|webp|bmp|avif|mp4|webm|mov|avi|mkv)$/i.test(e.name)
    );

    if (childHasNfo || childHasMedia) {
      const platform = childHasNfo
        ? (await detectNfoPlatform(api, firstChild.path)) || "reddit"
        : "reddit";
      return { mode: "post-list", platform };
    }

    if (childContentFiles.length === 0) {
      return { mode: "root", platform: "unknown" };
    }

    return { mode: "post-list", platform: "unknown" };
  } catch {
    return { mode: "root", platform: "unknown" };
  }
}

function renderBreadcrumb(
  currentPath: string,
  trackedDirectory: string,
  navigate: (path: string) => void
): HTMLElement {
  const breadcrumb = document.createElement("div");
  breadcrumb.className = "reddit-breadcrumb";

  const tracked = trackedDirectory.replace(/\/+$/, "");
  const current = currentPath.replace(/\/+$/, "");

  const rootLink = document.createElement("span");
  rootLink.className = "reddit-breadcrumb-link";
  rootLink.textContent = tracked;
  rootLink.addEventListener("click", () => navigate(tracked));
  breadcrumb.appendChild(rootLink);

  if (current !== tracked) {
    const relative = current.startsWith(tracked + "/")
      ? current.slice(tracked.length + 1)
      : "";
    const parts = relative.split("/").filter(Boolean);

    parts.forEach((part, i) => {
      const sep = document.createElement("span");
      sep.className = "reddit-breadcrumb-sep";
      sep.textContent = "/";
      breadcrumb.appendChild(sep);

      if (i < parts.length - 1) {
        const link = document.createElement("span");
        link.className = "reddit-breadcrumb-link";
        link.textContent = part;
        const linkPath = tracked + "/" + parts.slice(0, i + 1).join("/");
        link.addEventListener("click", () => navigate(linkPath));
        breadcrumb.appendChild(link);
      } else {
        const span = document.createElement("span");
        span.className = "reddit-breadcrumb-current";
        span.textContent = part;
        breadcrumb.appendChild(span);
      }
    });
  }

  return breadcrumb;
}

/** Find the nearest scrollable ancestor of an element */
function findScrollParent(el: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === "auto" || overflow === "scroll") return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

export class RedditApp {
  private container: HTMLElement;
  private api: PluginViewAPI;
  private contentEl: HTMLElement;
  private viewCleanup?: ViewCleanup;
  private readonly cache = new SocialViewCache();
  /** Cached timeline that's hidden while viewing a post */
  private cachedTimeline: CachedTimeline | null = null;
  /** The post detail container shown over a cached timeline */
  private postOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement, api: PluginViewAPI) {
    this.container = container;
    this.api = this.cache.wrap(api);

    this.container.innerHTML = "";
    this.container.classList.add("reddit-view");
    injectStyles(this.container);

    this.contentEl = document.createElement("div");
    this.container.appendChild(this.contentEl);

    this.renderCurrentPath();
  }

  async renderCurrentPath(): Promise<void> {
    const { currentPath, trackedDirectory } = this.api;
    const current = currentPath.replace(/\/+$/, "");

    // ── Check if we can restore a cached timeline ──
    if (this.cachedTimeline && current === this.cachedTimeline.path) {
      // Going back to the cached timeline — restore it
      if (this.postOverlay) {
        this.postOverlay.remove();
        this.postOverlay = null;
      }
      // Clean up post-level cleanup if any
      this.viewCleanup?.();
      this.viewCleanup = this.cachedTimeline.cleanup;

      // Show the cached timeline
      this.cachedTimeline.container.style.display = "";
      if (this.cachedTimeline.breadcrumb) {
        this.cachedTimeline.breadcrumb.style.display = "";
      }

      // Restore scroll position
      const scrollParent = findScrollParent(this.contentEl);
      requestAnimationFrame(() => {
        scrollParent.scrollTop = this.cachedTimeline!.scrollTop;
      });
      return;
    }

    // ── Check if we're drilling into a post from a cached timeline ──
    if (
      this.cachedTimeline &&
      current.startsWith(this.cachedTimeline.path + "/")
    ) {
      // Save scroll position and hide timeline
      const scrollParent = findScrollParent(this.contentEl);
      this.cachedTimeline.scrollTop = scrollParent.scrollTop;
      this.cachedTimeline.container.style.display = "none";
      if (this.cachedTimeline.breadcrumb) {
        this.cachedTimeline.breadcrumb.style.display = "none";
      }

      // Render post detail in an overlay container
      this.postOverlay = document.createElement("div");

      // Add breadcrumb for the post
      const tracked = trackedDirectory.replace(/\/+$/, "");
      const isRoot = current === tracked;
      if (!isRoot) {
        const breadcrumb = renderBreadcrumb(
          currentPath,
          trackedDirectory,
          (path) => this.api.navigate(path)
        );
        this.postOverlay.appendChild(breadcrumb);
      }

      const postContainer = document.createElement("div");
      this.postOverlay.appendChild(postContainer);
      this.contentEl.appendChild(this.postOverlay);

      // Scroll to top for the post
      scrollParent.scrollTop = 0;

      const entries = await this.api.fetchFiles(currentPath);
      const viewInfo = await detectViewInfo(this.api, currentPath, entries);

      if (viewInfo.mode === "post") {
        if (viewInfo.platform === "bluesky") {
          await renderBlueskyPostDetail(postContainer, this.api, currentPath);
        } else if (viewInfo.platform === "twitter") {
          await renderTwitterPostDetail(postContainer, this.api, currentPath);
        } else {
          await renderPostDetail(postContainer, this.api, currentPath);
        }
      }
      return;
    }

    // ── Full navigation — destroy any cached state and render fresh ──
    this.destroyCachedTimeline();
    this.viewCleanup?.();
    this.viewCleanup = undefined;

    this.contentEl.innerHTML = "";

    const tracked = trackedDirectory.replace(/\/+$/, "");
    const isRoot = current === tracked;

    let breadcrumbEl: HTMLElement | null = null;
    if (!isRoot) {
      breadcrumbEl = renderBreadcrumb(
        currentPath,
        trackedDirectory,
        (path) => this.api.navigate(path)
      );
      this.contentEl.appendChild(breadcrumbEl);
    }

    const viewContainer = document.createElement("div");
    viewContainer.innerHTML = `<div class="reddit-loading">Loading...</div>`;
    this.contentEl.appendChild(viewContainer);

    const entries = await this.api.fetchFiles(currentPath);
    const viewInfo = await detectViewInfo(this.api, currentPath, entries);

    viewContainer.innerHTML = "";

    switch (viewInfo.mode) {
      case "root":
        await renderSubredditGrid(
          viewContainer,
          this.api,
          currentPath,
          (path) => this.api.navigate(path)
        );
        break;

      case "post-list": {
        let cleanup: ViewCleanup | undefined;
        if (viewInfo.platform === "bluesky") {
          cleanup = await renderBlueskyTimeline(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          );
        } else if (viewInfo.platform === "twitter") {
          cleanup = await renderTwitterTimeline(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          );
        } else {
          cleanup = await renderRedditTimeline(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          );
        }
        this.viewCleanup = cleanup;

        // Cache this timeline for instant back-navigation
        this.cachedTimeline = {
          path: current,
          container: viewContainer,
          breadcrumb: breadcrumbEl,
          cleanup,
          scrollTop: 0,
        };
        break;
      }

      case "post":
        if (viewInfo.platform === "bluesky") {
          await renderBlueskyPostDetail(viewContainer, this.api, currentPath);
        } else if (viewInfo.platform === "twitter") {
          await renderTwitterPostDetail(viewContainer, this.api, currentPath);
        } else {
          await renderPostDetail(viewContainer, this.api, currentPath);
        }
        break;
    }
  }

  private destroyCachedTimeline(): void {
    if (this.cachedTimeline) {
      this.cachedTimeline.cleanup?.();
      this.cachedTimeline = null;
    }
    if (this.postOverlay) {
      this.postOverlay.remove();
      this.postOverlay = null;
    }
  }

  onPathChange(newPath: string, api: PluginViewAPI): void {
    this.api = this.cache.wrap(api);
    this.renderCurrentPath();
  }

  destroy(): void {
    this.destroyCachedTimeline();
    this.viewCleanup?.();
    this.viewCleanup = undefined;
    this.cache.clear();
    this.container.classList.remove("reddit-view");
    this.container.innerHTML = "";
  }
}
