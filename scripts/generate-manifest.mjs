/**
 * Reads each plugin's manifest.json and generates the root plugins.json
 */
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const PLUGINS_DIR = join(import.meta.dirname, "..", "plugins");
const OUTPUT = join(import.meta.dirname, "..", "plugins.json");

async function main() {
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;

    const manifestPath = join(PLUGINS_DIR, entry.name, "manifest.json");
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
      // ID must match the app's slugify: lowercase, non-alphanumeric → dashes, trim dashes
      const id = manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      plugins.push({
        id,
        name: manifest.name,
        version: manifest.version || "1.0.0",
        description: manifest.description || "",
        author: manifest.author || "",
        downloadFile: `${entry.name}.zip`,
        path: `plugins/${entry.name}`,
      });
    } catch {
      console.warn(`Skipping ${entry.name}: no valid manifest.json`);
    }
  }

  const output = {
    version: 1,
    baseUrl: "https://raw.githubusercontent.com/pauljoda/TheArchiver-CommunityPlugins/main/dist",
    plugins,
  };
  await writeFile(OUTPUT, JSON.stringify(output, null, 2) + "\n");
  console.log(`Generated plugins.json with ${plugins.length} plugins`);
}

main();
