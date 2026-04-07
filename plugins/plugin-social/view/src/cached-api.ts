import type { FileEntry, PluginViewAPI } from "./types";

interface CachedFilePayload {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: ArrayBuffer | null;
}

function shouldCacheFile(path: string): boolean {
  return /\.(json|nfo|xml|txt)$/i.test(path);
}

export class SocialViewCache {
  private readonly directoryCache = new Map<string, Promise<FileEntry[]>>();
  private readonly fileCache = new Map<string, Promise<CachedFilePayload>>();

  wrap(api: PluginViewAPI): PluginViewAPI {
    return {
      ...api,
      fetchFiles: (path: string) => this.fetchFiles(api, path),
      fetchFile: (path: string) => this.fetchFile(api, path),
    };
  }

  clear(): void {
    this.directoryCache.clear();
    this.fileCache.clear();
  }

  private fetchFiles(api: PluginViewAPI, path: string): Promise<FileEntry[]> {
    const cached = this.directoryCache.get(path);
    if (cached) {
      return cached;
    }

    const pending = api.fetchFiles(path);
    this.directoryCache.set(path, pending);
    return pending;
  }

  private async fetchFile(
    api: PluginViewAPI,
    path: string
  ): Promise<Response> {
    if (!shouldCacheFile(path)) {
      return api.fetchFile(path);
    }

    const cached = this.fileCache.get(path);
    const payloadPromise =
      cached ??
      api.fetchFile(path).then(async (response) => ({
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        body: response.ok ? await response.arrayBuffer() : null,
      }));

    if (!cached) {
      this.fileCache.set(path, payloadPromise);
    }

    const payload = await payloadPromise;

    return new Response(payload.body ? payload.body.slice(0) : null, {
      status: payload.status,
      statusText: payload.statusText,
      headers: payload.headers,
    });
  }
}
