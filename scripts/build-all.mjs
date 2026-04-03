/**
 * Builds all plugins: installs deps, runs build, creates ZIP packages.
 * Each ZIP contains the files needed to install the plugin (manifest.json, index.js, etc.)
 */
import { readdir, readFile, mkdir, copyFile, stat } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";
import { existsSync } from "fs";

const PLUGINS_DIR = join(import.meta.dirname, "..", "plugins");
const DIST_DIR = join(import.meta.dirname, "..", "dist");

async function buildPlugin(pluginDir, pluginName) {
  console.log(`\n--- Building ${pluginName} ---`);

  // Install dependencies
  if (existsSync(join(pluginDir, "package.json"))) {
    console.log("  Installing dependencies...");
    execSync("npm install", { cwd: pluginDir, stdio: "inherit" });
  }

  // Read package.json for the package script
  const pkg = JSON.parse(await readFile(join(pluginDir, "package.json"), "utf-8"));

  if (pkg.scripts?.package) {
    console.log("  Running package script...");
    execSync("npm run package", { cwd: pluginDir, stdio: "inherit" });

    // Find the generated ZIP in dist/
    const distDir = join(pluginDir, "dist");
    if (existsSync(distDir)) {
      const files = await readdir(distDir);
      const zip = files.find((f) => f.endsWith(".zip"));
      if (zip) {
        await mkdir(DIST_DIR, { recursive: true });
        const dest = join(DIST_DIR, `${pluginName}.zip`);
        await copyFile(join(distDir, zip), dest);
        console.log(`  -> ${dest}`);
        return;
      }
    }
  }

  // Fallback: build and create ZIP manually
  if (pkg.scripts?.build) {
    console.log("  Running build...");
    execSync("npm run build", { cwd: pluginDir, stdio: "inherit" });
  }

  console.log(`  Warning: No ZIP produced for ${pluginName}`);
}

async function main() {
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    if (!existsSync(join(PLUGINS_DIR, entry.name, "package.json"))) continue;

    try {
      await buildPlugin(join(PLUGINS_DIR, entry.name), entry.name);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
  }

  // Regenerate manifest
  console.log("\n--- Regenerating plugins.json ---");
  execSync("node scripts/generate-manifest.mjs", {
    cwd: join(import.meta.dirname, ".."),
    stdio: "inherit",
  });

  console.log("\nDone!");
}

main();
