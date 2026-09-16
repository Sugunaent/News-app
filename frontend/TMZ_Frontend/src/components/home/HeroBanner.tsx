import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GlowingEffect } from '@/components/articles/GlowingEffect';
import { type HeroConfig, DEFAULT_HERO_CONFIG, getStoredHeroConfig } from '@/lib/api';

export function HeroBanner() {
  const [config, setConfig] = useState<HeroConfig>(getStoredHeroConfig);

  useEffect(() => {
    // Initial fetch
    setConfig(getStoredHeroConfig());

    // Listen for live updates from admin without requiring full page reload
    const handleUpdate = (e: CustomEvent<HeroConfig>) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        setConfig(getStoredHeroConfig());
      }
    };

    window.addEventListener('tms_hero_config_updated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('tms_hero_config_updated', handleUpdate as EventListener);
    };
  }, []);

  const destinationUrl = config.linkUrl || '/about';

  return (
    <section className="relative w-full overflow-hidden rounded-3xl glass-card border border-border-default shadow-xl group">
      {/* Hero Image Container */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[2.4/1] min-h-[240px] sm:min-h-[320px] md:min-h-[380px] lg:min-h-[420px] max-h-[520px] overflow-hidden rounded-3xl bg-surface-secondary">
        <Link
          to={destinationUrl}
          className="block w-full h-full relative cursor-pointer group/hero rounded-3xl overflow-hidden"
          aria-label="Hero banner - Know more"
        >
          <img
            src={config.imageUrl || DEFAULT_HERO_CONFIG.imageUrl}
            alt="Hero Banner"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover/hero:scale-[1.03]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_HERO_CONFIG.imageUrl;
            }}
          />

          {/* Subtle bottom vignette to ensure the Know More button always pops */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none transition-opacity duration-300 group-hover/hero:opacity-80" />

          {/* Glowing effect on hero image */}
          <GlowingEffect borderWidth={2} spread={50} glow={true} className="z-20 pointer-events-none" />

          {/* "Know more ->" Clickable Component situated on the image */}
          <div className="absolute bottom-5 right-5 sm:bottom-7 sm:right-8 z-30 pointer-events-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs sm:text-sm font-medium border border-white/25 hover:border-white/50 shadow-2xl transition-all duration-300 group-hover/hero:border-white/60 group-hover/hero:bg-black/80">
              <span>Know more</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white transition-transform duration-300 group-hover/hero:translate-x-1" />
            </span>
          </div>
        </Link>
      </div>
      {/* Glowing effect on outer banner border */}
      <GlowingEffect borderWidth={2} spread={50} glow={true} className="z-20 pointer-events-none" />
    </section>
  );
}

