-- RLS policies call SECURITY DEFINER helpers in the private schema.
-- Authenticated clients need schema visibility as well as function EXECUTE.
GRANT USAGE ON SCHEMA private TO authenticated;
