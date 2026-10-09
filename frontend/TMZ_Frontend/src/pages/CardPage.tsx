import { useLocation, Link } from 'react-router-dom';
import { BookOpen, Sparkles, ArrowRight, Compass } from 'lucide-react';
import { parseCardShareUrl, PublicCardData } from '@/lib/cardShare';
import { CompletionCard } from '@/components/articles/CompletionCard';
import { getArticleRoute } from '@/lib/api';

export function CardPage() {
  const location = useLocation();
  const cardData: PublicCardData = parseCardShareUrl(location.search);

  const isOpinion = cardData.cardType === 'opinion';
  const isQuiz = cardData.cardType === 'quiz';

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
            xpGained={cardData.xpGained}
            cardType={cardData.cardType}
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
