/*
# Fix reading_progress scroll_position column type

## Problem
The `scroll_position` column in `reading_progress` is an integer type,
but the frontend sends float values (e.g. 1587.199951171875) from window.scrollY.
This causes a "invalid input syntax for type integer" error.

## Change
- Alter `scroll_position` from integer to real (float) to accept decimal scroll positions.
- This is safe — no data loss, integer values convert to real seamlessly.

## Notes
- No RLS changes needed.
- Idempotent: uses DO $$ block to check before altering.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reading_progress'
    AND column_name = 'scroll_position'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE reading_progress ALTER COLUMN scroll_position TYPE real;
  END IF;
END $$;
