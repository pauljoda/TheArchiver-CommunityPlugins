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

type ViewMode = "root" | "post-list" | "post";
type Platform = "reddit" | "bluesky" | "twitter" | "unknown";

interface ViewInfo {
  mode: ViewMode;
  platform: Platform;
}

type ViewCleanup = () => void;

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

  /** When non-null, we're showing an inline post detail over the hidden timeline */
  private inlinePostPath: string | null = null;
  /** The timeline container (hidden when viewing a post) */
  private timelineEl: HTMLElement | null = null;
  /** The breadcrumb for the timeline view */
  private timelineBreadcrumb: HTMLElement | null = null;
  /** Container for the inline post detail */
  private postOverlay: HTMLElement | null = null;
  /** Saved scroll position from the timeline */
  private savedScrollTop = 0;
  /** The directory path the current view was rendered for */
  private currentDirPath: string | null = null;

  constructor(container: HTMLElement, api: PluginViewAPI) {
    this.container = container;
    this.api = this.cache.wrap(api);

    this.container.innerHTML = "";
    this.container.classList.add("reddit-view");
    injectStyles(this.container);

    this.contentEl = document.createElement("div");
    this.container.appendChild(this.contentEl);

    this.renderDirectory();
  }

  /** Render the current directory view (root / post-list / post) */
  private async renderDirectory(): Promise<void> {
    // Clean up old state
    this.viewCleanup?.();
    this.viewCleanup = undefined;
    this.timelineEl = null;
    this.timelineBreadcrumb = null;
    this.inlinePostPath = null;
    if (this.postOverlay) {
      this.postOverlay.remove();
      this.postOverlay = null;
    }

    this.contentEl.innerHTML = "";

    const { currentPath, trackedDirectory } = this.api;
    this.currentDirPath = currentPath.replace(/\/+$/, "");
    const tracked = trackedDirectory.replace(/\/+$/, "");
    const current = this.currentDirPath;
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
        // Pass our pushPost handler instead of api.navigate for post drill-down
        const onPostClick = (path: string) => this.pushPost(path);

        let cleanup: ViewCleanup | undefined;
        if (viewInfo.platform === "bluesky") {
          cleanup = await renderBlueskyTimeline(
            viewContainer,
            this.api,
            currentPath,
            onPostClick
          );
        } else if (viewInfo.platform === "twitter") {
          cleanup = await renderTwitterTimeline(
            viewContainer,
            this.api,
            currentPath,
            onPostClick
          );
        } else {
          cleanup = await renderRedditTimeline(
            viewContainer,
            this.api,
            currentPath,
            onPostClick
          );
        }
        this.viewCleanup = cleanup;

        // Cache this timeline for instant back-navigation
        this.timelineEl = viewContainer;
        this.timelineBreadcrumb = breadcrumbEl;
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

  /** Push into inline post mode — hides the timeline, shows the post */
  private pushPost(postPath: string): void {
    const scrollParent = findScrollParent(this.contentEl);
    this.savedScrollTop = scrollParent.scrollTop;
    this.inlinePostPath = postPath;
    this.showInlinePost(postPath);
  }

  /** Pop back to the timeline — restores scroll position */
  private popPost(): void {
    this.inlinePostPath = null;

    // Remove post overlay
    if (this.postOverlay) {
      this.postOverlay.remove();
      this.postOverlay = null;
    }

    // Show cached timeline
    if (this.timelineEl) {
      this.timelineEl.style.display = "";
    }
    if (this.timelineBreadcrumb) {
      this.timelineBreadcrumb.style.display = "";
    }

    // Restore scroll position
    const scrollParent = findScrollParent(this.contentEl);
    const target = this.savedScrollTop;
    requestAnimationFrame(() => {
      scrollParent.scrollTop = target;
    });
  }

  /** Render the inline post detail over the hidden timeline */
  private async showInlinePost(postPath: string): Promise<void> {
    // Hide the timeline
    if (this.timelineEl) {
      this.timelineEl.style.display = "none";
    }
    if (this.timelineBreadcrumb) {
      this.timelineBreadcrumb.style.display = "none";
    }

    // Remove old overlay if any
    if (this.postOverlay) {
      this.postOverlay.remove();
    }

    // Build post overlay
    this.postOverlay = document.createElement("div");

    // Breadcrumb — clicking any segment pops back to the timeline
    const { trackedDirectory } = this.api;
    const breadcrumb = renderBreadcrumb(
      postPath,
      trackedDirectory,
      () => this.popPost()
    );
    this.postOverlay.appendChild(breadcrumb);

    const postContainer = document.createElement("div");
    this.postOverlay.appendChild(postContainer);
    this.contentEl.appendChild(this.postOverlay);

    // Scroll to top for the post
    const scrollParent = findScrollParent(this.contentEl);
    scrollParent.scrollTop = 0;

    // Detect platform and render
    const entries = await this.api.fetchFiles(postPath);
    const viewInfo = await detectViewInfo(this.api, postPath, entries);

    // Bail if user already popped back while we were loading
    if (this.inlinePostPath !== postPath) return;

    if (viewInfo.mode === "post") {
      if (viewInfo.platform === "bluesky") {
        await renderBlueskyPostDetail(postContainer, this.api, postPath);
      } else if (viewInfo.platform === "twitter") {
        await renderTwitterPostDetail(postContainer, this.api, postPath);
      } else {
        await renderPostDetail(postContainer, this.api, postPath);
      }
    }
  }

  onPathChange(newPath: string, api: PluginViewAPI): void {
    this.api = this.cache.wrap(api);
    const newDir = newPath.replace(/\/+$/, "");

    // Same path — skip (host re-emitting, or no real change)
    if (newDir === this.currentDirPath) {
      return;
    }

    // Actually different path — full re-render
    this.renderDirectory();
  }

  destroy(): void {
    this.viewCleanup?.();
    this.viewCleanup = undefined;
    this.inlinePostPath = null;
    this.timelineEl = null;
    this.timelineBreadcrumb = null;
    if (this.postOverlay) {
      this.postOverlay.remove();
      this.postOverlay = null;
    }
    this.cache.clear();
    this.container.classList.remove("reddit-view");
    this.container.innerHTML = "";
  }
}
