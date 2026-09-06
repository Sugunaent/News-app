BEGIN;

-- Add text content fields
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Ensure unique constraint on slug
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'articles_slug_key'
    ) THEN
        ALTER TABLE public.articles ADD CONSTRAINT articles_slug_key UNIQUE (slug);
    END IF;
END $$;

-- Create index on slug
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;