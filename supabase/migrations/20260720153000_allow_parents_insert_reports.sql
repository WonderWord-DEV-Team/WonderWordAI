-- Enable insert policy for linked parents on generated_reports
CREATE POLICY generated_reports_insert_linked_parent
    ON public.generated_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        private.authenticated_parent_is_linked_to_child(child_id)
    );

-- Grant INSERT privileges to authenticated users on generated_reports table
GRANT INSERT ON public.generated_reports TO authenticated;
