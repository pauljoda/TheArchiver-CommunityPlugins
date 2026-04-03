// Single source of truth for all plugin settings.
// Organized by category: General, Auth, Download, Post-Processing, Advanced.
import { siteOptions } from "./sites";

interface PluginSettingDefinition {
  key: string;
  type: "string" | "number" | "boolean" | "password" | "select" | "action" | "site-directory-map" | "file";
  label: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  hidden?: boolean;
  section?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: Array<{ label: string; value: string }>;
    accept?: string;
    maxSize?: number;
  };
  sortOrder?: number;
}

export const pluginSettings: PluginSettingDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // GENERAL (0–9)
  // ═══════════════════════════════════════════════════════════════
  {
    key: "save_directory",
    type: "string",
    section: "General",
    label: "Save Directory",
    description:
      "Top-level folder within your downloads directory for gallery-dl content. " +
      "Plugin browser views track this folder, so per-site folders are created inside it (default: gallery-dl).",
    required: false,
    defaultValue: "gallery-dl",
    sortOrder: 0,
  },
  {
    key: "library_folder",
    type: "string",
    section: "General",
    label: "Legacy Library Folder",
    description:
      "Legacy compatibility setting from earlier plugin versions. " +
      "Its value is migrated to Save Directory automatically.",
    required: false,
    hidden: true,
    sortOrder: 1,
  },
  {
    key: "site_directories",
    type: "site-directory-map",
    section: "General",
    label: "Per-Site Download Folders",
    description:
      "Assign sites to specific download subfolders. " +
      "Matched sites are stored inside Save Directory, preserving plugin browser support.",
    required: false,
    sortOrder: 2,
    validation: {
      options: siteOptions,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION — COOKIES (10–19)
  // ═══════════════════════════════════════════════════════════════
  {
    key: "cookies_file",
    type: "file",
    label: "🍪 Cookies File (Global)",
    description:
      "Upload a Netscape-format cookies.txt file for authenticated downloads. " +
      "This is used as a fallback for all sites. Many sites (Instagram, Twitter/X, " +
      "Facebook, TikTok, Patreon, Fanbox, Fantia, Fur Affinity, ExHentai, etc.) " +
      "require cookies for access. " +
      "To export cookies: Chrome → 'Get cookies.txt LOCALLY' extension; " +
      "Firefox → 'cookies.txt' extension. Visit the site, click the extension, export.",
    required: false,
    section: "Cookie Authentication",
    sortOrder: 10,
    validation: {
      accept: ".txt",
      maxSize: 10485760,
    },
  },
  {
    key: "cookies_from_browser",
    type: "select",
    label: "🍪 Extract Cookies from Browser",
    description:
      "Automatically extract cookies from an installed browser instead of a file. " +
      "gallery-dl will read cookies directly from the browser's cookie store. " +
      "The browser must be closed for this to work reliably on some systems.",
    required: false,
    section: "Cookie Authentication",
    sortOrder: 11,
    defaultValue: "none",
    validation: {
      options: [
        { label: "None (use cookies file instead)", value: "none" },
        { label: "Firefox", value: "firefox" },
        { label: "Chrome", value: "chrome" },
        { label: "Chromium", value: "chromium" },
        { label: "Opera", value: "opera" },
        { label: "Edge", value: "edge" },
        { label: "Brave", value: "brave" },
        { label: "Vivaldi", value: "vivaldi" },
        { label: "Safari", value: "safari" },
      ],
    },
  },
  {
    key: "cookies_browser_profile",
    type: "string",
    label: "🍪 Browser Profile Name",
    description:
      "If you use multiple browser profiles, specify the profile name here. " +
      "Leave blank to use the default profile. " +
      "Example: 'Profile 1' for Chrome, or your Firefox profile name.",
    required: false,
    section: "Cookie Authentication",
    sortOrder: 12,
  },
  {
    key: "cookies_browser_domain",
    type: "string",
    label: "🍪 Cookie Domain Filter",
    description:
      "Only extract cookies for this domain (e.g., '.twitter.com'). " +
      "Leave blank to extract all cookies from the browser. " +
      "Useful for limiting which cookies are sent to gallery-dl.",
    required: false,
    section: "Cookie Authentication",
    sortOrder: 13,
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION — OAUTH SITES (20–39)
  // ═══════════════════════════════════════════════════════════════

  // --- Pixiv (OAuth Required) ---
  {
    key: "pixiv_refresh_token",
    type: "password",
    label: "Pixiv — Refresh Token",
    description:
      "Pixiv REQUIRES authentication. Use the 'Authenticate Pixiv' button below to " +
      "open the OAuth flow in your browser. The refresh token will be saved automatically. " +
      "Alternatively, paste a token from `gallery-dl oauth:pixiv` here.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 20,
  },
  {
    key: "pixiv_authenticate",
    type: "action",
    label: "Authenticate Pixiv (OAuth)",
    description:
      "Opens the Pixiv OAuth flow. Follow the browser prompts to authorize gallery-dl, " +
      "then paste the code back. Your refresh token will be stored securely.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 21,
  },

  // --- DeviantArt (OAuth Optional) ---
  {
    key: "deviantart_refresh_token",
    type: "password",
    label: "DeviantArt — Refresh Token",
    description:
      "Optional OAuth token for DeviantArt. Enables access to mature content and higher quality originals. " +
      "Use the button below or run `gallery-dl oauth:deviantart`.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 22,
  },
  {
    key: "deviantart_client_id",
    type: "string",
    label: "DeviantArt — Client ID",
    description:
      "Optional: your own DeviantArt API application Client ID. " +
      "Only needed if you want to use your own app credentials instead of the built-in ones.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 23,
  },
  {
    key: "deviantart_client_secret",
    type: "password",
    label: "DeviantArt — Client Secret",
    description: "Optional: your own DeviantArt API application Client Secret.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 24,
  },
  {
    key: "deviantart_authenticate",
    type: "action",
    label: "Authenticate DeviantArt (OAuth)",
    description: "Opens the DeviantArt OAuth flow in your browser.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 25,
  },

  // --- Flickr (OAuth Optional) ---
  {
    key: "flickr_access_token",
    type: "password",
    label: "Flickr — Access Token",
    description:
      "Optional OAuth token for Flickr. Enables access to private/restricted content. " +
      "Use the button below or run `gallery-dl oauth:flickr`.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 26,
  },
  {
    key: "flickr_access_token_secret",
    type: "password",
    label: "Flickr — Access Token Secret",
    description: "The access token secret from the Flickr OAuth flow.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 27,
  },
  {
    key: "flickr_authenticate",
    type: "action",
    label: "Authenticate Flickr (OAuth)",
    description: "Opens the Flickr OAuth flow in your browser.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 28,
  },

  // --- Reddit (OAuth Optional) ---
  {
    key: "reddit_client_id",
    type: "string",
    label: "Reddit — Client ID",
    description:
      "Optional Reddit API Client ID for higher rate limits and access to restricted content. " +
      "Create one at https://www.reddit.com/prefs/apps/ (script type).",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 29,
  },
  {
    key: "reddit_user_agent",
    type: "string",
    label: "Reddit — User Agent",
    description:
      "Custom User-Agent for Reddit API requests. Required format: '<platform>:<app_id>:<version> (by /u/<username>)'. " +
      "Example: 'gallery-dl:myapp:1.0 (by /u/myusername)'",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 30,
  },

  // --- Tumblr (OAuth Optional) ---
  {
    key: "tumblr_access_token",
    type: "password",
    label: "Tumblr — Access Token",
    description:
      "Optional OAuth token for Tumblr. Use the button below or run `gallery-dl oauth:tumblr`.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 31,
  },
  {
    key: "tumblr_access_token_secret",
    type: "password",
    label: "Tumblr — Access Token Secret",
    description: "The access token secret from the Tumblr OAuth flow.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 32,
  },
  {
    key: "tumblr_authenticate",
    type: "action",
    label: "Authenticate Tumblr (OAuth)",
    description: "Opens the Tumblr OAuth flow in your browser.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 33,
  },

  // --- SmugMug (OAuth Optional) ---
  {
    key: "smugmug_access_token",
    type: "password",
    label: "SmugMug — Access Token",
    description: "OAuth token for SmugMug. Run `gallery-dl oauth:smugmug` to obtain.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 34,
  },
  {
    key: "smugmug_access_token_secret",
    type: "password",
    label: "SmugMug — Access Token Secret",
    description: "The access token secret from the SmugMug OAuth flow.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 35,
  },

  // --- Mastodon (OAuth per-instance) ---
  {
    key: "mastodon_instance",
    type: "string",
    label: "Mastodon — Instance URL",
    description:
      "Your Mastodon instance URL (e.g., 'mastodon.social', 'pawoo.net'). " +
      "Needed to authenticate with the correct server.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 36,
  },
  {
    key: "mastodon_access_token",
    type: "password",
    label: "Mastodon — Access Token",
    description:
      "Access token for your Mastodon instance. Run `gallery-dl oauth:mastodon:<instance>` to obtain.",
    required: false,
    section: "OAuth Authentication",
    sortOrder: 37,
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION — USERNAME / PASSWORD SITES (40–59)
  // ═══════════════════════════════════════════════════════════════

  // --- Bluesky ---
  {
    key: "bluesky_username",
    type: "string",
    label: "Bluesky — Handle or DID",
    description:
      "Your Bluesky handle (e.g., 'user.bsky.social') or DID. " +
      "Needed for accessing restricted content.",
    required: false,
    section: "Username / Password",
    sortOrder: 40,
  },
  {
    key: "bluesky_password",
    type: "password",
    label: "Bluesky — App Password",
    description:
      "Create an App Password at Settings → App Passwords in Bluesky. " +
      "Do NOT use your main password.",
    required: false,
    section: "Username / Password",
    sortOrder: 41,
  },

  // --- Sankaku ---
  {
    key: "sankaku_username",
    type: "string",
    label: "Sankaku — Username",
    description:
      "Sankaku Channel username. Note: cookies do NOT work for Sankaku — " +
      "you must use username/password authentication.",
    required: false,
    section: "Username / Password",
    sortOrder: 42,
  },
  {
    key: "sankaku_password",
    type: "password",
    label: "Sankaku — Password",
    description: "Your Sankaku Channel password.",
    required: false,
    section: "Username / Password",
    sortOrder: 43,
  },

  // --- Nijie (Required) ---
  {
    key: "nijie_username",
    type: "string",
    label: "Nijie — Username (Required for Nijie)",
    description: "Nijie requires login to access any content.",
    required: false,
    section: "Username / Password",
    sortOrder: 44,
  },
  {
    key: "nijie_password",
    type: "password",
    label: "Nijie — Password",
    description: "Your Nijie account password.",
    required: false,
    section: "Username / Password",
    sortOrder: 45,
  },

  // --- Inkbunny ---
  {
    key: "inkbunny_username",
    type: "string",
    label: "Inkbunny — Username",
    description: "Inkbunny username for accessing restricted content.",
    required: false,
    section: "Username / Password",
    sortOrder: 46,
  },
  {
    key: "inkbunny_password",
    type: "password",
    label: "Inkbunny — Password",
    description: "Your Inkbunny password.",
    required: false,
    section: "Username / Password",
    sortOrder: 47,
  },

  // --- MangaDex ---
  {
    key: "mangadex_username",
    type: "string",
    label: "MangaDex — Username",
    description: "MangaDex username for accessing your follows and reading lists.",
    required: false,
    section: "Username / Password",
    sortOrder: 48,
  },
  {
    key: "mangadex_password",
    type: "password",
    label: "MangaDex — Password",
    description: "Your MangaDex password.",
    required: false,
    section: "Username / Password",
    sortOrder: 49,
  },

  // --- SubscribeStar ---
  {
    key: "subscribestar_username",
    type: "string",
    label: "SubscribeStar — Username",
    description: "SubscribeStar username.",
    required: false,
    section: "Username / Password",
    sortOrder: 50,
  },
  {
    key: "subscribestar_password",
    type: "password",
    label: "SubscribeStar — Password",
    description: "Your SubscribeStar password.",
    required: false,
    section: "Username / Password",
    sortOrder: 51,
  },

  // --- Newgrounds ---
  {
    key: "newgrounds_username",
    type: "string",
    label: "Newgrounds — Username",
    description: "Newgrounds username for adult content access.",
    required: false,
    section: "Username / Password",
    sortOrder: 52,
  },
  {
    key: "newgrounds_password",
    type: "password",
    label: "Newgrounds — Password",
    description: "Your Newgrounds password.",
    required: false,
    section: "Username / Password",
    sortOrder: 53,
  },

  // --- Zerochan ---
  {
    key: "zerochan_username",
    type: "string",
    label: "Zerochan — Username",
    description: "Zerochan username for higher resolution downloads.",
    required: false,
    section: "Username / Password",
    sortOrder: 54,
  },
  {
    key: "zerochan_password",
    type: "password",
    label: "Zerochan — Password",
    description: "Your Zerochan password.",
    required: false,
    section: "Username / Password",
    sortOrder: 55,
  },

  // --- Aryion (Eka's Portal) ---
  {
    key: "aryion_username",
    type: "string",
    label: "Aryion (Eka's Portal) — Username",
    description: "Aryion username.",
    required: false,
    section: "Username / Password",
    sortOrder: 56,
  },
  {
    key: "aryion_password",
    type: "password",
    label: "Aryion — Password",
    description: "Your Aryion password.",
    required: false,
    section: "Username / Password",
    sortOrder: 57,
  },

  // --- Tapas ---
  {
    key: "tapas_username",
    type: "string",
    label: "Tapas — Username",
    description: "Tapas username for accessing purchased content.",
    required: false,
    section: "Username / Password",
    sortOrder: 58,
  },
  {
    key: "tapas_password",
    type: "password",
    label: "Tapas — Password",
    description: "Your Tapas password.",
    required: false,
    section: "Username / Password",
    sortOrder: 59,
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION — API KEYS & TOKENS (60–79)
  // ═══════════════════════════════════════════════════════════════

  // --- Danbooru ---
  {
    key: "danbooru_username",
    type: "string",
    label: "Danbooru — Username",
    description: "Danbooru username (used with API key for authentication).",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 60,
  },
  {
    key: "danbooru_api_key",
    type: "password",
    label: "Danbooru — API Key",
    description:
      "Danbooru API key. Find it in your Danbooru profile settings under API Key. " +
      "Used as the password with your username.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 61,
  },

  // --- e621 ---
  {
    key: "e621_username",
    type: "string",
    label: "e621 — Username",
    description: "e621 username (used with API key for authentication).",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 62,
  },
  {
    key: "e621_api_key",
    type: "password",
    label: "e621 — API Key",
    description:
      "e621 API key. Find it in your e621 account settings. " +
      "Used as the password with your username.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 63,
  },

  // --- Gelbooru ---
  {
    key: "gelbooru_api_key",
    type: "password",
    label: "Gelbooru — API Key",
    description: "Gelbooru API key for higher rate limits. Found in your Gelbooru account settings.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 64,
  },
  {
    key: "gelbooru_user_id",
    type: "string",
    label: "Gelbooru — User ID",
    description: "Your Gelbooru numeric User ID (used alongside API key).",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 65,
  },

  // --- Civitai ---
  {
    key: "civitai_api_key",
    type: "password",
    label: "Civitai — API Key",
    description:
      "Civitai API key for downloading models and accessing NSFW content. " +
      "Generate one at civitai.com → Account Settings → API Keys.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 66,
  },

  // --- Wallhaven ---
  {
    key: "wallhaven_api_key",
    type: "password",
    label: "Wallhaven — API Key",
    description:
      "Wallhaven API key for accessing NSFW wallpapers. " +
      "Find it at wallhaven.cc → Settings → API.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 67,
  },

  // --- Weasyl ---
  {
    key: "weasyl_api_key",
    type: "password",
    label: "Weasyl — API Key",
    description:
      "Weasyl API key. Generate one at weasyl.com → Settings → Manage API Keys.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 68,
  },

  // --- Imgur ---
  {
    key: "imgur_client_id",
    type: "string",
    label: "Imgur — Client ID",
    description:
      "Optional Imgur API Client ID for higher rate limits. " +
      "Register an app at api.imgur.com/oauth2/addclient.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 69,
  },

  // --- Discord ---
  {
    key: "discord_token",
    type: "password",
    label: "Discord — Bot Token",
    description:
      "Discord bot token for downloading from Discord channels. " +
      "Create a bot at discord.com/developers/applications.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 70,
  },

  // --- Fansly ---
  {
    key: "fansly_token",
    type: "password",
    label: "Fansly — Authorization Token",
    description:
      "Fansly authorization token. Extract from browser DevTools: " +
      "Network tab → any fansly.com request → 'authorization' header value.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 71,
  },

  // --- Gofile ---
  {
    key: "gofile_api_token",
    type: "password",
    label: "Gofile — API Token",
    description: "Gofile API token for accessing premium content.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 72,
  },

  // --- ImageChest ---
  {
    key: "imagechest_access_token",
    type: "password",
    label: "ImageChest — Access Token",
    description: "ImageChest API access token.",
    required: false,
    section: "API Keys & Tokens",
    sortOrder: 73,
  },

  // ═══════════════════════════════════════════════════════════════
  // SITE-SPECIFIC OPTIONS (80–99)
  // ═══════════════════════════════════════════════════════════════

  // --- Pixiv-specific ---
  {
    key: "pixiv_ugoira",
    type: "boolean",
    label: "Pixiv — Download Ugoira Animations",
    description: "Download Pixiv ugoira (animated) posts as frame sequences.",
    required: false,
    defaultValue: true,
    section: "Site-Specific Options",
    sortOrder: 80,
  },
  {
    key: "ugoira_convert",
    type: "select",
    label: "Pixiv — Ugoira Conversion Format",
    description:
      "Convert ugoira animations to video format. Requires FFmpeg. " +
      "Leave as 'None' to keep as zip of frames.",
    required: false,
    defaultValue: "none",
    section: "Site-Specific Options",
    sortOrder: 81,
    validation: {
      options: [
        { label: "None (keep frames)", value: "none" },
        { label: "WebM (VP9, best quality)", value: "webm" },
        { label: "MP4 (H.264, most compatible)", value: "mp4" },
        { label: "GIF (large, universal)", value: "gif" },
        { label: "MKV (lossless-capable)", value: "mkv" },
      ],
    },
  },

  // --- DeviantArt-specific ---
  {
    key: "deviantart_mature",
    type: "boolean",
    label: "DeviantArt — Mature Content",
    description: "Access mature/NSFW content on DeviantArt (requires authentication).",
    required: false,
    defaultValue: true,
    section: "Site-Specific Options",
    sortOrder: 82,
  },
  {
    key: "deviantart_original",
    type: "boolean",
    label: "DeviantArt — Download Originals",
    description: "Download original full-resolution files instead of scaled versions.",
    required: false,
    defaultValue: true,
    section: "Site-Specific Options",
    sortOrder: 83,
  },

  // --- Twitter-specific ---
  {
    key: "twitter_text_tweets",
    type: "boolean",
    label: "Twitter/X — Include Text-Only Tweets",
    description: "Also download tweets that have no media attachments (saves metadata only).",
    required: false,
    defaultValue: false,
    section: "Site-Specific Options",
    sortOrder: 84,
  },
  {
    key: "twitter_retweets",
    type: "boolean",
    label: "Twitter/X — Include Retweets",
    description: "Include retweets when downloading a user's timeline.",
    required: false,
    defaultValue: false,
    section: "Site-Specific Options",
    sortOrder: 85,
  },
  {
    key: "twitter_quoted",
    type: "boolean",
    label: "Twitter/X — Include Quoted Tweets",
    description: "Include media from quoted tweets.",
    required: false,
    defaultValue: false,
    section: "Site-Specific Options",
    sortOrder: 86,
  },

  // --- Instagram-specific ---
  {
    key: "instagram_include",
    type: "string",
    label: "Instagram — Content Types",
    description:
      "Comma-separated list of content to download: posts, stories, highlights, tagged, reels. " +
      "Default: 'posts' only. Example: 'posts,stories,reels'",
    required: false,
    section: "Site-Specific Options",
    sortOrder: 87,
  },

  // --- Reddit-specific ---
  {
    key: "reddit_whitelist",
    type: "string",
    label: "Reddit — Allowed Domains",
    description:
      "Comma-separated list of domains to download from Reddit posts. " +
      "Example: 'imgur.com,i.redd.it,redgifs.com'. Leave blank for all.",
    required: false,
    section: "Site-Specific Options",
    sortOrder: 88,
  },

  // --- ExHentai-specific ---
  {
    key: "exhentai_sleep",
    type: "string",
    label: "ExHentai — Request Delay",
    description:
      "Seconds to wait between requests to ExHentai (avoids IP bans). " +
      "Recommended: '2.0-4.8' (random delay in that range). Default is no delay.",
    required: false,
    section: "Site-Specific Options",
    sortOrder: 89,
  },

  // --- Kemono-specific ---
  {
    key: "kemono_favorites",
    type: "boolean",
    label: "Kemono — Favorites Only",
    description: "Only download posts you have favorited on Kemono.",
    required: false,
    defaultValue: false,
    section: "Site-Specific Options",
    sortOrder: 90,
  },
  {
    key: "kemono_comments",
    type: "boolean",
    label: "Kemono — Include Comments",
    description: "Download comment data alongside posts.",
    required: false,
    defaultValue: false,
    section: "Site-Specific Options",
    sortOrder: 91,
  },

  // ═══════════════════════════════════════════════════════════════
  // DOWNLOAD BEHAVIOR (100–119)
  // ═══════════════════════════════════════════════════════════════
  {
    key: "skip_existing",
    type: "select",
    label: "Skip Existing Files",
    description:
      "How to handle files that already exist. " +
      "'Skip' checks if file exists; 'Abort after N' stops the entire download after N consecutive skips " +
      "(useful for incremental updates).",
    required: false,
    defaultValue: "true",
    section: "Download Behavior",
    sortOrder: 100,
    validation: {
      options: [
        { label: "Skip existing files", value: "true" },
        { label: "Re-download everything", value: "false" },
        { label: "Abort after 5 consecutive skips", value: "abort:5" },
        { label: "Abort after 10 consecutive skips", value: "abort:10" },
        { label: "Abort after 25 consecutive skips", value: "abort:25" },
        { label: "Terminate URL after 5 skips", value: "terminate:5" },
      ],
    },
  },
  {
    key: "download_archive",
    type: "boolean",
    label: "Use Download Archive",
    description:
      "Track downloaded files in a SQLite database to avoid re-downloading. " +
      "More reliable than filename-based skip detection. " +
      "The archive is stored next to your downloads.",
    required: false,
    defaultValue: true,
    section: "Download Behavior",
    sortOrder: 101,
  },
  {
    key: "file_filter",
    type: "string",
    label: "File Filter Expression",
    description:
      "Python expression to filter which files to download. " +
      "Examples: 'extension in (\"jpg\",\"png\")' to only get images, " +
      "'width >= 1920' for HD+ only, " +
      "'filesize < 50000000' for files under 50MB. " +
      "Leave blank to download everything.",
    required: false,
    section: "Download Behavior",
    sortOrder: 102,
  },
  {
    key: "post_filter",
    type: "string",
    label: "Post Filter Expression",
    description:
      "Python expression to filter which posts to process. " +
      "Examples: 'score >= 100' for popular content, " +
      "'date >= datetime(2024, 1, 1)' for recent posts. " +
      "Leave blank to process all posts.",
    required: false,
    section: "Download Behavior",
    sortOrder: 103,
  },
  {
    key: "file_range",
    type: "string",
    label: "File Range",
    description:
      "Download only specific file indices. " +
      "Examples: '1-10' for first 10, '1,3,5' for specific files, '5-' for 5th onward.",
    required: false,
    section: "Download Behavior",
    sortOrder: 104,
  },
  {
    key: "image_range",
    type: "string",
    label: "Post/Image Range",
    description:
      "Process only specific post indices. Works like File Range but at the post level. " +
      "Useful for paginated galleries.",
    required: false,
    section: "Download Behavior",
    sortOrder: 105,
  },

  // ═══════════════════════════════════════════════════════════════
  // RATE LIMITING & NETWORK (120–139)
  // ═══════════════════════════════════════════════════════════════
  {
    key: "sleep_request",
    type: "string",
    label: "Request Delay (seconds)",
    description:
      "Minimum wait between page/API requests. Helps avoid rate limiting. " +
      "Can be a number (e.g., '1.5') or a range ('1.0-3.0' for random delay). " +
      "Leave blank for no delay.",
    required: false,
    section: "Rate Limiting & Network",
    sortOrder: 120,
  },
  {
    key: "sleep_download",
    type: "string",
    label: "Download Delay (seconds)",
    description:
      "Wait between file downloads. Can be a number or range. " +
      "Useful for sites that rate-limit downloads separately from pages.",
    required: false,
    section: "Rate Limiting & Network",
    sortOrder: 121,
  },
  {
    key: "rate_limit",
    type: "string",
    label: "Download Speed Limit",
    description:
      "Maximum download speed. Examples: '1M' for 1 MB/s, '500k' for 500 KB/s. " +
      "Leave blank for unlimited.",
    required: false,
    section: "Rate Limiting & Network",
    sortOrder: 122,
  },
  {
    key: "retries",
    type: "number",
    label: "Retry Count",
    description: "Number of times to retry failed downloads. Default: 4. Set to -1 for infinite retries.",
    required: false,
    defaultValue: 4,
    section: "Rate Limiting & Network",
    sortOrder: 123,
    validation: {
      min: -1,
      max: 100,
    },
  },
  {
    key: "timeout",
    type: "number",
    label: "HTTP Timeout (seconds)",
    description: "Timeout for HTTP requests in seconds. Default: 30.",
    required: false,
    defaultValue: 30,
    section: "Rate Limiting & Network",
    sortOrder: 124,
    validation: {
      min: 5,
      max: 300,
    },
  },
  {
    key: "proxy",
    type: "string",
    label: "Proxy URL",
    description:
      "HTTP/HTTPS/SOCKS proxy URL. " +
      "Examples: 'http://proxy:8080', 'socks5://user:pass@proxy:1080'. " +
      "Some sites may require a proxy for access.",
    required: false,
    section: "Rate Limiting & Network",
    sortOrder: 125,
  },
  {
    key: "browser_emulation",
    type: "select",
    label: "Browser Emulation",
    description:
      "Emulate browser headers (User-Agent, Accept, etc.) to avoid detection. " +
      "Some sites block non-browser requests.",
    required: false,
    defaultValue: "none",
    section: "Rate Limiting & Network",
    sortOrder: 126,
    validation: {
      options: [
        { label: "None (gallery-dl default)", value: "none" },
        { label: "Firefox", value: "firefox" },
        { label: "Chrome", value: "chrome" },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // POST-PROCESSING (140–159)
  // ═══════════════════════════════════════════════════════════════
  {
    key: "write_metadata",
    type: "boolean",
    label: "Write Metadata JSON",
    description:
      "Save a .json metadata file alongside each downloaded file. " +
      "Contains source URL, tags, description, upload date, and other site-specific metadata.",
    required: false,
    defaultValue: true,
    section: "Post-Processing",
    sortOrder: 140,
  },
  {
    key: "write_tags",
    type: "boolean",
    label: "Write Tag Files",
    description:
      "Save tags to a separate .txt file per image (one tag per line). " +
      "Useful for tagging systems and AI training datasets.",
    required: false,
    defaultValue: false,
    section: "Post-Processing",
    sortOrder: 141,
  },
  {
    key: "write_info_nfo",
    type: "boolean",
    label: "Write NFO Sidecar",
    description:
      "Generate a .nfo XML sidecar file with metadata for media managers (Kodi, Jellyfin, etc.).",
    required: false,
    defaultValue: false,
    section: "Post-Processing",
    sortOrder: 142,
  },
  {
    key: "zip_manga",
    type: "boolean",
    label: "Archive Manga as CBZ",
    description:
      "Automatically archive manga/comic chapters into .cbz files after download. " +
      "CBZ is the standard comic book archive format supported by most readers.",
    required: false,
    defaultValue: false,
    section: "Post-Processing",
    sortOrder: 143,
  },
  {
    key: "mtime",
    type: "boolean",
    label: "Preserve Modification Time",
    description:
      "Set each file's modification time to match the server's Last-Modified header or upload date. " +
      "Keeps your files chronologically sorted.",
    required: false,
    defaultValue: true,
    section: "Post-Processing",
    sortOrder: 144,
  },
  {
    key: "exec_after",
    type: "string",
    label: "Execute Command After Download",
    description:
      "Shell command to run after each file download. " +
      "Use {} for the file path, {_directory} for the directory. " +
      "Example: 'optipng {}' to optimize PNGs after download.",
    required: false,
    section: "Post-Processing",
    sortOrder: 145,
  },

  // ═══════════════════════════════════════════════════════════════
  // OUTPUT TEMPLATES (160–169)
  // ═══════════════════════════════════════════════════════════════
  {
    key: "directory_template",
    type: "string",
    label: "Directory Template",
    description:
      "gallery-dl format string for organizing download directories. " +
      "Default: '{category}/{subcategory}/{title|\"unknown\"}'. " +
      "Available fields depend on the site (e.g., {category}, {subcategory}, {user}, {title}, {date}). " +
      "Leave blank for gallery-dl's built-in defaults.",
    required: false,
    section: "Output Templates",
    sortOrder: 160,
  },
  {
    key: "filename_template",
    type: "string",
    label: "Filename Template",
    description:
      "gallery-dl format string for naming files. " +
      "Default varies by site. Examples: '{num:>03}_{filename}.{extension}', " +
      "'{date:%Y-%m-%d}_{id}.{extension}'. " +
      "Leave blank for gallery-dl's built-in defaults.",
    required: false,
    section: "Output Templates",
    sortOrder: 161,
  },

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED (170+)
  // ═══════════════════════════════════════════════════════════════
  {
    key: "custom_config",
    type: "file",
    label: "Custom gallery-dl Config File",
    description:
      "Upload a full gallery-dl.conf JSON file for advanced configuration. " +
      "Settings from this file are MERGED with the plugin settings above — " +
      "plugin settings take precedence for any overlapping keys. " +
      "Use this for complex site-specific configurations not covered by the settings above.",
    required: false,
    section: "Advanced",
    sortOrder: 170,
    validation: {
      accept: ".json,.conf",
      maxSize: 10485760,
    },
  },
  {
    key: "extra_args",
    type: "string",
    label: "Extra gallery-dl Arguments",
    description:
      "Additional command-line arguments passed directly to gallery-dl. " +
      "Example: '--no-mtime --verbose'. " +
      "These are appended to the generated command and override other settings.",
    required: false,
    section: "Advanced",
    sortOrder: 171,
  },
  {
    key: "user_agent",
    type: "string",
    label: "Custom User-Agent",
    description:
      "Override the User-Agent header for all requests. " +
      "Leave blank to use gallery-dl's default or the browser emulation setting.",
    required: false,
    section: "Advanced",
    sortOrder: 172,
  },
  {
    key: "verify_ssl",
    type: "boolean",
    label: "Verify SSL Certificates",
    description: "Verify SSL certificates for HTTPS requests. Disable only if you know what you're doing.",
    required: false,
    defaultValue: true,
    section: "Advanced",
    sortOrder: 173,
  },
  {
    key: "verbose",
    type: "boolean",
    label: "Verbose Logging",
    description: "Enable verbose/debug output from gallery-dl. Useful for troubleshooting.",
    required: false,
    defaultValue: false,
    section: "Advanced",
    sortOrder: 174,
  },
];
