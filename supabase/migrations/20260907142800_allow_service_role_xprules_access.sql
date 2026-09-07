-- Allow users with the superadmin role in JWT to insert XP rules
CREATE POLICY "Allow superadmins to insert xp_rules"
ON public.xp_rules
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin' 
  OR (auth.jwt() ->> 'role') = 'service_role'
);