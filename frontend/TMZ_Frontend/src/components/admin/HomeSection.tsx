import { useEffect, useState, useCallback } from 'react';
import {
  Star, ChevronUp, ChevronDown, Plus, Trash2,
  Search, Edit3, Check, RefreshCw, Calendar,
  Sparkles, AlertCircle, ImageIcon, Sliders, Layout, Link as LinkIcon,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  fetchAuthorsPicksManagement,
  updateAuthorsPicksOrder,
  fetchAdminHeroConfig,
  updateAdminHeroConfig,
  type HeroConfig,
  DEFAULT_HERO_CONFIG,
} from '@/lib/admin/api';
import type { AdminArticle } from '@/lib/admin/adminTypes';

interface HomeSectionProps {
  openArticleEditor?: (articleId: string) => void;
}

export function HomeSection({ openArticleEditor }: HomeSectionProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'hero' | 'picks'>('hero');

  // Hero config state
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(DEFAULT_HERO_CONFIG);
  const [savingHero, setSavingHero] = useState(false);
  const [heroChanged, setHeroChanged] = useState(false);

  // Author's picks state
  const [picks, setPicks] = useState<AdminArticle[]>([]);
  const [available, setAvailable] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPicks, setSavingPicks] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [picksChanged, setPicksChanged] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [heroData, picksData] = await Promise.all([
        fetchAdminHeroConfig(),
        fetchAuthorsPicksManagement(),
      ]);
      setHeroConfig(heroData);
      setPicks(picksData.orderedPicks);
      setAvailable(picksData.availableArticles);
      setHeroChanged(false);
      setPicksChanged(false);
    } catch {
      showToast('Failed to load Homepage configuration', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ===== Hero Banner Handlers ===== */
  const handleHeroFieldChange = (field: keyof HeroConfig, value: string) => {
    setHeroConfig((prev) => ({ ...prev, [field]: value }));
    setHeroChanged(true);
  };

  const handleSaveHero = async () => {
    if (!heroConfig.imageUrl.trim()) {
      showToast('Please provide a valid image URL for the Hero Banner', 'info');
      return;
    }
    setSavingHero(true);
    try {
      await updateAdminHeroConfig(heroConfig);
      setHeroChanged(false);
      showToast('Homepage hero banner image and settings updated!', 'success');
    } catch {
      showToast('Failed to save Hero settings', 'error');
    } finally {
      setSavingHero(false);
    }
  };

  const handleResetHero = () => {
    setHeroConfig(DEFAULT_HERO_CONFIG);
    setHeroChanged(true);
    showToast('Hero settings reset to default', 'info');
  };

  /* ===== Author's Picks Handlers ===== */
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= picks.length) return;
    const newPicks = [...picks];
    [newPicks[index], newPicks[target]] = [newPicks[target], newPicks[index]];
    setPicks(newPicks);
    setPicksChanged(true);
  };

  const handleSetRank = (index: number, newRank: number) => {
    if (newRank < 1 || newRank > picks.length || newRank - 1 === index) return;
    const item = picks[index];
    const newPicks = picks.filter((_, i) => i !== index);
    newPicks.splice(newRank - 1, 0, item);
    setPicks(newPicks);
    setPicksChanged(true);
  };

  const handleAdd = (article: AdminArticle) => {
    setAvailable((prev) => prev.filter((a) => a.id !== article.id));
    setPicks((prev) => [...prev, { ...article, is_authors_pick: true }]);
    setPicksChanged(true);
    showToast(`Added "${article.title.slice(0, 30)}..." to Author's Picks`, 'success');
  };

  const handleRemove = (articleId: string) => {
    const removed = picks.find((p) => p.id === articleId);
    if (!removed) return;
    setPicks((prev) => prev.filter((p) => p.id !== articleId));
    setAvailable((prev) => [{ ...removed, is_authors_pick: false }, ...prev]);
    setPicksChanged(true);
    showToast('Removed from Author\'s Picks', 'success');
  };

  const handleSaveOrder = async () => {
    setSavingPicks(true);
    try {
      const ids = picks.map((p) => p.id);
      await updateAuthorsPicksOrder(ids);
      setPicksChanged(false);
      showToast('Author\'s Picks sequence updated and published to Homepage', 'success');
    } catch {
      showToast('Failed to save Author\'s Picks order', 'error');
    } finally {
      setSavingPicks(false);
    }
  };

  // Filter available articles
  const filteredAvailable = available.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(search.toLowerCase()) ||
      (art.subtitle && art.subtitle.toLowerCase().includes(search.toLowerCase())) ||
      (art.author_name && art.author_name.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      categoryFilter === 'all' || art.category_name?.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set([...picks, ...available].map((a) => a.category_name).filter(Boolean))
  ) as string[];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Draft';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
        <p className="text-secondary font-body">Loading Homepage Management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/15 flex items-center justify-center text-brand-primary">
              <Layout className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl text-primary font-bold">Homepage Management</h1>
          </div>
          <p className="text-sm text-secondary font-body mt-1">
            Customize the editorial hero image and arrange the curated Author's Picks sequence on the homepage.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-surface-secondary/80 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('hero')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'hero'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-secondary'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Hero Image &amp; Banner</span>
            {heroChanged && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('picks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'picks'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-secondary'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Author's Picks ({picks.length})</span>
            {picksChanged && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          </button>
        </div>
      </div>

      {/* TAB 1: HERO IMAGE & BANNER SETTINGS */}
      {activeTab === 'hero' && (
        <div className="space-y-6 max-w-3xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display text-lg text-primary font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-primary" />
                Hero Image &amp; Link Configuration
              </h2>
              <p className="text-xs text-secondary font-body mt-0.5">
                Set the homepage static hero banner image and configure the &quot;Know more &rarr;&quot; link destination.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetHero}
                className="text-xs"
                title="Reset fields to original defaults"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSaveHero}
                disabled={savingHero || !heroChanged}
                className="!bg-brand-primary hover:!bg-brand-accent shadow-sm text-xs"
              >
                {savingHero ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" /> Save Hero Image
                  </>
                )}
              </Button>
            </div>
          </div>

          <GlassCard hover={false} className="p-6 space-y-6 bg-surface-primary/70 border border-border">
            {/* Image URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center justify-between">
                <span>Hero Image URL <span className="text-red-500">*</span></span>
                <span className="text-[11px] text-muted font-normal">Direct URL or relative path</span>
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="url"
                  value={heroConfig.imageUrl}
                  onChange={(e) => handleHeroFieldChange('imageUrl', e.target.value)}
                  placeholder="/modern_stories_hero.jpg or https://images.unsplash.com/..."
                  className="input-field pl-9 text-xs py-2.5 font-mono"
                />
              </div>
              <p className="text-[11px] text-muted">
                URL of the static image displayed in the homepage hero banner card.
              </p>
            </div>

            {/* Link Destination (Know more ->) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-brand-primary" />
                <span>Know more &rarr; Link Destination</span>
              </label>
              <input
                type="text"
                value={heroConfig.linkUrl}
                onChange={(e) => handleHeroFieldChange('linkUrl', e.target.value)}
                placeholder="/about or https://example.com"
                className="input-field text-xs py-2.5 font-mono"
              />
              <p className="text-[11px] text-muted">
                Destination link when users click &quot;Know more &rarr;&quot; in the hero section.
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: AUTHOR'S PICKS MANAGEMENT */}
      {activeTab === 'picks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display text-lg text-primary font-bold flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                Curated Author's Picks Sequence
              </h2>
              <p className="text-xs text-secondary font-body mt-0.5">
                Select stories from your catalog to feature in the dedicated Author's Picks section and reorder them into your preferred sequence.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {picksChanged && (
                <span className="text-xs text-amber-500 font-medium animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes
                </span>
              )}
              <Button
                onClick={handleSaveOrder}
                disabled={savingPicks || !picksChanged}
                size="sm"
                className="!bg-brand-primary hover:!bg-brand-accent shadow-sm text-xs"
              >
                {savingPicks ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" /> Save Order
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Main Grid: Active Picks on the Left, Article Picker on the Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Active Picks List (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Active Homepage Sequence ({picks.length})
                </h3>
                <span className="text-[11px] text-muted">Use arrows or dropdown to change rank</span>
              </div>

              {picks.length === 0 ? (
                <GlassCard className="p-8 text-center border-dashed">
                  <Sparkles className="w-10 h-10 text-muted mx-auto mb-3" />
                  <h4 className="font-display text-base text-primary mb-1">No Author's Picks Selected</h4>
                  <p className="text-xs text-secondary max-w-sm mx-auto mb-4">
                    Select articles from the catalog on the right to feature them on the homepage.
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-2.5">
                  {picks.map((article, index) => (
                    <GlassCard
                      key={article.id}
                      hover={false}
                      className="p-3.5 flex items-center gap-3 group border border-border/80 hover:border-amber-500/40 transition-all bg-surface-primary/80"
                    >
                      {/* Position Badge & Reordering Arrows */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          title="Move up"
                          className="p-1 rounded hover:bg-surface-secondary text-secondary hover:text-primary disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                          #{index + 1}
                        </span>
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === picks.length - 1}
                          title="Move down"
                          className="p-1 rounded hover:bg-surface-secondary text-secondary hover:text-primary disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Cover Image Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-secondary border border-border relative">
                        {article.cover_image_url ? (
                          <img
                            src={article.cover_image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                            No img
                          </div>
                        )}
                      </div>

                      {/* Article Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {article.category_name && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-primary/10 text-brand-primary">
                              {article.category_name}
                            </span>
                          )}
                          <span className="text-[10px] text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(article.published_at || article.created_at)}
                          </span>
                        </div>

                        <h4 className="font-display text-sm font-semibold text-primary truncate">
                          {article.title}
                        </h4>
                        <p className="text-xs text-muted truncate">
                          {article.subtitle || (article.author_name ? `By ${article.author_name}` : 'No subtitle')}
                        </p>
                      </div>

                      {/* Position Selector & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Position Selector Dropdown */}
                        <select
                          value={index + 1}
                          onChange={(e) => handleSetRank(index, parseInt(e.target.value, 10))}
                          className="px-2 py-1 rounded text-xs bg-surface-secondary border border-border text-secondary font-mono focus:outline-none focus:border-brand-primary"
                          title="Change Position Rank"
                        >
                          {picks.map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Pos #{i + 1}
                            </option>
                          ))}
                        </select>

                        {/* Edit Article in CMS */}
                        {openArticleEditor && (
                          <button
                            onClick={() => openArticleEditor(article.id)}
                            title="Edit Article in CMS"
                            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-secondary transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Remove from Picks */}
                        <button
                          onClick={() => handleRemove(article.id)}
                          title="Remove from Author's Picks"
                          className="p-1.5 rounded-lg text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Article Library / Picker (5 Cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Add Stories to Picks ({filteredAvailable.length})
                </h3>
              </div>

              <GlassCard hover={false} className="p-4 space-y-3 bg-surface-primary/60 border border-border">
                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Search articles by title or author..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field pl-9 text-xs py-2"
                    />
                  </div>

                  {categories.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                      <button
                        onClick={() => setCategoryFilter('all')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          categoryFilter === 'all'
                            ? 'bg-brand-primary text-white'
                            : 'bg-surface-secondary text-secondary hover:text-primary'
                        }`}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                            categoryFilter === cat
                              ? 'bg-brand-primary text-white'
                              : 'bg-surface-secondary text-secondary hover:text-primary'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* List of Available Articles */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {filteredAvailable.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">
                      No articles found matching filters.
                    </div>
                  ) : (
                    filteredAvailable.map((article) => (
                      <div
                        key={article.id}
                        className="p-2.5 rounded-lg bg-surface-secondary/50 hover:bg-surface-secondary border border-border flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-surface-primary border border-border">
                            {article.cover_image_url ? (
                              <img
                                src={article.cover_image_url}
                                alt={article.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-muted">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-semibold text-primary truncate">
                              {article.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-muted">
                              {article.category_name && <span>{article.category_name}</span>}
                              <span>•</span>
                              <span>{formatDate(article.published_at || article.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAdd(article)}
                          className="px-2 py-1 rounded bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
