import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CarouselItem } from './connected-carousel';

interface StackedPromotionsCarouselProps {
  items: CarouselItem[];
  autoplay?: boolean;
  autoplayDelay?: number;
  className?: string;
  onCtaClick?: (item: CarouselItem) => void;
}

export function StackedPromotionsCarousel({
  items,
  autoplay = true,
  autoplayDelay = 5000,
  className = '',
  onCtaClick,
}: StackedPromotionsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);
  const total = items.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % total);
  }, [total]);

  const previousSlide = useCallback(() => {
    setCurrentIndex((index) => (index - 1 + total) % total);
  }, [total]);

  const goToSlide = (index: number) => setCurrentIndex(index % total);

  useEffect(() => {
    if (!autoplay || isHovered || total < 2) return;
    const timer = window.setInterval(nextSlide, autoplayDelay);
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, nextSlide, total]);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(total - 1, 0)));
  }, [total]);

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) nextSlide();
      else previousSlide();
    }
  };

  if (total === 0) return null;

  return (
    <section
      aria-labelledby="promotions-heading"
      className={`w-full bg-transparent py-0 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="mx-auto mb-6 w-full max-w-7xl px-4 text-center md:text-left">
        <h2
          id="promotions-heading"
          className="font-['Momo_Trust_Display'] text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl"
        >
          Promotions
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 md:text-sm">
          Explore current events, deals, and featured highlights.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-2 sm:px-4">
        <div
          className="relative flex h-[480px] w-full items-center justify-center sm:h-[500px] md:h-[520px]"
          style={{ perspective: '1200px' }}
        >
          {items.map((item, index) => {
            const offset = (index - currentIndex + total) % total;
            let transform = 'translateX(0px) translateY(100px) scale(0.6) rotate(0deg)';
            let opacity = 0;
            let zIndex = 0;
            let isActive = false;
            let offsetClass = '';

            if (offset === 0) {
              isActive = true;
              transform = 'translateX(0px) translateY(0px) scale(1) rotate(0deg)';
              opacity = 1;
              zIndex = 40;
            } else if (offset === 1) {
              transform = 'translateX(var(--stack-offset)) translateY(30px) scale(0.9) rotate(8deg)';
              offsetClass = '[--stack-offset:160px] md:[--stack-offset:240px]';
              opacity = 0.85;
              zIndex = 30;
            } else if (offset === total - 1) {
              transform = 'translateX(calc(-1 * var(--stack-offset))) translateY(30px) scale(0.9) rotate(-8deg)';
              offsetClass = '[--stack-offset:160px] md:[--stack-offset:240px]';
              opacity = 0.85;
              zIndex = 30;
            } else if (offset === 2 && total > 3) {
              transform = 'translateX(var(--stack-offset)) translateY(70px) scale(0.78) rotate(16deg)';
              offsetClass = '[--stack-offset:280px] md:[--stack-offset:420px]';
              opacity = 0.5;
              zIndex = 20;
            } else if (offset === total - 2 && total > 3) {
              transform = 'translateX(calc(-1 * var(--stack-offset))) translateY(70px) scale(0.78) rotate(-16deg)';
              offsetClass = '[--stack-offset:280px] md:[--stack-offset:420px]';
              opacity = 0.5;
              zIndex = 20;
            }

            return (
              <article
                key={`${item.titleLine1}-${index}`}
                onClick={() => !isActive && goToSlide(index)}
                className={`group absolute h-[400px] w-[280px] select-none overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl transition-all duration-700 sm:h-[430px] sm:w-[320px] md:h-[450px] md:w-[360px] dark:border-slate-700/60 dark:bg-slate-900 ${offsetClass}`}
                style={{ transform, opacity, zIndex, transformOrigin: 'bottom center', cursor: isActive ? 'default' : 'pointer' }}
              >
                <img
                  src={item.img}
                  alt={item.titleLine1}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-colors duration-500 dark:from-black/95 dark:via-black/50 dark:to-black/20" />
                {item.tag && (
                  <div className="absolute left-4 top-4 z-10">
                    <span className="rounded-full bg-white/90 px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-900 shadow-md backdrop-blur">
                      {item.tag}
                    </span>
                  </div>
                )}
                <div
                  className={`absolute bottom-0 left-0 right-0 z-20 flex flex-col items-start gap-2 p-5 text-left transition-all duration-500 sm:p-6 ${
                    isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-80'
                  }`}
                >
                  <h3 className="text-xl font-black uppercase leading-tight tracking-wide text-white drop-shadow-md sm:text-2xl">
                    {item.titleLine1}
                  </h3>
                  {item.desc && (
                    <p className="line-clamp-2 text-xs font-normal text-slate-200 drop-shadow sm:text-sm">
                      {item.desc}
                    </p>
                  )}
                  <div className="w-full pt-2">
                    <a
                      href={item.ctaUrl || '#'}
                      onClick={(event) => {
                        if (!onCtaClick) return;
                        event.preventDefault();
                        onCtaClick(item);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/20 px-5 py-2.5 font-body text-xs font-bold uppercase tracking-wider text-white backdrop-blur transition-all duration-300 hover:bg-white hover:text-black active:scale-95"
                    >
                      <span>{item.ctaText || 'Learn More'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {total > 1 && (
          <div className="z-40 mt-4 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous promotion"
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center justify-center gap-2">
              {items.map((item, index) => (
                <button
                  key={`${item.titleLine1}-dot-${index}`}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to promotion ${index + 1}`}
                  aria-current={index === currentIndex ? 'true' : undefined}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]'
                      : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next promotion"
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default StackedPromotionsCarousel;
