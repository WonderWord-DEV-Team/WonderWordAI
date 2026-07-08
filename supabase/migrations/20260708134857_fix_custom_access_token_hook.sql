-- Make the custom access token hook discoverable and executable by Supabase Auth.
-- This migration intentionally corrects the hook in a new forward migration
-- because 20260708013419 was already present in remote migration history.

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

REVOKE ALL ON public.users FROM supabase_auth_admin;
GRANT SELECT (auth_id, role) ON public.users TO supabase_auth_admin;

DROP POLICY IF EXISTS users_select_role_for_auth_hook ON public.users;
CREATE POLICY users_select_role_for_auth_hook
    ON public.users
    FOR SELECT
    TO supabase_auth_admin
    USING (true);

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    claims JSONB;
    app_role TEXT;
BEGIN
    claims := COALESCE(event->'claims', '{}'::jsonb);

    SELECT u.role::TEXT
    INTO app_role
    FROM public.users AS u
    WHERE u.auth_id = (event->>'user_id')::UUID
      AND u.role IN ('CHILD'::public.user_role, 'PARENT'::public.user_role)
    LIMIT 1;

    IF app_role IN ('CHILD', 'PARENT') THEN
        claims := jsonb_set(claims, '{user_role}', to_jsonb(app_role), true);
    ELSE
        claims := claims - 'user_role';
    END IF;

    RETURN jsonb_build_object('claims', claims);
END;
$$;

REVOKE ALL ON FUNCTION public.custom_access_token_hook(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.custom_access_token_hook(JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.custom_access_token_hook(JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
