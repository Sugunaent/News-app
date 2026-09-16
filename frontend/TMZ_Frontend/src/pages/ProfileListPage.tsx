import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Award, Trophy, Share2, MessageSquare,
  BookOpen, Target, Lock, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingState, ErrorState, Modal } from '@/components/ui/States';
import { CompletionCard as CompletionCardComponent } from '@/components/articles/CompletionCard';
import {
  fetchCompletedArticles,
  fetchAllBadges,
  fetchAchievementHistory,
  fetchCompletionCards,
  fetchUserOpinions,
  fetchSavedArticles,
} from '@/lib/api';
import type {
  ReadingHistoryItem, Badge, AchievementItem,
  CompletionCard, OpinionWithArticle, SavedArticleItem,
} from '@/types';

type ListType = 'completed' | 'badges' | 'achievements' | 'cards' | 'opinions' | 'saved';

const META: Record<ListType, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  completed: { title: 'Completed Articles', icon: CheckCircle2 },
  badges: { title: 'All Badges', icon: Award },
  achievements: { title: 'Achievement History', icon: Trophy },
  cards: { title: 'Shareable Cards', icon: Share2 },
  opinions: { title: 'All Opinions', icon: MessageSquare },
  saved: { title: 'Saved Articles', icon: BookOpen },
};

export function ProfileListPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <LoadingState message="Loading..." />;
  if (!user) return <Navigate to="/auth" state={{ redirect: `/profile/${type}` }} replace />;

  const listType = type as ListType;
  if (!META[listType]) return <ErrorState message="Page not found." onRetry={() => navigate('/profile')} />;

  const meta = META[listType];
  const Icon = meta.icon;

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <button
        type="button"
        onClick={() => {
          if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate('/profile');
          }
        }}
        className="inline-flex items-center gap-2 px-3 py-1.5 -ml-2 rounded-xl text-sm font-medium text-secondary hover:text-primary hover:bg-white/5 active:scale-95 transition-all cursor-pointer mb-6"
        aria-label="Back to Profile"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-primary" />
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-primary">{meta.title}</h1>
      </div>

      {listType === 'completed' && <CompletedList userId={user.id} />}
      {listType === 'badges' && <BadgesList userId={user.id} />}
      {listType === 'achievements' && <AchievementsList userId={user.id} />}
      {listType === 'cards' && <CardsList userId={user.id} />}
      {listType === 'opinions' && <OpinionsList userId={user.id} />}
      {listType === 'saved' && <SavedList userId={user.id} />}
    </div>
  );
}

/* ===== Completed Articles ===== */

function CompletedList({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReadingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedArticles(userId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState message="Loading completed articles..." />;
  if (items.length === 0) return <EmptyMessage message="No completed articles yet." />;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const article = item.article;
        if (!article) return null;
        return (
          <GlassCard key={item.article_id} className="p-4 flex items-center gap-4">
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
      })}
    </div>
  );
}

/* ===== Badges ===== */

function BadgesList({ userId }: { userId: string }) {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    fetchAllBadges(userId)
      .then((result) => { setAllBadges(result.all); setEarnedIds(result.earned); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState message="Loading badges..." />;
  if (allBadges.length === 0) return <EmptyMessage message="No badges available yet." />;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {allBadges.map((badge) => {
          const earned = earnedIds.has(badge.id);
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
              {earnedIds.has(selectedBadge.id) ? (
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
    </>
  );
}

/* ===== Achievement History ===== */

function AchievementsList({ userId }: { userId: string }) {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievementHistory(userId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState message="Loading achievements..." />;
  if (items.length === 0) return <EmptyMessage message="No achievements yet." />;

  return (
    <div className="space-y-3">
      {items.map((ach) => {
        const Icon = ach.type === 'completion' ? CheckCircle2
          : ach.type === 'badge' ? Award
          : Target;
        const color = ach.type === 'completion' ? 'text-green-500'
          : ach.type === 'badge' ? 'text-amber-500'
          : 'text-brand-primary';

        return (
          <GlassCard key={ach.id} hover={false} className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary font-body">{ach.title}</p>
              <p className="text-xs text-muted line-clamp-1">{ach.description}</p>
            </div>
            <div className="text-right shrink-0">
              {ach.xp > 0 && <p className="text-xs text-brand-primary font-body">+{ach.xp} XP</p>}
              <p className="text-xs text-muted mt-0.5">{formatRelativeTime(ach.date)}</p>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

/* ===== Shareable Cards ===== */

function CardsList({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<CompletionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CompletionCard | null>(null);

  useEffect(() => {
    fetchCompletionCards(userId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState message="Loading shareable cards..." />;
  if (items.length === 0) return <EmptyMessage message="No shareable cards yet." />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((card) => (
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
              username={profile?.display_name ?? 'Reader'}
              articleTitle={selectedCard.article_title}
              articleId={selectedCard.article_id}
              xpGained={selectedCard.xp_gained}
              opinionText={selectedCard.opinion_text}
              onClose={() => setSelectedCard(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ===== Opinions ===== */

function OpinionsList({ userId }: { userId: string }) {
  const [items, setItems] = useState<OpinionWithArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserOpinions(userId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState message="Loading opinions..." />;
  if (items.length === 0) return <EmptyMessage message="No opinions submitted yet." />;

  return (
    <div className="space-y-3">
      {items.map((op) => (
        <GlassCard key={op.id} hover={false} className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              {op.opinion && (
                <p className="text-sm text-primary font-body mb-1">{op.opinion.question}</p>
              )}
              <p className="text-sm text-muted">
                <span className="text-secondary font-body">Response:</span> {op.selected_option}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                {op.article && <span>{op.article.title}</span>}
                <span>{formatRelativeTime(op.created_at)}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ===== Saved Articles ===== */

function SavedList({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedArticleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedArticles(userId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState message="Loading saved articles..." />;
  if (items.length === 0) return <EmptyMessage message="No saved articles yet." />;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {items.map((item) => {
        const article = item.article;
        if (!article) return null;
        return (
          <GlassCard key={item.id} className="overflow-hidden cursor-pointer">
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
      })}
    </div>
  );
}

/* ===== Shared ===== */

function EmptyMessage({ message }: { message: string }) {
  return (
    <GlassCard hover={false} className="p-10 flex flex-col items-center justify-center text-center">
      <p className="text-sm text-muted max-w-xs">{message}</p>
    </GlassCard>
  );
}

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
