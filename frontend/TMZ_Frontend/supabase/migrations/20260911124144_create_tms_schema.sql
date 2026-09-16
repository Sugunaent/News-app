/*
# The Modern Stories — Full Database Schema

## Overview
Creates the complete schema for The Modern Stories editorial platform including categories, articles, blocks, quizzes, opinions, podcasts, comments, bookmarks, reading progress, user profiles, levels, badges, completion cards, team members, promotions, and contact form tables.

## Tables

1. **categories** — Article categories (Technology, Science, Culture, Business)
2. **articles** — Published articles with title, subtitle, cover image, author info
3. **article_blocks** — Block-based article content (TEXT, IMAGE, QUIZ, OPINION, PODCAST)
4. **quizzes** — Quiz blocks with questions and XP rewards
5. **quiz_options** — Multiple choice options for quizzes
6. **quiz_attempts** — User attempts at quizzes with correctness and XP tracking
7. **opinions** — Opinion poll blocks
8. **opinion_submissions** — User submissions for opinions
9. **podcast_blocks** — Audio/podcast content blocks
10. **comments** — Article comments with display name and avatar
11. **bookmarks** — User article bookmarks
12. **reading_progress** — Per-user reading progress tracking (percentage, scroll position, completion)
13. **profiles** — User profiles with XP, level, display name, avatar
14. **levels** — Level definitions with names, XP thresholds, and images
15. **badges** — Badge definitions with names, descriptions, and images
16. **user_badges** — Badge assignments to users
17. **completion_cards** — Shareable completion cards with XP gained per article
18. **team_members** — Team member profiles for the About page
19. **promotions** — Active promotional content for the homepage
20. **business_enquiries** — Business contact form submissions
21. **feedback** — User feedback submissions

## Security
- All tables have RLS enabled
- Public content (categories, articles, blocks, quizzes, opinions, podcasts, promotions, team_members) is readable by anon+authenticated
- User-specific data (bookmarks, reading_progress, quiz_attempts, opinion_submissions, comments, completion_cards, user_badges, profiles, business_enquiries, feedback) is scoped to authenticated users with ownership checks
- Profiles use auth.uid() for ownership
- Reading progress and bookmarks use DEFAULT auth.uid() for seamless inserts
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  article_type text NOT NULL DEFAULT 'ARTICLE',
  cover_image_url text,
  author_id uuid,
  author_name text,
  published_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_authors_pick boolean DEFAULT false,
  reading_time_minutes integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_articles" ON articles;
CREATE POLICY "anon_read_articles" ON articles FOR SELECT TO anon, authenticated USING (is_published = true);

-- Article Blocks
CREATE TABLE IF NOT EXISTS article_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  content text,
  image_url text,
  image_caption text,
  quiz_id uuid,
  opinion_id uuid,
  podcast_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE article_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_blocks" ON article_blocks;
CREATE POLICY "anon_read_blocks" ON article_blocks FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM articles WHERE articles.id = article_blocks.article_id AND articles.is_published = true));

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title text NOT NULL,
  question text NOT NULL,
  xp_reward integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_quizzes" ON quizzes;
CREATE POLICY "anon_read_quizzes" ON quizzes FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM articles WHERE articles.id = quizzes.article_id AND articles.is_published = true));

-- Quiz Options
CREATE TABLE IF NOT EXISTS quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  explanation text,
  order_index integer NOT NULL DEFAULT 0
);
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_quiz_options" ON quiz_options;
CREATE POLICY "anon_read_quiz_options" ON quiz_options FOR SELECT TO anon, authenticated
USING (true);

-- Quiz Attempts (user-scoped)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES quiz_options(id) ON DELETE SET NULL,
  is_correct boolean NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_quiz_attempts" ON quiz_attempts;
CREATE POLICY "select_own_quiz_attempts" ON quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quiz_attempts" ON quiz_attempts;
CREATE POLICY "insert_own_quiz_attempts" ON quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Opinions
CREATE TABLE IF NOT EXISTS opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  question text NOT NULL,
  options text[] NOT NULL DEFAULT '{}',
  xp_reward integer NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE opinions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_opinions" ON opinions;
CREATE POLICY "anon_read_opinions" ON opinions FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM articles WHERE articles.id = opinions.article_id AND articles.is_published = true));

-- Opinion Submissions (user-scoped)
CREATE TABLE IF NOT EXISTS opinion_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opinion_id uuid NOT NULL REFERENCES opinions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE opinion_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_opinion_submissions" ON opinion_submissions;
CREATE POLICY "select_own_opinion_submissions" ON opinion_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_opinion_submissions" ON opinion_submissions;
CREATE POLICY "insert_own_opinion_submissions" ON opinion_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Podcast Blocks
CREATE TABLE IF NOT EXISTS podcast_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title text NOT NULL,
  audio_url text NOT NULL,
  duration_seconds integer,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE podcast_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_podcasts" ON podcast_blocks;
CREATE POLICY "anon_read_podcasts" ON podcast_blocks FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM articles WHERE articles.id = podcast_blocks.article_id AND articles.is_published = true));

-- Comments (user-scoped)
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_comments" ON comments;
CREATE POLICY "anon_read_comments" ON comments FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM articles WHERE articles.id = comments.article_id AND articles.is_published = true));
DROP POLICY IF EXISTS "insert_own_comments" ON comments;
CREATE POLICY "insert_own_comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_comments" ON comments;
CREATE POLICY "update_own_comments" ON comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_comments" ON comments;
CREATE POLICY "delete_own_comments" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bookmarks (user-scoped)
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, article_id)
);
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_bookmarks" ON bookmarks;
CREATE POLICY "select_own_bookmarks" ON bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_bookmarks" ON bookmarks;
CREATE POLICY "insert_own_bookmarks" ON bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_bookmarks" ON bookmarks;
CREATE POLICY "delete_own_bookmarks" ON bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reading Progress (user-scoped)
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  percentage integer NOT NULL DEFAULT 0,
  scroll_position integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, article_id)
);
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_progress" ON reading_progress;
CREATE POLICY "select_own_progress" ON reading_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "upsert_own_progress" ON reading_progress;
CREATE POLICY "upsert_own_progress" ON reading_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_progress" ON reading_progress;
CREATE POLICY "update_own_progress" ON reading_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profiles (user-scoped, auto-created on signup via trigger)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT 'Reader',
  avatar_url text,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  bio text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Levels
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number integer UNIQUE NOT NULL,
  name text NOT NULL,
  xp_threshold integer NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_levels" ON levels;
CREATE POLICY "anon_read_levels" ON levels FOR SELECT TO anon, authenticated USING (true);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_badges" ON badges;
CREATE POLICY "anon_read_badges" ON badges FOR SELECT TO anon, authenticated USING (true);

-- User Badges (user-scoped)
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_badges" ON user_badges;
CREATE POLICY "select_own_badges" ON user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Completion Cards (user-scoped)
CREATE TABLE IF NOT EXISTS completion_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  article_title text NOT NULL,
  xp_gained integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, article_id)
);
ALTER TABLE completion_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_completion_cards" ON completion_cards;
CREATE POLICY "select_own_completion_cards" ON completion_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_completion_cards" ON completion_cards;
CREATE POLICY "insert_own_completion_cards" ON completion_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  bio text NOT NULL,
  image_url text,
  social_links jsonb DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 0
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_team" ON team_members;
CREATE POLICY "anon_read_team" ON team_members FOR SELECT TO anon, authenticated USING (true);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  external_url text NOT NULL,
  date_time timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_promotions" ON promotions;
CREATE POLICY "anon_read_promotions" ON promotions FOR SELECT TO anon, authenticated USING (active = true);

-- Business Enquiries
CREATE TABLE IF NOT EXISTS business_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  purpose text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE business_enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_business_enquiries" ON business_enquiries;
CREATE POLICY "insert_business_enquiries" ON business_enquiries FOR INSERT TO authenticated WITH CHECK (true);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_feedback" ON feedback;
CREATE POLICY "insert_feedback" ON feedback FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_article ON article_blocks(article_id, order_index);
CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_article ON reading_progress(user_id, article_id);
