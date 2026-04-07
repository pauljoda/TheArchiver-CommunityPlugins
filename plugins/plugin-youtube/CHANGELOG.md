# Changelog

## [Unreleased]

### Changed

- Replace inline type definitions with imports from core `plugin-api.d.ts`

## 1.0.1

- Adopt core helpers for `execAsync`, `shellEscape`, `xmlEscape`, `resolveOutputDir`
- Remove local utility implementations in favor of `helpers.process.*`, `helpers.string.*`, `helpers.url.*`
- No user-facing behavior changes

## 1.0.0

- Initial release wrapping yt-dlp CLI
- Support for YouTube, Twitch, TikTok, and 1800+ sites
- Quality selection (best, 2160p, 1440p, 1080p, 720p, 480p)
- Audio-only extraction mode
- Kodi/Jellyfin-compatible .nfo metadata generation with 25+ fields
- Per-site directory overrides via site-directory-map setting
- SponsorBlock chapter marking
- Bundled yt-dlp Python extractor plugins for additional sites
