import type { CardMediaPreview, FileEntry } from "./types";
import {
  isImageFile as sharedIsImageFile,
  isVideoFile as sharedIsVideoFile,
  buildFileSrc,
} from "../../../_shared/view/media-player";

// Re-exports so the rest of plugin-gallery-dl's view code can continue to
// `import { isImageFile } from "./card-helpers"` unchanged. Implementations
// live in the shared media player at plugins/_shared/view/media-player.ts.
export const isImageFile = sharedIsImageFile;
export const isVideoFile = sharedIsVideoFile;
export const getFileUrl = buildFileSrc;

export function selectCardMediaPreview(files: FileEntry[]): CardMediaPreview {
  const images = files.filter((file) => !file.isDirectory && isImageFile(file.name));
  const videos = files.filter((file) => !file.isDirectory && isVideoFile(file.name));

  if (videos.length > 0) {
    return {
      type: "video",
      src: getFileUrl(videos[0].path),
      poster: images[0] ? getFileUrl(images[0].path) : undefined,
    };
  }

  if (images.length > 0) {
    return {
      type: "image",
      src: getFileUrl(images[0].path),
    };
  }

  return { type: "empty" };
}

export function renderCardMediaPreview(
  preview: CardMediaPreview,
  options: {
    overlayHtml?: string;
    loading?: "lazy" | "eager";
    emptyLabel?: string;
  } = {}
): string {
  const overlayHtml = options.overlayHtml ?? "";
  const loading = options.loading ?? "lazy";
  const emptyLabel = options.emptyLabel ?? "📁";

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
    const posterHtml = preview.poster
      ? `<img class="reddit-card-thumb reddit-card-thumb-poster reddit-card-thumb-media-fit" src="${preview.poster}" alt="" loading="${loading}" />`
      : `<div class="reddit-card-thumb-placeholder reddit-card-thumb-placeholder-media"><span class="reddit-card-thumb-placeholder-icon">▶</span></div>`;

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
