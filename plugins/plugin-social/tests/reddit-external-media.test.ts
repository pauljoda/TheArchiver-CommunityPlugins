import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { downloadReddit, hasExistingExternalMedia, maybeDownloadExternalMedia } from "../reddit";
import type { DownloadContext, RedditPost } from "../shared";

test("detects existing Imgur media so Reddit re-archives do not refresh it", async () => {
  const postDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-social-reddit-"));
  try {
    fs.writeFileSync(path.join(postDir, "imgur_abc123.jpg"), "original bytes");

    assert.equal(await hasExistingExternalMedia(postDir, "imgur"), true);
  } finally {
    fs.rmSync(postDir, { recursive: true, force: true });
  }
});

test("ignores non-media files and other external host prefixes", async () => {
  const postDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-social-reddit-"));
  try {
    fs.writeFileSync(path.join(postDir, "imgur_notes.txt"), "metadata");
    fs.writeFileSync(path.join(postDir, "redgifs_abc123.mp4"), "video bytes");

    assert.equal(await hasExistingExternalMedia(postDir, "imgur"), false);
  } finally {
    fs.rmSync(postDir, { recursive: true, force: true });
  }
});

test("skips gallery-dl for an Imgur Reddit post when archived Imgur media already exists", async () => {
  const postDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-social-reddit-"));
  const logs: string[] = [];
  try {
    fs.writeFileSync(path.join(postDir, "imgur_abc123.jpg"), "original bytes");

    const context = {
      helpers: {
        io: {
          ensureDir: async (dir: string) => {
            fs.mkdirSync(dir, { recursive: true });
          },
        },
      },
      logger: {
        info: (message: string) => { logs.push(message); },
        warn: (message: string) => { logs.push(message); },
        error: (message: string) => { logs.push(message); },
      },
    } as unknown as DownloadContext;
    const post = {
      url: "https://imgur.com/gallery/abc123",
    } as RedditPost;

    const downloaded = await maybeDownloadExternalMedia(context, post, postDir);

    assert.equal(downloaded, false);
    assert.ok(
      logs.some((message) =>
        message.includes("Existing imgur media already archived")
      )
    );
    assert.equal(
      fs.readFileSync(path.join(postDir, "imgur_abc123.jpg"), "utf8"),
      "original bytes"
    );
  } finally {
    fs.rmSync(postDir, { recursive: true, force: true });
  }
});

test("passes matched Reddit account cookies to upvoted post media and comment fetches", async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-social-reddit-"));
  const cookieText = [
    "# Netscape HTTP Cookie File",
    ".reddit.com\tTRUE\t/\tTRUE\t1893456000\treddit_session\tabc123",
  ].join("\n");
  const fetchCalls: Array<{ url: string; cookie?: string }> = [];
  const downloadCalls: Array<{ url: string; cookies?: string }> = [];
  const settingsStore = new Map<string, string>([
    ["save_directory", "Socials"],
    ["reddit_subfolder", "Reddit"],
    ["save_metadata", "true"],
    ["subreddit_post_count", "1"],
    ["reddit_account_1_username", "alice"],
    ["reddit_account_1_cookies_blob", cookieText],
  ]);

  try {
    const context = {
      url: "https://www.reddit.com/user/alice/upvoted",
      rootDirectory,
      maxDownloadThreads: 2,
      settings: {
        get: (key: string) => settingsStore.get(key) || "",
        set: async (key: string, value: string) => {
          settingsStore.set(key, value);
        },
      },
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      helpers: {
        http: {
          createRateLimiter: () => async (url: string, options?: RequestInit) => {
            const cookie = new Headers(options?.headers).get("cookie") || undefined;
            fetchCalls.push({ url, cookie });

            if (url.includes("/upvoted.json")) {
              return new Response(
                JSON.stringify({
                  kind: "Listing",
                  data: {
                    after: null,
                    before: null,
                    children: [
                      {
                        kind: "t3",
                        data: {
                          id: "post1",
                          name: "t3_post1",
                          title: "Cookie media post",
                          author: "bob",
                          subreddit: "privatepics",
                          subreddit_name_prefixed: "r/privatepics",
                          url: "https://i.redd.it/private.jpg",
                          permalink: "/r/privatepics/comments/post1/cookie_media_post/",
                          domain: "i.redd.it",
                          selftext: "inline https://i.redd.it/inline.jpg",
                          selftext_html: null,
                          score: 1,
                          upvote_ratio: 1,
                          num_comments: 1,
                          created_utc: 1,
                          edited: false,
                          over_18: true,
                          spoiler: false,
                          stickied: false,
                          locked: false,
                          archived: false,
                          is_video: false,
                          post_hint: "image",
                          link_flair_text: null,
                          author_flair_text: null,
                          thumbnail: "",
                          total_awards_received: 0,
                        },
                      },
                    ],
                  },
                }),
                { status: 200 }
              );
            }

            if (url.includes("/comments/post1.json")) {
              return new Response(
                JSON.stringify([
                  { kind: "Listing", data: { children: [] } },
                  {
                    kind: "Listing",
                    data: {
                      children: [
                        {
                          kind: "t1",
                          data: {
                            id: "comment1",
                            author: "carol",
                            body: "comment https://i.redd.it/comment.jpg",
                            body_html: null,
                            score: 1,
                            created_utc: 2,
                            edited: false,
                            is_submitter: false,
                            author_flair_text: null,
                            stickied: false,
                            distinguished: null,
                            depth: 0,
                            replies: "",
                          },
                        },
                      ],
                    },
                  },
                ]),
                { status: 200 }
              );
            }

            if (url.includes("/about.json")) {
              return new Response(JSON.stringify({ data: {} }), { status: 200 });
            }

            return new Response(JSON.stringify({}), { status: 404 });
          },
        },
        io: {
          ensureDir: async (dir: string) => {
            fs.mkdirSync(dir, { recursive: true });
          },
          fileExists: async (filePath: string) => fs.existsSync(filePath),
          downloadFiles: async (
            files: Array<{ url: string; outputPath: string }>,
            _concurrency?: number,
            options?: { cookies?: string }
          ) => {
            for (const file of files) {
              downloadCalls.push({ url: file.url, cookies: options?.cookies });
              fs.mkdirSync(path.dirname(file.outputPath), { recursive: true });
              fs.writeFileSync(file.outputPath, "downloaded");
            }
          },
          downloadFile: async (
            url: string,
            outputPath: string,
            options?: { cookies?: string }
          ) => {
            downloadCalls.push({ url, cookies: options?.cookies });
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, "downloaded");
          },
        },
        string: {
          sanitizeFilename: (input: string) => input.replace(/[\\/]/g, "_"),
          truncateTitle: (title: string) => title,
          filenameFromUrl: (url: string) => path.basename(new URL(url).pathname),
          getMimeExtension: () => "jpg",
          decodeHtmlEntities: (str: string) => str,
          buildFilename: (text: string, ext: string) => `${text}.${ext}`,
          xmlEscape: (s: string) => s,
        },
      },
    } as unknown as DownloadContext;

    const result = await downloadReddit(context);

    assert.equal(result.success, true);
    const authenticatedFetches = fetchCalls.filter((call) =>
      call.url.includes("/upvoted.json") ||
      call.url.includes("/comments/post1.json")
    );
    assert.equal(authenticatedFetches.length, 2);
    assert.ok(authenticatedFetches.every((call) => call.cookie === "reddit_session=abc123"));
    assert.ok(downloadCalls.length >= 2);
    assert.ok(downloadCalls.every((call) => call.cookies === "reddit_session=abc123"));
  } finally {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("passes matched Reddit account cookies to user profile post and comment fetches", async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-social-reddit-"));
  const cookieText = [
    "# Netscape HTTP Cookie File",
    ".reddit.com\tTRUE\t/\tTRUE\t1893456000\treddit_session\tprofile123",
  ].join("\n");
  const logs: string[] = [];
  const fetchCalls: Array<{ url: string; cookie?: string }> = [];
  const downloadCalls: Array<{ url: string; cookies?: string }> = [];
  const settingsStore = new Map<string, string>([
    ["save_directory", "Socials"],
    ["reddit_subfolder", "Reddit"],
    ["save_metadata", "true"],
    ["subreddit_post_count", "1"],
    ["reddit_account_1_username", "alice"],
    ["reddit_account_1_cookies_blob", cookieText],
  ]);

  try {
    const context = {
      url: "https://www.reddit.com/user/alice/",
      rootDirectory,
      maxDownloadThreads: 2,
      settings: {
        get: (key: string) => settingsStore.get(key) || "",
        set: async (key: string, value: string) => {
          settingsStore.set(key, value);
        },
      },
      logger: {
        info: (message: string) => {
          logs.push(message);
        },
        warn: (message: string) => {
          logs.push(message);
        },
        error: (message: string) => {
          logs.push(message);
        },
      },
      helpers: {
        http: {
          createRateLimiter: () => async (url: string, options?: RequestInit) => {
            const cookie = new Headers(options?.headers).get("cookie") || undefined;
            fetchCalls.push({ url, cookie });

            if (url.includes("/submitted.json")) {
              return new Response(
                JSON.stringify({
                  kind: "Listing",
                  data: {
                    after: null,
                    before: null,
                    children: [
                      {
                        kind: "t3",
                        data: {
                          id: "post2",
                          name: "t3_post2",
                          title: "Profile media post",
                          author: "alice",
                          subreddit: "aliceprofile",
                          subreddit_name_prefixed: "r/aliceprofile",
                          url: "https://i.redd.it/profile.jpg",
                          permalink: "/r/aliceprofile/comments/post2/profile_media_post/",
                          domain: "i.redd.it",
                          selftext: "inline https://i.redd.it/profile-inline.jpg",
                          selftext_html: null,
                          score: 1,
                          upvote_ratio: 1,
                          num_comments: 1,
                          created_utc: 1,
                          edited: false,
                          over_18: true,
                          spoiler: false,
                          stickied: false,
                          locked: false,
                          archived: false,
                          is_video: false,
                          post_hint: "image",
                          link_flair_text: null,
                          author_flair_text: null,
                          thumbnail: "",
                          total_awards_received: 0,
                        },
                      },
                    ],
                  },
                }),
                { status: 200 }
              );
            }

            if (url.includes("/comments/post2.json")) {
              return new Response(
                JSON.stringify([
                  { kind: "Listing", data: { children: [] } },
                  {
                    kind: "Listing",
                    data: {
                      children: [
                        {
                          kind: "t1",
                          data: {
                            id: "comment2",
                            author: "dave",
                            body: "profile comment https://i.redd.it/profile-comment.jpg",
                            body_html: null,
                            score: 1,
                            created_utc: 2,
                            edited: false,
                            is_submitter: false,
                            author_flair_text: null,
                            stickied: false,
                            distinguished: null,
                            depth: 0,
                            replies: "",
                          },
                        },
                      ],
                    },
                  },
                ]),
                { status: 200 }
              );
            }

            if (url.includes("/about.json")) {
              return new Response(JSON.stringify({ data: {} }), { status: 200 });
            }

            return new Response(JSON.stringify({}), { status: 404 });
          },
        },
        io: {
          ensureDir: async (dir: string) => {
            fs.mkdirSync(dir, { recursive: true });
          },
          fileExists: async (filePath: string) => fs.existsSync(filePath),
          downloadFiles: async (
            files: Array<{ url: string; outputPath: string }>,
            _concurrency?: number,
            options?: { cookies?: string }
          ) => {
            for (const file of files) {
              downloadCalls.push({ url: file.url, cookies: options?.cookies });
              fs.mkdirSync(path.dirname(file.outputPath), { recursive: true });
              fs.writeFileSync(file.outputPath, "downloaded");
            }
          },
          downloadFile: async (
            url: string,
            outputPath: string,
            options?: { cookies?: string }
          ) => {
            downloadCalls.push({ url, cookies: options?.cookies });
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, "downloaded");
          },
        },
        string: {
          sanitizeFilename: (input: string) => input.replace(/[\\/]/g, "_"),
          truncateTitle: (title: string) => title,
          filenameFromUrl: (url: string) => path.basename(new URL(url).pathname),
          getMimeExtension: () => "jpg",
          decodeHtmlEntities: (str: string) => str,
          buildFilename: (text: string, ext: string) => `${text}.${ext}`,
          xmlEscape: (s: string) => s,
        },
      },
    } as unknown as DownloadContext;

    const result = await downloadReddit(context);

    assert.equal(result.success, true);
    assert.ok(
      logs.some((message) =>
        message.includes(
          "Using Reddit account slot 1 cookies from setting-blob for u/alice profile archive requests"
        )
      )
    );
    const authenticatedFetches = fetchCalls.filter((call) =>
      call.url.includes("/submitted.json") ||
      call.url.includes("/comments/post2.json")
    );
    assert.equal(authenticatedFetches.length, 2);
    assert.ok(authenticatedFetches.every((call) => call.cookie === "reddit_session=profile123"));
    assert.ok(downloadCalls.length >= 2);
    assert.ok(downloadCalls.every((call) => call.cookies === "reddit_session=profile123"));
  } finally {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("returns profile cookie setup guidance when submitted listing gets a 403 without cookies", async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-social-reddit-"));
  const fetchCalls: Array<{ url: string; cookie?: string }> = [];
  const settingsStore = new Map<string, string>([
    ["save_directory", "Socials"],
    ["reddit_subfolder", "Reddit"],
    ["save_metadata", "true"],
    ["subreddit_post_count", "1"],
    ["reddit_account_1_username", "bob"],
  ]);

  try {
    const context = {
      url: "https://www.reddit.com/user/alice/",
      rootDirectory,
      maxDownloadThreads: 2,
      settings: {
        get: (key: string) => settingsStore.get(key) || "",
        set: async (key: string, value: string) => {
          settingsStore.set(key, value);
        },
      },
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      helpers: {
        http: {
          createRateLimiter: () => async (url: string, options?: RequestInit) => {
            const cookie = new Headers(options?.headers).get("cookie") || undefined;
            fetchCalls.push({ url, cookie });
            return new Response("Blocked", { status: 403, statusText: "Blocked" });
          },
        },
      },
    } as unknown as DownloadContext;

    const result = await downloadReddit(context);

    assert.equal(result.success, false);
    assert.match(result.message, /No configured Reddit account matches u\/alice/);
    assert.match(result.message, /Configured accounts: u\/bob/);
    assert.equal(fetchCalls.length, 1);
    assert.ok(fetchCalls[0].url.includes("/submitted.json"));
    assert.equal(fetchCalls[0].cookie, undefined);
  } finally {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});
