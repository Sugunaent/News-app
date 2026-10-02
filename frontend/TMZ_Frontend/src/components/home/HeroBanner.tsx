import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GlowingEffect } from '@/components/articles/GlowingEffect';
import { type HeroConfig, DEFAULT_HERO_CONFIG, getStoredHeroConfig, fetchHeroConfig } from '@/lib/api';

export function HeroBanner() {
  const [config, setConfig] = useState<HeroConfig>(DEFAULT_HERO_CONFIG);
  const [imageReady, setImageReady] = useState(false);

  const preloadImage = (src: string): Promise<boolean> => new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });

  useEffect(() => {
    let mounted = true;
    const applyConfigWhenImageReady = async (nextConfig: HeroConfig) => {
      const candidateUrl = nextConfig.imageUrl || DEFAULT_HERO_CONFIG.imageUrl;
      const loaded = await preloadImage(candidateUrl);
      const safeConfig = loaded
        ? { ...nextConfig, imageUrl: candidateUrl }
        : { ...nextConfig, imageUrl: DEFAULT_HERO_CONFIG.imageUrl };

      if (!mounted) return;
      if (!loaded && safeConfig.imageUrl !== candidateUrl) {
        await preloadImage(safeConfig.imageUrl);
        if (!mounted) return;
      }
      setConfig(safeConfig);
      setImageReady(true);
    };

    const loadFreshConfig = async () => {
      try {
        const nextConfig = await fetchHeroConfig();
        await applyConfigWhenImageReady(nextConfig);
      } catch {
        await applyConfigWhenImageReady(getStoredHeroConfig());
      }
    };

    void loadFreshConfig();

    const handleUpdate = (e: CustomEvent<HeroConfig>) => {
      void applyConfigWhenImageReady(e.detail || getStoredHeroConfig());
    };

    window.addEventListener('tms_hero_config_updated', handleUpdate as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('tms_hero_config_updated', handleUpdate as EventListener);
    };
  }, []);

  const destinationUrl = config.linkUrl || '/about';
  const heroImageUrl = config.imageUrl || DEFAULT_HERO_CONFIG.imageUrl;

  return (
    <section className="relative w-full overflow-hidden rounded-3xl glass-card border border-border-default shadow-xl group">
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[2.4/1] min-h-[240px] sm:min-h-[320px] md:min-h-[380px] lg:min-h-[420px] max-h-[520px] overflow-hidden rounded-3xl bg-surface-secondary">
        {!imageReady ? (
          <div className="flex h-full min-h-[240px] items-end bg-surface-secondary p-6 sm:min-h-[320px] md:min-h-[380px] lg:min-h-[420px]" aria-label="Loading current hero image" role="img">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-brand-primary/10" />
          </div>
        ) : (
        <Link
          to={destinationUrl}
          className="block w-full h-full relative cursor-pointer group/hero rounded-3xl overflow-hidden"
          aria-label={`${config.title} — ${config.linkText}`}
        >
          <img
            src={heroImageUrl}
            alt={config.title || 'The Modern Stories editorial banner'}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover/hero:scale-[1.03]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_HERO_CONFIG.imageUrl;
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none transition-opacity duration-300 group-hover/hero:opacity-80" />

          <div className="absolute bottom-5 left-5 right-36 z-10 max-w-3xl sm:bottom-8 sm:left-8 sm:right-56">
            <h1 className="font-display text-2xl font-semibold leading-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
              {config.title}
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm leading-relaxed text-white/90 drop-shadow sm:block md:text-base">
              {config.subtitle}
            </p>
          </div>

          <GlowingEffect borderWidth={2} spread={50} glow={true} className="z-20 pointer-events-none" />

          <div className="absolute bottom-5 right-5 sm:bottom-7 sm:right-8 z-30 pointer-events-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs sm:text-sm font-medium border border-white/25 hover:border-white/50 shadow-2xl transition-all duration-300 group-hover/hero:border-white/60 group-hover/hero:bg-black/80">
              <span>{config.linkText || 'Know more'}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white transition-transform duration-300 group-hover/hero:translate-x-1" />
            </span>
          </div>
        </Link>
        )}
      </div>
      <GlowingEffect borderWidth={2} spread={50} glow={true} className="z-20 pointer-events-none" />
    </section>
  );
}

