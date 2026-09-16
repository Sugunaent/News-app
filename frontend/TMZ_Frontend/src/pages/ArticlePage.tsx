import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Home, Layers, User } from 'lucide-react';
import type { ArticleWithBlocks, Level, Badge, Article } from '@/types';
import { useAuth } from '@/lib/auth';
import { fireCelebrationConfetti } from '@/lib/confetti';
import {
  fetchArticleById,
  fetchReadingProgress,
  updateReadingProgress,
  hasCompletionCard,
  createCompletionCard,
  createOpinionCard,
  fetchLevels,
  fetchUserBadges,
  fetchLatestArticles,
  fetchAuthorsPicks,
} from '@/lib/api';
import { ArticleBlockRenderer } from '@/components/articles/ArticleBlockRenderer';
import { CommentsSection } from '@/components/articles/CommentsSection';
import { BookmarkButton } from '@/components/articles/BookmarkButton';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { XPRewardAnimation } from '@/components/articles/XPRewardAnimation';
import { CompletionCard } from '@/components/articles/CompletionCard';
import { LevelUpModal } from '@/components/articles/LevelUpModal';
import { BadgePopup } from '@/components/articles/BadgePopup';
import { ReadingUnlockOverlay } from '@/components/articles/ReadingUnlockOverlay';
import { ConditionalAdSlot } from '@/components/articles/AdSlot';

export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [article, setArticle] = useState<ArticleWithBlocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unlockedPct, setUnlockedPct] = useState(0);
  const [showXp, setShowXp] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [_xpBreakdown, setXpBreakdown] = useState<{ label: string; amount: number }[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [levelUp, setLevelUp] = useState<Level | null>(null);
  const [levelUpPrev, setLevelUpPrev] = useState<Level | null>(null);
  const [levelUpNextXp, setLevelUpNextXp] = useState<number | null>(null);
  const [levelUpCurrentXp, setLevelUpCurrentXp] = useState(0);
  const [badgePopup, setBadgePopup] = useState<Badge | null>(null);
  const [completionChecked, setCompletionChecked] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [sidebarLatest, setSidebarLatest] = useState<Article[]>([]);
  const [sidebarPicks, setSidebarPicks] = useState<Article[]>([]);
  const [completionCardXp, setCompletionCardXp] = useState(30);
  const [opinionModalData, setOpinionModalData] = useState<{
    opinionText: string;
    xpGained: number;
  } | null>(null);
  const [scrolledThroughComments, setScrolledThroughComments] = useState(false);
  const [commentsReady, setCommentsReady] = useState(false);
  const [articleBounds, setArticleBounds] = useState<{ left: number; width: number } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const lastSaveRef = useRef<number>(0);
  const lastSavedProgressRef = useRef<number>(-1);
  const lastSavedScrollRef = useRef<number>(-1);
  const quizXpRef = useRef<number>(0);
  const userDidScrollRef = useRef<boolean>(false);
  const completionTriggeredRef = useRef<boolean>(false);

  // Measure article reading container bounds so overlay aligns strictly inside reading page
  const prevBoundsRef = useRef<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const updateBounds = () => {
      if (articleRef.current) {
        const rect = articleRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          const left = Math.round(rect.left);
          const width = Math.round(rect.width);
          if (
            !prevBoundsRef.current ||
            Math.abs(prevBoundsRef.current.left - left) > 1 ||
            Math.abs(prevBoundsRef.current.width - width) > 1
          ) {
            prevBoundsRef.current = { left, width };
            setArticleBounds({ left, width });
          }
        }
      }
    };

    updateBounds();
    const t1 = setTimeout(updateBounds, 60);
    const t2 = setTimeout(updateBounds, 200);
    const t3 = setTimeout(updateBounds, 500);

    window.addEventListener('resize', updateBounds, { passive: true });
    window.addEventListener('orientationchange', updateBounds, { passive: true });
    window.addEventListener('scroll', updateBounds, { passive: true });

    let ro: ResizeObserver | null = null;
    if (articleRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(updateBounds);
      });
      ro.observe(articleRef.current);
      if (document.body) {
        ro.observe(document.body);
      }
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('orientationchange', updateBounds);
      window.removeEventListener('scroll', updateBounds);
      if (ro) ro.disconnect();
    };
  }, [article, id]);

  // Scroll to top on every article open — do NOT inherit previous scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Load article
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    setUnlockedPct(0);
    setShowCompletionModal(false);
    setOpinionModalData(null);
    completionTriggeredRef.current = false;
    userDidScrollRef.current = false;
    setCompletionChecked(false);
    setAlreadyCompleted(false);
    setCommentsReady(false);
    setTotalXp(0);
    setXpBreakdown([]);
    setCompletionCardXp(30);
    quizXpRef.current = 0;
    fetchArticleById(id)
      .then((art) => { if (!art) { setError(true); return; } setArticle(art); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Load sidebar data
  useEffect(() => {
    fetchLatestArticles(5).then(setSidebarLatest).catch(() => {});
    fetchAuthorsPicks(5).then(setSidebarPicks).catch(() => {});
  }, []);

  // Load saved reading progress (resume only if user has saved progress)
  useEffect(() => {
    if (!user || !id) return;
    fetchReadingProgress(user.id, id)
      .then((p) => {
        if (p) {
          setUnlockedPct(p.percentage);
          if (p.scroll_position > 0) {
            setTimeout(() => window.scrollTo({ top: p.scroll_position, behavior: 'smooth' }), 400);
          }
        }
      })
      .catch(() => {});
  }, [user, id]);

  // Check for existing completion card (do NOT show modal on initial load)
  useEffect(() => {
    if (!user || !id) return;
    hasCompletionCard(user.id, id).then((exists) => {
      setAlreadyCompleted(exists);
      setCompletionChecked(true);
    }).catch(() => setCompletionChecked(true));
  }, [user, id]);

  // Scroll-based progressive unlock & detection of comments section
  useEffect(() => {
    if (!article || !contentRef.current) return;

    const handleScroll = () => {
      userDidScrollRef.current = true;
      if (!contentRef.current) return;
      const el = contentRef.current;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const contentHeight = el.offsetHeight;

      if (contentHeight === 0) return;

      // Check if user has reached the comments section / comments text box
      let isAtComments = false;
      if (commentsRef.current) {
        const commentsRect = commentsRef.current.getBoundingClientRect();
        // Wait until the loaded comment target (first comment or composer) is visible.
        if (commentsReady && (commentsRect.top <= windowHeight * 0.88 || commentsRect.top <= windowHeight - 40)) {
          isAtComments = true;
          setScrolledThroughComments(true);
        }
      }

      const scrolledIntoView = Math.max(0, windowHeight - rect.top);
      let visiblePct = Math.min(100, Math.round((scrolledIntoView / contentHeight) * 100));

      if (isAtComments) {
        visiblePct = 100;
      }

      const step = 2;
      const newUnlocked = Math.min(100, Math.max(unlockedPct, Math.ceil(visiblePct / step) * step));

      if (newUnlocked > unlockedPct) {
        setUnlockedPct(newUnlocked);
      }

      const now = Date.now();
      const shouldPersistProgress =
        newUnlocked > lastSavedProgressRef.current ||
        newUnlocked < 100 && Math.abs(window.scrollY - lastSavedScrollRef.current) >= 300;
      if (now - lastSaveRef.current > 10000 && shouldPersistProgress && user && id) {
        lastSaveRef.current = now;
        const scrollPos = window.scrollY;
        lastSavedProgressRef.current = newUnlocked;
        lastSavedScrollRef.current = scrollPos;
        updateReadingProgress(user.id, id, newUnlocked, scrollPos, newUnlocked >= 100).catch(() => {});
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount / update
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article, unlockedPct, user, id, commentsReady]);

  // Completion — trigger confetti and show card immediately as soon as user reaches the comments box
  useEffect(() => {
    if (!id || !article || unlockedPct < 100 || !scrolledThroughComments || !completionChecked || alreadyCompleted || completionTriggeredRef.current) return;
    // Trigger ONLY after genuine article completion/reading progress, NOT on cold load
    if (!userDidScrollRef.current) return;

    completionTriggeredRef.current = true;

    const recordCompletion = async () => {
      try {
        const userId = user?.id || 'demo-reader';
        const result = await createCompletionCard(userId, id, article.title, 0, 'completion');
        const articleReward = result.xp_gained + quizXpRef.current;
        setCompletionCardXp(articleReward);
        setTotalXp(articleReward);
        fireCelebrationConfetti();
        setShowCompletionModal(true);

        if (!result.already_completed && user) {
          if (articleReward > 0) {
            setShowXp(true);
            setTimeout(() => setShowXp(false), 2000);
          }
          await refreshProfile();

          if (profile && result.new_level > profile.level) {
            const levels = await fetchLevels();
            const newLevel = levels.find((level) => level.level_number === result.new_level);
            const prevLevel = levels.find((level) => level.level_number === profile.level) ?? null;
            const nextLevel = levels.find((l) => l.level_number === result.new_level + 1);
            if (newLevel) {
              setLevelUp(newLevel);
              setLevelUpPrev(prevLevel);
              setLevelUpNextXp(nextLevel?.xp_threshold ?? null);
              setLevelUpCurrentXp(result.total_xp);
            }
          }

          const badges = await fetchUserBadges(user.id);
          if (badges.length > 0 && badges[0].badge) {
            const recentBadge = badges[0];
            const recentTime = new Date(recentBadge.earned_at).getTime();
            if (Date.now() - recentTime < 10000) {
              setBadgePopup(recentBadge.badge ?? null);
            }
          }
        }
      } catch {
        /* background sync fallback */
      }
    };

    recordCompletion();
  }, [unlockedPct, scrolledThroughComments, user, id, article, completionChecked, alreadyCompleted, profile, refreshProfile]);

  const handleQuizResult = useCallback((xp: number) => {
    quizXpRef.current += xp;
    setShowXp(true);
    setTotalXp((prev) => prev + xp);
    setCompletionCardXp(30 + quizXpRef.current);
    setTimeout(() => setShowXp(false), 2000);
  }, []);

  const handleCommentsReady = useCallback(() => {
    setCommentsReady(true);
  }, []);

  const handleOpinionSubmit = useCallback(async (opinionText: string, xpEarned: number) => {
    if (!article || !id) return;
    if (xpEarned > 0) {
      setShowXp(true);
      setTotalXp(xpEarned);
      setTimeout(() => setShowXp(false), 2000);
    }
    try {
      const userId = user?.id || 'demo-user';
      await createOpinionCard(userId, id, article.title, opinionText, xpEarned);
      if (user) {
        await refreshProfile();
      }
      setOpinionModalData({
        opinionText,
        xpGained: xpEarned,
      });
    } catch {
      setOpinionModalData({
        opinionText,
        xpGained: xpEarned,
      });
    }
  }, [user, article, id, refreshProfile]);

  const handleBack = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (loading) return <LoadingState message="Loading article..." />;
  if (error || !article) return <ErrorState message="Article not found." onRetry={() => navigate('/')} />;
  if (!user) return <Navigate to="/auth" state={{ redirect: `/article/${id}` }} replace />;

  const typeLabel = article.article_type === 'PODCAST' ? 'Podcast'
    : article.article_type === 'QUIZ' ? 'Quiz'
    : article.article_type === 'OPINION' ? 'Opinion'
    : article.article_type === 'FEATURED' ? 'Featured'
    : 'Article';

  return (
    <div className="relative min-h-screen">
      {/* Left navigation rail (desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-16 flex-col items-center gap-4 py-8 z-20" style={{ borderRight: '1px solid var(--border-subtle)' }}>
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl glass flex items-center justify-center text-secondary hover:text-brand-primary transition-colors" aria-label="Home">
          <Home className="w-5 h-5" />
        </button>
        <button onClick={() => navigate('/about')} className="w-10 h-10 rounded-xl glass flex items-center justify-center text-secondary hover:text-brand-primary transition-colors" aria-label="Categories">
          <Layers className="w-5 h-5" />
        </button>
        <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-xl glass flex items-center justify-center text-secondary hover:text-brand-primary transition-colors" aria-label="Profile">
          <User className="w-5 h-5" />
        </button>
      </aside>

      {/* Main responsive layout container */}
      <div className="relative z-10 lg:ml-16 max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 items-start">
          {/* Main column - responsive majority of width */}
          <div className="flex-1 min-w-0 w-full">
            {/* Top controls */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-3 py-1.5 -ml-2 rounded-xl text-sm font-medium text-secondary hover:text-primary hover:bg-white/5 active:scale-95 transition-all cursor-pointer select-none"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Back</span>
              </button>
              <BookmarkButton articleId={article.id} variant="toggle" />
            </div>

            {/* Article surface */}
            <article ref={articleRef} className="article-surface p-6 sm:p-8 md:p-12 w-full">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  {article.category && (
                    <span className="text-xs px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary font-body">
                      {article.category.name}
                    </span>
                  )}
                  <span className="text-xs text-muted">{typeLabel}</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl leading-tight mb-3" style={{ color: 'var(--article-text)' }}>
                  {article.title}
                </h1>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--article-muted)' }}>
                  {article.subtitle}
                </p>
              </div>

              {/* ALL blocks are in the DOM — completely readable and interactive */}
              <div ref={contentRef} className="relative">
                {article.blocks.map((block) => (
                  <ArticleBlockRenderer
                    key={block.id}
                    block={block}
                    onQuizResult={handleQuizResult}
                    onOpinionSubmit={handleOpinionSubmit}
                  />
                ))}
              </div>

              {/* Ad slot */}
              <ConditionalAdSlot />

              {/* Comments Section */}
              <div ref={commentsRef} id="comments-section">
                <CommentsSection articleId={article.id} onReadyForCompletion={handleCommentsReady} />
              </div>
            </article>
          </div>

          {/* Sticky Sidebar on desktop, responsive stack below on mobile/tablet */}
          <aside className="w-full lg:w-[320px] xl:w-[360px] 2xl:w-[380px] shrink-0 lg:sticky lg:top-20 space-y-8">
            {sidebarLatest.length > 0 && (
              <div>
                <h3 className="font-display text-lg text-primary mb-4">Latest Articles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {sidebarLatest.map((a) => (
                    <SidebarItem key={a.id} article={a} />
                  ))}
                </div>
              </div>
            )}

            {sidebarPicks.length > 0 && (
              <div>
                <h3 className="font-display text-lg text-primary mb-4">Author's Picks</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {sidebarPicks.map((a) => (
                    <SidebarItem key={a.id} article={a} />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Curved/oval glassmorphism reading progress bar — static at bottom of viewport, strictly contained in reading page */}
      {article && (
        <ReadingUnlockOverlay
          remainingPct={Math.max(0, 100 - unlockedPct)}
          completedPct={unlockedPct}
          bonusXp={quizXpRef.current}
          bounds={articleBounds}
        />
      )}

      {/* XP Animation */}
      {showXp && (
        <XPRewardAnimation xp={totalXp} onComplete={() => setShowXp(false)} />
      )}

      {/* Completion Card Popup Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 transition-opacity"
            style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowCompletionModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg animate-scale-in">
            <CompletionCard
              cardType="completion"
              username={profile?.display_name || user?.email || 'Reader'}
              articleTitle={article.title}
              articleId={id}
              xpGained={completionCardXp}
              onClose={() => setShowCompletionModal(false)}
            />
          </div>
        </div>
      )}

      {/* Opinion Sharable Card Popup Modal */}
      {opinionModalData && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 transition-opacity"
            style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(10px)' }}
            onClick={() => setOpinionModalData(null)}
          />
          <div className="relative z-10 w-full max-w-lg animate-scale-in">
            <CompletionCard
              cardType="opinion"
              username={profile?.display_name || user?.email || 'Reader'}
              articleTitle={article.title}
              articleId={id}
              xpGained={opinionModalData.xpGained}
              opinionText={opinionModalData.opinionText}
              onClose={() => setOpinionModalData(null)}
            />
          </div>
        </div>
      )}

      {/* Level Up Modal */}
      {levelUp && (
        <LevelUpModal
          level={levelUp}
          prevLevel={levelUpPrev}
          currentXp={levelUpCurrentXp}
          nextLevelXp={levelUpNextXp}
          onClose={() => setLevelUp(null)}
        />
      )}

      {/* Badge Popup */}
      {badgePopup && (
        <BadgePopup badge={badgePopup} onClose={() => setBadgePopup(null)} />
      )}
    </div>
  );
}

/* ===== Sidebar Item (no glow) ===== */

function SidebarItem({ article }: { article: Article }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (user) {
      navigate(`/article/${article.id}`);
    } else {
      navigate('/auth', { state: { redirect: `/article/${article.id}` } });
    }
  };

  return (
    <div
      onClick={handleClick}
      className="glass-card p-4 cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        {article.cover_image_url && (
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
            <img src={article.cover_image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm text-primary font-body line-clamp-2 leading-snug mb-1">{article.title}</h4>
          <p className="text-xs text-muted line-clamp-1">{article.subtitle}</p>
        </div>
      </div>
    </div>
  );
}
