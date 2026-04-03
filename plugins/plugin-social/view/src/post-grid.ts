import type { PluginViewAPI, PostInfo } from "./types";
import { fetchPostMetadata } from "./nfo-parser";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
}

function isVideoFile(name: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv)$/i.test(name);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

async function loadPostInfo(
  api: PluginViewAPI,
  postEntry: { name: string; path: string }
): Promise<PostInfo> {
  const [files, metadata] = await Promise.all([
    api.fetchFiles(postEntry.path),
    fetchPostMetadata(api, postEntry.path),
  ]);

  const images = files.filter((f) => !f.isDirectory && isImageFile(f.name));
  const videos = files.filter((f) => !f.isDirectory && isVideoFile(f.name));
  const firstImage = images[0];

  return {
    title: metadata?.title || postEntry.name,
    path: postEntry.path,
    thumbnail: firstImage
      ? `/api/files/download?path=${encodeURIComponent(firstImage.path)}`
      : undefined,
    metadata: metadata || undefined,
    imageCount: images.length + videos.length,
  };
}

function renderPostCard(post: PostInfo): string {
  const scoreClass = post.metadata
    ? post.metadata.score > 0
      ? "reddit-score-up"
      : post.metadata.score < 0
        ? "reddit-score-down"
        : "reddit-score-neutral"
    : "reddit-score-neutral";

  const isTextOnly = post.imageCount === 0 && !post.metadata?.isVideo;
  const isLinkPost =
    post.metadata?.domain &&
    post.metadata.domain !== "self." + post.metadata.subreddit &&
    post.metadata.domain !== "i.redd.it" &&
    post.metadata.domain !== "v.redd.it" &&
    post.metadata.domain !== "reddit.com";

  let thumbHtml: string;
  if (post.thumbnail) {
    thumbHtml = `<div class="reddit-card-thumb-wrap">
        <img class="reddit-card-thumb" src="${post.thumbnail}" alt="" loading="lazy" />
        ${post.imageCount > 1 ? `<span class="reddit-img-count">${post.imageCount}</span>` : ""}
        ${post.metadata?.isVideo ? `<span class="reddit-video-badge">Video</span>` : ""}
      </div>`;
  } else if (isTextOnly && post.metadata?.selftext) {
    // Text post with selftext — show a text snippet preview
    const snippet = post.metadata.selftext.slice(0, 150);
    thumbHtml = `<div class="reddit-card-text-preview">
        <div class="reddit-card-text-snippet">${escapeHtml(snippet)}${snippet.length >= 150 ? "..." : ""}</div>
      </div>`;
  } else if (isLinkPost && post.metadata?.domain) {
    // Link post — show domain with favicon
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(post.metadata.domain)}&sz=64`;
    thumbHtml = `<div class="reddit-card-thumb-wrap">
        <div class="reddit-card-thumb-placeholder" style="gap:0.5rem;">
          <img src="${faviconUrl}" alt="" style="width:2rem;height:2rem;border-radius:0.25rem;" />
          <span style="font-size:0.6875rem;font-family:'JetBrains Mono Variable','JetBrains Mono',monospace;color:var(--muted-foreground);">${escapeHtml(post.metadata.domain)}</span>
        </div>
      </div>`;
  } else if (post.metadata?.isVideo) {
    thumbHtml = `<div class="reddit-card-thumb-wrap">
        <div class="reddit-card-thumb-placeholder">🎬</div>
        <span class="reddit-video-badge">Video</span>
      </div>`;
  } else {
    // Fallback: show title as preview text
    thumbHtml = `<div class="reddit-card-text-preview">
        <div class="reddit-card-text-snippet" style="color:var(--muted-foreground);font-style:italic;">No preview available</div>
      </div>`;
  }

  const metaParts: string[] = [];
  if (post.metadata) {
    metaParts.push(
      `<span class="reddit-score ${scoreClass}">${post.metadata.score > 0 ? "+" : ""}${post.metadata.score.toLocaleString()}</span>`
    );
    metaParts.push(
      `<span class="reddit-card-meta-item">u/${escapeHtml(post.metadata.author)}</span>`
    );
    if (post.metadata.created) {
      metaParts.push(
        `<span class="reddit-card-meta-item">${formatDate(post.metadata.created)}</span>`
      );
    }
    if (post.metadata.numComments !== undefined) {
      metaParts.push(
        `<span class="reddit-card-meta-item">${post.metadata.numComments} 💬</span>`
      );
    }
    if (isLinkPost && post.metadata.domain) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(post.metadata.domain)}&sz=32`;
      metaParts.push(
        `<span class="reddit-domain-badge"><img src="${faviconUrl}" alt="" />${escapeHtml(post.metadata.domain)}</span>`
      );
    }
  }

  return `
    <div class="reddit-card" data-path="${escapeHtml(post.path)}">
      ${thumbHtml}
      <div class="reddit-card-body">
        <div class="reddit-card-title" title="${escapeHtml(post.title)}">${escapeHtml(post.title)}</div>
        <div class="reddit-card-meta">${metaParts.join("")}</div>
      </div>
    </div>
  `;
}

export async function renderPostGrid(
  container: HTMLElement,
  api: PluginViewAPI,
  subredditPath: string,
  onNavigate: (path: string) => void
): Promise<void> {
  container.innerHTML = `<div class="reddit-loading">Loading posts...</div>`;

  const entries = await api.fetchFiles(subredditPath);
  const postDirs = entries.filter((e) => e.isDirectory);

  if (postDirs.length === 0) {
    container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">📭</div>
        <span>No posts found</span>
      </div>
    `;
    return;
  }

  // Load post info in parallel (batched to avoid overwhelming the server)
  const batchSize = 12;
  const posts: PostInfo[] = [];
  for (let i = 0; i < postDirs.length; i += batchSize) {
    const batch = postDirs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((dir) => loadPostInfo(api, dir))
    );
    posts.push(...results);
  }

  // Sort by score descending if metadata available
  posts.sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));

  const subredditName = subredditPath.split("/").pop() || "";

  container.innerHTML = `
    <div class="reddit-section-heading">r/${escapeHtml(subredditName)} — ${posts.length} posts</div>
    <div class="reddit-grid-wide">
      ${posts.map(renderPostCard).join("")}
    </div>
  `;

  // Wire up click handlers
  container.querySelectorAll<HTMLElement>(".reddit-card").forEach((card) => {
    card.addEventListener("click", () => {
      const path = card.dataset.path;
      if (path) onNavigate(path);
    });
  });
}
