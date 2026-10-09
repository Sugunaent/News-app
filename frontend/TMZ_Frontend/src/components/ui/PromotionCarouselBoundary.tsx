import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { CarouselItem } from './connected-carousel';

interface PromotionCarouselBoundaryProps {
  items: CarouselItem[];
  children: ReactNode;
  onCtaClick?: (item: CarouselItem) => void;
}

interface PromotionCarouselBoundaryState {
  hasError: boolean;
}

export class PromotionCarouselBoundary extends Component<
  PromotionCarouselBoundaryProps,
  PromotionCarouselBoundaryState
> {
  state: PromotionCarouselBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PromotionCarouselBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PromotionCarousel] Rendering failed; showing link fallback:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {this.props.items.map((item, index) => (
          <a
            key={`${item.titleLine1}-${index}`}
            href={item.ctaUrl || '#'}
            target={item.tag === '#Promotion' ? '_blank' : undefined}
            rel={item.tag === '#Promotion' ? 'sponsored noopener noreferrer' : undefined}
            onClick={(event) => {
              if (!this.props.onCtaClick) return;
              event.preventDefault();
              this.props.onCtaClick(item);
            }}
            className="group relative flex min-h-64 flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-lg"
          >
            {item.img && (
              <img
                src={item.img}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-65 transition-opacity group-hover:opacity-80"
                loading="lazy"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <span className="relative text-xs font-semibold uppercase tracking-wide">{item.tag}</span>
            <span className="relative mt-2 text-xl font-bold">{item.titleLine1}</span>
            {item.desc && <span className="relative mt-1 line-clamp-3 text-sm text-white/80">{item.desc}</span>}
            <span className="relative mt-4 text-sm font-semibold">{item.ctaText || 'Learn More'} →</span>
          </a>
        ))}
      </div>
    );
  }
}
