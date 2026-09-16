-- Authenticated readers submit their own quiz and opinion responses through
-- the FastAPI routes. The routes still validate the content server-side.

BEGIN;

DROP POLICY IF EXISTS quiz_attempts_insert_own
ON public.quiz_attempts;

CREATE POLICY quiz_attempts_insert_own
ON public.quiz_attempts
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS opinion_responses_insert_own
ON public.opinion_responses;

CREATE POLICY opinion_responses_insert_own
ON public.opinion_responses
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS opinion_responses_update_own
ON public.opinion_responses;

CREATE POLICY opinion_responses_update_own
ON public.opinion_responses
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
);

COMMIT;