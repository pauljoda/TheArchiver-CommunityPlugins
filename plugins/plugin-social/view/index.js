"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // view/src/styles.ts
  function injectStyles(container) {
    const style = document.createElement("style");
    style.textContent = CSS;
    container.appendChild(style);
    return style;
  }
  var CSS = `
/* \u2500\u2500 Reset inside plugin container \u2500\u2500 */
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

/* \u2500\u2500 Grid layouts \u2500\u2500 */
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

/* \u2500\u2500 Cards \u2500\u2500 */
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

/* \u2500\u2500 Score badge \u2500\u2500 */
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

/* \u2500\u2500 Flair badge \u2500\u2500 */
.reddit-flair {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: var(--primary);
  color: var(--primary-foreground);
}

/* \u2500\u2500 Post detail layout \u2500\u2500 */
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

/* \u2500\u2500 Gallery \u2500\u2500 */
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

/* \u2500\u2500 Lightbox \u2500\u2500 */
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

/* \u2500\u2500 Comments \u2500\u2500 */
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

/* \u2500\u2500 Collapse toggle \u2500\u2500 */
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

/* \u2500\u2500 Threaded replies \u2500\u2500 */
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

/* \u2500\u2500 Section heading \u2500\u2500 */
.reddit-section-heading {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--foreground);
  margin-bottom: 1.25rem;
}

/* \u2500\u2500 Breadcrumb \u2500\u2500 */
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

/* \u2500\u2500 Loading / empty states \u2500\u2500 */
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

/* \u2500\u2500 Video indicator \u2500\u2500 */
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

/* \u2500\u2500 Image count badge \u2500\u2500 */
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

/* \u2500\u2500 OP / Mod badges \u2500\u2500 */
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

/* \u2500\u2500 Card text preview (for text-only posts) \u2500\u2500 */
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

/* \u2500\u2500 Card grid preview (for user profiles showing subreddits) \u2500\u2500 */
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

/* \u2500\u2500 Post card title multi-line \u2500\u2500 */
/* \u2500\u2500 Link post card \u2500\u2500 */
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

/* \u2500\u2500 Link domain badge for post cards \u2500\u2500 */
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

/* \u2500\u2500 Bluesky Timeline \u2500\u2500 */
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

/* \u2500\u2500 Bluesky Image Grids \u2500\u2500 */
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

/* \u2500\u2500 Bluesky External Link Card \u2500\u2500 */
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

/* \u2500\u2500 Bluesky Quote Card \u2500\u2500 */
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

/* \u2500\u2500 Bluesky Engagement Metrics \u2500\u2500 */
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

/* \u2500\u2500 Bluesky Controls \u2500\u2500 */
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

/* \u2500\u2500 Bluesky Post Detail \u2500\u2500 */
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

/* \u2500\u2500 Bluesky Replies \u2500\u2500 */
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

/* \u2500\u2500 Twitter/X Styles \u2500\u2500 */
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

/* \u2500\u2500 Open Original Button \u2500\u2500 */
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

/* \u2500\u2500 Comment Media (Reddit) \u2500\u2500 */
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

/* \u2500\u2500 Reply Media (Bluesky) \u2500\u2500 */
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

/* \u2500\u2500 Reddit Timeline \u2500\u2500 */

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

/* Header: subreddit icon + r/sub \xB7 time */
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

`;

  // view/src/nfo-parser.ts
  function parseNfoXml(xmlText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      const parseError = doc.querySelector("parsererror");
      if (parseError) return null;
      const root = doc.querySelector("postdetails");
      if (!root) return null;
      const text = (tag) => {
        const el = root.querySelector(tag);
        return el?.textContent?.trim() || "";
      };
      const num = (tag) => {
        const val = text(tag);
        return val ? parseInt(val, 10) || 0 : 0;
      };
      const float = (tag) => {
        const val = text(tag);
        return val ? parseFloat(val) || void 0 : void 0;
      };
      const bool = (tag) => {
        return text(tag) === "true";
      };
      return {
        title: text("title"),
        author: text("author") || "[deleted]",
        subreddit: text("subreddit"),
        score: num("score"),
        upvoteRatio: float("upvote_ratio"),
        url: text("url") || text("source_url"),
        permalink: text("url"),
        created: text("created"),
        flair: text("flair") || void 0,
        selftext: text("selftext") || void 0,
        isVideo: bool("is_video"),
        isGallery: bool("is_gallery"),
        numComments: num("num_comments") || void 0,
        domain: text("domain") || void 0,
        mediaUrl: text("media_url") || void 0,
        postHint: text("post_hint") || void 0,
        over18: bool("over_18"),
        spoiler: bool("spoiler")
      };
    } catch {
      return null;
    }
  }
  function parseBlueskyNfoXml(xmlText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      const parseError = doc.querySelector("parsererror");
      if (parseError) return null;
      const root = doc.querySelector("blueskypost");
      if (!root) return null;
      const text = (tag) => {
        const el = root.querySelector(tag);
        return el?.textContent?.trim() || "";
      };
      const num = (tag) => {
        const val = text(tag);
        return val ? parseInt(val, 10) || 0 : 0;
      };
      const result = {
        text: text("text"),
        authorHandle: text("handle") || "unknown",
        displayName: text("display_name") || void 0,
        avatarUrl: text("avatar_url") || void 0,
        created: text("created"),
        uri: text("uri"),
        url: text("url"),
        likeCount: num("like_count"),
        replyCount: num("reply_count"),
        repostCount: num("repost_count"),
        quoteCount: num("quote_count")
      };
      const extLink = root.querySelector("external_link");
      if (extLink) {
        const linkText = (tag) => {
          const el = extLink.querySelector(tag);
          return el?.textContent?.trim() || "";
        };
        result.externalLink = {
          uri: linkText("link_uri"),
          title: linkText("link_title"),
          description: linkText("link_description"),
          thumb: linkText("link_thumb") || void 0
        };
      }
      const quotePost = root.querySelector("quote_post");
      if (quotePost) {
        const quoteText = (tag) => {
          const el = quotePost.querySelector(tag);
          return el?.textContent?.trim() || "";
        };
        result.quotePost = {
          text: quoteText("quote_text"),
          authorHandle: quoteText("quote_author"),
          displayName: quoteText("quote_display_name") || void 0
        };
      }
      const facetsEl = root.querySelector("facets");
      if (facetsEl) {
        const facetEls = facetsEl.querySelectorAll("facet");
        if (facetEls.length > 0) {
          result.facets = [];
          facetEls.forEach((el) => {
            const type = el.getAttribute("type");
            const byteStart = parseInt(el.getAttribute("byte_start") || "0", 10);
            const byteEnd = parseInt(el.getAttribute("byte_end") || "0", 10);
            result.facets.push({
              type,
              byteStart,
              byteEnd,
              uri: el.getAttribute("uri") || void 0,
              did: el.getAttribute("did") || void 0,
              tag: el.getAttribute("tag") || void 0
            });
          });
        }
      }
      const videoEl = root.querySelector("video");
      if (videoEl) {
        result.hasVideo = true;
      }
      const imgCount = num("image_count");
      if (imgCount > 0) {
        result.imageCount = imgCount;
      }
      return result;
    } catch {
      return null;
    }
  }
  function parseTwitterNfoXml(xmlText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      const parseError = doc.querySelector("parsererror");
      if (parseError) return null;
      const root = doc.querySelector("twitterpost");
      if (!root) return null;
      const text = (tag) => {
        const el = root.querySelector(tag);
        return el?.textContent?.trim() || "";
      };
      const num = (tag) => {
        const val = text(tag);
        return val ? parseInt(val, 10) || 0 : 0;
      };
      const result = {
        text: text("text"),
        screenName: text("screen_name") || "unknown",
        name: text("name") || text("screen_name") || "unknown",
        userId: text("user_id"),
        profileImageUrl: text("profile_image_url") || void 0,
        verified: text("verified") === "true",
        created: text("created"),
        url: text("url"),
        favoriteCount: num("favorite_count"),
        retweetCount: num("retweet_count"),
        replyCount: num("reply_count"),
        quoteCount: num("quote_count"),
        lang: text("lang") || void 0
      };
      const linksEl = root.querySelector("links");
      if (linksEl) {
        const linkEls = linksEl.querySelectorAll("link");
        if (linkEls.length > 0) {
          result.links = [];
          linkEls.forEach((el) => {
            result.links.push({
              display: el.getAttribute("display") || "",
              expanded: el.getAttribute("expanded") || ""
            });
          });
        }
      }
      const mentionsEl = root.querySelector("mentions");
      if (mentionsEl) {
        const mentionEls = mentionsEl.querySelectorAll("mention");
        if (mentionEls.length > 0) {
          result.mentions = [];
          mentionEls.forEach((el) => {
            const sn = el.getAttribute("screen_name");
            if (sn) result.mentions.push(sn);
          });
        }
      }
      const hashtagsEl = root.querySelector("hashtags");
      if (hashtagsEl) {
        const tagEls = hashtagsEl.querySelectorAll("hashtag");
        if (tagEls.length > 0) {
          result.hashtags = [];
          tagEls.forEach((el) => {
            const t = el.textContent?.trim();
            if (t) result.hashtags.push(t);
          });
        }
      }
      const quoteEl = root.querySelector("quote_tweet");
      if (quoteEl) {
        const quoteText = (tag) => {
          const el = quoteEl.querySelector(tag);
          return el?.textContent?.trim() || "";
        };
        result.quoteTweet = {
          id: quoteText("quote_id"),
          screenName: quoteText("quote_screen_name"),
          name: quoteText("quote_name"),
          text: quoteText("quote_text")
        };
      }
      const replyEl = root.querySelector("reply");
      if (replyEl) {
        const replyText = (tag) => {
          const el = replyEl.querySelector(tag);
          return el?.textContent?.trim() || "";
        };
        result.replyTo = {
          id: replyText("in_reply_to_id"),
          screenName: replyText("in_reply_to_user")
        };
      }
      if (text("sensitive") === "true") {
        result.sensitive = true;
      }
      const imgCount = num("image_count");
      if (imgCount > 0) result.imageCount = imgCount;
      if (text("has_video") === "true") result.hasVideo = true;
      return result;
    } catch {
      return null;
    }
  }
  async function fetchPostMetadata(api, dirPath) {
    try {
      const res = await api.fetchFile(`${dirPath}/Post.nfo`);
      if (!res.ok) return null;
      const text = await res.text();
      return parseNfoXml(text);
    } catch {
      return null;
    }
  }
  async function fetchBlueskyPostMetadata(api, dirPath) {
    try {
      const res = await api.fetchFile(`${dirPath}/Post.nfo`);
      if (!res.ok) return null;
      const text = await res.text();
      return parseBlueskyNfoXml(text);
    } catch {
      return null;
    }
  }
  async function fetchTwitterPostMetadata(api, dirPath) {
    try {
      const res = await api.fetchFile(`${dirPath}/Post.nfo`);
      if (!res.ok) return null;
      const text = await res.text();
      return parseTwitterNfoXml(text);
    } catch {
      return null;
    }
  }
  async function detectNfoPlatform(api, dirPath) {
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

  // view/src/async-utils.ts
  async function mapLimit(items, limit, mapper) {
    if (items.length === 0) {
      return [];
    }
    const concurrency = Math.max(1, Math.min(limit, items.length));
    const results = new Array(items.length);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }
    await Promise.all(
      Array.from({ length: concurrency }, () => worker())
    );
    return results;
  }
  function nextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  // view/src/subreddit-grid.ts
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function isImageFile(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var METADATA_FILES = /* @__PURE__ */ new Set([
    "icon.jpg",
    "icon.png",
    "icon.webp",
    ".no-icon"
  ]);
  async function loadSubredditInfo(api, entry) {
    const files = await api.fetchFiles(entry.path);
    const dirs = files.filter((f) => f.isDirectory);
    const contentFiles = files.filter(
      (f) => !f.isDirectory && !METADATA_FILES.has(f.name)
    );
    const postCount = dirs.length;
    let preview = { type: "empty" };
    const hasPostContent = contentFiles.some((f) => f.name === "Post.nfo") || contentFiles.some((f) => isImageFile(f.name));
    if (hasPostContent) {
      preview = { type: "empty" };
    } else if (dirs.length > 0) {
      const firstChild = [...dirs].sort(
        (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
      )[0];
      let childFiles;
      try {
        childFiles = await api.fetchFiles(firstChild.path);
      } catch {
        childFiles = [];
      }
      const childContentFiles = childFiles.filter(
        (f) => !f.isDirectory && !METADATA_FILES.has(f.name)
      );
      const childDirs = childFiles.filter((f) => f.isDirectory);
      const childIsPost = childContentFiles.some((f) => f.name === "Post.nfo") || childContentFiles.some((f) => isImageFile(f.name));
      if (childIsPost) {
        try {
          const postFiles = await api.fetchFiles(firstChild.path);
          const img = postFiles.find(
            (f) => !f.isDirectory && isImageFile(f.name)
          );
          if (img) {
            preview = {
              type: "image",
              src: `/api/files/download?path=${encodeURIComponent(img.path)}`
            };
          } else {
            const meta = await fetchPostMetadata(api, firstChild.path);
            if (meta) {
              const snippet = meta.selftext ? meta.selftext.slice(0, 120) : meta.title;
              preview = {
                type: "text",
                title: meta.title || firstChild.name,
                snippet: snippet || ""
              };
            }
          }
        } catch {
        }
      } else if (childDirs.length > 0) {
        const items = dirs.slice(0, 6).map((d) => d.name);
        preview = { type: "grid", items };
      }
    }
    return {
      name: entry.name,
      path: entry.path,
      postCount,
      preview
    };
  }
  function renderPreview(preview, isUser) {
    switch (preview.type) {
      case "image":
        return `<img class="reddit-card-thumb" src="${preview.src}" alt="" loading="lazy" />`;
      case "text":
        return `
        <div class="reddit-card-text-preview">
          <div class="reddit-card-text-title">${escapeHtml(preview.title)}</div>
          <div class="reddit-card-text-snippet">${escapeHtml(preview.snippet)}${preview.snippet.length >= 120 ? "..." : ""}</div>
        </div>
      `;
      case "grid":
        return `
        <div class="reddit-card-grid-preview">
          ${preview.items.map((name) => `<div class="reddit-card-grid-item">${escapeHtml(name)}</div>`).join("")}
          ${preview.items.length >= 6 ? `<div class="reddit-card-grid-item reddit-card-grid-more">...</div>` : ""}
        </div>
      `;
      case "empty":
      default:
        return `<div class="reddit-card-thumb-placeholder">${isUser ? "\u{1F464}" : "\u{1F4C1}"}</div>`;
    }
  }
  var PLATFORM_FOLDERS = /* @__PURE__ */ new Set(["reddit", "bluesky", "twitter"]);
  function getDisplayName(sub, depth) {
    const nameLower = sub.name.toLowerCase();
    const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
    const isUser = !isPlatformFolder && (sub.name.startsWith("u_") || sub.name.startsWith("u/"));
    if (isPlatformFolder || depth === 0) {
      return sub.name;
    }
    if (isUser) {
      return "u/" + sub.name.replace(/^u[_/]/, "");
    }
    const pathLower = sub.path.toLowerCase();
    const inBluesky = pathLower.includes("/bluesky/");
    const inTwitter = pathLower.includes("/twitter/");
    return inBluesky || inTwitter ? "@" + sub.name : "r/" + sub.name;
  }
  function createSubredditCard(entry, depth) {
    const card = document.createElement("div");
    card.className = "reddit-card reddit-card-loading";
    card.dataset.path = entry.path;
    const displayName = getDisplayName(entry, depth);
    const nameLower = entry.name.toLowerCase();
    const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
    const isUser = !isPlatformFolder && (entry.name.startsWith("u_") || entry.name.startsWith("u/"));
    card.innerHTML = `
    <div class="reddit-card-preview-slot">
      ${renderPreview({ type: "empty" }, isUser)}
    </div>
    <div class="reddit-card-body">
      <div class="reddit-card-title">${escapeHtml(displayName)}</div>
      <div class="reddit-card-meta">
        <span class="reddit-card-meta-item">Loading\u2026</span>
      </div>
    </div>
  `;
    return card;
  }
  function updateSubredditCard(card, sub, depth) {
    const nameLower = sub.name.toLowerCase();
    const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
    const isUser = !isPlatformFolder && (sub.name.startsWith("u_") || sub.name.startsWith("u/"));
    const previewSlot = card.querySelector(".reddit-card-preview-slot");
    const title = card.querySelector(".reddit-card-title");
    const meta = card.querySelector(".reddit-card-meta");
    if (previewSlot) {
      previewSlot.innerHTML = renderPreview(sub.preview, isUser);
    }
    if (title) {
      title.textContent = getDisplayName(sub, depth);
    }
    if (meta) {
      meta.innerHTML = `
      <span class="reddit-card-meta-item">
        ${sub.postCount} ${sub.postCount === 1 ? "item" : "items"}
      </span>
    `;
    }
    card.classList.remove("reddit-card-loading");
  }
  async function renderSubredditGrid(container, api, rootPath, onNavigate) {
    container.innerHTML = `<div class="reddit-loading">Loading...</div>`;
    const entries = await api.fetchFiles(rootPath);
    const dirs = entries.filter((e) => e.isDirectory);
    if (dirs.length === 0) {
      container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">\u{1F4ED}</div>
        <span>No content found</span>
      </div>
    `;
      return;
    }
    const tracked = api.trackedDirectory.replace(/\/+$/, "");
    const current = rootPath.replace(/\/+$/, "");
    const isTopLevel = current === tracked;
    const depth = isTopLevel ? 0 : current.slice(tracked.length + 1).split("/").filter(Boolean).length;
    const heading = isTopLevel ? `${dirs.length} archived` : `${rootPath.split("/").pop()} \u2014 ${dirs.length} items`;
    container.innerHTML = "";
    const headingEl = document.createElement("div");
    headingEl.className = "reddit-section-heading";
    headingEl.textContent = heading;
    container.appendChild(headingEl);
    const grid = document.createElement("div");
    grid.className = "reddit-grid";
    container.appendChild(grid);
    const cardsByPath = /* @__PURE__ */ new Map();
    const entriesByPath = /* @__PURE__ */ new Map();
    dirs.forEach((dir) => {
      entriesByPath.set(dir.path, dir);
      const card = createSubredditCard(dir, depth);
      cardsByPath.set(dir.path, card);
      grid.appendChild(card);
    });
    grid.addEventListener("click", (event) => {
      const target = event.target;
      const card = target.closest(".reddit-card");
      const path = card?.dataset.path;
      if (path) {
        onNavigate(path);
      }
    });
    const hydrateQueue = [];
    const queuedPaths = /* @__PURE__ */ new Set();
    let activeHydrators = 0;
    async function pumpHydrators() {
      while (activeHydrators < 6 && hydrateQueue.length > 0) {
        const entry = hydrateQueue.shift();
        if (!entry) {
          break;
        }
        activeHydrators += 1;
        void (async () => {
          try {
            const info = await loadSubredditInfo(api, entry);
            const card = cardsByPath.get(entry.path);
            if (card?.isConnected) {
              updateSubredditCard(card, info, depth);
            }
          } finally {
            activeHydrators -= 1;
            queuedPaths.delete(entry.path);
            void pumpHydrators();
          }
        })();
      }
    }
    const observer = new IntersectionObserver(
      (entries2) => {
        for (const entry of entries2) {
          if (!entry.isIntersecting) {
            continue;
          }
          const card = entry.target;
          const path = card.dataset.path;
          if (!path || queuedPaths.has(path)) {
            observer.unobserve(card);
            continue;
          }
          const dir = entriesByPath.get(path);
          if (dir) {
            hydrateQueue.push(dir);
            queuedPaths.add(path);
            void pumpHydrators();
          }
          observer.unobserve(card);
        }
      },
      { rootMargin: "600px" }
    );
    cardsByPath.forEach((card) => observer.observe(card));
    dirs.slice(0, 8).forEach((dir) => {
      if (!queuedPaths.has(dir.path)) {
        hydrateQueue.push(dir);
        queuedPaths.add(dir.path);
      }
    });
    await nextFrame();
    void pumpHydrators();
  }

  // view/src/lazy-feed-card.ts
  var DEFAULT_RENDER_MARGIN = "400px";
  var LazyFeedCard = class {
    constructor(options) {
      __publicField(this, "options");
      __publicField(this, "root");
      __publicField(this, "observer", null);
      __publicField(this, "resizeObserver", null);
      __publicField(this, "measuredHeight", null);
      __publicField(this, "isRendered");
      __publicField(this, "destroyed", false);
      this.options = options;
      this.root = document.createElement("div");
      this.root.className = "lazy-feed-card";
      this.root.style.overflowAnchor = "none";
      this.isRendered = Boolean(options.initiallyRendered);
      if (this.isRendered) {
        this.showContent();
      } else {
        this.showPlaceholder();
      }
    }
    mount(container) {
      container.appendChild(this.root);
      this.observer = new IntersectionObserver(
        ([entry]) => {
          const shouldRender = Boolean(entry?.isIntersecting);
          if (shouldRender === this.isRendered) {
            return;
          }
          if (shouldRender) {
            this.showContent();
          } else {
            this.showPlaceholder();
          }
        },
        {
          rootMargin: this.options.renderMargin ?? DEFAULT_RENDER_MARGIN,
          threshold: 0.01
        }
      );
      this.observer.observe(this.root);
    }
    destroy() {
      if (this.destroyed) {
        return;
      }
      this.destroyed = true;
      this.observer?.disconnect();
      this.resizeObserver?.disconnect();
      this.root.remove();
    }
    showContent() {
      if (this.destroyed) {
        return;
      }
      this.isRendered = true;
      this.resizeObserver?.disconnect();
      const content = this.options.render();
      this.root.replaceChildren(content);
      this.resizeObserver = new ResizeObserver(() => {
        this.measure();
      });
      this.resizeObserver.observe(this.root);
      requestAnimationFrame(() => {
        this.measure();
      });
    }
    showPlaceholder() {
      if (this.destroyed) {
        return;
      }
      this.measure();
      this.isRendered = false;
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      const placeholder = document.createElement("div");
      placeholder.className = "lazy-feed-card-placeholder virtualized-feed-placeholder";
      placeholder.style.height = `${this.measuredHeight ?? this.options.estimatedHeight}px`;
      placeholder.style.contain = "strict";
      placeholder.style.overflowAnchor = "none";
      this.root.replaceChildren(placeholder);
    }
    measure() {
      const height = Math.ceil(this.root.getBoundingClientRect().height);
      if (height > 0) {
        this.measuredHeight = height;
      }
    }
  };

  // view/src/reddit-timeline.ts
  function escapeHtml2(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function formatRelativeTime(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDay = Math.floor(diffMs / 864e5);
      if (diffDay > 30) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : void 0
        });
      }
      if (diffDay > 0) return `${diffDay}d ago`;
      const diffHour = Math.floor(diffMs / 36e5);
      if (diffHour > 0) return `${diffHour}h ago`;
      const diffMin = Math.floor(diffMs / 6e4);
      if (diffMin > 0) return `${diffMin}m ago`;
      return "now";
    } catch {
      return dateStr;
    }
  }
  function formatScore(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  function isImageFile2(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var UPVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l-7 7h4v7h6v-7h4L10 3z"/></svg>`;
  var DOWNVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17l7-7h-4V3H7v7H3l7 7z"/></svg>`;
  var COMMENT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var SHARE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
  var AWARD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;
  function createLightbox(images, startIndex) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "reddit-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml2(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;
      overlay.querySelector(".reddit-lightbox-close").addEventListener("click", () => {
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
    const handleKey = (e) => {
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
  function buildMediaBlock(post) {
    const meta = post.metadata;
    if (post.videoFile) {
      const wrap = document.createElement("div");
      wrap.className = "rdt-media-wrap";
      const video = document.createElement("video");
      video.className = "rdt-media-video";
      video.src = `/api/files/download?path=${encodeURIComponent(post.videoFile.path)}`;
      video.controls = true;
      video.preload = "metadata";
      wrap.appendChild(video);
      return wrap;
    }
    if (post.images.length > 0) {
      const wrap = document.createElement("div");
      wrap.className = "rdt-media-wrap" + (post.images.length > 1 ? " rdt-media-gallery" : "");
      const imageUrls = post.images.map((img) => ({
        src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
        name: img.name
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
    if (meta.selftext && meta.selftext.trim().length > 0) {
      const preview = document.createElement("div");
      preview.className = "rdt-selftext-preview";
      preview.textContent = meta.selftext.slice(0, 600);
      return preview;
    }
    const isSelf = !meta.domain || meta.domain.startsWith("self.") || meta.domain === "reddit.com";
    if (!isSelf && meta.domain && !meta.isVideo) {
      const preview = document.createElement("div");
      preview.className = "rdt-link-preview";
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(meta.domain)}&sz=32`;
      preview.innerHTML = `
      <img class="rdt-link-favicon" src="${faviconUrl}" alt="" />
      <span class="rdt-link-domain">${escapeHtml2(meta.domain)}</span>
    `;
      return preview;
    }
    return null;
  }
  function renderPostCard(post, api, subredditAvatarUrl) {
    const card = document.createElement("div");
    card.className = "rdt-post-card";
    const meta = post.metadata;
    const header = document.createElement("div");
    header.className = "rdt-post-header";
    let avatarHtml = "";
    if (subredditAvatarUrl) {
      avatarHtml = `<img class="rdt-subreddit-icon" src="${escapeHtml2(subredditAvatarUrl)}" alt="" />`;
    } else {
      avatarHtml = `<div class="rdt-subreddit-icon rdt-subreddit-icon-placeholder"></div>`;
    }
    header.innerHTML = `
    ${avatarHtml}
    <span class="rdt-subreddit">r/${escapeHtml2(meta.subreddit)}</span>
    <span class="rdt-meta-sep">&middot;</span>
    <span class="rdt-timestamp">${formatRelativeTime(meta.created)}</span>
  `;
    card.appendChild(header);
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
        badges.innerHTML += `<span class="rdt-flair">${escapeHtml2(meta.flair)}</span>`;
      }
      card.appendChild(badges);
    }
    const titleEl = document.createElement("h3");
    titleEl.className = "rdt-post-title";
    titleEl.textContent = meta.title;
    card.appendChild(titleEl);
    const mediaEl = buildMediaBlock(post);
    if (mediaEl) card.appendChild(mediaEl);
    const scoreClass = meta.score > 0 ? "rdt-score-up" : meta.score < 0 ? "rdt-score-down" : "rdt-score-neutral";
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
  var RENDER_BATCH = 20;
  var STUB_CONCURRENCY = 30;
  var ENRICH_CONCURRENCY = 6;
  function debounce(fn, ms) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }
  async function enrichPost(api, stub) {
    const files = await api.fetchFiles(stub.path);
    const images = files.filter(
      (f) => !f.isDirectory && isImageFile2(f.name) && f.name !== "Video Thumbnail.jpg" && f.name !== "Thumbnail.jpg"
    );
    const videoFile = files.find(
      (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
    );
    return { path: stub.path, metadata: stub.metadata, images, videoFile };
  }
  function matchesRedditSearch(stub, term) {
    const m = stub.metadata;
    return m.title.toLowerCase().includes(term) || m.author.toLowerCase().includes(term) || (m.flair || "").toLowerCase().includes(term) || (m.selftext || "").toLowerCase().includes(term);
  }
  async function renderRedditTimeline(container, api, subredditPath, onNavigate) {
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
    const iconFiles = entries.filter(
      (e) => !e.isDirectory && (e.name === "icon.jpg" || e.name === "icon.png" || e.name === "icon.webp")
    );
    const subredditAvatarUrl = iconFiles.length > 0 ? `/api/files/download?path=${encodeURIComponent(iconFiles[0].path)}` : null;
    let loadedCount = 0;
    const statusEl = container.querySelector(".reddit-loading");
    const allStubs = await mapLimit(postDirs, STUB_CONCURRENCY, async (dir) => {
      const metadata = await fetchPostMetadata(api, dir.path);
      loadedCount++;
      if (statusEl && loadedCount % 10 === 0) {
        statusEl.textContent = `Loading posts... ${loadedCount}/${postDirs.length}`;
      }
      return metadata ? { path: dir.path, metadata } : null;
    });
    const indexedStubs = allStubs.filter(
      (stub) => stub !== null
    );
    let sortMode = "new";
    let searchTerm = "";
    function applySortAndFilter() {
      let list = searchTerm ? indexedStubs.filter((s) => matchesRedditSearch(s, searchTerm)) : [...indexedStubs];
      if (sortMode === "new") {
        list.sort(
          (a, b) => new Date(b.metadata.created).getTime() - new Date(a.metadata.created).getTime()
        );
      } else {
        list.sort((a, b) => b.metadata.score - a.metadata.score);
      }
      return list;
    }
    let filtered = applySortAndFilter();
    let renderedCount = 0;
    let isLoading = false;
    let scrollObserver = null;
    const lazyCards = [];
    let isDisposed = false;
    container.innerHTML = "";
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
      <h2 class="rdt-profile-name">r/${escapeHtml2(subredditName)}</h2>
      <span class="rdt-profile-count">${postDirs.length} archived posts</span>
    </div>
  `;
    container.appendChild(profileHeader);
    const controls = document.createElement("div");
    controls.className = "rdt-controls";
    controls.innerHTML = `
    <input type="text" class="timeline-search" placeholder="Search posts..." aria-label="Search posts" />
    <select class="rdt-sort-select" aria-label="Sort posts">
      <option value="new">Newest</option>
      <option value="top">Top</option>
    </select>
  `;
    container.appendChild(controls);
    const searchInput = controls.querySelector(".timeline-search");
    const sortSelect = controls.querySelector(".rdt-sort-select");
    const timeline = document.createElement("div");
    timeline.className = "rdt-timeline";
    container.appendChild(timeline);
    const sentinel = document.createElement("div");
    sentinel.className = "timeline-load-sentinel";
    container.appendChild(sentinel);
    function clearRenderedCards() {
      while (lazyCards.length > 0) {
        lazyCards.pop()?.destroy();
      }
    }
    function appendPostCard(post, index) {
      const lazyCard = new LazyFeedCard({
        estimatedHeight: 360,
        initiallyRendered: index < 8,
        renderMargin: "500px",
        render: () => {
          const card = renderPostCard(post, api, subredditAvatarUrl);
          if (onNavigate) {
            card.style.cursor = "pointer";
            card.addEventListener("click", (e) => {
              const target = e.target;
              if (target.closest(".rdt-media-wrap") || target.closest("a") || target.closest("video")) {
                return;
              }
              onNavigate(post.path);
            });
          }
          return card;
        }
      });
      lazyCard.mount(timeline);
      lazyCards.push(lazyCard);
    }
    async function renderNextBatch() {
      if (isDisposed || isLoading || renderedCount >= filtered.length) {
        return;
      }
      isLoading = true;
      const batch = filtered.slice(renderedCount, renderedCount + RENDER_BATCH);
      const enriched = await mapLimit(
        batch,
        ENRICH_CONCURRENCY,
        (stub) => enrichPost(api, stub)
      );
      const startIndex = renderedCount;
      for (let index = 0; index < enriched.length; index += 1) {
        appendPostCard(enriched[index], startIndex + index);
      }
      renderedCount += enriched.length;
      isLoading = false;
    }
    async function resetAndRender() {
      if (isDisposed) {
        return;
      }
      filtered = applySortAndFilter();
      renderedCount = 0;
      isLoading = false;
      clearRenderedCards();
      timeline.innerHTML = "";
      if (filtered.length === 0 && searchTerm) {
        timeline.innerHTML = `<div class="timeline-no-results">No posts match "${escapeHtml2(searchTerm)}"</div>`;
        return;
      }
      await renderNextBatch();
    }
    scrollObserver = new IntersectionObserver(
      (entries2) => {
        if (entries2[0]?.isIntersecting && !isLoading && renderedCount < filtered.length) {
          void renderNextBatch();
        }
      },
      { rootMargin: "600px" }
    );
    scrollObserver.observe(sentinel);
    const handleSortChange = () => {
      sortMode = sortSelect.value;
      void resetAndRender();
    };
    sortSelect.addEventListener("change", handleSortChange);
    const handleSearchInput = debounce(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      void resetAndRender();
    }, 300);
    searchInput.addEventListener("input", handleSearchInput);
    await resetAndRender();
    return () => {
      isDisposed = true;
      scrollObserver?.disconnect();
      clearRenderedCards();
      sortSelect.removeEventListener("change", handleSortChange);
      searchInput.removeEventListener("input", handleSearchInput);
    };
  }

  // view/src/markdown.ts
  function escapeHtml3(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function renderMarkdown(md) {
    if (!md) return "";
    let html = md;
    html = escapeHtml3(html);
    html = html.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (_m, _lang, code) => `<pre style="background:var(--muted);padding:0.75rem;border-radius:0.375rem;overflow-x:auto;font-size:0.8125rem;margin:0.5rem 0;"><code>${code.trim()}</code></pre>`
    );
    html = html.replace(
      /`([^`]+)`/g,
      `<code style="background:var(--muted);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;">$1</code>`
    );
    html = html.replace(/^####\s+(.+)$/gm, '<strong style="font-size:0.875rem;">$1</strong>');
    html = html.replace(/^###\s+(.+)$/gm, '<strong style="font-size:0.9375rem;">$1</strong>');
    html = html.replace(/^##\s+(.+)$/gm, '<strong style="font-size:1rem;">$1</strong>');
    html = html.replace(/^#\s+(.+)$/gm, '<strong style="font-size:1.125rem;">$1</strong>');
    html = html.replace(/^[-*_]{3,}$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:0.75rem 0;" />');
    html = html.replace(
      /^&gt;\s*(.+)$/gm,
      '<blockquote style="border-left:3px solid var(--border);padding-left:0.75rem;color:var(--muted-foreground);margin:0.375rem 0;">$1</blockquote>'
    );
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
    html = html.replace(/\^\(([^)]+)\)/g, "<sup>$1</sup>");
    html = html.replace(/\^(\S+)/g, "<sup>$1</sup>");
    html = html.replace(
      /!\[gif\]\(giphy\|([a-zA-Z0-9]+)(?:\|[^)]+)?\)/g,
      '<img class="reddit-comment-media-img" src="https://i.giphy.com/media/$1/giphy.gif" alt="gif" loading="lazy" />'
    );
    html = html.replace(
      /!\[img\]\((https?:\/\/[^)]+)\)/g,
      '<img class="reddit-comment-media-img" src="$1" alt="image" loading="lazy" />'
    );
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;">$1</a>'
    );
    html = html.replace(
      /(?<!href="|src=")(https?:\/\/[^\s<)"]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;">$1</a>'
    );
    html = html.replace(
      /(?<!\w)\/?r\/(\w+)/g,
      '<a href="https://www.reddit.com/r/$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary);">r/$1</a>'
    );
    html = html.replace(
      /(?<!\w)\/?u\/(\w+)/g,
      '<a href="https://www.reddit.com/u/$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary);">u/$1</a>'
    );
    html = html.replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li style="margin-left:1.25rem;">$1</li>');
    html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li style="margin-left:1.25rem;">$1</li>');
    html = html.replace(/\n\n+/g, '</p><p style="margin-bottom:0.5rem;">');
    html = html.replace(/\n/g, "<br>");
    html = `<p style="margin-bottom:0.5rem;">${html}</p>`;
    html = html.replace(/<p style="margin-bottom:0\.5rem;"><\/p>/g, "");
    return html;
  }

  // view/src/comment-tree.ts
  var DEPTH_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)"
  ];
  function depthColor(depth) {
    return DEPTH_COLORS[depth % DEPTH_COLORS.length];
  }
  function formatDate(utc) {
    if (!utc || utc <= 0) return "";
    try {
      const date = new Date(utc * 1e3);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "";
    }
  }
  function buildCommentMedia(body, media, postPath) {
    if (!media || Object.keys(media).length === 0) {
      return { cleanBody: body, mediaEls: [] };
    }
    let cleanBody = body;
    const mediaEls = [];
    for (const [key, filename] of Object.entries(media)) {
      const src = `/api/files/download?path=${encodeURIComponent(postPath + "/comment_media/" + filename)}`;
      if (key.startsWith("giphy:")) {
        const giphyId = key.replace("giphy:", "");
        const pattern = new RegExp(`!\\[gif\\]\\(giphy\\|${giphyId}(?:\\|[^)]+)?\\)`, "g");
        cleanBody = cleanBody.replace(pattern, "").trim();
      } else if (key.startsWith("img:")) {
        const imgUrl = key.replace("img:", "");
        const escaped = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`!\\[img\\]\\(${escaped}\\)`, "g");
        cleanBody = cleanBody.replace(pattern, "").trim();
      }
      const img = document.createElement("img");
      img.className = "reddit-comment-media-img";
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      mediaEls.push(img);
    }
    return { cleanBody, mediaEls };
  }
  function sortComments(comments, mode) {
    const sorted = [...comments];
    if (mode === "top") {
      sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else {
      sorted.sort((a, b) => (b.created_utc ?? 0) - (a.created_utc ?? 0));
    }
    return sorted;
  }
  function countAllReplies(comment) {
    if (!comment.replies) return 0;
    let count = comment.replies.length;
    for (const r of comment.replies) {
      count += countAllReplies(r);
    }
    return count;
  }
  function renderComment(comment, postPath, depth, startCollapsed) {
    if (comment.kind === "more") {
      const more = comment;
      const stub = document.createElement("div");
      stub.className = "reddit-comment";
      stub.style.opacity = "0.5";
      stub.style.fontSize = "0.75rem";
      stub.style.color = "var(--muted-foreground)";
      stub.textContent = `${more.count} more replies...`;
      return stub;
    }
    const el = document.createElement("div");
    el.className = "reddit-comment";
    const header = document.createElement("div");
    header.className = "reddit-comment-header";
    const authorEl = document.createElement("span");
    authorEl.className = comment.is_submitter ? "reddit-comment-author reddit-comment-op" : "reddit-comment-author";
    authorEl.textContent = comment.author;
    header.appendChild(authorEl);
    if (comment.is_submitter) {
      const badge = document.createElement("span");
      badge.className = "reddit-op-badge";
      badge.textContent = "OP";
      header.appendChild(badge);
    }
    if (comment.distinguished === "moderator") {
      const badge = document.createElement("span");
      badge.className = "reddit-mod-badge";
      badge.textContent = "MOD";
      header.appendChild(badge);
    }
    if (comment.stickied) {
      const badge = document.createElement("span");
      badge.className = "reddit-mod-badge";
      badge.textContent = "\u{1F4CC}";
      header.appendChild(badge);
    }
    const scoreClass = comment.score > 0 ? "reddit-score-up" : comment.score < 0 ? "reddit-score-down" : "reddit-score-neutral";
    const scoreEl = document.createElement("span");
    scoreEl.className = `reddit-score ${scoreClass}`;
    scoreEl.textContent = `${comment.score > 0 ? "+" : ""}${comment.score}`;
    header.appendChild(scoreEl);
    const dateStr = formatDate(comment.created_utc);
    if (dateStr) {
      const dateEl = document.createElement("span");
      dateEl.className = "reddit-comment-date";
      dateEl.textContent = dateStr;
      header.appendChild(dateEl);
    }
    el.appendChild(header);
    const { cleanBody, mediaEls } = buildCommentMedia(comment.body, comment.media, postPath);
    const bodyEl = document.createElement("div");
    bodyEl.className = "reddit-comment-body";
    bodyEl.innerHTML = renderMarkdown(cleanBody);
    el.appendChild(bodyEl);
    if (mediaEls.length > 0) {
      const mediaContainer = document.createElement("div");
      mediaContainer.className = "reddit-comment-media";
      for (const img of mediaEls) {
        mediaContainer.appendChild(img);
      }
      el.appendChild(mediaContainer);
    }
    if (comment.replies && comment.replies.length > 0) {
      const totalReplies = countAllReplies(comment);
      const collapsed = startCollapsed;
      const toggle = document.createElement("button");
      toggle.className = "reddit-comment-toggle";
      toggle.innerHTML = `<span class="reddit-comment-toggle-icon ${collapsed ? "" : "expanded"}">\u25B6</span> <span class="reddit-comment-toggle-text">${totalReplies} ${totalReplies === 1 ? "reply" : "replies"}</span>`;
      el.appendChild(toggle);
      const thread = document.createElement("div");
      thread.className = "reddit-comment-thread";
      thread.style.setProperty("--thread-color", depthColor(depth));
      if (collapsed) thread.classList.add("collapsed");
      for (const reply of comment.replies) {
        thread.appendChild(renderComment(reply, postPath, depth + 1, false));
      }
      el.appendChild(thread);
      toggle.addEventListener("click", () => {
        const isCollapsed = thread.classList.toggle("collapsed");
        const icon = toggle.querySelector(".reddit-comment-toggle-icon");
        icon.classList.toggle("expanded", !isCollapsed);
      });
      thread.addEventListener("click", (e) => {
        const rect = thread.getBoundingClientRect();
        if (e.clientX < rect.left + 16) {
          e.stopPropagation();
          const isCollapsed = thread.classList.toggle("collapsed");
          const icon = toggle.querySelector(".reddit-comment-toggle-icon");
          icon.classList.toggle("expanded", !isCollapsed);
        }
      });
    }
    return el;
  }
  function renderCommentTree(container, comments, postPath) {
    if (comments.length === 0) {
      container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">\u{1F4AC}</div>
        <span>No comments</span>
      </div>
    `;
      return;
    }
    const section = document.createElement("div");
    section.className = "reddit-comments";
    const headerRow = document.createElement("div");
    headerRow.className = "reddit-comments-header-row";
    const heading = document.createElement("div");
    heading.className = "reddit-comments-heading";
    heading.textContent = `Comments (${comments.length})`;
    headerRow.appendChild(heading);
    const sortBar = document.createElement("div");
    sortBar.className = "reddit-sort-bar";
    const topBtn = document.createElement("button");
    topBtn.className = "reddit-sort-btn active";
    topBtn.textContent = "Top";
    const newestBtn = document.createElement("button");
    newestBtn.className = "reddit-sort-btn";
    newestBtn.textContent = "Newest";
    sortBar.appendChild(topBtn);
    sortBar.appendChild(newestBtn);
    headerRow.appendChild(sortBar);
    section.appendChild(headerRow);
    const commentsList = document.createElement("div");
    commentsList.className = "reddit-comments-list";
    section.appendChild(commentsList);
    const renderList = (mode) => {
      commentsList.innerHTML = "";
      const sorted = sortComments(comments, mode);
      for (const c of sorted) {
        const hasReplies = !!(c.replies && c.replies.length > 0);
        commentsList.appendChild(renderComment(c, postPath, 0, hasReplies));
      }
    };
    topBtn.addEventListener("click", () => {
      topBtn.classList.add("active");
      newestBtn.classList.remove("active");
      renderList("top");
    });
    newestBtn.addEventListener("click", () => {
      newestBtn.classList.add("active");
      topBtn.classList.remove("active");
      renderList("newest");
    });
    renderList("top");
    container.innerHTML = "";
    container.appendChild(section);
  }

  // view/src/post-detail.ts
  function escapeHtml4(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function formatDate2(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }
  function isImageFile3(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  function isVideoFile(name) {
    return /\.(mp4|webm|mov|avi|mkv)$/i.test(name);
  }
  async function parseComments(api, path) {
    try {
      const res = await api.fetchFile(`${path}/Comments.json`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
  function createLightbox2(images, startIndex) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "reddit-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml4(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;
      overlay.querySelector(".reddit-lightbox-close").addEventListener("click", () => {
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
    const handleKey = (e) => {
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
  async function renderPostDetail(container, api, postPath) {
    container.innerHTML = `<div class="reddit-loading">Loading post...</div>`;
    const [files, metadata, comments] = await Promise.all([
      api.fetchFiles(postPath),
      fetchPostMetadata(api, postPath),
      parseComments(api, postPath)
    ]);
    const images = files.filter((f) => !f.isDirectory && isImageFile3(f.name));
    const videos = files.filter((f) => !f.isDirectory && isVideoFile(f.name));
    const title = metadata?.title || postPath.split("/").pop() || "Post";
    const scoreClass = metadata ? metadata.score > 0 ? "reddit-score-up" : metadata.score < 0 ? "reddit-score-down" : "reddit-score-neutral" : "reddit-score-neutral";
    let headerHtml = `
    <div class="reddit-post-header">
      <h1 class="reddit-post-title">${escapeHtml4(title)}</h1>
      <div class="reddit-post-byline">
  `;
    if (metadata) {
      headerHtml += `<span class="reddit-post-author">u/${escapeHtml4(metadata.author)}</span>`;
      if (metadata.subreddit) {
        headerHtml += `<span class="reddit-card-meta-item">r/${escapeHtml4(metadata.subreddit)}</span>`;
      }
      headerHtml += `<span class="reddit-score ${scoreClass}">${metadata.score > 0 ? "+" : ""}${metadata.score.toLocaleString()}</span>`;
      if (metadata.flair) {
        headerHtml += `<span class="reddit-flair">${escapeHtml4(metadata.flair)}</span>`;
      }
      if (metadata.created) {
        headerHtml += `<span>${formatDate2(metadata.created)}</span>`;
      }
      if (metadata.numComments !== void 0) {
        headerHtml += `<span>${metadata.numComments.toLocaleString()} comments</span>`;
      }
    }
    if (metadata?.url) {
      headerHtml += `<a class="social-open-original" href="${escapeHtml4(metadata.url)}" target="_blank" rel="noopener noreferrer" title="Open original post">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      Original
    </a>`;
    }
    headerHtml += `</div></div>`;
    let selftextHtml = "";
    if (metadata?.selftext) {
      selftextHtml = `<div class="reddit-post-selftext">${renderMarkdown(metadata.selftext)}</div>`;
    }
    let galleryHtml = "";
    if (images.length > 0) {
      const imageItems = images.map(
        (img) => `/api/files/download?path=${encodeURIComponent(img.path)}`
      );
      galleryHtml = `<div class="reddit-gallery">`;
      images.forEach((img, i) => {
        galleryHtml += `<img class="reddit-gallery-img" data-index="${i}" src="${imageItems[i]}" alt="${escapeHtml4(img.name)}" loading="lazy" />`;
      });
      galleryHtml += `</div>`;
    }
    let videoHtml = "";
    if (videos.length > 0) {
      videos.forEach((vid) => {
        const src = `/api/files/download?path=${encodeURIComponent(vid.path)}`;
        const isGif = vid.name.includes(".gif.");
        videoHtml += `
        <video controls${isGif ? " autoplay loop muted playsinline" : ""} style="width:100%;max-height:70vh;border-radius:0.5rem;margin-bottom:1rem;background:var(--muted);">
          <source src="${src}" />
          Your browser does not support video playback.
        </video>
      `;
      });
    }
    let linkCardHtml = "";
    const isLinkPost = metadata?.domain && metadata.domain !== "self." + metadata.subreddit && metadata.domain !== "i.redd.it" && metadata.domain !== "v.redd.it" && metadata.domain !== "reddit.com" && metadata.mediaUrl;
    if (isLinkPost && metadata?.mediaUrl) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(metadata.domain)}&sz=64`;
      linkCardHtml = `
      <a class="reddit-link-card" href="${escapeHtml4(metadata.mediaUrl)}" target="_blank" rel="noopener noreferrer">
        <img class="reddit-link-favicon" src="${faviconUrl}" alt="" />
        <div class="reddit-link-info">
          <div class="reddit-link-domain">${escapeHtml4(metadata.domain)}</div>
          <div class="reddit-link-url">${escapeHtml4(metadata.mediaUrl)}</div>
        </div>
        <span class="reddit-link-external">\u2197</span>
      </a>
    `;
    }
    let emptyNotice = "";
    if (images.length === 0 && videos.length === 0 && !metadata?.selftext && !isLinkPost) {
      emptyNotice = `
      <div class="reddit-empty" style="padding:2rem">
        <div class="reddit-empty-icon">\u{1F4DD}</div>
        <span>No media or text content archived</span>
      </div>
    `;
    }
    container.innerHTML = `
    <div class="reddit-post">
      ${headerHtml}
      ${selftextHtml}
      ${linkCardHtml}
      ${videoHtml}
      ${galleryHtml}
      ${emptyNotice}
      <div id="reddit-comments-container"></div>
    </div>
  `;
    if (images.length > 0) {
      const imageUrls = images.map((img) => ({
        src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
        name: img.name
      }));
      container.querySelectorAll(".reddit-gallery-img").forEach((el) => {
        el.addEventListener("click", () => {
          const idx = parseInt(el.dataset.index || "0", 10);
          document.body.appendChild(createLightbox2(imageUrls, idx));
        });
      });
    }
    const commentsContainer = container.querySelector("#reddit-comments-container");
    if (commentsContainer) {
      renderCommentTree(commentsContainer, comments, postPath);
    }
  }

  // view/src/bluesky-richtext.ts
  function byteToCharOffset(text, byteOffset) {
    const encoder = new TextEncoder();
    let byteCount = 0;
    for (let i = 0; i < text.length; i++) {
      if (byteCount >= byteOffset) return i;
      const char = text.codePointAt(i);
      const bytes = encoder.encode(String.fromCodePoint(char)).length;
      byteCount += bytes;
      if (char > 65535) i++;
    }
    return text.length;
  }
  function escapeHtml5(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function renderBlueskyRichText(text, facets) {
    const container = document.createElement("div");
    container.className = "bluesky-post-text";
    if (!facets || facets.length === 0) {
      container.innerHTML = escapeHtml5(text).replace(/\n/g, "<br>");
      return container;
    }
    const sorted = [...facets].sort((a, b) => a.byteStart - b.byteStart);
    const charFacets = sorted.map((f) => ({
      ...f,
      charStart: byteToCharOffset(text, f.byteStart),
      charEnd: byteToCharOffset(text, f.byteEnd)
    }));
    let html = "";
    let lastIndex = 0;
    for (const facet of charFacets) {
      if (facet.charStart > lastIndex) {
        html += escapeHtml5(text.slice(lastIndex, facet.charStart)).replace(
          /\n/g,
          "<br>"
        );
      }
      const facetText = escapeHtml5(text.slice(facet.charStart, facet.charEnd));
      if (facet.type === "link" && facet.uri) {
        html += `<a href="${escapeHtml5(facet.uri)}" target="_blank" rel="noopener noreferrer" class="bluesky-link">${facetText}</a>`;
      } else if (facet.type === "mention" && facet.did) {
        html += `<a href="https://bsky.app/profile/${escapeHtml5(facet.did)}" target="_blank" rel="noopener noreferrer" class="bluesky-mention">${facetText}</a>`;
      } else if (facet.type === "tag" && facet.tag) {
        html += `<span class="bluesky-hashtag">${facetText}</span>`;
      } else {
        html += facetText;
      }
      lastIndex = facet.charEnd;
    }
    if (lastIndex < text.length) {
      html += escapeHtml5(text.slice(lastIndex)).replace(/\n/g, "<br>");
    }
    container.innerHTML = html;
    return container;
  }

  // view/src/bluesky-timeline.ts
  function escapeHtml6(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function formatRelativeTime2(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1e3);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay > 30) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : void 0
        });
      }
      if (diffDay > 0) return `${diffDay}d`;
      if (diffHour > 0) return `${diffHour}h`;
      if (diffMin > 0) return `${diffMin}m`;
      return "now";
    } catch {
      return dateStr;
    }
  }
  function formatCount(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  function isImageFile4(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var REPLY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var REPOST_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  var LIKE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  function createLightbox3(images, startIndex) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "reddit-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml6(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;
      overlay.querySelector(".reddit-lightbox-close").addEventListener("click", () => {
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
    const handleKey = (e) => {
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
  function renderPostCard2(post, api, profileAvatarUrl) {
    const card = document.createElement("div");
    card.className = "bluesky-post-card";
    const meta = post.metadata;
    const avatarUrl = profileAvatarUrl || meta.avatarUrl;
    const header = document.createElement("div");
    header.className = "bluesky-post-header";
    let avatarHtml = "";
    if (avatarUrl) {
      avatarHtml = `<img class="bluesky-avatar" src="${escapeHtml6(avatarUrl)}" alt="" />`;
    } else {
      avatarHtml = `<div class="bluesky-avatar bluesky-avatar-placeholder"></div>`;
    }
    const displayName = meta.displayName || meta.authorHandle;
    header.innerHTML = `
    ${avatarHtml}
    <div class="bluesky-post-author-info">
      <span class="bluesky-display-name">${escapeHtml6(displayName)}</span>
      <span class="bluesky-handle">@${escapeHtml6(meta.authorHandle)}</span>
    </div>
    <span class="bluesky-timestamp">${formatRelativeTime2(meta.created)}</span>
  `;
    card.appendChild(header);
    const textEl = renderBlueskyRichText(meta.text, meta.facets);
    card.appendChild(textEl);
    if (post.images.length > 0) {
      const imageGrid = document.createElement("div");
      const count = post.images.length;
      imageGrid.className = `bluesky-post-images bluesky-images-${Math.min(count, 4)}`;
      const imageUrls = post.images.map((img) => ({
        src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
        name: img.name
      }));
      post.images.forEach((img, i) => {
        const imgEl = document.createElement("img");
        imgEl.className = "bluesky-post-image";
        imgEl.src = imageUrls[i].src;
        imgEl.alt = img.name;
        imgEl.loading = "lazy";
        imgEl.addEventListener("click", () => {
          document.body.appendChild(createLightbox3(imageUrls, i));
        });
        imageGrid.appendChild(imgEl);
      });
      card.appendChild(imageGrid);
    }
    if (post.videoFile) {
      const videoEl = document.createElement("video");
      videoEl.className = "twitter-video";
      videoEl.src = `/api/files/download?path=${encodeURIComponent(post.videoFile.path)}`;
      videoEl.controls = true;
      videoEl.preload = "metadata";
      videoEl.style.cssText = "width:100%;max-height:500px;border-radius:0.75rem;margin-top:0.75rem;background:var(--muted);";
      if (post.videoFile.name.includes(".gif.")) {
        videoEl.autoplay = true;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
      }
      card.appendChild(videoEl);
    }
    if (meta.externalLink && meta.externalLink.uri) {
      const linkCard = document.createElement("a");
      linkCard.className = "bluesky-external-card";
      linkCard.href = meta.externalLink.uri;
      linkCard.target = "_blank";
      linkCard.rel = "noopener noreferrer";
      let thumbHtml = "";
      if (post.thumbnailFile) {
        const thumbSrc = `/api/files/download?path=${encodeURIComponent(post.thumbnailFile.path)}`;
        thumbHtml = `<img class="bluesky-external-thumb" src="${thumbSrc}" alt="" />`;
      } else if (meta.externalLink.thumb) {
        thumbHtml = `<img class="bluesky-external-thumb" src="${escapeHtml6(meta.externalLink.thumb)}" alt="" />`;
      }
      let domain = "";
      try {
        domain = new URL(meta.externalLink.uri).hostname;
      } catch {
        domain = meta.externalLink.uri;
      }
      linkCard.innerHTML = `
      ${thumbHtml}
      <div class="bluesky-external-info">
        <span class="bluesky-external-domain">${escapeHtml6(domain)}</span>
        <span class="bluesky-external-title">${escapeHtml6(meta.externalLink.title)}</span>
        ${meta.externalLink.description ? `<span class="bluesky-external-desc">${escapeHtml6(meta.externalLink.description)}</span>` : ""}
      </div>
    `;
      card.appendChild(linkCard);
    }
    if (meta.quotePost && meta.quotePost.authorHandle) {
      const quoteCard = document.createElement("div");
      quoteCard.className = "bluesky-quote-card";
      const quoteDisplayName = meta.quotePost.displayName || meta.quotePost.authorHandle;
      quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml6(quoteDisplayName)}</span>
        <span class="bluesky-handle">@${escapeHtml6(meta.quotePost.authorHandle)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml6(meta.quotePost.text).replace(/\n/g, "<br>")}</div>
    `;
      card.appendChild(quoteCard);
    }
    const engagement = document.createElement("div");
    engagement.className = "bluesky-engagement";
    engagement.innerHTML = `
    <span class="bluesky-metric">${REPLY_ICON} ${formatCount(meta.replyCount)}</span>
    <span class="bluesky-metric bluesky-metric-repost">${REPOST_ICON} ${formatCount(meta.repostCount)}</span>
    <span class="bluesky-metric bluesky-metric-like">${LIKE_ICON} ${formatCount(meta.likeCount)}</span>
  `;
    card.appendChild(engagement);
    return card;
  }
  var RENDER_BATCH2 = 20;
  var STUB_CONCURRENCY2 = 30;
  var ENRICH_CONCURRENCY2 = 6;
  function debounce2(fn, ms) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }
  async function enrichBlueskyPost(api, stub) {
    const files = await api.fetchFiles(stub.path);
    const images = files.filter(
      (f) => !f.isDirectory && isImageFile4(f.name) && f.name !== "Video Thumbnail.jpg" && f.name !== "Thumbnail.jpg"
    );
    const videoFile = files.find(
      (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
    );
    const thumbnailFile = files.find(
      (f) => !f.isDirectory && f.name === "Thumbnail.jpg"
    );
    return { path: stub.path, metadata: stub.metadata, images, videoFile, thumbnailFile };
  }
  function matchesBlueskySearch(stub, term) {
    const m = stub.metadata;
    return m.text.toLowerCase().includes(term) || m.authorHandle.toLowerCase().includes(term) || (m.displayName || "").toLowerCase().includes(term);
  }
  async function renderBlueskyTimeline(container, api, profilePath, onNavigate) {
    container.innerHTML = `<div class="reddit-loading">Loading posts...</div>`;
    const entries = await api.fetchFiles(profilePath);
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
    const iconFiles = entries.filter(
      (e) => !e.isDirectory && (e.name === "icon.jpg" || e.name === "icon.png" || e.name === "icon.webp")
    );
    const profileAvatarUrl = iconFiles.length > 0 ? `/api/files/download?path=${encodeURIComponent(iconFiles[0].path)}` : null;
    let loadedCount = 0;
    const statusEl = container.querySelector(".reddit-loading");
    const allStubs = await mapLimit(postDirs, STUB_CONCURRENCY2, async (dir) => {
      const metadata = await fetchBlueskyPostMetadata(api, dir.path);
      loadedCount++;
      if (statusEl && loadedCount % 10 === 0) {
        statusEl.textContent = `Loading posts... ${loadedCount}/${postDirs.length}`;
      }
      return metadata ? { path: dir.path, metadata } : null;
    });
    const indexedStubs = allStubs.filter(
      (stub) => stub !== null
    );
    let sortMode = "new";
    let searchTerm = "";
    function applySortAndFilter() {
      let list = searchTerm ? indexedStubs.filter((s) => matchesBlueskySearch(s, searchTerm)) : [...indexedStubs];
      const dir = sortMode === "new" ? -1 : 1;
      list.sort(
        (a, b) => dir * (new Date(a.metadata.created).getTime() - new Date(b.metadata.created).getTime())
      );
      return list;
    }
    let filtered = applySortAndFilter();
    let renderedCount = 0;
    let isLoading = false;
    let scrollObserver = null;
    const lazyCards = [];
    let isDisposed = false;
    container.innerHTML = "";
    if (indexedStubs.length > 0) {
      const first = indexedStubs[0].metadata;
      const profileHeader = document.createElement("div");
      profileHeader.className = "bluesky-profile-header";
      let avatarHtml = "";
      if (profileAvatarUrl) {
        avatarHtml = `<img class="bluesky-profile-avatar" src="${profileAvatarUrl}" alt="" />`;
      }
      profileHeader.innerHTML = `
      ${avatarHtml}
      <div class="bluesky-profile-info">
        <h2 class="bluesky-profile-name">${escapeHtml6(first.displayName || first.authorHandle)}</h2>
        <span class="bluesky-profile-handle">@${escapeHtml6(first.authorHandle)}</span>
        <span class="bluesky-profile-count">${postDirs.length} archived posts</span>
      </div>
    `;
      container.appendChild(profileHeader);
    }
    const controls = document.createElement("div");
    controls.className = "bluesky-controls";
    controls.innerHTML = `
    <input type="text" class="timeline-search" placeholder="Search posts..." aria-label="Search posts" />
    <select class="timeline-sort" aria-label="Sort posts">
      <option value="new">Newest</option>
      <option value="old">Oldest</option>
    </select>
  `;
    container.appendChild(controls);
    const searchInput = controls.querySelector(".timeline-search");
    const sortSelect = controls.querySelector(".timeline-sort");
    const timeline = document.createElement("div");
    timeline.className = "bluesky-timeline";
    container.appendChild(timeline);
    const sentinel = document.createElement("div");
    sentinel.className = "timeline-load-sentinel";
    container.appendChild(sentinel);
    function clearRenderedCards() {
      while (lazyCards.length > 0) {
        lazyCards.pop()?.destroy();
      }
    }
    function appendPostCard(post, index) {
      const lazyCard = new LazyFeedCard({
        estimatedHeight: 320,
        initiallyRendered: index < 8,
        renderMargin: "500px",
        render: () => {
          const card = renderPostCard2(post, api, profileAvatarUrl);
          if (onNavigate) {
            card.style.cursor = "pointer";
            card.addEventListener("click", (e) => {
              const target = e.target;
              if (target.closest("a") || target.closest(".bluesky-post-image")) {
                return;
              }
              onNavigate(post.path);
            });
          }
          return card;
        }
      });
      lazyCard.mount(timeline);
      lazyCards.push(lazyCard);
    }
    async function renderNextBatch() {
      if (isDisposed || isLoading || renderedCount >= filtered.length) {
        return;
      }
      isLoading = true;
      const batch = filtered.slice(renderedCount, renderedCount + RENDER_BATCH2);
      const enriched = await mapLimit(
        batch,
        ENRICH_CONCURRENCY2,
        (stub) => enrichBlueskyPost(api, stub)
      );
      const startIndex = renderedCount;
      for (let index = 0; index < enriched.length; index += 1) {
        appendPostCard(enriched[index], startIndex + index);
      }
      renderedCount += enriched.length;
      isLoading = false;
    }
    async function resetAndRender() {
      if (isDisposed) {
        return;
      }
      filtered = applySortAndFilter();
      renderedCount = 0;
      isLoading = false;
      clearRenderedCards();
      timeline.innerHTML = "";
      if (filtered.length === 0 && searchTerm) {
        timeline.innerHTML = `<div class="timeline-no-results">No posts match "${escapeHtml6(searchTerm)}"</div>`;
        return;
      }
      await renderNextBatch();
    }
    scrollObserver = new IntersectionObserver(
      (entries2) => {
        if (entries2[0]?.isIntersecting && !isLoading && renderedCount < filtered.length) {
          void renderNextBatch();
        }
      },
      { rootMargin: "600px" }
    );
    scrollObserver.observe(sentinel);
    const handleSortChange = () => {
      sortMode = sortSelect.value;
      void resetAndRender();
    };
    sortSelect.addEventListener("change", handleSortChange);
    const handleSearchInput = debounce2(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      void resetAndRender();
    }, 300);
    searchInput.addEventListener("input", handleSearchInput);
    await resetAndRender();
    return () => {
      isDisposed = true;
      scrollObserver?.disconnect();
      clearRenderedCards();
      sortSelect.removeEventListener("change", handleSortChange);
      searchInput.removeEventListener("input", handleSearchInput);
    };
  }

  // view/src/bluesky-post-detail.ts
  function escapeHtml7(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function formatDate3(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }
  function formatRelativeTime3(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDay = Math.floor(diffMs / 864e5);
      if (diffDay > 30) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        });
      }
      if (diffDay > 0) return `${diffDay}d`;
      const diffHour = Math.floor(diffMs / 36e5);
      if (diffHour > 0) return `${diffHour}h`;
      const diffMin = Math.floor(diffMs / 6e4);
      if (diffMin > 0) return `${diffMin}m`;
      return "now";
    } catch {
      return dateStr;
    }
  }
  function formatCount2(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  function isImageFile5(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var REPLY_ICON2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var REPOST_ICON2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  var LIKE_ICON2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  function createLightbox4(images, startIndex) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "reddit-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml7(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;
      overlay.querySelector(".reddit-lightbox-close").addEventListener("click", () => {
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
    const handleKey = (e) => {
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
  async function parseReplies(api, postPath) {
    try {
      const res = await api.fetchFile(`${postPath}/Replies.json`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
  function convertReplyFacets(facets) {
    if (!facets || facets.length === 0) return void 0;
    const result = [];
    for (const facet of facets) {
      for (const feature of facet.features) {
        if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
          result.push({ type: "link", byteStart: facet.index.byteStart, byteEnd: facet.index.byteEnd, uri: feature.uri });
        } else if (feature.$type === "app.bsky.richtext.facet#mention" && feature.did) {
          result.push({ type: "mention", byteStart: facet.index.byteStart, byteEnd: facet.index.byteEnd, did: feature.did });
        } else if (feature.$type === "app.bsky.richtext.facet#tag" && feature.tag) {
          result.push({ type: "tag", byteStart: facet.index.byteStart, byteEnd: facet.index.byteEnd, tag: feature.tag });
        }
      }
    }
    return result.length > 0 ? result : void 0;
  }
  function renderReply(reply, postPath) {
    const el = document.createElement("div");
    el.className = "bluesky-reply";
    const displayName = reply.displayName || reply.author;
    const header = document.createElement("div");
    header.className = "bluesky-reply-header";
    let avatarHtml = "";
    if (reply.avatarUrl) {
      avatarHtml = `<img class="bluesky-reply-avatar" src="${escapeHtml7(reply.avatarUrl)}" alt="" />`;
    } else {
      avatarHtml = `<div class="bluesky-reply-avatar bluesky-avatar-placeholder"></div>`;
    }
    header.innerHTML = `
    ${avatarHtml}
    <span class="bluesky-display-name">${escapeHtml7(displayName)}</span>
    <span class="bluesky-handle">@${escapeHtml7(reply.author)}</span>
    <span class="bluesky-timestamp">${formatRelativeTime3(reply.createdAt)}</span>
  `;
    el.appendChild(header);
    const facets = convertReplyFacets(reply.facets);
    const textEl = renderBlueskyRichText(reply.text, facets);
    textEl.className = "bluesky-reply-text";
    el.appendChild(textEl);
    if (reply.images && reply.images.length > 0) {
      const mediaContainer = document.createElement("div");
      mediaContainer.className = "bluesky-reply-media";
      for (const filename of reply.images) {
        const src = `/api/files/download?path=${encodeURIComponent(postPath + "/reply_media/" + filename)}`;
        const img = document.createElement("img");
        img.className = "bluesky-reply-media-img";
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        mediaContainer.appendChild(img);
      }
      el.appendChild(mediaContainer);
    }
    const engagement = document.createElement("div");
    engagement.className = "bluesky-reply-engagement";
    engagement.innerHTML = `
    <span class="bluesky-metric">${REPLY_ICON2} ${formatCount2(reply.replyCount)}</span>
    <span class="bluesky-metric">${REPOST_ICON2} ${formatCount2(reply.repostCount)}</span>
    <span class="bluesky-metric">${LIKE_ICON2} ${formatCount2(reply.likeCount)}</span>
  `;
    el.appendChild(engagement);
    if (reply.replies && reply.replies.length > 0) {
      const thread = document.createElement("div");
      thread.className = "bluesky-reply-thread";
      for (const child of reply.replies) {
        thread.appendChild(renderReply(child, postPath));
      }
      el.appendChild(thread);
    }
    return el;
  }
  async function renderBlueskyPostDetail(container, api, postPath) {
    container.innerHTML = `<div class="reddit-loading">Loading post...</div>`;
    const [files, metadata, replies] = await Promise.all([
      api.fetchFiles(postPath),
      fetchBlueskyPostMetadata(api, postPath),
      parseReplies(api, postPath)
    ]);
    if (!metadata) {
      container.innerHTML = `<div class="reddit-empty"><span>Could not load post metadata</span></div>`;
      return;
    }
    const images = files.filter(
      (f) => !f.isDirectory && isImageFile5(f.name) && f.name !== "Video Thumbnail.jpg" && f.name !== "Thumbnail.jpg"
    );
    const videoFile = files.find(
      (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
    );
    const thumbnailFile = files.find(
      (f) => !f.isDirectory && f.name === "Thumbnail.jpg"
    );
    const parentPath = postPath.split("/").slice(0, -1).join("/");
    let profileAvatarUrl = null;
    try {
      const parentFiles = await api.fetchFiles(parentPath);
      const iconFile = parentFiles.find(
        (f) => !f.isDirectory && (f.name === "icon.jpg" || f.name === "icon.png" || f.name === "icon.webp")
      );
      if (iconFile) {
        profileAvatarUrl = `/api/files/download?path=${encodeURIComponent(iconFile.path)}`;
      }
    } catch {
    }
    const avatarUrl = profileAvatarUrl || metadata.avatarUrl;
    const displayName = metadata.displayName || metadata.authorHandle;
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "bluesky-detail";
    const header = document.createElement("div");
    header.className = "bluesky-detail-header";
    let avatarHtml = "";
    if (avatarUrl) {
      avatarHtml = `<img class="bluesky-detail-avatar" src="${escapeHtml7(avatarUrl)}" alt="" />`;
    }
    header.innerHTML = `
    ${avatarHtml}
    <div class="bluesky-detail-author">
      <span class="bluesky-display-name">${escapeHtml7(displayName)}</span>
      <span class="bluesky-handle">@${escapeHtml7(metadata.authorHandle)}</span>
    </div>
    ${metadata.url ? `<a class="social-open-original" href="${escapeHtml7(metadata.url)}" target="_blank" rel="noopener noreferrer" title="Open original post" style="margin-left:auto;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      Original
    </a>` : ""}
  `;
    wrapper.appendChild(header);
    const textEl = renderBlueskyRichText(metadata.text, metadata.facets);
    textEl.className = "bluesky-detail-text";
    wrapper.appendChild(textEl);
    if (images.length > 0) {
      const imageGrid = document.createElement("div");
      const count = images.length;
      imageGrid.className = `bluesky-post-images bluesky-images-${Math.min(count, 4)}`;
      const imageUrls = images.map((img) => ({
        src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
        name: img.name
      }));
      images.forEach((img, i) => {
        const imgEl = document.createElement("img");
        imgEl.className = "bluesky-post-image";
        imgEl.src = imageUrls[i].src;
        imgEl.alt = img.name;
        imgEl.loading = "lazy";
        imgEl.addEventListener("click", () => {
          document.body.appendChild(createLightbox4(imageUrls, i));
        });
        imageGrid.appendChild(imgEl);
      });
      wrapper.appendChild(imageGrid);
    }
    if (videoFile) {
      const videoEl = document.createElement("video");
      videoEl.className = "twitter-video";
      videoEl.src = `/api/files/download?path=${encodeURIComponent(videoFile.path)}`;
      videoEl.controls = true;
      videoEl.preload = "metadata";
      if (videoFile.name.includes(".gif.")) {
        videoEl.autoplay = true;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
      }
      wrapper.appendChild(videoEl);
    }
    if (metadata.externalLink && metadata.externalLink.uri) {
      const linkCard = document.createElement("a");
      linkCard.className = "bluesky-external-card";
      linkCard.href = metadata.externalLink.uri;
      linkCard.target = "_blank";
      linkCard.rel = "noopener noreferrer";
      let thumbHtml = "";
      if (thumbnailFile) {
        const thumbSrc = `/api/files/download?path=${encodeURIComponent(thumbnailFile.path)}`;
        thumbHtml = `<img class="bluesky-external-thumb" src="${thumbSrc}" alt="" />`;
      } else if (metadata.externalLink.thumb) {
        thumbHtml = `<img class="bluesky-external-thumb" src="${escapeHtml7(metadata.externalLink.thumb)}" alt="" />`;
      }
      let domain = "";
      try {
        domain = new URL(metadata.externalLink.uri).hostname;
      } catch {
        domain = metadata.externalLink.uri;
      }
      linkCard.innerHTML = `
      ${thumbHtml}
      <div class="bluesky-external-info">
        <span class="bluesky-external-domain">${escapeHtml7(domain)}</span>
        <span class="bluesky-external-title">${escapeHtml7(metadata.externalLink.title)}</span>
        ${metadata.externalLink.description ? `<span class="bluesky-external-desc">${escapeHtml7(metadata.externalLink.description)}</span>` : ""}
      </div>
    `;
      wrapper.appendChild(linkCard);
    }
    if (metadata.quotePost && metadata.quotePost.authorHandle) {
      const quoteCard = document.createElement("div");
      quoteCard.className = "bluesky-quote-card";
      const quoteDisplayName = metadata.quotePost.displayName || metadata.quotePost.authorHandle;
      quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml7(quoteDisplayName)}</span>
        <span class="bluesky-handle">@${escapeHtml7(metadata.quotePost.authorHandle)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml7(metadata.quotePost.text).replace(/\n/g, "<br>")}</div>
    `;
      wrapper.appendChild(quoteCard);
    }
    const stats = document.createElement("div");
    stats.className = "bluesky-detail-stats";
    stats.innerHTML = `
    <span class="bluesky-detail-date">${formatDate3(metadata.created)}</span>
    <div class="bluesky-detail-counts">
      <span class="bluesky-detail-count">${REPLY_ICON2} <strong>${formatCount2(metadata.replyCount)}</strong> replies</span>
      <span class="bluesky-detail-count">${REPOST_ICON2} <strong>${formatCount2(metadata.repostCount)}</strong> reposts</span>
      <span class="bluesky-detail-count">${LIKE_ICON2} <strong>${formatCount2(metadata.likeCount)}</strong> likes</span>
    </div>
  `;
    wrapper.appendChild(stats);
    if (replies.length > 0) {
      const repliesSection = document.createElement("div");
      repliesSection.className = "bluesky-replies-section";
      const heading = document.createElement("div");
      heading.className = "bluesky-replies-heading";
      heading.textContent = `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`;
      repliesSection.appendChild(heading);
      for (const reply of replies) {
        repliesSection.appendChild(renderReply(reply, postPath));
      }
      wrapper.appendChild(repliesSection);
    }
    container.appendChild(wrapper);
  }

  // view/src/twitter-timeline.ts
  function escapeHtml8(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function formatRelativeTime4(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDay = Math.floor(diffMs / 864e5);
      if (diffDay > 30) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : void 0
        });
      }
      if (diffDay > 0) return `${diffDay}d`;
      const diffHour = Math.floor(diffMs / 36e5);
      if (diffHour > 0) return `${diffHour}h`;
      const diffMin = Math.floor(diffMs / 6e4);
      if (diffMin > 0) return `${diffMin}m`;
      return "now";
    } catch {
      return dateStr;
    }
  }
  function formatCount3(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  function isImageFile6(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var REPLY_ICON3 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var RETWEET_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  var LIKE_ICON3 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  var VERIFIED_ICON = `<svg width="14" height="14" viewBox="0 0 22 22" fill="currentColor"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.587.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.272 1.893.143.634-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.899.584-.274 1.083-.705 1.437-1.245.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`;
  function createLightbox5(images, startIndex) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "reddit-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml8(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;
      overlay.querySelector(".reddit-lightbox-close").addEventListener("click", () => {
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
    const handleKey = (e) => {
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
  function renderTweetText(metadata) {
    const el = document.createElement("div");
    el.className = "bluesky-post-text";
    let html = escapeHtml8(metadata.text);
    if (metadata.links) {
      for (const link of metadata.links) {
        html = html.replace(
          new RegExp(`https?://t\\.co/\\w+`),
          `<a class="twitter-link" href="${escapeHtml8(link.expanded)}" target="_blank" rel="noopener noreferrer">${escapeHtml8(link.display)}</a>`
        );
      }
    }
    html = html.replace(
      /@(\w{1,15})/g,
      `<a class="twitter-mention" href="https://x.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>`
    );
    html = html.replace(
      /#(\w+)/g,
      `<span class="twitter-hashtag">#$1</span>`
    );
    html = html.replace(/\n/g, "<br>");
    el.innerHTML = html;
    return el;
  }
  function renderPostCard3(post, api, profileAvatarUrl) {
    const card = document.createElement("div");
    card.className = "bluesky-post-card";
    const meta = post.metadata;
    const avatarUrl = profileAvatarUrl || meta.profileImageUrl;
    const header = document.createElement("div");
    header.className = "bluesky-post-header";
    let avatarHtml = "";
    if (avatarUrl) {
      avatarHtml = `<img class="bluesky-avatar" src="${escapeHtml8(avatarUrl)}" alt="" />`;
    } else {
      avatarHtml = `<div class="bluesky-avatar bluesky-avatar-placeholder"></div>`;
    }
    const verifiedHtml = meta.verified ? `<span class="twitter-verified-sm">${VERIFIED_ICON}</span>` : "";
    header.innerHTML = `
    ${avatarHtml}
    <div class="bluesky-post-author-info">
      <span class="bluesky-display-name">${escapeHtml8(meta.name)} ${verifiedHtml}</span>
      <span class="bluesky-handle">@${escapeHtml8(meta.screenName)}</span>
    </div>
    <span class="bluesky-timestamp">${formatRelativeTime4(meta.created)}</span>
  `;
    card.appendChild(header);
    const textEl = renderTweetText(meta);
    card.appendChild(textEl);
    if (post.images.length > 0) {
      const imageGrid = document.createElement("div");
      const count = post.images.length;
      imageGrid.className = `bluesky-post-images bluesky-images-${Math.min(count, 4)}`;
      const imageUrls = post.images.map((img) => ({
        src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
        name: img.name
      }));
      post.images.forEach((img, i) => {
        const imgEl = document.createElement("img");
        imgEl.className = "bluesky-post-image";
        imgEl.src = imageUrls[i].src;
        imgEl.alt = img.name;
        imgEl.loading = "lazy";
        imgEl.addEventListener("click", () => {
          document.body.appendChild(createLightbox5(imageUrls, i));
        });
        imageGrid.appendChild(imgEl);
      });
      card.appendChild(imageGrid);
    }
    if (post.videoFile) {
      const videoEl = document.createElement("video");
      videoEl.className = "twitter-video";
      videoEl.src = `/api/files/download?path=${encodeURIComponent(post.videoFile.path)}`;
      videoEl.controls = true;
      videoEl.preload = "metadata";
      videoEl.style.cssText = "width:100%;max-height:500px;border-radius:0.75rem;margin-top:0.75rem;background:var(--muted);";
      if (post.videoFile.name.includes(".gif.")) {
        videoEl.autoplay = true;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
      }
      card.appendChild(videoEl);
    }
    if (meta.quoteTweet && meta.quoteTweet.screenName) {
      const quoteCard = document.createElement("div");
      quoteCard.className = "bluesky-quote-card";
      quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml8(meta.quoteTweet.name)}</span>
        <span class="bluesky-handle">@${escapeHtml8(meta.quoteTweet.screenName)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml8(meta.quoteTweet.text).replace(/\n/g, "<br>")}</div>
    `;
      card.appendChild(quoteCard);
    }
    const engagement = document.createElement("div");
    engagement.className = "bluesky-engagement";
    engagement.innerHTML = `
    <span class="bluesky-metric">${REPLY_ICON3} ${formatCount3(meta.replyCount)}</span>
    <span class="bluesky-metric bluesky-metric-repost">${RETWEET_ICON} ${formatCount3(meta.retweetCount)}</span>
    <span class="bluesky-metric bluesky-metric-like">${LIKE_ICON3} ${formatCount3(meta.favoriteCount)}</span>
  `;
    card.appendChild(engagement);
    return card;
  }
  var BATCH_SIZE = 20;
  function debounce3(fn, ms) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }
  async function enrichTwitterPost(api, stub) {
    const files = await api.fetchFiles(stub.path);
    const images = files.filter(
      (f) => !f.isDirectory && isImageFile6(f.name) && f.name !== "Video Thumbnail.jpg"
    );
    const videoFile = files.find(
      (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
    );
    return { path: stub.path, metadata: stub.metadata, images, videoFile };
  }
  function matchesTwitterSearch(stub, term) {
    const m = stub.metadata;
    return m.text.toLowerCase().includes(term) || m.screenName.toLowerCase().includes(term) || m.name.toLowerCase().includes(term) || (m.hashtags || []).some((h) => h.toLowerCase().includes(term));
  }
  async function renderTwitterTimeline(container, api, profilePath, onNavigate) {
    container.innerHTML = `<div class="reddit-loading">Loading timeline...</div>`;
    const entries = await api.fetchFiles(profilePath);
    const postDirs = entries.filter((e) => e.isDirectory);
    if (postDirs.length === 0) {
      container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">&#9729;</div>
        <span>No tweets archived yet</span>
      </div>
    `;
      return;
    }
    const iconFiles = entries.filter(
      (e) => !e.isDirectory && (e.name === "icon.jpg" || e.name === "icon.png" || e.name === "icon.webp")
    );
    const profileAvatarUrl = iconFiles.length > 0 ? `/api/files/download?path=${encodeURIComponent(iconFiles[0].path)}` : null;
    const stubs = (await Promise.all(
      postDirs.map(async (dir) => {
        const metadata = await fetchTwitterPostMetadata(api, dir.path);
        return metadata ? { path: dir.path, metadata } : null;
      })
    )).filter((s) => s !== null);
    let sortMode = "new";
    let searchTerm = "";
    function applySortAndFilter() {
      let list = searchTerm ? stubs.filter((s) => matchesTwitterSearch(s, searchTerm)) : [...stubs];
      if (sortMode === "new") {
        list.sort(
          (a, b) => new Date(b.metadata.created).getTime() - new Date(a.metadata.created).getTime()
        );
      } else {
        list.sort((a, b) => b.metadata.favoriteCount - a.metadata.favoriteCount);
      }
      return list;
    }
    let filtered = applySortAndFilter();
    let renderedCount = 0;
    let isLoading = false;
    let scrollObserver = null;
    const lazyCards = [];
    container.innerHTML = "";
    if (stubs.length > 0) {
      const first = stubs[0].metadata;
      const profileHeader = document.createElement("div");
      profileHeader.className = "bluesky-profile-header";
      let avatarHtml = "";
      if (profileAvatarUrl) {
        avatarHtml = `<img class="bluesky-profile-avatar" src="${profileAvatarUrl}" alt="" />`;
      }
      const verifiedHtml = first.verified ? `<span class="twitter-verified">${VERIFIED_ICON}</span>` : "";
      profileHeader.innerHTML = `
      ${avatarHtml}
      <div class="bluesky-profile-info">
        <h2 class="bluesky-profile-name">${escapeHtml8(first.name)} ${verifiedHtml}</h2>
        <span class="bluesky-profile-handle">@${escapeHtml8(first.screenName)}</span>
        <span class="bluesky-profile-count">${stubs.length} archived tweets</span>
      </div>
    `;
      container.appendChild(profileHeader);
    }
    const controls = document.createElement("div");
    controls.className = "bluesky-controls";
    controls.innerHTML = `
    <input type="text" class="timeline-search" placeholder="Search tweets..." aria-label="Search tweets" />
    <select class="timeline-sort" aria-label="Sort tweets">
      <option value="new">Newest</option>
      <option value="liked">Most Liked</option>
    </select>
  `;
    container.appendChild(controls);
    const searchInput = controls.querySelector(".timeline-search");
    const sortSelect = controls.querySelector(".timeline-sort");
    const timeline = document.createElement("div");
    timeline.className = "bluesky-timeline";
    container.appendChild(timeline);
    const sentinel = document.createElement("div");
    sentinel.className = "timeline-load-sentinel";
    container.appendChild(sentinel);
    function clearRenderedCards() {
      while (lazyCards.length > 0) {
        lazyCards.pop()?.destroy();
      }
    }
    function appendPostCard(post, index) {
      const lazyCard = new LazyFeedCard({
        estimatedHeight: 320,
        initiallyRendered: index < 8,
        renderMargin: "500px",
        render: () => {
          const card = renderPostCard3(post, api, profileAvatarUrl);
          if (onNavigate) {
            card.style.cursor = "pointer";
            card.addEventListener("click", (e) => {
              const target = e.target;
              if (target.closest("a") || target.closest(".bluesky-post-image")) {
                return;
              }
              onNavigate(post.path);
            });
          }
          return card;
        }
      });
      lazyCard.mount(timeline);
      lazyCards.push(lazyCard);
    }
    async function renderNextBatch() {
      if (isLoading || renderedCount >= filtered.length) {
        return;
      }
      isLoading = true;
      const batch = filtered.slice(renderedCount, renderedCount + BATCH_SIZE);
      const enriched = await Promise.all(
        batch.map((stub) => enrichTwitterPost(api, stub))
      );
      const startIndex = renderedCount;
      for (let index = 0; index < enriched.length; index += 1) {
        appendPostCard(enriched[index], startIndex + index);
      }
      renderedCount += enriched.length;
      isLoading = false;
    }
    async function resetAndRender() {
      filtered = applySortAndFilter();
      renderedCount = 0;
      isLoading = false;
      clearRenderedCards();
      timeline.innerHTML = "";
      if (filtered.length === 0 && searchTerm) {
        timeline.innerHTML = `<div class="timeline-no-results">No tweets match "${escapeHtml8(searchTerm)}"</div>`;
        return;
      }
      await renderNextBatch();
    }
    scrollObserver = new IntersectionObserver(
      (entries2) => {
        if (entries2[0]?.isIntersecting && !isLoading && renderedCount < filtered.length) {
          void renderNextBatch();
        }
      },
      { rootMargin: "600px" }
    );
    scrollObserver.observe(sentinel);
    const handleSortChange = () => {
      sortMode = sortSelect.value;
      resetAndRender();
    };
    sortSelect.addEventListener("change", handleSortChange);
    const handleSearchInput = debounce3(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      resetAndRender();
    }, 300);
    searchInput.addEventListener(
      "input",
      handleSearchInput
    );
    await resetAndRender();
    return () => {
      scrollObserver?.disconnect();
      clearRenderedCards();
      sortSelect.removeEventListener("change", handleSortChange);
      searchInput.removeEventListener("input", handleSearchInput);
    };
  }

  // view/src/twitter-post-detail.ts
  function escapeHtml9(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function formatDate4(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }
  function formatCount4(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  function isImageFile7(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var REPLY_ICON4 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var RETWEET_ICON2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  var LIKE_ICON4 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  var VERIFIED_ICON2 = `<svg width="16" height="16" viewBox="0 0 22 22" fill="currentColor"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.587.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.272 1.893.143.634-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.899.584-.274 1.083-.705 1.437-1.245.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`;
  function createLightbox6(images, startIndex) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "reddit-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml9(images[currentIndex].name)}" />
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-next" aria-label="Next">&#8250;</button>` : ""}
      ${images.length > 1 ? `<div class="reddit-lightbox-counter">${currentIndex + 1} / ${images.length}</div>` : ""}
    `;
      overlay.querySelector(".reddit-lightbox-close").addEventListener("click", () => {
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
    const handleKey = (e) => {
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
  function renderTwitterRichText(metadata) {
    const el = document.createElement("div");
    let html = escapeHtml9(metadata.text);
    if (metadata.links) {
      for (const link of metadata.links) {
        const escapedDisplay = escapeHtml9(link.display);
        const escapedExpanded = escapeHtml9(link.expanded);
        html = html.replace(
          new RegExp(`https?://t\\.co/\\w+`),
          `<a class="twitter-link" href="${escapedExpanded}" target="_blank" rel="noopener noreferrer">${escapedDisplay}</a>`
        );
      }
    }
    html = html.replace(
      /@(\w{1,15})/g,
      `<a class="twitter-mention" href="https://x.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>`
    );
    html = html.replace(
      /#(\w+)/g,
      `<span class="twitter-hashtag">#$1</span>`
    );
    html = html.replace(/\n/g, "<br>");
    el.innerHTML = html;
    return el;
  }
  async function renderTwitterPostDetail(container, api, postPath) {
    container.innerHTML = `<div class="reddit-loading">Loading tweet...</div>`;
    const [files, metadata] = await Promise.all([
      api.fetchFiles(postPath),
      fetchTwitterPostMetadata(api, postPath)
    ]);
    if (!metadata) {
      container.innerHTML = `<div class="reddit-empty"><span>Could not load tweet metadata</span></div>`;
      return;
    }
    const images = files.filter(
      (f) => !f.isDirectory && isImageFile7(f.name) && f.name !== "Video Thumbnail.jpg"
    );
    const videoFile = files.find(
      (f) => !f.isDirectory && /\.(mp4|webm)$/i.test(f.name)
    );
    const parentPath = postPath.split("/").slice(0, -1).join("/");
    let profileAvatarUrl = null;
    try {
      const parentFiles = await api.fetchFiles(parentPath);
      const iconFile = parentFiles.find(
        (f) => !f.isDirectory && (f.name === "icon.jpg" || f.name === "icon.png" || f.name === "icon.webp")
      );
      if (iconFile) {
        profileAvatarUrl = `/api/files/download?path=${encodeURIComponent(iconFile.path)}`;
      }
    } catch {
    }
    const avatarUrl = profileAvatarUrl || metadata.profileImageUrl;
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "twitter-detail";
    const header = document.createElement("div");
    header.className = "twitter-detail-header";
    let avatarHtml = "";
    if (avatarUrl) {
      avatarHtml = `<img class="twitter-detail-avatar" src="${escapeHtml9(avatarUrl)}" alt="" />`;
    }
    const verifiedHtml = metadata.verified ? `<span class="twitter-verified">${VERIFIED_ICON2}</span>` : "";
    header.innerHTML = `
    ${avatarHtml}
    <div class="twitter-detail-author">
      <span class="twitter-display-name">${escapeHtml9(metadata.name)} ${verifiedHtml}</span>
      <span class="twitter-handle">@${escapeHtml9(metadata.screenName)}</span>
    </div>
    ${metadata.url ? `<a class="social-open-original" href="${escapeHtml9(metadata.url)}" target="_blank" rel="noopener noreferrer" title="Open original post" style="margin-left:auto;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      Original
    </a>` : ""}
  `;
    wrapper.appendChild(header);
    if (metadata.replyTo && metadata.replyTo.screenName) {
      const replyIndicator = document.createElement("div");
      replyIndicator.className = "twitter-reply-indicator";
      replyIndicator.innerHTML = `Replying to <a class="twitter-mention" href="https://x.com/${escapeHtml9(metadata.replyTo.screenName)}" target="_blank" rel="noopener noreferrer">@${escapeHtml9(metadata.replyTo.screenName)}</a>`;
      wrapper.appendChild(replyIndicator);
    }
    const textEl = renderTwitterRichText(metadata);
    textEl.className = "twitter-detail-text";
    wrapper.appendChild(textEl);
    if (images.length > 0) {
      const imageGrid = document.createElement("div");
      const count = images.length;
      imageGrid.className = `bluesky-post-images bluesky-images-${Math.min(count, 4)}`;
      const imageUrls = images.map((img) => ({
        src: `/api/files/download?path=${encodeURIComponent(img.path)}`,
        name: img.name
      }));
      images.forEach((img, i) => {
        const imgEl = document.createElement("img");
        imgEl.className = "bluesky-post-image";
        imgEl.src = imageUrls[i].src;
        imgEl.alt = img.name;
        imgEl.loading = "lazy";
        imgEl.addEventListener("click", () => {
          document.body.appendChild(createLightbox6(imageUrls, i));
        });
        imageGrid.appendChild(imgEl);
      });
      wrapper.appendChild(imageGrid);
    }
    if (videoFile) {
      const videoEl = document.createElement("video");
      videoEl.className = "twitter-video";
      videoEl.src = `/api/files/download?path=${encodeURIComponent(videoFile.path)}`;
      videoEl.controls = true;
      videoEl.preload = "metadata";
      if (videoFile.name.includes(".gif.")) {
        videoEl.autoplay = true;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
      }
      wrapper.appendChild(videoEl);
    }
    if (metadata.quoteTweet && metadata.quoteTweet.screenName) {
      const quoteCard = document.createElement("div");
      quoteCard.className = "bluesky-quote-card";
      quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml9(metadata.quoteTweet.name)}</span>
        <span class="bluesky-handle">@${escapeHtml9(metadata.quoteTweet.screenName)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml9(metadata.quoteTweet.text).replace(/\n/g, "<br>")}</div>
    `;
      wrapper.appendChild(quoteCard);
    }
    const stats = document.createElement("div");
    stats.className = "twitter-detail-stats";
    stats.innerHTML = `
    <span class="bluesky-detail-date">${formatDate4(metadata.created)}</span>
    <div class="bluesky-detail-counts">
      <span class="bluesky-detail-count">${REPLY_ICON4} <strong>${formatCount4(metadata.replyCount)}</strong> replies</span>
      <span class="bluesky-detail-count">${RETWEET_ICON2} <strong>${formatCount4(metadata.retweetCount)}</strong> retweets</span>
      <span class="bluesky-detail-count">${LIKE_ICON4} <strong>${formatCount4(metadata.favoriteCount)}</strong> likes</span>
    </div>
  `;
    wrapper.appendChild(stats);
    container.appendChild(wrapper);
  }

  // view/src/cached-api.ts
  function shouldCacheFile(path) {
    return /\.(json|nfo|xml|txt)$/i.test(path);
  }
  var SocialViewCache = class {
    constructor() {
      __publicField(this, "directoryCache", /* @__PURE__ */ new Map());
      __publicField(this, "fileCache", /* @__PURE__ */ new Map());
    }
    wrap(api) {
      return {
        ...api,
        fetchFiles: (path) => this.fetchFiles(api, path),
        fetchFile: (path) => this.fetchFile(api, path)
      };
    }
    clear() {
      this.directoryCache.clear();
      this.fileCache.clear();
    }
    fetchFiles(api, path) {
      const cached = this.directoryCache.get(path);
      if (cached) {
        return cached;
      }
      const pending = api.fetchFiles(path);
      this.directoryCache.set(path, pending);
      return pending;
    }
    async fetchFile(api, path) {
      if (!shouldCacheFile(path)) {
        return api.fetchFile(path);
      }
      const cached = this.fileCache.get(path);
      const payloadPromise = cached ?? api.fetchFile(path).then(async (response) => ({
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        body: response.ok ? await response.arrayBuffer() : null
      }));
      if (!cached) {
        this.fileCache.set(path, payloadPromise);
      }
      const payload = await payloadPromise;
      return new Response(payload.body ? payload.body.slice(0) : null, {
        status: payload.status,
        statusText: payload.statusText,
        headers: payload.headers
      });
    }
  };

  // view/src/reddit-app.ts
  var METADATA_FILES2 = /* @__PURE__ */ new Set([
    "icon.jpg",
    "icon.png",
    "icon.webp",
    ".no-icon"
  ]);
  async function detectViewInfo(api, dirPath, entries) {
    const dirs = entries.filter((e) => e.isDirectory);
    const contentFiles = entries.filter(
      (e) => !e.isDirectory && !METADATA_FILES2.has(e.name)
    );
    const hasNfo = contentFiles.some((f) => f.name === "Post.nfo");
    const hasComments = contentFiles.some((f) => f.name === "Comments.json");
    const hasMedia = contentFiles.some(
      (f) => /\.(jpe?g|png|gif|webp|bmp|avif|mp4|webm|mov|avi|mkv)$/i.test(f.name)
    );
    if (hasNfo || hasComments || hasMedia) {
      const platform = hasNfo ? await detectNfoPlatform(api, dirPath) || "reddit" : "reddit";
      return { mode: "post", platform };
    }
    if (dirs.length === 0) {
      return { mode: "root", platform: "unknown" };
    }
    try {
      const firstChild = dirs[0];
      const childEntries = await api.fetchFiles(firstChild.path);
      const childContentFiles = childEntries.filter(
        (e) => !e.isDirectory && !METADATA_FILES2.has(e.name)
      );
      const childHasNfo = childContentFiles.some(
        (e) => e.name === "Post.nfo"
      );
      const childHasMedia = childContentFiles.some(
        (e) => /\.(jpe?g|png|gif|webp|bmp|avif|mp4|webm|mov|avi|mkv)$/i.test(e.name)
      );
      if (childHasNfo || childHasMedia) {
        const platform = childHasNfo ? await detectNfoPlatform(api, firstChild.path) || "reddit" : "reddit";
        return { mode: "post-list", platform };
      }
      if (childContentFiles.length === 0) {
        return { mode: "root", platform: "unknown" };
      }
      return { mode: "post-list", platform: "unknown" };
    } catch {
      return { mode: "root", platform: "unknown" };
    }
  }
  function renderBreadcrumb(currentPath, trackedDirectory, navigate) {
    const breadcrumb = document.createElement("div");
    breadcrumb.className = "reddit-breadcrumb";
    const tracked = trackedDirectory.replace(/\/+$/, "");
    const current = currentPath.replace(/\/+$/, "");
    const rootLink = document.createElement("span");
    rootLink.className = "reddit-breadcrumb-link";
    rootLink.textContent = tracked;
    rootLink.addEventListener("click", () => navigate(tracked));
    breadcrumb.appendChild(rootLink);
    if (current !== tracked) {
      const relative = current.startsWith(tracked + "/") ? current.slice(tracked.length + 1) : "";
      const parts = relative.split("/").filter(Boolean);
      parts.forEach((part, i) => {
        const sep = document.createElement("span");
        sep.className = "reddit-breadcrumb-sep";
        sep.textContent = "/";
        breadcrumb.appendChild(sep);
        if (i < parts.length - 1) {
          const link = document.createElement("span");
          link.className = "reddit-breadcrumb-link";
          link.textContent = part;
          const linkPath = tracked + "/" + parts.slice(0, i + 1).join("/");
          link.addEventListener("click", () => navigate(linkPath));
          breadcrumb.appendChild(link);
        } else {
          const span = document.createElement("span");
          span.className = "reddit-breadcrumb-current";
          span.textContent = part;
          breadcrumb.appendChild(span);
        }
      });
    }
    return breadcrumb;
  }
  function findScrollParent(el) {
    let node = el.parentElement;
    while (node) {
      const overflow = getComputedStyle(node).overflowY;
      if (overflow === "auto" || overflow === "scroll") return node;
      node = node.parentElement;
    }
    return document.documentElement;
  }
  var RedditApp = class {
    constructor(container, api) {
      __publicField(this, "container");
      __publicField(this, "api");
      __publicField(this, "contentEl");
      __publicField(this, "viewCleanup");
      __publicField(this, "cache", new SocialViewCache());
      /** When set, we're showing an inline post detail over the hidden timeline */
      __publicField(this, "inlinePost", null);
      /** The timeline container (hidden when viewing a post) */
      __publicField(this, "timelineEl", null);
      /** The breadcrumb for the timeline view */
      __publicField(this, "timelineBreadcrumb", null);
      /** Container for the inline post detail */
      __publicField(this, "postOverlay", null);
      /** Saved scroll position from the timeline (survives clearing inlinePost) */
      __publicField(this, "savedScrollTop", 0);
      /** The directory path the current view was rendered for */
      __publicField(this, "currentDirPath", null);
      /** Bound popstate handler */
      __publicField(this, "popstateHandler", null);
      this.container = container;
      this.api = this.cache.wrap(api);
      this.container.innerHTML = "";
      this.container.classList.add("reddit-view");
      injectStyles(this.container);
      this.contentEl = document.createElement("div");
      this.container.appendChild(this.contentEl);
      this.popstateHandler = () => {
        if (this.inlinePost) {
          this.inlinePost = null;
          this.render();
        }
      };
      window.addEventListener("popstate", this.popstateHandler);
      this.render();
    }
    /** Top-level render — checks if we're in inline post mode or directory mode */
    async render() {
      if (this.inlinePost) {
        await this.renderInlinePost(this.inlinePost);
      } else {
        await this.restoreOrRenderDirectory();
      }
    }
    /** Either restore a cached timeline or render the directory from scratch */
    async restoreOrRenderDirectory() {
      if (this.postOverlay) {
        this.postOverlay.remove();
        this.postOverlay = null;
      }
      if (this.timelineEl) {
        this.timelineEl.style.display = "";
        if (this.timelineBreadcrumb) {
          this.timelineBreadcrumb.style.display = "";
        }
        const scrollParent = findScrollParent(this.contentEl);
        const scrollTarget = this.savedScrollTop;
        requestAnimationFrame(() => {
          scrollParent.scrollTop = scrollTarget;
        });
        return;
      }
      await this.renderDirectory();
    }
    /** Render the current directory view (root / post-list / post) */
    async renderDirectory() {
      this.viewCleanup?.();
      this.viewCleanup = void 0;
      this.timelineEl = null;
      this.timelineBreadcrumb = null;
      this.contentEl.innerHTML = "";
      const { currentPath, trackedDirectory } = this.api;
      this.currentDirPath = currentPath.replace(/\/+$/, "");
      const tracked = trackedDirectory.replace(/\/+$/, "");
      const current = currentPath.replace(/\/+$/, "");
      const isRoot = current === tracked;
      let breadcrumbEl = null;
      if (!isRoot) {
        breadcrumbEl = renderBreadcrumb(
          currentPath,
          trackedDirectory,
          (path) => this.api.navigate(path)
        );
        this.contentEl.appendChild(breadcrumbEl);
      }
      const viewContainer = document.createElement("div");
      viewContainer.innerHTML = `<div class="reddit-loading">Loading...</div>`;
      this.contentEl.appendChild(viewContainer);
      const entries = await this.api.fetchFiles(currentPath);
      const viewInfo = await detectViewInfo(this.api, currentPath, entries);
      viewContainer.innerHTML = "";
      switch (viewInfo.mode) {
        case "root":
          await renderSubredditGrid(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          );
          break;
        case "post-list": {
          const onPostClick = (path) => this.pushPost(path);
          let cleanup;
          if (viewInfo.platform === "bluesky") {
            cleanup = await renderBlueskyTimeline(
              viewContainer,
              this.api,
              currentPath,
              onPostClick
            );
          } else if (viewInfo.platform === "twitter") {
            cleanup = await renderTwitterTimeline(
              viewContainer,
              this.api,
              currentPath,
              onPostClick
            );
          } else {
            cleanup = await renderRedditTimeline(
              viewContainer,
              this.api,
              currentPath,
              onPostClick
            );
          }
          this.viewCleanup = cleanup;
          this.timelineEl = viewContainer;
          this.timelineBreadcrumb = breadcrumbEl;
          break;
        }
        case "post":
          if (viewInfo.platform === "bluesky") {
            await renderBlueskyPostDetail(viewContainer, this.api, currentPath);
          } else if (viewInfo.platform === "twitter") {
            await renderTwitterPostDetail(viewContainer, this.api, currentPath);
          } else {
            await renderPostDetail(viewContainer, this.api, currentPath);
          }
          break;
      }
    }
    /** Push into inline post mode — hides the timeline, shows the post */
    pushPost(postPath) {
      const scrollParent = findScrollParent(this.contentEl);
      this.savedScrollTop = scrollParent.scrollTop;
      this.inlinePost = {
        postPath,
        scrollTop: this.savedScrollTop
      };
      history.pushState({ socialInlinePost: true }, "");
      this.render();
    }
    /** Render the inline post detail over the hidden timeline */
    async renderInlinePost(state) {
      const { postPath } = state;
      if (this.timelineEl) {
        this.timelineEl.style.display = "none";
      }
      if (this.timelineBreadcrumb) {
        this.timelineBreadcrumb.style.display = "none";
      }
      if (this.postOverlay) {
        this.postOverlay.remove();
      }
      this.postOverlay = document.createElement("div");
      const { trackedDirectory } = this.api;
      const breadcrumb = renderBreadcrumb(
        postPath,
        trackedDirectory,
        (path) => {
          this.inlinePost = null;
          history.back();
        }
      );
      this.postOverlay.appendChild(breadcrumb);
      const postContainer = document.createElement("div");
      this.postOverlay.appendChild(postContainer);
      this.contentEl.appendChild(this.postOverlay);
      const scrollParent = findScrollParent(this.contentEl);
      scrollParent.scrollTop = 0;
      const entries = await this.api.fetchFiles(postPath);
      const viewInfo = await detectViewInfo(this.api, postPath, entries);
      if (viewInfo.mode === "post") {
        if (viewInfo.platform === "bluesky") {
          await renderBlueskyPostDetail(postContainer, this.api, postPath);
        } else if (viewInfo.platform === "twitter") {
          await renderTwitterPostDetail(postContainer, this.api, postPath);
        } else {
          await renderPostDetail(postContainer, this.api, postPath);
        }
      }
    }
    onPathChange(newPath, api) {
      this.api = this.cache.wrap(api);
      const newDir = newPath.replace(/\/+$/, "");
      if (newDir === this.currentDirPath) {
        return;
      }
      this.inlinePost = null;
      this.timelineEl = null;
      this.timelineBreadcrumb = null;
      if (this.postOverlay) {
        this.postOverlay.remove();
        this.postOverlay = null;
      }
      this.renderDirectory();
    }
    destroy() {
      this.viewCleanup?.();
      this.viewCleanup = void 0;
      this.inlinePost = null;
      this.timelineEl = null;
      this.timelineBreadcrumb = null;
      if (this.postOverlay) {
        this.postOverlay.remove();
        this.postOverlay = null;
      }
      if (this.popstateHandler) {
        window.removeEventListener("popstate", this.popstateHandler);
        this.popstateHandler = null;
      }
      this.cache.clear();
      this.container.classList.remove("reddit-view");
      this.container.innerHTML = "";
    }
  };

  // view/src/index.ts
  var app = null;
  window.__archiver_register_view?.("reddit-browser", {
    render(container, api) {
      app = new RedditApp(container, api);
    },
    destroy() {
      app?.destroy();
      app = null;
    },
    onPathChange(newPath, api) {
      app?.onPathChange(newPath, api);
    }
  });
})();
