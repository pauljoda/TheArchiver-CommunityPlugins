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
  openFile: (path: string) => void;
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
}

export type CardMediaPreview =
  | { type: "image"; src: string }
  | { type: "video"; src: string; poster?: string }
  | { type: "empty" };

/** A single comment from Comments.json (matches CleanComment from plugin) */
export interface Comment {
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
}

/** Subreddit card info for root view */
export interface SubredditInfo {
  name: string;
  path: string;
  postCount: number;
  /** Preview type determines how the card thumbnail area renders */
  preview:
    | CardMediaPreview
    | { type: "text"; title: string; snippet: string; label?: string }
    | { type: "grid"; items: string[] }
    | { type: "empty" };
}

/** Post card info for subreddit view */
export interface PostInfo {
  title: string;
  path: string;
  preview: CardMediaPreview;
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
