ALTER TABLE public.promotional_items
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ALTER COLUMN image_media_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.promotional_items'::regclass
          AND conname = 'promotional_items_image_source_required'
    ) THEN
        ALTER TABLE public.promotional_items
            ADD CONSTRAINT promotional_items_image_source_required
            CHECK (
                (image_media_id IS NOT NULL AND image_url IS NULL)
                OR (image_media_id IS NULL AND image_url IS NOT NULL)
            );
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
