ALTER TABLE public.advertisement_slots
ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'sidebar';

NOTIFY pgrst, 'reload schema';
