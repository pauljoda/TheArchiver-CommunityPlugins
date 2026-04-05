export interface LazyFeedCardOptions {
  estimatedHeight: number;
  render: () => HTMLElement;
  renderMargin?: string;
  initiallyRendered?: boolean;
}

const DEFAULT_RENDER_MARGIN = "400px";

export class LazyFeedCard {
  private readonly options: LazyFeedCardOptions;
  private readonly root: HTMLDivElement;
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private measuredHeight: number | null = null;
  private isRendered: boolean;
  private destroyed = false;

  constructor(options: LazyFeedCardOptions) {
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

  mount(container: HTMLElement): void {
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
        threshold: 0.01,
      }
    );

    this.observer.observe(this.root);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.root.remove();
  }

  private showContent(): void {
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

  private showPlaceholder(): void {
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

  private measure(): void {
    const height = Math.ceil(this.root.getBoundingClientRect().height);
    if (height > 0) {
      this.measuredHeight = height;
    }
  }
}
