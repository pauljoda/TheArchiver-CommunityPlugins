import type { PluginViewAPI } from "./types";
import { formatDuration } from "./info-parser";

/**
 * Trickplay sprite sheet preview on video timeline hover.
 *
 * Jellyfin trickplay format:
 * - Directory: <currentPath>/.trickplay/<videoStem>/320/
 * - Files: 0.jpg, 1.jpg, ... (each is a 10x10 sprite sheet)
 * - Each tile is ~320px wide, aspect ratio preserved
 * - One frame per 10 seconds of video
 * - Tiles per sheet: 100 (10 cols x 10 rows)
 */

const COLS = 10;
const ROWS = 10;
const TILES_PER_SHEET = COLS * ROWS; // 100
const SECONDS_PER_FRAME = 10;

/** Cache of loaded sprite sheet blob URLs */
const sheetCache = new Map<string, string>();

/** Active event listeners for cleanup */
let cleanupFn: (() => void) | null = null;
let trickplayAvailable = false;

/**
 * Initialize trickplay hover preview on the video player.
 * Silently does nothing if no .trickplay directory exists.
 */
export async function initTrickplay(
  videoEl: HTMLVideoElement,
  playerWrapper: HTMLElement,
  api: PluginViewAPI,
  currentPath: string,
  videoStem: string,
  duration: number
): Promise<void> {
  // Construct trickplay path — Jellyfin stores media-adjacent trickplay as:
  // <videoStem>.trickplay/320/0.jpg, 1.jpg, ...
  const trickplayBase = `${currentPath}/${videoStem}.trickplay/320`;
  const firstSheetPath = `${trickplayBase}/0.jpg`;

  try {
    const res = await api.fetchFile(firstSheetPath);
    if (!res.ok) return; // No trickplay available

    // Cache the first sheet
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    sheetCache.set(`${trickplayBase}/0.jpg`, url);
    trickplayAvailable = true;

    // Probe actual tile dimensions from the first sheet
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    const actualTileWidth = img.naturalWidth / COLS;
    const actualTileHeight = img.naturalHeight / ROWS;

    // Create the overlay element
    const overlay = document.createElement("div");
    overlay.className = "yt-trickplay-overlay";
    overlay.style.width = `${actualTileWidth}px`;
    overlay.style.height = `${actualTileHeight}px`;

    const tileImg = document.createElement("div");
    tileImg.style.width = `${img.naturalWidth}px`;
    tileImg.style.height = `${img.naturalHeight}px`;
    tileImg.style.backgroundSize = "contain";
    tileImg.style.backgroundRepeat = "no-repeat";
    overlay.appendChild(tileImg);

    const timeLabel = document.createElement("div");
    timeLabel.className = "yt-trickplay-time";
    overlay.appendChild(timeLabel);

    playerWrapper.appendChild(overlay);

    // Event handlers
    const onMouseMove = async (e: MouseEvent) => {
      const rect = playerWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const hoverTime = ratio * duration;

      // Calculate which frame and which sheet
      const frameIndex = Math.floor(hoverTime / SECONDS_PER_FRAME);
      const sheetIndex = Math.floor(frameIndex / TILES_PER_SHEET);
      const tileIndex = frameIndex % TILES_PER_SHEET;
      const col = tileIndex % COLS;
      const row = Math.floor(tileIndex / COLS);

      // Load sprite sheet if not cached
      const sheetPath = `${trickplayBase}/${sheetIndex}.jpg`;
      let sheetUrl = sheetCache.get(sheetPath);
      if (!sheetUrl) {
        try {
          const res = await api.fetchFile(sheetPath);
          if (res.ok) {
            const blob = await res.blob();
            sheetUrl = URL.createObjectURL(blob);
            sheetCache.set(sheetPath, sheetUrl);
          }
        } catch {
          // Sheet not available
        }
      }

      if (!sheetUrl) {
        overlay.classList.remove("visible");
        return;
      }

      // Position the tile
      tileImg.style.backgroundImage = `url(${sheetUrl})`;
      tileImg.style.transform = `translate(-${col * actualTileWidth}px, -${row * actualTileHeight}px)`;

      // Position overlay centered on mouse X, clamped to container
      const overlayWidth = actualTileWidth;
      let left = x - overlayWidth / 2;
      left = Math.max(0, Math.min(rect.width - overlayWidth, left));
      overlay.style.left = `${left}px`;

      // Time label
      timeLabel.textContent = formatDuration(hoverTime);

      overlay.classList.add("visible");
    };

    const onMouseLeave = () => {
      overlay.classList.remove("visible");
    };

    playerWrapper.addEventListener("mousemove", onMouseMove);
    playerWrapper.addEventListener("mouseleave", onMouseLeave);

    cleanupFn = () => {
      playerWrapper.removeEventListener("mousemove", onMouseMove);
      playerWrapper.removeEventListener("mouseleave", onMouseLeave);
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
  } catch {
    // No trickplay available — silently skip
  }
}

/** Clean up trickplay state */
export function destroyTrickplay(): void {
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }

  // Revoke cached blob URLs
  for (const url of sheetCache.values()) {
    URL.revokeObjectURL(url);
  }
  sheetCache.clear();
  trickplayAvailable = false;
}
