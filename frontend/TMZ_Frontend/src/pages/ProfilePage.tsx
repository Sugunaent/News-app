import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  BookOpen, Trophy, Target, MessageSquare, Award, Share2,
  Clock, TrendingUp, CheckCircle2, Lock, ChevronRight, Settings,
  Zap, Star, BarChart3, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/ui/States';
import { GlassCard } from '@/components/ui/GlassCard';
import { CompletionCard as CompletionCardComponent } from '@/components/articles/CompletionCard';
import {
  fetchLevels, fetchSavedArticles, fetchAllBadges,
  fetchProfileAggregate,
} from '@/lib/api';
import type {
  Level, Badge, CompletionCard, ReadingHistoryItem,
  SavedArticleItem, QuizStats, OpinionWithArticle, AchievementItem,
  UserProfile,
} from '@/types';

export function ProfilePage() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" state={{ redirect: '/profile' }} replace />;
  }

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <ProfileOverview />
    </div>
  );
}

/* ===== Profile Overview ===== */

function ProfileOverview() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [nextLevel, setNextLevel] = useState<Level | null>(null);
  const [articlesCompleted, setArticlesCompleted] = useState(0);
  const [quizStats, setQuizStats] = useState<QuizStats>({ total: 0, correct: 0, incorrect: 0, accuracy: 0 });
  const [opinionsCount, setOpinionsCount] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
  const [shareCardsCount, setShareCardsCount] = useState(0);
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>([]);
  const [completedArticles, setCompletedArticles] = useState<ReadingHistoryItem[]>([]);
  const [savedArticles, setSavedArticles] = useState<SavedArticleItem[]>([]);
  const [userOpinions, setUserOpinions] = useState<OpinionWithArticle[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [completionCards, setCompletionCards] = useState<CompletionCard[]>([]);
  const [aggregateProfile, setAggregateProfile] = useState<UserProfile | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedCard, setSelectedCard] = useState<CompletionCard | null>(null);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    Promise.all([
      fetchProfileAggregate(uid),
      fetchLevels().catch(() => []),
      fetchAllBadges(uid).catch(() => ({ all: [], earned: new Set<string>() })),
      fetchSavedArticles(uid).catch(() => []),
    ]).then(([aggregate, levels, badges, saved]) => {
      const level = aggregate.current_level
        ? {
          id: aggregate.current_level.id,
          level_number: Number(aggregate.current_level.display_order),
          name: aggregate.current_level.name,
          xp_threshold: Number(aggregate.current_level.minimum_xp),
          image_url: null,
        }
        : null;
      const aggregateUser = aggregate.user ?? {};
      const profileSnapshot: UserProfile = {
        id: aggregateUser.id ?? uid,
        email: aggregateUser.email ?? profile?.email ?? '',
        display_name: aggregateUser.display_name ?? profile?.display_name ?? 'Reader',
        avatar_url: aggregateUser.avatar_url ?? profile?.avatar_url ?? null,
        xp: Number(aggregate.total_xp ?? 0),
        level: Number(level?.level_number ?? profile?.level ?? 1),
        bio: aggregateUser.bio ?? profile?.bio ?? null,
      };
      const history = (aggregate.reading_history ?? []).map((item: any) => ({
        article_id: item.article_id,
        user_id: uid,
        percentage: Number(item.progress_percentage ?? 0),
        scroll_position: Number(item.last_position ?? 0),
        completed: Boolean(item.completed_at),
        updated_at: item.last_read_at,
        article: {
          id: item.article_id,
          title: item.article_title || 'Article',
        },
      }));
      const achievementByCard = new Map<string, number>();
      for (const item of aggregate.achievement_history ?? []) {
        const key = item.article_id ? `article:${item.article_id}` : item.badge_id ? `badge:${item.badge_id}` : null;
        if (!key) continue;
        const amount = Number(item.xp_amount ?? item.amount ?? 0);
        if (amount > 0) achievementByCard.set(key, amount);
      }

      const cards = (aggregate.share_cards ?? []).map((card: any) => {
        const rawXp = Number(card.xp_gained ?? card.xp ?? card.xp_reward ?? 0);
        const derivedXp = rawXp > 0
          ? rawXp
          : (card.article_id ? (achievementByCard.get(`article:${card.article_id}`) ?? 0) : 0);

        return {
          id: card.id,
          user_id: uid,
          article_id: card.article_id,
          article_title: card.article_title ?? card.title,
          xp_gained: derivedXp,
          created_at: card.created_at,
          card_type: card.card_type === 'OPINION' ? 'opinion' : 'completion',
          opinion_text: card.opinion_text ?? undefined,
        };
      });
      const achievementItems = (aggregate.achievement_history ?? []).map((item: any, index: number) => ({
        id: `${item.type}-${item.earned_at}-${index}`,
        type: item.type === 'BADGE' ? 'badge' : item.type === 'ARTICLE_COMPLETION' ? 'completion' : 'quiz',
        title: item.title,
        description: item.description,
        date: item.earned_at,
        xp: item.type === 'XP_ACTIVITY' ? Number((item.title.match(/\d+/) ?? ['0'])[0]) : (item.xp_amount ?? item.amount ?? 0),
      }));

      setCurrentLevel(level);
      setAggregateProfile(profileSnapshot);
      setNextLevel(levels.find((item) => item.level_number === (level?.level_number ?? 1) + 1) ?? null);
      setArticlesCompleted(Number(aggregate.articles_completed ?? 0));
      setQuizStats({
        total: Number(aggregate.quiz_performance?.total_attempts ?? 0),
        correct: Number(aggregate.quiz_performance?.correct_attempts ?? 0),
        incorrect: Number(aggregate.quiz_performance?.incorrect_attempts ?? 0),
        accuracy: Number(aggregate.quiz_performance?.accuracy_percentage ?? 0),
      });
      setOpinionsCount(Number(aggregate.opinions_submitted ?? 0));
      setUserOpinions(aggregate.opinions ?? []);
      setShareCardsCount(cards.length);
      setReadingHistory(history);
      setCompletedArticles(history.filter((item: ReadingHistoryItem) => item.completed));
      setSavedArticles(saved);
      setAchievements(achievementItems);
      setAllBadges(badges.all);
      setEarnedBadgeIds(badges.earned);
      setBadgesEarned(badges.earned.size);
      setCompletionCards(cards);
    }).catch(() => {
      showToast('Could not load profile data', 'error');
    });
  }, [user, showToast, profile]);

  const visibleProfile = aggregateProfile ?? profile!;
  const xpCurrent = visibleProfile?.xp ?? 0;
  const xpFloor = currentLevel?.xp_threshold ?? 0;
  const xpCeiling = nextLevel?.xp_threshold ?? xpFloor;
  const xpInRange = xpCurrent - xpFloor;
  const xpRange = xpCeiling - xpFloor;
  const xpPct = xpRange > 0 ? Math.min(100, Math.round((xpInRange / xpRange) * 100)) : 100;
  const xpToNext = xpCeiling - xpCurrent;

  const stats = [
    { label: 'Articles Completed', value: articlesCompleted, icon: BookOpen, color: 'text-blue-500' },
    { label: 'Quiz Accuracy', value: `${quizStats.accuracy}%`, icon: Target, color: 'text-green-500' },
    { label: 'Opinions Submitted', value: opinionsCount, icon: MessageSquare, color: 'text-amber-500' },
    { label: 'Badges Earned', value: badgesEarned, icon: Award, color: 'text-purple-500' },
    { label: 'Share Cards', value: shareCardsCount, icon: Share2, color: 'text-pink-500' },
  ];

  return (
    <div className="space-y-10">
      {/* Profile Header */}
      <ProfileHeader
        profile={visibleProfile}
        currentLevel={currentLevel}
        xpCurrent={xpCurrent}
        xpPct={xpPct}
        xpFloor={xpFloor}
        xpCeiling={xpCeiling}
        xpToNext={xpToNext}
        hasNext={!!nextLevel}
      />

      {/* Quick Stats */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <GlassCard key={stat.label} hover={false} className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="font-display text-2xl text-primary">{stat.value}</p>
              <p className="text-xs text-muted mt-0.5">{stat.label}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Continue Reading */}
      <Section title="Continue Reading" icon={BookOpen}>
        {readingHistory.filter((i) => !i.completed).length === 0 ? (
          <EmptyStateCard icon={BookOpen} message="No articles in progress. Start reading to see them here." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {readingHistory.filter((i) => !i.completed).slice(0, 4).map((item) => (
              <ReadingHistoryCard key={item.article_id} item={item} />
            ))}
          </div>
        )}
      </Section>

      {/* Saved Articles */}
      <Section title="Saved Articles" icon={Star} action="View all" onAction={() => navigate('/profile/saved')}>
        {savedArticles.length === 0 ? (
          <EmptyStateCard icon={Star} message="No saved articles yet. Bookmark articles to find them here." />
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {savedArticles.slice(0, 3).map((item) => (
              <SavedArticleCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </Section>

      {/* Completed Articles */}
      <Section title="Completed Articles" icon={CheckCircle2} action="View all" onAction={() => navigate('/profile/completed')}>
        {completedArticles.length === 0 ? (
          <EmptyStateCard icon={CheckCircle2} message="No completed articles yet. Finish reading an article to see it here." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {completedArticles.slice(0, 4).map((item) => (
              <CompletedArticleCard key={item.article_id} item={item} />
            ))}
          </div>
        )}
      </Section>

      {/* Quiz Performance */}
      <Section title="Quiz Performance" icon={BarChart3}>
        <GlassCard hover={false} className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatBlock label="Total Attempts" value={quizStats.total} icon={Target} />
            <StatBlock label="Correct" value={quizStats.correct} icon={CheckCircle2} color="text-green-500" />
            <StatBlock label="Incorrect" value={quizStats.incorrect} icon={Target} color="text-red-500" />
            <StatBlock label="Accuracy" value={`${quizStats.accuracy}%`} icon={TrendingUp} color="text-brand-primary" />
          </div>
          {quizStats.total > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>Correct</span>
                <span>{quizStats.correct} / {quizStats.total}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--btn-secondary)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${quizStats.accuracy}%`, background: 'var(--brand-primary)' }}
                />
              </div>
            </div>
          )}
        </GlassCard>
      </Section>

      {/* Opinions */}
      <Section title="Opinions" icon={MessageSquare} action="View all" onAction={() => navigate('/profile/opinions')}>
        {userOpinions.length === 0 ? (
          <EmptyStateCard icon={MessageSquare} message="No opinions submitted yet. Share your thoughts on articles." />
        ) : (
          <div className="space-y-3">
            {userOpinions.slice(0, 3).map((op) => (
              <OpinionRow key={op.id} opinion={op} />
            ))}
          </div>
        )}
      </Section>

      {/* Achievement History */}
      <Section title="Achievement History" icon={Trophy} action="View all" onAction={() => navigate('/profile/achievements')}>
        {achievements.length === 0 ? (
          <EmptyStateCard icon={Trophy} message="No achievements yet. Complete articles and quizzes to earn them." />
        ) : (
          <div className="space-y-3">
            {achievements.slice(0, 6).map((ach) => (
              <AchievementRow key={ach.id} achievement={ach} />
            ))}
          </div>
        )}
      </Section>

      {/* Badges */}
      <Section title="Badges" icon={Award} action="View all" onAction={() => navigate('/profile/badges')}>
        {allBadges.length === 0 ? (
          <EmptyStateCard icon={Award} message="No badges available yet." />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {allBadges.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              return (
                <button
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
                      earned
                        ? 'bg-gradient-to-br from-brand-primary to-brand-accent shadow-lg'
                        : 'bg-brand-accent/5 opacity-40'
                    }`}
                  >
                    {badge.image_url ? (
                      <img src={badge.image_url} alt={badge.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <Award className={`w-8 h-8 ${earned ? 'text-white' : 'text-muted'}`} />
                    )}
                  </div>
                  <span className={`text-xs text-center font-body ${earned ? 'text-primary' : 'text-muted'}`}>
                    {badge.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Shareable Cards */}
      <Section title="Shareable Cards" icon={Share2} action="View all" onAction={() => navigate('/profile/cards')}>
        {completionCards.length === 0 ? (
          <EmptyStateCard icon={Share2} message="No shareable cards yet. Complete an article or share your opinion to earn one." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {completionCards.slice(0, 4).map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="text-left group cursor-pointer focus:outline-none w-full"
              >
                <GlassCard className="p-3 sm:p-4 h-full flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-brand-primary/40">
                  <div
                    className="aspect-[3/4] w-full rounded-xl sm:rounded-2xl mb-2.5 sm:mb-3 flex flex-col items-center justify-center p-3 sm:p-4 text-center transition-transform group-hover:scale-[1.02] shadow-md"
                    style={{
                      background: 'linear-gradient(150deg, #0077b6 0%, #023e8a 55%, #03045e 100%)',
                    }}
                  >
                    <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white mb-2 sm:mb-3 drop-shadow-sm" />
                    <p className="text-white font-display font-semibold text-xs sm:text-sm leading-snug line-clamp-3 mb-1.5 sm:mb-2">
                      {card.article_title}
                    </p>
                    <p className="text-white/80 font-display text-xs font-medium">
                      +{card.xp_gained} XP
                    </p>
                  </div>
                  <p className="text-xs text-muted text-center font-body group-hover:text-primary transition-colors">
                    Tap to view & share
                  </p>
                </GlassCard>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Settings Link */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl glass-card hover:-translate-y-0.5 transition-all text-secondary hover:text-primary"
        >
          <Settings className="w-5 h-5" />
          <span className="font-body text-sm">Settings</span>
        </button>
      </div>

      {/* Badge Modal */}
      {selectedBadge && (
        <Modal isOpen={!!selectedBadge} onClose={() => setSelectedBadge(null)}>
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center mx-auto mb-4">
              {selectedBadge.image_url ? (
                <img src={selectedBadge.image_url} alt={selectedBadge.name} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <Award className="w-10 h-10 text-white" />
              )}
            </div>
            <h3 className="font-display text-xl text-primary mb-2">{selectedBadge.name}</h3>
            <p className="text-sm text-muted">{selectedBadge.description}</p>
            <div className="mt-4">
              {earnedBadgeIds.has(selectedBadge.id) ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-500">
                  <CheckCircle2 className="w-4 h-4" /> Earned
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Lock className="w-4 h-4" /> Not yet earned
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Share Card Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 transition-opacity"
            style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSelectedCard(null)}
          />
          <div className="relative z-10 w-full max-w-lg animate-scale-in">
            <CompletionCardComponent
              cardType={selectedCard.card_type ?? 'completion'}
              username={visibleProfile.display_name ?? 'Reader'}
              articleTitle={selectedCard.article_title}
              articleId={selectedCard.article_id}
              xpGained={selectedCard.xp_gained}
              opinionText={selectedCard.opinion_text}
              onClose={() => setSelectedCard(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Profile Header ===== */

function ProfileHeader({
  profile, currentLevel, xpCurrent, xpPct, xpFloor: _xpFloor, xpCeiling, xpToNext, hasNext,
}: {
  profile: { display_name: string; email: string; avatar_url: string | null; level: number; xp: number };
  currentLevel: Level | null;
  xpCurrent: number;
  xpPct: number;
  xpFloor: number;
  xpCeiling: number;
  xpToNext: number;
  hasNext: boolean;
}) {
  return (
    <GlassCard hover={false} className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Avatar */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-3xl font-display shrink-0 overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            profile.display_name?.[0]?.toUpperCase() || 'U'
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl md:text-3xl text-primary">{profile.display_name}</h1>
          <p className="text-sm text-muted mt-1">{profile.email}</p>

          {/* Level + XP */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Level</p>
                <p className="font-display text-base text-primary">
                  {currentLevel?.name ?? `Level ${profile.level}`}
                </p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-10" style={{ background: 'var(--border-default)' }} />
            <div>
              <p className="text-xs text-muted uppercase tracking-wider">Total XP</p>
              <p className="font-display text-base text-primary">{xpCurrent} XP</p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted mb-1.5">
              <span>{xpCurrent} / {hasNext ? xpCeiling : xpCurrent} XP</span>
              {hasNext && <span>{xpToNext} XP to next level</span>}
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--btn-secondary)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${xpPct}%`,
                  background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-accent))',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* ===== Section Wrapper ===== */

function Section({
  title, icon: Icon, action, onAction, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand-primary" />
          </div>
          <h2 className="font-display text-xl md:text-2xl text-primary">{title}</h2>
        </div>
        {action && (
          <button
            onClick={onAction}
            className="text-sm text-brand-primary hover:text-brand-accent transition-colors flex items-center gap-1 group"
          >
            {action}
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/* ===== Empty State Card ===== */

function EmptyStateCard({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <GlassCard hover={false} className="p-10 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand-accent/5 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted" />
      </div>
      <p className="text-sm text-muted max-w-xs">{message}</p>
    </GlassCard>
  );
}

/* ===== Stat Block ===== */

function StatBlock({
  label, value, icon: Icon, color = 'text-primary',
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className={`w-6 h-6 mb-2 ${color}`} />
      <p className="font-display text-2xl text-primary">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

/* ===== Reading History Card ===== */

function ReadingHistoryCard({ item }: { item: ReadingHistoryItem }) {
  const navigate = useNavigate();
  const article = item.article;
  if (!article) return null;

  return (
    <GlassCard className="p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0">
        <BookOpen className="w-6 h-6 text-brand-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-sm text-primary line-clamp-1">{article.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--btn-secondary)' }}>
            <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${item.percentage}%` }} />
          </div>
          <span className="text-xs text-muted shrink-0">{item.percentage}%</span>
        </div>
        <p className="text-xs text-muted mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(item.updated_at)}
        </p>
      </div>
      <button
        onClick={() => navigate(`/article/${article.id}`)}
        className="btn-primary text-xs px-4 py-2 shrink-0"
      >
        Continue
      </button>
    </GlassCard>
  );
}

/* ===== Saved Article Card ===== */

function SavedArticleCard({ item }: { item: SavedArticleItem }) {
  const navigate = useNavigate();
  const article = item.article;
  if (!article) return null;

  return (
    <GlassCard className="overflow-hidden cursor-pointer" >
      <div onClick={() => navigate(`/article/${article.id}`)}>
        {article.cover_image_url && (
          <div className="h-32 overflow-hidden">
            <img src={article.cover_image_url} alt={article.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-display text-sm text-primary line-clamp-2">{article.title}</h3>
          <p className="text-xs text-muted mt-1 line-clamp-1">{article.subtitle}</p>
        </div>
      </div>
    </GlassCard>
  );
}

/* ===== Completed Article Card ===== */

function CompletedArticleCard({ item }: { item: ReadingHistoryItem }) {
  const navigate = useNavigate();
  const article = item.article;
  if (!article) return null;

  return (
    <GlassCard className="p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-6 h-6 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-sm text-primary line-clamp-1">{article.title}</h3>
        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </p>
        <p className="text-xs text-muted mt-0.5">{formatRelativeTime(item.updated_at)}</p>
      </div>
      <button
        onClick={() => navigate(`/article/${article.id}`)}
        className="btn-secondary text-xs px-4 py-2 shrink-0"
      >
        Reopen
      </button>
    </GlassCard>
  );
}

/* ===== Opinion Row ===== */

function OpinionRow({ opinion }: { opinion: OpinionWithArticle }) {
  const navigate = useNavigate();

  return (
    <GlassCard hover={false} className="p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
        <MessageSquare className="w-5 h-5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary font-body mb-1">{opinion.question_text}</p>
        <p className="text-sm text-muted">
          <span className="text-secondary font-body">Response:</span> {opinion.opinion_text}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
          <span>{opinion.article_title}</span>
          <span>{formatRelativeTime(opinion.created_at)}</span>
        </div>
      </div>
      <button
        onClick={() => navigate(`/article/${opinion.article_id}`)}
        className="btn-secondary text-xs px-4 py-2 shrink-0"
      >
        Reopen
      </button>
    </GlassCard>
  );
}

/* ===== Achievement Row ===== */

function AchievementRow({ achievement }: { achievement: AchievementItem }) {
  const icon = achievement.type === 'completion' ? CheckCircle2
    : achievement.type === 'badge' ? Award
    : Target;

  const Icon = icon as React.ComponentType<{ className?: string }>;
  const color = achievement.type === 'completion' ? 'text-green-500'
    : achievement.type === 'badge' ? 'text-purple-500'
    : 'text-brand-primary';

  return (
    <GlassCard hover={false} className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary font-body">{achievement.title}</p>
        <p className="text-xs text-muted line-clamp-1">{achievement.description}</p>
      </div>
      <div className="text-right shrink-0">
        {achievement.xp > 0 && <p className="text-xs text-brand-primary font-body">+{achievement.xp} XP</p>}
        <p className="text-xs text-muted mt-0.5">{formatRelativeTime(achievement.date)}</p>
      </div>
    </GlassCard>
  );
}

/* ===== Utils ===== */

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return date.toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
