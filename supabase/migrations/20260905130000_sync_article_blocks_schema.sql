BEGIN;

ALTER TABLE public.article_blocks
  ADD COLUMN IF NOT EXISTS text_content TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT;

NOTIFY pgrst, 'reload schema';

COMMIT;