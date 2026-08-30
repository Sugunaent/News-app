-- ============================================================
-- Cognition News
-- Comments RLS Policies
-- ============================================================

-- ============================================================
-- PUBLIC COMMENT READ
-- ============================================================
--
-- Only visible, non-deleted comments are readable.
--
-- We keep this authenticated because the existing application
-- data model uses authenticated Supabase access for user data.
-- The FastAPI public GET endpoint handles the public API surface.
-- ============================================================

CREATE POLICY comments_select_visible
ON public.comments
FOR SELECT
TO authenticated
USING (
    is_hidden = FALSE
    AND deleted_at IS NULL
);


-- ============================================================
-- USER INSERT
-- ============================================================
--
-- A user may create a comment only as themselves and only on
-- a published article.
-- ============================================================

CREATE POLICY comments_insert_own
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND is_hidden = FALSE
    AND deleted_at IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_id
          AND a.status = 'PUBLISHED'
          AND a.published_at IS NOT NULL
    )
);


-- ============================================================
-- USER UPDATE
-- ============================================================
--
-- Users can modify only their own comments.
--
-- The API only permits content edits, but the RLS policy also
-- prevents a user from turning their comment into a hidden or
-- deleted comment.
-- ============================================================

CREATE POLICY comments_update_own
ON public.comments
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
)
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND is_hidden = FALSE
    AND deleted_at IS NULL
);


-- ============================================================
-- USER DELETE
-- ============================================================
--
-- The API performs soft deletion.
-- ============================================================

CREATE POLICY comments_delete_own
ON public.comments
FOR DELETE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


-- ============================================================
-- SUPERADMIN SELECT
-- ============================================================
--
-- Superadmin needs access to hidden/deleted records for
-- moderation.
-- ============================================================

CREATE POLICY comments_select_superadmin
ON public.comments
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- SUPERADMIN UPDATE
-- ============================================================
--
-- Superadmin uses this for hiding/unhiding comments.
-- ============================================================

CREATE POLICY comments_update_superadmin
ON public.comments
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_superadmin())
)
WITH CHECK (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- SUPERADMIN DELETE
-- ============================================================
--
-- Superadmin is allowed to physically delete a comment if the
-- administrative layer needs to do so.
--
-- Normal application deletion uses soft deletion.
-- ============================================================

CREATE POLICY comments_delete_superadmin
ON public.comments
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- NO PUBLIC INSERT/UPDATE/DELETE
-- ============================================================
--
-- All mutation access is authenticated and ownership/
-- superadmin controlled.
-- ============================================================
