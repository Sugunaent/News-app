-- ============================================================
-- News App
-- Extend media Storage read access
-- ============================================================
--
-- The article-media bucket is PRIVATE.
--
-- Existing SELECT access already covers:
--   - published article covers
--   - published article image blocks
--   - user's own avatar
--   - active badge images
--
-- This migration additionally permits authenticated users to
-- read media used by:
--   - active promotional carousel items
--   - currently eligible advertisements in active slots
--
-- This keeps the Storage layer aligned with the public
-- promotions and advertisements APIs.
-- ============================================================


-- ============================================================
-- 1. REPLACE EXISTING MEDIA SELECT POLICY
-- ============================================================

DROP POLICY IF EXISTS article_media_select
ON storage.objects;


CREATE POLICY article_media_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'article-media'
    AND EXISTS (
        SELECT 1
        FROM public.media_assets ma
        WHERE ma.storage_path = name
          AND (
                -- ------------------------------------------------
                -- Published article cover
                -- ------------------------------------------------
                EXISTS (
                    SELECT 1
                    FROM public.articles a
                    JOIN public.categories c
                      ON c.id = a.category_id
                    WHERE a.cover_media_id = ma.id
                      AND a.status = 'PUBLISHED'
                      AND a.published_at IS NOT NULL
                      AND c.is_active = TRUE
                )

                OR

                -- ------------------------------------------------
                -- Published article image block
                -- ------------------------------------------------
                EXISTS (
                    SELECT 1
                    FROM public.article_blocks ab
                    JOIN public.articles a
                      ON a.id = ab.article_id
                    JOIN public.categories c
                      ON c.id = a.category_id
                    WHERE ab.media_id = ma.id
                      AND ab.block_type = 'IMAGE'
                      AND a.status = 'PUBLISHED'
                      AND a.published_at IS NOT NULL
                      AND c.is_active = TRUE
                )

                OR

                -- ------------------------------------------------
                -- User's own avatar
                -- ------------------------------------------------
                EXISTS (
                    SELECT 1
                    FROM public.profiles p
                    WHERE p.avatar_media_id = ma.id
                      AND p.id = (SELECT auth.uid())
                )

                OR

                -- ------------------------------------------------
                -- Active badge image
                -- ------------------------------------------------
                EXISTS (
                    SELECT 1
                    FROM public.badges b
                    WHERE b.image_asset_id = ma.id
                      AND b.is_active = TRUE
                )

                OR

                -- ------------------------------------------------
                -- Active promotional carousel item
                --
                -- The promotion itself must be active and its
                -- visibility window must currently permit display.
                -- ------------------------------------------------
                EXISTS (
                    SELECT 1
                    FROM public.promotional_items pi
                    WHERE pi.image_media_id = ma.id
                      AND pi.is_active = TRUE
                      AND (
                            pi.starts_at IS NULL
                            OR pi.starts_at <= NOW()
                      )
                      AND (
                            pi.ends_at IS NULL
                            OR pi.ends_at >= NOW()
                      )
                )

                OR

                -- ------------------------------------------------
                -- Currently eligible advertisement
                --
                -- The advertisement must be active, inside its
                -- visibility window, and belong to an active slot.
                -- ------------------------------------------------
                EXISTS (
                    SELECT 1
                    FROM public.advertisements ad
                    JOIN public.advertisement_slots ads
                      ON ads.id = ad.slot_id
                    WHERE ad.image_media_id = ma.id
                      AND ad.is_active = TRUE
                      AND ads.is_active = TRUE
                      AND (
                            ad.starts_at IS NULL
                            OR ad.starts_at <= NOW()
                      )
                      AND (
                            ad.ends_at IS NULL
                            OR ad.ends_at >= NOW()
                      )
                )
          )
    )
);


-- ============================================================
-- END
-- ============================================================