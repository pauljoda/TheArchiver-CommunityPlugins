/** Inject scoped CSS into the plugin container */
export function injectStyles(container: HTMLElement): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = CSS;
  container.appendChild(style);
  return style;
}

const CSS = `
/* ── Reset ── */
.gallery-view * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.gallery-view {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--foreground);
  line-height: 1.5;
  padding: 1.5rem;
  min-height: 100%;
  max-width: 960px;
  margin: 0 auto;
}

/* ── Loading ── */
.gallery-loading {
  text-align: center;
  padding: 3rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

/* ── Empty state ── */
.gallery-empty {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
.gallery-empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.4;
}

/* ── Breadcrumb ── */
.gallery-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}
.gallery-breadcrumb-link {
  cursor: pointer;
  color: var(--primary);
  transition: opacity 0.15s;
}
.gallery-breadcrumb-link:hover {
  opacity: 0.7;
}
.gallery-breadcrumb-sep {
  opacity: 0.4;
  padding: 0 0.25rem;
}
.gallery-breadcrumb-current {
  color: var(--foreground);
}

/* ── Header ── */
.gallery-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}
.gallery-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.gallery-count {
  font-size: 0.8rem;
  color: var(--muted-foreground);
  font-family: 'JetBrains Mono', monospace;
}

/* ── Feed ── */
.gallery-feed {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Folder cards ── */
.gallery-folder-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: var(--card);
}
.gallery-folder-card:hover {
  border-color: var(--primary);
  background: hsl(var(--accent) / 0.3);
}
.gallery-folder-thumb {
  position: relative;
  width: 80px;
  height: 60px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--muted);
  flex-shrink: 0;
}
.gallery-folder-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gallery-folder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.5rem;
  opacity: 0.4;
}
.gallery-folder-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  padding: 1px 4px;
  border-radius: 3px;
}
.gallery-folder-label {
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Media items ── */
.gallery-media-item {
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--card);
}
.gallery-media-img {
  display: block;
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  background: var(--muted);
  cursor: pointer;
  transition: opacity 0.15s;
}
.gallery-media-img:hover {
  opacity: 0.9;
}
.gallery-media-video {
  display: block;
  width: 100%;
  max-height: 80vh;
  background: #000;
}
.gallery-media-caption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
}
.gallery-media-name {
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.gallery-media-meta {
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--muted-foreground);
  opacity: 0.6;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Load more ── */
.gallery-load-more {
  display: block;
  width: 100%;
  padding: 0.75rem;
  margin-top: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--card);
  color: var(--muted-foreground);
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  text-align: center;
}
.gallery-load-more:hover {
  border-color: var(--primary);
  color: var(--foreground);
}

/* ── Lightbox ── */
.gallery-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.gallery-lightbox img {
  max-width: 95vw;
  max-height: 92vh;
  object-fit: contain;
  cursor: default;
  border-radius: 4px;
}
.gallery-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  background: none;
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  opacity: 0.7;
  z-index: 1;
  line-height: 1;
}
.gallery-lightbox-close:hover { opacity: 1; }
.gallery-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 2.5rem;
  width: 48px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  opacity: 0.5;
  transition: opacity 0.15s;
  z-index: 1;
}
.gallery-lightbox-nav:hover { opacity: 1; }
.gallery-lightbox-prev { left: 1rem; }
.gallery-lightbox-next { right: 1rem; }
.gallery-lightbox-counter {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  padding: 4px 12px;
  border-radius: 12px;
}
`;
