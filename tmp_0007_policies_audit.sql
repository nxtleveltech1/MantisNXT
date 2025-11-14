DROP POLICY IF EXISTS "audit_log_view_privileged" ON audit_log;
CREATE POLICY "audit_log_view_privileged" ON audit_log
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'integrations'])
    );

