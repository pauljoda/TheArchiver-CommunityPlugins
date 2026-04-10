import type {
  PluginViewAPI,
  PostMetadata,
  BlueskyPostMetadata,
  TwitterPostMetadata,
  ChangeStatus,
  PostEditHistoryEntry,
} from "./types";

/**
 * Parse a Reddit Post.nfo XML file into PostMetadata.
 */
function parseNfoXml(xmlText: string): PostMetadata | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) return null;

    const root = doc.querySelector("postdetails");
    if (!root) return null;

    const text = (tag: string): string => {
      const el = root.querySelector(tag);
      return el?.textContent?.trim() || "";
    };

    const num = (tag: string): number => {
      const val = text(tag);
      return val ? parseInt(val, 10) || 0 : 0;
    };

    const float = (tag: string): number | undefined => {
      const val = text(tag);
      return val ? parseFloat(val) || undefined : undefined;
    };

    const bool = (tag: string): boolean => {
      return text(tag) === "true";
    };

    const upvotedArchivedAtRaw = text("upvoted_archived_at");
    const upvotedPositionRaw = text("upvoted_position");

    // Change-tracking annotations (populated by the downloader's
    // diff/merge step when a prior snapshot exists). Both fields are
    // optional — pre-1.9 Post.nfo files don't carry them.
    let changeStatus: ChangeStatus[] | undefined;
    const changeStatusRaw = text("change_status");
    if (changeStatusRaw) {
      const parts = changeStatusRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is ChangeStatus =>
          s === "new" || s === "edited" || s === "deleted"
        );
      if (parts.length > 0) changeStatus = parts;
    }

    let editHistory: PostEditHistoryEntry[] | undefined;
    const historyEl = root.querySelector("edit_history");
    if (historyEl) {
      const entries: PostEditHistoryEntry[] = [];
      historyEl.querySelectorAll("entry").forEach((entry) => {
        const ts = entry.getAttribute("timestamp") || "";
        const titleEl = entry.querySelector("title");
        const selfEl = entry.querySelector("selftext");
        entries.push({
          timestamp: ts,
          title: titleEl?.textContent || "",
          selftext: selfEl?.textContent || "",
        });
      });
      if (entries.length > 0) editHistory = entries;
    }

    return {
      title: text("title"),
      author: text("author") || "[deleted]",
      subreddit: text("subreddit"),
      score: num("score"),
      upvoteRatio: float("upvote_ratio"),
      url: text("url") || text("source_url"),
      permalink: text("url"),
      created: text("created"),
      flair: text("flair") || undefined,
      selftext: text("selftext") || undefined,
      isVideo: bool("is_video"),
      isGallery: bool("is_gallery"),
      numComments: num("num_comments") || undefined,
      domain: text("domain") || undefined,
      mediaUrl: text("media_url") || undefined,
      postHint: text("post_hint") || undefined,
      over18: bool("over_18"),
      spoiler: bool("spoiler"),
      upvotedArchivedAt: upvotedArchivedAtRaw || undefined,
      upvotedPosition: upvotedPositionRaw
        ? parseInt(upvotedPositionRaw, 10)
        : undefined,
      changeStatus,
      editHistory,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a Bluesky Post.nfo XML file into BlueskyPostMetadata.
 */
function parseBlueskyNfoXml(xmlText: string): BlueskyPostMetadata | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) return null;

    const root = doc.querySelector("blueskypost");
    if (!root) return null;

    const text = (tag: string): string => {
      const el = root.querySelector(tag);
      return el?.textContent?.trim() || "";
    };

    const num = (tag: string): number => {
      const val = text(tag);
      return val ? parseInt(val, 10) || 0 : 0;
    };

    const result: BlueskyPostMetadata = {
      text: text("text"),
      authorHandle: text("handle") || "unknown",
      displayName: text("display_name") || undefined,
      avatarUrl: text("avatar_url") || undefined,
      created: text("created"),
      uri: text("uri"),
      url: text("url"),
      likeCount: num("like_count"),
      replyCount: num("reply_count"),
      repostCount: num("repost_count"),
      quoteCount: num("quote_count"),
    };

    // Parse external link
    const extLink = root.querySelector("external_link");
    if (extLink) {
      const linkText = (tag: string): string => {
        const el = extLink.querySelector(tag);
        return el?.textContent?.trim() || "";
      };
      result.externalLink = {
        uri: linkText("link_uri"),
        title: linkText("link_title"),
        description: linkText("link_description"),
        thumb: linkText("link_thumb") || undefined,
      };
    }

    // Parse quote post
    const quotePost = root.querySelector("quote_post");
    if (quotePost) {
      const quoteText = (tag: string): string => {
        const el = quotePost.querySelector(tag);
        return el?.textContent?.trim() || "";
      };
      result.quotePost = {
        text: quoteText("quote_text"),
        authorHandle: quoteText("quote_author"),
        displayName: quoteText("quote_display_name") || undefined,
      };
    }

    // Parse facets
    const facetsEl = root.querySelector("facets");
    if (facetsEl) {
      const facetEls = facetsEl.querySelectorAll("facet");
      if (facetEls.length > 0) {
        result.facets = [];
        facetEls.forEach((el) => {
          const type = el.getAttribute("type") as "mention" | "link" | "tag";
          const byteStart = parseInt(el.getAttribute("byte_start") || "0", 10);
          const byteEnd = parseInt(el.getAttribute("byte_end") || "0", 10);
          result.facets!.push({
            type,
            byteStart,
            byteEnd,
            uri: el.getAttribute("uri") || undefined,
            did: el.getAttribute("did") || undefined,
            tag: el.getAttribute("tag") || undefined,
          });
        });
      }
    }

    // Check for video
    const videoEl = root.querySelector("video");
    if (videoEl) {
      result.hasVideo = true;
    }

    // Image count
    const imgCount = num("image_count");
    if (imgCount > 0) {
      result.imageCount = imgCount;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Parse a Twitter Post.nfo XML file into TwitterPostMetadata.
 */
function parseTwitterNfoXml(xmlText: string): TwitterPostMetadata | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) return null;

    const root = doc.querySelector("twitterpost");
    if (!root) return null;

    const text = (tag: string): string => {
      const el = root.querySelector(tag);
      return el?.textContent?.trim() || "";
    };

    const num = (tag: string): number => {
      const val = text(tag);
      return val ? parseInt(val, 10) || 0 : 0;
    };

    const result: TwitterPostMetadata = {
      text: text("text"),
      screenName: text("screen_name") || "unknown",
      name: text("name") || text("screen_name") || "unknown",
      userId: text("user_id"),
      profileImageUrl: text("profile_image_url") || undefined,
      verified: text("verified") === "true",
      created: text("created"),
      url: text("url"),
      favoriteCount: num("favorite_count"),
      retweetCount: num("retweet_count"),
      replyCount: num("reply_count"),
      quoteCount: num("quote_count"),
      lang: text("lang") || undefined,
    };

    // Parse links
    const linksEl = root.querySelector("links");
    if (linksEl) {
      const linkEls = linksEl.querySelectorAll("link");
      if (linkEls.length > 0) {
        result.links = [];
        linkEls.forEach((el) => {
          result.links!.push({
            display: el.getAttribute("display") || "",
            expanded: el.getAttribute("expanded") || "",
          });
        });
      }
    }

    // Parse mentions
    const mentionsEl = root.querySelector("mentions");
    if (mentionsEl) {
      const mentionEls = mentionsEl.querySelectorAll("mention");
      if (mentionEls.length > 0) {
        result.mentions = [];
        mentionEls.forEach((el) => {
          const sn = el.getAttribute("screen_name");
          if (sn) result.mentions!.push(sn);
        });
      }
    }

    // Parse hashtags
    const hashtagsEl = root.querySelector("hashtags");
    if (hashtagsEl) {
      const tagEls = hashtagsEl.querySelectorAll("hashtag");
      if (tagEls.length > 0) {
        result.hashtags = [];
        tagEls.forEach((el) => {
          const t = el.textContent?.trim();
          if (t) result.hashtags!.push(t);
        });
      }
    }

    // Parse quote tweet
    const quoteEl = root.querySelector("quote_tweet");
    if (quoteEl) {
      const quoteText = (tag: string): string => {
        const el = quoteEl.querySelector(tag);
        return el?.textContent?.trim() || "";
      };
      result.quoteTweet = {
        id: quoteText("quote_id"),
        screenName: quoteText("quote_screen_name"),
        name: quoteText("quote_name"),
        text: quoteText("quote_text"),
      };
    }

    // Parse reply info
    const replyEl = root.querySelector("reply");
    if (replyEl) {
      const replyText = (tag: string): string => {
        const el = replyEl.querySelector(tag);
        return el?.textContent?.trim() || "";
      };
      result.replyTo = {
        id: replyText("in_reply_to_id"),
        screenName: replyText("in_reply_to_user"),
      };
    }

    // Sensitive flag
    if (text("sensitive") === "true") {
      result.sensitive = true;
    }

    // Image count
    const imgCount = num("image_count");
    if (imgCount > 0) result.imageCount = imgCount;

    // Video flag
    if (text("has_video") === "true") result.hasVideo = true;

    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch and parse a Post.nfo file for a given directory path.
 * Returns Reddit PostMetadata or null.
 */
export async function fetchPostMetadata(
  api: PluginViewAPI,
  dirPath: string
): Promise<PostMetadata | null> {
  try {
    const res = await api.fetchFile(`${dirPath}/Post.nfo`);
    if (!res.ok) return null;
    const text = await res.text();
    return parseNfoXml(text);
  } catch {
    return null;
  }
}

/**
 * Fetch and parse a Bluesky Post.nfo file for a given directory path.
 */
export async function fetchBlueskyPostMetadata(
  api: PluginViewAPI,
  dirPath: string
): Promise<BlueskyPostMetadata | null> {
  try {
    const res = await api.fetchFile(`${dirPath}/Post.nfo`);
    if (!res.ok) return null;
    const text = await res.text();
    return parseBlueskyNfoXml(text);
  } catch {
    return null;
  }
}

/**
 * Fetch and parse a Twitter Post.nfo file for a given directory path.
 */
export async function fetchTwitterPostMetadata(
  api: PluginViewAPI,
  dirPath: string
): Promise<TwitterPostMetadata | null> {
  try {
    const res = await api.fetchFile(`${dirPath}/Post.nfo`);
    if (!res.ok) return null;
    const text = await res.text();
    return parseTwitterNfoXml(text);
  } catch {
    return null;
  }
}

/**
 * Detect whether a Post.nfo file is Reddit, Bluesky, or Twitter format.
 */
export async function detectNfoPlatform(
  api: PluginViewAPI,
  dirPath: string
): Promise<"reddit" | "bluesky" | "twitter" | null> {
  try {
    const res = await api.fetchFile(`${dirPath}/Post.nfo`);
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("<twitterpost>")) return "twitter";
    if (text.includes("<blueskypost>")) return "bluesky";
    if (text.includes("<postdetails>")) return "reddit";
    return null;
  } catch {
    return null;
  }
}
