-- ============================================================================
-- Migration: Fix media storage policy, opinion options schema, and comment soft deletes
-- File: 20260905172200_fix_opinion_comment_media_rls_table.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Storage RLS Policy for Article Media Bucket
-- ----------------------------------------------------------------------------

-- Drop policy if it already exists to ensure idempotent execution
DROP POLICY IF EXISTS "Allow superadmin uploads to article-media" ON storage.objects;

CREATE POLICY "Allow superadmin uploads to article-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'article-media' 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND UPPER(profiles.role::text) = 'SUPERADMIN' -- Cast enum to text here
  )
);


-- ----------------------------------------------------------------------------
-- 2. Fix opinion_options: Add updated_at column & auto-update trigger
-- ----------------------------------------------------------------------------

ALTER TABLE public.opinion_options 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create update trigger function if not already present
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to opinion_options table
DROP TRIGGER IF EXISTS trg_opinion_options_updated_at ON public.opinion_options;

CREATE TRIGGER trg_opinion_options_updated_at
BEFORE UPDATE ON public.opinion_options
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();


-- ----------------------------------------------------------------------------
-- 3. Fix comments: Add soft-delete support
-- ----------------------------------------------------------------------------

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for optimized comment listing queries (excluding soft-deleted rows)
CREATE INDEX IF NOT EXISTS idx_comments_article_not_deleted 
ON public.comments (article_id, is_deleted) 
WHERE is_deleted = FALSE;

COMMIT;