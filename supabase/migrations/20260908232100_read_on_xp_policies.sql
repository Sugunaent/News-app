CREATE POLICY "Allow public read access to active xp_rules"
ON xp_rules
FOR SELECT
USING (is_active = true);

ALTER TABLE xp_transactions DISABLE ROW LEVEL SECURITY;
"""The above is so that our backend reads the xp policies and awards"""