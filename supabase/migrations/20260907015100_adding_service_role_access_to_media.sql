DROP POLICY IF EXISTS article_media_insert_admin ON storage.objects;

CREATE POLICY article_media_insert_admin
ON storage.objects
FOR INSERT
TO authenticated, service_role
WITH CHECK (
    bucket_id = 'article-media'
    AND (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('ADMIN', 'SUPERADMIN')
        )
    )
);