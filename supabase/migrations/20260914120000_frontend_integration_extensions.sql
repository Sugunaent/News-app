-- Frontend integration extensions.
-- Extends the production schema (does not clone the TMZ_Frontend supabase schema).

BEGIN;

-- ============================================================
-- ARTICLE / CATEGORY / PROFILE DISPLAY FIELDS
-- ============================================================

ALTER TABLE public.articles
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS author_name TEXT;

ALTER TABLE public.articles
    DROP CONSTRAINT IF EXISTS articles_reading_time_nonnegative;

ALTER TABLE public.articles
    ADD CONSTRAINT articles_reading_time_nonnegative
    CHECK (reading_time_minutes IS NULL OR reading_time_minutes >= 0);

CREATE INDEX IF NOT EXISTS articles_featured_published_idx
    ON public.articles (published_at DESC)
    WHERE is_featured = TRUE AND status = 'PUBLISHED'::article_status;

ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS bio TEXT;

-- ============================================================
-- BOOKMARKS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.article_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT article_bookmarks_user_article_unique UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS article_bookmarks_user_idx
    ON public.article_bookmarks (user_id, created_at DESC);

ALTER TABLE public.article_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS article_bookmarks_select_own ON public.article_bookmarks;
CREATE POLICY article_bookmarks_select_own
    ON public.article_bookmarks FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS article_bookmarks_insert_own ON public.article_bookmarks;
CREATE POLICY article_bookmarks_insert_own
    ON public.article_bookmarks FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS article_bookmarks_delete_own ON public.article_bookmarks;
CREATE POLICY article_bookmarks_delete_own
    ON public.article_bookmarks FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS article_bookmarks_admin ON public.article_bookmarks;
CREATE POLICY article_bookmarks_admin
    ON public.article_bookmarks FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    );

-- ============================================================
-- SITE SETTINGS (hero banner)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS site_settings_set_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_set_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_select_public ON public.site_settings;
CREATE POLICY site_settings_select_public
    ON public.site_settings FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS site_settings_write_superadmin ON public.site_settings;
CREATE POLICY site_settings_write_superadmin
    ON public.site_settings FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    );

INSERT INTO public.site_settings (key, value)
VALUES (
    'hero_banner',
    '{
        "imageUrl": "/modern_stories_hero.jpg",
        "title": "Human stories & modern ideas",
        "subtitle": "A sanctuary to read, write, and deepen your understanding across technology, science, culture, and human ingenuity.",
        "badgeText": "The Modern Stories • Curated Editorial",
        "linkText": "Know more",
        "linkUrl": "/about"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT team_members_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT team_members_display_order_nonnegative CHECK (display_order >= 0)
);

DROP TRIGGER IF EXISTS team_members_set_updated_at ON public.team_members;
CREATE TRIGGER team_members_set_updated_at
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_members_select_public ON public.team_members;
CREATE POLICY team_members_select_public
    ON public.team_members FOR SELECT TO anon, authenticated
    USING (is_active = TRUE);

DROP POLICY IF EXISTS team_members_admin ON public.team_members;
CREATE POLICY team_members_admin
    ON public.team_members FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    );

-- ============================================================
-- FEEDBACK
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feedback_content_not_blank CHECK (length(trim(content)) > 0),
    CONSTRAINT feedback_content_length CHECK (char_length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS feedback_created_idx ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_insert_public ON public.feedback;
CREATE POLICY feedback_insert_public
    ON public.feedback FOR INSERT TO anon, authenticated
    WITH CHECK (length(trim(content)) > 0);

DROP POLICY IF EXISTS feedback_select_superadmin ON public.feedback;
CREATE POLICY feedback_select_superadmin
    ON public.feedback FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    );

DROP POLICY IF EXISTS feedback_update_superadmin ON public.feedback;
CREATE POLICY feedback_update_superadmin
    ON public.feedback FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    );

-- ============================================================
-- BUSINESS ENQUIRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    purpose TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT business_enquiries_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT business_enquiries_email_not_blank CHECK (length(trim(email)) > 0)
);

CREATE INDEX IF NOT EXISTS business_enquiries_created_idx
    ON public.business_enquiries (created_at DESC);

ALTER TABLE public.business_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_enquiries_insert_public ON public.business_enquiries;
CREATE POLICY business_enquiries_insert_public
    ON public.business_enquiries FOR INSERT TO anon, authenticated
    WITH CHECK (length(trim(name)) > 0 AND length(trim(email)) > 0);

DROP POLICY IF EXISTS business_enquiries_select_superadmin ON public.business_enquiries;
CREATE POLICY business_enquiries_select_superadmin
    ON public.business_enquiries FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    );

DROP POLICY IF EXISTS business_enquiries_update_superadmin ON public.business_enquiries;
CREATE POLICY business_enquiries_update_superadmin
    ON public.business_enquiries FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'SUPERADMIN'
        )
    );

INSERT INTO public.team_members (name, role, bio, image_url, social_links, display_order)
SELECT * FROM (VALUES
    (
        'Tolety Mohana Shyam',
        'Founder',
        'At The Modern Stories, we look past the obvious to bring you the conversations that truly matter. Step beyond the bias, think critically, and see the world from a different lens.',
        'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
        '[{"label":"Twitter","url":"#"}]'::jsonb,
        0
    ),
    (
        'Chinta Suguna Vanditha',
        'Content Writer',
        'The Modern Stories explores the overlooked narratives of our world with honesty and nuance. Rather than telling you what to think, it invites you to look closer and see every story differently.',
        'https://images.pexels.com/photos/3796217/pexels-photo-3796217.jpeg?auto=compress&cs=tinysrgb&w=400',
        '[{"label":"LinkedIn","url":"#"}]'::jsonb,
        1
    ),
    (
        'Sree Keerthana Gorty',
        'Sr. Business Analyst',
        'A go to platform for modern ideas in modern platform having modern people!',
        'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=400',
        '[{"label":"Twitter","url":"#"}]'::jsonb,
        2
    ),
    (
        'Indira Pagadala',
        'AI-ML Engineer',
        'Built with thoughtful journalism in mind, The Modern Stories is the perfect way to stay updated in today''s world',
        'https://images.pexels.com/photos/5386785/pexels-photo-5386785.jpeg?auto=compress&cs=tinysrgb&w=400',
        '[{"label":"LinkedIn","url":"#"}]'::jsonb,
        3
    )
) AS seed(name, role, bio, image_url, social_links, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.team_members LIMIT 1);

NOTIFY pgrst, 'reload schema';

COMMIT;
