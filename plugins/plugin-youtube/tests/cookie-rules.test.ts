import assert from "node:assert/strict";
import test from "node:test";
import { resolveCookieFileForUrl } from "../cookie-rules";
import type { PluginSettingsAccessor } from "../plugin-api";

function settings(values: Record<string, string | undefined>): PluginSettingsAccessor {
  return {
    get<T = string>(key: string): T {
      return (values[key] ?? "") as T;
    },
    async set() {
      throw new Error("not implemented");
    },
  };
}

test("uses the most specific matching site cookie file", () => {
  const result = resolveCookieFileForUrl(
    settings({
      cookies_file: "/cookies/global.txt",
      site_cookies: JSON.stringify({
        "youtube.com": "/cookies/youtube.txt",
        "music.youtube.com": "/cookies/music.txt",
      }),
    }),
    "https://music.youtube.com/watch?v=abc"
  );

  assert.equal(result, "/cookies/music.txt");
});

test("falls back to the global cookie file when no site rule matches", () => {
  const result = resolveCookieFileForUrl(
    settings({
      cookies_file: "/cookies/global.txt",
      site_cookies: JSON.stringify({
        "youtube.com": "/cookies/youtube.txt",
      }),
    }),
    "https://vimeo.com/123"
  );

  assert.equal(result, "/cookies/global.txt");
});

