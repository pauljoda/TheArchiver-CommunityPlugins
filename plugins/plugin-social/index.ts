import {
  resolveRedditCookieHeader,
  REDDIT_ACCOUNT_SLOT_COUNT,
  type ArchiverPlugin,
  type ActionContext,
  type ActionResult,
  type DownloadContext,
  type DownloadResult,
  type PluginSettingDefinition,
  type PluginSettingsAccessor,
  type PluginLogger,
} from "./shared";

import { parseRedditUrl, downloadReddit } from "./reddit";
import { parseBlueskyUrl, downloadBluesky } from "./bluesky";
import { parseTwitterUrl, downloadTwitter } from "./twitter";

const REDDIT_USER_AGENT = "TheArchiver/1.0 (reddit content archiver)";

// =============================================================================
// Reddit Account Slot Settings (generated)
// =============================================================================

function buildRedditAccountSlotSettings(): PluginSettingDefinition[] {
  const settings: PluginSettingDefinition[] = [];
  for (let i = 1; i <= REDDIT_ACCOUNT_SLOT_COUNT; i++) {
    const section = `Reddit Account ${i}`;
    const base = 100 + i * 10;

    settings.push({
      key: `reddit_account_${i}_username`,
      type: "string",
      label: `Username`,
      description:
        `Reddit username this slot belongs to (e.g. 'spez'). ` +
        `When you download a URL like reddit.com/user/<name>/upvoted, the plugin ` +
        `matches <name> against this field (case-insensitive) to pick the right cookies file.`,
      required: false,
      defaultValue: "",
      section,
      sortOrder: base,
    });

    settings.push({
      key: `reddit_account_${i}_cookies_file`,
      type: "file",
      label: `Cookies File`,
      description:
        `Netscape-format cookies.txt exported from a browser session logged in as this user. ` +
        `Use the 'Get cookies.txt LOCALLY' extension (Chrome) or 'cookies.txt' extension (Firefox): ` +
        `log into reddit.com as this account, click the extension, export for this site.`,
      required: false,
      section,
      sortOrder: base + 1,
      validation: {
        accept: ".txt",
        maxSize: 10 * 1024 * 1024,
      },
    });

    settings.push({
      key: `reddit_account_${i}_verified_username`,
      type: "string",
      label: `Verified As`,
      description:
        `Populated by 'Test Connection' after validating the cookies file — ` +
        `this is the authoritative name used for URL matching.`,
      required: false,
      defaultValue: "",
      section,
      sortOrder: base + 2,
    });

    settings.push({
      key: `reddit_account_${i}_upvoted_folder`,
      type: "string",
      label: `Upvoted Download Folder (optional)`,
      description:
        `Custom folder (relative to your main downloads root) where this ` +
        `account's upvoted posts are saved. Leave blank to use the default: ` +
        `Socials → Reddit → <username> → Upvoted ` +
        `(using your Save Directory and Reddit Subfolder settings plus the ` +
        `verified account username). ` +
        `Example custom value: Archive/alice-upvotes. ` +
        `The Social Browser view still renders the folder with the Upvoted ` +
        `timeline regardless of its location — detection is driven by post ` +
        `metadata, not by the folder name.`,
      required: false,
      defaultValue: "",
      section,
      sortOrder: base + 3,
    });

    settings.push({
      key: `reddit_account_${i}_test`,
      type: "action",
      label: `Test Connection`,
      description:
        `Validates this slot's cookies file by fetching /api/me.json and recording the logged-in username.`,
      section,
      sortOrder: base + 4,
    });
  }
  return settings;
}

// =============================================================================
// Reddit Account Test Action (shared handler)
// =============================================================================

async function testRedditAccountSlot(
  slot: number,
  settings: PluginSettingsAccessor,
  logger: PluginLogger
): Promise<ActionResult> {
  const file = (settings.get(`reddit_account_${slot}_cookies_file`) || "").trim();

  // Resolve via the shared helper — it prefers the user-picked path, snapshots
  // a successful read to ~/.thearchiver/plugin-social/accounts/ for reboot
  // resilience, and falls back to the snapshot when the host-provided file is
  // missing (which can happen after a host restart).
  const resolved = resolveRedditCookieHeader(slot, file, logger);
  if (!resolved) {
    return {
      success: false,
      message: file
        ? `Cookies file for Reddit Account ${slot} is missing, unreadable, or contains no reddit.com cookies, and no cached snapshot is available. Re-export cookies.txt from a logged-in Reddit tab.`
        : `Upload a cookies file for Reddit Account ${slot} first, then click this button again.`,
    };
  }
  const cookieHeader = resolved.cookieHeader;
  if (resolved.resolvedFrom === "cache") {
    logger.info(
      `Reddit account slot ${slot}: testing with cached cookies (host-provided file was not readable)`
    );
  }

  try {
    const res = await fetch("https://www.reddit.com/api/me.json?raw_json=1", {
      headers: {
        "User-Agent": REDDIT_USER_AGENT,
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Reddit returned ${res.status} ${res.statusText} for Account ${slot}. Cookies may be expired — re-export from the browser while logged in.`,
      };
    }

    const body = (await res.json()) as { data?: { name?: string } };
    const name = body?.data?.name;
    if (!name) {
      return {
        success: false,
        message:
          `Reddit responded for Account ${slot} but reported no logged-in user. ` +
          `Re-export cookies while logged into reddit.com.`,
      };
    }

    logger.info(
      `Reddit account slot ${slot} OK — u/${name} (cookies source: ${resolved.sourcePath}, snapshot: ${resolved.resolvedFrom})`
    );
    const updates = [
      { key: `reddit_account_${slot}_verified_username`, value: name },
    ];
    // If the user hasn't filled in the username field, auto-populate it with
    // the verified name so the URL matcher picks this slot up immediately.
    const configured = (settings.get(`reddit_account_${slot}_username`) || "").trim();
    if (!configured) {
      updates.push({ key: `reddit_account_${slot}_username`, value: name });
    }
    const snapshotNote =
      resolved.resolvedFrom === "live"
        ? " Cookies snapshot saved to ~/.thearchiver/plugin-social/ for reboot resilience."
        : " (used existing cached snapshot — host-provided file was not readable).";
    return {
      success: true,
      message: `Slot ${slot} connected as u/${name}.${snapshotNote}`,
      settingsUpdates: updates,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Reddit account slot ${slot} test failed: ${msg}`);
    return { success: false, message: `Slot ${slot} test failed: ${msg}` };
  }
}

function buildRedditAccountTestActions(): Record<
  string,
  (context: ActionContext) => Promise<ActionResult>
> {
  const actions: Record<string, (ctx: ActionContext) => Promise<ActionResult>> = {};
  for (let i = 1; i <= REDDIT_ACCOUNT_SLOT_COUNT; i++) {
    const slot = i;
    actions[`reddit_account_${slot}_test`] = ({ settings, logger }) =>
      testRedditAccountSlot(slot, settings, logger);
  }
  return actions;
}

// =============================================================================
// Plugin Definition
// =============================================================================

const plugin: ArchiverPlugin = {
  name: "Socials",
  version: "1.10.3",
  description:
    "Download images, galleries, and metadata from social media platforms",
  urlPatterns: [
    "https://reddit.com",
    "https://www.reddit.com",
    "https://old.reddit.com",
    "https://bsky.app",
    "https://x.com",
    "https://twitter.com",
    "https://www.twitter.com",
    "https://mobile.twitter.com",
  ],
  settings: [
    {
      key: "save_directory",
      type: "string",
      label: "Save Directory",
      description:
        "Base folder name for saved social media content within the root directory",
      required: false,
      defaultValue: "Socials",
      sortOrder: 0,
    },
    {
      key: "reddit_subfolder",
      type: "string",
      label: "Reddit Subfolder",
      description:
        "Subfolder name for Reddit content within the save directory",
      required: false,
      defaultValue: "Reddit",
      sortOrder: 1,
    },
    {
      key: "subreddit_sort",
      type: "select",
      label: "Subreddit Sort",
      description: "Sort order when downloading from a subreddit",
      defaultValue: "hot",
      validation: {
        options: [
          { label: "Hot", value: "hot" },
          { label: "New", value: "new" },
          { label: "Top", value: "top" },
          { label: "Rising", value: "rising" },
        ],
      },
      sortOrder: 2,
    },
    {
      key: "subreddit_time_filter",
      type: "select",
      label: "Top Posts Time Filter",
      description: "Time range when sorting by 'top'",
      defaultValue: "all",
      validation: {
        options: [
          { label: "Past Hour", value: "hour" },
          { label: "Past 24 Hours", value: "day" },
          { label: "Past Week", value: "week" },
          { label: "Past Month", value: "month" },
          { label: "Past Year", value: "year" },
          { label: "All Time", value: "all" },
        ],
      },
      sortOrder: 3,
    },
    {
      key: "subreddit_post_count",
      type: "number",
      label: "Reddit Posts to Download",
      description:
        "Number of posts to fetch from subreddits/profiles. -1 for max (~1000, Reddit limit)",
      defaultValue: "100",
      sortOrder: 4,
    },
    {
      key: "save_metadata",
      type: "boolean",
      label: "Save Metadata",
      description:
        "Save post metadata (Post.nfo) and comments (Comments.json) alongside media files",
      defaultValue: "true",
      sortOrder: 5,
    },
    ...buildRedditAccountSlotSettings(),
    {
      key: "bluesky_subfolder",
      type: "string",
      label: "Bluesky Subfolder",
      description:
        "Subfolder name for Bluesky content within the save directory",
      required: false,
      defaultValue: "Bluesky",
      sortOrder: 200,
    },
    {
      key: "bluesky_post_count",
      type: "number",
      label: "Bluesky Posts to Download",
      description:
        "Number of posts to fetch from a Bluesky profile. -1 for all available posts",
      defaultValue: "100",
      sortOrder: 201,
    },
    {
      key: "twitter_subfolder",
      type: "string",
      label: "Twitter/X Subfolder",
      description:
        "Subfolder name for Twitter/X content within the save directory",
      required: false,
      defaultValue: "Twitter",
      sortOrder: 210,
    },
  ],

  actions: {
    ...buildRedditAccountTestActions(),
  },

  async download(context: DownloadContext): Promise<DownloadResult> {
    const { url } = context;

    // Try Reddit first
    if (parseRedditUrl(url)) {
      return await downloadReddit(context);
    }

    // Try Bluesky
    if (parseBlueskyUrl(url)) {
      return await downloadBluesky(context);
    }

    // Try Twitter/X
    if (parseTwitterUrl(url)) {
      return await downloadTwitter(context);
    }

    return {
      success: false,
      message:
        "URL not recognized. Supported formats: reddit.com/r/.../comments/..., reddit.com/u/..., reddit.com/r/..., bsky.app/profile/{handle}, bsky.app/profile/{handle}/post/{id}, x.com/{user}/status/{id}",
    };
  },
};

export default plugin;
