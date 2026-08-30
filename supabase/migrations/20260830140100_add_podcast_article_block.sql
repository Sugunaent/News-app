-- ============================================================
-- News App
-- Add PODCAST article block support
-- ============================================================

-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- 2. Add external URL to article blocks
-- ------------------------------------------------------------

ALTER TABLE public.article_blocks
ADD COLUMN IF NOT EXISTS external_url TEXT;


-- ------------------------------------------------------------
-- 3. Replace article block integrity constraint
-- ------------------------------------------------------------

ALTER TABLE public.article_blocks
DROP CONSTRAINT IF EXISTS article_blocks_type_integrity;


ALTER TABLE public.article_blocks
ADD CONSTRAINT article_blocks_type_integrity
CHECK (
    (
        block_type = 'TEXT'
        AND media_id IS NULL
        AND quiz_id IS NULL
        AND opinion_id IS NULL
        AND external_url IS NULL
    )
    OR
    (
        block_type = 'IMAGE'
        AND media_id IS NOT NULL
        AND quiz_id IS NULL
        AND opinion_id IS NULL
        AND external_url IS NULL
    )
    OR
    (
        block_type = 'QUIZ'
        AND media_id IS NULL
        AND quiz_id IS NOT NULL
        AND opinion_id IS NULL
        AND external_url IS NULL
    )
    OR
    (
        block_type = 'OPINION'
        AND media_id IS NULL
        AND quiz_id IS NULL
        AND opinion_id IS NOT NULL
        AND external_url IS NULL
    )
    OR
    (
        block_type = 'PODCAST'
        AND media_id IS NULL
        AND quiz_id IS NULL
        AND opinion_id IS NULL
        AND external_url IS NOT NULL
        AND length(trim(external_url)) > 0
    )
);