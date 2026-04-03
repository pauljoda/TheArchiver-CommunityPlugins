/**
 * Creates symlinks from ~/Dev/TheArchiver/plugins/{name} to each plugin's dist/package/ directory.
 * This allows live local development — build a plugin and TheArchiver picks up changes immediately.
 *
 * Prerequisites: Run `npm run package:XXX` at least once per plugin to populate dist/package/.
 * Usage: npm run dev:link
 */
import { readdir, symlink, lstat, rm, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { homedir } from "os";

const PLUGINS_DIR = join(import.meta.dirname, "..", "plugins");
const ARCHIVER_PLUGINS = join(homedir(), "Dev", "TheArchiver", "plugins");

async function main() {
  if (!existsSync(ARCHIVER_PLUGINS)) {
    console.error(`TheArchiver plugins directory not found: ${ARCHIVER_PLUGINS}`);
    console.error("Make sure ~/Dev/TheArchiver exists.");
    process.exit(1);
  }

  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });

  for (const entry of entries.filter((e) => e.isDirectory())) {
    const pluginName = entry.name;
    const packageDir = join(PLUGINS_DIR, pluginName, "dist", "package");
    const linkTarget = join(ARCHIVER_PLUGINS, pluginName);

    if (!existsSync(packageDir)) {
      console.warn(`  Skipping ${pluginName}: dist/package/ not found. Run 'npm run package:${pluginName.replace("plugin-", "")}' first.`);
      continue;
    }

    // Remove existing directory or symlink at the target
    if (existsSync(linkTarget)) {
      const stats = await lstat(linkTarget);
      if (stats.isSymbolicLink()) {
        await rm(linkTarget);
      } else {
        await rm(linkTarget, { recursive: true });
      }
    }

    await symlink(packageDir, linkTarget, "dir");
    console.log(`  Linked: ${linkTarget} -> ${packageDir}`);
  }

  console.log("\nDev links created. Plugin changes will be reflected after rebuilding.");
}

main();
