// ─── Shared view-layer media player ───────────────────────────────────────
//
// DOM-imperative media rendering shared across plugin views (plugin-social,
// plugin-gallery-dl, etc.). Handles file-type classification, element
// creation for image/video/audio, and a simple gallery wrapper.
//
// This module runs in the browser. It must NOT import from `_shared/runtime/**`
// or touch Node APIs. esbuild inlines it into each plugin's `view/index.js`
// bundle at build time (no sync-shared step for view code).

export type MediaKind = "image" | "video" | "audio" | "other";

// Extension sets mirror the host app's `src/lib/file-preview.ts` for
// consistency. They're maintained independently here because plugin views
// can't import host React code.
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|avif|svg|tiff?)$/i;
const VIDEO_EXT_RE = /\.(mp4|m4v|webm|mov|mkv|avi|flv|wmv|ogv)$/i;
const AUDIO_EXT_RE = /\.(mp3|m4a|flac|wav|ogg|opus|aac)$/i;

export function isImageFile(name: string): boolean {
  return IMAGE_EXT_RE.test(name);
}

export function isVideoFile(name: string): boolean {
  return VIDEO_EXT_RE.test(name);
}

export function isAudioFile(name: string): boolean {
  return AUDIO_EXT_RE.test(name);
}

/**
 * Reddit's native uploader encodes GIFs as .mp4 files named like
 * `something.gif.mp4` so clients know to autoplay/loop/mute them. Also
 * returns true for plain .gif.
 */
export function isGifLikeFile(name: string): boolean {
  return /\.gif(\.(mp4|webm))?$/i.test(name);
}

export function getMediaKind(name: string): MediaKind {
  if (isImageFile(name)) return "image";
  if (isVideoFile(name)) return "video";
  if (isAudioFile(name)) return "audio";
  return "other";
}

/** Builds a /api/files/download?path=... URL from a plugin-view file path. */
export function buildFileSrc(filePath: string): string {
  return `/api/files/download?path=${encodeURIComponent(filePath)}`;
}

export interface MediaFile {
  name: string;
  path: string;
}

export interface RenderMediaGalleryOptions {
  /** Wrap the element with this class name. Default: "shared-media-gallery". */
  className?: string;
  /**
   * If true (default), videos whose name matches {@link isGifLikeFile} render
   * with `autoplay loop muted playsinline` so they behave like GIFs.
   */
  videoAutoplayIfGifLike?: boolean;
  /** Optional extra CSS class applied to each image element. */
  imageClassName?: string;
  /** Optional extra CSS class applied to each video element. */
  videoClassName?: string;
  /** Inline style string applied to each video element. */
  videoStyle?: string;
  /**
   * If true, image clicks navigate through an inline-lightbox experience.
   * Not implemented in this module yet — pass through to the caller's own
   * lightbox for now.
   */
  lightbox?: boolean;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Renders the given files as a single container element containing image
 * and video children. Audio and "other" file types are ignored. Callers
 * that want to show unsupported files should filter first.
 */
export function renderMediaGallery(
  files: MediaFile[],
  opts: RenderMediaGalleryOptions = {}
): HTMLElement {
  const {
    className = "shared-media-gallery",
    videoAutoplayIfGifLike = true,
    imageClassName = "shared-media-image",
    videoClassName = "shared-media-video",
    videoStyle = "width:100%;max-height:70vh;border-radius:0.5rem;margin-bottom:1rem;background:var(--muted);",
  } = opts;

  const container = document.createElement("div");
  container.className = className;

  let imageIndex = 0;
  for (const file of files) {
    if (isImageFile(file.name)) {
      const img = document.createElement("img");
      img.className = imageClassName;
      img.src = buildFileSrc(file.path);
      img.alt = file.name;
      img.loading = "lazy";
      img.dataset.index = String(imageIndex++);
      img.dataset.fileName = file.name;
      container.appendChild(img);
    } else if (isVideoFile(file.name)) {
      const video = document.createElement("video");
      video.className = videoClassName;
      video.controls = true;
      video.setAttribute("style", videoStyle);
      if (videoAutoplayIfGifLike && isGifLikeFile(file.name)) {
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.setAttribute("playsinline", "");
      }
      const source = document.createElement("source");
      source.src = buildFileSrc(file.path);
      video.appendChild(source);
      const fallback = document.createElement("span");
      fallback.textContent = "Your browser does not support video playback.";
      video.appendChild(fallback);
      container.appendChild(video);
    }
  }

  return container;
}

/**
 * Convenience string-builder variant for call sites that concatenate HTML
 * into a larger template literal (as plugin-social's post-detail.ts does
 * today). Returns the outer HTML of what {@link renderMediaGallery} would
 * produce. Prefer the DOM variant for new code.
 */
export function renderMediaGalleryHtml(
  files: MediaFile[],
  opts: RenderMediaGalleryOptions = {}
): string {
  const {
    className = "shared-media-gallery",
    videoAutoplayIfGifLike = true,
    imageClassName = "shared-media-image",
    videoClassName = "shared-media-video",
    videoStyle = "width:100%;max-height:70vh;border-radius:0.5rem;margin-bottom:1rem;background:var(--muted);",
  } = opts;

  let html = `<div class="${escapeAttr(className)}">`;
  let imageIndex = 0;
  for (const file of files) {
    if (isImageFile(file.name)) {
      html += `<img class="${escapeAttr(imageClassName)}" data-index="${imageIndex++}" src="${escapeAttr(buildFileSrc(file.path))}" alt="${escapeAttr(file.name)}" loading="lazy" />`;
    } else if (isVideoFile(file.name)) {
      const extras =
        videoAutoplayIfGifLike && isGifLikeFile(file.name)
          ? " autoplay loop muted playsinline"
          : "";
      html += `<video class="${escapeAttr(videoClassName)}" controls${extras} style="${escapeAttr(videoStyle)}"><source src="${escapeAttr(buildFileSrc(file.path))}" />Your browser does not support video playback.</video>`;
    }
  }
  html += `</div>`;
  return html;
}
