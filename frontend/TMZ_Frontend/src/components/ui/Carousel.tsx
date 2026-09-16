import { type ReactNode, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  children: ReactNode[];
  itemsPerView?: { desktop: number; tablet: number; mobile: number };
}

export function Carousel({ children, itemsPerView = { desktop: 4, tablet: 2, mobile: 1.2 } }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-primary" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-primary" />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-2"
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="flex-shrink-0"
            style={{
              width: `calc(${100 / itemsPerView.mobile}% - ${(itemsPerView.mobile - 1) * 1.25}rem)`,
            }}
            data-tablet-width={`calc(${100 / itemsPerView.tablet}% - ${(itemsPerView.tablet - 1) * 1.25}rem)`}
            data-desktop-width={`calc(${100 / itemsPerView.desktop}% - ${(itemsPerView.desktop - 1) * 1.25}rem)`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
