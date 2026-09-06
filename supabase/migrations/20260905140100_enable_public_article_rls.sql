-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public Read Access Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Published Articles'
    ) THEN
        CREATE POLICY "Public Read Published Articles"
        ON articles FOR SELECT
        TO anon, authenticated
        USING (status = 'PUBLISHED');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Article Blocks'
    ) THEN
        CREATE POLICY "Public Read Article Blocks"
        ON article_blocks FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Categories'
    ) THEN
        CREATE POLICY "Public Read Categories"
        ON categories FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;