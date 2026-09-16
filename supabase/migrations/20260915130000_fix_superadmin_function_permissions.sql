-- RLS policies call this SECURITY DEFINER helper for superadmin checks.
-- Authenticated requests still need EXECUTE permission to evaluate policies.
GRANT EXECUTE
ON FUNCTION private.is_superadmin()
TO authenticated;