/**
 * Distributes a single plugin: builds, packages, copies ZIP to /dist/, and regenerates manifest.
 * Usage: node scripts/distribute.mjs <plugin-name>
 * Example: node scripts/distribute.mjs plugin-youtube
 */
import { readFile, mkdir, copyFile, readdir } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";
import { existsSync } from "fs";

const ROOT_DIR = join(import.meta.dirname, "..");
const PLUGINS_DIR = join(ROOT_DIR, "plugins");
const DIST_DIR = join(ROOT_DIR, "dist");

const pluginName = process.argv[2];

if (!pluginName) {
  console.error("Usage: node scripts/distribute.mjs <plugin-name>");
  console.error("Available plugins:");
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });
  for (const entry of entries.filter((e) => e.isDirectory())) {
    console.error(`  ${entry.name}`);
  }
  process.exit(1);
}

const pluginDir = join(PLUGINS_DIR, pluginName);

if (!existsSync(pluginDir)) {
  console.error(`Plugin not found: ${pluginName}`);
  console.error(`Expected directory: ${pluginDir}`);
  process.exit(1);
}

const pkgPath = join(pluginDir, "package.json");
if (!existsSync(pkgPath)) {
  console.error(`No package.json found in ${pluginDir}`);
  process.exit(1);
}

const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));

// Install dependencies
console.log(`\n--- Installing dependencies for ${pluginName} ---`);
execSync("npm install", { cwd: pluginDir, stdio: "inherit" });

// Run package script (builds + creates ZIP)
if (!pkg.scripts?.package) {
  console.error(`No 'package' script found in ${pluginName}/package.json`);
  process.exit(1);
}

console.log(`\n--- Packaging ${pluginName} ---`);
execSync("npm run package", { cwd: pluginDir, stdio: "inherit" });

// Copy ZIP to root dist/
const distDir = join(pluginDir, "dist");
const expectedZip = `${pluginName}.zip`;

if (!existsSync(join(distDir, expectedZip))) {
  console.error(`Expected ZIP not found: ${join(distDir, expectedZip)}`);
  process.exit(1);
}

await mkdir(DIST_DIR, { recursive: true });
const dest = join(DIST_DIR, expectedZip);
await copyFile(join(distDir, expectedZip), dest);
console.log(`\n--- Copied ZIP to ${dest} ---`);

// Regenerate manifest
console.log(`\n--- Regenerating plugins.json ---`);
execSync("node scripts/generate-manifest.mjs", { cwd: ROOT_DIR, stdio: "inherit" });

console.log(`\nDone! ${pluginName} distributed successfully.`);
