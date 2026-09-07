-- 1. Enable RLS on the table
ALTER TABLE public.article_completions ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to read only their own completions
CREATE POLICY "Users can read own article completions"
ON public.article_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Drop any direct write policies for authenticated users
DROP POLICY IF EXISTS "Users can insert article completions" ON public.article_completions;