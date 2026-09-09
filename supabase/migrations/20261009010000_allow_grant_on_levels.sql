-- 1. Ensure RLS is enabled
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- 2. Explicitly grant SELECT table privilege to authenticated users
GRANT SELECT ON public.levels TO authenticated;

-- 3. Clean up any existing policies
DROP POLICY IF EXISTS "Allow read access to levels for authenticated users" ON public.levels;
DROP POLICY IF EXISTS "Allow read access to levels for anon users" ON public.levels;
DROP POLICY IF EXISTS "Allow public read access to levels" ON public.levels;

-- 4. Create policy strictly for authenticated users and superadmins
CREATE POLICY "Allow authenticated read access to levels"
ON public.levels
FOR SELECT
TO authenticated
USING (true);