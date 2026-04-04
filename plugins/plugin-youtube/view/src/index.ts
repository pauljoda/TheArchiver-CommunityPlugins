import { YouTubeApp } from "./youtube-app";
import type { PluginViewAPI, PluginViewRegistration } from "./types";

declare global {
  interface Window {
    __archiver_register_view?: (
      viewId: string,
      registration: PluginViewRegistration
    ) => void;
  }
}

let app: YouTubeApp | null = null;

window.__archiver_register_view?.("youtube-browser", {
  render(container: HTMLElement, api: PluginViewAPI) {
    app = new YouTubeApp(container, api);
  },
  destroy() {
    app?.destroy();
    app = null;
  },
  onPathChange(newPath: string, api: PluginViewAPI) {
    app?.onPathChange(newPath, api);
  },
});
