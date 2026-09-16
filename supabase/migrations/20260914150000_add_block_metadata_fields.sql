-- Persist CMS fields that were previously UI-only.
ALTER TABLE public.article_blocks
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.quiz_options
  ADD COLUMN IF NOT EXISTS explanation TEXT;

UPDATE public.article_blocks
SET title = 'Podcast'
WHERE block_type = 'PODCAST'
    AND (title IS NULL OR length(trim(title)) = 0);

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
        AND quiz_id IS NULL
        AND opinion_id IS NULL
        AND text_content IS NULL
        AND (
            (media_id IS NOT NULL AND external_url IS NULL)
            OR (media_id IS NULL AND external_url IS NOT NULL AND length(trim(external_url)) > 0)
        )
    )
    OR
    (
        block_type = 'QUIZ'
        AND media_id IS NULL
        AND quiz_id IS NOT NULL
        AND opinion_id IS NULL
        AND external_url IS NULL
        AND text_content IS NULL
    )
    OR
    (
        block_type = 'OPINION'
        AND media_id IS NULL
        AND quiz_id IS NULL
        AND opinion_id IS NOT NULL
        AND external_url IS NULL
        AND text_content IS NULL
    )
    OR
    (
        block_type = 'PODCAST'
        AND quiz_id IS NULL
        AND opinion_id IS NULL
        AND (media_id IS NOT NULL OR external_url IS NOT NULL)
        AND (media_id IS NOT NULL OR length(trim(external_url)) > 0)
        AND title IS NOT NULL
        AND length(trim(title)) > 0
        AND text_content IS NOT NULL
        AND length(trim(text_content)) > 0
    )
);

NOTIFY pgrst, 'reload schema';
