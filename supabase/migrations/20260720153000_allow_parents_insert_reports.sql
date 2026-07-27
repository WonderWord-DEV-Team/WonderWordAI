-- Ensure the private schema exists in the targeted database
CREATE SCHEMA IF NOT EXISTS private;

-- Re-apply schema usage privileges
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- Ensure the helper function exists
CREATE OR REPLACE FUNCTION private.authenticated_parent_is_linked_to_child(target_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.parent_child AS pc
        JOIN public.users AS parent_user
          ON parent_user.id = pc.parent_id
        WHERE pc.child_id = target_child_id
          AND parent_user.auth_id = auth.uid()
          AND parent_user.role = 'PARENT'::public.user_role
    )
$$;

-- Apply function privileges
REVOKE ALL ON FUNCTION private.authenticated_parent_is_linked_to_child(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.authenticated_parent_is_linked_to_child(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.authenticated_parent_is_linked_to_child(UUID) TO service_role;

-- Enable insert policy for linked parents on generated_reports
DROP POLICY IF EXISTS generated_reports_insert_linked_parent ON public.generated_reports;
CREATE POLICY generated_reports_insert_linked_parent
    ON public.generated_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        private.authenticated_parent_is_linked_to_child(child_id)
    );

-- Grant INSERT privileges to authenticated users on generated_reports table
GRANT INSERT ON public.generated_reports TO authenticated;

-- Enable update policy for linked parents on generated_reports (Required for UPSERT)
DROP POLICY IF EXISTS generated_reports_update_linked_parent ON public.generated_reports;
CREATE POLICY generated_reports_update_linked_parent
    ON public.generated_reports
    FOR UPDATE
    TO authenticated
    USING (
        private.authenticated_parent_is_linked_to_child(child_id)
    )
    WITH CHECK (
        private.authenticated_parent_is_linked_to_child(child_id)
    );

-- Grant UPDATE privileges to authenticated users on generated_reports table
GRANT UPDATE ON public.generated_reports TO authenticated;

