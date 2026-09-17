/*
 * Admin API layer for the Superadmin CMS.
 *
 * BACKEND INTEGRATION GUIDE:
 * Every function here currently returns mock data with a simulated delay.
 * To integrate with your backend, replace the mock data retrieval with
 * real fetch/supabase calls. The function signatures and return types
 * should stay the same so the UI doesn't need to change.
 *
 * Example integration:
 *
 * export async function fetchArticles(filters?: ArticleFilters): Promise<AdminArticle[]> {
 *   const res = await fetch('/api/v1/superadmin/articles');
 *   if (!res.ok) throw new Error('Failed to fetch articles');
 *   return res.json();
 * }
 */

import type {
  AdminArticle, AdminCategory, AdminQuiz, AdminOpinion, AdminComment,
  AdminBlock,
  AdminUser, XPRule, AdminLevel, AdminBadge, AdminPromotion,
  Advertisement, AdSlot, MediaItem, AnalyticsData, FeedbackItem,
  BusinessEnquiry, AuditLog, ArticleStatus,
} from './adminTypes';
import {
  type HeroConfig,
  DEFAULT_HERO_CONFIG,
} from '@/lib/api';
import { apiFetchJson } from '@/lib/backendClient';

const toArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: T[] }).items)) {
    return (value as { items: T[] }).items;
  }
  return [];
};

const normalizeArticleType = (value: string | null | undefined): AdminArticle['article_type'] => {
  switch (value) {
    case 'STANDARD':
    case 'ARTICLE':
      return 'ARTICLE';
    case 'FEATURED':
      return 'FEATURED';
    case 'PODCAST':
      return 'PODCAST';
    case 'QUIZ':
      return 'QUIZ';
    case 'OPINION':
      return 'OPINION';
    default:
      return 'ARTICLE';
  }
};

const normalizeArticleStatus = (value: string | null | undefined): ArticleStatus => {
  switch (value) {
    case 'DRAFT':
    case 'PUBLISHED':
    case 'UNPUBLISHED':
    case 'SCHEDULED':
      return value;
    default:
      return 'DRAFT';
  }
};

const normalizeCommentStatus = (row: any): AdminComment['status'] => {
  if (row?.is_hidden) return 'hidden';
  if (row?.deleted_at || row?.is_deleted) return 'deleted';
  return 'visible';
};

const normalizeUserRole = (value: string | null | undefined): string => {
  if (value === 'SUPERADMIN' || value === 'Superadmin') return 'Superadmin';
  return 'User';
};

const normalizeUserStatus = (value: boolean | string | null | undefined): AdminUser['status'] => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'active' ? 'active' : value.toLowerCase() === 'suspended' ? 'suspended' : 'banned';
  }
  return value === false ? 'suspended' : 'active';
};

const normalizeRolePayload = (role: string): 'USER' | 'SUPERADMIN' => {
  return role === 'Superadmin' ? 'SUPERADMIN' : 'USER';
};

const normalizeStoredUrl = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value;
  return null;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '';
  const search = new URLSearchParams();
  for (const [key, value] of entries) search.set(key, String(value));
  return `?${search.toString()}`;
};

const toDisplaySummary = (value: unknown): { summary: string } | null => {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const summary = typeof payload.summary === 'string' ? payload.summary : JSON.stringify(payload);
  return summary ? { summary } : null;
};

const toAdminArticle = (item: any): AdminArticle => ({
  id: String(item.id),
  title: item.title ?? 'Untitled',
  subtitle: item.subtitle ?? '',
  summary: item.summary ?? null,
  category_id: item.category_id ?? item.category?.id ?? null,
  category_name: item.category?.name ?? item.category_name ?? undefined,
  article_type: normalizeArticleType(item.article_type ?? item.type),
  status: normalizeArticleStatus(item.status),
  cover_image_url: normalizeStoredUrl(item.cover_image_url ?? item.cover?.signed_url ?? item.cover?.url),
  author_name: item.author_name ?? null,
  is_featured: Boolean(item.is_featured),
  is_authors_pick: Boolean(item.is_author_pick),
  reading_time_minutes: item.reading_time_minutes ?? null,
  published_at: item.published_at ?? null,
  scheduled_at: item.scheduled_at ?? null,
  created_at: item.created_at ?? new Date().toISOString(),
});

const toAdminCategory = (item: any): AdminCategory => ({
  id: String(item.id),
  name: item.name ?? 'Unnamed',
  slug: item.slug ?? '',
  description: item.description ?? null,
  image_url: normalizeStoredUrl(item.image_url),
  article_count: typeof item.article_count === 'number' ? item.article_count : 0,
  created_at: item.created_at ?? new Date().toISOString(),
});

const toAdminUser = (item: any): AdminUser => ({
  id: String(item.id),
  email: item.email ?? '',
  display_name: item.display_name ?? 'User',
  role: normalizeUserRole(item.role),
  xp: Number(item.xp ?? item.total_xp ?? 0),
  level: Number(item.level ?? item.level_number ?? 0),
  avatar_url: normalizeStoredUrl(item.avatar_url ?? item.avatar_media_id ? `/api/v1/media/${item.avatar_media_id}` : null),
  status: normalizeUserStatus(item.is_active ?? item.status),
  created_at: item.created_at ?? new Date().toISOString(),
  articles_completed: Number(item.articles_completed ?? 0),
  quizzes_correct: Number(item.quizzes_correct ?? 0),
});

const toAdminComment = (item: any): AdminComment => ({
  id: String(item.id),
  article_id: String(item.article_id),
  article_title: item.article_title ?? undefined,
  user_id: String(item.user_id ?? item.author?.id ?? ''),
  display_name: item.author?.display_name ?? item.display_name ?? 'Reader',
  avatar_url: normalizeStoredUrl(item.avatar_url ?? item.author?.avatar_url ?? null),
  content: item.content ?? '',
  status: normalizeCommentStatus(item),
  created_at: item.created_at ?? new Date().toISOString(),
});

const toAuditLog = (item: any): AuditLog => ({
  id: String(item.id),
  actor_id: item.actor_user_id ?? item.actor_id ?? null,
  actor_name: item.actor_name ?? item.actor_user_id ?? 'System',
  action: item.action ?? 'UNKNOWN',
  entity_type: item.entity_type ?? 'UNKNOWN',
  entity_id: item.entity_id ?? null,
  details: toDisplaySummary(item.metadata ?? item.details) ?? { summary: `${item.action ?? 'event'} recorded` },
  created_at: item.created_at ?? new Date().toISOString(),
});

const toAdminPromotion = (item: any): AdminPromotion => ({
  id: String(item.id),
  image_media_id: item.image_media_id ?? item.image?.id ?? null,
  title: item.title ?? 'Promotion',
  description: item.description ?? '',
  image_url: normalizeStoredUrl(item.image?.signed_url ?? item.image_url ?? item.image?.storage_path) ?? '',
  external_url: item.external_url ?? item.link ?? '',
  date_time: item.event_date ?? item.date_time ?? null,
  active: Boolean(item.is_active ?? item.active),
  created_at: item.created_at ?? new Date().toISOString(),
});

const toAdvertisement = (item: any): Advertisement => ({
  id: String(item.id),
  title: item.title ?? 'Advertisement',
  description: item.description ?? '',
  image_url: normalizeStoredUrl(item.image?.signed_url ?? item.image_url ?? item.image?.storage_path) ?? '',
  target_url: item.destination_url ?? item.target_url ?? '',
  ad_slot_id: item.slot_id ?? item.ad_slot_id ?? null,
  status: item.is_active ? 'ACTIVE' : 'INACTIVE',
  starts_at: item.starts_at ?? null,
  ends_at: item.ends_at ?? null,
  clicks: Number(item.clicks ?? 0),
  impressions: Number(item.impressions ?? 0),
  created_at: item.created_at ?? new Date().toISOString(),
});

const toAdSlot = (item: any): AdSlot => ({
  id: String(item.id),
  name: item.name ?? 'Slot',
  slug: item.key ?? item.slug ?? item.name?.toLowerCase().replace(/\s+/g, '-'),
  description: item.description ?? null,
  placement: item.placement ?? 'sidebar',
  is_active: Boolean(item.is_active),
  created_at: item.created_at ?? new Date().toISOString(),
});

const toMediaItem = (item: any): MediaItem => ({
  id: String(item.id),
  filename: item.filename ?? item.storage_path?.split('/').pop() ?? 'media',
  file_path: item.storage_path ?? item.file_path ?? '',
  file_type: item.media_type ?? item.mime_type ?? item.file_type ?? 'unknown',
  file_size: Number(item.file_size ?? item.size ?? 0),
  uploaded_by: item.uploaded_by ?? item.user_id ?? null,
  created_at: item.created_at ?? new Date().toISOString(),
});

const toAdminBlock = (item: any): AdminBlock => ({
  id: String(item.id),
  article_id: String(item.article_id),
  block_type: item.block_type,
  order_index: Number(item.display_order ?? item.order_index ?? 0),
  content: item.text_content ?? item.content ?? null,
  external_url: item.external_url ?? null,
  image_url: item.image_url ?? item.external_url ?? item.media?.signed_url ?? null,
  image_caption: item.caption ?? item.image_caption ?? null,
  title: item.title ?? null,
  media_url: item.media_url ?? null,
  quiz_id: item.quiz_id ?? null,
  opinion_id: item.opinion_id ?? null,
  podcast_id: item.podcast_id ?? null,
  quiz: item.quiz ?? null,
  opinion: item.opinion ?? null,
  podcast: item.podcast ?? null,
});

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export { type HeroConfig, DEFAULT_HERO_CONFIG };

export async function fetchAdminHeroConfig(): Promise<HeroConfig> {
  return apiFetchJson<HeroConfig>('/api/v1/site/hero');
}

export async function updateAdminHeroConfig(config: Partial<HeroConfig>): Promise<HeroConfig> {
  return apiFetchJson<HeroConfig>('/api/v1/site/hero', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

const AUTHORS_PICKS_KEY = 'tms_authors_picks_order';

export function getAdminAuthorsPicksOrder(): string[] {
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

export function saveAdminAuthorsPicksOrder(orderedIds: string[]): void {
  try {
    localStorage.setItem(AUTHORS_PICKS_KEY, JSON.stringify(orderedIds));
  } catch {
    /* ignore */
  }
}

/* ===== Articles ===== */

export interface ArticleFilters {
  status?: ArticleStatus | 'ALL';
  search?: string;
  category?: string;
}

export async function fetchArticles(filters?: ArticleFilters): Promise<AdminArticle[]> {
  const query = buildQuery({
    status: filters?.status && filters.status !== 'ALL' ? filters.status : undefined,
    category_id: filters?.category && filters.category !== 'all' ? filters.category : undefined,
    search: filters?.search,
  });

  const rows = await apiFetchJson<any[]>(`/api/v1/superadmin/articles${query}`);
  let result = toArray<any>(rows).map(toAdminArticle);

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((a) => a.title.toLowerCase().includes(q) || (a.subtitle ?? '').toLowerCase().includes(q) || (a.author_name ?? '').toLowerCase().includes(q));
  }

  result.sort((a, b) => {
    const dateA = a.published_at || a.created_at;
    const dateB = b.published_at || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return result;
}

export async function fetchAuthorsPicksManagement(): Promise<{
  orderedPicks: AdminArticle[];
  availableArticles: AdminArticle[];
}> {
  const articles = await fetchArticles();
  const order = getAdminAuthorsPicksOrder();
  const map = new Map(articles.map((article) => [article.id, article]));
  const orderedPicks: AdminArticle[] = [];
  const addedIds = new Set<string>();

  for (const id of order) {
    const article = map.get(id);
    if (article) {
      orderedPicks.push(article);
      addedIds.add(id);
    }
  }

  for (const article of articles) {
    if (article.is_authors_pick && !addedIds.has(article.id)) {
      orderedPicks.push(article);
    }
  }

  return {
    orderedPicks,
    availableArticles: articles.filter((article) => !orderedPicks.some((p) => p.id === article.id)),
  };
}

export async function updateAuthorsPicksOrder(orderedIds: string[]): Promise<void> {
  saveAdminAuthorsPicksOrder(orderedIds);
  for (const [index, id] of orderedIds.entries()) {
    await apiFetchJson(`/api/v1/superadmin/articles/${id}/author-pick`, {
      method: 'PATCH',
      body: JSON.stringify({ is_author_pick: true, author_pick_order: index }),
    });
  }
  const allArticles = await fetchArticles();
  const tracked = new Set(orderedIds);
  for (const article of allArticles) {
    if (!tracked.has(article.id) && article.is_authors_pick) {
      await apiFetchJson(`/api/v1/superadmin/articles/${article.id}/author-pick`, {
        method: 'PATCH',
        body: JSON.stringify({ is_author_pick: false, author_pick_order: null }),
      });
    }
  }
}

export async function fetchArticleById(id: string): Promise<AdminArticle | null> {
  try {
    const row = await apiFetchJson<any>(`/api/v1/superadmin/articles/${id}`);
    return toAdminArticle(row);
  } catch {
    return null;
  }
}

export async function createArticle(data: Partial<AdminArticle>): Promise<AdminArticle> {
  const payload = {
    category_id: data.category_id ?? undefined,
    title: data.title ?? 'Untitled',
    subtitle: data.subtitle ?? '',
    summary: data.summary ?? undefined,
    slug: undefined,
    article_type: data.article_type ?? 'ARTICLE',
    status: data.status ?? 'DRAFT',
    cover_image_url: data.cover_image_url ?? undefined,
    is_featured: Boolean(data.is_featured),
    is_author_pick: Boolean(data.is_authors_pick),
    author_name: data.author_name ?? undefined,
    reading_time_minutes: data.reading_time_minutes ?? undefined,
    published_at: data.published_at ?? undefined,
    scheduled_at: data.scheduled_at ?? undefined,
  };

  const row = await apiFetchJson<any>('/api/v1/superadmin/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toAdminArticle(row);
}

export async function updateArticle(id: string, updates: Partial<AdminArticle>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
  if (updates.summary !== undefined) payload.summary = updates.summary;
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.article_type !== undefined) payload.article_type = updates.article_type;
  if (updates.cover_image_url !== undefined) payload.cover_image_url = updates.cover_image_url;
  if (updates.is_featured !== undefined) payload.is_featured = updates.is_featured;
  if (updates.is_authors_pick !== undefined) payload.is_author_pick = updates.is_authors_pick;
  if (updates.author_name !== undefined) payload.author_name = updates.author_name;
  if (updates.reading_time_minutes !== undefined) payload.reading_time_minutes = updates.reading_time_minutes;
  if (updates.published_at !== undefined) payload.published_at = updates.published_at;
  if (updates.scheduled_at !== undefined) payload.scheduled_at = updates.scheduled_at;

  if (updates.status === 'PUBLISHED') {
    await apiFetchJson(`/api/v1/superadmin/articles/${id}/publish`, { method: 'POST' });
  } else if (updates.status === 'UNPUBLISHED') {
    await apiFetchJson(`/api/v1/superadmin/articles/${id}/unpublish`, { method: 'POST' });
  } else if (updates.status === 'SCHEDULED') {
    if (!updates.scheduled_at) throw new Error('A scheduled date is required');
    await apiFetchJson(`/api/v1/superadmin/articles/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_at: updates.scheduled_at }),
    });
  }

  if (Object.keys(payload).length > 0) {
    await apiFetchJson(`/api/v1/superadmin/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export async function deleteArticle(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/articles/${id}`, { method: 'DELETE' });
}

export async function fetchArticleBlocks(articleId: string): Promise<AdminBlock[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/superadmin/articles/${articleId}/blocks`);
  return toArray<any>(rows).map(toAdminBlock);
}

export async function createArticleBlock(articleId: string, block: Partial<AdminBlock>): Promise<AdminBlock> {
  const payload: Record<string, unknown> = {
    block_type: block.block_type,
    display_order: block.order_index ?? 0,
  };
  if (block.block_type === 'TEXT') payload.text_content = block.content?.trim();
  if (block.block_type === 'IMAGE') {
    if (block.media_id) payload.media_id = block.media_id;
    if (block.external_url?.trim()) payload.external_url = block.external_url.trim();
    if (block.image_caption?.trim()) payload.caption = block.image_caption.trim();
  }
  if (block.block_type === 'QUIZ') payload.quiz_id = block.quiz_id;
  if (block.block_type === 'OPINION') payload.opinion_id = block.opinion_id;
  if (block.block_type === 'PODCAST') {
    payload.title = block.title;
    if (block.media_id) payload.media_id = block.media_id;
    payload.external_url = block.external_url?.trim();
    payload.text_content = block.content?.trim();
  }
  const row = await apiFetchJson<any>(`/api/v1/superadmin/articles/${articleId}/blocks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toAdminBlock(row);
}

export async function updateArticleBlock(articleId: string, blockId: string, block: Partial<AdminBlock>): Promise<AdminBlock> {
  const payload: Record<string, unknown> = { display_order: block.order_index };
  if (block.block_type === 'TEXT') payload.text_content = block.content;
  if (block.block_type === 'IMAGE') {
    if (block.media_id) payload.media_id = block.media_id;
    if (block.external_url) payload.external_url = block.external_url;
    if (block.image_caption) payload.caption = block.image_caption;
  }
  if (block.block_type === 'QUIZ') payload.quiz_id = block.quiz_id;
  if (block.block_type === 'OPINION') payload.opinion_id = block.opinion_id;
  if (block.block_type === 'PODCAST') {
    payload.title = block.title;
    if (block.media_id) payload.media_id = block.media_id;
    payload.external_url = block.external_url;
    payload.text_content = block.content;
  }
  const row = await apiFetchJson<any>(`/api/v1/superadmin/articles/${articleId}/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return toAdminBlock(row);
}

export async function deleteArticleBlock(articleId: string, blockId: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/articles/${articleId}/blocks/${blockId}`, { method: 'DELETE' });
}

export async function reorderArticleBlocks(articleId: string, blocks: Pick<AdminBlock, 'id' | 'order_index'>[]): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/articles/${articleId}/blocks/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ items: blocks.map((block) => ({ block_id: block.id, display_order: block.order_index })) }),
  });
}

export async function searchArticles(query: string): Promise<AdminArticle[]> {
  if (!query.trim()) return [];
  const rows = await fetchArticles({ search: query });
  return rows.slice(0, 8);
}

/* ===== Categories ===== */

export async function fetchCategories(): Promise<AdminCategory[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/superadmin/categories`);
  return toArray<any>(rows).map(toAdminCategory);
}

export async function createCategory(data: Partial<AdminCategory>): Promise<AdminCategory> {
  const row = await apiFetchJson<any>('/api/v1/superadmin/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name ?? 'New Category',
      slug: data.slug ?? 'new-category',
      description: data.description ?? null,
      display_order: 0,
      is_active: true,
      image_url: data.image_url ?? null,
    }),
  });
  return toAdminCategory(row);
}

export async function updateCategory(id: string, updates: Partial<AdminCategory>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.image_url !== undefined) payload.image_url = updates.image_url;
  await apiFetchJson(`/api/v1/superadmin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/categories/${id}`, { method: 'DELETE' });
}

/* ===== Quizzes ===== */

export async function fetchQuizzes(): Promise<AdminQuiz[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/superadmin/quizzes`);
  const articles = await fetchArticles();
  return Promise.all(toArray<any>(rows).map(async (row) => {
    const detail = await apiFetchJson<any>(`/api/v1/superadmin/quizzes/${row.id}`);
    const question = detail.questions?.[0];
    return {
      id: String(row.id),
      article_id: String(row.article_id),
      article_title: articles.find((article) => article.id === String(row.article_id))?.title,
      title: detail.title ?? row.title ?? 'Quiz',
      question: question?.question_text ?? 'Quiz question',
      xp_reward: 10,
      options: (question?.options ?? []).map((option: any, index: number) => ({
        id: String(option.id),
        label: option.option_text ?? `Option ${index + 1}`,
        is_correct: Boolean(option.is_correct),
        explanation: option.explanation ?? null,
        order_index: index,
      })),
    };
  }));
}

export async function createQuiz(data: Partial<AdminQuiz>): Promise<AdminQuiz> {
  const created = await apiFetchJson<any>('/api/v1/superadmin/quizzes', {
    method: 'POST',
    body: JSON.stringify({ article_id: data.article_id, title: data.title ?? 'Quiz' }),
  });
  const question = await apiFetchJson<any>(`/api/v1/superadmin/quizzes/${created.id}/questions`, {
    method: 'POST',
    body: JSON.stringify({ question_text: data.question ?? 'Quiz question', display_order: 0 }),
  });
  const options = [];
  for (const [index, option] of (data.options ?? []).entries()) {
    const createdOption = await apiFetchJson<any>(`/api/v1/superadmin/quizzes/${created.id}/questions/${question.id}/options`, {
      method: 'POST',
      body: JSON.stringify({
        option_text: option.label,
        display_order: index,
        is_correct: Boolean(option.is_correct),
        explanation: option.explanation ?? null,
      }),
    });
    options.push({
      id: String(createdOption.id),
      label: createdOption.option_text ?? option.label,
      is_correct: Boolean(createdOption.is_correct),
      explanation: createdOption.explanation ?? option.explanation ?? null,
      order_index: index,
    });
  }
  return {
    id: String(created.id),
    article_id: String(created.article_id),
    title: data.title || 'New Quiz',
    question: data.question || '',
    xp_reward: data.xp_reward ?? 10,
    options,
  };
}

export async function updateQuiz(id: string, updates: Partial<AdminQuiz>): Promise<void> {
  const detail = await apiFetchJson<any>(`/api/v1/superadmin/quizzes/${id}`);
  if ((updates.article_id && updates.article_id !== detail.article_id) || updates.title !== undefined) {
    await apiFetchJson(`/api/v1/superadmin/quizzes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ article_id: updates.article_id, title: updates.title }),
    });
  }
  const question = detail.questions?.[0];
  if (!question) return;

  if (updates.question !== undefined) {
    await apiFetchJson(`/api/v1/superadmin/quizzes/${id}/questions/${question.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ question_text: updates.question }),
    });
  }

  for (const [index, option] of (updates.options ?? []).entries()) {
    if (!option.id) {
      await apiFetchJson(`/api/v1/superadmin/quizzes/${id}/questions/${question.id}/options`, {
        method: 'POST',
        body: JSON.stringify({ option_text: option.label, display_order: index, is_correct: Boolean(option.is_correct), explanation: option.explanation || null }),
      });
      continue;
    }
    await apiFetchJson(`/api/v1/superadmin/quizzes/${id}/questions/${question.id}/options/${option.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ option_text: option.label, display_order: index, is_correct: Boolean(option.is_correct), explanation: option.explanation || null }),
    });
  }

  const retainedOptionIds = new Set((updates.options ?? []).map((option) => option.id));
  for (const option of question.options ?? []) {
    if (!retainedOptionIds.has(option.id)) {
      await apiFetchJson(`/api/v1/superadmin/quizzes/${id}/questions/${question.id}/options/${option.id}`, { method: 'DELETE' });
    }
  }
}

export async function deleteQuiz(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/quizzes/${id}`, { method: 'DELETE' });
}

/* ===== Opinions ===== */

export async function fetchOpinions(): Promise<AdminOpinion[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/superadmin/opinions`);
  const articles = await fetchArticles();
  return toArray<any>(rows).map((row) => ({
    id: String(row.id),
    article_id: String(row.article_id),
    article_title: articles.find((article) => article.id === String(row.article_id))?.title,
    question: row.question_text ?? 'Opinion question',
    options: (row.options ?? []).map((option: any) => option.option_text ?? option.label ?? option),
    xp_reward: 5,
    allow_custom_text: Boolean(row.allow_custom_response),
  }));
}

export async function createOpinion(data: Partial<AdminOpinion>): Promise<AdminOpinion> {
  const row = await apiFetchJson<any>('/api/v1/superadmin/opinions', {
    method: 'POST',
    body: JSON.stringify({
      article_id: data.article_id,
      question_text: data.question ?? 'New Opinion',
      display_order: 0,
      allow_custom_response: Boolean(data.allow_custom_text),
    }),
  });
  return {
    id: String(row.id),
    article_id: String(row.article_id),
    article_title: undefined,
    question: row.question_text ?? data.question ?? 'New Opinion',
    options: data.options ?? [],
    xp_reward: data.xp_reward ?? 5,
    allow_custom_text: Boolean(row.allow_custom_response),
  };
}

export async function updateOpinion(id: string, updates: Partial<AdminOpinion>): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/opinions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      question_text: updates.question,
      allow_custom_response: updates.allow_custom_text,
    }),
  });
}

export async function deleteOpinion(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/opinions/${id}`, { method: 'DELETE' });
}

export async function createOpinionOption(opinionId: string, optionText: string, displayOrder: number): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/opinions/${opinionId}/options`, {
    method: 'POST',
    body: JSON.stringify({ option_text: optionText, display_order: displayOrder }),
  });
}

export async function replaceOpinionOptions(opinionId: string, options: string[]): Promise<void> {
  const existing = await apiFetchJson<any[]>(`/api/v1/superadmin/opinions/${opinionId}/options`);
  for (const option of toArray<any>(existing)) {
    await apiFetchJson(`/api/v1/superadmin/opinions/${opinionId}/options/${option.id}`, { method: 'DELETE' });
  }
  for (const [index, option] of options.filter(Boolean).entries()) {
    await createOpinionOption(opinionId, option, index);
  }
}

/* ===== Comments ===== */

export async function fetchComments(page = 1, pageSize = 10): Promise<{ items: AdminComment[]; total: number }> {
  const query = buildQuery({ page, page_size: pageSize });
  const data = await apiFetchJson<any>(`/api/v1/superadmin/comments${query}`);
  const items = toArray<any>(data.items ?? data).map(toAdminComment);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: Number(data.total ?? items.length) };
}

export async function updateCommentStatus(id: string, status: AdminComment['status']): Promise<void> {
  const comments = await apiFetchJson<any>('/api/v1/superadmin/comments');
  const comment = toArray<any>(comments.items ?? comments).find((item) => String(item.id) === id);
  if (!comment) throw new Error('Comment not found');
  const articleId = String(comment.article_id);
  const commentId = String(comment.id);
  await apiFetchJson(`/api/v1/articles/${articleId}/comments/${commentId}/moderation?hidden=${status === 'hidden'}`, {
    method: 'PATCH',
  });
}

export async function deleteComment(id: string): Promise<void> {
  const comments = await apiFetchJson<any>('/api/v1/superadmin/comments');
  const comment = toArray<any>(comments.items ?? comments).find((item) => String(item.id) === id);
  if (!comment) throw new Error('Comment not found');
  const articleId = String(comment.article_id);
  const commentId = String(comment.id);
  await apiFetchJson(`/api/v1/articles/${articleId}/comments/${commentId}/admin`, { method: 'DELETE' });
}

/* ===== Users ===== */

export async function fetchUsers(page = 1, pageSize = 10, search?: string): Promise<{ items: AdminUser[]; total: number }> {
  const query = buildQuery({ search: search ?? undefined });
  const data = await apiFetchJson<any>(`/api/v1/superadmin/users${query}`);
  const items = toArray<any>(data.items ?? data).map(toAdminUser);
  const filtered = search ? items.filter((u) => `${u.display_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) : items;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length };
}

export async function updateUserStatus(id: string, status: AdminUser['status']): Promise<void> {
  const isActive = status === 'active';
  await apiFetchJson(`/api/v1/superadmin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function updateUserRole(id: string, role: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role: normalizeRolePayload(role) }),
  });
}

/* ===== XP Rules ===== */

export async function fetchXPRules(): Promise<XPRule[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/superadmin/gamification/xp-rules`);
  return toArray<any>(rows).map((row) => ({
    id: String(row.id),
    action: row.event_type ?? 'UNKNOWN_EVENT',
    xp_amount: Number(row.amount ?? 0),
    description: row.description ?? null,
  }));
}

export async function createXPRule(data: Partial<XPRule>): Promise<XPRule> {
  const row = await apiFetchJson<any>('/api/v1/superadmin/gamification/xp-rules', {
    method: 'POST',
    body: JSON.stringify({
      event_type: data.action ?? 'NEW_ACTION',
      amount: Number(data.xp_amount ?? 0),
      description: data.description ?? null,
      is_active: true,
    }),
  });
  return {
    id: String(row.id),
    action: row.event_type ?? data.action ?? 'NEW_ACTION',
    xp_amount: Number(row.amount ?? data.xp_amount ?? 0),
    description: row.description ?? data.description ?? null,
  };
}

export async function updateXPRule(id: string, updates: Partial<XPRule>): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/gamification/xp-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      event_type: updates.action,
      amount: updates.xp_amount,
      description: updates.description,
    }),
  });
}

export async function deleteXPRule(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/gamification/xp-rules/${id}`, { method: 'DELETE' });
}

/* ===== Levels ===== */

export async function fetchLevels(): Promise<AdminLevel[]> {
  const data = await apiFetchJson<any>(`/api/v1/superadmin/gamification/levels`);
  return toArray<any>(data.items ?? data).map((item) => ({
    id: String(item.id),
    level_number: Number(item.display_order ?? item.level_number ?? 1),
    name: item.name ?? 'Level',
    xp_threshold: Number(item.minimum_xp ?? item.xp_threshold ?? 0),
    image_url: normalizeStoredUrl(item.image_url ?? item.imageUrl ?? null),
  }));
}

export async function createLevel(data: Partial<AdminLevel>): Promise<AdminLevel> {
  const row = await apiFetchJson<any>('/api/v1/superadmin/gamification/levels', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name ?? 'New Level',
      minimum_xp: Number(data.xp_threshold ?? 0),
      display_order: Number(data.level_number ?? 1),
    }),
  });
  return {
    id: String(row.id),
    level_number: Number(row.display_order ?? data.level_number ?? 1),
    name: row.name ?? data.name ?? 'New Level',
    xp_threshold: Number(row.minimum_xp ?? data.xp_threshold ?? 0),
    image_url: normalizeStoredUrl(data.image_url),
  };
}

export async function updateLevel(id: string, updates: Partial<AdminLevel>): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/gamification/levels/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: updates.name,
      minimum_xp: updates.xp_threshold,
      display_order: updates.level_number,
    }),
  });
}

export async function deleteLevel(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/gamification/levels/${id}`, { method: 'DELETE' });
}

/* ===== Badges ===== */

export async function fetchBadges(): Promise<AdminBadge[]> {
  const data = await apiFetchJson<any>(`/api/v1/superadmin/gamification/badges`);
  return toArray<any>(data.items ?? data).map((item) => ({
    id: String(item.id),
    name: item.name ?? 'Badge',
    description: item.description ?? '',
    image_url: normalizeStoredUrl(item.image_url ?? item.imageAsset?.signed_url ?? null),
  }));
}

export async function createBadge(data: Partial<AdminBadge>): Promise<AdminBadge> {
  const row = await apiFetchJson<any>('/api/v1/superadmin/gamification/badges', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name ?? 'New Badge',
      description: data.description ?? '',
      image_asset_id: null,
      rule_type: 'manual',
      rule_config: {},
      is_active: true,
    }),
  });
  return {
    id: String(row.id),
    name: row.name ?? data.name ?? 'New Badge',
    description: row.description ?? data.description ?? '',
    image_url: normalizeStoredUrl(data.image_url ?? null),
  };
}

export async function updateBadge(id: string, updates: Partial<AdminBadge>): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/gamification/badges/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: updates.name,
      description: updates.description,
      image_asset_id: null,
      rule_type: 'manual',
      rule_config: {},
    }),
  });
}

export async function deleteBadge(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/gamification/badges/${id}`, { method: 'DELETE' });
}

/* ===== Promotions ===== */

export async function fetchPromotions(): Promise<AdminPromotion[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/promotions/admin`);
  return toArray<any>(rows).map(toAdminPromotion);
}

export async function createPromotion(data: Partial<AdminPromotion>): Promise<AdminPromotion> {
  const row = await apiFetchJson<any>('/api/v1/promotions', {
    method: 'POST',
    body: JSON.stringify({
      image_media_id: data.image_media_id ?? data.image_url ?? '',
      title: data.title ?? 'New Promotion',
      description: data.description ?? '',
      external_url: data.external_url ?? 'https://example.com',
      event_date: data.date_time ?? null,
      display_order: 0,
      is_active: data.active ?? true,
      starts_at: null,
      ends_at: null,
    }),
  });
  return toAdminPromotion(row);
}

export async function updatePromotion(id: string, updates: Partial<AdminPromotion>): Promise<void> {
  await apiFetchJson(`/api/v1/promotions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: updates.title,
      description: updates.description,
      image_media_id: updates.image_media_id ?? updates.image_url,
      external_url: updates.external_url,
      event_date: updates.date_time,
      is_active: updates.active,
    }),
  });
}

export async function deletePromotion(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/promotions/${id}`, { method: 'DELETE' });
}

/* ===== Advertisements ===== */

export async function fetchAdvertisements(): Promise<Advertisement[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/advertisements/admin`);
  return toArray<any>(rows).map(toAdvertisement);
}

export async function createAdvertisement(data: Partial<Advertisement>): Promise<Advertisement> {
  const row = await apiFetchJson<any>('/api/v1/advertisements', {
    method: 'POST',
    body: JSON.stringify({
      slot_id: data.ad_slot_id ?? null,
      image_media_id: data.image_url ?? '',
      title: data.title ?? 'New Ad',
      description: data.description ?? data.title ?? 'Advertisement',
      destination_url: data.target_url ?? 'https://example.com',
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      is_active: Boolean(data.status !== 'INACTIVE'),
      display_order: 0,
    }),
  });
  return toAdvertisement(row);
}

export async function updateAdvertisement(id: string, updates: Partial<Advertisement>): Promise<void> {
  await apiFetchJson(`/api/v1/advertisements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: updates.title,
      description: updates.description,
      image_media_id: updates.image_url,
      destination_url: updates.target_url,
      starts_at: updates.starts_at,
      ends_at: updates.ends_at,
      is_active: updates.status ? updates.status !== 'INACTIVE' : undefined,
    }),
  });
}

export async function deleteAdvertisement(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/advertisements/${id}`, { method: 'DELETE' });
}

/* ===== Ad Slots ===== */

export async function fetchAdSlots(): Promise<AdSlot[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/advertisements/slots/admin`);
  return toArray<any>(rows).map(toAdSlot);
}

export async function createAdSlot(data: Partial<AdSlot>): Promise<AdSlot> {
  const row = await apiFetchJson<any>('/api/v1/advertisements/slots', {
    method: 'POST',
    body: JSON.stringify({
      key: data.slug ?? 'new-slot',
      name: data.name ?? 'New Slot',
      description: data.description ?? null,
      placement: data.placement ?? 'sidebar',
      is_active: data.is_active ?? true,
    }),
  });
  return toAdSlot(row);
}

export async function updateAdSlot(id: string, updates: Partial<AdSlot>): Promise<void> {
  await apiFetchJson(`/api/v1/advertisements/slots/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      key: updates.slug,
      name: updates.name,
      description: updates.description,
      placement: updates.placement,
      is_active: updates.is_active,
    }),
  });
}

export async function deleteAdSlot(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/advertisements/slots/${id}`, { method: 'DELETE' });
}

/* ===== Media ===== */

export async function fetchMedia(): Promise<MediaItem[]> {
  const rows = await apiFetchJson<any[]>(`/api/v1/media/admin`);
  return toArray<any>(rows).map(toMediaItem);
}

export async function uploadMedia(file: File): Promise<MediaItem> {
  const formData = new FormData();
  formData.append('file', file);
  const row = await apiFetchJson<any>('/api/v1/media/admin/upload', {
    method: 'POST',
    body: formData,
  });
  return toMediaItem(row);
}

export async function deleteMedia(id: string): Promise<void> {
  await apiFetchJson(`/api/v1/media/admin/${id}`, { method: 'DELETE' });
}

/* ===== Analytics ===== */

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const dashboard = await apiFetchJson<any>(`/api/v1/analytics/dashboard`);
  const overview = dashboard.overview ?? {};
  const recent = toArray<any>(dashboard.recent_activity ?? []).map((item) => ({
    label: item.event_type ?? 'Activity',
    value: Number(item.metadata?.count ?? item.metadata?.total ?? 0),
    change: '+0%',
  }));

  return {
    totals: {
      articles: Number(dashboard.top_articles?.length ?? overview.total_article_views ?? 0),
      published_articles: Math.max(0, Number(overview.articles_completed ?? 0)),
      draft_articles: 0,
      pending_review: 0,
      users: Number(overview.total_users ?? 0),
      active_users: Number(overview.active_users ?? 0),
      comments: Number(overview.comments_created ?? 0),
      quiz_attempts: Number(overview.quiz_attempts ?? 0),
      opinion_submissions: Number(overview.opinions_submitted ?? 0),
      completions: Number(overview.articles_completed ?? 0),
      shares: Number(overview.shares_created ?? 0),
      ad_clicks: Number(overview.advertisement_clicks ?? 0),
      ad_impressions: 0,
    },
    engagement: {
      avg_reading_time: 0,
      avg_completion_rate: Number((overview.articles_completed ?? 0) > 0 ? 100 : 0),
      quiz_accuracy: Number((overview.quiz_success_rate ?? 0) * 100),
      bookmark_rate: 0,
    },
    recent_activity: recent,
  };
}

/* ===== Feedback ===== */

export async function fetchFeedback(page = 1, pageSize = 10): Promise<{ items: FeedbackItem[]; total: number }> {
  const query = buildQuery({ page, page_size: pageSize });
  const data = await apiFetchJson<any>(`/api/v1/superadmin/feedback${query}`);
  const rows = toArray<any>(data.items ?? data).map((item) => ({
    id: String(item.id),
    content: item.content ?? '',
    user_email: item.user_email ?? null,
    status: item.status ?? 'new',
    created_at: item.created_at ?? new Date().toISOString(),
  }));
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: Number(data.total ?? rows.length) };
}

export async function updateFeedbackStatus(id: string, status: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/* ===== Business Enquiries ===== */

export async function fetchBusinessEnquiries(page = 1, pageSize = 10): Promise<{ items: BusinessEnquiry[]; total: number }> {
  const query = buildQuery({ page, page_size: pageSize });
  const data = await apiFetchJson<any>(`/api/v1/superadmin/business-enquiries${query}`);
  const rows = toArray<any>(data.items ?? data).map((item) => ({
    id: String(item.id),
    name: item.name ?? '',
    company: item.company ?? '',
    purpose: item.purpose ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    status: item.status ?? 'new',
    created_at: item.created_at ?? new Date().toISOString(),
  }));
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: Number(data.total ?? rows.length) };
}

export async function updateEnquiryStatus(id: string, status: string): Promise<void> {
  await apiFetchJson(`/api/v1/superadmin/business-enquiries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/* ===== Audit Logs ===== */

export async function fetchAuditLogs(page = 1, pageSize = 10): Promise<{ items: AuditLog[]; total: number }> {
  const query = buildQuery({ limit: pageSize, offset: (page - 1) * pageSize });
  const data = await apiFetchJson<any>(`/api/v1/superadmin/audit-logs${query}`);
  const rows = toArray<any>(data.items ?? data).map(toAuditLog);
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: Number(data.total ?? rows.length) };
}
