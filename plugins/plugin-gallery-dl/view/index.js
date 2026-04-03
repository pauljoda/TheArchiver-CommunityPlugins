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

.reddit-card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: var(--muted);
}

.reddit-card-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 2rem;
}

.reddit-card-thumb-placeholder-media {
  background:
    radial-gradient(circle at top, color-mix(in srgb, var(--primary) 14%, transparent), transparent 58%),
    var(--muted);
}

.reddit-card-thumb-placeholder-icon {
  opacity: 0.72;
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

.reddit-comments-heading {
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

.reddit-comment {
  position: relative;
  padding-left: 1rem;
  margin-bottom: 0.75rem;
}

.reddit-comment-thread {
  border-left: 2px solid var(--border);
  padding-left: 1rem;
  margin-left: 0.5rem;
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
  aspect-ratio: 16/10;
  overflow: hidden;
  background: var(--muted);
}

.reddit-card-media-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--card) 65%, transparent), transparent 38%),
    var(--muted);
}

.reddit-card-thumb-media-fit {
  object-fit: contain;
  padding: 0.625rem;
}

.reddit-card-thumb-wrap-video .reddit-card-thumb,
.reddit-card-thumb-wrap-video .reddit-card-thumb-placeholder {
  position: absolute;
  inset: 0;
}

.reddit-card-thumb-poster {
  transition: opacity 0.18s ease;
}

.reddit-card-thumb-video {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.18s ease;
  background: transparent;
}

.reddit-card-thumb-wrap-video.is-ready .reddit-card-thumb-video {
  opacity: 1;
}

.reddit-card-thumb-wrap-video.is-ready .reddit-card-thumb-poster {
  opacity: 0;
}

.reddit-card-video-skeleton {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.5rem;
  border-radius: 999px;
  background: oklch(0 0 0 / 0.54);
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  pointer-events: none;
}

.reddit-card-video-skeleton-label {
  opacity: 0.95;
}

.reddit-card-thumb-wrap-video.is-ready .reddit-card-video-skeleton {
  opacity: 0;
  transition: opacity 0.18s ease;
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
  height: 100%;
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

.reddit-card-text-label {
  font-size: 0.625rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
  margin-bottom: 0.5rem;
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
  height: 100%;
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

.reddit-post-video-frame {
  margin-bottom: 1rem;
  border-radius: 0.75rem;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--card) 55%, transparent), transparent 36%),
    var(--muted);
  border: 1px solid var(--border);
}

.reddit-post-video {
  width: 100%;
  max-height: 72vh;
  display: block;
  background: var(--muted);
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

.bluesky-post-card {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.bluesky-post-card:last-child {
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

/* \u2500\u2500 Bluesky Load More \u2500\u2500 */
.bluesky-load-more {
  display: block;
  width: 100%;
  max-width: 600px;
  margin: 1rem auto;
  padding: 0.75rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
}

.bluesky-load-more:hover {
  border-color: var(--primary);
  background: var(--card);
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

/* \u2500\u2500 Gallery Timeline \u2500\u2500 */

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

.rdt-post-card:last-child {
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

/* Header: icon + source + author + time */
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

.rdt-author {
  font-weight: 500;
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

/* Post text (Bluesky/Twitter) */
.rdt-post-text {
  font-size: 0.9375rem;
  color: var(--foreground);
  line-height: 1.5;
  word-break: break-word;
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
  cursor: pointer;
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

/* Quote card */
.rdt-quote-card {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.75rem;
  font-size: 0.8125rem;
}

.rdt-quote-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.rdt-quote-text {
  color: var(--muted-foreground);
  line-height: 1.45;
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

/* Load more button */
.rdt-load-more {
  display: block;
  width: 100%;
  max-width: 680px;
  margin: 1.5rem auto;
  padding: 0.75rem 1.5rem;
  background: var(--muted);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.rdt-load-more:hover {
  border-color: var(--primary);
  background: var(--card);
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

  // view/src/card-helpers.ts
  function isImageFile(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  function isVideoFile(name) {
    return /\.(mp4|m4v|webm|mov|avi|mkv)$/i.test(name);
  }
  function getFileUrl(path) {
    return `/api/files/download?path=${encodeURIComponent(path)}`;
  }
  function selectCardMediaPreview(files) {
    const images = files.filter((file) => !file.isDirectory && isImageFile(file.name));
    const videos = files.filter((file) => !file.isDirectory && isVideoFile(file.name));
    if (videos.length > 0) {
      return {
        type: "video",
        src: getFileUrl(videos[0].path),
        poster: images[0] ? getFileUrl(images[0].path) : void 0
      };
    }
    if (images.length > 0) {
      return {
        type: "image",
        src: getFileUrl(images[0].path)
      };
    }
    return { type: "empty" };
  }
  function renderCardMediaPreview(preview, options = {}) {
    const overlayHtml = options.overlayHtml ?? "";
    const loading = options.loading ?? "lazy";
    const emptyLabel = options.emptyLabel ?? "\u{1F4C1}";
    if (preview.type === "image") {
      return `
      <div class="reddit-card-thumb-wrap">
        <div class="reddit-card-media-stage">
          <img class="reddit-card-thumb" src="${preview.src}" alt="" loading="${loading}" />
        </div>
        ${overlayHtml}
      </div>
    `;
    }
    if (preview.type === "video") {
      const posterHtml = preview.poster ? `<img class="reddit-card-thumb reddit-card-thumb-poster reddit-card-thumb-media-fit" src="${preview.poster}" alt="" loading="${loading}" />` : `<div class="reddit-card-thumb-placeholder reddit-card-thumb-placeholder-media"><span class="reddit-card-thumb-placeholder-icon">\u25B6</span></div>`;
      return `
      <div class="reddit-card-thumb-wrap reddit-card-thumb-wrap-video">
        <div class="reddit-card-media-stage">
          ${posterHtml}
        </div>
        ${overlayHtml}
      </div>
    `;
    }
    return `
    <div class="reddit-card-thumb-wrap">
      <div class="reddit-card-thumb-placeholder">${emptyLabel}</div>
      ${overlayHtml}
    </div>
  `;
  }

  // view/src/subreddit-grid.ts
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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
    let postCount = dirs.length;
    let preview = { type: "empty" };
    const hasPostContent = contentFiles.some((f) => f.name === "Post.nfo") || contentFiles.some((f) => isImageFile(f.name));
    if (hasPostContent) {
      postCount = contentFiles.filter((f) => f.name !== "Post.nfo").length || 1;
      preview = selectCardMediaPreview(contentFiles);
      if (preview.type === "empty") {
        try {
          const meta = await fetchPostMetadata(api, entry.path);
          if (meta) {
            const snippet = meta.selftext ? meta.selftext.slice(0, 120) : meta.title;
            preview = {
              type: "text",
              title: meta.title || entry.name,
              snippet: snippet || "",
              label: meta.subreddit ? `r/${meta.subreddit}` : void 0
            };
          }
        } catch {
        }
      }
    } else if (dirs.length > 0) {
      const firstChild = dirs[0];
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
        let foundImage = false;
        for (const postDir of dirs.slice(0, 5)) {
          try {
            const postFiles = await api.fetchFiles(postDir.path);
            const mediaPreview = selectCardMediaPreview(postFiles);
            if (mediaPreview.type !== "empty") {
              preview = mediaPreview;
              foundImage = true;
              break;
            }
          } catch {
          }
        }
        if (!foundImage) {
          try {
            const meta = await fetchPostMetadata(api, firstChild.path);
            if (meta) {
              const snippet = meta.selftext ? meta.selftext.slice(0, 120) : meta.title;
              preview = {
                type: "text",
                title: meta.title || firstChild.name,
                snippet: snippet || "",
                label: meta.subreddit ? `r/${meta.subreddit}` : void 0
              };
            }
          } catch {
          }
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
      case "video":
        return renderCardMediaPreview(preview);
      case "text":
        return `
        <div class="reddit-card-text-preview">
          ${preview.label ? `<div class="reddit-card-text-label">${escapeHtml(preview.label)}</div>` : ""}
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
  function renderSubredditCard(sub, depth) {
    const nameLower = sub.name.toLowerCase();
    const isPlatformFolder = PLATFORM_FOLDERS.has(nameLower);
    const isUser = !isPlatformFolder && (sub.name.startsWith("u_") || sub.name.startsWith("u/"));
    let displayName;
    if (isPlatformFolder || depth === 0) {
      displayName = sub.name;
    } else if (isUser) {
      displayName = "u/" + sub.name.replace(/^u[_/]/, "");
    } else {
      const pathLower = sub.path.toLowerCase();
      const inBluesky = pathLower.includes("/bluesky/");
      const inTwitter = pathLower.includes("/twitter/");
      displayName = inBluesky || inTwitter ? "@" + sub.name : "r/" + sub.name;
    }
    return `
    <div class="reddit-card" data-path="${escapeHtml(sub.path)}">
      ${renderPreview(sub.preview, isUser)}
      <div class="reddit-card-body">
        <div class="reddit-card-title">${escapeHtml(displayName)}</div>
        <div class="reddit-card-meta">
          <span class="reddit-card-meta-item">${sub.postCount} ${sub.postCount === 1 ? "item" : "items"}</span>
        </div>
      </div>
    </div>
  `;
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
    const subs = await Promise.all(
      dirs.map((dir) => loadSubredditInfo(api, dir))
    );
    subs.sort((a, b) => b.postCount - a.postCount);
    const tracked = api.trackedDirectory.replace(/\/+$/, "");
    const current = rootPath.replace(/\/+$/, "");
    const isTopLevel = current === tracked;
    const depth = isTopLevel ? 0 : current.slice(tracked.length + 1).split("/").filter(Boolean).length;
    const heading = isTopLevel ? `${subs.length} archived` : `${rootPath.split("/").pop()} \u2014 ${subs.length} items`;
    container.innerHTML = `
    <div class="reddit-section-heading">${escapeHtml(heading)}</div>
    <div class="reddit-grid">
      ${subs.map((s) => renderSubredditCard(s, depth)).join("")}
    </div>
  `;
    container.querySelectorAll(".reddit-card").forEach((card) => {
      card.addEventListener("click", () => {
        const path = card.dataset.path;
        if (path) onNavigate(path);
      });
    });
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
  function escapeHtml2(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function renderBlueskyRichText(text, facets) {
    const container = document.createElement("div");
    container.className = "bluesky-post-text";
    if (!facets || facets.length === 0) {
      container.innerHTML = escapeHtml2(text).replace(/\n/g, "<br>");
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
        html += escapeHtml2(text.slice(lastIndex, facet.charStart)).replace(
          /\n/g,
          "<br>"
        );
      }
      const facetText = escapeHtml2(text.slice(facet.charStart, facet.charEnd));
      if (facet.type === "link" && facet.uri) {
        html += `<a href="${escapeHtml2(facet.uri)}" target="_blank" rel="noopener noreferrer" class="bluesky-link">${facetText}</a>`;
      } else if (facet.type === "mention" && facet.did) {
        html += `<a href="https://bsky.app/profile/${escapeHtml2(facet.did)}" target="_blank" rel="noopener noreferrer" class="bluesky-mention">${facetText}</a>`;
      } else if (facet.type === "tag" && facet.tag) {
        html += `<span class="bluesky-hashtag">${facetText}</span>`;
      } else {
        html += facetText;
      }
      lastIndex = facet.charEnd;
    }
    if (lastIndex < text.length) {
      html += escapeHtml2(text.slice(lastIndex)).replace(/\n/g, "<br>");
    }
    container.innerHTML = html;
    return container;
  }

  // view/src/gallery-timeline.ts
  function escapeHtml3(text) {
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
  function formatScore(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  var UPVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l-7 7h4v7h6v-7h4L10 3z"/></svg>`;
  var DOWNVOTE_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17l7-7h-4V3H7v7H3l7 7z"/></svg>`;
  var COMMENT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var SHARE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
  var AWARD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;
  var REPOST_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  var LIKE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  var VERIFIED_ICON = `<svg width="14" height="14" viewBox="0 0 22 22" fill="currentColor"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.587.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.272 1.893.143.634-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.899.584-.274 1.083-.705 1.437-1.245.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`;
  function normalizeRedditPost(path, meta, images, videoFile) {
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
      isVideo: meta.isVideo
    };
  }
  function normalizeBlueskyPost(path, meta, images, videoFile, thumbnailFile) {
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
      quotePost: meta.quotePost
    };
  }
  function normalizeTwitterPost(path, meta, images, videoFile) {
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
      quoteTweet: meta.quoteTweet
    };
  }
  function createLightbox(images, startIndex) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "reddit-lightbox";
    function update() {
      overlay.innerHTML = `
      <button class="reddit-lightbox-close" aria-label="Close">&times;</button>
      ${images.length > 1 ? `<button class="reddit-lightbox-nav reddit-lightbox-prev" aria-label="Previous">&#8249;</button>` : ""}
      <img src="${images[currentIndex].src}" alt="${escapeHtml3(images[currentIndex].name)}" />
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
    if (post.videoFile) {
      const wrap = document.createElement("div");
      wrap.className = "rdt-media-wrap";
      const video = document.createElement("video");
      video.className = "rdt-media-video";
      video.src = getFileUrl(post.videoFile.path);
      video.controls = true;
      video.preload = "metadata";
      if (post.videoFile.name.includes(".gif.")) {
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
      }
      wrap.appendChild(video);
      return wrap;
    }
    if (post.images.length > 0) {
      const wrap = document.createElement("div");
      wrap.className = "rdt-media-wrap" + (post.images.length > 1 ? " rdt-media-gallery" : "");
      const imageUrls = post.images.map((img) => ({
        src: getFileUrl(img.path),
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
    if (post.platform === "reddit" && post.selftext && post.selftext.trim().length > 0) {
      const preview = document.createElement("div");
      preview.className = "rdt-selftext-preview";
      preview.textContent = post.selftext.slice(0, 600);
      return preview;
    }
    if (post.platform === "reddit") {
      const isSelf = !post.domain || post.domain.startsWith("self.") || post.domain === "reddit.com";
      if (!isSelf && post.domain && !post.isVideo) {
        const preview = document.createElement("div");
        preview.className = "rdt-link-preview";
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(post.domain)}&sz=32`;
        preview.innerHTML = `
        <img class="rdt-link-favicon" src="${faviconUrl}" alt="" />
        <span class="rdt-link-domain">${escapeHtml3(post.domain)}</span>
      `;
        return preview;
      }
    }
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
      <span class="rdt-link-domain">${escapeHtml3(domain)}</span>
      ${post.externalLink.title ? `<span style="margin-left:0.5rem;opacity:0.7">${escapeHtml3(post.externalLink.title)}</span>` : ""}
    `;
      return linkCard;
    }
    return null;
  }
  function renderTextContent(post) {
    if (post.platform === "bluesky" && post.facets) {
      return renderBlueskyRichText(post.title, post.facets);
    }
    if (post.platform === "twitter") {
      const el = document.createElement("div");
      el.className = "rdt-post-text";
      let html = escapeHtml3(post.title);
      if (post.links) {
        for (const link of post.links) {
          html = html.replace(
            new RegExp(`https?://t\\.co/\\w+`),
            `<a class="twitter-link" href="${escapeHtml3(link.expanded)}" target="_blank" rel="noopener noreferrer">${escapeHtml3(link.display)}</a>`
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
  function renderEngagement(post) {
    const engagement = document.createElement("div");
    engagement.className = "rdt-engagement";
    if (post.platform === "reddit") {
      const score = post.score ?? 0;
      const scoreClass = score > 0 ? "rdt-score-up" : score < 0 ? "rdt-score-down" : "rdt-score-neutral";
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
      return null;
    }
    return engagement;
  }
  function renderPostCard(post, avatarUrl) {
    const card = document.createElement("div");
    card.className = "rdt-post-card";
    const hasSource = post.source && post.source.length > 0;
    const hasAuthor = post.author && post.author.length > 0;
    const hasCreated = post.created && post.created.length > 0;
    if (hasSource || hasAuthor || hasCreated) {
      const header = document.createElement("div");
      header.className = "rdt-post-header";
      let avatarHtml = "";
      if (avatarUrl) {
        avatarHtml = `<img class="rdt-subreddit-icon" src="${escapeHtml3(avatarUrl)}" alt="" />`;
      } else if (hasSource || hasAuthor) {
        avatarHtml = `<div class="rdt-subreddit-icon rdt-subreddit-icon-placeholder"></div>`;
      }
      const displayAuthor = post.authorDisplay || post.author;
      const verifiedHtml = post.verified ? `<span class="twitter-verified-sm">${VERIFIED_ICON}</span>` : "";
      const parts = [];
      if (avatarHtml) parts.push(avatarHtml);
      if (hasSource) parts.push(`<span class="rdt-subreddit">${escapeHtml3(post.source)}</span>`);
      if (hasAuthor && post.platform !== "reddit") {
        if (parts.length > 1) parts.push(`<span class="rdt-meta-sep">&middot;</span>`);
        parts.push(`<span class="rdt-author">${escapeHtml3(displayAuthor)} ${verifiedHtml}</span>`);
      }
      if (hasCreated) {
        if (parts.length > 1) parts.push(`<span class="rdt-meta-sep">&middot;</span>`);
        parts.push(`<span class="rdt-timestamp">${formatRelativeTime(post.created)}</span>`);
      }
      header.innerHTML = parts.join("\n");
      card.appendChild(header);
    }
    const hasFlair = post.flair && post.flair.trim().length > 0;
    if (post.isNsfw || post.isSpoiler || hasFlair) {
      const badges = document.createElement("div");
      badges.className = "rdt-badges";
      if (post.isNsfw) badges.innerHTML += `<span class="rdt-badge rdt-badge-nsfw">NSFW</span>`;
      if (post.isSpoiler) badges.innerHTML += `<span class="rdt-badge rdt-badge-spoiler">Spoiler</span>`;
      if (hasFlair) badges.innerHTML += `<span class="rdt-flair">${escapeHtml3(post.flair)}</span>`;
      card.appendChild(badges);
    }
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
    const mediaEl = buildMediaBlock(post);
    if (mediaEl) card.appendChild(mediaEl);
    const quote = post.quotePost ? { name: post.quotePost.displayName || post.quotePost.authorHandle, handle: post.quotePost.authorHandle, text: post.quotePost.text } : post.quoteTweet ? { name: post.quoteTweet.name, handle: post.quoteTweet.screenName, text: post.quoteTweet.text } : null;
    if (quote && quote.handle) {
      const quoteCard = document.createElement("div");
      quoteCard.className = "rdt-quote-card";
      quoteCard.innerHTML = `
      <div class="rdt-quote-header">
        <span class="rdt-author">${escapeHtml3(quote.name)}</span>
        <span class="rdt-timestamp">@${escapeHtml3(quote.handle)}</span>
      </div>
      <div class="rdt-quote-text">${escapeHtml3(quote.text).replace(/\n/g, "<br>")}</div>
    `;
      card.appendChild(quoteCard);
    }
    const engagementEl = renderEngagement(post);
    if (engagementEl) card.appendChild(engagementEl);
    return card;
  }
  async function loadPostForPlatform(api, dir, platform) {
    const files = await api.fetchFiles(dir.path);
    const images = files.filter(
      (f) => !f.isDirectory && isImageFile(f.name) && f.name !== "Video Thumbnail.jpg" && f.name !== "Thumbnail.jpg"
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
      firstMediaPath: (videoFile || images[0])?.path
    };
  }
  function fileToGalleryPost(file) {
    const isVideo = isVideoFile(file.name);
    return {
      path: file.path,
      platform: "unknown",
      title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
      author: "",
      source: "",
      created: file.modifiedAt || "",
      images: isVideo ? [] : [file],
      videoFile: isVideo ? file : void 0,
      firstMediaPath: file.path
    };
  }
  function getSortScore(post) {
    if (post.score !== void 0) return post.score;
    if (post.likeCount !== void 0) return post.likeCount;
    if (post.favoriteCount !== void 0) return post.favoriteCount;
    return 0;
  }
  var BATCH_SIZE = 20;
  async function renderGalleryTimeline(container, api, dirPath, platform) {
    container.innerHTML = `<div class="reddit-loading">Loading timeline...</div>`;
    const entries = await api.fetchFiles(dirPath);
    const postDirs = entries.filter((e) => e.isDirectory);
    const iconFiles = entries.filter(
      (e) => !e.isDirectory && (e.name === "icon.jpg" || e.name === "icon.png" || e.name === "icon.webp")
    );
    const avatarUrl = iconFiles.length > 0 ? getFileUrl(iconFiles[0].path) : null;
    let allPosts;
    if (postDirs.length > 0) {
      const postPromises = postDirs.map((dir) => loadPostForPlatform(api, dir, platform));
      allPosts = (await Promise.all(postPromises)).filter(
        (p) => p !== null
      );
    } else {
      allPosts = [];
    }
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
    let sortMode = "new";
    function applySort() {
      if (sortMode === "new") {
        allPosts.sort(
          (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
        );
      } else {
        allPosts.sort((a, b) => getSortScore(b) - getSortScore(a));
      }
    }
    applySort();
    container.innerHTML = "";
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
      <h2 class="rdt-profile-name">${sourcePrefix}${escapeHtml3(dirName)}</h2>
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
    const sortSelect = profileHeader.querySelector(".rdt-sort-select");
    const timeline = document.createElement("div");
    timeline.className = "rdt-timeline";
    container.appendChild(timeline);
    let loadedCount = 0;
    function renderBatch() {
      const batch = allPosts.slice(loadedCount, loadedCount + BATCH_SIZE);
      for (const post of batch) {
        const card = renderPostCard(post, avatarUrl);
        if (post.firstMediaPath) {
          card.style.cursor = "pointer";
          card.addEventListener("click", (e) => {
            const target = e.target;
            if (target.closest(".rdt-media-wrap") || target.closest("a") || target.closest("video")) return;
            api.openFile(post.firstMediaPath);
          });
        }
        timeline.appendChild(card);
      }
      loadedCount += batch.length;
      const existingBtn = container.querySelector(".rdt-load-more");
      if (existingBtn) existingBtn.remove();
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
    sortSelect.addEventListener("change", () => {
      sortMode = sortSelect.value;
      applySort();
      loadedCount = 0;
      timeline.innerHTML = "";
      const existingBtn = container.querySelector(".rdt-load-more");
      if (existingBtn) existingBtn.remove();
      renderBatch();
    });
    renderBatch();
  }

  // view/src/markdown.ts
  function escapeHtml4(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function renderMarkdown(md) {
    if (!md) return "";
    let html = md;
    html = escapeHtml4(html);
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
  function escapeHtml5(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function renderComment(comment) {
    if (comment.kind === "more") {
      const more = comment;
      return `<div class="reddit-comment" style="opacity:0.5;font-size:0.75rem;color:var(--muted-foreground);">
      ${more.count} more replies...
    </div>`;
    }
    const scoreClass = comment.score > 0 ? "reddit-score-up" : comment.score < 0 ? "reddit-score-down" : "reddit-score-neutral";
    const bodyHtml = renderMarkdown(comment.body);
    const authorClass = comment.is_submitter ? "reddit-comment-author reddit-comment-op" : "reddit-comment-author";
    const opBadge = comment.is_submitter ? ` <span class="reddit-op-badge">OP</span>` : "";
    const stickyBadge = comment.stickied ? ` <span class="reddit-mod-badge">\u{1F4CC}</span>` : "";
    const modBadge = comment.distinguished === "moderator" ? ` <span class="reddit-mod-badge">MOD</span>` : "";
    const dateStr = formatDate(comment.created_utc);
    const repliesHtml = comment.replies && comment.replies.length > 0 ? `<div class="reddit-comment-thread">
          ${comment.replies.map(renderComment).join("")}
        </div>` : "";
    return `
    <div class="reddit-comment">
      <div class="reddit-comment-header">
        <span class="${authorClass}">${escapeHtml5(comment.author)}</span>${opBadge}${modBadge}${stickyBadge}
        <span class="reddit-score ${scoreClass}">${comment.score > 0 ? "+" : ""}${comment.score}</span>
        ${dateStr ? `<span class="reddit-comment-date">${dateStr}</span>` : ""}
      </div>
      <div class="reddit-comment-body">${bodyHtml}</div>
      ${repliesHtml}
    </div>
  `;
  }
  function renderCommentTree(container, comments) {
    if (comments.length === 0) {
      container.innerHTML = `
      <div class="reddit-empty">
        <div class="reddit-empty-icon">\u{1F4AC}</div>
        <span>No comments</span>
      </div>
    `;
      return;
    }
    container.innerHTML = `
    <div class="reddit-comments">
      <div class="reddit-comments-heading">Comments (${comments.length})</div>
      ${comments.map(renderComment).join("")}
    </div>
  `;
  }

  // view/src/post-detail.ts
  function escapeHtml6(text) {
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
  async function renderPostDetail(container, api, postPath) {
    container.innerHTML = `<div class="reddit-loading">Loading post...</div>`;
    const [files, metadata, comments] = await Promise.all([
      api.fetchFiles(postPath),
      fetchPostMetadata(api, postPath),
      parseComments(api, postPath)
    ]);
    const images = files.filter((f) => !f.isDirectory && isImageFile(f.name));
    const videos = files.filter((f) => !f.isDirectory && isVideoFile(f.name));
    const title = metadata?.title || postPath.split("/").pop() || "Post";
    const scoreClass = metadata ? metadata.score > 0 ? "reddit-score-up" : metadata.score < 0 ? "reddit-score-down" : "reddit-score-neutral" : "reddit-score-neutral";
    let headerHtml = `
    <div class="reddit-post-header">
      <h1 class="reddit-post-title">${escapeHtml6(title)}</h1>
      <div class="reddit-post-byline">
  `;
    if (metadata) {
      headerHtml += `<span class="reddit-post-author">u/${escapeHtml6(metadata.author)}</span>`;
      if (metadata.subreddit) {
        headerHtml += `<span class="reddit-card-meta-item">r/${escapeHtml6(metadata.subreddit)}</span>`;
      }
      headerHtml += `<span class="reddit-score ${scoreClass}">${metadata.score > 0 ? "+" : ""}${metadata.score.toLocaleString()}</span>`;
      if (metadata.flair) {
        headerHtml += `<span class="reddit-flair">${escapeHtml6(metadata.flair)}</span>`;
      }
      if (metadata.created) {
        headerHtml += `<span>${formatDate2(metadata.created)}</span>`;
      }
      if (metadata.numComments !== void 0) {
        headerHtml += `<span>${metadata.numComments.toLocaleString()} comments</span>`;
      }
    }
    headerHtml += `</div></div>`;
    let selftextHtml = "";
    if (metadata?.selftext) {
      selftextHtml = `<div class="reddit-post-selftext">${renderMarkdown(metadata.selftext)}</div>`;
    }
    let galleryHtml = "";
    if (images.length > 0) {
      const imageItems = images.map((img) => getFileUrl(img.path));
      galleryHtml = `<div class="reddit-gallery">`;
      images.forEach((img, i) => {
        galleryHtml += `<img class="reddit-gallery-img" data-index="${i}" src="${imageItems[i]}" alt="${escapeHtml6(img.name)}" loading="lazy" />`;
      });
      galleryHtml += `</div>`;
    }
    let videoHtml = "";
    if (videos.length > 0) {
      videos.forEach((vid) => {
        const src = getFileUrl(vid.path);
        videoHtml += `
        <div class="reddit-post-video-frame">
          <video class="reddit-post-video" controls preload="metadata" playsinline>
          <source src="${src}" />
          Your browser does not support video playback.
          </video>
        </div>
      `;
      });
    }
    let linkCardHtml = "";
    const isLinkPost = metadata?.domain && metadata.domain !== "self." + metadata.subreddit && metadata.domain !== "i.redd.it" && metadata.domain !== "v.redd.it" && metadata.domain !== "reddit.com" && metadata.mediaUrl;
    if (isLinkPost && metadata?.mediaUrl) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(metadata.domain)}&sz=64`;
      linkCardHtml = `
      <a class="reddit-link-card" href="${escapeHtml6(metadata.mediaUrl)}" target="_blank" rel="noopener noreferrer">
        <img class="reddit-link-favicon" src="${faviconUrl}" alt="" />
        <div class="reddit-link-info">
          <div class="reddit-link-domain">${escapeHtml6(metadata.domain)}</div>
          <div class="reddit-link-url">${escapeHtml6(metadata.mediaUrl)}</div>
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
        src: getFileUrl(img.path),
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
      renderCommentTree(commentsContainer, comments);
    }
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
  function formatRelativeTime2(dateStr) {
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
  function formatCount(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  function isImageFile2(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var REPLY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var REPOST_ICON2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  var LIKE_ICON2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  function createLightbox3(images, startIndex) {
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
  function renderReply(reply) {
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
    <span class="bluesky-timestamp">${formatRelativeTime2(reply.createdAt)}</span>
  `;
    el.appendChild(header);
    const facets = convertReplyFacets(reply.facets);
    const textEl = renderBlueskyRichText(reply.text, facets);
    textEl.className = "bluesky-reply-text";
    el.appendChild(textEl);
    const engagement = document.createElement("div");
    engagement.className = "bluesky-reply-engagement";
    engagement.innerHTML = `
    <span class="bluesky-metric">${REPLY_ICON} ${formatCount(reply.replyCount)}</span>
    <span class="bluesky-metric">${REPOST_ICON2} ${formatCount(reply.repostCount)}</span>
    <span class="bluesky-metric">${LIKE_ICON2} ${formatCount(reply.likeCount)}</span>
  `;
    el.appendChild(engagement);
    if (reply.replies && reply.replies.length > 0) {
      const thread = document.createElement("div");
      thread.className = "bluesky-reply-thread";
      for (const child of reply.replies) {
        thread.appendChild(renderReply(child));
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
      (f) => !f.isDirectory && isImageFile2(f.name) && f.name !== "Video Thumbnail.jpg" && f.name !== "Thumbnail.jpg"
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
          document.body.appendChild(createLightbox3(imageUrls, i));
        });
        imageGrid.appendChild(imgEl);
      });
      wrapper.appendChild(imageGrid);
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
      <span class="bluesky-detail-count">${REPLY_ICON} <strong>${formatCount(metadata.replyCount)}</strong> replies</span>
      <span class="bluesky-detail-count">${REPOST_ICON2} <strong>${formatCount(metadata.repostCount)}</strong> reposts</span>
      <span class="bluesky-detail-count">${LIKE_ICON2} <strong>${formatCount(metadata.likeCount)}</strong> likes</span>
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
        repliesSection.appendChild(renderReply(reply));
      }
      wrapper.appendChild(repliesSection);
    }
    container.appendChild(wrapper);
  }

  // view/src/twitter-post-detail.ts
  function escapeHtml8(text) {
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
  function formatCount2(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
  function isImageFile3(name) {
    return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
  }
  var REPLY_ICON2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  var RETWEET_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  var LIKE_ICON3 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  var VERIFIED_ICON2 = `<svg width="16" height="16" viewBox="0 0 22 22" fill="currentColor"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.587.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.272 1.893.143.634-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.899.584-.274 1.083-.705 1.437-1.245.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`;
  function createLightbox4(images, startIndex) {
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
  function renderTwitterRichText(metadata) {
    const el = document.createElement("div");
    let html = escapeHtml8(metadata.text);
    if (metadata.links) {
      for (const link of metadata.links) {
        const escapedDisplay = escapeHtml8(link.display);
        const escapedExpanded = escapeHtml8(link.expanded);
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
      (f) => !f.isDirectory && isImageFile3(f.name) && f.name !== "Video Thumbnail.jpg"
    );
    const videoFile = files.find(
      (f) => !f.isDirectory && /\.(mp4|m4v|webm)$/i.test(f.name)
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
      avatarHtml = `<img class="twitter-detail-avatar" src="${escapeHtml8(avatarUrl)}" alt="" />`;
    }
    const verifiedHtml = metadata.verified ? `<span class="twitter-verified">${VERIFIED_ICON2}</span>` : "";
    header.innerHTML = `
    ${avatarHtml}
    <div class="twitter-detail-author">
      <span class="twitter-display-name">${escapeHtml8(metadata.name)} ${verifiedHtml}</span>
      <span class="twitter-handle">@${escapeHtml8(metadata.screenName)}</span>
    </div>
  `;
    wrapper.appendChild(header);
    if (metadata.replyTo && metadata.replyTo.screenName) {
      const replyIndicator = document.createElement("div");
      replyIndicator.className = "twitter-reply-indicator";
      replyIndicator.innerHTML = `Replying to <a class="twitter-mention" href="https://x.com/${escapeHtml8(metadata.replyTo.screenName)}" target="_blank" rel="noopener noreferrer">@${escapeHtml8(metadata.replyTo.screenName)}</a>`;
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
      wrapper.appendChild(videoEl);
    }
    if (metadata.quoteTweet && metadata.quoteTweet.screenName) {
      const quoteCard = document.createElement("div");
      quoteCard.className = "bluesky-quote-card";
      quoteCard.innerHTML = `
      <div class="bluesky-quote-header">
        <span class="bluesky-display-name">${escapeHtml8(metadata.quoteTweet.name)}</span>
        <span class="bluesky-handle">@${escapeHtml8(metadata.quoteTweet.screenName)}</span>
      </div>
      <div class="bluesky-quote-text">${escapeHtml8(metadata.quoteTweet.text).replace(/\n/g, "<br>")}</div>
    `;
      wrapper.appendChild(quoteCard);
    }
    const stats = document.createElement("div");
    stats.className = "twitter-detail-stats";
    stats.innerHTML = `
    <span class="bluesky-detail-date">${formatDate4(metadata.created)}</span>
    <div class="bluesky-detail-counts">
      <span class="bluesky-detail-count">${REPLY_ICON2} <strong>${formatCount2(metadata.replyCount)}</strong> replies</span>
      <span class="bluesky-detail-count">${RETWEET_ICON} <strong>${formatCount2(metadata.retweetCount)}</strong> retweets</span>
      <span class="bluesky-detail-count">${LIKE_ICON3} <strong>${formatCount2(metadata.favoriteCount)}</strong> likes</span>
    </div>
  `;
    wrapper.appendChild(stats);
    container.appendChild(wrapper);
  }

  // view/src/reddit-app.ts
  var METADATA_FILES2 = /* @__PURE__ */ new Set([
    "icon.jpg",
    "icon.png",
    "icon.webp",
    ".no-icon"
  ]);
  var MEDIA_RE = /\.(jpe?g|png|gif|webp|bmp|avif|mp4|m4v|webm|mov|avi|mkv)$/i;
  async function detectViewInfo(api, dirPath, entries) {
    const dirs = entries.filter((e) => e.isDirectory);
    const contentFiles = entries.filter(
      (e) => !e.isDirectory && !METADATA_FILES2.has(e.name)
    );
    const hasNfo = contentFiles.some((f) => f.name === "Post.nfo");
    const hasComments = contentFiles.some((f) => f.name === "Comments.json");
    const hasMedia = contentFiles.some((f) => MEDIA_RE.test(f.name));
    if (hasNfo || hasComments) {
      const platform = hasNfo ? await detectNfoPlatform(api, dirPath) || "reddit" : "reddit";
      return { mode: "post", platform };
    }
    if (dirs.length === 0) {
      if (hasMedia) {
        return { mode: "post-list", platform: "unknown" };
      }
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
      const childHasMedia = childContentFiles.some((e) => MEDIA_RE.test(e.name));
      if (childHasNfo || childHasMedia) {
        const platform = childHasNfo ? await detectNfoPlatform(api, firstChild.path) || "reddit" : "unknown";
        return { mode: "post-list", platform };
      }
      if (childContentFiles.length === 0) {
        if (hasMedia) return { mode: "post-list", platform: "unknown" };
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
  var RedditApp = class {
    constructor(container, api) {
      __publicField(this, "container");
      __publicField(this, "api");
      __publicField(this, "contentEl");
      __publicField(this, "cleanupView");
      this.container = container;
      this.api = api;
      this.container.innerHTML = "";
      this.container.classList.add("reddit-view");
      injectStyles(this.container);
      this.contentEl = document.createElement("div");
      this.container.appendChild(this.contentEl);
      this.renderCurrentPath();
    }
    async renderCurrentPath() {
      const { currentPath, trackedDirectory } = this.api;
      this.cleanupView?.();
      this.cleanupView = void 0;
      this.contentEl.innerHTML = "";
      const tracked = trackedDirectory.replace(/\/+$/, "");
      const current = currentPath.replace(/\/+$/, "");
      const isRoot = current === tracked;
      if (!isRoot) {
        const breadcrumb = renderBreadcrumb(
          currentPath,
          trackedDirectory,
          (path) => this.api.navigate(path)
        );
        this.contentEl.appendChild(breadcrumb);
      }
      const viewContainer = document.createElement("div");
      viewContainer.innerHTML = `<div class="reddit-loading">Loading...</div>`;
      this.contentEl.appendChild(viewContainer);
      const entries = await this.api.fetchFiles(currentPath);
      const viewInfo = await detectViewInfo(this.api, currentPath, entries);
      viewContainer.innerHTML = "";
      switch (viewInfo.mode) {
        case "root":
          this.cleanupView = await renderSubredditGrid(
            viewContainer,
            this.api,
            currentPath,
            (path) => this.api.navigate(path)
          ) || void 0;
          break;
        case "post-list":
          await renderGalleryTimeline(
            viewContainer,
            this.api,
            currentPath,
            viewInfo.platform
          );
          break;
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
    onPathChange(newPath, api) {
      this.api = api;
      this.renderCurrentPath();
    }
    destroy() {
      this.cleanupView?.();
      this.cleanupView = void 0;
      this.container.classList.remove("reddit-view");
      this.container.innerHTML = "";
    }
  };

  // view/src/index.ts
  var app = null;
  window.__archiver_register_view?.("gallery-dl-browser", {
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
