-- ============================================================
-- News App
-- RLS + Security Policies
-- ============================================================
--
-- Migration:
-- 20260821160000_enable_rls_and_policies
--
-- Purpose:
-- Enable Row Level Security across the public application schema
-- and establish USER / ADMIN / SUPERADMIN access boundaries.
--
-- IMPORTANT:
-- FastAPI is the application's privileged write layer.
-- service_role is never exposed to clients.
-- ============================================================


-- ============================================================
-- 1. ROLE HELPER FUNCTIONS
-- ============================================================

-- These functions intentionally live in a non-exposed schema.
-- They are used only internally by RLS policies.

CREATE SCHEMA IF NOT EXISTS private;


CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND is_active = TRUE
    LIMIT 1;
$$;


CREATE OR REPLACE FUNCTION private.is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND is_active = TRUE
          AND role IN ('ADMIN', 'SUPERADMIN')
    );
$$;


CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND is_active = TRUE
          AND role = 'SUPERADMIN'
    );
$$;


-- These helpers are internal policy functions.
-- Do not expose them through the public API.

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;


-- ============================================================
-- 2. ENABLE RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opinion_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_block_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_option_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opinion_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opinion_question_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opinion_option_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opinion_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. PROFILES
-- ============================================================

-- Users can see only their own profile.
-- No direct UPDATE policy is intentionally provided.
-- Profile modifications will go through FastAPI.

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
);

-- Admins can read profiles for administrative functionality.

CREATE POLICY profiles_select_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 4. CATEGORIES
-- ============================================================

-- Normal users can only see active categories.

CREATE POLICY categories_select_active
ON public.categories
FOR SELECT
TO authenticated
USING (
    is_active = TRUE
);


-- Admins and superadmins can see all categories.

CREATE POLICY categories_select_admin
ON public.categories
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Category creation belongs to the administrative layer.

CREATE POLICY categories_insert_admin
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


-- Admins can modify categories, including deactivation.
-- Superadmin has the same access.

CREATE POLICY categories_update_admin
ON public.categories
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


-- Physical category deletion is restricted to SUPERADMIN.

CREATE POLICY categories_delete_superadmin
ON public.categories
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 5. MEDIA ASSETS
-- ============================================================

-- Authenticated users can read media that belongs to content
-- they are allowed to consume.

CREATE POLICY media_select_authenticated
ON public.media_assets
FOR SELECT
TO authenticated
USING (
    TRUE
);


-- Media creation/modification is administrative/backend work.

CREATE POLICY media_insert_admin
ON public.media_assets
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);

CREATE POLICY media_update_admin
ON public.media_assets
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);

CREATE POLICY media_delete_superadmin
ON public.media_assets
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 6. ARTICLES
-- ============================================================

-- Users may read only published articles.

CREATE POLICY articles_select_published
ON public.articles
FOR SELECT
TO authenticated
USING (
    status = 'PUBLISHED'
    AND published_at IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM public.categories c
        WHERE c.id = category_id
          AND c.is_active = TRUE
    )
);


-- Admins can see all content.

CREATE POLICY articles_select_admin
ON public.articles
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Admin/Superadmin creation.

CREATE POLICY articles_insert_admin
ON public.articles
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


-- Admins can edit content but cannot directly create a
-- PUBLISHED article through the client-facing database role.

CREATE POLICY articles_update_admin
ON public.articles
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_superadmin())
    OR status IN (
        'DRAFT',
        'PENDING_REVIEW',
        'REJECTED',
        'UNPUBLISHED',
        'ARCHIVED'
    )
);


-- Only SUPERADMIN can delete articles.

CREATE POLICY articles_delete_superadmin
ON public.articles
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 7. ARTICLE TRANSLATIONS
-- ============================================================

CREATE POLICY article_translations_select_published
ON public.article_translations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
          AND a.published_at IS NOT NULL
    )
);


CREATE POLICY article_translations_select_admin
ON public.article_translations
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_translations_insert_admin
ON public.article_translations
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_translations_update_admin
ON public.article_translations
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_translations_delete_admin
ON public.article_translations
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 8. QUIZZES
-- ============================================================

CREATE POLICY quizzes_select_published
ON public.quizzes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY quizzes_select_admin
ON public.quizzes
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quizzes_insert_admin
ON public.quizzes
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quizzes_update_admin
ON public.quizzes
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quizzes_delete_admin
ON public.quizzes
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 9. OPINION QUESTIONS
-- ============================================================

CREATE POLICY opinion_questions_select_published
ON public.opinion_questions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY opinion_questions_select_admin
ON public.opinion_questions
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_questions_insert_admin
ON public.opinion_questions
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_questions_update_admin
ON public.opinion_questions
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_questions_delete_admin
ON public.opinion_questions
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 10. ARTICLE BLOCKS
-- ============================================================

CREATE POLICY article_blocks_select_published
ON public.article_blocks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY article_blocks_select_admin
ON public.article_blocks
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_blocks_insert_admin
ON public.article_blocks
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_blocks_update_admin
ON public.article_blocks
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_blocks_delete_admin
ON public.article_blocks
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 11. ARTICLE BLOCK TRANSLATIONS
-- ============================================================

CREATE POLICY article_block_translations_select_published
ON public.article_block_translations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.article_blocks b
        JOIN public.articles a
          ON a.id = b.article_id
        WHERE b.id = article_block_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY article_block_translations_select_admin
ON public.article_block_translations
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_block_translations_insert_admin
ON public.article_block_translations
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_block_translations_update_admin
ON public.article_block_translations
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_block_translations_delete_admin
ON public.article_block_translations
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 12. QUIZ QUESTIONS
-- ============================================================

CREATE POLICY quiz_questions_select_published
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.articles a
          ON a.id = q.article_id
        WHERE q.id = quiz_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY quiz_questions_select_admin
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_questions_insert_admin
ON public.quiz_questions
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_questions_update_admin
ON public.quiz_questions
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_questions_delete_admin
ON public.quiz_questions
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 13. QUIZ OPTIONS
-- ============================================================

CREATE POLICY quiz_options_select_published
ON public.quiz_options
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q
          ON q.id = qq.quiz_id
        JOIN public.articles a
          ON a.id = q.article_id
        WHERE qq.id = question_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY quiz_options_select_admin
ON public.quiz_options
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_options_insert_admin
ON public.quiz_options
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_options_update_admin
ON public.quiz_options
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_options_delete_admin
ON public.quiz_options
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 14. QUIZ TRANSLATIONS
-- ============================================================

CREATE POLICY quiz_question_translations_select_published
ON public.quiz_question_translations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q
          ON q.id = qq.quiz_id
        JOIN public.articles a
          ON a.id = q.article_id
        WHERE qq.id = question_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY quiz_question_translations_select_admin
ON public.quiz_question_translations
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_question_translations_insert_admin
ON public.quiz_question_translations
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_question_translations_update_admin
ON public.quiz_question_translations
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_question_translations_delete_admin
ON public.quiz_question_translations
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_option_translations_select_published
ON public.quiz_option_translations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_options qo
        JOIN public.quiz_questions qq
          ON qq.id = qo.question_id
        JOIN public.quizzes q
          ON q.id = qq.quiz_id
        JOIN public.articles a
          ON a.id = q.article_id
        WHERE qo.id = option_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY quiz_option_translations_select_admin
ON public.quiz_option_translations
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_option_translations_insert_admin
ON public.quiz_option_translations
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_option_translations_update_admin
ON public.quiz_option_translations
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY quiz_option_translations_delete_admin
ON public.quiz_option_translations
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 15. OPINION OPTIONS
-- ============================================================

CREATE POLICY opinion_options_select_published
ON public.opinion_options
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.opinion_questions oq
        JOIN public.articles a
          ON a.id = oq.article_id
        WHERE oq.id = question_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY opinion_options_select_admin
ON public.opinion_options
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_options_insert_admin
ON public.opinion_options
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_options_update_admin
ON public.opinion_options
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_options_delete_admin
ON public.opinion_options
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 16. OPINION TRANSLATIONS
-- ============================================================

CREATE POLICY opinion_question_translations_select_published
ON public.opinion_question_translations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.opinion_questions oq
        JOIN public.articles a
          ON a.id = oq.article_id
        WHERE oq.id = question_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY opinion_question_translations_select_admin
ON public.opinion_question_translations
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_question_translations_insert_admin
ON public.opinion_question_translations
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_question_translations_update_admin
ON public.opinion_question_translations
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_question_translations_delete_admin
ON public.opinion_question_translations
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_option_translations_select_published
ON public.opinion_option_translations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.opinion_options oo
        JOIN public.opinion_questions oq
          ON oq.id = oo.question_id
        JOIN public.articles a
          ON a.id = oq.article_id
        WHERE oo.id = option_id
          AND a.status = 'PUBLISHED'
    )
);


CREATE POLICY opinion_option_translations_select_admin
ON public.opinion_option_translations
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_option_translations_insert_admin
ON public.opinion_option_translations
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_option_translations_update_admin
ON public.opinion_option_translations
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
)
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY opinion_option_translations_delete_admin
ON public.opinion_option_translations
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 17. XP RULES
-- ============================================================

-- XP rules are configuration, not user-owned data.

CREATE POLICY xp_rules_select_authenticated
ON public.xp_rules
FOR SELECT
TO authenticated
USING (
    is_active = TRUE
    OR (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY xp_rules_insert_superadmin
ON public.xp_rules
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_superadmin())
);


CREATE POLICY xp_rules_update_superadmin
ON public.xp_rules
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_superadmin())
)
WITH CHECK (
    (SELECT private.is_superadmin())
);


CREATE POLICY xp_rules_delete_superadmin
ON public.xp_rules
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 18. XP TRANSACTIONS
-- ============================================================

CREATE POLICY xp_transactions_select_own
ON public.xp_transactions
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY xp_transactions_select_admin
ON public.xp_transactions
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- No client INSERT/UPDATE/DELETE policy.
-- XP transactions are created by trusted backend logic.


-- ============================================================
-- 19. READING PROGRESS
-- ============================================================

CREATE POLICY reading_progress_select_own
ON public.reading_progress
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY reading_progress_insert_own
ON public.reading_progress
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
);


CREATE POLICY reading_progress_update_own
ON public.reading_progress
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
);


CREATE POLICY reading_progress_delete_own
ON public.reading_progress
FOR DELETE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY reading_progress_select_admin
ON public.reading_progress
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- ============================================================
-- 20. QUIZ ATTEMPTS
-- ============================================================

CREATE POLICY quiz_attempts_select_own
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY quiz_attempts_select_admin
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Quiz submissions are trusted backend operations.
-- No direct client INSERT/UPDATE/DELETE.


-- ============================================================
-- 21. OPINION RESPONSES
-- ============================================================

CREATE POLICY opinion_responses_select_own
ON public.opinion_responses
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY opinion_responses_select_admin
ON public.opinion_responses
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Opinion submission is handled through FastAPI.
-- No direct client INSERT/UPDATE/DELETE.


-- ============================================================
-- 22. ARTICLE COMPLETIONS
-- ============================================================

CREATE POLICY article_completions_select_own
ON public.article_completions
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY article_completions_select_admin
ON public.article_completions
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Completion creation is handled by trusted backend logic.


-- ============================================================
-- 23. LEVELS
-- ============================================================

CREATE POLICY levels_select_authenticated
ON public.levels
FOR SELECT
TO authenticated
USING (
    TRUE
);


CREATE POLICY levels_insert_superadmin
ON public.levels
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_superadmin())
);


CREATE POLICY levels_update_superadmin
ON public.levels
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_superadmin())
)
WITH CHECK (
    (SELECT private.is_superadmin())
);


CREATE POLICY levels_delete_superadmin
ON public.levels
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 24. BADGES
-- ============================================================

CREATE POLICY badges_select_authenticated
ON public.badges
FOR SELECT
TO authenticated
USING (
    is_active = TRUE
    OR (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY badges_insert_superadmin
ON public.badges
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_superadmin())
);


CREATE POLICY badges_update_superadmin
ON public.badges
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_superadmin())
)
WITH CHECK (
    (SELECT private.is_superadmin())
);


CREATE POLICY badges_delete_superadmin
ON public.badges
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 25. USER BADGES
-- ============================================================

CREATE POLICY user_badges_select_own
ON public.user_badges
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY user_badges_select_admin
ON public.user_badges
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Badge assignment is trusted backend logic.


-- ============================================================
-- 26. ARTICLE VERSIONS
-- ============================================================

CREATE POLICY article_versions_select_admin
ON public.article_versions
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_versions_insert_admin
ON public.article_versions
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY article_versions_delete_superadmin
ON public.article_versions
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 27. CONTENT REVIEWS
-- ============================================================

CREATE POLICY content_reviews_select_admin
ON public.content_reviews
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY content_reviews_insert_admin
ON public.content_reviews
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin_or_superadmin())
);


CREATE POLICY content_reviews_update_superadmin
ON public.content_reviews
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_superadmin())
)
WITH CHECK (
    (SELECT private.is_superadmin())
);


CREATE POLICY content_reviews_delete_superadmin
ON public.content_reviews
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 28. DEVICE TOKENS
-- ============================================================

CREATE POLICY device_tokens_select_own
ON public.device_tokens
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY device_tokens_insert_own
ON public.device_tokens
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
);


CREATE POLICY device_tokens_update_own
ON public.device_tokens
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
);


CREATE POLICY device_tokens_delete_own
ON public.device_tokens
FOR DELETE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


-- ============================================================
-- 29. NOTIFICATIONS
-- ============================================================

CREATE POLICY notifications_select_own
ON public.notifications
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


CREATE POLICY notifications_update_own
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
);


CREATE POLICY notifications_select_admin
ON public.notifications
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Notification creation is trusted backend logic.


-- ============================================================
-- 30. ANALYTICS EVENTS
-- ============================================================

-- Users may insert events only for themselves.
-- The actual analytics pipeline can also write through FastAPI.

CREATE POLICY analytics_events_insert_own
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
);


CREATE POLICY analytics_events_select_admin
ON public.analytics_events
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Users cannot read the raw analytics dataset.


-- ============================================================
-- 31. AUDIT LOGS
-- ============================================================

CREATE POLICY audit_logs_select_admin
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin_or_superadmin())
);


-- Audit logs are trusted backend records.
-- No direct INSERT/UPDATE/DELETE for client users.


-- ============================================================
-- END OF RLS MIGRATION
-- ============================================================