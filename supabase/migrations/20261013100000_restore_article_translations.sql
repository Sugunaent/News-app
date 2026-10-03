CREATE TABLE IF NOT EXISTS public.article_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL CHECK (language_code IN ('te', 'hi')),
    title TEXT NOT NULL,
    subtitle TEXT,
    summary TEXT,
    segments JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT article_translations_article_language_unique
        UNIQUE (article_id, language_code)
);

CREATE INDEX IF NOT EXISTS article_translations_language_idx
    ON public.article_translations (language_code);

ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.article_translations
    TO service_role;
