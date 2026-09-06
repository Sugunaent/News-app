-- Fix 1: Add missing updated_at column to quiz_options
ALTER TABLE quiz_options 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a trigger to auto-update updated_at on quiz_options if desired
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_quiz_options_updated_at ON quiz_options;
CREATE TRIGGER update_quiz_options_updated_at
BEFORE UPDATE ON quiz_options
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Fix 2: Ensure opinion_questions table has question_text column
DO $$ 
BEGIN
    -- Rename 'text' or 'question' column to 'question_text' if it was named differently, otherwise add it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opinion_questions' AND column_name = 'text'
    ) THEN
        ALTER TABLE opinion_questions RENAME COLUMN text TO question_text;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opinion_questions' AND column_name = 'question'
    ) THEN
        ALTER TABLE opinion_questions RENAME COLUMN question TO question_text;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opinion_questions' AND column_name = 'question_text'
    ) THEN
        ALTER TABLE opinion_questions ADD COLUMN question_text TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Reload Supabase Schema Cache (forces PostgREST / Supabase to recognize new columns immediately)
NOTIFY pgrst, 'reload schema';