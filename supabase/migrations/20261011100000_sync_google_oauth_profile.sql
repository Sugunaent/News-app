-- Upgrade handle_new_user function to extract Google OAuth metadata and upsert into profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_display_name TEXT;
BEGIN
    -- Extract display name from user metadata (Google OAuth provides full_name or name)
    user_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1),
        'Reader'
    );

    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        role,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_display_name,
        'USER',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Drop old trigger if exists and attach new trigger on insert & metadata updates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE OF raw_user_meta_data, email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
