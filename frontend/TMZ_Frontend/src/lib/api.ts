/** Frontend data service layer for live Supabase content and backend APIs. */

import type {
  Category, Promotion, Article, ArticleWithBlocks, Comment,
  ReadingProgress, UserProfile, Level, Badge, UserBadge, Bookmark,
  OpinionSubmission, CompletionCard, TeamMember,
  ReadingHistoryItem, SavedArticleItem, QuizStats, OpinionWithArticle,
  AchievementItem, CompletionResult, QuizAttemptResult,
} from '@/types';
import type { Language } from '@/lib/language';

import { apiFetchJson } from './backendClient';
import { supabase } from './supabase';

import {
  ARTICLES, ARTICLES_WITH_BLOCKS,
  COMMENTS, LEVELS, BADGES, TEAM_MEMBERS,
  DEFAULT_PROFILE, DEFAULT_USER_BADGES, DEFAULT_COMPLETION_CARDS,
  DEFAULT_READING_HISTORY, DEFAULT_SAVED_ARTICLES, DEFAULT_OPINIONS,
  DEFAULT_ACHIEVEMENTS,
  generateArticleWithBlocks,
} from './mock/data';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

async function withEnglishFallback<T>(
  request: Promise<T>,
  language: Language,
  fetchEnglish: () => Promise<T>,
  mockFallback: T,
  label: string,
): Promise<T> {
  try {
    return await request;
  } catch (error) {
    console.warn(`[api] Could not load ${label} in ${language}; using English content:`, error);
    if (language !== 'EN') return fetchEnglish();
    return mockFallback;
  }
}

function normalizeCategory(item: any): Category {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description ?? null,
    image_url: item.image_url ?? item.imageUrl ?? null,
  };
}

function normalizeArticle(item: any, language: Language = 'EN'): Article {
  const languageKey = language.toLowerCase() as 'te' | 'hi';
  const contentLanguage = typeof item.content_language === 'string'
    ? item.content_language.toUpperCase()
    : language;
  const normalizedContentLanguage: Language = contentLanguage === 'EN'
    || contentLanguage === 'TE'
    || contentLanguage === 'HI'
    ? contentLanguage
    : language;
  const languageTranslation = item.translations?.[languageKey];
  const localizedTitle = languageTranslation?.title ?? item[`title_${languageKey}`];
  const localizedSubtitle = languageTranslation?.subtitle ?? item[`subtitle_${languageKey}`];
  const localizedSummary = languageTranslation?.summary ?? item[`summary_${languageKey}`];
  const summaryText = localizedSummary || localizedSubtitle || item.summary || item.subtitle || '';
  const hasLocalizedSummary = Boolean(localizedSummary || localizedSubtitle || item.content_language === language);
  const localizedTakeaways = language === 'EN'
    ? undefined
    : languageTranslation?.key_takeaways ?? item[`key_takeaways_${languageKey}`];
  const takeaways = hasLocalizedSummary ? localizedTakeaways : item.key_takeaways;
  const baseTakeaways = Array.isArray(takeaways)
    ? takeaways.filter((value: unknown) => typeof value === 'string' && value.trim())
    : [];
  const derivedTakeaways = baseTakeaways.length > 0
    ? baseTakeaways
    : summaryText
      .split(/[•\n;]|\s+-\s+/)
      .map((value: string) => value.trim())
      .filter((value: string) => value.length > 0 && value.length < 120)
      .slice(0, 3);

  return {
    id: item.id,
    slug: item.slug ?? '',
    title: localizedTitle || item.title,
    subtitle: localizedSubtitle || item.subtitle || '',
    summary: localizedSummary || summaryText || null,
    title_te: item.title_te ?? item.translations?.te?.title ?? null,
    subtitle_te: item.subtitle_te ?? item.translations?.te?.subtitle ?? null,
    summary_te: item.summary_te ?? item.translations?.te?.summary ?? null,
    title_hi: item.title_hi ?? item.translations?.hi?.title ?? null,
    subtitle_hi: item.subtitle_hi ?? item.translations?.hi?.subtitle ?? null,
    summary_hi: item.summary_hi ?? item.translations?.hi?.summary ?? null,
    translations: item.translations,
    content_language: normalizedContentLanguage,
    key_takeaways: derivedTakeaways.slice(0, 3),
    category_id: item.category_id ?? item.category?.id ?? '',
    category: item.category ? normalizeCategory(item.category) : undefined,
    article_type: item.article_type === 'STANDARD' ? 'ARTICLE' : item.article_type ?? 'ARTICLE',
    cover_image_url: item.cover_image_url ?? item.cover?.signed_url ?? item.cover?.url ?? null,
    author_id: null,
    author_name: item.author_name ?? null,
    published_at: item.published_at ?? item.created_at ?? null,
    created_at: item.created_at ?? null,
    is_published: item.is_published ?? true,
    is_featured: Boolean(item.is_featured),
    is_authors_pick: Boolean(item.is_author_pick),
    reading_time_minutes: item.reading_time_minutes ?? null,
    seo_title: item.seo_title ?? item.meta_title ?? item.title ?? null,
    seo_description: item.seo_description ?? item.meta_description ?? item.summary ?? item.subtitle ?? null,
    meta_image_url: item.meta_image_url ?? item.og_image ?? item.cover_image_url ?? item.cover?.signed_url ?? null,
    canonical_url: item.canonical_url ?? null,
    tags: item.tags ?? null,
    keywords: item.keywords ?? null,
  };
}

export function getArticleRoute(articleLike: { id: string; slug?: string | null } | string): string {
  const slug = typeof articleLike === 'string' ? articleLike : articleLike.slug || articleLike.id;
  return `/article/${encodeURIComponent(slug)}`;
}

function normalizeReadingProgress(item: any): ReadingProgress | null {
  if (!item) return null;
  return {
    article_id: item.article_id,
    user_id: item.user_id ?? '',
    percentage: Number(item.progress_percentage ?? item.percentage ?? 0),
    scroll_position: Number(item.last_position ?? item.scroll_position ?? 0),
    completed: Boolean(item.completed_at || item.completed),
    updated_at: item.last_read_at ?? item.updated_at ?? new Date().toISOString(),
  };
}

function normalizeProfileFromAggregate(item: any): UserProfile {
  const user = item.user ?? item;
  const level = item.current_level ?? null;
  const currentLevelNumber = typeof level?.display_order === 'number'
    ? level.display_order
    : typeof level?.level_number === 'number'
      ? level.level_number
      : 1;

  return {
    id: user.id,
    email: user.email ?? '',
    display_name: user.display_name ?? 'Reader',
    avatar_url: user.avatar_url ?? null,
    xp: Number(item.total_xp ?? user.xp ?? 0),
    level: Number(currentLevelNumber),
    bio: user.bio ?? null,
  };
}

function normalizeLevel(level: any): Level {
  return {
    id: level.id,
    level_number: Number(level.level_number ?? level.display_order ?? 1),
    name: level.name,
    xp_threshold: Number(level.xp_threshold ?? level.minimum_xp ?? 0),
    image_url: level.image_url ?? level.imageUrl ?? null,
  };
}

function normalizeBadge(badge: any): Badge {
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description ?? '',
    image_url: badge.image_url ?? badge.imageUrl ?? null,
  };
}

function normalizeTeamMember(item: any): TeamMember {
  return {
    id: item.id,
    name: item.name,
    role: item.role,
    bio: item.bio ?? '',
    image_url: item.image_url ?? item.imageUrl ?? '',
    social_links: Array.isArray(item.social_links) ? item.social_links : [],
  };
}

/* --------- in-memory session state (resets on page refresh, with localStorage persistence for user progression) --------- */
const COMPLETION_CARDS_STORAGE_KEY = 'tms_completion_cards';

function loadCompletionCards(): CompletionCard[] {
  try {
    const raw = localStorage.getItem(COMPLETION_CARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_COMPLETION_CARDS];
}

function saveCompletionCards(cards: CompletionCard[]) {
  try {
    localStorage.setItem(COMPLETION_CARDS_STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // ignore
  }
}

const _profile: UserProfile = { ...DEFAULT_PROFILE };
const _bookmarks = new Set<string>(DEFAULT_SAVED_ARTICLES.map((b) => b.article_id));
const _readingProgress: Record<string, ReadingProgress> = {};
let _completionCards: CompletionCard[] = loadCompletionCards();
const _completedArticleIds = new Set<string>(_completionCards.map((c) => c.article_id));
let _comments: Comment[] = [...COMMENTS];
const _quizAttempted = new Set<string>();
const _opinionSubmitted = new Set<string>();
const _opinions: OpinionSubmission[] = [...DEFAULT_OPINIONS];
const _bookmarkList: Bookmark[] = DEFAULT_SAVED_ARTICLES.map((s) => ({
  id: s.id,
  user_id: s.user_id,
  article_id: s.article_id,
  created_at: s.created_at,
}));

/* ===================== CATEGORIES ===================== */

let categoriesCache: { items: Category[]; expiresAt: number } | null = null;
let categoriesRequest: Promise<Category[]> | null = null;

export async function fetchCategories(): Promise<Category[]> {
  if (categoriesCache && categoriesCache.expiresAt > Date.now()) return categoriesCache.items;
  if (categoriesRequest) return categoriesRequest;
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const client = supabase;
  categoriesRequest = (async () => {
    try {
      const { data, error } = await client
        .from('categories')
        .select('id, name, slug, description, image_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      const items = asArray<any>(data).map(normalizeCategory);
      categoriesCache = { items, expiresAt: Date.now() + 60_000 };
      return items;
    } finally {
      categoriesRequest = null;
    }
  })();
  return categoriesRequest;
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const items = await fetchCategories();
  return items.find((c) => c.slug === slug) ?? null;
}

/* ===================== HERO BANNER CONFIG ===================== */

export interface HeroConfig {
  imageUrl: string;
  title: string;
  subtitle: string;
  badgeText: string;
  linkText: string;
  linkUrl: string;
}

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  imageUrl: '/modern_stories_hero.jpg',
  title: 'Human stories & modern ideas',
  subtitle: 'A sanctuary to read, write, and deepen your understanding across technology, science, culture, and human ingenuity.',
  badgeText: 'The Modern Stories • Curated Editorial',
  linkText: 'Know more',
  linkUrl: '/about',
};

const HERO_CONFIG_KEY = 'tms_hero_banner_config';

export function getStoredHeroConfig(): HeroConfig {
  try {
    const raw = localStorage.getItem(HERO_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.imageUrl === 'string') {
        const isLegacyUnsplash =
          parsed.imageUrl.includes('photo-1499750310107-5fef28a66643') ||
          parsed.imageUrl.includes('photo-1513694203232-719a280e022f');
        return {
          ...DEFAULT_HERO_CONFIG,
          ...parsed,
          imageUrl: isLegacyUnsplash ? DEFAULT_HERO_CONFIG.imageUrl : parsed.imageUrl,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_HERO_CONFIG };
}

export function saveStoredHeroConfig(config: Partial<HeroConfig>): HeroConfig {
  const current = getStoredHeroConfig();
  const updated: HeroConfig = {
    ...current,
    ...config,
  };
  try {
    localStorage.setItem(HERO_CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tms_hero_config_updated', { detail: updated }));
  } catch {
    /* ignore */
  }
  return updated;
}

export async function fetchHeroConfig(): Promise<HeroConfig> {
  const data = await apiFetchJson<any>('/api/v1/site/hero', { cache: 'no-store' });
  if (!data) return getStoredHeroConfig();
  return {
    imageUrl: data.imageUrl ?? data.image_url ?? getStoredHeroConfig().imageUrl,
    title: data.title ?? getStoredHeroConfig().title,
    subtitle: data.subtitle ?? getStoredHeroConfig().subtitle,
    badgeText: data.badgeText ?? getStoredHeroConfig().badgeText,
    linkText: data.linkText ?? getStoredHeroConfig().linkText,
    linkUrl: data.linkUrl ?? getStoredHeroConfig().linkUrl,
  };
}

/* ===================== PROMOTIONS ===================== */

export async function fetchPromotions(): Promise<Promotion[]> {
  try {
    const rows = await apiFetchJson<any[]>('/api/v1/promotions', { cache: 'no-store' });
    return asArray<any>(rows).map((item) => ({
      id: String(item.id),
      title: item.title ?? 'Promotion',
      description: item.description ?? '',
      image_url: typeof item.image_url === 'string' ? item.image_url : item.image?.signed_url ?? item.image?.url ?? '',
      external_url: item.external_url ?? '',
      date_time: item.event_date ?? null,
      active: Boolean(item.is_active ?? item.active),
    }));
  } catch (backendError) {
    console.warn('[api] Falling back to Supabase for promotions:', backendError);
  }

  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data, error } = await supabase
    .from('promotional_items')
    .select(`
      id, title, description, image_url, external_url, event_date, display_order,
      is_active, starts_at, ends_at,
      image:media_assets(storage_path)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;

  const now = Date.now();
  const visibleItems = asArray<any>(data).filter((item) => {
    const startsAt = item.starts_at ? Date.parse(item.starts_at) : null;
    const endsAt = item.ends_at ? Date.parse(item.ends_at) : null;
    return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt > now);
  });
  const imagePaths = [...new Set(visibleItems
    .map((item) => (Array.isArray(item.image) ? item.image[0]?.storage_path : item.image?.storage_path))
    .filter((path): path is string => typeof path === 'string' && path.length > 0))];
  const signedImages = new Map<string, string>();

  if (imagePaths.length > 0) {
    const { data: signedRows, error: signedError } = await supabase.storage
      .from('article-media')
      .createSignedUrls(imagePaths, 60 * 60 * 24 * 7);
    if (signedError) throw signedError;
    for (const signed of signedRows ?? []) {
      if (signed.path && signed.signedUrl) signedImages.set(signed.path, signed.signedUrl);
    }
  }

  return visibleItems.map((item) => {
    const image = Array.isArray(item.image) ? item.image[0] : item.image;
    return {
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      image_url: item.image_url || (image?.storage_path && signedImages.get(image.storage_path)) || '',
      external_url: item.external_url ?? '',
      date_time: item.event_date ?? null,
      active: Boolean(item.is_active),
    };
  });
}

export interface HomeDiscoveryData {
  categories: Category[];
  trending: Article[];
  category_sections: { category: Category; articles: Article[] }[];
  authors_picks: Article[];
}

let homeDiscoveryCache: { value: HomeDiscoveryData; expiresAt: number } | null = null;
let homeDiscoveryRequest: Promise<HomeDiscoveryData> | null = null;

export async function fetchHomeDiscovery(): Promise<HomeDiscoveryData> {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  if (homeDiscoveryCache && homeDiscoveryCache.expiresAt > Date.now()) return homeDiscoveryCache.value;
  if (homeDiscoveryRequest) return homeDiscoveryRequest;

  homeDiscoveryRequest = (async () => {
    const [{ data: categoryRows, error: categoryError }, articles] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, slug, description, image_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      fetchLatestArticles(200),
    ]);
    if (categoryError) throw categoryError;

    const categories = asArray<any>(categoryRows).map(normalizeCategory);
    const value: HomeDiscoveryData = {
      categories,
      trending: articles.slice(0, 10),
      category_sections: categories
        .map((category) => ({
          category,
          articles: articles.filter((article) => article.category_id === category.id).slice(0, 4),
        }))
        .filter((section) => section.articles.length > 0),
      authors_picks: articles.filter((article) => article.is_authors_pick).slice(0, 6),
    };
    homeDiscoveryCache = { value, expiresAt: Date.now() + 60_000 };
    return value;
  })().finally(() => {
    homeDiscoveryRequest = null;
  });
  return homeDiscoveryRequest;
}

/* ===================== ARTICLES ===================== */

const AUTHORS_PICKS_KEY = 'tms_authors_picks_order';

export function getStoredAuthorsPicksOrder(): string[] {
  try {
    const raw = localStorage.getItem(AUTHORS_PICKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveStoredAuthorsPicksOrder(orderedIds: string[]): void {
  try {
    localStorage.setItem(AUTHORS_PICKS_KEY, JSON.stringify(orderedIds));
  } catch {
    /* ignore */
  }
}

/** Sorts articles strictly by creation date descending. */
export function sortArticlesByDate<T extends { published_at?: string | null; created_at?: string | null }>(articles: T[]): T[] {
  return [...articles].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
}

const articleListCache = new Map<string, { items: Article[]; expiresAt: number }>();
const articleListRequests = new Map<string, Promise<Article[]>>();
let levelsCache: { items: Level[]; expiresAt: number } | null = null;
let levelsRequest: Promise<Level[]> | null = null;

const ARTICLE_TEASER_SELECT = `
  id, slug, title, subtitle, summary, article_type, published_at, created_at,
  is_author_pick, is_featured, cover_image_url, reading_time_minutes, author_name,
  category_id, categories(id, name, slug, description, image_url),
  cover:media_assets!articles_cover_media_fkey(storage_path)
`;

async function fetchPublishedArticles(limit: number, searchQuery?: string, language: Language = 'EN'): Promise<Article[]> {
  if (language !== 'EN') {
    let url = `/api/v1/articles?limit=${limit}&lang=${language.toLowerCase()}`;
    if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
    return withEnglishFallback(
      apiFetchJson<{ items?: any[] }>(url)
        .then((data) => asArray<any>(data?.items).map((item) => normalizeArticle(item, language))),
      language,
      () => fetchPublishedArticles(limit, searchQuery, 'EN'),
      [],
      'latest articles',
    );
  }

  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  let query = supabase
    .from('articles')
    .select(ARTICLE_TEASER_SELECT)
    .eq('status', 'PUBLISHED')
    .not('published_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  const term = searchQuery?.trim().replace(/[(),]/g, ' ');
  if (term) query = query.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%,slug.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) throw error;
  const rows = asArray<any>(data);
  const coverPaths = [...new Set(rows
    .map((row) => row.cover?.storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0))];
  const signedCovers = new Map<string, string>();

  if (coverPaths.length > 0) {
    const { data: signedRows, error: signedError } = await supabase.storage
      .from('article-media')
      .createSignedUrls(coverPaths, 60 * 60 * 24 * 7);
    if (!signedError) {
      for (const signed of signedRows ?? []) {
        if (signed.path && signed.signedUrl) signedCovers.set(signed.path, signed.signedUrl);
      }
    }
  }

  return rows.map((row) => normalizeArticle({
    ...row,
    category: row.categories,
    cover_image_url: row.cover_image_url || signedCovers.get(row.cover?.storage_path) || null,
  }));
}

export async function fetchLatestArticles(limit = 10, searchQuery?: string, language: Language = 'EN'): Promise<Article[]> {
  const cacheKey = `latest:${language}:${limit}:${searchQuery || ''}`;
  const cached = articleListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items as Article[];
  const request = articleListRequests.get(cacheKey);
  if (request) return request as Promise<Article[]>;
  const next = fetchPublishedArticles(limit, searchQuery, language)
    .then((items) => { articleListCache.set(cacheKey, { items, expiresAt: Date.now() + 60_000 }); return items; })
    .finally(() => articleListRequests.delete(cacheKey));
  articleListRequests.set(cacheKey, next);
  return next;
}

export async function fetchAllArticles(language: Language = 'EN'): Promise<Article[]> {
  const cacheKey = `all:${language}`;
  const cached = articleListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const existingRequest = articleListRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = apiFetchJson<{ items?: any[] }>(
    `/api/v1/articles?lang=${language.toLowerCase()}`,
  )
    .then((data) => asArray<any>(data?.items).map((item) => normalizeArticle(item, language)))
    .then((items) => {
      articleListCache.set(cacheKey, { items, expiresAt: Date.now() + 60_000 });
      return items;
    })
    .finally(() => articleListRequests.delete(cacheKey));
  articleListRequests.set(cacheKey, request);
  return request;
}

export async function fetchArticlesByCategory(categoryId: string, searchQuery?: string, language: Language = 'EN'): Promise<Article[]> {
  const cacheKey = `category:${language}:${categoryId}:${searchQuery || ''}`;
  const cached = articleListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items as Article[];
  const request = articleListRequests.get(cacheKey);
  if (request) return request as Promise<Article[]>;
  let url = `/api/v1/articles?category_id=${encodeURIComponent(categoryId)}&lang=${language.toLowerCase()}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const remote = apiFetchJson<{ items?: any[] }>(url)
    .then((data) => asArray<any>(data?.items).map((item) => normalizeArticle(item, language)));
  const next = withEnglishFallback(
    remote,
    language,
    () => fetchArticlesByCategory(categoryId, searchQuery, 'EN'),
    ARTICLES.filter((article) => article.category_id === categoryId),
    `category ${categoryId} articles`,
  )
    .then((items) => { articleListCache.set(cacheKey, { items, expiresAt: Date.now() + 60_000 }); return items; })
    .finally(() => articleListRequests.delete(cacheKey));
  articleListRequests.set(cacheKey, next);
  return next;
}

export async function fetchAuthorsPicks(limit = 10, searchQuery?: string, language: Language = 'EN'): Promise<Article[]> {
  const cacheKey = `authors:${language}:${limit}:${searchQuery || ''}`;
  const cached = articleListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items as Article[];
  const request = articleListRequests.get(cacheKey);
  if (request) return request as Promise<Article[]>;
  let url = `/api/v1/articles?author_picks=true&limit=${limit}&lang=${language.toLowerCase()}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const remote = apiFetchJson<{ items?: any[] }>(url)
    .then((data) => asArray<any>(data?.items).map((item) => normalizeArticle(item, language)).slice(0, limit));
  const next = withEnglishFallback(
    remote,
    language,
    () => fetchAuthorsPicks(limit, searchQuery, 'EN'),
    ARTICLES.filter((article) => article.is_authors_pick).slice(0, limit),
    'authors picks',
  )
    .then((items) => { articleListCache.set(cacheKey, { items, expiresAt: Date.now() + 60_000 }); return items; })
    .finally(() => articleListRequests.delete(cacheKey));
  articleListRequests.set(cacheKey, next);
  return next;
}

export async function fetchFeaturedArticles(limit = 5, language: Language = 'EN'): Promise<Article[]> {
  const cacheKey = `featured:${language}:${limit}`;
  const cached = articleListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items as Article[];
  const request = articleListRequests.get(cacheKey);
  if (request) return request as Promise<Article[]>;
  const remote = apiFetchJson<{ items?: any[] }>(`/api/v1/articles?featured=true&limit=${limit}&lang=${language.toLowerCase()}`)
    .then((data) => asArray<any>(data?.items).map((item) => normalizeArticle(item, language)).slice(0, limit));
  const next = withEnglishFallback(
    remote,
    language,
    () => fetchFeaturedArticles(limit, 'EN'),
    ARTICLES.filter((article) => article.is_featured).slice(0, limit),
    'featured articles',
  )
    .then((items) => { articleListCache.set(cacheKey, { items, expiresAt: Date.now() + 60_000 }); return items; })
    .finally(() => articleListRequests.delete(cacheKey));
  articleListRequests.set(cacheKey, next);
  return next;
}

const articleDetailCache = new Map<string, { item: ArticleWithBlocks | null; expiresAt: number }>();
const articleDetailRequests = new Map<string, Promise<ArticleWithBlocks | null>>();

export async function fetchArticleById(id: string, language: Language = 'EN'): Promise<ArticleWithBlocks | null> {
  const cacheKey = `${language}:${id}`;
  const cached = articleDetailCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.item;
  const existingRequest = articleDetailRequests.get(cacheKey);
  if (existingRequest) return existingRequest;
  const mockArticle = ARTICLES.find((article) => article.id === id || article.slug === id);
  const englishFallback = mockArticle
    ? ARTICLES_WITH_BLOCKS[mockArticle.id] ?? generateArticleWithBlocks(mockArticle)
    : null;
  const request = withEnglishFallback(
    apiFetchJson<any>(`/api/v1/articles/${encodeURIComponent(id)}?lang=${language.toLowerCase()}`, { skipAuth: true })
      .then((item) => {
        if (!item) {
          console.warn(`[api] Article detail endpoint returned no article for "${id}".`);
          return null;
        }

        const article: ArticleWithBlocks = {
          ...normalizeArticle(item, language),
          blocks: (item.blocks ?? []).map((block: any) => {
            const baseBlock = {
              id: block.id,
              article_id: item.id,
              block_type: block.type,
              order_index: block.display_order,
              content: block.text ?? null,
              image_url: block.media?.signed_url ?? block.media?.storage_path ?? block.external_url ?? null,
              image_caption: block.caption ?? null,
              quiz_id: block.quiz_id ?? null,
              opinion_id: block.opinion_id ?? null,
              podcast_id: null,
            } as any;

            if (block.type === 'QUIZ' && block.quiz) {
              baseBlock.quiz = {
                id: block.quiz.id,
                article_id: item.id,
                title: block.quiz.title ?? 'Quiz',
                question: block.quiz.questions?.[0]?.question ?? 'Quiz question',
                xp_reward: Number(block.quiz.xp_reward ?? 0),
                options: (block.quiz.questions?.[0]?.options ?? []).map((option: any) => ({
                  id: option.id,
                  label: option.option_text,
                  is_correct: Boolean(option.is_correct),
                  explanation: option.explanation ?? null,
                })),
              };
            }

            if (block.type === 'OPINION' && block.opinion) {
              baseBlock.opinion = {
                id: block.opinion_id ?? block.opinion.id,
                article_id: item.id,
                question: block.opinion.question ?? 'Opinion',
                options: (block.opinion.options ?? []).map((opt: any) => opt.option_text ?? opt),
                option_ids: (block.opinion.options ?? []).map((opt: any) => String(opt.id ?? '')),
                xp_reward: Number(block.opinion.xp_reward ?? 0),
                allow_custom_text: Boolean(block.opinion.allow_custom_response),
              };
            }

            if (block.type === 'PODCAST') {
              const pObj = block.podcast || {};
              baseBlock.podcast = {
                id: pObj.id ?? block.id,
                article_id: item.id,
                title: pObj.title ?? block.title ?? 'Podcast',
                audio_url: pObj.audio_url ?? block.audio_url ?? block.external_url ?? '',
                duration_seconds: pObj.duration_seconds ?? null,
                description: pObj.description ?? block.description ?? null,
              };
            }

            return baseBlock;
          }),
        };

        articleDetailCache.set(cacheKey, { item: article, expiresAt: Date.now() + 60_000 });
        return article;
      })
      .finally(() => articleDetailRequests.delete(cacheKey)),
    language,
    () => fetchArticleById(id, 'EN'),
    englishFallback,
    `article ${id}`,
  );
  articleDetailRequests.set(cacheKey, request);
  return request;
}

/* ===================== BOOKMARKS ===================== */

const bookmarkStatusCache = new Map<string, { value: boolean; expiresAt: number }>();
const bookmarkCollectionCache = new Map<string, { items: Bookmark[]; expiresAt: number }>();
const bookmarkCollectionRequests = new Map<string, Promise<Bookmark[]>>();

export async function fetchBookmarks(userId: string): Promise<Bookmark[]> {
  const cached = bookmarkCollectionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const existingRequest = bookmarkCollectionRequests.get(userId);
  if (existingRequest) return existingRequest;

  const request = apiFetchJson<{ items?: any[] }>(`/api/v1/bookmarks`)
    .then((data) => asArray<any>(data?.items).map((b) => ({
      id: b.id,
      user_id: b.user_id,
      article_id: b.article_id,
      created_at: b.created_at,
    })))
    .then((items) => {
      bookmarkCollectionCache.set(userId, { items, expiresAt: Date.now() + 30_000 });
      for (const item of items) {
        bookmarkStatusCache.set(`${userId}:${item.article_id}`, { value: true, expiresAt: Date.now() + 30_000 });
      }
      return items;
    })
    .finally(() => bookmarkCollectionRequests.delete(userId));
  bookmarkCollectionRequests.set(userId, request);
  return request;
}

export async function isBookmarked(userId: string, articleId: string): Promise<boolean> {
  const cacheKey = `${userId}:${articleId}`;
  const cached = bookmarkStatusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = (await fetchBookmarks(userId)).some((bookmark) => bookmark.article_id === articleId);
  bookmarkStatusCache.set(cacheKey, { value, expiresAt: Date.now() + 30_000 });
  return value;
}

export async function addBookmark(_userId: string, articleId: string): Promise<void> {
  await apiFetchJson(`/api/v1/bookmarks/${encodeURIComponent(articleId)}`, { method: 'POST' });
  bookmarkStatusCache.set(`${_userId}:${articleId}`, { value: true, expiresAt: Date.now() + 30_000 });
  bookmarkCollectionCache.delete(_userId);
}

export async function removeBookmark(_userId: string, articleId: string): Promise<void> {
  await apiFetchJson(`/api/v1/bookmarks/${encodeURIComponent(articleId)}`, { method: 'DELETE' });
  bookmarkStatusCache.set(`${_userId}:${articleId}`, { value: false, expiresAt: Date.now() + 30_000 });
  bookmarkCollectionCache.delete(_userId);
}

/* ===================== READING PROGRESS ===================== */

const readingProgressRequests = new Map<string, Promise<ReadingProgress | null>>();
const readingProgressCache = new Map<string, { value: ReadingProgress | null; expiresAt: number }>();

export async function fetchReadingProgress(_userId: string, articleId: string): Promise<ReadingProgress | null> {
  const cacheKey = `${_userId}:${articleId}`;
  const cached = readingProgressCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const existingRequest = readingProgressRequests.get(cacheKey);
  if (existingRequest) return existingRequest;
  const request = apiFetchJson<any>(`/api/v1/articles/${encodeURIComponent(articleId)}/progress`)
    .then((data) => {
      const value = normalizeReadingProgress(data);
      readingProgressCache.set(cacheKey, { value, expiresAt: Date.now() + 30_000 });
      return value;
    })
    .finally(() => readingProgressRequests.delete(cacheKey));
  readingProgressRequests.set(cacheKey, request);
  return request;
}

export async function updateReadingProgress(
  userId: string,
  articleId: string,
  percentage: number,
  scrollPosition: number,
  completed: boolean,
): Promise<void> {
  await apiFetchJson(`/api/v1/articles/${encodeURIComponent(articleId)}/progress`, {
    method: 'PUT',
    body: JSON.stringify({
      progress_percentage: percentage,
      last_position: scrollPosition,
      last_block_id: null,
    }),
  });
  readingProgressRequests.delete(`${userId}:${articleId}`);
  readingProgressCache.delete(`${userId}:${articleId}`);
}

/* ===================== QUIZ ATTEMPTS ===================== */

export async function submitQuizAttempt(
  quizId: string,
  _userId: string,
  _selectedOptionId: string,
  isCorrect: boolean,
  xpEarned: number,
): Promise<QuizAttemptResult> {
  const data = await apiFetchJson<any>(`/api/v1/quizzes/${encodeURIComponent(quizId)}/attempts`, {
    method: 'POST',
    body: JSON.stringify({ selected_option_id: _selectedOptionId }),
  });
  quizAttemptStatusCache.set(`${_userId}:${quizId}`, {
    value: { attempted: true, selectedOptionId: _selectedOptionId },
    expiresAt: Date.now() + 60_000,
  });

  return {
    attempt_id: data?.attempt?.question_id ?? `attempt-${Date.now()}`,
    xp_earned: Number(data?.xp_earned ?? (isCorrect ? xpEarned : 0)),
    total_xp: Number(data?.total_xp ?? 0),
    new_level: Number(data?.new_level ?? 1),
    already_attempted: Boolean(data?.already_attempted),
  };
}

const quizAttemptStatusRequests = new Map<string, Promise<{ attempted: boolean; selectedOptionId?: string }>>();
const quizAttemptStatusCache = new Map<string, { value: { attempted: boolean; selectedOptionId?: string }; expiresAt: number }>();

export async function hasUserAttemptedQuiz(_userId: string, quizId: string): Promise<{ attempted: boolean; selectedOptionId?: string }> {
  const cacheKey = `${_userId}:${quizId}`;
  const cached = quizAttemptStatusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const existingRequest = quizAttemptStatusRequests.get(cacheKey);
  if (existingRequest) return existingRequest;
  const request = apiFetchJson<{ attempted?: boolean; selected_option_id?: string }>(`/api/v1/quizzes/${encodeURIComponent(quizId)}/attempted`)
    .then((data) => {
      const value = {
        attempted: Boolean(data?.attempted),
        selectedOptionId: data?.selected_option_id,
      };
      quizAttemptStatusCache.set(cacheKey, { value, expiresAt: Date.now() + 60_000 });
      return value;
    })
    .finally(() => quizAttemptStatusRequests.delete(cacheKey));
  quizAttemptStatusRequests.set(cacheKey, request);
  return request;
}

/* ===================== OPINIONS ===================== */

const opinionSubmissionStatusRequests = new Map<string, Promise<{ submitted: boolean; submittedText?: string }>>();
const opinionSubmissionStatusCache = new Map<string, { value: { submitted: boolean; submittedText?: string }; expiresAt: number }>();

export async function submitOpinion(
  opinionId: string,
  userId: string,
  selectedOption: string,
  selectedOptionId?: string,
  customResponse?: string,
): Promise<OpinionSubmission> {
  const data = await apiFetchJson<any>(`/api/v1/opinions/${encodeURIComponent(opinionId)}/responses`, {
    method: 'POST',
    body: JSON.stringify(customResponse !== undefined
      ? { custom_response: customResponse }
      : { selected_option_id: selectedOptionId }),
  });
  opinionSubmissionStatusCache.set(`${userId}:${opinionId}`, { value: { submitted: true, submittedText: customResponse ?? selectedOption }, expiresAt: Date.now() + 60_000 });
  const response = data?.response ?? data;

  return {
    id: response?.id ?? `op-sub-${Date.now()}`,
    opinion_id: opinionId,
    user_id: userId,
    selected_option: selectedOption,
    xp_earned: Number(data?.xp_earned ?? 0),
    created_at: response?.created_at ?? new Date().toISOString(),
  };
}

export async function hasUserSubmittedOpinion(_userId: string, opinionId: string): Promise<{ submitted: boolean; submittedText?: string }> {
  const cacheKey = `${_userId}:${opinionId}`;
  const cached = opinionSubmissionStatusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const existingRequest = opinionSubmissionStatusRequests.get(cacheKey);
  if (existingRequest) return existingRequest;
  const request = apiFetchJson<{ submitted?: boolean; opinion_text?: string }>(`/api/v1/opinions/${encodeURIComponent(opinionId)}/submitted`)
    .then((data) => {
      const value = {
        submitted: Boolean(data?.submitted),
        submittedText: data?.opinion_text,
      };
      opinionSubmissionStatusCache.set(cacheKey, { value, expiresAt: Date.now() + 60_000 });
      return value;
    })
    .finally(() => opinionSubmissionStatusRequests.delete(cacheKey));
  opinionSubmissionStatusRequests.set(cacheKey, request);
  return request;
}

/* ===================== COMMENTS ===================== */

const commentsRequests = new Map<string, Promise<Comment[]>>();

export async function fetchComments(articleId: string, _page = 1, _pageSize = 10): Promise<Comment[]> {
  const cacheKey = `${articleId}:${_page}`;
  const existingRequest = commentsRequests.get(cacheKey);
  if (existingRequest) return existingRequest;
  const request = apiFetchJson<{ items?: any[] }>(`/api/v1/articles/${encodeURIComponent(articleId)}/comments`)
    .then((data) => asArray<any>(data?.items).map((item) => ({
    id: item.id,
    article_id: item.article_id,
    user_id: item.user_id ?? item.author?.id,
    display_name: item.author?.display_name ?? 'Reader',
    avatar_url: item.avatar_url ?? null,
    content: item.content,
    created_at: item.created_at,
    })))
    .finally(() => commentsRequests.delete(cacheKey));
  commentsRequests.set(cacheKey, request);
  return request;
}

export async function addComment(articleId: string, userId: string, content: string): Promise<Comment> {
  const data = await apiFetchJson<any>(`/api/v1/articles/${encodeURIComponent(articleId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

  return {
    id: data.id,
    article_id: data.article_id,
    user_id: data.user_id,
    display_name: data.author?.display_name ?? 'Reader',
    avatar_url: data.avatar_url ?? null,
    content: data.content,
    created_at: data.created_at,
  };
}

export async function deleteComment(commentId: string, _userId: string): Promise<void> {
  await delay(50);
  _comments = _comments.filter((c) => c.id !== commentId);
}

/* ===================== USER PROFILE ===================== */

const profileAggregateCache = new Map<string, { data: any; expiresAt: number }>();
const profileAggregateRequests = new Map<string, Promise<any>>();

export async function fetchProfileAggregate(userId = 'current'): Promise<any> {
  const cached = profileAggregateCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const existingRequest = profileAggregateRequests.get(userId);
  if (existingRequest) return existingRequest;
  const request = apiFetchJson<any>('/api/v1/users/me/profile')
    .then((data) => {
      profileAggregateCache.set(userId, { data, expiresAt: Date.now() + 300_000 });
      return data;
    })
    .finally(() => profileAggregateRequests.delete(userId));
  profileAggregateRequests.set(userId, request);
  return request;
}

function invalidateProfileAggregate(userId?: string) {
  if (userId) profileAggregateCache.delete(userId);
  profileAggregateCache.delete('current');
}

const publicAdvertisementsCache = new Map<string, { items: any[]; expiresAt: number }>();
const publicAdvertisementsRequests = new Map<string, Promise<any[]>>();

export async function fetchPublicAdvertisements(slot?: string): Promise<any[]> {
  const cacheKey = slot ?? 'all';
  const cached = publicAdvertisementsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const existingRequest = publicAdvertisementsRequests.get(cacheKey);
  if (existingRequest) return existingRequest;
  const query = slot ? `?slot=${encodeURIComponent(slot)}` : '';
  const request = apiFetchJson<any[]>(`/api/v1/advertisements${query}`)
    .then((data) => {
      const items = Array.isArray(data) ? data : [];
      publicAdvertisementsCache.set(cacheKey, { items, expiresAt: Date.now() + 60_000 });
      return items;
    })
    .finally(() => publicAdvertisementsRequests.delete(cacheKey));
  publicAdvertisementsRequests.set(cacheKey, request);
  return request;
}

export async function fetchProfile(userId?: string): Promise<UserProfile | null> {
  try {
    const data = await fetchProfileAggregate(userId);
    const aggregate = data?.user ?? data;
    const level = data?.current_level;
    return {
      id: aggregate.id,
      email: aggregate.email,
      display_name: aggregate.display_name ?? 'Reader',
      avatar_url: aggregate.avatar_url ?? null,
      xp: Number(data?.total_xp ?? 0),
      level: Number(level?.display_order ?? 1),
      bio: aggregate.bio ?? null,
    };
  } catch {
    return null;
  }
}

export async function updateProfile(_userId: string, updates: Partial<UserProfile>): Promise<void> {
  await apiFetchJson('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify({
      display_name: updates.display_name,
      bio: updates.bio,
    }),
  });
  invalidateProfileAggregate(_userId);
}

/* ===================== LEVELS ===================== */

export async function fetchLevels(): Promise<Level[]> {
  if (levelsCache && levelsCache.expiresAt > Date.now()) return levelsCache.items;
  if (levelsRequest) return levelsRequest;
  levelsRequest = apiFetchJson<any[]>('/api/v1/gamification/levels')
    .then((data) => (Array.isArray(data) ? data : []).map(normalizeLevel))
    .then((items) => { levelsCache = { items, expiresAt: Date.now() + 300_000 }; return items; })
    .finally(() => { levelsRequest = null; });
  return levelsRequest;
}

export async function fetchLevelByNumber(levelNumber: number): Promise<Level | null> {
  const levels = await fetchLevels();
  return levels.find((l) => l.level_number === levelNumber) ?? null;
}

/* ===================== BADGES ===================== */

export async function fetchUserBadges(_userId: string): Promise<UserBadge[]> {
  const data = await apiFetchJson<any>('/api/v1/gamification/me');
  return (data?.badges ?? []).map((badge: any) => ({
    id: badge.id,
    user_id: _userId,
    badge_id: badge.id,
    badge: normalizeBadge(badge),
    earned_at: badge.earned_at ?? new Date().toISOString(),
  }));
}

/* ===================== COMPLETION CARDS ===================== */

export async function fetchCompletionCards(_userId: string): Promise<CompletionCard[]> {
  const aggregate = await fetchProfileAggregate(_userId);
  return asArray<any>(aggregate?.share_cards).map((card) => ({
    id: card.id,
    user_id: _userId,
    article_id: card.article_id,
    article_title: card.article_title ?? card.title ?? 'Article',
    xp_gained: Number(card.xp_gained ?? card.xp ?? card.xp_reward ?? 0),
    created_at: card.created_at,
    card_type: card.card_type === 'OPINION' ? 'opinion' : 'completion',
    opinion_text: card.opinion_text ?? undefined,
  }));
}

export async function createCompletionCard(
  userId: string,
  articleId: string,
  articleTitle: string,
  xpGained: number,
  cardType: 'completion' | 'opinion' = 'completion',
  opinionText?: string,
): Promise<CompletionResult & { card?: CompletionCard }> {
  if (cardType === 'completion') {
    const completion = await apiFetchJson<any>(`/api/v1/articles/${encodeURIComponent(articleId)}/completion`, {
      method: 'POST',
    });
    completionStatusCache.set(`${userId}:${articleId}`, { value: true, expiresAt: Date.now() + 60_000 });
    invalidateProfileAggregate(userId);
    const serverXp = Number(completion?.xp_earned ?? 0);
    const profile = await fetchProfile(userId);
    const card: CompletionCard = {
      id: `completion-${articleId}`,
      user_id: userId,
      article_id: articleId,
      article_title: articleTitle,
      xp_gained: serverXp,
      created_at: completion?.completed_at ?? new Date().toISOString(),
      card_type: 'completion',
    };
    return {
      card_id: card.id,
      xp_gained: serverXp,
      total_xp: Number(completion?.total_xp ?? profile?.xp ?? 0),
      new_level: Number(completion?.new_level ?? profile?.level ?? 1),
      already_completed: Boolean(completion?.already_completed),
      card,
    };
  }

  await delay();

  // Prevent duplicate cards for the same article and type
  const existing = _completionCards.find(
    (c) => c.article_id === articleId && (c.card_type ?? 'completion') === cardType
  );
  if (existing) {
    return {
      card_id: existing.id,
      xp_gained: 0,
      total_xp: _profile.xp,
      new_level: _profile.level,
      already_completed: true,
      card: existing,
    };
  }

  const card: CompletionCard = {
    id: `cc-${cardType === 'opinion' ? 'op-' : ''}${Date.now()}`,
    user_id: userId,
    article_id: articleId,
    article_title: articleTitle,
    xp_gained: xpGained,
    created_at: new Date().toISOString(),
    card_type: cardType,
    opinion_text: opinionText,
  };
  _completionCards = [card, ..._completionCards];
  saveCompletionCards(_completionCards);

  return {
    card_id: card.id,
    xp_gained: xpGained,
    total_xp: _profile.xp,
    new_level: _profile.level,
    already_completed: false,
    card,
  };
}

export async function createOpinionCard(
  userId: string,
  articleId: string,
  articleTitle: string,
  opinionText: string,
  xpGained = 0,
): Promise<CompletionCard> {
  const result = await createCompletionCard(userId, articleId, articleTitle, xpGained, 'opinion', opinionText);
  invalidateProfileAggregate(userId);
  return result.card || {
    id: result.card_id,
    user_id: userId,
    article_id: articleId,
    article_title: articleTitle,
    xp_gained: xpGained,
    created_at: new Date().toISOString(),
    card_type: 'opinion',
    opinion_text: opinionText,
  };
}

const completionStatusCache = new Map<string, { value: boolean; expiresAt: number }>();
const completionStatusRequests = new Map<string, Promise<boolean>>();

export async function hasCompletionCard(_userId: string, articleId: string): Promise<boolean> {
  const cacheKey = `${_userId}:${articleId}`;
  const cached = completionStatusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const existingRequest = completionStatusRequests.get(cacheKey);
  if (existingRequest) return existingRequest;
  const request = apiFetchJson<any>(`/api/v1/articles/${encodeURIComponent(articleId)}/completion`)
    .then((data) => {
      const value = Boolean(data?.article_id);
      completionStatusCache.set(cacheKey, { value, expiresAt: Date.now() + 60_000 });
      return value;
    })
    .finally(() => completionStatusRequests.delete(cacheKey));
  completionStatusRequests.set(cacheKey, request);
  return request;
}

/* ===================== TEAM ===================== */

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const data = await apiFetchJson<any[]>('/api/v1/site/team');
  return (Array.isArray(data) ? data : []).map(normalizeTeamMember);
}

/* ===================== CONTACT / FEEDBACK ===================== */

export async function submitBusinessEnquiry(_data: {
  name: string; company: string; purpose: string; phone: string; email: string;
}): Promise<void> {
  await apiFetchJson('/api/v1/contact/enquiries', {
    method: 'POST',
    body: JSON.stringify(_data),
  });
}

export async function submitFeedback(_data: { content: string }): Promise<void> {
  await apiFetchJson('/api/v1/contact/feedback', {
    method: 'POST',
    body: JSON.stringify(_data),
  });
}

/* ===================== PROFILE DATA ===================== */

export async function fetchReadingHistory(_userId: string): Promise<ReadingHistoryItem[]> {
  const data = await fetchProfileAggregate(_userId);
  if (!data || !data.reading_history) return [];
  return data.reading_history
    .filter((h: any) => !h.completed_at)
    .map((item: any) => ({
      article_id: item.article_id,
      user_id: _userId,
      percentage: Number(item.progress_percentage ?? 0),
      scroll_position: Number(item.last_position ?? 0),
      completed: false,
      updated_at: item.last_read_at,
      article: {
        id: item.article_id,
        title: item.article_title || 'Article',
      } as any
    }));
}

export async function fetchCompletedArticles(_userId: string): Promise<ReadingHistoryItem[]> {
  const data = await fetchProfileAggregate(_userId);
  if (!data || !data.reading_history) return [];
  return data.reading_history
    .filter((h: any) => h.completed_at)
    .map((item: any) => ({
      article_id: item.article_id,
      user_id: _userId,
      percentage: Number(item.progress_percentage ?? 100),
      scroll_position: Number(item.last_position ?? 0),
      completed: true,
      updated_at: item.last_read_at,
      article: {
        id: item.article_id,
        title: item.article_title || 'Article',
      } as any
    }));
}

export async function fetchSavedArticles(_userId: string): Promise<SavedArticleItem[]> {
  const bookmarks = await fetchBookmarks(_userId);
  const articles = await Promise.all(bookmarks.map((bookmark) => fetchArticleById(bookmark.article_id).catch(() => null)));
  return bookmarks.map((bookmark, index) => ({
    ...bookmark,
    article: articles[index] ?? undefined,
  }));
}

export async function fetchQuizStats(_userId: string): Promise<QuizStats> {
  const data = await fetchProfileAggregate(_userId);
  if (!data || !data.quiz_performance) return { total: 0, correct: 0, incorrect: 0, accuracy: 0 };
  return {
    total: data.quiz_performance.total_attempts,
    correct: data.quiz_performance.correct_attempts,
    incorrect: data.quiz_performance.incorrect_attempts,
    accuracy: data.quiz_performance.accuracy_percentage,
  };
}

export async function fetchUserOpinions(_userId: string): Promise<OpinionWithArticle[]> {
  const data = await fetchProfileAggregate(_userId);
  if (!data || !data.opinions) return [];
  return data.opinions;
}

export async function fetchAllBadges(_userId: string): Promise<{ all: Badge[]; earned: Set<string> }> {
  await delay();
  const earned = new Set(DEFAULT_USER_BADGES.map((ub) => ub.badge_id));
  return { all: [...BADGES], earned };
}

export async function fetchAchievementHistory(_userId: string): Promise<AchievementItem[]> {
  await delay();
  return [...DEFAULT_ACHIEVEMENTS];
}

/* ===================== AVATAR UPLOAD ===================== */

export async function uploadAvatar(_userId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const data = await apiFetchJson<any>('/api/v1/users/me/avatar', {
    method: 'POST',
    body: formData,
  });
  if (!data?.avatar_url) throw new Error('Avatar upload did not return a stored image');
  invalidateProfileAggregate(_userId);
  return data.avatar_url;
}

export async function updateAvatar(_userId: string, avatarUrl: string): Promise<void> {
  if (!avatarUrl) throw new Error('Avatar URL is required');
}

/* ===================== COUNTS ===================== */

export async function fetchArticlesCompletedCount(_userId: string): Promise<number> {
  return _completionCards.length;
}

export async function fetchShareCardsCount(_userId: string): Promise<number> {
  return _completionCards.length;
}

export async function fetchOpinionsCount(_userId: string): Promise<number> {
  return _opinionSubmitted.size;
}
