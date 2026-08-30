-- ============================================================
-- Add PODCAST article block type
-- ============================================================

ALTER TYPE public.article_block_type
ADD VALUE IF NOT EXISTS 'PODCAST';