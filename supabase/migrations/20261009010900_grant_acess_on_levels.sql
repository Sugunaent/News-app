-- Grant explicit table privileges to authenticated users and service role
GRANT ALL ON TABLE public.levels TO authenticated;
GRANT ALL ON TABLE public.levels TO service_role;
GRANT ALL ON TABLE public.levels TO postgres;

-- Ensure RLS policy permits read access for authenticated users
DROP POLICY IF EXISTS "Allow authenticated read access to levels" ON public.levels;
DROP POLICY IF EXISTS "Allow read access to levels" ON public.levels;

CREATE POLICY "Allow read access to levels for authenticated users"
ON public.levels
FOR SELECT
TO authenticated
USING (true);