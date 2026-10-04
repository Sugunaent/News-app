import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Home, Layers, Loader2, User } from 'lucide-react';
import type { ArticleWithBlocks, Level, Badge, Article } from '@/types';
import { useAuth } from '@/lib/useAuth';
import { useAuthPrompt } from '@/lib/authPromptContext';
import { fireCelebrationConfetti } from '@/lib/confetti';
import {
  fetchArticleById,
  getArticleRoute,
  fetchReadingProgress,
  updateReadingProgress,
  hasCompletionCard,
  createCompletionCard,
  createOpinionCard,
  fetchLevels,
  fetchUserBadges,
  fetchAllArticles,
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
import {
  canonicalUrl,
  removeJsonLd,
  setPageMetadata,
  SITE_ENTITY_SCHEMA,
  SITE_NAME,
  upsertJsonLd,
} from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ExternalImage } from '@/components/articles/ExternalImage';
import { useLanguage } from '@/lib/language';
import {
  getLocalizedArticleFields,
  getLocalizedArticleText,
  getLocalizedTakeaways,
  useTranslatedArticle,
} from '@/lib/translations';

function metadataTerms(value: string[] | string | null | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? value.split(/[,;|]/) : [];
  return values.map((item) => item.trim()).filter(Boolean);
}

function conciseDescription(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 200) return normalized;
  const boundary = normalized.lastIndexOf(' ', 197);
  return `${normalized.slice(0, boundary > 120 ? boundary : 197).trimEnd()}…`;
}

export function ArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const slugOrId = (() => {
    try {
      return decodeURIComponent(slug).trim();
    } catch {
      return slug.trim();
    }
  })();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { requestLogin } = useAuthPrompt();
  const { currentLang } = useLanguage();

  const [article, setArticle] = useState<ArticleWithBlocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Article not found.');
  const [retryAttempt, setRetryAttempt] = useState(0);
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
  const [shareCopyState, setShareCopyState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const localizedTitle = article ? getLocalizedArticleText(article, currentLang, 'title') : null;
  const localizedSubtitle = article ? getLocalizedArticleText(article, currentLang, 'subtitle') : null;
  const localizedSummary = article ? getLocalizedArticleText(article, currentLang, 'summary') : null;
  const localizedTakeaways = article ? getLocalizedTakeaways(article, currentLang) : null;
  const translationSegments = useMemo(() => {
    if (!article || currentLang === 'EN' || article.content_language === currentLang) return {};

    const segments: Record<string, string> = {};
    if (article.subtitle) segments.subtitle = article.subtitle;
    if (article.summary) segments.summary = article.summary;
    article.key_takeaways?.forEach((takeaway, index) => {
      if (takeaway) segments[`takeaway-${index}`] = takeaway;
    });
    article.blocks.forEach((block) => {
      if (block.content) segments[`block-${block.id}`] = block.content;
      if (block.image_caption) segments[`caption-${block.id}`] = block.image_caption;
      if (block.quiz) {
        segments[`quiz-question-${block.id}`] = block.quiz.question;
        block.quiz.options.forEach((option) => {
          segments[`quiz-option-${option.id}`] = option.label;
          if (option.explanation) segments[`quiz-explanation-${option.id}`] = option.explanation;
        });
      }
      if (block.opinion) {
        segments[`opinion-question-${block.id}`] = block.opinion.question;
        block.opinion.options.forEach((option, index) => {
          const optionId = block.opinion?.option_ids?.[index];
          if (optionId) segments[`opinion-option-${optionId}`] = option;
        });
      }
    });
    return segments;
  }, [article, currentLang]);
  const translatedArticle = useTranslatedArticle(
    article?.id ?? '',
    localizedTitle ? '' : article?.title ?? '',
    '',
    translationSegments,
    { enabled: currentLang !== 'EN' },
  );
  const displayTitle = localizedTitle || translatedArticle.title || article?.title || '';
  const displaySubtitle = localizedSubtitle
    || translatedArticle.segments.subtitle
    || article?.subtitle
    || '';
  const displaySummary = localizedSummary
    || translatedArticle.segments.summary
    || article?.summary
    || '';
  const displayTakeaways = useMemo(
    () => {
      if (localizedTakeaways) return localizedTakeaways;
      if (article?.key_takeaways?.length) {
        return article.key_takeaways.map((takeaway, index) =>
          translatedArticle.segments[`takeaway-${index}`] || takeaway,
        );
      }
      const targetScript = currentLang === 'TE' ? /[\u0C00-\u0C7F]/ : /[\u0900-\u097F]/;
      if (currentLang !== 'EN' && (targetScript.test(displaySummary) || targetScript.test(displaySubtitle))) {
        return [displaySummary || displaySubtitle];
      }
      return [];
    },
    [localizedTakeaways, currentLang, displaySummary, displaySubtitle, article, translatedArticle.segments],
  );
  const displayBlocks = useMemo(() => article?.blocks.map((block) => ({
    ...block,
    content: translatedArticle.segments[`block-${block.id}`] || block.content,
    image_caption: translatedArticle.segments[`caption-${block.id}`] || block.image_caption,
    quiz: block.quiz ? {
      ...block.quiz,
      question: translatedArticle.segments[`quiz-question-${block.id}`] || block.quiz.question,
      options: block.quiz.options.map((option) => ({
        ...option,
        label: translatedArticle.segments[`quiz-option-${option.id}`] || option.label,
        explanation: translatedArticle.segments[`quiz-explanation-${option.id}`] || option.explanation,
      })),
    } : block.quiz,
    opinion: block.opinion ? {
      ...block.opinion,
      question: translatedArticle.segments[`opinion-question-${block.id}`] || block.opinion.question,
      options: block.opinion.options.map((option, index) => {
        const optionId = block.opinion?.option_ids?.[index];
        return (optionId && translatedArticle.segments[`opinion-option-${optionId}`]) || option;
      }),
    } : block.opinion,
  })) ?? [], [article, translatedArticle.segments]);

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
  }, [article, slugOrId]);

  // Scroll to top on every article open — do NOT inherit previous scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slugOrId]);

  // Load article
  useEffect(() => {
    if (!slugOrId) return;
    setLoading(true);
    setError(false);
    setErrorMessage('Article not found.');
    setArticle(null);
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
    let active = true;
    const loadArticle = async () => {
      try {
        let availableArticles: Article[];
        try {
          availableArticles = await fetchAllArticles('EN');
        } catch (listError) {
          console.warn('[ArticlePage] Full article-list lookup failed; checking the latest article cache.', listError);
          availableArticles = await fetchLatestArticles(200, undefined, 'EN');
        }
        const normalizedRoute = slugOrId.toLocaleLowerCase();
        const routeParts = normalizedRoute.split('-');
        const candidateId = routeParts[routeParts.length - 1] ?? '';
        const baseSlug = routeParts.slice(0, -1).join('-');
        const match = availableArticles.find((candidate) => {
          const candidateIdValue = candidate.id.toLocaleLowerCase();
          const candidateArticleSlug = candidate.slug?.toLocaleLowerCase() ?? '';
          return candidateIdValue === normalizedRoute
            || candidateArticleSlug === normalizedRoute
            || Boolean(candidateId && (
              candidateIdValue.startsWith(candidateId)
              || candidateIdValue.endsWith(candidateId)
              || candidateIdValue.includes(candidateId)
            ))
            || Boolean(candidateArticleSlug && candidateArticleSlug === baseSlug)
            || Boolean(candidateArticleSlug && normalizedRoute.startsWith(candidateArticleSlug))
            || Boolean(candidateArticleSlug && normalizedRoute.includes(candidateArticleSlug));
        });

        let resolved: ArticleWithBlocks | null = null;
        if (match) {
          try {
            resolved = await fetchArticleById(match.id, currentLang);
          } catch (detailError) {
            console.warn(`[ArticlePage] Could not load full article by ID "${match.id}".`, detailError);
          }

          if (!resolved && match.slug) {
            try {
              resolved = await fetchArticleById(match.slug, currentLang);
            } catch (detailError) {
              console.warn(`[ArticlePage] Could not load full article detail for slug "${match.slug}".`, detailError);
            }
          }
        } else {
          resolved = await fetchArticleById(slugOrId, currentLang);
        }

        if (!active) return;
        if (!resolved) {
          throw new Error('The full article could not be loaded from the article detail endpoint.');
        }
        if (resolved.blocks.length === 0) {
          throw new Error('The article detail endpoint returned no content blocks.');
        }
        setArticle(resolved);
        if (resolved.slug && slugOrId !== resolved.slug && slugOrId !== resolved.id) {
          navigate(getArticleRoute(resolved), { replace: true });
        }
      } catch (fetchError) {
        console.error(`[ArticlePage] Could not load article "${slugOrId}".`, fetchError);
        if (active) {
          setErrorMessage(fetchError instanceof Error
            ? 'The full article could not be loaded. Please try again.'
            : 'Article not found.');
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadArticle();
    return () => {
      active = false;
    };
  }, [slugOrId, navigate, currentLang, retryAttempt]);

  useEffect(() => {
    if (!error) return;
    setPageMetadata({
      title: 'Story not found | The Modern Stories',
      description: 'This story could not be found or is no longer published.',
      canonicalPath: window.location.pathname,
      robots: 'noindex, nofollow',
    });
    removeJsonLd('article-jsonld');
  }, [error]);

  useEffect(() => {
    if (!article) return;

    const title = localizedTitle || displayTitle;
    const description = conciseDescription(localizedSummary
      || localizedSubtitle
      || article.seo_description
      || displaySummary
      || displaySubtitle
      || 'Read this story on The Modern Stories.');
    const keywords = [...new Set([
      ...metadataTerms(article.tags),
      ...metadataTerms(article.keywords),
      article.category?.name || '',
      ...title.split(/\s+/).filter((term) => term.length > 3),
    ].map((term) => term.trim()).filter(Boolean))];
    const route = getArticleRoute(article);
    const canonical = canonicalUrl(article.canonical_url || route);
    const image = canonicalUrl(article.meta_image_url || article.cover_image_url || '/modern_stories_hero.jpg');
    const bodyText = [displayTitle, displaySubtitle, displaySummary, ...displayBlocks
      .filter((block) => block.block_type === 'TEXT')
      .map((block) => block.content || '')]
      .filter(Boolean)
      .join(' ');
    const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
    const publishedDate = article.published_at && !Number.isNaN(Date.parse(article.published_at))
      ? new Date(article.published_at).toISOString()
      : undefined;

    upsertJsonLd('site-jsonld', SITE_ENTITY_SCHEMA);
    setPageMetadata({
      title: `${title} | ${SITE_NAME}`,
      description,
      keywords: keywords.join(', '),
      canonicalPath: canonical,
      image,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      ogType: 'article',
      ogTitle: `${title} | ${SITE_NAME}`,
      author: article.author_name || SITE_NAME,
    });

    upsertJsonLd('page-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      isPartOf: { '@id': `${canonicalUrl('/')}#website` },
      mainEntity: { '@id': `${canonical}#article` },
    });

    upsertJsonLd('article-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      '@id': `${canonical}#article`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      headline: title,
      description,
      image: [image],
      ...(publishedDate ? { datePublished: publishedDate } : {}),
      author: article.author_name
        ? { '@type': 'Person', name: article.author_name }
        : { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@id': `${canonicalUrl('/')}#organization` },
      articleSection: article.category?.name || 'Editorial Stories',
      keywords,
      about: article.category?.name
        ? { '@type': 'Thing', name: article.category.name }
        : undefined,
      genre: article.category?.name || article.article_type,
      wordCount,
      inLanguage: currentLang.toLowerCase(),
    });

    return () => removeJsonLd('article-jsonld');
  }, [
    article,
    slugOrId,
    currentLang,
    localizedTitle,
    localizedSubtitle,
    localizedSummary,
    displayTitle,
    displaySubtitle,
    displaySummary,
    displayBlocks,
  ]);

  // Load sidebar data
  useEffect(() => {
    fetchLatestArticles(5, undefined, currentLang).then(setSidebarLatest).catch(() => {});
    fetchAuthorsPicks(5, undefined, currentLang).then(setSidebarPicks).catch(() => {});
  }, [currentLang]);

  // Load saved reading progress (resume only if user has saved progress)
  useEffect(() => {
    if (!user || !slugOrId) return;
    fetchReadingProgress(user.id, slugOrId)
      .then((p) => {
        if (p) {
          setUnlockedPct(p.percentage);
          if (p.scroll_position > 0) {
            setTimeout(() => window.scrollTo({ top: p.scroll_position, behavior: 'smooth' }), 400);
          }
        }
      })
      .catch(() => {});
  }, [user, slugOrId]);

  // Check for existing completion card (do NOT show modal on initial load)
  useEffect(() => {
    if (!slugOrId) return;
    if (!user) {
      setCompletionChecked(true);
      setAlreadyCompleted(false);
      return;
    }
    hasCompletionCard(user.id, slugOrId).then((exists) => {
      setAlreadyCompleted(exists);
      setCompletionChecked(true);
    }).catch(() => setCompletionChecked(true));
  }, [user, slugOrId]);

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
        } else {
          setScrolledThroughComments(false);
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
      if (now - lastSaveRef.current > 10000 && shouldPersistProgress && user && slugOrId) {
        lastSaveRef.current = now;
        const scrollPos = window.scrollY;
        lastSavedProgressRef.current = newUnlocked;
        lastSavedScrollRef.current = scrollPos;
        updateReadingProgress(user.id, slugOrId, newUnlocked, scrollPos, newUnlocked >= 100).catch(() => {});
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount / update
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article, unlockedPct, user, slugOrId, commentsReady]);

  // Completion — trigger confetti and show card immediately upon reaching completion criteria
  useEffect(() => {
    if (!slugOrId || !article || unlockedPct < 100 || !scrolledThroughComments || completionTriggeredRef.current) return;
    // Trigger ONLY after genuine article completion/reading progress, NOT on cold load
    if (!userDidScrollRef.current) return;
    if (!user) {
      completionTriggeredRef.current = true;
      requestLogin('gamification');
      return;
    }
    if (!completionChecked || alreadyCompleted) return;

    completionTriggeredRef.current = true;

    const triggerCompletion = async () => {
      try {
        const result = await createCompletionCard(user.id, article.id, displayTitle, 0, 'completion');
        const articleReward = result.xp_gained + quizXpRef.current + (opinionModalData?.xpGained || 0);
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

    triggerCompletion();

  }, [unlockedPct, scrolledThroughComments, user, slugOrId, article, displayTitle, completionChecked, alreadyCompleted, profile, refreshProfile, opinionModalData, requestLogin]);

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
    if (!article || !slugOrId) return;
    if (!user) {
      requestLogin('gamification');
      return;
    }
    if (xpEarned > 0) {
      setShowXp(true);
      setTotalXp(xpEarned);
      setTimeout(() => setShowXp(false), 2000);
    }
    try {
      await createOpinionCard(user.id, article.id, displayTitle, opinionText, xpEarned);
      await refreshProfile();
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
  }, [user, article, slugOrId, refreshProfile, displayTitle, requestLogin]);

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

  const summaryText = useMemo(() => displaySummary || displaySubtitle, [displaySummary, displaySubtitle]);
  const keyTakeaways = useMemo(() => {
    if (!article) return [];
    const rawTakeaways = displayTakeaways.length > 0
      ? displayTakeaways
      : [displaySummary, displaySubtitle].filter(Boolean);

    const splitTakeaways = rawTakeaways
      .flatMap((entry) => entry
        .split(/(?:•|\n|;|\.)\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && part.length < 160))
      .slice(0, 3);

    return splitTakeaways;
  }, [article, displayTakeaways, displaySummary, displaySubtitle]);
  const handleShare = useCallback(async () => {
    if (!article) return;

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareMessage = `${displayTitle}${displaySummary ? ` — ${displaySummary}` : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: displayTitle,
          text: shareMessage,
          url: shareUrl,
        });
        setShareCopyState('shared');
        setShareMenuOpen(false);
        return;
      }
    } catch {
      // Native share is unavailable or user cancelled; fall through to manual share options.
    }

    setShareMenuOpen((open) => !open);
  }, [article, displayTitle, displaySummary]);

  const handleShareTarget = useCallback(async (target: 'copy' | 'x' | 'facebook' | 'linkedin' | 'whatsapp') => {
    if (!article) return;

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareMessage = `${displayTitle}${displaySummary ? ` — ${displaySummary}` : ''}`;

    if (target === 'copy') {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
        setShareCopyState('copied');
      }
      setShareMenuOpen(false);
      window.setTimeout(() => setShareCopyState('idle'), 2000);
      return;
    }

    const targetUrlMap = {
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`,
    } satisfies Record<'x' | 'facebook' | 'linkedin' | 'whatsapp', string>;

    window.open(targetUrlMap[target], '_blank', 'noopener,noreferrer');
    setShareCopyState('shared');
    setShareMenuOpen(false);
    window.setTimeout(() => setShareCopyState('idle'), 2000);
  }, [article, displayTitle, displaySummary]);

  if (loading) return <LoadingState message="Loading article..." />;
  if (error || !article) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => setRetryAttempt((attempt) => attempt + 1)}
      />
    );
  }
  if (currentLang !== 'EN' && translatedArticle.isLoading) {
    return <LoadingState message={currentLang === 'TE' ? 'తెలుగులోకి అనువదిస్తోంది...' : 'हिंदी में अनुवाद हो रहा है...'} />;
  }

  const typeLabel = article.article_type === 'PODCAST' ? 'Podcast'
    : article.article_type === 'QUIZ' ? 'Quiz'
    : article.article_type === 'OPINION' ? 'Opinion'
    : article.article_type === 'FEATURED' ? 'Featured'
    : 'Article';

  return (
    <div className="relative">
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
      <div className="relative z-10 lg:ml-16 max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 items-start">
          {/* Main column - responsive majority of width */}
          <div className="flex-1 min-w-0 w-full">
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              ...(article.category?.slug ? [{ label: article.category.name, href: `/category/${article.category.slug}` }] : []),
              { label: displayTitle },
            ]} />
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
            <article ref={articleRef} lang={currentLang.toLowerCase()} className="article-surface relative p-6 sm:p-8 md:p-12 w-full">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {article.category && (
                    <span className="text-xs px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary font-body">
                      {article.category.name}
                    </span>
                  )}
                  <span className="text-xs text-muted">{typeLabel}</span>
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 rounded-full border border-border-default bg-white/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-brand-primary/10 transition-colors"
                      aria-label="Share article"
                    >
                      <span>{shareCopyState === 'copied' ? 'Link copied' : shareCopyState === 'shared' ? 'Shared' : 'Share'}</span>
                    </button>

                    {shareMenuOpen && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-border-default bg-surface-primary/95 p-2 shadow-2xl backdrop-blur-md">
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          <button type="button" onClick={() => void handleShareTarget('copy')} className="rounded-xl px-3 py-2 text-left hover:bg-white/5">Copy Link</button>
                          <button type="button" onClick={() => void handleShareTarget('whatsapp')} className="rounded-xl px-3 py-2 text-left hover:bg-white/5">WhatsApp</button>
                          <button type="button" onClick={() => void handleShareTarget('x')} className="rounded-xl px-3 py-2 text-left hover:bg-white/5">X / Twitter</button>
                          <button type="button" onClick={() => void handleShareTarget('facebook')} className="rounded-xl px-3 py-2 text-left hover:bg-white/5">Facebook</button>
                          <button type="button" onClick={() => void handleShareTarget('linkedin')} className="rounded-xl px-3 py-2 text-left hover:bg-white/5">LinkedIn</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl md:text-4xl leading-relaxed mb-3" style={{ color: 'var(--article-text)' }}>
                    {displayTitle}
                  </h1>
                  {translatedArticle.isLoading && <Loader2 className="mt-2 h-5 w-5 shrink-0 animate-spin text-muted" aria-label="Translating article" />}
                </div>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--article-muted)' }}>
                  {displaySubtitle}
                </p>
              </div>

              {translatedArticle.error && (
                <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300" role="status">
                  Translation is unavailable right now. Showing the article text returned by the server.
                </p>
              )}
              {summaryText && (
                <section className="mb-8 rounded-2xl border border-border-default bg-surface-secondary/70 p-5 md:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] font-semibold text-brand-primary">Article Summary</span>
                  </div>
                  <p className="text-base md:text-lg leading-relaxed font-medium" style={{ color: 'var(--article-text)' }}>
                    {summaryText}
                  </p>

                  {keyTakeaways.length > 0 && (
                    <div className="mt-5">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">Key Takeaways</h2>
                      <ul className="space-y-2 text-sm md:text-base" style={{ color: 'var(--article-muted)' }}>
                        {keyTakeaways.map((takeaway) => (
                          <li key={takeaway} className="flex gap-2 leading-relaxed">
                            <span className="mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full bg-brand-primary" />
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* ALL blocks are in the DOM — completely readable and interactive */}
              <div ref={contentRef} className="relative">
                {displayBlocks.map((block) => (
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
                <h2 className="font-display text-lg text-primary mb-4">Latest Articles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {sidebarLatest.map((a) => (
                    <SidebarItem key={a.id} article={a} />
                  ))}
                </div>
              </div>
            )}

            {sidebarPicks.length > 0 && (
              <div>
                <h2 className="font-display text-lg text-primary mb-4">Author's Picks</h2>
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
          alreadyCompleted={alreadyCompleted}
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
              articleTitle={displayTitle}
              articleId={article.id}
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
              articleTitle={displayTitle}
              articleId={article.id}
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

  return (
    <div
      onClick={handleClick}
      className="glass-card p-4 cursor-pointer group"
      lang={currentLang.toLowerCase()}
      ref={translated.ref}
      aria-busy={translated.isLoading}
    >
      <div className="flex items-start gap-3">
        {article.cover_image_url && (
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
            <ExternalImage
              src={article.cover_image_url}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm text-primary font-body line-clamp-2 leading-snug mb-1">{title}</h4>
          <p className="text-xs text-muted line-clamp-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
