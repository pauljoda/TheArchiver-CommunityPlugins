import type { BlueskyPostMetadata } from "./types";

/**
 * Convert byte offsets (used by Bluesky facets) to character offsets in a string.
 * Bluesky uses UTF-8 byte offsets, but JavaScript strings are UTF-16.
 */
function byteToCharOffset(text: string, byteOffset: number): number {
  const encoder = new TextEncoder();
  let byteCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (byteCount >= byteOffset) return i;
    const char = text.codePointAt(i)!;
    const bytes = encoder.encode(String.fromCodePoint(char)).length;
    byteCount += bytes;
    // Handle surrogate pairs
    if (char > 0xffff) i++;
  }
  return text.length;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render Bluesky post text with rich text facets (links, mentions, hashtags).
 */
export function renderBlueskyRichText(
  text: string,
  facets?: BlueskyPostMetadata["facets"]
): HTMLElement {
  const container = document.createElement("div");
  container.className = "bluesky-post-text";

  if (!facets || facets.length === 0) {
    // No facets — render as plain text with line breaks
    container.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
    return container;
  }

  // Sort facets by byteStart
  const sorted = [...facets].sort((a, b) => a.byteStart - b.byteStart);

  // Convert byte offsets to character offsets
  const charFacets = sorted.map((f) => ({
    ...f,
    charStart: byteToCharOffset(text, f.byteStart),
    charEnd: byteToCharOffset(text, f.byteEnd),
  }));

  let html = "";
  let lastIndex = 0;

  for (const facet of charFacets) {
    // Add plain text before this facet
    if (facet.charStart > lastIndex) {
      html += escapeHtml(text.slice(lastIndex, facet.charStart)).replace(
        /\n/g,
        "<br>"
      );
    }

    const facetText = escapeHtml(text.slice(facet.charStart, facet.charEnd));

    if (facet.type === "link" && facet.uri) {
      html += `<a href="${escapeHtml(facet.uri)}" target="_blank" rel="noopener noreferrer" class="bluesky-link">${facetText}</a>`;
    } else if (facet.type === "mention" && facet.did) {
      html += `<a href="https://bsky.app/profile/${escapeHtml(facet.did)}" target="_blank" rel="noopener noreferrer" class="bluesky-mention">${facetText}</a>`;
    } else if (facet.type === "tag" && facet.tag) {
      html += `<span class="bluesky-hashtag">${facetText}</span>`;
    } else {
      html += facetText;
    }

    lastIndex = facet.charEnd;
  }

  // Add remaining text after last facet
  if (lastIndex < text.length) {
    html += escapeHtml(text.slice(lastIndex)).replace(/\n/g, "<br>");
  }

  container.innerHTML = html;
  return container;
}
