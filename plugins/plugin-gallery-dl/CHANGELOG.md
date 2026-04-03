# Changelog

## 2.0.0

### Breaking Changes

- **Removed Reddit support** — Reddit URLs are no longer handled by this plugin. Use the Socials plugin instead, which provides a richer Reddit experience with native API access, comment archiving, and video muxing.
- **Removed Bluesky support** — Bluesky URLs are no longer handled by this plugin. Use the Socials plugin instead.
- **Removed Twitter/X support** — Twitter/X URLs are no longer handled by this plugin. Use the Socials plugin instead.

### Changes

- Removed all social platform metadata enrichment (NFO generation for Reddit/Bluesky/Twitter posts)
- Removed Reddit-specific settings (reddit_client_id, reddit_user_agent, reddit_whitelist)
- Removed Bluesky and Twitter-specific settings
- Adopted core `helpers.string.shellEscape`, `helpers.string.xmlEscape`, `helpers.url.resolveOutputDir`
- Simplified view code by removing social platform NFO parsers

## 1.0.0

- Initial release wrapping gallery-dl CLI
- Support for 400+ sites via gallery-dl extractors
- OAuth flows for Pixiv, DeviantArt, Flickr, Tumblr
- Per-site directory overrides via site-directory-map setting
- Custom gallery-dl config generation from plugin settings
- Browser-based content viewer
