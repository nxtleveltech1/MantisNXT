-- Organization policies
DROP POLICY IF EXISTS "organization_isolation" ON organization;
CREATE POLICY "organization_isolation" ON organization
    FOR ALL USING (
        id = auth.user_org_id()
    );

DROP POLICY IF EXISTS "organization_update_admin_only" ON organization;
CREATE POLICY "organization_update_admin_only" ON organization
    FOR UPDATE USING (
        id = auth.user_org_id() AND auth.is_admin()
    );

-- Profile policies
DROP POLICY IF EXISTS "profile_org_isolation" ON profile;
CREATE POLICY "profile_org_isolation" ON profile
    FOR SELECT USING (
        org_id = auth.user_org_id()
    );

DROP POLICY IF EXISTS "profile_update_own" ON profile;
CREATE POLICY "profile_update_own" ON profile
    FOR UPDATE USING (
        id = auth.uid()
    );

