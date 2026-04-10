/** Inject scoped CSS into a container's shadow or parent */
export function injectStyles(container: HTMLElement): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = CSS;
  container.appendChild(style);
  return style;
}

const CSS = `
/* ── Reset inside plugin container ── */
.reddit-view * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.reddit-view {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--foreground);
  line-height: 1.5;
  padding: 1.5rem;
  min-height: 100%;
}

/* ── Grid layouts ── */
.reddit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.reddit-grid-wide {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

/* ── Cards ── */
.reddit-card {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.reddit-card:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.reddit-card-loading {
  opacity: 0.92;
}

.reddit-card-preview-slot {
  width: 100%;
}

.reddit-card-loading .reddit-card-meta-item {
  color: var(--muted-foreground);
}

.reddit-card-thumb {
  width: 100%;
  aspect-ratio: 16/10;
  object-fit: cover;
  display: block;
  background: var(--muted);
}

.reddit-card-thumb-placeholder {
  width: 100%;
  aspect-ratio: 16/10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 2rem;
}

.reddit-card-body {
  padding: 0.875rem 1rem;
}

.reddit-card-title {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--foreground);
  margin-bottom: 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reddit-card-meta {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.reddit-card-meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* ── Score badge ── */
.reddit-score {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
}

.reddit-score-up {
  background: oklch(0.45 0.12 145 / 0.15);
  color: oklch(0.7 0.15 145);
}

.reddit-score-down {
  background: oklch(0.45 0.12 25 / 0.15);
  color: oklch(0.7 0.15 25);
}

.reddit-score-neutral {
  background: var(--muted);
  color: var(--muted-foreground);
}

/* ── Flair badge ── */
.reddit-flair {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: var(--primary);
  color: var(--primary-foreground);
}

/* ── Post detail layout ── */
.reddit-post {
  max-width: 64rem;
  margin: 0 auto;
}

.reddit-post-header {
  margin-bottom: 1.5rem;
}

.reddit-post-title {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--foreground);
  margin-bottom: 0.5rem;
}

.reddit-post-byline {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.reddit-post-author {
  color: var(--primary);
  font-weight: 600;
}

.reddit-post-selftext {
  font-size: 0.875rem;
  color: var(--foreground);
  line-height: 1.65;
  padding: 1rem;
  background: var(--muted);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Gallery ── */
.reddit-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.reddit-gallery-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: opacity 0.15s;
  background: var(--muted);
}

.reddit-gallery-img:hover {
  opacity: 0.85;
}

/* ── Lightbox ── */
.reddit-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: oklch(0 0 0 / 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reddit-lightbox img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 0.5rem;
}

.reddit-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.5rem;
}

.reddit-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: oklch(0.2 0 0 / 0.6);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 1rem 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.15s;
}

.reddit-lightbox-nav:hover {
  background: oklch(0.3 0 0 / 0.8);
}

.reddit-lightbox-prev {
  left: 1rem;
}

.reddit-lightbox-next {
  right: 1rem;
}

.reddit-lightbox-counter {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  color: oklch(0.8 0 0);
  font-size: 0.875rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
}

/* ── Comments ── */
.reddit-comments {
  margin-top: 1.5rem;
}

.reddit-comments-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.reddit-comments-heading {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
}

.reddit-sort-bar {
  display: flex;
  gap: 0.25rem;
  background: var(--muted);
  border-radius: 0.5rem;
  padding: 0.1875rem;
}

.reddit-sort-btn {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.3125rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}

.reddit-sort-btn:hover {
  color: var(--foreground);
}

.reddit-sort-btn.active {
  background: var(--background);
  color: var(--foreground);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.reddit-comment {
  position: relative;
  padding-left: 1rem;
  margin-bottom: 0.75rem;
}

/* ── Collapse toggle ── */
.reddit-comment-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s;
}

.reddit-comment-toggle:hover {
  color: var(--foreground);
}

.reddit-comment-toggle-icon {
  display: inline-block;
  font-size: 0.5rem;
  transition: transform 0.2s;
}

.reddit-comment-toggle-icon.expanded {
  transform: rotate(90deg);
}

.reddit-comment-toggle-text {
  font-weight: 500;
}

/* ── Threaded replies ── */
.reddit-comment-thread {
  border-left: 2px solid var(--thread-color, var(--border));
  padding-left: 1rem;
  margin-left: 0.5rem;
  cursor: default;
  transition: border-color 0.15s;
}

.reddit-comment-thread:hover {
  border-left-color: color-mix(in oklch, var(--thread-color, var(--border)), var(--foreground) 25%);
}

.reddit-comment-thread.collapsed {
  display: none;
}

.reddit-comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.reddit-comment-author {
  font-weight: 600;
  color: var(--primary);
}

.reddit-comment-score {
  color: var(--muted-foreground);
}

.reddit-comment-date {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
}

.reddit-comment-body {
  font-size: 0.8125rem;
  color: var(--foreground);
  line-height: 1.6;
  word-break: break-word;
}

.reddit-comment-body p {
  margin-bottom: 0.5rem;
}

.reddit-comment-body p:last-child {
  margin-bottom: 0;
}

/* ── Section heading ── */
.reddit-section-heading {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--foreground);
  margin-bottom: 1.25rem;
}

/* ── Breadcrumb ── */
.reddit-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.reddit-breadcrumb-link {
  color: var(--primary);
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.reddit-breadcrumb-link:hover {
  text-decoration: underline;
}

.reddit-breadcrumb-sep {
  color: var(--muted-foreground);
  opacity: 0.5;
}

.reddit-breadcrumb-current {
  color: var(--foreground);
  font-weight: 500;
}

/* ── Loading / empty states ── */
.reddit-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.reddit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--muted-foreground);
  gap: 0.5rem;
}

.reddit-empty-icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

/* ── Video indicator ── */
.reddit-video-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: oklch(0 0 0 / 0.7);
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Image count badge ── */
.reddit-img-count {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: oklch(0 0 0 / 0.7);
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
}

/* Relative positioning for card thumb wrapper */
.reddit-card-thumb-wrap {
  position: relative;
}

/* ── OP / Mod badges ── */
.reddit-op-badge {
  display: inline-block;
  padding: 0 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  background: var(--primary);
  color: var(--primary-foreground);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  vertical-align: middle;
}

.reddit-mod-badge {
  display: inline-block;
  padding: 0 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  background: oklch(0.45 0.15 145 / 0.2);
  color: oklch(0.7 0.15 145);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  vertical-align: middle;
}

.reddit-comment-op {
  color: var(--primary);
}

/* ── Card text preview (for text-only posts) ── */
.reddit-card-text-preview {
  width: 100%;
  aspect-ratio: 16/10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1rem 1.25rem;
  background: var(--muted);
  overflow: hidden;
}

.reddit-card-text-title {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reddit-card-text-snippet {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Card grid preview (for user profiles showing subreddits) ── */
.reddit-card-grid-preview {
  width: 100%;
  aspect-ratio: 16/10;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
  overflow: hidden;
}

.reddit-card-grid-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  font-size: 0.625rem;
  font-weight: 600;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted-foreground);
  padding: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reddit-card-grid-more {
  color: var(--muted-foreground);
  opacity: 0.5;
  font-size: 0.875rem;
}

/* ── Post card title multi-line ── */
/* ── Link post card ── */
.reddit-link-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  text-decoration: none;
  color: var(--foreground);
  transition: border-color 0.15s;
  cursor: pointer;
}

.reddit-link-card:hover {
  border-color: var(--primary);
}

.reddit-link-favicon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 0.25rem;
  background: var(--background);
}

.reddit-link-info {
  flex: 1;
  min-width: 0;
}

.reddit-link-domain {
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--primary);
}

.reddit-link-url {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reddit-link-external {
  color: var(--muted-foreground);
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* ── Link domain badge for post cards ── */
.reddit-domain-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  background: var(--muted);
  color: var(--muted-foreground);
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
}

.reddit-domain-badge img {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
}

.reddit-card-title-wrap {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.375rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
}

/* ── Bluesky Timeline ── */
.bluesky-profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.bluesky-profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--muted);
  flex-shrink: 0;
}

.bluesky-profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.bluesky-profile-name {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--foreground);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.bluesky-profile-handle {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.bluesky-profile-count {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 0.125rem;
}

.bluesky-timeline {
  display: flex;
  flex-direction: column;
  max-width: 600px;
  margin: 0 auto;
}

.virtualized-feed-placeholder {
  width: 100%;
  border-radius: 0.75rem;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--muted) 92%, transparent) 0%,
      color-mix(in srgb, var(--muted) 100%, white 6%) 50%,
      color-mix(in srgb, var(--muted) 92%, transparent) 100%
    );
  background-size: 200% 100%;
  animation: virtualized-feed-pulse 1.6s linear infinite;
}

.lazy-feed-card {
  width: 100%;
  overflow-anchor: none;
}

.lazy-feed-card-placeholder {
  width: 100%;
  overflow-anchor: none;
}

.timeline-load-sentinel {
  height: 1px;
  overflow-anchor: none;
}

@keyframes virtualized-feed-pulse {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

.bluesky-post-card {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.bluesky-timeline > .bluesky-post-card:last-child,
.bluesky-timeline > .virtualized-feed-item:last-child .bluesky-post-card {
  border-bottom: none;
}

.bluesky-post-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
}

.bluesky-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--muted);
  flex-shrink: 0;
}

.bluesky-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bluesky-post-author-info {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  min-width: 0;
  flex: 1;
}

.bluesky-display-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bluesky-handle {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bluesky-timestamp {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  flex-shrink: 0;
  margin-left: auto;
}

.bluesky-post-text {
  font-size: 0.9375rem;
  color: var(--foreground);
  line-height: 1.55;
  margin-bottom: 0.625rem;
  word-break: break-word;
}

.bluesky-link {
  color: var(--primary);
  text-decoration: none;
}

.bluesky-link:hover {
  text-decoration: underline;
}

.bluesky-mention {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.bluesky-mention:hover {
  text-decoration: underline;
}

.bluesky-hashtag {
  color: var(--primary);
}

/* ── Bluesky Image Grids ── */
.bluesky-post-images {
  border-radius: 0.75rem;
  overflow: hidden;
  margin-bottom: 0.625rem;
}

.bluesky-images-1 {
  display: block;
}

.bluesky-images-1 .bluesky-post-image {
  width: 100%;
  max-height: 500px;
  object-fit: cover;
  display: block;
}

.bluesky-images-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
}

.bluesky-images-2 .bluesky-post-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.bluesky-images-3 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
}

.bluesky-images-3 .bluesky-post-image:first-child {
  grid-row: 1 / 3;
  aspect-ratio: auto;
  height: 100%;
}

.bluesky-images-3 .bluesky-post-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.bluesky-images-4 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
}

.bluesky-images-4 .bluesky-post-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.bluesky-post-image {
  cursor: pointer;
  transition: opacity 0.15s;
  background: var(--muted);
}

.bluesky-post-image:hover {
  opacity: 0.85;
}

/* ── Bluesky External Link Card ── */
.bluesky-external-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  margin-bottom: 0.625rem;
  text-decoration: none;
  color: var(--foreground);
  transition: border-color 0.15s;
}

.bluesky-external-card:hover {
  border-color: var(--primary);
}

.bluesky-external-thumb {
  width: 100%;
  max-height: 250px;
  object-fit: cover;
  background: var(--muted);
}

.bluesky-external-info {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.bluesky-external-domain {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  text-transform: lowercase;
}

.bluesky-external-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bluesky-external-desc {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Bluesky Quote Card ── */
.bluesky-quote-card {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.625rem;
}

.bluesky-quote-header {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.bluesky-quote-text {
  font-size: 0.8125rem;
  color: var(--foreground);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Bluesky Engagement Metrics ── */
.bluesky-engagement {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding-top: 0.375rem;
}

.bluesky-metric {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  cursor: default;
}

.bluesky-metric svg {
  width: 15px;
  height: 15px;
  opacity: 0.7;
}

.bluesky-metric-repost:hover {
  color: oklch(0.7 0.15 145);
}

.bluesky-metric-like:hover {
  color: oklch(0.7 0.15 15);
}

/* ── Bluesky Controls ── */
.bluesky-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 600px;
  margin: 0 auto 1rem;
}

.bluesky-controls .timeline-search {
  flex: 1;
  min-width: 0;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--foreground);
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.8125rem;
  padding: 0.4375rem 0.75rem;
  outline: none;
  transition: border-color 0.15s;
}

.bluesky-controls .timeline-search:focus {
  border-color: var(--primary);
}

.bluesky-controls .timeline-search::placeholder {
  color: var(--muted-foreground);
}

.bluesky-controls .timeline-sort {
  appearance: none;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--foreground);
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s;
  flex-shrink: 0;
}

.bluesky-controls .timeline-sort:hover {
  border-color: var(--primary);
}

.timeline-status {
  flex-shrink: 0;
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Bluesky Post Detail ── */
.bluesky-detail {
  max-width: 600px;
  margin: 0 auto;
}

.bluesky-detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.bluesky-detail-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--muted);
  flex-shrink: 0;
}

.bluesky-detail-author {
  display: flex;
  flex-direction: column;
}

.bluesky-detail-text {
  font-size: 1.0625rem;
  color: var(--foreground);
  line-height: 1.6;
  margin-bottom: 0.75rem;
  word-break: break-word;
}

.bluesky-detail-stats {
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}

.bluesky-detail-date {
  display: block;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
}

.bluesky-detail-counts {
  display: flex;
  gap: 1.25rem;
}

.bluesky-detail-count {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.bluesky-detail-count strong {
  color: var(--foreground);
}

.bluesky-detail-count svg {
  width: 15px;
  height: 15px;
  opacity: 0.7;
}

/* ── Bluesky Replies ── */
.bluesky-replies-section {
  margin-top: 0.5rem;
}

.bluesky-replies-heading {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.bluesky-reply {
  padding: 0.625rem 0;
}

.bluesky-reply-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.bluesky-reply-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--muted);
  flex-shrink: 0;
}

.bluesky-reply-header .bluesky-display-name {
  font-size: 0.8125rem;
}

.bluesky-reply-header .bluesky-handle {
  font-size: 0.75rem;
}

.bluesky-reply-header .bluesky-timestamp {
  font-size: 0.6875rem;
}

.bluesky-reply-text {
  font-size: 0.875rem;
  color: var(--foreground);
  line-height: 1.5;
  margin-bottom: 0.25rem;
  word-break: break-word;
  padding-left: 2.125rem;
}

.bluesky-reply-engagement {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-left: 2.125rem;
  padding-bottom: 0.25rem;
}

.bluesky-reply-engagement .bluesky-metric {
  font-size: 0.6875rem;
}

.bluesky-reply-engagement .bluesky-metric svg {
  width: 13px;
  height: 13px;
}

.bluesky-reply-thread {
  border-left: 2px solid var(--border);
  margin-left: 0.75rem;
  padding-left: 0.75rem;
}

/* ── Twitter/X Styles ── */
.twitter-detail {
  max-width: 600px;
  margin: 0 auto;
}

.twitter-detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.twitter-detail-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--muted);
  flex-shrink: 0;
}

.twitter-detail-author {
  display: flex;
  flex-direction: column;
}

.twitter-display-name {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--foreground);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.twitter-handle {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.twitter-verified {
  color: oklch(0.6 0.15 250);
  display: inline-flex;
  align-items: center;
}

.twitter-verified-sm {
  color: oklch(0.6 0.15 250);
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

.twitter-verified-sm svg {
  width: 14px;
  height: 14px;
}

.twitter-detail-text {
  font-size: 1.0625rem;
  color: var(--foreground);
  line-height: 1.6;
  margin-bottom: 0.75rem;
  word-break: break-word;
}

.twitter-link {
  color: var(--primary);
  text-decoration: none;
}

.twitter-link:hover {
  text-decoration: underline;
}

.twitter-mention {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.twitter-mention:hover {
  text-decoration: underline;
}

.twitter-hashtag {
  color: var(--primary);
}

.twitter-reply-indicator {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
}

.twitter-detail-stats {
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}

.twitter-video {
  width: 100%;
  max-height: 500px;
  border-radius: 0.75rem;
  margin-bottom: 0.625rem;
  background: var(--muted);
}

/* ── Open Original Button ── */
.social-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--card);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.social-back-btn:hover {
  background: var(--muted);
  border-color: var(--primary);
}

.social-back-btn svg {
  flex-shrink: 0;
}

.social-open-original {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted-foreground);
  background: var(--muted);
  border: 1px solid var(--border);
  text-decoration: none;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  flex-shrink: 0;
  cursor: pointer;
}

.social-open-original:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--card);
}

.social-open-original svg {
  opacity: 0.7;
}

/* ── Comment Media (Reddit) ── */
.reddit-comment-media {
  margin-top: 0.375rem;
  margin-bottom: 0.375rem;
  padding-left: 0;
}

.reddit-comment-media-img {
  max-width: 300px;
  max-height: 250px;
  border-radius: 0.5rem;
  display: block;
  margin-top: 0.25rem;
  background: var(--muted);
}

/* ── Reply Media (Bluesky) ── */
.bluesky-reply-media {
  padding-left: 2.125rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.bluesky-reply-media-img {
  max-width: 300px;
  max-height: 250px;
  border-radius: 0.5rem;
  object-fit: cover;
  background: var(--muted);
}

/* ── Reddit Timeline ── */

.rdt-profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
}

.rdt-profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--muted);
  flex-shrink: 0;
}

.rdt-profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.rdt-profile-name {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--foreground);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rdt-profile-count {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.rdt-profile-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  flex-shrink: 0;
}

.rdt-sort-select {
  appearance: none;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--foreground);
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.rdt-sort-select:hover {
  border-color: var(--primary);
}

.rdt-timeline {
  display: flex;
  flex-direction: column;
  max-width: 680px;
  margin: 0 auto;
}

.rdt-post-card {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rdt-timeline > .rdt-post-card:last-child,
.rdt-timeline > .virtualized-feed-item:last-child .rdt-post-card {
  border-bottom: none;
}

.rdt-post-card:hover {
  background: var(--muted);
  border-radius: 0.5rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  margin-left: -0.75rem;
  margin-right: -0.75rem;
}

/* Header: subreddit icon + r/sub · time */
.rdt-post-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.rdt-subreddit-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--muted);
  flex-shrink: 0;
}

.rdt-subreddit-icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  border: 1px solid var(--border);
}

.rdt-subreddit {
  font-weight: 700;
  color: var(--foreground);
  font-size: 0.75rem;
}

.rdt-meta-sep {
  opacity: 0.4;
  font-size: 0.625rem;
}

.rdt-timestamp {
  color: var(--muted-foreground);
  font-size: 0.75rem;
}

/* Badges */
.rdt-badges {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.rdt-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rdt-badge-nsfw {
  background: oklch(0.45 0.18 25 / 0.2);
  color: oklch(0.75 0.18 25);
}

.rdt-badge-spoiler {
  background: var(--muted);
  color: var(--muted-foreground);
  border: 1px solid var(--border);
}

.rdt-flair {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  background: var(--primary);
  color: var(--primary-foreground);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Title */
.rdt-post-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.35;
}

/* Media */
.rdt-media-wrap {
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--muted);
}

.rdt-media-img {
  width: 100%;
  max-height: 512px;
  object-fit: cover;
  display: block;
  cursor: pointer;
  transition: opacity 0.15s;
}

.rdt-media-img:hover {
  opacity: 0.92;
}

.rdt-media-gallery {
  position: relative;
}

.rdt-gallery-more {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: oklch(0 0 0 / 0.65);
  color: white;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
}

.rdt-media-video {
  width: 100%;
  max-height: 512px;
  display: block;
  background: black;
  border-radius: 0.75rem;
}

/* Selftext preview */
.rdt-selftext-preview {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  line-height: 1.6;
  padding: 0.75rem 1rem;
  background: var(--muted);
  border-radius: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  white-space: pre-wrap;
}

/* Link preview */
.rdt-link-preview {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.rdt-link-favicon {
  width: 1rem;
  height: 1rem;
  border-radius: 2px;
  flex-shrink: 0;
}

.rdt-link-domain {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Engagement bar */
.rdt-engagement {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.125rem;
}

.rdt-engage-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  background: var(--muted);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  cursor: default;
  user-select: none;
  white-space: nowrap;
}

.rdt-engage-btn svg {
  width: 16px;
  height: 16px;
  opacity: 0.7;
  flex-shrink: 0;
}

.rdt-engage-votes {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.rdt-vote-up, .rdt-vote-down {
  display: inline-flex;
  align-items: center;
  opacity: 0.5;
}

.rdt-vote-score {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 700;
}

.rdt-score-up   { color: oklch(0.7 0.15 145); }
.rdt-score-down { color: oklch(0.7 0.15 25);  }
.rdt-score-neutral { color: var(--muted-foreground); }

/* Reddit controls bar */
.rdt-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 680px;
  margin: 0 auto 1rem;
}

.rdt-controls .timeline-search {
  flex: 1;
  min-width: 0;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--foreground);
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.8125rem;
  padding: 0.4375rem 0.75rem;
  outline: none;
  transition: border-color 0.15s;
}

.rdt-controls .timeline-search:focus {
  border-color: var(--primary);
}

.rdt-controls .timeline-search::placeholder {
  color: var(--muted-foreground);
}

.rdt-controls .rdt-sort-select {
  appearance: none;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--foreground);
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s;
  flex-shrink: 0;
}

.rdt-controls .rdt-sort-select:hover,
.rdt-controls .rdt-sort-select:focus {
  border-color: var(--primary);
  outline: none;
}

.timeline-no-results {
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  padding: 2rem 1rem;
}

/* ═════════════════════════════════════════════════════════════════════════
   Change tracking — chips, backgrounds, and edit-history accordion.
   Applied to comments and to the top-level post to surface edits and
   deletions detected by the plugin's diff/merge step across runs.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── Chips: stack after existing header badges, mirror .reddit-mod-badge ── */
.reddit-chip {
  display: inline-block;
  padding: 0 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  vertical-align: middle;
  border: 1px solid transparent;
}

.reddit-chip--new {
  background: oklch(0.55 0.18 145 / 0.18);
  color: oklch(0.7 0.18 145);
  border-color: oklch(0.55 0.18 145 / 0.35);
}

.reddit-chip--edited {
  background: oklch(0.65 0.17 75 / 0.2);
  color: oklch(0.75 0.17 75);
  border-color: oklch(0.65 0.17 75 / 0.4);
}

.reddit-chip--deleted {
  background: oklch(0.55 0.22 25 / 0.2);
  color: oklch(0.7 0.22 25);
  border-color: oklch(0.55 0.22 25 / 0.4);
}

/* ── Comment backgrounds ── */
/* Tinted block to the right of the thread line so the existing depth-colored
   border still reads cleanly. Scoped to .reddit-comment-body so grafted
   deleted subtrees don't paint their replies. */
.reddit-comment--new > .reddit-comment-body {
  background: oklch(0.55 0.18 145 / 0.08);
  border-left: 2px solid oklch(0.55 0.18 145 / 0.5);
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
}

.reddit-comment--deleted > .reddit-comment-body {
  background: oklch(0.55 0.22 25 / 0.08);
  border-left: 2px solid oklch(0.55 0.22 25 / 0.5);
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
}

/* ── Post-level backgrounds — applied to the outer .reddit-post wrapper ── */
.reddit-post--new .reddit-post-header,
.reddit-post--new .reddit-post-selftext {
  background: oklch(0.55 0.18 145 / 0.06);
  border-left: 3px solid oklch(0.55 0.18 145 / 0.5);
  padding-left: 0.75rem;
  border-radius: 0.25rem;
}

.reddit-post--deleted .reddit-post-header,
.reddit-post--deleted .reddit-post-selftext {
  background: oklch(0.55 0.22 25 / 0.06);
  border-left: 3px solid oklch(0.55 0.22 25 / 0.5);
  padding-left: 0.75rem;
  border-radius: 0.25rem;
}

/* ── Edit history accordion ── */
.reddit-edit-history {
  margin-top: 0.5rem;
  padding-left: 0.75rem;
  border-left: 2px solid var(--border);
  font-size: 0.75rem;
}

.reddit-edit-history > .reddit-edit-history__summary {
  cursor: pointer;
  color: var(--muted-foreground);
  font-weight: 500;
  padding: 0.25rem 0;
  list-style: none;
}

.reddit-edit-history > .reddit-edit-history__summary::-webkit-details-marker {
  display: none;
}

.reddit-edit-history > .reddit-edit-history__summary::before {
  content: "\u25B6";
  display: inline-block;
  margin-right: 0.375rem;
  font-size: 0.5rem;
  transition: transform 0.2s;
}

.reddit-edit-history[open] > .reddit-edit-history__summary::before {
  transform: rotate(90deg);
}

.reddit-edit-history > .reddit-edit-history__summary:hover {
  color: var(--foreground);
}

.reddit-edit-history__entries {
  margin-top: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reddit-edit-history__entry {
  padding: 0.5rem 0.625rem;
  background: var(--muted);
  border-radius: 0.375rem;
}

.reddit-edit-history__entry + .reddit-edit-history__entry {
  border-top: 1px solid var(--border);
}

.reddit-edit-history__timestamp {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
}

.reddit-edit-history__title {
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.25rem;
}

.reddit-edit-history__body {
  color: var(--foreground);
  line-height: 1.5;
  word-break: break-word;
}

`;
