import type { PluginViewAPI, FileEntry, PostMetadata, BlueskyPostMetadata, TwitterPostMetadata } from "./types";
import { fetchPostMetadata, fetchBlueskyPostMetadata, fetchTwitterPostMetadata } from "./nfo-parser";
import { isImageFile, isVideoFile, getFileUrl } from "./card-helpers";
import { renderBlueskyRichText } from "./bluesky-richtext";

type Platform = "reddit" | "bluesky" | "twitter" | "unknown";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffDay > 30) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
    if (diffDay > 0) return `${diffDay}d`;
    const diffHour = Math.floor(diffMs / 3600000);
    if (diffHour > 0) return `${diffHour}h`;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin > 0) return `${diffMin}m`;
    return "now";
  } catch {
    return dateStr;
  }
}

function formatScore(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// SVG icons
const UPVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l-7 7h4v7h6v-7h4L10 3z"/></svg>`;
const DOWNVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17l7-7h-4V3H7v7H3l7 7z"/></svg>`;
const COMMENT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const SHARE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
const AWARD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;
const REPOST_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
const LIKE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const VERIFIED_ICON = `<svg width="14" height="14" viewBox="0 0 22 22" fill="currentColor"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.587.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.272 1.893.143.634-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.899.584-.274 1.083-.705 1.437-1.245.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`;

/** Normalized post for the gallery timeline, works across all platforms */
interface GalleryPost {
  path: string;
  platform: Platform;
  title: string;
  author: string;
  authorDisplay?: string;
  source: string;
  created: string;
  images: FileEntry[];
  videoFile?: FileEntry;
  thumbnailFile?: FileEntry;
  firstMediaPath?: string;
  // Reddit-specific
  score?: number;
  numComments?: number;
  isNsfw?: boolean;
  isSpoiler?: boolean;
  flair?: string;
  selftext?: string;
  domain?: string;
  isVideo?: boolean;
  // Bluesky-specific
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  quoteCount?: number;
  facets?: BlueskyPostMetadata["facets"];
  externalLink?: BlueskyPostMetadata["externalLink"];
  quotePost?: BlueskyPostMetadata["quotePost"];
  // Twitter-specific
  favoriteCount?: number;
  retweetCount?: number;
  twitterReplyCount?: number;
  verified?: boolean;
  links?: TwitterPostMetadata["links"];
  mentions?: string[];
  hashtags?: string[];
  quoteTweet?: TwitterPostMetadata["quoteTweet"];
}

function normalizeRedditPost(path: string, meta: PostMetadata, images: FileEntry[], videoFile?: FileEntry): GalleryPost {
  const firstMedia = videoFile || images[0];
  return {
    path,
    platform: "reddit",
    title: meta.title,
    author: meta.author,
    source: meta.subreddit ? `r/${meta.subreddit}` : "",
    created: meta.created,
    images,
    videoFile,
    firstMediaPath: firstMedia?.path,
    score: meta.score,
    numComments: meta.numComments,
    isNsfw: meta.over18,
    isSpoiler: meta.spoiler,
    flair: meta.flair,
    selftext: meta.selftext,
    domain: meta.domain,
    isVideo: meta.isVideo,
  };
}

function normalizeBlueskyPost(path: string, meta: BlueskyPostMetadata, images: FileEntry[], videoFile?: FileEntry, thumbnailFile?: FileEntry): GalleryPost {
  const firstMedia = videoFile || images[0];
  return {
    path,
    platform: "bluesky",
    title: meta.text,
    author: meta.authorHandle,
    authorDisplay: meta.displayName,
    source: `@${meta.authorHandle}`,
    created: meta.created,
    images,
    videoFile,
    thumbnailFile,
    firstMediaPath: firstMedia?.path,
    likeCount: meta.likeCount,
    replyCount: meta.replyCount,
    repostCount: meta.repostCount,
    quoteCount: meta.quoteCount,
    facets: meta.facets,
    externalLink: meta.externalLink,
    quotePost: meta.quotePost,
  };
}

function normalizeTwitterPost(path: string, meta: TwitterPostMetadata, images: FileEntry[], videoFile?: FileEntry): GalleryPost {
  const firstMedia = videoFile || images[0];
  return {
    path,
    platform: "twitter",
    title: meta.text,
    author: meta.screenName,
    authorDisplay: meta.name,
    source: `@${meta.screenName}`,
    created: meta.created,
    images,
    videoFile,
    firstMediaPath: firstMedia?.path,
    favoriteCount: meta.favoriteCount,
    retweetCount: meta.retweetCount,
    twitterReplyCount: meta.replyCount,
    verified: meta.verified,
    links: meta.links,
    mentions: meta.mentions,
    hashtags: meta.hashtags,
    quoteTweet: meta.quoteTweet,
  };
}

function createLightbox(
  images: { src: string; name: string }[],
  startIndex: number
): HTMLElement {
  let currentIndex = startIndex;

  const overlay = document.createElement("div");
  overlay.className = "reddit-lightbox";

  function update(): void {
    overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;

    overlay.querySelector(".reddit-lightbox-close")!.addEventListener("click", () => {
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
    });
    overlay.querySelector(".reddit-lightbox-prev")?.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      update();
    });
    overlay.querySelector(".reddit-lightbox-next")?.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % images.length;
      update();
    });
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
    }
  });

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
    } else if (e.key === "ArrowLeft") {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      update();
    } else if (e.key === "ArrowRight") {
      currentIndex = (currentIndex + 1) % images.length;
      update();
    }
  };
  document.addEventListener("keydown", handleKey);

  update();
  return overlay;
}

function buildMediaBlock(post: GalleryPost): HTMLElement | null {
  // Video file on disk
  if (post.videoFile) {
    const wrap = document.createElement("div");
    wrap.className = "rdt-media-wrap";
    const video = document.createElement("video");
    video.className = "rdt-media-video";
    video.src = getFileUrl(post.videoFile.path);
    video.controls = true;
    video.preload = "metadata";
    // GIF-type videos should autoplay and loop
    if (post.videoFile.name.includes(".gif.")) {
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
    }
    wrap.appendChild(video);
    return wrap;
  }

  // Images (incl. gallery)
  if (post.images.length > 0) {
    const wrap = document.createElement("div");
    wrap.className =
      "rdt-media-wrap" + (post.images.length > 1 ? " rdt-media-gallery" : "");

    const imageUrls = post.images.map((img) => ({
      src: getFileUrl(img.path),
      name: img.name,
    }));

    const imgEl = document.createElement("img");
    imgEl.className = "rdt-media-img";
    imgEl.src = imageUrls[0].src;
    imgEl.alt = post.images[0].name;
    imgEl.loading = "lazy";
    imgEl.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.appendChild(createLightbox(imageUrls, 0));
    });
    wrap.appendChild(imgEl);

    if (post.images.length > 1) {
      const badge = document.createElement("div");
      badge.className = "rdt-gallery-more";
      badge.textContent = `+${post.images.length - 1} more`;
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        document.body.appendChild(createLightbox(imageUrls, 0));
      });
      wrap.appendChild(badge);
    }
    return wrap;
  }

  // Selftext preview (Reddit only)
  if (post.platform === "reddit" && post.selftext && post.selftext.trim().length > 0) {
    const preview = document.createElement("div");
    preview.className = "rdt-selftext-preview";
    preview.textContent = post.selftext.slice(0, 600);
    return preview;
  }

  // External link preview (Reddit)
  if (post.platform === "reddit") {
    const isSelf =
      !post.domain ||
      post.domain.startsWith("self.") ||
      post.domain === "reddit.com";
    if (!isSelf && post.domain && !post.isVideo) {
      const preview = document.createElement("div");
      preview.className = "rdt-link-preview";
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(post.domain)}&sz=32`;
      preview.innerHTML = `
        <img class="rdt-link-favicon" src="${faviconUrl}" alt="" />
        <span class="rdt-link-domain">${escapeHtml(post.domain)}</span>
      `;
      return preview;
    }
  }

  // External link card (Bluesky)
  if (post.platform === "bluesky" && post.externalLink && post.externalLink.uri) {
    const linkCard = document.createElement("div");
    linkCard.className = "rdt-link-preview";
    let domain = "";
    try {
      domain = new URL(post.externalLink.uri).hostname;
    } catch {
      domain = post.externalLink.uri;
    }
    let thumbHtml = "";
    if (post.thumbnailFile) {
      thumbHtml = `<img class="rdt-link-favicon" src="${getFileUrl(post.thumbnailFile.path)}" alt="" />`;
    }
    linkCard.innerHTML = `
      ${thumbHtml}
      <span class="rdt-link-domain">${escapeHtml(domain)}</span>
      ${post.externalLink.title ? `<span style="margin-left:0.5rem;opacity:0.7">${escapeHtml(post.externalLink.title)}</span>` : ""}
    `;
    return linkCard;
  }

  return null;
}

function renderTextContent(post: GalleryPost): HTMLElement | null {
  if (post.platform === "bluesky" && post.facets) {
    return renderBlueskyRichText(post.title, post.facets);
  }

  if (post.platform === "twitter") {
    const el = document.createElement("div");
    el.className = "rdt-post-text";
    let html = escapeHtml(post.title);
    if (post.links) {
      for (const link of post.links) {
        html = html.replace(
          new RegExp(`https?://t\\.co/\\w+`),
          `<a class="twitter-link" href="${escapeHtml(link.expanded)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.display)}</a>`
        );
      }
    }
    html = html.replace(/@(\w{1,15})/g, `<a class="twitter-mention" href="https://x.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>`);
    html = html.replace(/#(\w+)/g, `<span class="twitter-hashtag">#$1</span>`);
    html = html.replace(/\n/g, "<br>");
    el.innerHTML = html;
    return el;
  }

  return null;
}

function renderEngagement(post: GalleryPost): HTMLElement | null {
  const engagement = document.createElement("div");
  engagement.className = "rdt-engagement";

  if (post.platform === "reddit") {
    const score = post.score ?? 0;
    const scoreClass =
      score > 0 ? "rdt-score-up" : score < 0 ? "rdt-score-down" : "rdt-score-neutral";
    const commentCount = post.numComments ?? 0;

    engagement.innerHTML = `
      <span class="rdt-engage-btn rdt-engage-votes">
        <span class="rdt-vote-up">${UPVOTE_ICON}</span>
        <span class="rdt-vote-score ${scoreClass}">${formatScore(score)}</span>
        <span class="rdt-vote-down">${DOWNVOTE_ICON}</span>
      </span>
      <span class="rdt-engage-btn rdt-engage-comments">
        ${COMMENT_ICON}
        <span>${formatScore(commentCount)}</span>
      </span>
      <span class="rdt-engage-btn">${AWARD_ICON}</span>
      <span class="rdt-engage-btn">${SHARE_ICON} <span>Share</span></span>
    `;
  } else if (post.platform === "bluesky") {
    engagement.innerHTML = `
      <span class="rdt-engage-btn">${COMMENT_ICON} <span>${formatScore(post.replyCount ?? 0)}</span></span>
      <span class="rdt-engage-btn">${REPOST_ICON} <span>${formatScore(post.repostCount ?? 0)}</span></span>
      <span class="rdt-engage-btn">${LIKE_ICON} <span>${formatScore(post.likeCount ?? 0)}</span></span>
    `;
  } else if (post.platform === "twitter") {
    engagement.innerHTML = `
      <span class="rdt-engage-btn">${COMMENT_ICON} <span>${formatScore(post.twitterReplyCount ?? 0)}</span></span>
      <span class="rdt-engage-btn">${REPOST_ICON} <span>${formatScore(post.retweetCount ?? 0)}</span></span>
      <span class="rdt-engage-btn">${LIKE_ICON} <span>${formatScore(post.favoriteCount ?? 0)}</span></span>
    `;
  } else {
    // Unknown platform — no engagement bar
    return null;
  }

  return engagement;
}

function renderPostCard(
  post: GalleryPost,
  avatarUrl: string | null
): HTMLElement {
  const card = document.createElement("div");
  card.className = "rdt-post-card";

  // -- Header: avatar + source + author + time --
  const hasSource = post.source && post.source.length > 0;
  const hasAuthor = post.author && post.author.length > 0;
  const hasCreated = post.created && post.created.length > 0;

  if (hasSource || hasAuthor || hasCreated) {
    const header = document.createElement("div");
    header.className = "rdt-post-header";

    let avatarHtml = "";
    if (avatarUrl) {
      avatarHtml = `<img class="rdt-subreddit-icon" src="${escapeHtml(avatarUrl)}" alt="" />`;
    } else if (hasSource || hasAuthor) {
      avatarHtml = `<div class="rdt-subreddit-icon rdt-subreddit-icon-placeholder"></div>`;
    }

    const displayAuthor = post.authorDisplay || post.author;
    const verifiedHtml = post.verified ? `<span class="twitter-verified-sm">${VERIFIED_ICON}</span>` : "";

    const parts: string[] = [];
    if (avatarHtml) parts.push(avatarHtml);
    if (hasSource) parts.push(`<span class="rdt-subreddit">${escapeHtml(post.source)}</span>`);
    if (hasAuthor && post.platform !== "reddit") {
      if (parts.length > 1) parts.push(`<span class="rdt-meta-sep">&middot;</span>`);
      parts.push(`<span class="rdt-author">${escapeHtml(displayAuthor)} ${verifiedHtml}</span>`);
    }
    if (hasCreated) {
      if (parts.length > 1) parts.push(`<span class="rdt-meta-sep">&middot;</span>`);
      parts.push(`<span class="rdt-timestamp">${formatRelativeTime(post.created)}</span>`);
    }

    header.innerHTML = parts.join("\n");
    card.appendChild(header);
  }

  // -- Badges (Reddit: NSFW, Spoiler, Flair) --
  const hasFlair = post.flair && post.flair.trim().length > 0;
  if (post.isNsfw || post.isSpoiler || hasFlair) {
    const badges = document.createElement("div");
    badges.className = "rdt-badges";
    if (post.isNsfw) badges.innerHTML += `<span class="rdt-badge rdt-badge-nsfw">NSFW</span>`;
    if (post.isSpoiler) badges.innerHTML += `<span class="rdt-badge rdt-badge-spoiler">Spoiler</span>`;
    if (hasFlair) badges.innerHTML += `<span class="rdt-flair">${escapeHtml(post.flair!)}</span>`;
    card.appendChild(badges);
  }

  // -- Title (Reddit/unknown) or text content (Bluesky/Twitter) --
  if (post.platform === "reddit" || post.platform === "unknown") {
    if (post.title) {
      const titleEl = document.createElement("h3");
      titleEl.className = "rdt-post-title";
      titleEl.textContent = post.title;
      card.appendChild(titleEl);
    }
  } else {
    const textEl = renderTextContent(post);
    if (textEl) card.appendChild(textEl);
  }

  // -- Media / content block --
  const mediaEl = buildMediaBlock(post);
  if (mediaEl) card.appendChild(mediaEl);

  // -- Quote card (Bluesky quote post or Twitter quote tweet) --
  const quote = post.quotePost
    ? { name: post.quotePost.displayName || post.quotePost.authorHandle, handle: post.quotePost.authorHandle, text: post.quotePost.text }
    : post.quoteTweet
      ? { name: post.quoteTweet.name, handle: post.quoteTweet.screenName, text: post.quoteTweet.text }
      : null;

  if (quote && quote.handle) {
    const quoteCard = document.createElement("div");
    quoteCard.className = "rdt-quote-card";
    quoteCard.innerHTML = `
      <div class="rdt-quote-header">
        <span class="rdt-author">${escapeHtml(quote.name)}</span>
        <span class="rdt-timestamp">@${escapeHtml(quote.handle)}</span>
      </div>
      <div class="rdt-quote-text">${escapeHtml(quote.text).replace(/\n/g, "<br>")}</div>
    `;
    card.appendChild(quoteCard);
  }

  // -- Engagement bar --
  const engagementEl = renderEngagement(post);
  if (engagementEl) card.appendChild(engagementEl);

  return card;
}

async function loadPostForPlatform(
  api: PluginViewAPI,
  dir: FileEntry,
  platform: Platform
): Promise<GalleryPost | null> {
  const files = await api.fetchFiles(dir.path);

  const images = files.filter(
    (f) =>
      !f.isDirectory &&
      isImageFile(f.name) &&
      f.name !== "Video Thumbnail.jpg" &&
      f.name !== "Thumbnail.jpg"
  );

  const videoFile = files.find(
    (f) => !f.isDirectory && isVideoFile(f.name)
  );

  const thumbnailFile = files.find(
    (f) => !f.isDirectory && f.name === "Thumbnail.jpg"
  );

  if (platform === "bluesky") {
    const meta = await fetchBlueskyPostMetadata(api, dir.path);
    if (meta) return normalizeBlueskyPost(dir.path, meta, images, videoFile, thumbnailFile);
  }

  if (platform === "twitter") {
    const meta = await fetchTwitterPostMetadata(api, dir.path);
    if (meta) return normalizeTwitterPost(dir.path, meta, images, videoFile);
  }

  if (platform === "reddit" || platform === "unknown") {
    const meta = await fetchPostMetadata(api, dir.path);
    if (meta) return normalizeRedditPost(dir.path, meta, images, videoFile);
  }

  // No metadata for any platform — show bare post if there's media
  if (images.length === 0 && !videoFile) return null;
  return {
    path: dir.path,
    platform: "unknown",
    title: dir.name,
    author: "",
    source: "",
    created: dir.modifiedAt || "",
    images,
    videoFile,
    firstMediaPath: (videoFile || images[0])?.path,
  };
}

/** Create a GalleryPost from a single file (flat gallery mode) */
function fileToGalleryPost(file: FileEntry): GalleryPost {
  const isVideo = isVideoFile(file.name);
  return {
    path: file.path,
    platform: "unknown",
    title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
    author: "",
    source: "",
    created: file.modifiedAt || "",
    images: isVideo ? [] : [file],
    videoFile: isVideo ? file : undefined,
    firstMediaPath: file.path,
  };
}

function getSortScore(post: GalleryPost): number {
  if (post.score !== undefined) return post.score;
  if (post.likeCount !== undefined) return post.likeCount;
  if (post.favoriteCount !== undefined) return post.favoriteCount;
  return 0;
}

const BATCH_SIZE = 20;

export async function renderGalleryTimeline(
  container: HTMLElement,
  api: PluginViewAPI,
  dirPath: string,
  platform: Platform
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading timeline...</div>`;

  const entries = await api.fetchFiles(dirPath);
  const postDirs = entries.filter((e) => e.isDirectory);

  // Check for profile/subreddit avatar icon
  const iconFiles = entries.filter(
    (e) =>
      !e.isDirectory &&
      (e.name === "icon.jpg" || e.name === "icon.png" || e.name === "icon.webp")
  );
  const avatarUrl =
    iconFiles.length > 0
      ? getFileUrl(iconFiles[0].path)
      : null;

  let allPosts: GalleryPost[];

  if (postDirs.length > 0) {
    // Try folder-based: each subdirectory is a post
    const postPromises = postDirs.map((dir) => loadPostForPlatform(api, dir, platform));
    allPosts = (await Promise.all(postPromises)).filter(
      (p): p is GalleryPost => p !== null
    );
  } else {
    allPosts = [];
  }

  // Fallback: if no posts from subdirectories (or no subdirs at all),
  // check for media files directly in this directory (flat gallery)
  if (allPosts.length === 0) {
    const mediaFiles = entries.filter(
      (e) => !e.isDirectory && (isImageFile(e.name) || isVideoFile(e.name))
    );
    allPosts = mediaFiles.map(fileToGalleryPost);
  }

  if (allPosts.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">&#9729;</div>
        <span>No posts archived yet</span>
      </div>
    `;
    return;
  }

  // Sort state
  let sortMode: "new" | "top" = "new";

  function applySort(): void {
    if (sortMode === "new") {
      allPosts.sort(
        (a, b) =>
          new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    } else {
      allPosts.sort((a, b) => getSortScore(b) - getSortScore(a));
    }
  }

  applySort();

  container.innerHTML = "";

  // -- Profile header --
  const dirName = dirPath.split("/").pop() || "";
  const profileHeader = document.createElement("div");
  profileHeader.className = "rdt-profile-header";

  let avatarHtml = "";
  if (avatarUrl) {
    avatarHtml = `<img class="rdt-profile-avatar" src="${avatarUrl}" alt="" />`;
  }

  let sourcePrefix = "";
  if (platform === "reddit") sourcePrefix = "r/";
  else if (platform === "bluesky" || platform === "twitter") sourcePrefix = "@";

  profileHeader.innerHTML = `
    ${avatarHtml}
    <div class="rdt-profile-info">
      <h2 class="rdt-profile-name">${sourcePrefix}${escapeHtml(dirName)}</h2>
      <span class="rdt-profile-count">${allPosts.length} archived posts</span>
    </div>
    <div class="rdt-profile-controls">
      <select class="rdt-sort-select" aria-label="Sort posts">
        <option value="new">Newest</option>
        <option value="top">Top</option>
      </select>
    </div>
  `;
  container.appendChild(profileHeader);

  const sortSelect = profileHeader.querySelector<HTMLSelectElement>(".rdt-sort-select")!;

  // -- Timeline container --
  const timeline = document.createElement("div");
  timeline.className = "rdt-timeline";
  container.appendChild(timeline);

  let loadedCount = 0;

  function renderBatch(): void {
    const batch = allPosts.slice(loadedCount, loadedCount + BATCH_SIZE);
    for (const post of batch) {
      const card = renderPostCard(post, avatarUrl);

      // Card click opens first media file in built-in viewer
      if (post.firstMediaPath) {
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          // Don't trigger if clicking media (lightbox), links, or videos
          if (
            target.closest(".rdt-media-wrap") ||
            target.closest("a") ||
            target.closest("video")
          ) return;
          api.openFile(post.firstMediaPath!);
        });
      }

      timeline.appendChild(card);
    }
    loadedCount += batch.length;

    // Remove existing load more button
    const existingBtn = container.querySelector(".rdt-load-more");
    if (existingBtn) existingBtn.remove();

    // Add load more button if there are more posts
    if (loadedCount < allPosts.length) {
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "rdt-load-more";
      loadMoreBtn.textContent = `Load more (${allPosts.length - loadedCount} remaining)`;
      loadMoreBtn.addEventListener("click", () => {
        renderBatch();
      });
      container.appendChild(loadMoreBtn);
    }
  }

  // Sort toggle handler
  sortSelect.addEventListener("change", () => {
    sortMode = sortSelect.value as "new" | "top";
    applySort();
    loadedCount = 0;
    timeline.innerHTML = "";
    const existingBtn = container.querySelector(".rdt-load-more");
    if (existingBtn) existingBtn.remove();
    renderBatch();
  });

  renderBatch();
}
