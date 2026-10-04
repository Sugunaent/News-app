BEGIN;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS title_te TEXT,
  ADD COLUMN IF NOT EXISTS content_te TEXT,
  ADD COLUMN IF NOT EXISTS title_hi TEXT,
  ADD COLUMN IF NOT EXISTS content_hi TEXT,
  ADD COLUMN IF NOT EXISTS is_manual_translation BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';

COMMIT;
