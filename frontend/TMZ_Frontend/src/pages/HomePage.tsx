import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Category, Promotion, Article } from '@/types';
import {
  fetchCategories,
  fetchPromotions,
  fetchLatestArticles,
  fetchAuthorsPicks,
  fetchArticlesByCategory,
} from '@/lib/api';
import { SectionHeader, LoadingState, ErrorState } from '@/components/ui/States';
import { BookmarkButton } from '@/components/articles/BookmarkButton';
import { GlowingEffect } from '@/components/articles/GlowingEffect';
import { HeroBanner } from '@/components/home/HeroBanner';
import { useAuth } from '@/lib/auth';
import { ContactSection } from '@/components/common/ContactSection';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [latest, setLatest] = useState<Article[]>([]);
  const [authorsPicks, setAuthorsPicks] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryArticles, setCategoryArticles] = useState<Record<string, Article[]>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cats, promos, latestArts, picks] = await Promise.all([
          fetchCategories(),
          fetchPromotions(),
          fetchLatestArticles(10),
          fetchAuthorsPicks(10),
        ]);
        setCategories(cats);
        setPromotions(promos);
        setLatest(latestArts);
        setAuthorsPicks(picks);

        const catArts: Record<string, Article[]> = {};
        if (cats.length > 0) {
          const firstCat = cats[0];
          const arts = await fetchArticlesByCategory(firstCat.id);
          catArts[firstCat.id] = arts;
        }
        setCategoryArticles(catArts);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading stories..." />;
  if (error) return <ErrorState message="Could not load content. Please try again." onRetry={() => window.location.reload()} />;

  const featuredCategory = categories[0];
  const remainingCategories = categories.slice(1);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleArticleClick = (articleId: string) => {
    if (user) {
      navigate(`/article/${articleId}`);
    } else {
      navigate('/auth', { state: { redirect: `/article/${articleId}` } });
    }
  };

  return (
    <div className="relative z-10 max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-8 sm:space-y-10 lg:space-y-12">
      {/* 0. EDITORIAL HERO BANNER — Static Image Card with Know More -> link */}
      <HeroBanner />

      {/* 1. PROMOTIONS CAROUSEL — top, 3s auto-slideshow */}
      {promotions.length > 0 && (
        <section id="promotions-section">
          <SectionHeader title="Promotions" />
          <PromotionCarousel promotions={promotions} intervalMs={3000} formatDate={formatDate} />
        </section>
      )}

      {/* 2. LATEST — continuous marquee with LARGE vertical cards matching CategoryPage ArticleCard */}
      {latest.length > 0 && (
        <section id="latest-section">
          <SectionHeader title="Latest" />
          <LatestMarquee articles={latest} onArticleClick={handleArticleClick} />
        </section>
      )}

      {/* 3. FEATURED CATEGORY — smaller vertical cards in a single-row horizontal carousel */}
      {featuredCategory && (categoryArticles[featuredCategory.id]?.length ?? 0) > 0 && (
        <ArticleCarouselRow
          title={featuredCategory.name}
          action="See all"
          onAction={() => navigate(`/category/${featuredCategory.slug}`)}
          articles={categoryArticles[featuredCategory.id]}
          onArticleClick={handleArticleClick}
        />
      )}

      {/* 4. AUTHOR'S PICKS — smaller vertical cards in a single-row horizontal carousel */}
      {authorsPicks.length > 0 && (
        <ArticleCarouselRow
          title="Author's Picks"
          action="See all"
          onAction={() => navigate('/authors-picks')}
          articles={authorsPicks}
          onArticleClick={handleArticleClick}
        />
      )}

      {/* 5. PROMOTIONS CAROUSEL #2 — after Author's Picks, 5s */}
      {promotions.length > 0 && (
        <section>
          <SectionHeader title="Featured Promotions" />
          <PromotionCarousel promotions={promotions} intervalMs={5000} formatDate={formatDate} />
        </section>
      )}

      {/* 6. REMAINING CATEGORIES — smaller vertical cards in single-row horizontal carousels */}
      {remainingCategories.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          onSeeAll={() => navigate(`/category/${cat.slug}`)}
          onArticleClick={handleArticleClick}
        />
      ))}

      {/* 7. CONTACT — Business Enquiry & Feedback Forms */}
      <ContactSection />
    </div>
  );
}

/* ===== Promotion Carousel (auto-slideshow, wide cards with glowing border) ===== */

function PromotionCarousel({ promotions, intervalMs, formatDate }: { promotions: Promotion[]; intervalMs: number; formatDate: (d: string | null) => string }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (promotions.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % promotions.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [promotions.length, intervalMs]);

  const scrollTo = useCallback((i: number) => {
    setIndex(i);
  }, []);

  return (
    <div className="relative">
      <div ref={trackRef} className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {promotions.map((promo) => (
            <div key={promo.id} className="min-w-full">
              <a
                href={promo.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block glass-card overflow-hidden group"
              >
                <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
                <div className="relative h-64 md:h-72 overflow-hidden">
                  {promo.image_url && (
                    <img
                      src={promo.image_url}
                      alt={promo.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-20">
                    <div className="flex items-center gap-3 mb-3">
                      {promo.date_time && (
                        <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                          <span className="text-xs text-primary">{formatDate(promo.date_time)}</span>
                        </div>
                      )}
                      <ExternalLink className="w-4 h-4 text-white/70" />
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl text-white mb-2">{promo.title}</h3>
                    <p className="text-sm text-white/80 line-clamp-2 max-w-2xl">{promo.description}</p>
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {promotions.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {promotions.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-8' : 'w-2'}`}
              style={{
                background: i === index ? 'var(--brand-primary)' : 'var(--border-strong)',
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Author's Pick & Category Card (SMALLER vertical card structure, image-dominant & sleek) ===== */

function AuthorsPickCard({ article, onClick }: { article: Article; onClick: () => void }) {
  const typeLabel = article.article_type === 'PODCAST' ? 'Podcast'
    : article.article_type === 'QUIZ' ? 'Quiz'
    : article.article_type === 'OPINION' ? 'Opinion'
    : article.article_type === 'FEATURED' ? 'Featured'
    : 'Article';

  return (
    <div
      onClick={onClick}
      className="relative glass-card overflow-hidden cursor-pointer group flex-shrink-0 snap-start w-[280px] sm:w-[310px] md:w-[330px] h-[340px] flex flex-col transition-transform duration-300 hover:scale-[1.03]"
    >
      <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
      <div className="relative h-[235px] overflow-hidden flex-shrink-0">
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full glass text-xs text-primary font-body">
          {typeLabel}
        </span>
        <div className="absolute top-3 right-3 z-20">
          <BookmarkButton articleId={article.id} size="sm" />
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-center relative z-20">
        <h3 className="font-display text-sm sm:text-[15px] font-semibold text-primary leading-snug mb-1 line-clamp-2">
          {article.title}
        </h3>
        <p className="text-xs text-muted line-clamp-1 leading-normal">
          {article.subtitle}
        </p>
      </div>
    </div>
  );
}

/* ===== Article Carousel Row with < and > Controls (One Row Only, No Marquee) ===== */

function ArticleCarouselRow({
  title,
  action,
  onAction,
  articles,
  onArticleClick,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  articles: Article[];
  onArticleClick: (id: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [articles, checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const scrollAmount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (articles.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <h2 className="font-display text-2xl md:text-3xl text-primary">{title}</h2>
        <div className="flex items-center gap-2 sm:gap-3">
          {action && (
            <button
              onClick={onAction}
              className="text-sm text-brand-primary hover:text-brand-accent transition-colors flex items-center gap-1 group mr-1 sm:mr-2 font-medium"
            >
              {action}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full flex items-center justify-center glass hover:bg-brand-accent/20 transition-all text-primary disabled:opacity-25 disabled:cursor-not-allowed shadow-sm active:scale-95"
              aria-label="Previous articles"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full flex items-center justify-center glass hover:bg-brand-accent/20 transition-all text-primary disabled:opacity-25 disabled:cursor-not-allowed shadow-sm active:scale-95"
              aria-label="Next articles"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={rowRef}
        onScroll={checkScroll}
        className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x py-3 px-1.5"
      >
        {articles.map((article) => (
          <AuthorsPickCard
            key={article.id}
            article={article}
            onClick={() => onArticleClick(article.id)}
          />
        ))}
      </div>
    </section>
  );
}

/* ===== Latest Marquee (LARGE VERTICAL cards, image-dominant & sleek) ===== */

function LatestMarquee({ articles, onArticleClick }: { articles: Article[]; onArticleClick: (id: string) => void }) {
  const typeLabel = (type: string) =>
    type === 'PODCAST' ? 'Podcast' : type === 'QUIZ' ? 'Quiz' : type === 'OPINION' ? 'Opinion' : type === 'FEATURED' ? 'Featured' : 'Article';

  const items = [...articles, ...articles];

  return (
    <div className="relative overflow-hidden py-4 sm:py-5 -my-2 sm:-my-3">
      <div className="marquee-track gap-5 py-1">
        {items.map((article, i) => (
          <div
            key={`${article.id}-${i}`}
            onClick={() => onArticleClick(article.id)}
            className="relative glass-card overflow-hidden cursor-pointer group w-[275px] sm:w-[295px] md:w-[310px] h-[385px] flex flex-col transition-transform duration-300 hover:scale-105 flex-shrink-0"
            style={{ transformOrigin: 'center' }}
          >
            <GlowingEffect borderWidth={1.5} spread={40} glow={true} className="z-30" />
            <div className="relative z-0 h-[270px] min-h-0 overflow-hidden rounded-t-[inherit] flex-shrink-0">
              {article.cover_image_url && (
                <img
                  src={article.cover_image_url}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full glass text-xs text-primary font-body">
                {typeLabel(article.article_type)}
              </span>
              <div className="absolute top-3 right-3 z-20">
                <BookmarkButton articleId={article.id} size="sm" />
              </div>
            </div>
            <div className="p-3.5 flex-1 flex flex-col justify-center relative z-20">
              <h3 className="font-display text-sm sm:text-[15px] font-semibold text-primary leading-snug mb-1 line-clamp-2">
                {article.title}
              </h3>
              <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                {article.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Category Section (uses ArticleCarouselRow) ===== */

function CategorySection({
  category,
  onSeeAll,
  onArticleClick,
}: {
  category: Category;
  onSeeAll: () => void;
  onArticleClick: (id: string) => void;
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchArticlesByCategory(category.id)
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [category.id]);

  if (!loaded) return null;
  if (articles.length === 0) return null;

  return (
    <ArticleCarouselRow
      title={category.name}
      action="See all"
      onAction={onSeeAll}
      articles={articles}
      onArticleClick={onArticleClick}
    />
  );
}

