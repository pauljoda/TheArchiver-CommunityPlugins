/**
 * Lightweight markdown-to-HTML renderer for Reddit selftext and comment bodies.
 * Handles the subset of markdown commonly used on Reddit.
 * No external dependencies.
 */

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";

  // Split into lines for block-level processing
  let html = md;

  // Escape HTML first (but preserve our markdown)
  html = escapeHtml(html);

  // Code blocks (```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_m, _lang, code) =>
      `<pre style="background:var(--muted);padding:0.75rem;border-radius:0.375rem;overflow-x:auto;font-size:0.8125rem;margin:0.5rem 0;"><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    `<code style="background:var(--muted);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;">$1</code>`
  );

  // Headings (# to ####)
  html = html.replace(/^####\s+(.+)$/gm, '<strong style="font-size:0.875rem;">$1</strong>');
  html = html.replace(/^###\s+(.+)$/gm, '<strong style="font-size:0.9375rem;">$1</strong>');
  html = html.replace(/^##\s+(.+)$/gm, '<strong style="font-size:1rem;">$1</strong>');
  html = html.replace(/^#\s+(.+)$/gm, '<strong style="font-size:1.125rem;">$1</strong>');

  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:0.75rem 0;" />');

  // Blockquotes (> text)
  html = html.replace(
    /^&gt;\s*(.+)$/gm,
    '<blockquote style="border-left:3px solid var(--border);padding-left:0.75rem;color:var(--muted-foreground);margin:0.375rem 0;">$1</blockquote>'
  );

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Superscript (Reddit-style ^word or ^(phrase))
  html = html.replace(/\^\(([^)]+)\)/g, "<sup>$1</sup>");
  html = html.replace(/\^(\S+)/g, "<sup>$1</sup>");

  // Reddit gif embeds: ![gif](giphy|ID) or ![gif](giphy|ID|variant) — render as giphy image
  html = html.replace(
    /!\[gif\]\(giphy\|([a-zA-Z0-9]+)(?:\|[^)]+)?\)/g,
    '<img class="reddit-comment-media-img" src="https://i.giphy.com/media/$1/giphy.gif" alt="gif" loading="lazy" />'
  );

  // Reddit image embeds: ![img](URL)
  html = html.replace(
    /!\[img\]\((https?:\/\/[^)]+)\)/g,
    '<img class="reddit-comment-media-img" src="$1" alt="image" loading="lazy" />'
  );

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;">$1</a>'
  );

  // Bare URLs (not already in an href)
  html = html.replace(
    /(?<!href="|src=")(https?:\/\/[^\s<)"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;">$1</a>'
  );

  // Reddit-style links: r/subreddit and u/username
  html = html.replace(
    /(?<!\w)\/?r\/(\w+)/g,
    '<a href="https://www.reddit.com/r/$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary);">r/$1</a>'
  );
  html = html.replace(
    /(?<!\w)\/?u\/(\w+)/g,
    '<a href="https://www.reddit.com/u/$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary);">u/$1</a>'
  );

  // Unordered lists
  html = html.replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li style="margin-left:1.25rem;">$1</li>');

  // Ordered lists
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li style="margin-left:1.25rem;">$1</li>');

  // Paragraphs: double newlines become paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p style="margin-bottom:0.5rem;">');

  // Single newlines become <br>
  html = html.replace(/\n/g, "<br>");

  // Wrap in paragraph
  html = `<p style="margin-bottom:0.5rem;">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p style="margin-bottom:0\.5rem;"><\/p>/g, "");

  return html;
}
