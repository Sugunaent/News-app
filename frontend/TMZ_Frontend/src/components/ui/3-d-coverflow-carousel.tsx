"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export interface CarouselItem {
  tag?: string;
  titleLine1: string;
  titleLine2?: string;
  desc?: string;
  img: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface CoverFlowCarouselProps {
  items?: CarouselItem[];
  autoplay?: boolean;
  autoplayDelay?: number;
  className?: string;
  onCtaClick?: (item: CarouselItem) => void;
}

export const defaultDishes: CarouselItem[] = [
  {
    tag: "#Promotion",
    titleLine1: "INDIRA SARES",
    desc: "sdfasfdmt",
    img: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=1000&auto=format&fit=crop",
    ctaText: "LEARN MORE",
    ctaUrl: "#",
  },
  {
    tag: "#Featured",
    titleLine1: "INDIRA AI ML WORKSHOP",
    desc: "fasl;orafas.,;falmpe",
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop",
    ctaText: "LEARN MORE",
    ctaUrl: "#",
  },
];

export function CoverFlowCarousel({
  items = defaultDishes,
  autoplay = true,
  autoplayDelay = 5000,
  className = "",
  onCtaClick,
}: CoverFlowCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);
  const total = items.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx % total);
  };

  useEffect(() => {
    if (!autoplay || isHovered || total <= 1) return;
    const interval = setInterval(nextSlide, autoplayDelay);
    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, isHovered, nextSlide, total]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > 40) {
      if (diffX < 0) nextSlide();
      else prevSlide();
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section
      className={`relative w-full pt-0 pb-2 md:py-2 flex items-center justify-center overflow-hidden bg-transparent ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full max-w-7xl mx-auto px-2 sm:px-4 z-10 flex flex-col items-center">
        {/* Carousel Stage - Desktop Size Expanded */}
        <div
          className="relative w-full h-[450px] md:h-[540px] lg:h-[560px] flex justify-center items-center"
          style={{ perspective: "1200px" }}
        >
          {items.map((item, idx) => {
            const offset = (idx - currentIndex + total) % total;

            let transform = "translateX(0px) scale(0.4) rotateY(0deg)";
            let offsetClass = "";
            let opacity = 0;
            let zIndex = 0;
            let filter = "brightness(0.7) blur(2px)";
            let isCenter = false;

            if (offset === 0) {
              isCenter = true;
              transform = "translateX(0px) scale(1) rotateY(0deg)";
              opacity = 1;
              zIndex = 30;
              filter = "brightness(1)";
            } else if (offset === 1) {
              transform = "translateX(var(--slide-offset)) scale(0.82) rotateY(-18deg)";
              offsetClass = "[--slide-offset:320px] md:[--slide-offset:580px]";
              opacity = 0.55;
              zIndex = 20;
              filter = "brightness(0.85)";
            } else if (offset === total - 1) {
              transform = "translateX(calc(-1 * var(--slide-offset))) scale(0.82) rotateY(18deg)";
              offsetClass = "[--slide-offset:320px] md:[--slide-offset:580px]";
              opacity = 0.55;
              zIndex = 20;
              filter = "brightness(0.85)";
            }

            return (
              <div
                key={idx}
                onClick={() => !isCenter && goToSlide(idx)}
                className={`absolute w-[330px] sm:w-[380px] md:w-[min(1100px,calc(100vw-6rem))] h-[420px] md:h-[500px] lg:h-[520px] rounded-3xl overflow-hidden shadow-xl transition-all duration-700 ease-out bg-white/95 dark:bg-[#0b0f17]/95 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md ${offsetClass}`}
                style={{
                  transform,
                  opacity,
                  zIndex,
                  filter,
                  transformOrigin: "center center",
                  boxShadow: isCenter
                    ? "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 30px rgba(15, 82, 186, 0.12)"
                    : "0 10px 25px rgba(0,0,0,0.08)",
                  cursor: isCenter ? "default" : "pointer",
                }}
              >
                {/* Responsive Main Container */}
                <div className="relative w-full h-full flex flex-col md:flex-row items-center justify-between p-5 md:p-8 gap-6">
                  
                  {/* Image Block */}
                  <div className="relative w-full md:w-1/2 h-[200px] md:h-full rounded-2xl overflow-hidden bg-slate-100/80 dark:bg-black/40 flex items-center justify-center p-3 border border-slate-200/60 dark:border-slate-800/50">
                    <img
                      src={item.img}
                      alt={item.titleLine1}
                      className="max-w-full max-h-full object-contain transform hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Content Block with Light/Dark Support */}
                  <div
                    className={`relative w-full md:w-1/2 h-full flex flex-col justify-center text-center md:text-left z-20 transition-all duration-500 ${
                      isCenter
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 translate-y-4 pointer-events-none"
                    }`}
                  >
                    {/* Tag Header */}
                    <div className="flex items-center justify-center md:justify-start w-full mb-3">
                      <span className="inline-block text-xs font-semibold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/60 px-3.5 py-1 rounded-full">
                        {item.tag || "#Promotion"}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="flex flex-col items-center md:items-start gap-1.5 my-auto">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide text-slate-900 dark:text-white m-0">
                        {item.titleLine1}
                      </h2>

                      <div className="w-14 h-[3px] bg-blue-600 rounded-full my-1 shadow-[0_0_10px_rgba(37,99,235,0.6)]" />

                      {item.desc && (
                        <p className="text-xs sm:text-sm italic text-slate-600 dark:text-slate-300 max-w-[300px] md:max-w-full line-clamp-3">
                          {item.desc}
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2">
                      <a
                        href={item.ctaUrl || "#"}
                        onClick={(e) => {
                          if (onCtaClick) {
                            e.preventDefault();
                            onCtaClick(item);
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 font-body text-xs font-bold tracking-widest uppercase text-white shadow-md hover:shadow-blue-500/20 transition-all active:scale-95"
                      >
                        <span>{item.ctaText || "LEARN MORE"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center justify-center gap-6 mt-1 z-40">
          <button
            onClick={prevSlide}
            aria-label="Previous item"
            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors p-1 active:scale-90"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-8 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                    : "w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            aria-label="Next item"
            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors p-1 active:scale-90"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      </div>
    </section>
  );
}

export const Component = CoverFlowCarousel;
export default CoverFlowCarousel;