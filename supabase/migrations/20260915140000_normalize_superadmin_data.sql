UPDATE public.quizzes
SET title = 'Quiz'
WHERE title IS NULL;

ALTER TABLE public.quizzes
ALTER COLUMN title SET DEFAULT 'Quiz';

ALTER TABLE public.quizzes
ALTER COLUMN title SET NOT NULL;

NOTIFY pgrst, 'reload schema';
