# TheArchiver Community Plugins

This repository contains community plugins for [TheArchiver](https://github.com/pauljoda/TheArchiver), a desktop application for downloading and archiving web content. Each plugin extends TheArchiver's capabilities by adding support for new sites and download methods.

## Architecture

Plugins are self-contained TypeScript modules that implement the `ArchiverPlugin` interface. Each plugin lives in `plugins/plugin-{name}/` and is built, versioned, and distributed independently. The main app loads compiled plugins at runtime via a sandboxed VM, matching URLs against each plugin's declared `urlPatterns`.

### Plugin Structure

```
plugins/plugin-{name}/
├── index.ts          # Main plugin implementation (required)
├── manifest.json     # Plugin metadata: name, version, urlPatterns, settings (required)
├── package.json      # Build config and scripts (required)
├── tsconfig.json     # TypeScript config (required)
├── settings.ts       # Settings definitions (optional)
├── sites.ts          # Site-specific configurations (optional)
├── manifest-gen.ts   # Dynamic manifest generator (optional)
└── view/             # Custom UI views (optional)
    ├── src/index.ts  # View entry point
    ├── build.js      # esbuild config
    └── index.js      # Compiled view bundle (IIFE)
```

### Key Interfaces

- **`ArchiverPlugin`** — Main plugin export with `name`, `urlPatterns`, `download()`, and optional `settings`, `actions`, `viewProvider`
- **`DownloadContext`** — Provided to `download()`: `url`, `rootDirectory`, `helpers`, `logger`, `settings`
- **`PluginManifest`** — `manifest.json` schema: `name`, `version`, `urlPatterns`, optional `fileTypes`, `settings`, `viewProvider`

## Naming Convention

- **Directory**: `plugin-{lowercase-hyphenated}` (e.g., `plugin-archive-org`, `plugin-gallery-dl`)
- **Package name** (`package.json`): matches directory name
- **Display name** (`manifest.json` `name`): human-readable (e.g., "Archive.org", "Socials")
- **Plugin ID** (in `plugins.json`): auto-slugified from display name

When adding a new plugin, follow this convention and add the corresponding scripts to the root `package.json`.

## Versioning

Each plugin maintains its own semantic version independently. The root `package.json` also has its own version for the monorepo.

- **`manifest.json`** is the source of truth for plugin version (used by the app's update detection)
- **`package.json`** version must stay in sync with `manifest.json`
- Follow [semver](https://semver.org/): MAJOR for breaking changes, MINOR for new features, PATCH for fixes
- Bump the version in both `manifest.json` and `package.json` together when releasing

## Scripts

All scripts are runnable from the repository root. Replace `{name}` with the plugin's short name (e.g., `archive-org`, `gallery-dl`, `social`, `youtube`).

| Command | Description |
|---|---|
| `npm run build` | Build all plugins and regenerate manifest |
| `npm run build:{name}` | Build a single plugin |
| `npm run deploy:{name}` | Build and copy plugin to ~/Dev/TheArchiver/plugins/ |
| `npm run package:{name}` | Build and create distributable ZIP |
| `npm run distribute:{name}` | Package, copy ZIP to /dist/, and regenerate plugins.json |
| `npm run dev:link` | Symlink all plugins into TheArchiver for live local dev |
| `npm run dev:unlink` | Remove dev symlinks |
| `npm run generate-manifest` | Regenerate plugins.json from plugin manifests |

### Adding a New Plugin

1. Create `plugins/plugin-{name}/` with `index.ts`, `manifest.json`, `package.json`, `tsconfig.json`
2. Add scripts to root `package.json`:
   ```json
   "build:{name}": "npm run build --prefix plugins/plugin-{name}",
   "deploy:{name}": "npm run deploy --prefix plugins/plugin-{name}",
   "package:{name}": "npm run package --prefix plugins/plugin-{name}",
   "distribute:{name}": "node scripts/distribute.mjs plugin-{name}"
   ```
3. Ensure `manifest.json` has `name`, `version`, `urlPatterns` at minimum
4. Ensure `package.json` has `build`, `deploy`, and `package` scripts

## Distribution

Plugins are distributed as ZIP files via GitHub. The flow:

1. `npm run distribute:{name}` builds, packages, copies the ZIP to `/dist/`, and regenerates `plugins.json`
2. `plugins.json` is the registry manifest — the main app fetches it to list available community plugins
3. Users install plugins from the app's plugin browser, which downloads the ZIP from the `baseUrl` + `downloadFile`
4. Commit and push the updated `/dist/*.zip` and `plugins.json` to publish

## Local Development

For live development without manually deploying after every change:

1. Build and package each plugin at least once: `npm run package:{name}`
2. Run `npm run dev:link` to symlink `dist/package/` dirs into TheArchiver's plugins directory
3. After code changes, run `npm run build:{name}` — TheArchiver picks up the rebuilt output
4. Run `npm run dev:unlink` to clean up when done

The symlinks are local-only and not tracked by git in either repository.

## Current Plugins

| Plugin | Version | Description |
|---|---|---|
| `plugin-archive-org` | 2.0.0 | Download content from Archive.org |
| `plugin-gallery-dl` | 1.0.0 | Multi-site image/media downloader (400+ sites) |
| `plugin-social` | 1.1.0 | Reddit, Bluesky, Twitter/X downloader with Social Browser view |
| `plugin-youtube` | 1.0.0 | yt-dlp wrapper for YouTube, Twitch, TikTok, and 1800+ sites |
