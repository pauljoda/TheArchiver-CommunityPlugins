import { execFile } from "child_process";
import { promisify } from "util";

export const execFileAsync = promisify(execFile);

// =============================================================================
// Core Plugin Types (re-exported from plugin-api.d.ts)
// =============================================================================

export type {
  DownloadResult,
  PluginSettingsAccessor,
  PluginLogger,
  DownloadContext,
  ArchiverPlugin,
  PluginHelpers,
} from "./plugin-api";

import type { DownloadContext } from "./plugin-api";

export type StringHelpers = DownloadContext["helpers"]["string"];

// Reddit-specific types

export interface RedditPost {
  id: string;
  name: string; // fullname e.g. "t3_abc123"
  title: string;
  author: string;
  subreddit: string;
  subreddit_name_prefixed: string;
  url: string;
  permalink: string;
  domain: string;
  selftext: string;
  selftext_html: string | null;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  edited: boolean | number;
  over_18: boolean;
  spoiler: boolean;
  stickied: boolean;
  locked: boolean;
  archived: boolean;
  is_video: boolean;
  is_gallery?: boolean;
  post_hint?: string;
  link_flair_text: string | null;
  author_flair_text: string | null;
  thumbnail: string;
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number };
      resolutions: Array<{ url: string; width: number; height: number }>;
    }>;
  };
  media_metadata?: Record<
    string,
    {
      status: string;
      e: string; // "Image" or "AnimatedImage"
      m: string; // MIME type e.g. "image/jpg"
      s: { u?: string; gif?: string; x: number; y: number };
    }
  >;
  gallery_data?: {
    items: Array<{ media_id: string; id: number; caption?: string }>;
  };
  crosspost_parent_list?: RedditPost[];
  is_gif?: boolean;
  media?: {
    reddit_video?: {
      fallback_url: string;
      height: number;
      width: number;
      duration: number;
      is_gif?: boolean;
      has_audio?: boolean;
    };
  };
  total_awards_received: number;
  all_awardings?: Array<{ name: string; count: number }>;
}

export interface ParsedRedditUrl {
  type: "post" | "user" | "subreddit";
  subreddit?: string;
  postId?: string;
  username?: string;
}

export interface MediaItem {
  url: string;
  filename: string;
}

export interface CleanComment {
  author: string;
  body: string;
  body_html?: string;
  score: number;
  created_utc: number;
  edited: boolean | number;
  is_submitter: boolean;
  author_flair_text: string | null;
  stickied: boolean;
  distinguished: string | null;
  depth: number;
  replies: CleanComment[];
  media?: Record<string, string>; // maps media key (e.g. giphy ID) to local filename
}

export interface MoreComments {
  kind: "more";
  count: number;
  children_ids: string[];
}

// Bluesky-specific types

export interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BlueskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
}

export interface BlueskyRecord {
  text: string;
  createdAt: string;
  facets?: BlueskyFacet[];
  embed?: {
    $type: string;
    images?: Array<{ alt?: string; image: { ref: { $link: string }; mimeType: string } }>;
    external?: { uri: string; title: string; description: string };
    record?: { uri: string; cid: string };
    video?: { ref: { $link: string }; mimeType: string };
  };
  reply?: {
    root: { uri: string; cid: string };
    parent: { uri: string; cid: string };
  };
}

export interface BlueskyImageView {
  thumb: string;
  fullsize: string;
  alt?: string;
  aspectRatio?: { width: number; height: number };
}

export interface BlueskyExternalView {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

export interface BlueskyEmbedView {
  $type: string;
  images?: BlueskyImageView[];
  external?: BlueskyExternalView;
  record?: {
    $type?: string;
    uri?: string;
    cid?: string;
    author?: BlueskyAuthor;
    value?: { text?: string; createdAt?: string };
    embeds?: BlueskyEmbedView[];
  };
  media?: BlueskyEmbedView;
  cid?: string;
  playlist?: string;
  thumbnail?: string;
  alt?: string;
  presentation?: string;
  aspectRatio?: { width: number; height: number };
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  author: BlueskyAuthor;
  record: BlueskyRecord;
  embed?: BlueskyEmbedView;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  quoteCount?: number;
  indexedAt: string;
}

export interface BlueskyFeedItem {
  post: BlueskyPost;
  reason?: { $type: string };
}

export interface BlueskyFeedResponse {
  cursor?: string;
  feed: BlueskyFeedItem[];
}

export interface BlueskyProfileResponse {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

export interface CleanBlueskyReply {
  author: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  facets?: BlueskyFacet[];
  depth: number;
  replies: CleanBlueskyReply[];
  images?: string[]; // local filenames of downloaded reply images
}

export interface ParsedBlueskyUrl {
  type: "profile" | "post";
  handle: string;
  rkey?: string;
}

export interface BlueskyThreadNode {
  $type?: string;
  post?: BlueskyPost;
  replies?: BlueskyThreadNode[];
  notFound?: boolean;
  blocked?: boolean;
}

// Twitter/X-specific types (Syndication API)

export interface TwitterUser {
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  is_blue_verified?: boolean;
}

export interface TwitterEntityUrl {
  display_url: string;
  expanded_url: string;
  url: string;
  indices: [number, number];
}

export interface TwitterEntityMention {
  screen_name: string;
  indices: [number, number];
}

export interface TwitterEntityHashtag {
  text: string;
  indices: [number, number];
}

export interface TwitterMediaDetail {
  media_url_https: string;
  type: "photo" | "video" | "animated_gif";
  original_info: { width: number; height: number };
  video_info?: {
    variants: Array<{ bitrate?: number; content_type: string; url: string }>;
  };
}

export interface TwitterTweet {
  __typename?: string;
  id_str: string;
  text: string;
  created_at: string;
  user: TwitterUser;
  favorite_count: number;
  conversation_count?: number;
  reply_count?: number;
  retweet_count?: number;
  quote_count?: number;
  lang?: string;
  entities?: {
    urls?: TwitterEntityUrl[];
    user_mentions?: TwitterEntityMention[];
    hashtags?: TwitterEntityHashtag[];
  };
  mediaDetails?: TwitterMediaDetail[];
  photos?: Array<{ url: string; width: number; height: number }>;
  video?: {
    variants: Array<{ type: string; src: string }>;
    poster?: string;
  };
  quoted_tweet?: TwitterTweet;
  in_reply_to_status_id_str?: string;
  in_reply_to_screen_name?: string;
  possibly_sensitive?: boolean;
}

export interface ParsedTwitterUrl {
  type: "post";
  username: string;
  tweetId: string;
}

// =============================================================================
// Shared Utilities
// =============================================================================

export function formatUnixTimestamp(utc: number): string {
  return new Date(utc * 1000).toISOString();
}
