/*
 * Type definitions for the Superadmin CMS.
 *
 * BACKEND INTEGRATION GUIDE:
 * These interfaces define the shapes your backend API should return.
 * Each interface maps to a database table or API response.
 */

export type ArticleStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'SCHEDULED'
  | 'ARCHIVED';

export type ArticleType = 'ARTICLE' | 'PODCAST' | 'QUIZ' | 'OPINION' | 'FEATURED';
export type BlockType = 'TEXT' | 'IMAGE' | 'QUIZ' | 'OPINION' | 'PODCAST';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type CommentStatus = 'visible' | 'hidden' | 'deleted';
export type AdStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  article_count?: number;
  created_at: string;
}

export interface AdminArticle {
  id: string;
  title: string;
  subtitle: string;
  summary: string | null;
  category_id: string | null;
  category_name?: string;
  article_type: ArticleType;
  status: ArticleStatus;
  cover_image_url: string | null;
  author_name: string | null;
  is_featured: boolean;
  is_authors_pick: boolean;
  reading_time_minutes: number | null;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface AdminArticleIdCopy {
  id: string;
  shortId: string;
}

export interface AdminBlock {
  id: string;
  article_id: string;
  block_type: BlockType;
  order_index: number;
  media_id?: string | null;
  external_url?: string | null;
  content: string | null;
  image_url: string | null;
  image_caption: string | null;
  title?: string | null;
  media_url?: string | null;
  quiz_id: string | null;
  opinion_id: string | null;
  podcast_id: string | null;
  quiz?: AdminQuiz | null;
  opinion?: AdminOpinion | null;
  podcast?: { id: string; title: string; audio_url: string; duration_seconds: number | null; description: string | null } | null;
}

export interface AdminQuizOption {
  id: string;
  label: string;
  is_correct: boolean;
  explanation: string | null;
  order_index: number;
}

export interface AdminQuiz {
  id: string;
  article_id: string;
  article_title?: string;
  title: string;
  question: string;
  xp_reward?: number;
  options: AdminQuizOption[];
}

export interface AdminOpinion {
  id: string;
  article_id: string;
  article_title?: string;
  question: string;
  options: string[];
  xp_reward?: number;
  allow_custom_text?: boolean;
}

export interface AdminComment {
  id: string;
  article_id: string;
  article_title?: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  status: CommentStatus;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  xp: number;
  level: number;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
  articles_completed: number;
  quizzes_correct: number;
}

export interface XPRule {
  id: string;
  action: string;
  xp_amount: number;
  description: string | null;
}

export interface AdminLevel {
  id: string;
  level_number: number;
  name: string;
  xp_threshold: number;
  image_url: string | null;
}

export interface AdminBadge {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
}

export interface AdminPromotion {
  id: string;
  image_media_id?: string | null;
  title: string;
  description: string;
  image_url: string;
  external_url: string;
  date_time: string | null;
  active: boolean;
  created_at: string;
}

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  target_url: string;
  ad_slot_id: string | null;
  status: AdStatus;
  starts_at: string | null;
  ends_at: string | null;
  clicks: number;
  impressions: number;
  created_at: string;
}

export interface AdSlot {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  placement: string;
  is_active: boolean;
  created_at: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface AnalyticsData {
  totals: {
    articles: number;
    published_articles: number;
    draft_articles: number;
    pending_review: number;
    users: number;
    active_users: number;
    comments: number;
    quiz_attempts: number;
    opinion_submissions: number;
    completions: number;
    shares: number;
    ad_clicks: number;
    ad_impressions: number;
  };
  engagement: {
    avg_reading_time: number;
    avg_completion_rate: number;
    quiz_accuracy: number;
    bookmark_rate: number;
  };
  recent_activity: { label: string; value: number; change: string }[];
}

export interface FeedbackItem {
  id: string;
  content: string;
  user_email: string | null;
  status: string;
  created_at: string;
}

export interface BusinessEnquiry {
  id: string;
  name: string;
  company: string;
  purpose: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: { summary: string } | null;
  created_at: string;
}
