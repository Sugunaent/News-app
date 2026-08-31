-- ============================================================
-- Cognition News
-- Advertising System
-- ============================================================
--
-- Purpose:
--   Provide a simple advertisement-slot architecture.
--
-- Important:
--   Advertising is separate from promotional_items.
--   There are no campaigns, advertiser accounts, billing,
--   auctions, CPC/CPM systems, or ad-network integrations
--   in V1.
-- ============================================================


-- ============================================================
-- 1. ADVERTISEMENT SLOTS
-- ============================================================

CREATE TABLE public.advertisement_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    key TEXT NOT NULL,

    name TEXT NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT advertisement_slots_key_not_blank
        CHECK (length(trim(key)) > 0),

    CONSTRAINT advertisement_slots_name_not_blank
        CHECK (length(trim(name)) > 0),

    CONSTRAINT advertisement_slots_key_unique
        UNIQUE (key)
);


-- ============================================================
-- 2. ADVERTISEMENTS
-- ============================================================

CREATE TABLE public.advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    slot_id UUID NOT NULL,

    image_media_id UUID NOT NULL,

    title TEXT NOT NULL,

    description TEXT NOT NULL,

    destination_url TEXT NOT NULL,

    starts_at TIMESTAMPTZ,

    ends_at TIMESTAMPTZ,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT advertisements_slot_fkey
        FOREIGN KEY (slot_id)
        REFERENCES public.advertisement_slots(id)
        ON DELETE RESTRICT,

    CONSTRAINT advertisements_image_media_fkey
        FOREIGN KEY (image_media_id)
        REFERENCES public.media_assets(id)
        ON DELETE RESTRICT,

    CONSTRAINT advertisements_title_not_blank
        CHECK (length(trim(title)) > 0),

    CONSTRAINT advertisements_description_not_blank
        CHECK (length(trim(description)) > 0),

    CONSTRAINT advertisements_destination_url_not_blank
        CHECK (length(trim(destination_url)) > 0),

    CONSTRAINT advertisements_display_order_nonnegative
        CHECK (display_order >= 0),

    CONSTRAINT advertisements_visibility_window_valid
        CHECK (
            ends_at IS NULL
            OR starts_at IS NULL
            OR ends_at > starts_at
        )
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX advertisement_slots_active_idx
ON public.advertisement_slots (is_active);


CREATE INDEX advertisements_public_idx
ON public.advertisements (
    slot_id,
    is_active,
    starts_at,
    ends_at,
    display_order
);


CREATE INDEX advertisements_slot_order_idx
ON public.advertisements (
    slot_id,
    display_order,
    created_at
);


-- ============================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER advertisement_slots_set_updated_at

BEFORE UPDATE ON public.advertisement_slots

FOR EACH ROW

EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER advertisements_set_updated_at

BEFORE UPDATE ON public.advertisements

FOR EACH ROW

EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.advertisement_slots
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.advertisements
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6. ADVERTISEMENT SLOT POLICIES
-- ============================================================

-- Public clients may see active advertisement slots.
CREATE POLICY advertisement_slots_select_public

ON public.advertisement_slots

FOR SELECT

TO anon, authenticated

USING (
    is_active = TRUE
);


-- Superadmin can see every slot.
CREATE POLICY advertisement_slots_select_superadmin

ON public.advertisement_slots

FOR SELECT

TO authenticated

USING (
    (SELECT private.is_superadmin())
);


-- Only Superadmin can create slots.
CREATE POLICY advertisement_slots_insert_superadmin

ON public.advertisement_slots

FOR INSERT

TO authenticated

WITH CHECK (
    (SELECT private.is_superadmin())
);


-- Only Superadmin can modify slots.
CREATE POLICY advertisement_slots_update_superadmin

ON public.advertisement_slots

FOR UPDATE

TO authenticated

USING (
    (SELECT private.is_superadmin())
)

WITH CHECK (
    (SELECT private.is_superadmin())
);


-- Only Superadmin can delete slots.
CREATE POLICY advertisement_slots_delete_superadmin

ON public.advertisement_slots

FOR DELETE

TO authenticated

USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 7. ADVERTISEMENT POLICIES
-- ============================================================

-- Public users may only see advertisements that are currently
-- eligible for display.
CREATE POLICY advertisements_select_public

ON public.advertisements

FOR SELECT

TO anon, authenticated

USING (
    is_active = TRUE

    AND EXISTS (
        SELECT 1
        FROM public.advertisement_slots s
        WHERE s.id = slot_id
          AND s.is_active = TRUE
    )

    AND (
        starts_at IS NULL
        OR starts_at <= NOW()
    )

    AND (
        ends_at IS NULL
        OR ends_at > NOW()
    )
);


-- Superadmin can see all advertisements for management.
CREATE POLICY advertisements_select_superadmin

ON public.advertisements

FOR SELECT

TO authenticated

USING (
    (SELECT private.is_superadmin())
);


-- Only Superadmin can create advertisements.
CREATE POLICY advertisements_insert_superadmin

ON public.advertisements

FOR INSERT

TO authenticated

WITH CHECK (
    (SELECT private.is_superadmin())
);


-- Only Superadmin can modify advertisements.
CREATE POLICY advertisements_update_superadmin

ON public.advertisements

FOR UPDATE

TO authenticated

USING (
    (SELECT private.is_superadmin())
)

WITH CHECK (
    (SELECT private.is_superadmin())
);


-- Only Superadmin can delete advertisements.
CREATE POLICY advertisements_delete_superadmin

ON public.advertisements

FOR DELETE

TO authenticated

USING (
    (SELECT private.is_superadmin())
);


-- ============================================================
-- 8. INITIAL V1 SLOTS
-- ============================================================

INSERT INTO public.advertisement_slots (
    key,
    name,
    description
)
VALUES
(
    'HEADER',
    'Header',
    'Advertisement placement in the website header.'
),
(
    'HOME_TOP',
    'Home Top',
    'Advertisement placement near the top of the home page.'
),
(
    'HOME_MIDDLE',
    'Home Middle',
    'Advertisement placement in the middle of the home page.'
),
(
    'ARTICLE_TOP',
    'Article Top',
    'Advertisement placement near the top of an article.'
),
(
    'ARTICLE_MIDDLE',
    'Article Middle',
    'Advertisement placement within an article.'
),
(
    'ARTICLE_BOTTOM',
    'Article Bottom',
    'Advertisement placement near the end of an article.'
),
(
    'SIDEBAR',
    'Sidebar',
    'Advertisement placement in a sidebar.'
),
(
    'CATEGORY',
    'Category',
    'Advertisement placement on category pages.'
),
(
    'IN_FEED',
    'In Feed',
    'Advertisement placement within content feeds.'
)
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- END OF ADVERTISING MIGRATION
-- ============================================================