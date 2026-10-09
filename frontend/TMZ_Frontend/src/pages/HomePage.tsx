import { lazy, Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Category, Promotion, Article } from '@/types';
import { ConnectedCarousel, type CarouselItem } from '@/components/ui/connected-carousel';
import { TestimonialMarquee } from '@/components/ui/testimonial-marquee';
import {
  fetchPromotions,
  fetchLatestArticles,
  fetchCategories,
  getArticleRoute,
} from '@/lib/api';
import { SectionHeader, LoadingState, ErrorState } from '@/components/ui/States';
import { BookmarkButton } from '@/components/articles/BookmarkButton';
import { GlowingEffect } from '@/components/articles/GlowingEffect';
import { ContactSection } from '@/components/common/ContactSection';
import { canonicalUrl, removeJsonLd, upsertJsonLd } from '@/lib/seo';
import { ExternalImage } from '@/components/articles/ExternalImage';
import { PromotionCarouselBoundary } from '@/components/ui/PromotionCarouselBoundary';
import { useLanguage } from '@/lib/language';
import { getLocalizedArticleFields, useTranslatedArticle } from '@/lib/translations';
import { Loader2 } from 'lucide-react';

const StackedPromotionsCarousel = lazy(() =>
  import('@/components/ui/stacked-promotions-carousel').then((module) => ({
    default: module.StackedPromotionsCarousel,
  })),
);

export function HomePage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [latest, setLatest] = useState<Article[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [authorsPicks, setAuthorsPicks] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryArticles, setCategoryArticles] = useState<Record<string, Article[]>>({});

  const featuredTranslationSource = useMemo(() => {
    const segments: Record<string, string> = {};
    for (const promotion of promotions) {
      segments[`promotion-title-${promotion.id}`] = promotion.title;
      if (promotion.description) {
        segments[`promotion-description-${promotion.id}`] = promotion.description;
      }
    }
    for (const article of featuredArticles) {
      const localized = getLocalizedArticleFields(article, currentLang);
      const description = article.subtitle || article.summary || '';
      if (!localized.title) segments[`title-${article.id}`] = article.title;
      if (!localized.description && description) segments[`description-${article.id}`] = description;
    }
    return segments;
  }, [featuredArticles, promotions, currentLang]);
  const featuredTranslation = useTranslatedArticle(
    'homepage-featured-carousel',
    '',
    '',
    featuredTranslationSource,
    { enabled: currentLang !== 'EN' },
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);

        const [promosRes, categoriesRes, articlesRes] = await Promise.allSettled([
          fetchPromotions(),
          fetchCategories(),
          fetchLatestArticles(200, undefined, currentLang),
        ]);

        if (!mounted) return;

        if (promosRes.status === 'rejected') {
          console.error('[HomePage] Could not load promotional banners:', promosRes.reason);
        }
        const promos = promosRes.status === 'fulfilled' ? promosRes.value : [];
        const liveCategories = categoriesRes.status === 'fulfilled' ? categoriesRes.value : null;
        const articles = articlesRes.status === 'fulfilled' ? articlesRes.value : null;

        if (!liveCategories || !articles) {
          if (categoriesRes.status === 'rejected') throw categoriesRes.reason;
          if (articlesRes.status === 'rejected') throw articlesRes.reason;
          throw new Error('Could not load homepage content from Supabase.');
        }

        const liveCategoryArticles = Object.fromEntries(
          liveCategories.map((category) => [
            category.id,
            articles.filter((article) => article.category_id === category.id).slice(0, 4),
          ]),
        );

        setCategories(liveCategories);
        setPromotions(promos);
        setLatest(articles.slice(0, 10));
        setFeaturedArticles(articles.filter((article) => article.is_featured && article.cover_image_url).slice(0, 6));
        setAuthorsPicks(articles.filter((article) => article.is_authors_pick).slice(0, 6));
        setCategoryArticles(liveCategoryArticles);
        setError(false);
      } catch (err) {
        console.error('[HomePage] Load error:', err);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [currentLang]);

  useEffect(() => {
    const listedCategories = categories.filter((category) => (categoryArticles[category.id]?.length ?? 0) > 0);
    if (listedCategories.length === 0) {
      removeJsonLd('home-itemlist-jsonld');
      return;
    }

    upsertJsonLd('home-itemlist-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: listedCategories.map((category, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: category.name,
        url: canonicalUrl(`/category/${category.slug}`),
      })),
    });
    return () => removeJsonLd('home-itemlist-jsonld');
  }, [categories, categoryArticles]);

  if (loading) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="w-full">
          <LoadingState message="Loading stories..." />
        </section>
      </div>
    );
  }
  if (error) return <ErrorState message="Could not load content. Please try again." onRetry={() => window.location.reload()} />;

  const featuredCategory = categories[0];
  const remainingCategories = categories.slice(1);

  const handleArticleClick = (article: Article) => {
    navigate(getArticleRoute(article));
  };

  const carouselItems: CarouselItem[] = [
    ...promotions.map((promotion) => ({
      tag: '#Promotion',
      titleLine1: featuredTranslation.segments[`promotion-title-${promotion.id}`] || promotion.title,
      desc: featuredTranslation.segments[`promotion-description-${promotion.id}`] || promotion.description,
      img: promotion.image_url,
      ctaText: currentLang === 'EN' ? 'Learn More' : currentLang === 'TE' ? 'మరింత తెలుసుకోండి' : 'और जानें',
      ctaUrl: promotion.external_url || '#',
    })),
    ...featuredArticles.map((article) => {
      const localized = getLocalizedArticleFields(article, currentLang);
      return {
        tag: '#FeaturedStory',
        titleLine1: localized.title || featuredTranslation.segments[`title-${article.id}`] || article.title,
        desc: localized.description
          || featuredTranslation.segments[`description-${article.id}`]
          || article.subtitle
          || article.summary
          || '',
        img: article.cover_image_url || '',
        ctaText: currentLang === 'EN' ? 'Read Story' : currentLang === 'TE' ? 'కథ చదవండి' : 'लेख पढ़ें',
        ctaUrl: getArticleRoute(article),
      };
    }),
  ];
  const promotionCarouselItems: CarouselItem[] = promotions.map((promotion) => ({
    tag: '#Promotion',
    titleLine1: featuredTranslation.segments[`promotion-title-${promotion.id}`] || promotion.title,
    desc: featuredTranslation.segments[`promotion-description-${promotion.id}`] || promotion.description,
    img: promotion.image_url,
    ctaText: currentLang === 'EN' ? 'Learn More' : currentLang === 'TE' ? 'మరింత తెలుసుకోండి' : 'और जानें',
    ctaUrl: promotion.external_url || '#',
  }));
  const handleCarouselCta = (item: CarouselItem) => {
    const article = featuredArticles.find((candidate) => getArticleRoute(candidate) === item.ctaUrl);
    if (article) {
      handleArticleClick(article);
    } else if (item.ctaUrl && item.ctaUrl !== '#') {
      window.open(item.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div lang={currentLang.toLowerCase()} className="relative z-10 mx-auto w-full max-w-7xl space-y-[50px] md:space-y-[100px] px-4 sm:px-6 lg:px-8">
      {/* Dynamic promotional banners and featured published articles */}
      {carouselItems.length > 0 && (
        <section className="w-full">
          <PromotionCarouselBoundary items={carouselItems} onCtaClick={handleCarouselCta}>
            <ConnectedCarousel
              items={carouselItems}
              autoplay
              autoplayDelay={5000}
              onCtaClick={handleCarouselCta}
            />
          </PromotionCarouselBoundary>
        </section>
      )}

      <div className="space-y-[50px] md:space-y-[100px]">
        {/* Latest articles */}
        {latest.length > 0 && (
          <section id="latest-section">
            <SectionHeader title="Latest" action="View All" onAction={() => navigate('/latest')} />
            <LatestMarquee articles={latest} onArticleClick={handleArticleClick} />
          </section>
        )}

        {/* Featured category */}
        {featuredCategory && (categoryArticles[featuredCategory.id]?.length ?? 0) > 0 && (
          <ArticleCarouselRow
            title={featuredCategory.name}
            action="See all"
            onAction={() => navigate(`/category/${featuredCategory.slug}`)}
            articles={categoryArticles[featuredCategory.id]}
            onArticleClick={handleArticleClick}
          />
        )}

        {/* Author's picks */}
        {authorsPicks.length > 0 && (
          <ArticleCarouselRow
            title="Author's Picks"
            action="See all"
            onAction={() => navigate('/authors-picks')}
            articles={authorsPicks}
            onArticleClick={handleArticleClick}
          />
        )}

        {/* Remaining categories */}
        {remainingCategories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            articles={categoryArticles[cat.id] ?? []}
            onSeeAll={() => navigate(`/category/${cat.slug}`)}
            onArticleClick={handleArticleClick}
          />
        ))}
      </div>

      {promotionCarouselItems.length > 0 && (
        <section className="w-full">
          <PromotionCarouselBoundary items={promotionCarouselItems} onCtaClick={handleCarouselCta}>
            <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />}>
              <StackedPromotionsCarousel
                items={promotionCarouselItems}
                autoplay
                autoplayDelay={5000}
                onCtaClick={handleCarouselCta}
              />
            </Suspense>
          </PromotionCarouselBoundary>
        </section>
      )}

      <section className="w-full">
        <TestimonialMarquee />
      </section>

      {/* Contact */}
      <section className="w-full">
        <ContactSection />
      </section>
    </div>
  );
}

/* ===== Author's Pick & Category Card (SMALLER vertical card structure, image-dominant & sleek) ===== */

function AuthorsPickCard({ article, onClick }: { article: Article; onClick: () => void }) {
  const { currentLang } = useLanguage();
  const { title: availableTitle, description: availableDescription } =
    getLocalizedArticleFields(article, currentLang);
  const sourceDescription = article.subtitle || article.summary || '';
  const translated = useTranslatedArticle(
    article.id,
    availableTitle ? '' : article.title,
    availableDescription ? '' : sourceDescription,
    {},
    { enabled: currentLang !== 'EN', lazy: true },
  );
  const title = availableTitle || translated.title || article.title;
  const description = availableDescription || translated.content || sourceDescription;
  const typeLabel = article.article_type === 'PODCAST' ? 'Podcast'
    : article.article_type === 'QUIZ' ? 'Quiz'
    : article.article_type === 'OPINION' ? 'Opinion'
    : article.article_type === 'FEATURED' ? 'Featured'
    : 'Article';

  return (
    <div
      onClick={onClick}
      lang={currentLang.toLowerCase()}
      className="relative glass-card overflow-visible !rounded-md shadow-md transition-all duration-300 ease-out hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] cursor-pointer group flex-shrink-0 snap-start w-[280px] sm:w-[310px] md:w-[330px] h-[340px] flex flex-col hover:scale-[1.03]"
      ref={translated.ref}
      aria-busy={translated.isLoading}
    >
      <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
      <div className="relative h-[235px] overflow-hidden !rounded-t-md flex-shrink-0">
        <ExternalImage
          src={article.cover_image_url}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          width={640}
          height={560}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full glass text-xs text-primary font-body">
          {typeLabel}
        </span>
        <div className="absolute top-3 right-3 z-20">
          <BookmarkButton articleId={article.id} size="sm" />
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-center relative z-20">
        <div className="flex items-start gap-1.5">
          <h3 className="font-display text-sm sm:text-[15px] font-semibold text-primary leading-relaxed mb-1 line-clamp-2">
            {title}
          </h3>
          {translated.isLoading && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-label="Translating article" />}
        </div>
        <p className="text-xs text-muted line-clamp-1 leading-normal">
          {description}
        </p>
        {translated.error && <span className="text-[10px] text-amber-600 dark:text-amber-400" role="status">Translation unavailable</span>}
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
  onArticleClick: (article: Article) => void;
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
      <div className="flex items-center justify-between text-left mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">{title}</h2>
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
        className="flex gap-4 sm:gap-5 no-scrollbar scrollbar-none overflow-x-auto scroll-smooth snap-x pt-2 pb-8 pl-0 pr-6"
      >
        {articles.map((article) => (
          <AuthorsPickCard
            key={article.id}
            article={article}
            onClick={() => onArticleClick(article)}
          />
        ))}
      </div>
    </section>
  );
}

/* ===== Latest Marquee (LARGE VERTICAL cards, image-dominant & sleek) ===== */

function LatestMarquee({ articles, onArticleClick }: { articles: Article[]; onArticleClick: (article: Article) => void }) {
  const typeLabel = (type: string) =>
    type === 'PODCAST' ? 'Podcast' : type === 'QUIZ' ? 'Quiz' : type === 'OPINION' ? 'Opinion' : type === 'FEATURED' ? 'Featured' : 'Article';

  const items = [...articles, ...articles];

  return (
    <div className="relative overflow-hidden py-8 sm:py-9">
      <div className="marquee-track gap-5 py-2">
        {items.map((article, i) => (
          <LatestMarqueeCard
            key={`${article.id}-${i}`}
            article={article}
            index={i}
            onClick={() => onArticleClick(article)}
            typeLabel={typeLabel(article.article_type)}
          />
        ))}
      </div>
    </div>
  );
}

function LatestMarqueeCard({
  article,
  index,
  onClick,
  typeLabel,
}: {
  article: Article;
  index: number;
  onClick: () => void;
  typeLabel: string;
}) {
  const { currentLang } = useLanguage();
  const { title: localizedTitle, description: localizedDescription } =
    getLocalizedArticleFields(article, currentLang);
  const sourceDescription = article.subtitle || article.summary || '';
  const translated = useTranslatedArticle(
    article.id,
    localizedTitle ? '' : article.title,
    localizedDescription ? '' : sourceDescription,
    {},
    { enabled: currentLang !== 'EN', lazy: true },
  );
  const title = localizedTitle || translated.title || article.title;
  const description = localizedDescription || translated.content || sourceDescription;

  return (
    <div
      onClick={onClick}
      lang={currentLang.toLowerCase()}
      ref={translated.ref}
      className="relative glass-card overflow-visible !rounded-md shadow-md transition-all duration-300 ease-out hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] cursor-pointer group w-[275px] sm:w-[295px] md:w-[310px] h-[385px] flex flex-col hover:scale-105 flex-shrink-0"
      style={{ transformOrigin: 'center' }}
      aria-busy={translated.isLoading}
    >
      <GlowingEffect borderWidth={1.5} spread={40} glow={true} className="z-30" />
      <div className="relative z-0 h-[270px] min-h-0 overflow-hidden !rounded-t-md flex-shrink-0">
        <ExternalImage
          src={article.cover_image_url}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          fallbackSrc="/modern_stories_hero.webp"
          width={640}
          height={560}
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'auto'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full glass text-xs text-primary font-body">
          {typeLabel}
        </span>
        <div className="absolute top-3 right-3 z-20">
          <BookmarkButton articleId={article.id} size="sm" />
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-center relative z-20">
        <div className="flex items-start gap-1.5">
          <h3 className="font-display text-sm sm:text-[15px] font-semibold text-primary leading-relaxed mb-1 line-clamp-2">
            {title}
          </h3>
          {translated.isLoading && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-label="Translating article" />}
        </div>
        <p className="text-xs text-muted line-clamp-2 leading-relaxed">{description}</p>
        {translated.error && <span className="text-[10px] text-amber-600 dark:text-amber-400" role="status">Translation unavailable</span>}
      </div>
    </div>
  );
}
/* ===== Category Section (uses ArticleCarouselRow) ===== */

function CategorySection({
  category,
  articles,
  onSeeAll,
  onArticleClick,
}: {
  category: Category;
  articles: Article[];
  onSeeAll: () => void;
  onArticleClick: (article: Article) => void;
}) {
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
