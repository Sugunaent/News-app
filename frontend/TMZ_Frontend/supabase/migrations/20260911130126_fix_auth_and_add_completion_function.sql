/*
# Fix auth trigger security and add XP/level award function

## Changes

1. **Fix handle_new_user trigger function**: Set search_path, revoke EXECUTE from anon/authenticated
2. **Add award_completion_xp function**: SECURITY DEFINER function that:
   - Checks if user already has a completion card for the article (prevents double-award)
   - Adds XP to the user's profile
   - Recalculates and updates the user's level based on XP thresholds
   - Creates the completion card record
   - Returns the completion card with updated XP and level info
3. **Add award_quiz_xp function**: SECURITY DEFINER function that:
   - Checks if user already attempted the quiz (prevents double-award)
   - Records the quiz attempt
   - Adds XP to the user's profile
   - Recalculates level
   - Returns the attempt record

## Security
- handle_new_user: search_path set to 'public', EXECUTE revoked from anon and authenticated
- award_completion_xp: SECURITY DEFINER, only callable by authenticated, search_path set
- award_quiz_xp: SECURITY DEFINER, only callable by authenticated, search_path set
*/

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Award completion XP function
CREATE OR REPLACE FUNCTION public.award_completion_xp(
  p_article_id uuid,
  p_xp_amount integer DEFAULT 30
)
RETURNS TABLE(
  card_id uuid,
  xp_gained integer,
  total_xp integer,
  new_level integer,
  already_completed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_article_title text;
  v_current_xp integer;
  v_new_xp integer;
  v_new_level integer;
  v_already boolean := false;
  v_card_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already completed
  SELECT id INTO v_existing FROM completion_cards
  WHERE user_id = v_user_id AND article_id = p_article_id;

  IF v_existing IS NOT NULL THEN
    v_already := true;
    SELECT xp, level INTO v_current_xp, v_new_level FROM profiles WHERE id = v_user_id;
    RETURN QUERY SELECT v_existing, 0, v_current_xp, v_new_level, true;
    RETURN;
  END IF;

  -- Get article title
  SELECT title INTO v_article_title FROM articles WHERE id = p_article_id;
  IF v_article_title IS NULL THEN
    RAISE EXCEPTION 'Article not found';
  END IF;

  -- Create completion card
  INSERT INTO completion_cards (user_id, article_id, article_title, xp_gained)
  VALUES (v_user_id, p_article_id, v_article_title, p_xp_amount)
  RETURNING id INTO v_card_id;

  -- Add XP to profile
  UPDATE profiles
  SET xp = xp + p_xp_amount
  WHERE id = v_user_id
  RETURNING xp, level INTO v_current_xp, v_new_level;

  -- Recalculate level
  SELECT COALESCE(
    (SELECT level_number FROM levels
     WHERE xp_threshold <= v_current_xp
     ORDER BY xp_threshold DESC LIMIT 1),
    1
  ) INTO v_new_level;

  UPDATE profiles SET level = v_new_level WHERE id = v_user_id;

  RETURN QUERY SELECT v_card_id, p_xp_amount, v_current_xp, v_new_level, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_completion_xp(uuid, integer) TO authenticated;

-- Award quiz XP function
CREATE OR REPLACE FUNCTION public.award_quiz_xp(
  p_quiz_id uuid,
  p_selected_option_id uuid,
  p_is_correct boolean,
  p_xp_earned integer
)
RETURNS TABLE(
  attempt_id uuid,
  xp_earned integer,
  total_xp integer,
  new_level integer,
  already_attempted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_current_xp integer;
  v_new_level integer;
  v_attempt_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already attempted
  SELECT id INTO v_existing FROM quiz_attempts
  WHERE user_id = v_user_id AND quiz_id = p_quiz_id;

  IF v_existing IS NOT NULL THEN
    SELECT xp, level INTO v_current_xp, v_new_level FROM profiles WHERE id = v_user_id;
    RETURN QUERY SELECT v_existing, 0, v_current_xp, v_new_level, true;
    RETURN;
  END IF;

  -- Create attempt
  INSERT INTO quiz_attempts (quiz_id, user_id, selected_option_id, is_correct, xp_earned)
  VALUES (p_quiz_id, v_user_id, p_selected_option_id, p_is_correct, p_xp_earned)
  RETURNING id INTO v_attempt_id;

  -- Add XP to profile
  UPDATE profiles
  SET xp = xp + p_xp_earned
  WHERE id = v_user_id
  RETURNING xp, level INTO v_current_xp, v_new_level;

  -- Recalculate level
  SELECT COALESCE(
    (SELECT level_number FROM levels
     WHERE xp_threshold <= v_current_xp
     ORDER BY xp_threshold DESC LIMIT 1),
    1
  ) INTO v_new_level;

  UPDATE profiles SET level = v_new_level WHERE id = v_user_id;

  RETURN QUERY SELECT v_attempt_id, p_xp_earned, v_current_xp, v_new_level, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_quiz_xp(uuid, uuid, boolean, integer) TO authenticated;
