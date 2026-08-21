-- ============================================================
-- News App
-- Initial Database Schema
-- ============================================================
--
-- Migration:
-- 20260821150918_initial_schema
--
-- Purpose:
-- Establish database primitives used by the News App.
--
-- IMPORTANT:
-- This migration is intentionally built in sections.
-- Do not apply it until the complete migration has been reviewed.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

-- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. ENUM TYPES
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'user_role'
    ) THEN
        CREATE TYPE public.user_role AS ENUM (
            'USER',
            'ADMIN',
            'SUPERADMIN'
        );
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'article_type'
    ) THEN
        CREATE TYPE public.article_type AS ENUM (
            'STANDARD',
            'QUIZ',
            'OPINION'
        );
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'article_status'
    ) THEN
        CREATE TYPE public.article_status AS ENUM (
            'DRAFT',
            'PENDING_REVIEW',
            'REJECTED',
            'PUBLISHED',
            'UNPUBLISHED',
            'SCHEDULED',
            'ARCHIVED'
        );
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'article_block_type'
    ) THEN
        CREATE TYPE public.article_block_type AS ENUM (
            'TEXT',
            'IMAGE',
            'QUIZ',
            'OPINION'
        );
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'language_code'
    ) THEN
        CREATE TYPE public.language_code AS ENUM (
            'en',
            'hi',
            'te'
        );
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'xp_event_type'
    ) THEN
        CREATE TYPE public.xp_event_type AS ENUM (
            'QUIZ_CORRECT',
            'OPINION_SUBMITTED',
            'ARTICLE_COMPLETED'
        );
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'review_status'
    ) THEN
        CREATE TYPE public.review_status AS ENUM (
            'PENDING',
            'APPROVED',
            'REJECTED'
        );
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'media_type'
    ) THEN
        CREATE TYPE public.media_type AS ENUM (
            'IMAGE'
        );
    END IF;

END
$$;


-- ============================================================
-- 3. COMMON updated_at FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ============================================================
-- 4. PROFILES
-- ============================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    display_name TEXT,

    email TEXT,

    avatar_media_id UUID,

    role public.user_role NOT NULL DEFAULT 'USER',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. CATEGORIES
-- ============================================================

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    slug TEXT NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INTEGER NOT NULL DEFAULT 0,

    created_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_name_not_blank
        CHECK (length(trim(name)) > 0),

    CONSTRAINT categories_slug_not_blank
        CHECK (length(trim(slug)) > 0),

    CONSTRAINT categories_display_order_nonnegative
        CHECK (display_order >= 0),

    CONSTRAINT categories_slug_unique
        UNIQUE (slug),

    CONSTRAINT categories_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 6. MEDIA ASSETS
-- ============================================================

CREATE TABLE public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    storage_path TEXT NOT NULL,

    media_type public.media_type NOT NULL,

    mime_type TEXT NOT NULL,

    file_size BIGINT,

    uploaded_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT media_assets_storage_path_unique
        UNIQUE (storage_path),

    CONSTRAINT media_assets_file_size_nonnegative
        CHECK (
            file_size IS NULL
            OR file_size >= 0
        ),

    CONSTRAINT media_assets_uploaded_by_fkey
        FOREIGN KEY (uploaded_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 7. PROFILE AVATAR FOREIGN KEY
-- ============================================================
--
-- Added after media_assets exists.
--

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_avatar_media_id_fkey
FOREIGN KEY (avatar_media_id)
REFERENCES public.media_assets(id)
ON DELETE SET NULL;


-- ============================================================
-- 8. ARTICLES
-- ============================================================

CREATE TABLE public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL,

    article_type public.article_type NOT NULL DEFAULT 'STANDARD',

    status public.article_status NOT NULL DEFAULT 'DRAFT',

    cover_media_id UUID,

    created_by UUID,

    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    published_at TIMESTAMPTZ,

    scheduled_at TIMESTAMPTZ,

    CONSTRAINT articles_category_fkey
        FOREIGN KEY (category_id)
        REFERENCES public.categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT articles_cover_media_fkey
        FOREIGN KEY (cover_media_id)
        REFERENCES public.media_assets(id)
        ON DELETE SET NULL,

    CONSTRAINT articles_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT articles_updated_by_fkey
        FOREIGN KEY (updated_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT articles_scheduled_requires_timestamp
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        )
);


-- ============================================================
-- 9. ARTICLE TRANSLATIONS
-- ============================================================

CREATE TABLE public.article_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL,

    language_code public.language_code NOT NULL,

    title TEXT NOT NULL,

    subtitle TEXT,

    summary TEXT,

    slug TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT article_translations_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT article_translations_unique_language
        UNIQUE (article_id, language_code),

    CONSTRAINT article_translations_slug_unique
        UNIQUE (slug),

    CONSTRAINT article_translations_title_not_blank
        CHECK (length(trim(title)) > 0),

    CONSTRAINT article_translations_slug_not_blank
        CHECK (length(trim(slug)) > 0)
);


-- ============================================================
-- 10. QUIZZES
-- ============================================================

CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL,

    xp_rule_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quizzes_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT quizzes_id_article_unique
        UNIQUE (id, article_id)
);


-- ============================================================
-- 11. OPINION QUESTIONS
-- ============================================================

CREATE TABLE public.opinion_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL,

    display_order INTEGER NOT NULL,

    allow_custom_response BOOLEAN NOT NULL DEFAULT TRUE,

    xp_rule_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT opinion_questions_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT opinion_questions_id_article_unique
        UNIQUE (id, article_id),

    CONSTRAINT opinion_questions_display_order_nonnegative
        CHECK (display_order >= 0),

    CONSTRAINT opinion_questions_unique_order
        UNIQUE (article_id, display_order)
);


-- ============================================================
-- 12. ARTICLE BLOCKS
-- ============================================================

CREATE TABLE public.article_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL,

    block_type public.article_block_type NOT NULL,

    display_order INTEGER NOT NULL,

    media_id UUID,

    quiz_id UUID,

    opinion_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT article_blocks_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT article_blocks_media_fkey
        FOREIGN KEY (media_id)
        REFERENCES public.media_assets(id)
        ON DELETE RESTRICT,

    CONSTRAINT article_blocks_quiz_article_fkey
        FOREIGN KEY (quiz_id, article_id)
        REFERENCES public.quizzes(id, article_id)
        ON DELETE CASCADE,

    CONSTRAINT article_blocks_opinion_article_fkey
        FOREIGN KEY (opinion_id, article_id)
        REFERENCES public.opinion_questions(id, article_id)
        ON DELETE CASCADE,

    CONSTRAINT article_blocks_unique_order
        UNIQUE (article_id, display_order),

    CONSTRAINT article_blocks_display_order_nonnegative
        CHECK (display_order >= 0),

    CONSTRAINT article_blocks_type_integrity
        CHECK (
            (
                block_type = 'TEXT'
                AND media_id IS NULL
                AND quiz_id IS NULL
                AND opinion_id IS NULL
            )
            OR
            (
                block_type = 'IMAGE'
                AND media_id IS NOT NULL
                AND quiz_id IS NULL
                AND opinion_id IS NULL
            )
            OR
            (
                block_type = 'QUIZ'
                AND media_id IS NULL
                AND quiz_id IS NOT NULL
                AND opinion_id IS NULL
            )
            OR
            (
                block_type = 'OPINION'
                AND media_id IS NULL
                AND quiz_id IS NULL
                AND opinion_id IS NOT NULL
            )
        )
);


-- ============================================================
-- 13. ARTICLE BLOCK TRANSLATIONS
-- ============================================================

CREATE TABLE public.article_block_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_block_id UUID NOT NULL,

    language_code public.language_code NOT NULL,

    text_content TEXT,

    caption TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT article_block_translations_block_fkey
        FOREIGN KEY (article_block_id)
        REFERENCES public.article_blocks(id)
        ON DELETE CASCADE,

    CONSTRAINT article_block_translations_unique_language
        UNIQUE (article_block_id, language_code)
);


-- ============================================================
-- 14. QUIZ QUESTIONS
-- ============================================================

CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    quiz_id UUID NOT NULL,

    display_order INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quiz_questions_quiz_fkey
        FOREIGN KEY (quiz_id)
        REFERENCES public.quizzes(id)
        ON DELETE CASCADE,

    CONSTRAINT quiz_questions_unique_order
        UNIQUE (quiz_id, display_order),

    CONSTRAINT quiz_questions_display_order_nonnegative
        CHECK (display_order >= 0)
);


-- ============================================================
-- 15. QUIZ OPTIONS
-- ============================================================

CREATE TABLE public.quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL,

    display_order INTEGER NOT NULL,

    is_correct BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quiz_options_question_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.quiz_questions(id)
        ON DELETE CASCADE,

    CONSTRAINT quiz_options_unique_order
        UNIQUE (question_id, display_order),

    CONSTRAINT quiz_options_display_order_nonnegative
        CHECK (display_order >= 0)
);


-- ============================================================
-- 16. QUIZ QUESTION TRANSLATIONS
-- ============================================================

CREATE TABLE public.quiz_question_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL,

    language_code public.language_code NOT NULL,

    question_text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quiz_question_translations_question_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.quiz_questions(id)
        ON DELETE CASCADE,

    CONSTRAINT quiz_question_translations_unique_language
        UNIQUE (question_id, language_code),

    CONSTRAINT quiz_question_translations_not_blank
        CHECK (length(trim(question_text)) > 0)
);


-- ============================================================
-- 17. QUIZ OPTION TRANSLATIONS
-- ============================================================

CREATE TABLE public.quiz_option_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    option_id UUID NOT NULL,

    language_code public.language_code NOT NULL,

    option_text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quiz_option_translations_option_fkey
        FOREIGN KEY (option_id)
        REFERENCES public.quiz_options(id)
        ON DELETE CASCADE,

    CONSTRAINT quiz_option_translations_unique_language
        UNIQUE (option_id, language_code),

    CONSTRAINT quiz_option_translations_not_blank
        CHECK (length(trim(option_text)) > 0)
);


-- ============================================================
-- 18. OPINION OPTIONS
-- ============================================================

CREATE TABLE public.opinion_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL,

    display_order INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT opinion_options_question_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.opinion_questions(id)
        ON DELETE CASCADE,

    CONSTRAINT opinion_options_unique_order
        UNIQUE (question_id, display_order),

    CONSTRAINT opinion_options_display_order_nonnegative
        CHECK (display_order >= 0)
);


-- ============================================================
-- 19. OPINION QUESTION TRANSLATIONS
-- ============================================================

CREATE TABLE public.opinion_question_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL,

    language_code public.language_code NOT NULL,

    question_text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT opinion_question_translations_question_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.opinion_questions(id)
        ON DELETE CASCADE,

    CONSTRAINT opinion_question_translations_unique_language
        UNIQUE (question_id, language_code),

    CONSTRAINT opinion_question_translations_not_blank
        CHECK (length(trim(question_text)) > 0)
);


-- ============================================================
-- 20. OPINION OPTION TRANSLATIONS
-- ============================================================

CREATE TABLE public.opinion_option_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    option_id UUID NOT NULL,

    language_code public.language_code NOT NULL,

    option_text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT opinion_option_translations_option_fkey
        FOREIGN KEY (option_id)
        REFERENCES public.opinion_options(id)
        ON DELETE CASCADE,

    CONSTRAINT opinion_option_translations_unique_language
        UNIQUE (option_id, language_code),

    CONSTRAINT opinion_option_translations_not_blank
        CHECK (length(trim(option_text)) > 0)
);


-- ============================================================
-- 21. XP RULES
-- ============================================================

CREATE TABLE public.xp_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type public.xp_event_type NOT NULL,

    amount INTEGER NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT xp_rules_amount_nonnegative
        CHECK (amount >= 0)
);


-- ============================================================
-- 22. XP TRANSACTIONS
-- ============================================================

CREATE TABLE public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    xp_rule_id UUID,

    article_id UUID,

    source_type TEXT NOT NULL,

    source_id UUID NOT NULL,

    amount INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT xp_transactions_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT xp_transactions_rule_fkey
        FOREIGN KEY (xp_rule_id)
        REFERENCES public.xp_rules(id)
        ON DELETE SET NULL,

    CONSTRAINT xp_transactions_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE SET NULL,

    CONSTRAINT xp_transactions_amount_nonnegative
        CHECK (amount >= 0),

    CONSTRAINT xp_transactions_source_unique
        UNIQUE (user_id, source_type, source_id)
);


-- ============================================================
-- 23. USER ACTIVITY — READING PROGRESS
-- ============================================================

CREATE TABLE public.reading_progress (
    user_id UUID NOT NULL,

    article_id UUID NOT NULL,

    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    last_block_id UUID,

    last_position NUMERIC,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    PRIMARY KEY (user_id, article_id),

    CONSTRAINT reading_progress_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT reading_progress_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT reading_progress_percentage_valid
        CHECK (
            progress_percentage >= 0
            AND progress_percentage <= 100
        ),

    CONSTRAINT reading_progress_last_block_fkey
        FOREIGN KEY (last_block_id)
        REFERENCES public.article_blocks(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 24. QUIZ ATTEMPTS
-- ============================================================

CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    question_id UUID NOT NULL,

    selected_option_id UUID NOT NULL,

    is_correct BOOLEAN NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quiz_attempts_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT quiz_attempts_question_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.quiz_questions(id)
        ON DELETE CASCADE,

    CONSTRAINT quiz_attempts_option_fkey
        FOREIGN KEY (selected_option_id)
        REFERENCES public.quiz_options(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 25. OPINION RESPONSES
-- ============================================================

CREATE TABLE public.opinion_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    opinion_question_id UUID NOT NULL,

    selected_option_id UUID,

    custom_response VARCHAR(200),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT opinion_responses_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT opinion_responses_question_fkey
        FOREIGN KEY (opinion_question_id)
        REFERENCES public.opinion_questions(id)
        ON DELETE CASCADE,

    CONSTRAINT opinion_responses_option_fkey
        FOREIGN KEY (selected_option_id)
        REFERENCES public.opinion_options(id)
        ON DELETE CASCADE,

    CONSTRAINT opinion_responses_unique_user_question
        UNIQUE (user_id, opinion_question_id),

    CONSTRAINT opinion_responses_exactly_one_response
        CHECK (
            (
                selected_option_id IS NOT NULL
                AND custom_response IS NULL
            )
            OR
            (
                selected_option_id IS NULL
                AND custom_response IS NOT NULL
            )
        ),

    CONSTRAINT opinion_responses_custom_length
        CHECK (
            custom_response IS NULL
            OR length(custom_response) <= 200
        )
);


-- ============================================================
-- 26. ARTICLE COMPLETIONS
-- ============================================================

CREATE TABLE public.article_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    article_id UUID NOT NULL,

    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT article_completions_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT article_completions_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT article_completions_unique_user_article
        UNIQUE (user_id, article_id)
);


-- ============================================================
-- 27. LEVELS
-- ============================================================

CREATE TABLE public.levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    minimum_xp INTEGER NOT NULL,

    display_order INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT levels_minimum_xp_nonnegative
        CHECK (minimum_xp >= 0),

    CONSTRAINT levels_display_order_nonnegative
        CHECK (display_order >= 0),

    CONSTRAINT levels_minimum_xp_unique
        UNIQUE (minimum_xp),

    CONSTRAINT levels_display_order_unique
        UNIQUE (display_order)
);


-- ============================================================
-- 28. BADGES
-- ============================================================

CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    description TEXT NOT NULL,

    image_asset_id UUID,

    rule_type TEXT NOT NULL,

    rule_config JSONB NOT NULL DEFAULT '{}',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT badges_image_fkey
        FOREIGN KEY (image_asset_id)
        REFERENCES public.media_assets(id)
        ON DELETE SET NULL,

    CONSTRAINT badges_rule_config_object
        CHECK (jsonb_typeof(rule_config) = 'object')
);


-- ============================================================
-- 29. USER BADGES
-- ============================================================

CREATE TABLE public.user_badges (
    user_id UUID NOT NULL,

    badge_id UUID NOT NULL,

    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, badge_id),

    CONSTRAINT user_badges_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT user_badges_badge_fkey
        FOREIGN KEY (badge_id)
        REFERENCES public.badges(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 30. ARTICLE VERSIONS
-- ============================================================

CREATE TABLE public.article_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL,

    version_number INTEGER NOT NULL,

    snapshot JSONB NOT NULL,

    created_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT article_versions_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT article_versions_creator_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT article_versions_unique_number
        UNIQUE (article_id, version_number),

    CONSTRAINT article_versions_positive_number
        CHECK (version_number > 0),

    CONSTRAINT article_versions_snapshot_object
        CHECK (jsonb_typeof(snapshot) = 'object')
);


-- ============================================================
-- 31. CONTENT REVIEWS
-- ============================================================

CREATE TABLE public.content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL,

    reviewer_id UUID NOT NULL,

    status public.review_status NOT NULL,

    comment TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT content_reviews_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT content_reviews_reviewer_fkey
        FOREIGN KEY (reviewer_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 32. DEVICE TOKENS
-- ============================================================

CREATE TABLE public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    platform TEXT NOT NULL,

    token TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT device_tokens_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT device_tokens_token_unique
        UNIQUE (token)
);


-- ============================================================
-- 33. NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    article_id UUID,

    title TEXT NOT NULL,

    body TEXT NOT NULL,

    notification_type TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT notifications_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 34. ANALYTICS EVENTS
-- ============================================================

CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID,

    event_type TEXT NOT NULL,

    article_id UUID,

    category_id UUID,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT analytics_events_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT analytics_events_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE SET NULL,

    CONSTRAINT analytics_events_category_fkey
        FOREIGN KEY (category_id)
        REFERENCES public.categories(id)
        ON DELETE SET NULL,

    CONSTRAINT analytics_events_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);


-- ============================================================
-- 35. AUDIT LOGS
-- ============================================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_user_id UUID,

    action TEXT NOT NULL,

    entity_type TEXT NOT NULL,

    entity_id UUID,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT audit_logs_actor_fkey
        FOREIGN KEY (actor_user_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT audit_logs_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);


-- ============================================================
-- 36. updated_at TRIGGERS
-- ============================================================

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER media_assets_set_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER articles_set_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER article_translations_set_updated_at
BEFORE UPDATE ON public.article_translations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER quizzes_set_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER opinion_questions_set_updated_at
BEFORE UPDATE ON public.opinion_questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER article_blocks_set_updated_at
BEFORE UPDATE ON public.article_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER article_block_translations_set_updated_at
BEFORE UPDATE ON public.article_block_translations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER quiz_questions_set_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER quiz_question_translations_set_updated_at
BEFORE UPDATE ON public.quiz_question_translations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER quiz_option_translations_set_updated_at
BEFORE UPDATE ON public.quiz_option_translations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER xp_rules_set_updated_at
BEFORE UPDATE ON public.xp_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER badges_set_updated_at
BEFORE UPDATE ON public.badges
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- END OF INITIAL SCHEMA
-- ============================================================