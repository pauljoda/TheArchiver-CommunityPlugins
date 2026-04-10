/** File entry returned by the host's fetchFiles API */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

/** API provided by the plugin host */
export interface PluginViewAPI {
  currentPath: string;
  trackedDirectory: string;
  navigate: (path: string) => void;
  fetchFiles: (path: string) => Promise<FileEntry[]>;
  fetchFile: (path: string) => Promise<Response>;
  theme: {
    isDark: boolean;
    colors: Record<string, string>;
  };
}

/** Registration object passed to __archiver_register_view */
export interface PluginViewRegistration {
  render: (container: HTMLElement, api: PluginViewAPI) => void;
  destroy?: () => void;
  onPathChange?: (newPath: string, api: PluginViewAPI) => void;
}

/**
 * Change-tracking status for a post or comment. Matches the type used
 * server-side in plugin-social/shared.ts. Populated by the diff/merge step
 * in the Reddit downloader when a prior snapshot exists.
 */
export type ChangeStatus = "new" | "edited" | "deleted";

/** A single prior version of a post captured during an edit. */
export interface PostEditHistoryEntry {
  timestamp: string; // ISO-dash, e.g. "2026-04-09T14-30-22Z"
  title: string;
  selftext: string;
}

/** A single prior version of a comment body captured during an edit. */
export interface CommentEditHistoryEntry {
  timestamp: string; // ISO-dash
  body: string;
  body_html?: string;
}

/** Parsed Post.nfo metadata */
export interface PostMetadata {
  title: string;
  author: string;
  subreddit: string;
  score: number;
  upvoteRatio?: number;
  url: string;
  permalink: string;
  created: string;
  flair?: string;
  selftext?: string;
  isVideo?: boolean;
  isGallery?: boolean;
  numComments?: number;
  domain?: string;
  mediaUrl?: string;
  postHint?: string;
  over18?: boolean;
  spoiler?: boolean;
  /** Change-tracking annotations (see reddit change-tracker). */
  changeStatus?: ChangeStatus[];
  editHistory?: PostEditHistoryEntry[];
  /**
   * ISO timestamp of when this post was first archived from the user's
   * upvoted listing. Present only for posts discovered via /user/<name>/upvoted.
   * Combined with `upvotedPosition` it gives a stable sort key that
   * approximates "when the user upvoted this".
   */
  upvotedArchivedAt?: string;
  /**
   * 0-indexed position within the upvoted listing at first archive time.
   * 0 = most recently upvoted at the time of that archive run.
   */
  upvotedPosition?: number;
}

/** A single comment from Comments.json (matches CleanComment from plugin) */
export interface Comment {
  id?: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  depth: number;
  is_submitter?: boolean;
  stickied?: boolean;
  distinguished?: string | null;
  author_flair_text?: string | null;
  replies?: Comment[];
  media?: Record<string, string>; // maps media key (e.g. "giphy:ID") to local filename
  /** Change-tracking annotations (see reddit change-tracker). */
  changeStatus?: ChangeStatus[];
  editHistory?: CommentEditHistoryEntry[];
}

/** Subreddit card info for root view */
export interface SubredditInfo {
  name: string;
  path: string;
  postCount: number;
  /**
   * True when the folder contains only metadata files (e.g. just an
   * `icon.png` left over from the upvoted-run subreddit-icon fetcher) and
   * has no child directories or real content. The grid removes these
   * cards so they don't clutter the Social Browser root.
   */
  isEmpty: boolean;
  /** Preview type determines how the card thumbnail area renders */
  preview:
    | { type: "image"; src: string }
    | { type: "text"; title: string; snippet: string }
    | { type: "grid"; items: string[] }
    | { type: "empty" };
}

/** Post card info for subreddit view */
export interface PostInfo {
  title: string;
  path: string;
  thumbnail?: string;
  metadata?: PostMetadata;
  imageCount: number;
}

/** Parsed Bluesky Post.nfo metadata */
export interface BlueskyPostMetadata {
  text: string;
  authorHandle: string;
  displayName?: string;
  avatarUrl?: string;
  created: string;
  uri: string;
  url: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  externalLink?: {
    uri: string;
    title: string;
    description: string;
    thumb?: string;
  };
  quotePost?: {
    text: string;
    authorHandle: string;
    displayName?: string;
  };
  facets?: Array<{
    type: "mention" | "link" | "tag";
    byteStart: number;
    byteEnd: number;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
  hasVideo?: boolean;
  imageCount?: number;
}

/** A single reply from Replies.json */
export interface BlueskyReply {
  author: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  facets?: Array<{
    index: { byteStart: number; byteEnd: number };
    features: Array<{ $type: string; uri?: string; did?: string; tag?: string }>;
  }>;
  depth: number;
  replies: BlueskyReply[];
  images?: string[]; // local filenames of downloaded reply images
}

/** Bluesky post card info for timeline view */
export interface BlueskyPostInfo {
  path: string;
  metadata?: BlueskyPostMetadata;
  imageCount: number;
  images: string[];
}

/** Parsed Twitter Post.nfo metadata */
export interface TwitterPostMetadata {
  text: string;
  screenName: string;
  name: string;
  userId: string;
  profileImageUrl?: string;
  verified: boolean;
  created: string;
  url: string;
  favoriteCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  lang?: string;
  sensitive?: boolean;
  imageCount?: number;
  hasVideo?: boolean;
  links?: Array<{ display: string; expanded: string }>;
  mentions?: string[];
  hashtags?: string[];
  quoteTweet?: {
    id: string;
    screenName: string;
    name: string;
    text: string;
  };
  replyTo?: {
    id: string;
    screenName: string;
  };
}
