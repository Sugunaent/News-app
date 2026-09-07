-- 1. Allow public reading of active advertisements
DROP POLICY IF EXISTS "advertisements_select_public" ON public.advertisements;
CREATE POLICY "advertisements_select_public"
ON public.advertisements
FOR SELECT
TO public
USING (is_active = true);

-- 2. Allow public reading of active slots
DROP POLICY IF EXISTS "advertisement_slots_select_public" ON public.advertisement_slots;
CREATE POLICY "advertisement_slots_select_public"
ON public.advertisement_slots
FOR SELECT
TO public
USING (is_active = true);

-- 3. Allow public reading of media associated with active advertisements
DROP POLICY IF EXISTS "media_assets_select_active_ads" ON public.media_assets;
CREATE POLICY "media_assets_select_active_ads"
ON public.media_assets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.advertisements a
    WHERE a.image_media_id = media_assets.id
      AND a.is_active = true
  )
);