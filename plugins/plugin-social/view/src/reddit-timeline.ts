import type { PluginViewAPI, FileEntry, PostMetadata } from "./types";
import { fetchPostMetadata } from "./nfo-parser";
import { LazyFeedCard } from "./lazy-feed-card";
import { mapLimit } from "./async-utils";
import { isImageFile, isVideoFile } from "../../../_shared/view/media-player";

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
    if (diffDay > 0) return `${diffDay}d ago`;
    const diffHour = Math.floor(diffMs / 3600000);
    if (diffHour > 0) return `${diffHour}h ago`;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin > 0) return `${diffMin}m ago`;
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

// SVG icons matching Reddit's UI
const UPVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l-7 7h4v7h6v-7h4L10 3z"/></svg>`;
const DOWNVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17l7-7h-4V3H7v7H3l7 7z"/></svg>`;
const COMMENT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const SHARE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
const AWARD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;

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

interface RedditTimelinePost {
  path: string;
  metadata: PostMetadata;
  images: FileEntry[];
  videoFile?: FileEntry;
}

/** Matches `icon.png` / `icon.jpg` / `icon.jpeg` / `icon.webp` (case-insensitive). */
const ICON_FILENAME_RE = /^icon\.(jpe?g|png|webp)$/i;

/**
 * For a mixed-subreddit timeline (e.g. the Upvoted view), walk ancestor
 * directories of `subredditPath` until we find one that holds sibling
 * folders for the subreddits we care about — that ancestor is the "Reddit
 * subfolder root" — then fetch each subreddit's `icon.*` file and return a
 * map from subreddit name to a `/api/files/download?path=...` URL.
 *
 * For the single-subreddit view, this still does the right thing: the probe
 * succeeds at the parent directory, and the map contains exactly one entry
 * (the current subreddit).
 */
async function resolveSubredditIconMap(
  api: PluginViewAPI,
  subredditPath: string,
  subreddits: Set<string>
): Promise<Map<string, string>> {
  const iconMap = new Map<string, string>();
  if (subreddits.size === 0) return iconMap;

  const probeSubreddit = subreddits.values().next().value as string;
  if (!probeSubreddit) return iconMap;

  // Walk up at most 5 ancestors looking for a directory that contains a
  // sibling folder matching the probe subreddit. First hit wins.
  const segments = subredditPath.split("/").filter(Boolean);
  const leadingSlash = subredditPath.startsWith("/") ? "/" : "";

  let redditRoot: string | null = null;
  for (let depth = 1; depth <= 5 && !redditRoot; depth++) {
    if (segments.length - depth <= 0) break;
    const ancestor = leadingSlash + segments.slice(0, segments.length - depth).join("/");
    if (!ancestor) continue;
    try {
      const ancestorEntries = await api.fetchFiles(ancestor);
      const ancestorChildren = new Set(
        ancestorEntries.filter((e) => e.isDirectory).map((e) => e.name)
      );
      if (ancestorChildren.has(probeSubreddit)) {
        redditRoot = ancestor;
        break;
      }
    } catch {
      // Directory doesn't exist or isn't readable — keep walking up.
    }
  }

  if (!redditRoot) return iconMap;

  // Fetch the icon listing for each unique subreddit in parallel (small fan-out).
  await mapLimit(Array.from(subreddits), 6, async (sub) => {
    try {
      const entries = await api.fetchFiles(`${redditRoot}/${sub}`);
      const iconEntry = entries.find(
        (e) => !e.isDirectory && ICON_FILENAME_RE.test(e.name)
      );
      if (iconEntry) {
        iconMap.set(
          sub,
          `/api/files/download?path=${encodeURIComponent(iconEntry.path)}`
        );
      }
    } catch {
      // Subreddit folder missing (user never downloaded that sub directly)
      // → no icon; card falls back to the placeholder.
    }
  });

  return iconMap;
}

function buildMediaBlock(
  post: RedditTimelinePost,
  observeVideo: (video: HTMLVideoElement) => void
): HTMLElement | null {
  const meta = post.metadata;

  // Video file on disk
  if (post.videoFile) {
    const wrap = document.createElement("div");
    wrap.className = "rdt-media-wrap";
    const video = document.createElement("video");
    video.className = "rdt-media-video";
    video.src = `/api/files/download?path=${encodeURIComponent(post.videoFile.path)}`;
    video.controls = true;
    video.preload = "metadata";
    // Autoplay-when-in-viewport wiring. The shared observer at the timeline
    // level decides when to call `video.play()` / `video.pause()` based on
    // scroll position. Muted + loop + playsInline are set here (and also
    // inside `observeVideo` as belt-and-braces) because browsers require
    // `muted` AND `playsinline` for autoplay without user interaction.
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    observeVideo(video);
    wrap.appendChild(video);
    return wrap;
  }

  // Images (incl. gallery)
  if (post.images.length > 0) {
    const wrap = document.createElement("div");
    wrap.className =
      "rdt-media-wrap" + (post.images.length > 1 ? " rdt-media-gallery" : "");

    const imageUrls = post.images.map((img) => ({
      src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
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

  // Selftext preview
  if (meta.selftext && meta.selftext.trim().length > 0) {
    const preview = document.createElement("div");
    preview.className = "rdt-selftext-preview";
    preview.textContent = meta.selftext.slice(0, 600);
    return preview;
  }

  // External link preview
  const isSelf =
    !meta.domain ||
    meta.domain.startsWith("self.") ||
    meta.domain === "reddit.com";
  if (!isSelf && meta.domain && !meta.isVideo) {
    const preview = document.createElement("div");
    preview.className = "rdt-link-preview";
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(meta.domain)}&sz=32`;
    preview.innerHTML = `
      <img class="rdt-link-favicon" src="${faviconUrl}" alt="" />
      <span class="rdt-link-domain">${escapeHtml(meta.domain)}</span>
    `;
    return preview;
  }

  return null;
}

function renderPostCard(
  post: RedditTimelinePost,
  api: PluginViewAPI,
  lookupSubredditIcon: (subreddit: string) => string | null,
  observeVideo: (video: HTMLVideoElement) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "rdt-post-card";
  const meta = post.metadata;

  // -- Header: subreddit icon + r/subreddit · author · time --
  const header = document.createElement("div");
  header.className = "rdt-post-header";

  // Per-card icon resolution: look up the post's own subreddit in the preloaded
  // icon map. For mixed-subreddit timelines (e.g. the Upvoted view) this gives
  // each card the correct icon; for single-subreddit views it's the same icon
  // for every card. If no icon is available we render the header WITHOUT an
  // avatar (no placeholder circle) and also hide any <img> at runtime if the
  // network fetch for the file fails.
  const perPostIcon = meta.subreddit ? lookupSubredditIcon(meta.subreddit) : null;

  const avatarHtml = perPostIcon
    ? `<img class="rdt-subreddit-icon" src="${escapeHtml(perPostIcon)}" alt="" onerror="this.style.display='none'" />`
    : "";

  header.innerHTML = `
    ${avatarHtml}
    <span class="rdt-subreddit">r/${escapeHtml(meta.subreddit)}</span>
    <span class="rdt-meta-sep">&middot;</span>
    <span class="rdt-timestamp">${formatRelativeTime(meta.created)}</span>
  `;
  card.appendChild(header);

  // -- Badges row (NSFW, Spoiler, Flair) --
  const hasFlair = meta.flair && meta.flair.trim().length > 0;
  const isNsfw = meta.over18 === true;
  const isSpoiler = meta.spoiler === true;
  if (isNsfw || isSpoiler || hasFlair) {
    const badges = document.createElement("div");
    badges.className = "rdt-badges";
    if (isNsfw) {
      badges.innerHTML += `<span class="rdt-badge rdt-badge-nsfw">NSFW</span>`;
    }
    if (isSpoiler) {
      badges.innerHTML += `<span class="rdt-badge rdt-badge-spoiler">Spoiler</span>`;
    }
    if (hasFlair) {
      badges.innerHTML += `<span class="rdt-flair">${escapeHtml(meta.flair!)}</span>`;
    }
    card.appendChild(badges);
  }

  // -- Title --
  const titleEl = document.createElement("h3");
  titleEl.className = "rdt-post-title";
  titleEl.textContent = meta.title;
  card.appendChild(titleEl);

  // -- Media / content block --
  const mediaEl = buildMediaBlock(post, observeVideo);
  if (mediaEl) card.appendChild(mediaEl);

  // -- Engagement bar: upvote score, comments, award, share --
  const scoreClass =
    meta.score > 0
      ? "rdt-score-up"
      : meta.score < 0
        ? "rdt-score-down"
        : "rdt-score-neutral";
  const commentCount = meta.numComments ?? 0;

  const engagement = document.createElement("div");
  engagement.className = "rdt-engagement";
  engagement.innerHTML = `
    <span class="rdt-engage-btn rdt-engage-votes">
      <span class="rdt-vote-up">${UPVOTE_ICON}</span>
      <span class="rdt-vote-score ${scoreClass}">${formatScore(meta.score)}</span>
      <span class="rdt-vote-down">${DOWNVOTE_ICON}</span>
    </span>
    <span class="rdt-engage-btn rdt-engage-comments">
      ${COMMENT_ICON}
      <span>${formatScore(commentCount)}</span>
    </span>
    <span class="rdt-engage-btn">
      ${AWARD_ICON}
    </span>
    <span class="rdt-engage-btn">
      ${SHARE_ICON}
      <span>Share</span>
    </span>
  `;
  card.appendChild(engagement);

  return card;
}

/** How many cards to enrich + append per scroll batch */
const RENDER_BATCH = 20;
/** Concurrency for loading .nfo stubs (small XML files, blast through them) */
const STUB_CONCURRENCY = 30;
/** Concurrency for enriching posts (directory listing for media) */
const ENRICH_CONCURRENCY = 6;

interface PostStub {
  path: string;
  metadata: PostMetadata;
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

async function enrichPost(
  api: PluginViewAPI,
  stub: PostStub
): Promise<RedditTimelinePost> {
  const files = await api.fetchFiles(stub.path);

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

  return { path: stub.path, metadata: stub.metadata, images, videoFile };
}

function matchesRedditSearch(stub: PostStub, term: string): boolean {
  const m = stub.metadata;
  return (
    m.title.toLowerCase().includes(term) ||
    m.author.toLowerCase().includes(term) ||
    (m.flair || "").toLowerCase().includes(term) ||
    (m.selftext || "").toLowerCase().includes(term)
  );
}

export async function renderRedditTimeline(
  container: HTMLElement,
  api: PluginViewAPI,
  subredditPath: string,
  onNavigate?: (path: string) => void
): Promise<() => void> {
  container.innerHTML = `<div class="reddit-loading">Loading posts...</div>`;

  const entries = await api.fetchFiles(subredditPath);
  const postDirs = entries.filter((e) => e.isDirectory);

  if (postDirs.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">&#9729;</div>
        <span>No posts archived yet</span>
      </div>
    `;
    return;
  }

  // The profile-header icon at the top of the timeline — for the
  // single-subreddit case this is the folder's own icon.png. For the user's
  // Upvoted view there's no single icon here; we fall back to null and the
  // profile header shows its text-only form.
  const iconFiles = entries.filter(
    (e) => !e.isDirectory && ICON_FILENAME_RE.test(e.name)
  );
  const subredditAvatarUrl =
    iconFiles.length > 0
      ? `/api/files/download?path=${encodeURIComponent(iconFiles[0].path)}`
      : null;

  // Preloaded per-card icon map populated AFTER the stub pass (below). Until
  // then, per-card icon lookups return the folder-level `subredditAvatarUrl`
  // as a default (for single-subreddit timelines that also means the correct
  // icon shows immediately on the first render).
  let subredditIconMap: Map<string, string> = new Map();
  const lookupSubredditIcon = (subreddit: string): string | null => {
    const hit = subredditIconMap.get(subreddit);
    if (hit) return hit;
    return subredditAvatarUrl;
  };

  // ── Load ALL stubs upfront — .nfo files are tiny, blast through them ──
  let loadedCount = 0;
  const statusEl = container.querySelector(".reddit-loading");
  const allStubs = await mapLimit(postDirs, STUB_CONCURRENCY, async (dir) => {
    const metadata = await fetchPostMetadata(api, dir.path);
    loadedCount++;
    if (statusEl && loadedCount % 10 === 0) {
      statusEl.textContent = `Loading posts... ${loadedCount}/${postDirs.length}`;
    }
    return metadata ? ({ path: dir.path, metadata } as PostStub) : null;
  });

  const indexedStubs = allStubs.filter(
    (stub): stub is PostStub => stub !== null
  );

  // ── Resolve per-subreddit icons once, up front ─────────────────────────
  // For a mixed-subreddit timeline (Upvoted view) this fetches an icon URL
  // for every unique subreddit represented in the stubs. For a
  // single-subreddit timeline it just re-confirms the folder icon.
  {
    const uniqueSubreddits = new Set<string>();
    for (const stub of indexedStubs) {
      if (stub.metadata.subreddit) uniqueSubreddits.add(stub.metadata.subreddit);
    }
    subredditIconMap = await resolveSubredditIconMap(
      api,
      subredditPath,
      uniqueSubreddits
    );
  }

  // ── Shared in-viewport autoplay controller for <video> elements ───────
  //
  // One IntersectionObserver watches every video card in the timeline and
  // toggles `play()`/`pause()` based on viewport proximity. Videos are
  // created in `buildMediaBlock` with `muted + loop + playsInline` so the
  // browser allows autoplay without user interaction.
  //
  //   Desktop (>=768px): rootMargin "150% 0px" + threshold 0
  //     → any card within ~1.5 viewports above or below the visible area
  //       plays. With typical card heights this covers the current card
  //       plus ~2 on either side.
  //   Mobile  (<768px):  rootMargin "0px" + threshold 0.5
  //     → only the focal card (≥50% visible) plays. Avoids chewing through
  //       mobile data by decoding multiple videos at once.
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  const videoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          // Browsers return a rejected Promise if a concurrent call was
          // made (e.g. play() → pause() → play() in quick succession).
          // Swallow it — the observer will correct on the next callback.
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    isMobileViewport
      ? { rootMargin: "0px", threshold: 0.5 }
      : { rootMargin: "150% 0px", threshold: 0 }
  );
  const observeVideo = (video: HTMLVideoElement): void => {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    videoObserver.observe(video);
  };

  // ── Sort / filter state ──
  type SortMode = "upvoted" | "new" | "top";
  // Auto-detect whether this timeline has upvoted-order data: if any stub
  // carries `upvotedArchivedAt`, this is the user's Upvoted view. In that
  // case we expose the "User Upvoted" option and default to it. Otherwise we
  // stick with the original two options and default to "new".
  const hasUpvotedData = indexedStubs.some(
    (s) => typeof s.metadata.upvotedArchivedAt === "string"
  );
  let sortMode: SortMode = hasUpvotedData ? "upvoted" : "new";
  let searchTerm = "";

  function applySortAndFilter(): PostStub[] {
    let list = searchTerm
      ? indexedStubs.filter((s) => matchesRedditSearch(s, searchTerm))
      : [...indexedStubs];

    if (sortMode === "upvoted") {
      // (archivedAt DESC, position ASC). Posts lacking upvoted metadata fall
      // to the bottom in their own stable order.
      list.sort((a, b) => {
        const aHas = !!a.metadata.upvotedArchivedAt;
        const bHas = !!b.metadata.upvotedArchivedAt;
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (aHas && bHas) {
          const aTime = new Date(a.metadata.upvotedArchivedAt!).getTime();
          const bTime = new Date(b.metadata.upvotedArchivedAt!).getTime();
          if (aTime !== bTime) return bTime - aTime;
          const aPos = a.metadata.upvotedPosition ?? Number.MAX_SAFE_INTEGER;
          const bPos = b.metadata.upvotedPosition ?? Number.MAX_SAFE_INTEGER;
          return aPos - bPos;
        }
        // Neither has upvoted data — break ties by post creation time.
        return (
          new Date(b.metadata.created).getTime() -
          new Date(a.metadata.created).getTime()
        );
      });
    } else if (sortMode === "new") {
      list.sort(
        (a, b) =>
          new Date(b.metadata.created).getTime() -
          new Date(a.metadata.created).getTime()
      );
    } else {
      list.sort((a, b) => b.metadata.score - a.metadata.score);
    }
    return list;
  }

  let filtered = applySortAndFilter();
  let renderedCount = 0;
  let isLoading = false;
  let scrollObserver: IntersectionObserver | null = null;
  const lazyCards: LazyFeedCard[] = [];
  let isDisposed = false;

  container.innerHTML = "";

  // -- Profile header --
  const subredditName = subredditPath.split("/").pop() || "";
  const profileHeader = document.createElement("div");
  profileHeader.className = "rdt-profile-header";

  let avatarHtml = "";
  if (subredditAvatarUrl) {
    avatarHtml = `<img class="rdt-profile-avatar" src="${subredditAvatarUrl}" alt="" />`;
  }

  profileHeader.innerHTML = `
    ${avatarHtml}
    <div class="rdt-profile-info">
      <h2 class="rdt-profile-name">${escapeHtml(subredditName)}</h2>
      <span class="rdt-profile-count">${postDirs.length} archived posts</span>
    </div>
  `;
  container.appendChild(profileHeader);

  // -- Controls bar: search + sort --
  const controls = document.createElement("div");
  controls.className = "rdt-controls";
  const sortOptions = [
    hasUpvotedData
      ? `<option value="upvoted"${sortMode === "upvoted" ? " selected" : ""}>User Upvoted</option>`
      : "",
    `<option value="new"${sortMode === "new" ? " selected" : ""}>Newest</option>`,
    `<option value="top"${sortMode === "top" ? " selected" : ""}>Top</option>`,
  ]
    .filter(Boolean)
    .join("");
  controls.innerHTML = `
    <input type="text" class="timeline-search" placeholder="Search posts..." aria-label="Search posts" />
    <select class="rdt-sort-select" aria-label="Sort posts">
      ${sortOptions}
    </select>
  `;
  container.appendChild(controls);

  const searchInput = controls.querySelector<HTMLInputElement>(".timeline-search")!;
  const sortSelect = controls.querySelector<HTMLSelectElement>(".rdt-sort-select")!;

  // -- Timeline container --
  const timeline = document.createElement("div");
  timeline.className = "rdt-timeline";
  container.appendChild(timeline);

  const sentinel = document.createElement("div");
  sentinel.className = "timeline-load-sentinel";
  container.appendChild(sentinel);

  function clearRenderedCards(): void {
    while (lazyCards.length > 0) {
      lazyCards.pop()?.destroy();
    }
  }

  function appendPostCard(post: RedditTimelinePost, index: number): void {
    const lazyCard = new LazyFeedCard({
      estimatedHeight: 360,
      initiallyRendered: index < 8,
      renderMargin: "500px",
      render: () => {
        const card = renderPostCard(post, api, lookupSubredditIcon, observeVideo);
        if (onNavigate) {
          card.style.cursor = "pointer";
          card.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            if (
              target.closest(".rdt-media-wrap") ||
              target.closest("a") ||
              target.closest("video")
            ) {
              return;
            }
            onNavigate(post.path);
          });
        }
        return card;
      },
    });
    lazyCard.mount(timeline);
    lazyCards.push(lazyCard);
  }

  async function renderNextBatch(): Promise<void> {
    if (isDisposed || isLoading || renderedCount >= filtered.length) {
      return;
    }

    isLoading = true;
    const batch = filtered.slice(renderedCount, renderedCount + RENDER_BATCH);
    const enriched = await mapLimit(batch, ENRICH_CONCURRENCY, (stub) =>
      enrichPost(api, stub)
    );
    const startIndex = renderedCount;

    for (let index = 0; index < enriched.length; index += 1) {
      appendPostCard(enriched[index], startIndex + index);
    }

    renderedCount += enriched.length;
    isLoading = false;
  }

  async function resetAndRender(): Promise<void> {
    if (isDisposed) {
      return;
    }

    filtered = applySortAndFilter();
    renderedCount = 0;
    isLoading = false;
    clearRenderedCards();
    timeline.innerHTML = "";

    if (filtered.length === 0 && searchTerm) {
      timeline.innerHTML = `<div class="timeline-no-results">No posts match "${escapeHtml(searchTerm)}"</div>`;
      return;
    }

    await renderNextBatch();
  }

  scrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !isLoading && renderedCount < filtered.length) {
        void renderNextBatch();
      }
    },
    { rootMargin: "600px" }
  );
  scrollObserver.observe(sentinel);

  // Sort handler
  const handleSortChange = () => {
    sortMode = sortSelect.value as SortMode;
    void resetAndRender();
  };
  sortSelect.addEventListener("change", handleSortChange);

  // Search handler (debounced)
  const handleSearchInput = debounce(() => {
    searchTerm = searchInput.value.trim().toLowerCase();
    void resetAndRender();
  }, 300);
  searchInput.addEventListener("input", handleSearchInput);

  // Initial render — stubs are already loaded and sorted
  await resetAndRender();

  return () => {
    isDisposed = true;
    scrollObserver?.disconnect();
    videoObserver.disconnect();
    clearRenderedCards();
    sortSelect.removeEventListener("change", handleSortChange);
    searchInput.removeEventListener("input", handleSearchInput);
  };
}
