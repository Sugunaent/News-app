export type ArticleType = 'ARTICLE' | 'PODCAST' | 'QUIZ' | 'OPINION' | 'FEATURED';

export type BlockType = 'TEXT' | 'IMAGE' | 'QUIZ' | 'OPINION' | 'PODCAST';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  external_url: string;
  date_time: string | null;
  active: boolean;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  category_id: string;
  category?: Category;
  article_type: ArticleType;
  cover_image_url: string | null;
  author_id: string | null;
  author_name: string | null;
  published_at: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_authors_pick: boolean;
  reading_time_minutes: number | null;
}

export interface QuizOption {
  id: string;
  label: string;
  is_correct: boolean;
  explanation: string | null;
}

export interface Quiz {
  id: string;
  article_id: string;
  title: string;
  question: string;
  options: QuizOption[];
  xp_reward: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  selected_option_id: string;
  is_correct: boolean;
  xp_earned: number;
  created_at: string;
}

export interface Opinion {
  id: string;
  article_id: string;
  question: string;
  options: string[];
  option_ids?: string[];
  xp_reward: number;
  allow_custom_text?: boolean;
}

export interface OpinionSubmission {
  id: string;
  opinion_id: string;
  user_id: string;
  selected_option: string;
  xp_earned?: number;
  created_at: string;
}

export interface PodcastBlock {
  id: string;
  article_id: string;
  title: string;
  audio_url: string;
  duration_seconds: number | null;
  description: string | null;
}

export interface ArticleBlock {
  id: string;
  article_id: string;
  block_type: BlockType;
  order_index: number;
  content: string | null;
  image_url: string | null;
  image_caption: string | null;
  quiz_id: string | null;
  quiz?: Quiz | null;
  opinion_id: string | null;
  opinion?: Opinion | null;
  podcast_id: string | null;
  podcast?: PodcastBlock | null;
}

export interface ArticleWithBlocks extends Article {
  blocks: ArticleBlock[];
}

export interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
}

export interface ReadingProgress {
  article_id: string;
  user_id: string;
  percentage: number;
  scroll_position: number;
  completed: boolean;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  bio: string | null;
}

export interface Level {
  id: string;
  level_number: number;
  name: string;
  xp_threshold: number;
  image_url: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge?: Badge;
  earned_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  article_id: string;
  created_at: string;
}

export interface CompletionCard {
  id: string;
  user_id: string;
  article_id: string;
  article_title: string;
  xp_gained: number;
  created_at: string;
  card_type?: 'completion' | 'opinion';
  opinion_text?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
  social_links: { label: string; url: string }[];
}

export interface ReadingHistoryItem extends ReadingProgress {
  article?: Article;
}

export interface SavedArticleItem extends Bookmark {
  article?: Article;
}

export interface QuizStats {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface OpinionWithArticle extends OpinionSubmission {
  opinion?: Opinion;
  article?: Article;
}

export interface AchievementItem {
  id: string;
  type: 'completion' | 'badge' | 'quiz';
  title: string;
  description: string;
  date: string;
  xp: number;
  article_title?: string;
  badge_image?: string | null;
}

export interface CompletionResult {
  card_id: string;
  xp_gained: number;
  total_xp: number;
  new_level: number;
  already_completed: boolean;
}

export interface QuizAttemptResult {
  attempt_id: string;
  xp_earned: number;
  total_xp: number;
  new_level: number;
  already_attempted: boolean;
}
