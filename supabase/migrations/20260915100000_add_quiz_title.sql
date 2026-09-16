ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Quiz';

NOTIFY pgrst, 'reload schema';
