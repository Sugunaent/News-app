import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { BookOpen, Sparkles, ArrowRight, Compass } from 'lucide-react';
import {
  buildCardPreviewImageUrl,
  buildCardRelativePath,
  parseCardShareUrl,
  PublicCardData,
} from '@/lib/cardShare';
import { CompletionCard } from '@/components/articles/CompletionCard';
import { getArticleRoute } from '@/lib/api';
import { setPageMetadata } from '@/lib/seo';
import { supabase } from '@/lib/supabase';

interface ArticlePreview {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_image_url: string | null;
}

export function CardPage() {
  const location = useLocation();
  const cardData: PublicCardData = useMemo(() => parseCardShareUrl(location.search), [location.search]);
  const articlePreviewId = useMemo(
    () => new URLSearchParams(location.search).get('id')?.trim() || '',
    [location.search],
  );
  const isArticlePreview = useMemo(
    () => new URLSearchParams(location.search).get('preview') === 'article',
    [location.search],
  );
  const [previewArticle, setPreviewArticle] = useState<ArticlePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isOpinion = cardData.cardType === 'opinion';
  const isQuiz = cardData.cardType === 'quiz';
  const metaTitle = isQuiz
    ? `${cardData.username} answered ${cardData.activityTitle || 'a quiz'} while reading ${cardData.articleTitle} | The Modern Stories`
    : isOpinion
      ? `${cardData.username}'s perspective on ${cardData.articleTitle} | The Modern Stories`
      : `${cardData.username} completed reading ${cardData.articleTitle} | The Modern Stories`;
  const metaDescription = isOpinion
    ? `${cardData.username} shared their perspective on “${cardData.articleTitle}”${cardData.activityTitle ? ` in response to “${cardData.activityTitle}”` : ''}${cardData.opinionText ? `: “${cardData.opinionText}”` : ''} and earned +${cardData.xpGained} XP.`
    : isQuiz
      ? `${cardData.username} answered “${cardData.activityTitle || 'a quiz'}” while reading “${cardData.articleTitle}”${cardData.activityQuestion ? `, question: “${cardData.activityQuestion}”` : ''}${cardData.activityAnswer ? `, answer: “${cardData.activityAnswer}”` : ''} and earned +${cardData.xpGained} XP.`
      : `${cardData.username} completed reading “${cardData.articleTitle}” on The Modern Stories and earned +${cardData.xpGained} XP.`;

  useEffect(() => {
    if (isArticlePreview) {
      if (!supabase) {
        setPreviewError('Supabase is not configured for this preview.');
        return;
      }
      const supabaseClient = supabase;
      if (!articlePreviewId) {
        setPreviewError('No article was specified for this preview.');
        return;
      }

      let active = true;
      setPreviewLoading(true);
      setPreviewError(null);
      const loadPreview = async () => {
        try {
          const { data, error } = await supabaseClient
            .from('articles')
            .select('id, slug, title, summary, cover_image_url')
            .eq('id', articlePreviewId)
            .maybeSingle();
          if (!active) return;
          if (error) {
            setPreviewError(`Could not load this article: ${error.message}`);
            return;
          }
          if (!data) {
            setPreviewError('The selected article is not available.');
            return;
          }
          setPreviewArticle(data as ArticlePreview);
        } catch (error) {
          if (!active) return;
          setPreviewError(error instanceof Error ? error.message : 'Could not load this article.');
        } finally {
          if (active) setPreviewLoading(false);
        }
      };
      void loadPreview();

      return () => {
        active = false;
      };
    }

    setPageMetadata({
      title: metaTitle,
      description: metaDescription,
      canonicalPath: buildCardRelativePath(cardData),
      image: buildCardPreviewImageUrl(cardData),
      imageAlt: metaTitle,
      ogType: 'website',
      ogTitle: metaTitle,
      ogDescription: metaDescription,
      twitterTitle: metaTitle,
      twitterDescription: metaDescription,
    });
  }, [articlePreviewId, cardData, isArticlePreview, location.pathname, location.search, metaDescription, metaTitle]);

  useEffect(() => {
    if (!isArticlePreview || !previewArticle) return;
    setPageMetadata({
      title: `${previewArticle.title} | Article Preview | The Modern Stories`,
      description: previewArticle.summary || previewArticle.title,
      canonicalPath: `/card?preview=article&id=${encodeURIComponent(previewArticle.id)}`,
      image: previewArticle.cover_image_url || undefined,
      imageAlt: previewArticle.title,
      ogType: 'article',
    });
  }, [isArticlePreview, previewArticle]);

  if (isArticlePreview) {
    return (
      <main className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
        <article className="w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-2xl">
          {previewArticle?.cover_image_url && (
            <img
              src={previewArticle.cover_image_url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-64 w-full object-cover sm:h-80"
            />
          )}
          <div className="p-6 sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
              <BookOpen className="h-3.5 w-3.5 text-brand-primary" />
              <span>Article Preview · Supabase</span>
            </div>
            {previewLoading && <p className="text-sm text-muted">Loading article preview…</p>}
            {previewError && <p role="alert" className="text-sm text-red-500">{previewError}</p>}
            {previewArticle && (
              <>
                <h1 className="text-2xl font-bold leading-tight text-primary sm:text-3xl">
                  {previewArticle.title}
                </h1>
                {previewArticle.summary && (
                  <p className="mt-4 leading-relaxed text-secondary">{previewArticle.summary}</p>
                )}
                <p className="mt-6 text-xs text-muted">
                  Live article metadata loaded from Supabase. This is a preview, not an earned activity card.
                </p>
              </>
            )}
          </div>
        </article>
      </main>
    );
  }

  return (
    <div className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      {/* Background glow effects */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background: isOpinion
            ? 'radial-gradient(circle, #0077b6 0%, rgba(0, 189, 72, 0.4) 100%)'
            : 'radial-gradient(circle, #00bd48 0%, rgba(0, 119, 182, 0.4) 100%)',
        }}
      />

      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        {/* Intro Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-wider bg-surface-secondary border border-border/80 text-secondary shadow-sm animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
          <span>
            {isOpinion ? 'Reader Perspective' : isQuiz ? 'Quiz Completed' : 'Reading Milestone Achieved'}
          </span>
        </div>

        {/* 3D Interactive Card */}
        <div className="w-full animate-scale-in">
          <CompletionCard
            username={cardData.username}
            articleTitle={cardData.articleTitle}
            articleId={cardData.articleId}
            articleImageUrl={cardData.articleImageUrl}
            xpGained={cardData.xpGained}
            cardType={cardData.cardType}
            activityTitle={cardData.activityTitle}
            activityQuestion={cardData.activityQuestion}
            activityAnswer={cardData.activityAnswer}
            opinionText={cardData.opinionText}
            interactive={true}
          />
        </div>

        {/* Action Controls & Article Preview */}
        <div className="w-full mt-8 flex flex-col items-center text-center max-w-md animate-fade-in">
          <p className="text-sm text-muted mb-5">
            This card was earned by <span className="font-semibold text-primary">{cardData.username}</span> on{' '}
            <Link to="/" className="text-brand-primary hover:underline font-medium">
              The Modern Stories
            </Link>
            .
          </p>

          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
            {cardData.articleId ? (
              <Link
                to={getArticleRoute({ id: cardData.articleId })}
                className="btn-primary w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-medium shadow-md group"
              >
                <BookOpen className="w-4 h-4" />
                <span>Read this Story</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                to="/"
                className="btn-primary w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-medium shadow-md"
              >
                <BookOpen className="w-4 h-4" />
                <span>Explore Stories</span>
              </Link>
            )}

            <Link
              to="/"
              className="btn-secondary w-full sm:w-auto px-5 py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-medium border border-border/80"
            >
              <Compass className="w-4 h-4 text-muted" />
              <span>Discover TMS</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
