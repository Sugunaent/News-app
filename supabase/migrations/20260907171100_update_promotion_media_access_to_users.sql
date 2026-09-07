-- Allow public (anon + authenticated) to select media linked to active promotional items
CREATE POLICY "media_select_active_promotional_items"
ON public.media_assets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.promotional_items pi
    WHERE pi.image_media_id = media_assets.id
      AND pi.is_active = true
      AND (pi.starts_at IS NULL OR pi.starts_at <= NOW())
      AND (pi.ends_at IS NULL OR pi.ends_at > NOW())
  )
);