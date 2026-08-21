-- ============================================================
-- News App
-- Supabase Storage Policies
-- ============================================================
--
-- Bucket:
--     article-media
--
-- Bucket is PRIVATE.
--
-- Application rule:
--     public.media_assets.storage_path
--     is the authoritative application reference to the object.
--
-- Normal users:
--     READ only media associated with content they can consume.
--
-- Admin / Superadmin:
--     CREATE / UPDATE / DELETE editorial media.
--
-- Anonymous:
--     NO access.
--
-- ============================================================



-- ============================================================
-- 1. READ / DOWNLOAD POLICY
-- ============================================================
--
-- A user may read a media object only if:
--
-- A) it is referenced by the cover of a published article, OR
-- B) it is referenced by an IMAGE article block belonging to
--    a published article, OR
-- C) it is the user's own avatar, OR
-- D) it is the image associated with an active badge.
--
-- This deliberately does NOT grant access to every object
-- inside the private bucket.
-- ============================================================

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
                -- Published article cover
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

                -- Published article image block
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

                -- User's own avatar
                EXISTS (
                    SELECT 1
                    FROM public.profiles p
                    WHERE p.avatar_media_id = ma.id
                      AND p.id = (SELECT auth.uid())
                )

                OR

                -- Active badge image
                EXISTS (
                    SELECT 1
                    FROM public.badges b
                    WHERE b.image_asset_id = ma.id
                      AND b.is_active = TRUE
                )
          )
    )
);


-- ============================================================
-- 2. ADMIN / SUPERADMIN UPLOAD
-- ============================================================
--
-- Uploads are deliberately restricted to the administrative
-- layer.
--
-- The corresponding media_assets row must already exist and
-- must belong to the authenticated administrator.
--
-- This prevents arbitrary objects from being uploaded into
-- the application's bucket without corresponding metadata.
-- ============================================================

CREATE POLICY article_media_insert_admin
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'article-media'
    AND (SELECT private.is_admin_or_superadmin())
    AND EXISTS (
        SELECT 1
        FROM public.media_assets ma
        WHERE ma.storage_path = name
          AND ma.uploaded_by = (SELECT auth.uid())
    )
);


-- ============================================================
-- 3. ADMIN / SUPERADMIN UPDATE
-- ============================================================
--
-- We don't allow ordinary users to replace editorial files.
--
-- The object must already correspond to the administrator's
-- media_assets record.
-- ============================================================

CREATE POLICY article_media_update_admin
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'article-media'
    AND (SELECT private.is_admin_or_superadmin())
    AND EXISTS (
        SELECT 1
        FROM public.media_assets ma
        WHERE ma.storage_path = name
          AND ma.uploaded_by = (SELECT auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'article-media'
    AND (SELECT private.is_admin_or_superadmin())
    AND EXISTS (
        SELECT 1
        FROM public.media_assets ma
        WHERE ma.storage_path = name
          AND ma.uploaded_by = (SELECT auth.uid())
    )
);


-- ============================================================
-- 4. ADMIN / SUPERADMIN DELETE
-- ============================================================
--
-- An administrator may delete media they uploaded.
-- SUPERADMIN may delete any media object.
--
-- However, database references must be handled by the
-- application before deletion because several tables can
-- reference media_assets.
-- ============================================================

CREATE POLICY article_media_delete_admin
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'article-media'
    AND (
        (
            (SELECT private.is_superadmin())
        )
        OR
        (
            (SELECT private.is_admin_or_superadmin())
            AND EXISTS (
                SELECT 1
                FROM public.media_assets ma
                WHERE ma.storage_path = name
                  AND ma.uploaded_by = (SELECT auth.uid())
            )
        )
    )
);


-- ============================================================
-- END OF STORAGE POLICIES
-- ============================================================