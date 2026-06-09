import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { hasExistingExternalMedia, maybeDownloadExternalMedia } from "../reddit";
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
