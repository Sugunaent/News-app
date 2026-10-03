ALTER TABLE public.promotional_items
    ALTER COLUMN image_media_id DROP NOT NULL,
    ADD COLUMN image_url TEXT,
    ADD CONSTRAINT promotional_items_image_source_required
        CHECK (
            (image_media_id IS NOT NULL AND image_url IS NULL)
            OR (image_media_id IS NULL AND image_url IS NOT NULL)
        );
