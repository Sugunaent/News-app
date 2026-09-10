-- Production security, public article media, media types, Google/email
-- profiles, and removal of the unused translation schema.
-- Timestamp is after already-applied 20261009* migrations.

ALTER TYPE public.media_type ADD VALUE IF NOT EXISTS 'VIDEO';
ALTER TYPE public.media_type ADD VALUE IF NOT EXISTS 'AUDIO';

BEGIN;


-- ============================================================
-- 1. Backfill unified content columns from translation tables
-- ============================================================

UPDATE public.articles AS a
SET
    title = COALESCE(NULLIF(a.title, ''), t.title, a.title),
    subtitle = COALESCE(a.subtitle, t.subtitle),
    summary = COALESCE(a.summary, t.summary),
    slug = COALESCE(NULLIF(a.slug, ''), t.slug, a.slug)
FROM public.article_translations AS t
WHERE t.article_id = a.id
  AND t.language_code = 'en';

UPDATE public.articles AS a
SET
    title = COALESCE(NULLIF(a.title, ''), t.title, a.title),
    subtitle = COALESCE(a.subtitle, t.subtitle),
    summary = COALESCE(a.summary, t.summary),
    slug = COALESCE(NULLIF(a.slug, ''), t.slug, a.slug)
FROM public.article_translations AS t
WHERE t.article_id = a.id
  AND a.title IS NULL;

UPDATE public.quiz_questions AS q
SET question_text = COALESCE(NULLIF(q.question_text, ''), t.question_text, q.question_text)
FROM public.quiz_question_translations AS t
WHERE t.question_id = q.id
  AND t.language_code = 'en';

UPDATE public.quiz_options AS o
SET option_text = COALESCE(NULLIF(o.option_text, ''), t.option_text, o.option_text)
FROM public.quiz_option_translations AS t
WHERE t.option_id = o.id
  AND t.language_code = 'en';

UPDATE public.opinion_questions AS q
SET question_text = COALESCE(NULLIF(q.question_text, ''), t.question_text, q.question_text)
FROM public.opinion_question_translations AS t
WHERE t.question_id = q.id
  AND t.language_code = 'en';

UPDATE public.opinion_options AS o
SET option_text = COALESCE(NULLIF(o.option_text, ''), t.option_text, o.option_text)
FROM public.opinion_option_translations AS t
WHERE t.option_id = o.id
  AND t.language_code = 'en';

UPDATE public.article_blocks AS b
SET
    text_content = COALESCE(NULLIF(b.text_content, ''), t.text_content, b.text_content),
    caption = COALESCE(b.caption, t.caption)
FROM public.article_block_translations AS t
WHERE t.article_block_id = b.id
  AND t.language_code = 'en';


-- ============================================================
-- 2. Drop translation schema
-- ============================================================

DROP TABLE IF EXISTS public.article_block_translations CASCADE;
DROP TABLE IF EXISTS public.article_translations CASCADE;
DROP TABLE IF EXISTS public.quiz_question_translations CASCADE;
DROP TABLE IF EXISTS public.quiz_option_translations CASCADE;
DROP TABLE IF EXISTS public.opinion_question_translations CASCADE;
DROP TABLE IF EXISTS public.opinion_option_translations CASCADE;

DROP TYPE IF EXISTS public.language_code CASCADE;


-- ============================================================
-- 4. Google + email/password profile creation
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_name TEXT;
BEGIN
    resolved_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '')
    );

    INSERT INTO public.profiles (
        id,
        email,
        display_name
    )
    VALUES (
        NEW.id,
        NEW.email,
        resolved_name
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        display_name = COALESCE(
            public.profiles.display_name,
            EXCLUDED.display_name
        );

    RETURN NEW;
END;
$$;


-- ============================================================
-- 5. XP ledger RLS
-- ============================================================

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS xp_transactions_select_own ON public.xp_transactions;
DROP POLICY IF EXISTS xp_transactions_select_admin ON public.xp_transactions;

CREATE POLICY xp_transactions_select_own
ON public.xp_transactions
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY xp_transactions_select_admin
ON public.xp_transactions
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin_or_superadmin()));

REVOKE INSERT, UPDATE, DELETE ON public.xp_transactions FROM anon, authenticated;
GRANT SELECT ON public.xp_transactions TO authenticated;


-- ============================================================
-- 6. Profiles: no public full-row read
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;


-- ============================================================
-- 7. Published content readable by anonymous visitors
-- ============================================================

DROP POLICY IF EXISTS "Public Read Article Blocks" ON public.article_blocks;

CREATE POLICY article_blocks_select_published_public
ON public.article_blocks
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
    )
);

DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;

CREATE POLICY categories_select_active_public
ON public.categories
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS quizzes_select_published ON public.quizzes;

CREATE POLICY quizzes_select_published
ON public.quizzes
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
    )
);

DROP POLICY IF EXISTS quiz_questions_select_published ON public.quiz_questions;

CREATE POLICY quiz_questions_select_published
ON public.quiz_questions
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.articles a ON a.id = q.article_id
        WHERE q.id = quiz_id
          AND a.status = 'PUBLISHED'
    )
);

DROP POLICY IF EXISTS quiz_options_select_published ON public.quiz_options;

CREATE POLICY quiz_options_select_published
ON public.quiz_options
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        JOIN public.articles a ON a.id = q.article_id
        WHERE qq.id = question_id
          AND a.status = 'PUBLISHED'
    )
);

DROP POLICY IF EXISTS opinion_questions_select_published ON public.opinion_questions;

CREATE POLICY opinion_questions_select_published
ON public.opinion_questions
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
    )
);

DROP POLICY IF EXISTS opinion_options_select_published ON public.opinion_options;

CREATE POLICY opinion_options_select_published
ON public.opinion_options
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.opinion_questions oq
        JOIN public.articles a ON a.id = oq.article_id
        WHERE oq.id = question_id
          AND a.status = 'PUBLISHED'
    )
);


-- ============================================================
-- 8. media_assets: published article media is public; no
--    authenticated-all-rows read
-- ============================================================

DROP POLICY IF EXISTS media_select_authenticated ON public.media_assets;
DROP POLICY IF EXISTS media_assets_select_active_ads ON public.media_assets;
DROP POLICY IF EXISTS media_select_active_promotional_items ON public.media_assets;

CREATE POLICY media_select_published_article
ON public.media_assets
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        JOIN public.categories c ON c.id = a.category_id
        WHERE a.cover_media_id = media_assets.id
          AND a.status = 'PUBLISHED'
          AND c.is_active = TRUE
    )
    OR EXISTS (
        SELECT 1
        FROM public.article_blocks ab
        JOIN public.articles a ON a.id = ab.article_id
        JOIN public.categories c ON c.id = a.category_id
        WHERE ab.media_id = media_assets.id
          AND a.status = 'PUBLISHED'
          AND c.is_active = TRUE
    )
);

CREATE POLICY media_select_active_ads
ON public.media_assets
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.advertisements ad
        JOIN public.advertisement_slots ads ON ads.id = ad.slot_id
        WHERE ad.image_media_id = media_assets.id
          AND ad.is_active = TRUE
          AND ads.is_active = TRUE
          AND (ad.starts_at IS NULL OR ad.starts_at <= NOW())
          AND (ad.ends_at IS NULL OR ad.ends_at > NOW())
    )
);

CREATE POLICY media_select_active_promotions
ON public.media_assets
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.promotional_items pi
        WHERE pi.image_media_id = media_assets.id
          AND pi.is_active = TRUE
          AND (pi.starts_at IS NULL OR pi.starts_at <= NOW())
          AND (pi.ends_at IS NULL OR pi.ends_at > NOW())
    )
);

CREATE POLICY media_select_own_avatar
ON public.media_assets
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.avatar_media_id = media_assets.id
          AND p.id = (SELECT auth.uid())
    )
);

CREATE POLICY media_select_admin
ON public.media_assets
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin_or_superadmin()));


-- ============================================================
-- 9. Advertisements: restore schedule + slot checks
-- ============================================================

DROP POLICY IF EXISTS "advertisements_select_public" ON public.advertisements;
DROP POLICY IF EXISTS advertisements_select_public ON public.advertisements;

CREATE POLICY advertisements_select_public
ON public.advertisements
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.advertisement_slots s
        WHERE s.id = slot_id
          AND s.is_active = TRUE
    )
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
);

DROP POLICY IF EXISTS "advertisement_slots_select_public" ON public.advertisement_slots;

CREATE POLICY advertisement_slots_select_public
ON public.advertisement_slots
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);


-- ============================================================
-- 10. Levels: SELECT only for authenticated
-- ============================================================

REVOKE ALL ON TABLE public.levels FROM authenticated;
GRANT SELECT ON TABLE public.levels TO authenticated;


-- ============================================================
-- 11. Comments visible policy uses is_deleted
-- ============================================================

DROP POLICY IF EXISTS comments_select_visible ON public.comments;

CREATE POLICY comments_select_visible
ON public.comments
FOR SELECT
TO authenticated
USING (
    COALESCE(is_hidden, FALSE) = FALSE
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND deleted_at IS NULL
);


-- ============================================================
-- 12. Storage: anonymous can read published article media
-- ============================================================

DROP POLICY IF EXISTS article_media_select ON storage.objects;

CREATE POLICY article_media_select
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'article-media'
    AND EXISTS (
        SELECT 1
        FROM public.media_assets ma
        WHERE ma.storage_path = name
          AND (
                EXISTS (
                    SELECT 1
                    FROM public.articles a
                    JOIN public.categories c ON c.id = a.category_id
                    WHERE a.cover_media_id = ma.id
                      AND a.status = 'PUBLISHED'
                      AND c.is_active = TRUE
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.article_blocks ab
                    JOIN public.articles a ON a.id = ab.article_id
                    JOIN public.categories c ON c.id = a.category_id
                    WHERE ab.media_id = ma.id
                      AND a.status = 'PUBLISHED'
                      AND c.is_active = TRUE
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.profiles p
                    WHERE p.avatar_media_id = ma.id
                      AND p.id = (SELECT auth.uid())
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.badges b
                    WHERE b.image_asset_id = ma.id
                      AND b.is_active = TRUE
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.promotional_items pi
                    WHERE pi.image_media_id = ma.id
                      AND pi.is_active = TRUE
                      AND (pi.starts_at IS NULL OR pi.starts_at <= NOW())
                      AND (pi.ends_at IS NULL OR pi.ends_at > NOW())
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.advertisements ad
                    JOIN public.advertisement_slots ads ON ads.id = ad.slot_id
                    WHERE ad.image_media_id = ma.id
                      AND ad.is_active = TRUE
                      AND ads.is_active = TRUE
                      AND (ad.starts_at IS NULL OR ad.starts_at <= NOW())
                      AND (ad.ends_at IS NULL OR ad.ends_at > NOW())
                )
          )
    )
);

NOTIFY pgrst, 'reload schema';

COMMIT;
