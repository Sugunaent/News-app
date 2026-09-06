-- Migration: Master Editorial Schema Alignment
-- Timestamp: 2026-09-05 14:00:00

BEGIN;

-- 1. Sync Article Blocks
ALTER TABLE public.article_blocks
  ADD COLUMN IF NOT EXISTS text_content TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT;

-- 2. Sync Quizzes
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Sync Quiz Questions
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_text TEXT;

-- 4. Sync Quiz Options
ALTER TABLE public.quiz_options
  ADD COLUMN IF NOT EXISTS option_text TEXT;

-- 5. Sync Opinion Options
ALTER TABLE public.opinion_options
  ADD COLUMN IF NOT EXISTS option_text TEXT;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;