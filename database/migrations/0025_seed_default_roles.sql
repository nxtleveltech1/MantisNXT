-- Migration: 0025_seed_default_roles.sql
-- Description: Seed default roles for the MantisNXT Demo organization
-- Dependencies: 0021_comprehensive_auth_system.sql

BEGIN;

-- Get the org_id for MantisNXT Demo (or use a well-known UUID)
DO $$
DECLARE
    v_org_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
    -- Insert default roles if they don't exist
    INSERT INTO auth.roles (org_id, name, slug, description, is_system_role, role_level, is_active)
    VALUES 
        (v_org_id, 'Super Administrator', 'super_admin', 'Full system access across all organizations', TRUE, 100, TRUE),
        (v_org_id, 'Administrator', 'admin', 'Full access within organization', TRUE, 90, TRUE),
        (v_org_id, 'Manager', 'manager', 'Manage team and department resources', TRUE, 70, TRUE),
        (v_org_id, 'User', 'user', 'Standard user access', TRUE, 50, TRUE),
        (v_org_id, 'Viewer', 'viewer', 'Read-only access', TRUE, 30, TRUE)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Default roles seeded for org: %', v_org_id;
END $$;

COMMIT;






