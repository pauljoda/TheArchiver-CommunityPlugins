#!/usr/bin/env node
// ─── sync-shared.mjs ──────────────────────────────────────────────────────
//
// Copies runtime-side shared sources from `plugins/_shared/runtime/**` into
// `plugins/<plugin>/_shared/runtime/**` so each plugin's `tsc` can compile
// them as local files without cross-directory rootDir gymnastics.
//
// Usage:  node scripts/sync-shared.mjs <plugin-dirname>
// Example: node scripts/sync-shared.mjs plugin-social
//
// Behavior:
//   - Reads each .ts file under plugins/_shared/runtime/
//   - Prepends a DO-NOT-EDIT header
//   - Writes to plugins/<plugin>/_shared/runtime/<relative-path>
//   - chmod 0444 (read-only) to discourage accidental in-mirror edits
//   - Idempotent: pre-chmods target writable before each write
//
// View-side shared code under plugins/_shared/view/ is NOT synced — the
// view bundler (esbuild) resolves those imports directly at bundle time.
//
// Non-macOS note: chmod 0444 is best-effort; filesystems that don't honor
// Unix permissions will just see a writable mirror, which is still functional.

import { mkdir, readdir, readFile, writeFile, chmod, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SHARED_RUNTIME_DIR = join(REPO_ROOT, "plugins", "_shared", "runtime");

async function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile() && /\.(ts|d\.ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function syncFile(srcAbs, destAbs, relForHeader) {
  const body = await readFile(srcAbs, "utf8");
  const header =
    "// ╔═══════════════════════════════════════════════════════════════════╗\n" +
    "// ║  DO NOT EDIT — this file is synced from                           ║\n" +
    `// ║  ${relForHeader.padEnd(65)}║\n` +
    "// ║  by scripts/sync-shared.mjs. Edit the source, not this copy.      ║\n" +
    "// ╚═══════════════════════════════════════════════════════════════════╝\n" +
    "\n";
  const content = header + body;

  await mkdir(dirname(destAbs), { recursive: true });
  // Pre-chmod to writable if the destination already exists (since we set
  // 0444 at the end of the previous sync, we can't overwrite without this).
  if (existsSync(destAbs)) {
    try {
      await chmod(destAbs, 0o644);
    } catch {
      /* ignore */
    }
  }
  await writeFile(destAbs, content, "utf8");
  try {
    await chmod(destAbs, 0o444);
  } catch {
    /* best-effort */
  }
}

async function main() {
  const pluginName = process.argv[2];
  if (!pluginName) {
    console.error("Usage: node scripts/sync-shared.mjs <plugin-dirname>");
    process.exit(1);
  }

  const pluginDir = join(REPO_ROOT, "plugins", pluginName);
  if (!existsSync(pluginDir)) {
    console.error(`Plugin not found: ${pluginDir}`);
    process.exit(1);
  }
  const pluginStat = await stat(pluginDir);
  if (!pluginStat.isDirectory()) {
    console.error(`Not a directory: ${pluginDir}`);
    process.exit(1);
  }

  const srcFiles = await walk(SHARED_RUNTIME_DIR);
  if (srcFiles.length === 0) {
    console.log(`[sync-shared] ${pluginName}: nothing to sync (_shared/runtime is empty)`);
    return;
  }

  const destRoot = join(pluginDir, "_shared", "runtime");
  let count = 0;
  for (const srcAbs of srcFiles) {
    const relFromRuntime = relative(SHARED_RUNTIME_DIR, srcAbs);
    const destAbs = join(destRoot, relFromRuntime);
    const relForHeader = `plugins/_shared/runtime/${relFromRuntime.split(/[\\/]/).join("/")}`;
    await syncFile(srcAbs, destAbs, relForHeader);
    count++;
  }
  console.log(`[sync-shared] ${pluginName}: synced ${count} file(s) into ${relative(REPO_ROOT, destRoot)}`);
}

main().catch((err) => {
  console.error("[sync-shared] failed:", err);
  process.exit(1);
});
