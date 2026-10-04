import { useNavigate } from 'react-router-dom';
import type { Article } from '@/types';
import { getArticleRoute } from '@/lib/api';
import { BookmarkButton } from './BookmarkButton';
import { GlowingEffect } from './GlowingEffect';
import { ExternalImage } from './ExternalImage';
import { useLanguage } from '@/lib/language';
import { getLocalizedArticleFields, useTranslatedArticle } from '@/lib/translations';
import { Loader2 } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  showType?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export function ArticleCard({ article, showType = true, variant = 'default' }: ArticleCardProps) {
  const navigate = useNavigate();
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

  const handleClick = () => {
    navigate(getArticleRoute(article));
  };

  const typeLabel = article.article_type === 'PODCAST' ? 'Podcast'
    : article.article_type === 'QUIZ' ? 'Quiz'
    : article.article_type === 'OPINION' ? 'Opinion'
    : article.article_type === 'FEATURED' ? 'Featured'
    : 'Article';

  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        className="relative glass-card w-full max-w-full min-w-0 overflow-visible !rounded-md shadow-md transition-all duration-300 ease-out hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] cursor-pointer group flex flex-col"
        lang={currentLang.toLowerCase()}
        ref={translated.ref}
        aria-busy={translated.isLoading}
      >
        <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
        <div className="relative h-44 overflow-hidden !rounded-t-md flex-shrink-0">
          <ExternalImage
            src={article.cover_image_url}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 z-20">
            <BookmarkButton articleId={article.id} size="sm" />
          </div>
          {showType && (
            <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full glass text-xs text-primary font-body">
              {typeLabel}
            </span>
          )}
        </div>
        <div className="p-3.5 relative z-20 flex flex-col justify-center">
          <div className="flex items-start gap-1.5">
            <h3 className="min-w-0 break-words font-display text-sm sm:text-base font-semibold text-primary leading-relaxed mb-1 line-clamp-2">{title}</h3>
            {translated.isLoading && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-label="Translating article" />}
          </div>
          <p className="min-w-0 break-words text-xs text-muted line-clamp-1 leading-relaxed">{description}</p>
          {translated.error && <span className="text-[10px] text-amber-600 dark:text-amber-400" role="status">Translation unavailable</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="relative glass-card w-full max-w-full min-w-0 overflow-visible !rounded-md shadow-md transition-all duration-300 ease-out hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] cursor-pointer group h-full flex flex-col"
      lang={currentLang.toLowerCase()}
      ref={translated.ref}
      aria-busy={translated.isLoading}
    >
      <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
      <div className="relative h-64 sm:h-72 md:h-80 overflow-hidden !rounded-t-md flex-shrink-0">
        <ExternalImage
          src={article.cover_image_url}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 right-3 z-20">
          <BookmarkButton articleId={article.id} size="sm" />
        </div>
        {showType && (
          <span className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full glass text-xs text-primary font-body">
            {typeLabel}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col justify-center relative z-20">
        <div className="flex items-start gap-1.5">
          <h3 className="min-w-0 break-words font-display text-base sm:text-lg font-semibold text-primary leading-relaxed mb-1 line-clamp-2">{title}</h3>
          {translated.isLoading && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted" aria-label="Translating article" />}
        </div>
        <p className="min-w-0 break-words text-xs sm:text-sm text-muted line-clamp-2 leading-relaxed">{description}</p>
        {translated.error && <span className="mt-1 text-[10px] text-amber-600 dark:text-amber-400" role="status">Translation unavailable</span>}
      </div>
    </div>
  );
}
