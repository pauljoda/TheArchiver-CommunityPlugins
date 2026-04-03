import type { PluginViewAPI, PostMetadata, BlueskyPostMetadata, TwitterPostMetadata } from "./types";

// Social-platform NFO parsers have been removed from this plugin.
// Reddit, Bluesky, and Twitter are now handled by the social plugin.
// These stubs remain for view-layer compatibility until the view is updated.

export async function fetchPostMetadata(
  _api: PluginViewAPI,
  _dirPath: string
): Promise<PostMetadata | null> {
  return null;
}

export async function fetchBlueskyPostMetadata(
  _api: PluginViewAPI,
  _dirPath: string
): Promise<BlueskyPostMetadata | null> {
  return null;
}

export async function fetchTwitterPostMetadata(
  _api: PluginViewAPI,
  _dirPath: string
): Promise<TwitterPostMetadata | null> {
  return null;
}

export async function detectNfoPlatform(
  _api: PluginViewAPI,
  _dirPath: string
): Promise<"reddit" | "bluesky" | "twitter" | null> {
  return null;
}
