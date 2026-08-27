-- ============================================================
-- Cognition News
-- Author's Picks
-- ============================================================

ALTER TABLE public.articles
ADD COLUMN is_author_pick boolean NOT NULL DEFAULT false;

ALTER TABLE public.articles
ADD COLUMN author_pick_order integer;

ALTER TABLE public.articles
ADD CONSTRAINT articles_author_pick_order_nonnegative
CHECK (
    author_pick_order IS NULL
    OR author_pick_order >= 0
);

CREATE INDEX articles_author_picks_idx
ON public.articles (author_pick_order, published_at DESC)
WHERE is_author_pick = true
  AND status = 'PUBLISHED'::article_status;