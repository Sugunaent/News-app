-- 1. Ensure comments default flags are NON-NULL booleans defaulting to false
ALTER TABLE public.comments 
  ALTER COLUMN is_hidden SET DEFAULT false,
  ALTER COLUMN is_deleted SET DEFAULT false;

-- 2. Backfill any existing NULL values in comments
UPDATE public.comments 
SET is_hidden = false WHERE is_hidden IS NULL;

UPDATE public.comments 
SET is_deleted = false WHERE is_deleted IS NULL;

-- 3. Ensure profiles are publicly readable so left joins don't fail under RLS
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
ON public.profiles
FOR SELECT
TO public
USING (true);