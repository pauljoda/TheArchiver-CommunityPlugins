/** Inject scoped CSS into a container */
export function injectStyles(container: HTMLElement): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = CSS;
  container.appendChild(style);
  return style;
}

const CSS = `
/* ── Reset inside plugin container ── */
.yt-view * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.yt-view {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--foreground);
  line-height: 1.5;
  padding: 1.5rem;
  min-height: 100%;
}

/* ── Loading ── */
.yt-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

/* ── Breadcrumb ── */
.yt-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  flex-wrap: wrap;
}

.yt-breadcrumb-link {
  cursor: pointer;
  color: var(--muted-foreground);
  transition: color 0.15s;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yt-breadcrumb-link:hover {
  color: var(--foreground);
}

.yt-breadcrumb-sep {
  color: var(--muted-foreground);
  opacity: 0.5;
  margin: 0 0.125rem;
}

.yt-breadcrumb-current {
  color: var(--foreground);
  font-weight: 500;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Grid layouts ── */
.yt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

/* ── Cards ── */
.yt-card {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.yt-card:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.yt-card-thumb {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  display: block;
  background: var(--muted);
}

.yt-card-thumb-placeholder {
  width: 100%;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 2rem;
}

.yt-card-body {
  padding: 0.75rem 1rem;
}

.yt-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.yt-card-meta {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.yt-card-duration {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
}

.yt-card-thumb-container {
  position: relative;
}

/* ── Video Detail View ── */
.yt-video-layout {
  max-width: 1200px;
  margin: 0 auto;
}

.yt-player-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 0.75rem;
  overflow: hidden;
  margin-bottom: 1.25rem;
}

.yt-player-wrapper video {
  width: 100%;
  height: 100%;
  display: block;
}

.yt-video-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--foreground);
  margin-bottom: 0.75rem;
  line-height: 1.3;
}

.yt-video-meta-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.yt-video-meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.yt-video-channel {
  font-weight: 600;
  color: var(--foreground);
}

.yt-video-channel-link {
  cursor: pointer;
  color: var(--foreground);
  font-weight: 600;
}

.yt-video-channel-link:hover {
  text-decoration: underline;
}

.yt-video-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.yt-video-description {
  font-size: 0.875rem;
  color: var(--foreground);
  background: var(--muted);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow: hidden;
  position: relative;
  transition: max-height 0.3s;
  cursor: pointer;
}

.yt-video-description.expanded {
  max-height: none;
}

.yt-video-description-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(transparent, var(--muted));
  pointer-events: none;
}

.yt-video-description.expanded .yt-video-description-fade {
  display: none;
}

/* ── Chapters ── */
.yt-chapters {
  margin-bottom: 1rem;
}

.yt-chapters-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.5rem;
}

.yt-chapter-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.yt-chapter-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.8125rem;
  transition: background 0.15s;
}

.yt-chapter-item:hover {
  background: var(--muted);
}

.yt-chapter-item.active {
  background: var(--accent);
  color: var(--accent-foreground);
}

.yt-chapter-time {
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--primary);
  min-width: 50px;
}

.yt-chapter-name {
  color: var(--foreground);
}

/* ── Tags ── */
.yt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.yt-tag {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  background: var(--muted);
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
}

/* ── Trickplay overlay ── */
.yt-trickplay-overlay {
  position: absolute;
  bottom: calc(100% + 8px);
  pointer-events: none;
  z-index: 10;
  border: 2px solid var(--primary);
  border-radius: 0.375rem;
  overflow: hidden;
  background: #000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  display: none;
}

.yt-trickplay-overlay.visible {
  display: block;
}

.yt-trickplay-time {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: #fff;
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', monospace;
  white-space: nowrap;
}

/* ── Custom progress bar ── */
.yt-progress-container {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.2);
  cursor: pointer;
  transition: height 0.1s;
}

.yt-progress-container:hover {
  height: 8px;
}

.yt-progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.1s linear;
}

.yt-progress-buffer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(255,255,255,0.15);
}

/* ── Empty state ── */
.yt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--muted-foreground);
}

.yt-empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.yt-empty-text {
  font-size: 0.875rem;
}

/* ── Comments ── */
.yt-comments-section {
  margin-top: 1.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1.25rem;
}

.yt-comments-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.yt-comments-heading {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--foreground);
}

.yt-sort-bar {
  display: flex;
  gap: 0.25rem;
  background: var(--muted);
  border-radius: 0.5rem;
  padding: 0.1875rem;
}

.yt-sort-btn {
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

.yt-sort-btn:hover {
  color: var(--foreground);
}

.yt-sort-btn.active {
  background: var(--background);
  color: var(--foreground);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.yt-comments-empty {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  padding: 1rem 0;
}

.yt-comment {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.yt-comment:last-child {
  border-bottom: none;
}

.yt-comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  flex-wrap: wrap;
}

.yt-comment-author {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
}

.yt-comment-uploader {
  color: var(--primary);
}

.yt-comment-badge {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: var(--primary);
  color: var(--primary-foreground);
}

.yt-comment-badge-heart {
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
}

.yt-comment-date {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.yt-comment-body {
  font-size: 0.875rem;
  color: var(--foreground);
  line-height: 1.6;
  word-break: break-word;
  margin-bottom: 0.375rem;
}

.yt-comment-likes {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

/* ── Collapse toggle ── */
.yt-comment-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.375rem;
  padding: 0.25rem 0;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s;
}

.yt-comment-toggle:hover {
  color: var(--foreground);
}

.yt-comment-toggle-icon {
  display: inline-block;
  font-size: 0.5rem;
  transition: transform 0.2s;
}

.yt-comment-toggle-icon.expanded {
  transform: rotate(90deg);
}

.yt-comment-toggle-text {
  font-weight: 500;
}

/* ── Threaded replies ── */
.yt-comment-replies {
  margin-top: 0.5rem;
  padding-left: 1.25rem;
  border-left: 2px solid var(--thread-color, var(--border));
  cursor: default;
  transition: border-color 0.15s;
}

.yt-comment-replies:hover {
  border-left-color: color-mix(in oklch, var(--thread-color, var(--border)), var(--foreground) 25%);
}

.yt-comment-replies.collapsed {
  display: none;
}

.yt-comment-replies .yt-comment {
  padding: 0.5rem 0;
}

/* ── Source link ── */
.yt-source-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;
}

.yt-source-link:hover {
  text-decoration: underline;
}
`;
