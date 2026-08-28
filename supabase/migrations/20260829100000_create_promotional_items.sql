-- ============================================================
-- Cognition News
-- Promotional / Sponsor Carousel
-- ============================================================

CREATE TABLE public.promotional_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    image_media_id UUID NOT NULL,

    title TEXT NOT NULL,

    description TEXT NOT NULL,

    external_url TEXT NOT NULL,

    event_date TIMESTAMPTZ,

    display_order INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    starts_at TIMESTAMPTZ,

    ends_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT promotional_items_image_media_fkey
        FOREIGN KEY (image_media_id)
        REFERENCES public.media_assets(id)
        ON DELETE RESTRICT,

    CONSTRAINT promotional_items_display_order_nonnegative
        CHECK (display_order >= 0),

    CONSTRAINT promotional_items_visibility_window_valid
        CHECK (
            ends_at IS NULL
            OR starts_at IS NULL
            OR ends_at > starts_at
        )
);

-- Public carousel queries are primarily driven by visibility/order.
CREATE INDEX promotional_items_public_idx
ON public.promotional_items (
    is_active,
    starts_at,
    ends_at,
    display_order
);

-- Useful for Superadmin listing/order management.
CREATE INDEX promotional_items_display_order_idx
ON public.promotional_items (display_order);

-- Keep updated_at consistent with the existing project convention.
CREATE TRIGGER promotional_items_set_updated_at
BEFORE UPDATE ON public.promotional_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.promotional_items
ENABLE ROW LEVEL SECURITY;

-- Public users may only read currently visible promotions.
CREATE POLICY promotional_items_select_public
ON public.promotional_items
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
);

-- Superadmin can read all promotional items, including
-- inactive/future/expired items for management purposes.
CREATE POLICY promotional_items_select_superadmin
ON public.promotional_items
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_superadmin())
);

-- Only Superadmin may create promotional items.
CREATE POLICY promotional_items_insert_superadmin
ON public.promotional_items
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_superadmin())
);

-- Only Superadmin may modify promotional items.
CREATE POLICY promotional_items_update_superadmin
ON public.promotional_items
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_superadmin())
)
WITH CHECK (
    (SELECT private.is_superadmin())
);

-- Only Superadmin may delete promotional items.
CREATE POLICY promotional_items_delete_superadmin
ON public.promotional_items
FOR DELETE
TO authenticated
USING (
    (SELECT private.is_superadmin())
);