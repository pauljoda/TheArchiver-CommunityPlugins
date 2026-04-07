# Changelog

## [Unreleased]

### Changed

- Replace inline type definitions in `shared.ts` with imports from core `plugin-api.d.ts`
- Replace local `decodeHtmlEntities()` with `helpers.string.decodeHtmlEntities()` from core
- Replace `sanitizeFilename(truncateTitle(...))` patterns with `helpers.string.buildFilename()` in reddit.ts and bluesky.ts
- Split monolithic `index.ts` (3275 lines) into separate files per platform
  - `shared.ts` — Type definitions and shared utilities (`decodeHtmlEntities`, `formatUnixTimestamp`)
  - `reddit.ts` — All Reddit-specific code (URL parsing, API client, media extraction, NFO, download handlers)
  - `bluesky.ts` — All Bluesky-specific code (URL parsing, API client, media extraction, NFO, download handlers)
  - `twitter.ts` — All Twitter/X-specific code (URL parsing, syndication API, media extraction, NFO, download handlers)
  - `index.ts` — Thin orchestrator with plugin definition, settings, and URL dispatch
- No user-facing behavior changes; purely structural refactor

## 1.1.1

- Adopt core helpers for `xmlEscape`, `truncateTitle`, `filenameFromUrl`, `getMimeExtension`
- Pass string helpers as parameters to extractors and NFO builders instead of local implementations
- No user-facing behavior changes

## 1.1.0

- Add Twitter/X support via Syndication API
- Add Bluesky profile feed downloads
- Social Browser view with multi-platform timeline rendering

## 1.0.0

- Initial release with Reddit and Bluesky support
- Reddit: single posts, user profiles, subreddit archives with media + comments
- Bluesky: single posts and profile feeds with reply threads
- NFO metadata files for all platforms
- Custom Social Browser view with post detail, lightbox, and markdown rendering
