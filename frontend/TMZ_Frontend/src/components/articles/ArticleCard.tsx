import { useNavigate } from 'react-router-dom';
import type { Article } from '@/types';
import { BookmarkButton } from './BookmarkButton';
import { GlowingEffect } from './GlowingEffect';
import { useAuth } from '@/lib/auth';

interface ArticleCardProps {
  article: Article;
  showType?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export function ArticleCard({ article, showType = true, variant = 'default' }: ArticleCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (user) {
      navigate(`/article/${article.id}`);
    } else {
      navigate('/auth', { state: { redirect: `/article/${article.id}` } });
    }
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
        className="relative glass-card overflow-hidden cursor-pointer group flex flex-col"
      >
        <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
        <div className="relative h-44 overflow-hidden flex-shrink-0">
          {article.cover_image_url && (
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          )}
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
          <h3 className="font-display text-sm sm:text-base font-semibold text-primary leading-snug mb-1 line-clamp-2">{article.title}</h3>
          <p className="text-xs text-muted line-clamp-1">{article.subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="relative glass-card overflow-hidden cursor-pointer group h-full flex flex-col"
    >
      <GlowingEffect borderWidth={1.5} spread={40} glow={true} />
      <div className="relative h-64 sm:h-72 md:h-80 overflow-hidden flex-shrink-0">
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
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
        <h3 className="font-display text-base sm:text-lg font-semibold text-primary leading-snug mb-1 line-clamp-2">{article.title}</h3>
        <p className="text-xs sm:text-sm text-muted line-clamp-2">{article.subtitle}</p>
      </div>
    </div>
  );
}
