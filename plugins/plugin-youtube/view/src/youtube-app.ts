import type { PluginViewAPI, FileEntry, ViewMode, VideoInfo } from "./types";
import { injectStyles } from "./styles";
import { renderLibraryView } from "./library-view";
import { renderChannelView } from "./channel-view";
import { renderVideoView, renderVideoViewForFile, destroyVideoView } from "./video-view";

/** Video file extensions */
const VIDEO_RE = /\.(mkv|mp4|webm|m4v|avi|mov|flv|wmv)$/i;

/** Detect the view mode from directory contents */
async function detectViewMode(
  api: PluginViewAPI,
  entries: FileEntry[]
): Promise<ViewMode> {
  const dirs = entries.filter((e) => e.isDirectory && !e.name.endsWith(".trickplay"));
  const files = entries.filter((e) => !e.isDirectory);

  const videoFiles = files.filter((f) => VIDEO_RE.test(f.name));
  const hasInfoJson = files.some((f) => f.name.endsWith(".info.json"));

  if (videoFiles.length > 0 || hasInfoJson) {
    if (videoFiles.length > 1) {
      return "channel";
    }
    if (videoFiles.length === 1 && dirs.length === 0) {
      return "video";
    }
    if (videoFiles.length >= 1 && dirs.length > 0) {
      return "channel";
    }
    if (videoFiles.length === 0 && hasInfoJson && dirs.length > 0) {
      return "channel";
    }
    return "video";
  }

  if (dirs.length === 0) {
    return "library";
  }

  try {
    const firstChild = dirs[0];
    const childEntries = await api.fetchFiles(firstChild.path);
    const childFiles = childEntries.filter((e) => !e.isDirectory);

    const childHasVideo = childFiles.some((f) => VIDEO_RE.test(f.name));
    const childHasInfoJson = childFiles.some((f) => f.name.endsWith(".info.json"));

    if (childHasVideo || childHasInfoJson) {
      return "channel";
    }

    return "library";
  } catch {
    return "library";
  }
}

/** Internal navigation state — either viewing the directory normally, or viewing a specific video inline */
interface InlineVideoState {
  video: VideoInfo;
  /** The directory path the user was on before drilling into this video */
  returnPath: string;
}

export class YouTubeApp {
  private container: HTMLElement;
  private api: PluginViewAPI;
  private contentEl: HTMLElement;
  private renderGeneration = 0;
  /** When set, we're showing an inline video detail instead of the normal directory view */
  private inlineVideo: InlineVideoState | null = null;
  /** Bound popstate handler so we can remove it on destroy */
  private popstateHandler: ((e: PopStateEvent) => void) | null = null;

  constructor(container: HTMLElement, api: PluginViewAPI) {
    this.container = container;
    this.api = api;

    this.container.innerHTML = "";
    this.container.classList.add("yt-view");
    injectStyles(this.container);

    this.contentEl = document.createElement("div");
    this.container.appendChild(this.contentEl);

    // Listen for browser back/forward to handle inline video pop
    this.popstateHandler = (e: PopStateEvent) => {
      if (this.inlineVideo) {
        // We're in inline video mode — intercept back to pop back to channel list
        this.inlineVideo = null;
        this.render();
      }
    };
    window.addEventListener("popstate", this.popstateHandler);

    this.render();
  }

  /** Top-level render — checks if we're in inline video mode or normal directory mode */
  private async render(): Promise<void> {
    if (this.inlineVideo) {
      await this.renderInlineVideo(this.inlineVideo);
    } else {
      await this.renderDirectory();
    }
  }

  /** Render the normal directory-based view (library / channel / video) */
  private async renderDirectory(): Promise<void> {
    const generation = ++this.renderGeneration;
    const { currentPath, trackedDirectory } = this.api;

    destroyVideoView();
    this.contentEl.innerHTML = "";

    const tracked = trackedDirectory.replace(/\/+$/, "");
    const current = currentPath.replace(/\/+$/, "");
    const isRoot = current === tracked;

    if (!isRoot) {
      this.contentEl.appendChild(
        this.buildBreadcrumb(currentPath, trackedDirectory)
      );
    }

    const viewContainer = document.createElement("div");
    viewContainer.innerHTML = `<div class="yt-loading">Loading...</div>`;
    this.contentEl.appendChild(viewContainer);

    const rawEntries = await this.api.fetchFiles(currentPath);
    if (generation !== this.renderGeneration) return;

    const entries = rawEntries.filter(
      (e) => !(e.isDirectory && e.name.endsWith(".trickplay"))
    );

    const viewMode = await detectViewMode(this.api, entries);
    if (generation !== this.renderGeneration) return;

    viewContainer.innerHTML = "";

    switch (viewMode) {
      case "library":
        await renderLibraryView(
          viewContainer,
          this.api,
          currentPath,
          entries,
          (path) => this.api.navigate(path)
        );
        break;

      case "channel":
        await renderChannelView(
          viewContainer,
          this.api,
          currentPath,
          entries,
          (path) => this.api.navigate(path),
          (video) => this.pushVideo(video)
        );
        break;

      case "video":
        await renderVideoView(
          viewContainer,
          this.api,
          currentPath,
          entries
        );
        break;
    }
  }

  /** Push into inline video mode — adds a browser history entry so back button works */
  private pushVideo(video: VideoInfo): void {
    this.inlineVideo = {
      video,
      returnPath: this.api.currentPath,
    };
    // Push a history entry so the browser back button can pop us out
    history.pushState({ ytInlineVideo: true }, "");
    this.render();
  }

  /** Render the inline video detail view with a back-capable breadcrumb */
  private async renderInlineVideo(state: InlineVideoState): Promise<void> {
    const generation = ++this.renderGeneration;
    const { video, returnPath } = state;

    destroyVideoView();
    this.contentEl.innerHTML = "";

    // Build breadcrumb showing full path: all segments clickable, video title at end
    // Get the folder name from returnPath for display
    const breadcrumb = document.createElement("div");
    breadcrumb.className = "yt-breadcrumb";

    // Clickable folder name that pops back to the channel list
    const folderName = returnPath.split("/").pop() || returnPath;
    const folderLink = document.createElement("span");
    folderLink.className = "yt-breadcrumb-link";
    folderLink.textContent = decodeURIComponent(folderName);
    folderLink.addEventListener("click", () => {
      this.inlineVideo = null;
      this.render();
    });
    breadcrumb.appendChild(folderLink);

    // Separator + video title (non-clickable, current location)
    const sep = document.createElement("span");
    sep.className = "yt-breadcrumb-sep";
    sep.textContent = "/";
    breadcrumb.appendChild(sep);
    const videoLabel = document.createElement("span");
    videoLabel.className = "yt-breadcrumb-current";
    videoLabel.textContent = video.info?.title || video.stem;
    breadcrumb.appendChild(videoLabel);

    this.contentEl.appendChild(breadcrumb);

    const viewContainer = document.createElement("div");
    this.contentEl.appendChild(viewContainer);

    if (generation !== this.renderGeneration) return;

    await renderVideoViewForFile(
      viewContainer,
      this.api,
      returnPath,
      video
    );
  }

  /** Build a standard breadcrumb for directory views */
  private buildBreadcrumb(
    currentPath: string,
    trackedDirectory: string
  ): HTMLElement {
    const breadcrumb = document.createElement("div");
    breadcrumb.className = "yt-breadcrumb";

    const tracked = trackedDirectory.replace(/\/+$/, "");
    const current = currentPath.replace(/\/+$/, "");

    const rootLink = document.createElement("span");
    rootLink.className = "yt-breadcrumb-link";
    rootLink.textContent = "Library";
    rootLink.addEventListener("click", () => this.api.navigate(tracked));
    breadcrumb.appendChild(rootLink);

    if (current !== tracked) {
      const relative = current.startsWith(tracked + "/")
        ? current.slice(tracked.length + 1)
        : "";
      const parts = relative.split("/").filter(Boolean);

      parts.forEach((part, i) => {
        const sep = document.createElement("span");
        sep.className = "yt-breadcrumb-sep";
        sep.textContent = "/";
        breadcrumb.appendChild(sep);

        if (i < parts.length - 1) {
          const link = document.createElement("span");
          link.className = "yt-breadcrumb-link";
          link.textContent = decodeURIComponent(part);
          const linkPath = tracked + "/" + parts.slice(0, i + 1).join("/");
          link.addEventListener("click", () => this.api.navigate(linkPath));
          breadcrumb.appendChild(link);
        } else {
          const span = document.createElement("span");
          span.className = "yt-breadcrumb-current";
          span.textContent = decodeURIComponent(part);
          breadcrumb.appendChild(span);
        }
      });
    }

    return breadcrumb;
  }

  onPathChange(newPath: string, api: PluginViewAPI): void {
    this.api = api;
    // If the host navigated us to a new path, clear any inline video state
    this.inlineVideo = null;
    this.render();
  }

  destroy(): void {
    destroyVideoView();
    this.inlineVideo = null;
    if (this.popstateHandler) {
      window.removeEventListener("popstate", this.popstateHandler);
      this.popstateHandler = null;
    }
    this.container.classList.remove("yt-view");
    this.container.innerHTML = "";
  }
}
