-- ============================================================
-- Cognition News
-- Analytics Reporting
-- ============================================================
--
-- Purpose:
--   Provide the event fields and indexes required by the
--   Superadmin analytics layer.
--
-- Important:
--   analytics_events already exists in the initial schema.
--   This migration deliberately does NOT create a second
--   analytics/event table.
--
-- V1 analytics is intentionally simple:
--   - article views
--   - unique readers
--   - reading completion
--   - quiz attempts
--   - quiz success
--   - opinion participation
--   - comments
--   - shares
--   - category popularity
--   - user engagement
--   - advertisement clicks
--
-- No BI warehouse, campaigns, attribution platform,
-- advertising network, or complex analytics infrastructure.
-- ============================================================


-- ============================================================
-- 1. REQUIRED EVENT COLUMNS
-- ============================================================

ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS event_type TEXT;

ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS article_id UUID;

ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- ============================================================
-- 2. FOREIGN KEY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'analytics_events_article_fkey'
    ) THEN
        ALTER TABLE public.analytics_events
            ADD CONSTRAINT analytics_events_article_fkey
            FOREIGN KEY (article_id)
            REFERENCES public.articles(id)
            ON DELETE SET NULL;
    END IF;
END
$$;


-- ============================================================
-- 3. BASIC VALIDATION
-- ============================================================

ALTER TABLE public.analytics_events
    DROP CONSTRAINT IF EXISTS analytics_events_event_type_not_blank;

ALTER TABLE public.analytics_events
    ADD CONSTRAINT analytics_events_event_type_not_blank
    CHECK (
        event_type IS NULL
        OR length(trim(event_type)) > 0
    );


-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx
ON public.analytics_events (
    event_type,
    created_at
);


CREATE INDEX IF NOT EXISTS analytics_events_article_idx
ON public.analytics_events (
    article_id,
    event_type,
    created_at
);


CREATE INDEX IF NOT EXISTS analytics_events_user_idx
ON public.analytics_events (
    user_id,
    event_type,
    created_at
);


CREATE INDEX IF NOT EXISTS analytics_events_source_idx
ON public.analytics_events (
    source_type,
    source_id,
    created_at
);


-- ============================================================
-- END OF ANALYTICS MIGRATION
-- ============================================================