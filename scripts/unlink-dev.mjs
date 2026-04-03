/**
 * Removes dev symlinks from ~/Dev/TheArchiver/plugins/ that point to this repo.
 * Only removes symlinks — real directories are left untouched.
 * Usage: npm run dev:unlink
 */
import { readdir, lstat, readlink, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { homedir } from "os";

const PLUGINS_DIR = join(import.meta.dirname, "..", "plugins");
const ARCHIVER_PLUGINS = join(homedir(), "Dev", "TheArchiver", "plugins");

async function main() {
  if (!existsSync(ARCHIVER_PLUGINS)) {
    console.log("TheArchiver plugins directory not found. Nothing to unlink.");
    return;
  }

  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });

  for (const entry of entries.filter((e) => e.isDirectory())) {
    const pluginName = entry.name;
    const linkTarget = join(ARCHIVER_PLUGINS, pluginName);

    if (!existsSync(linkTarget)) continue;

    const stats = await lstat(linkTarget);
    if (!stats.isSymbolicLink()) {
      console.log(`  Skipping ${pluginName}: not a symlink`);
      continue;
    }

    const target = await readlink(linkTarget);
    if (target.includes("TheArchiver-CommunityPlugins")) {
      await rm(linkTarget);
      console.log(`  Unlinked: ${linkTarget}`);
    } else {
      console.log(`  Skipping ${pluginName}: symlink points elsewhere (${target})`);
    }
  }

  console.log("\nDev links removed.");
}

main();
