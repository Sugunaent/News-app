-- ============================================================
-- News App
-- Data Integrity Fixes
-- ============================================================
--
-- Migration:
-- 20260822100000_fix_data_integrity_constraints
--
-- Purpose:
-- 1. Correct the content_reviews reviewer deletion behavior.
-- 2. Ensure quiz attempts cannot reference an option belonging
--    to a different question.
-- 3. Ensure opinion responses cannot reference an option
--    belonging to a different opinion question.
-- ============================================================


-- ============================================================
-- 1. FIX CONTENT REVIEWER FOREIGN KEY
-- ============================================================

ALTER TABLE public.content_reviews
ALTER COLUMN reviewer_id DROP NOT NULL;


-- The existing FK uses ON DELETE SET NULL, which now works
-- correctly because reviewer_id is nullable.


-- ============================================================
-- 2. QUIZ OPTION OWNERSHIP
-- ============================================================

-- Add a composite uniqueness constraint so that a quiz option
-- can be referenced together with its owning question.

ALTER TABLE public.quiz_options
ADD CONSTRAINT quiz_options_id_question_unique
UNIQUE (id, question_id);


-- Replace the existing single-column FK on selected_option_id
-- with a composite FK tied to question_id.

ALTER TABLE public.quiz_attempts
DROP CONSTRAINT quiz_attempts_option_fkey;


ALTER TABLE public.quiz_attempts
ADD CONSTRAINT quiz_attempts_option_question_fkey
FOREIGN KEY (selected_option_id, question_id)
REFERENCES public.quiz_options(id, question_id)
ON DELETE CASCADE;


-- ============================================================
-- 3. OPINION OPTION OWNERSHIP
-- ============================================================

ALTER TABLE public.opinion_options
ADD CONSTRAINT opinion_options_id_question_unique
UNIQUE (id, question_id);


ALTER TABLE public.opinion_responses
DROP CONSTRAINT opinion_responses_option_fkey;


ALTER TABLE public.opinion_responses
ADD CONSTRAINT opinion_responses_option_question_fkey
FOREIGN KEY (selected_option_id, opinion_question_id)
REFERENCES public.opinion_options(id, question_id)
ON DELETE CASCADE;


-- ============================================================
-- END OF MIGRATION
-- ============================================================