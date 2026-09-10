-- Netflix-style browsing: anonymous visitors may see published
-- article teasers (title, subtitle, cover image) only.
-- Full article body, in-article media, quizzes and opinions
-- require an authenticated user JWT.

BEGIN;

DROP POLICY IF EXISTS article_blocks_select_published_public
ON public.article_blocks;

CREATE POLICY article_blocks_select_published_authenticated
ON public.article_blocks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
    )
);

DROP POLICY IF EXISTS quizzes_select_published ON public.quizzes;
CREATE POLICY quizzes_select_published
ON public.quizzes
FOR SELECT
TO authenticated
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
TO authenticated
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
TO authenticated
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
TO authenticated
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
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.opinion_questions oq
        JOIN public.articles a ON a.id = oq.article_id
        WHERE oq.id = question_id
          AND a.status = 'PUBLISHED'
    )
);

DROP POLICY IF EXISTS media_select_published_article ON public.media_assets;

CREATE POLICY media_select_published_cover
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
);

CREATE POLICY media_select_published_article_body
ON public.media_assets
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.article_blocks ab
        JOIN public.articles a ON a.id = ab.article_id
        JOIN public.categories c ON c.id = a.category_id
        WHERE ab.media_id = media_assets.id
          AND a.status = 'PUBLISHED'
          AND c.is_active = TRUE
    )
);

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
                OR (
                    (SELECT auth.role()) = 'authenticated'
                    AND EXISTS (
                        SELECT 1
                        FROM public.article_blocks ab
                        JOIN public.articles a ON a.id = ab.article_id
                        JOIN public.categories c ON c.id = a.category_id
                        WHERE ab.media_id = ma.id
                          AND a.status = 'PUBLISHED'
                          AND c.is_active = TRUE
                    )
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

COMMIT;
