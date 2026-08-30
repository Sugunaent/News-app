-- ============================================================
-- Cognition News
-- Comments
-- ============================================================
--
-- Users can:
--   - create comments on published articles
--   - edit their own comments
--   - delete their own comments
--
-- Superadmin can:
--   - hide comments
--   - delete comments
--
-- Public reads only return comments that are:
--   - not hidden
--   - not deleted
--
-- Deleted comments are soft-deleted.
-- ============================================================

CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL,

    user_id UUID NOT NULL,

    content TEXT NOT NULL,

    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ,

    CONSTRAINT comments_article_fkey
        FOREIGN KEY (article_id)
        REFERENCES public.articles(id)
        ON DELETE CASCADE,

    CONSTRAINT comments_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT comments_content_not_empty
        CHECK (length(btrim(content)) > 0),

    CONSTRAINT comments_content_max_length
        CHECK (length(content) <= 2000)
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX comments_article_public_idx
ON public.comments (article_id, created_at DESC)
WHERE is_hidden = FALSE
  AND deleted_at IS NULL;


CREATE INDEX comments_user_idx
ON public.comments (user_id);


CREATE INDEX comments_article_idx
ON public.comments (article_id);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


CREATE TRIGGER comments_set_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_comments_updated_at();


-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- END
-- ============================================================