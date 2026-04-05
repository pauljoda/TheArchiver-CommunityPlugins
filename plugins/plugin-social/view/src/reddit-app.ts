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

export class RedditApp {
  private container: HTMLElement;
  private api: PluginViewAPI;
  private contentEl: HTMLElement;
  private viewCleanup?: ViewCleanup;

  constructor(container: HTMLElement, api: PluginViewAPI) {
    this.container = container;
    this.api = api;

    this.container.innerHTML = "";
    this.container.classList.add("reddit-view");
    injectStyles(this.container);

    this.contentEl = document.createElement("div");
    this.container.appendChild(this.contentEl);

    this.renderCurrentPath();
  }

  async renderCurrentPath(): Promise<void> {
    this.viewCleanup?.();
    this.viewCleanup = undefined;

    const { currentPath, trackedDirectory } = this.api;

    this.contentEl.innerHTML = "";

    const tracked = trackedDirectory.replace(/\/+$/, "");
    const current = currentPath.replace(/\/+$/, "");
    const isRoot = current === tracked;

    if (!isRoot) {
      const breadcrumb = renderBreadcrumb(
        currentPath,
        trackedDirectory,
        (path) => this.api.navigate(path)
      );
      this.contentEl.appendChild(breadcrumb);
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

      case "post-list":
        if (viewInfo.platform === "bluesky") {
          this.viewCleanup = await renderBlueskyTimeline(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          );
        } else if (viewInfo.platform === "twitter") {
          this.viewCleanup = await renderTwitterTimeline(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          );
        } else {
          this.viewCleanup = await renderRedditTimeline(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          );
        }
        break;

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

  onPathChange(newPath: string, api: PluginViewAPI): void {
    this.api = api;
    this.renderCurrentPath();
  }

  destroy(): void {
    this.viewCleanup?.();
    this.viewCleanup = undefined;
    this.container.classList.remove("reddit-view");
    this.container.innerHTML = "";
  }
}
