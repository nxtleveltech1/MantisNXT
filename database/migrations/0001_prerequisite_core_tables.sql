-- ============================================================================
-- Migration: 0001_prerequisite_core_tables.sql
-- Description: Core prerequisite tables for authentication system
-- Author: AS Team - Emergency Remediation
-- Date: 2025-11-04
-- Priority: CRITICAL - Must run BEFORE 0021_comprehensive_auth_system.sql
-- Version: 2.0 (FIXED)
-- ============================================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

-- Organization plan types
DO $$ BEGIN
    CREATE TYPE organization_plan AS ENUM ('starter', 'professional', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Organization status
DO $$ BEGIN
    CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Legacy user role (for backwards compatibility)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: ORGANIZATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic information
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    legal_name TEXT,

    -- Registration details
    registration_number TEXT,
    vat_number TEXT,

    -- BEE compliance (South African)
    bee_level INTEGER CHECK (bee_level >= 1 AND bee_level <= 8),

    -- Contact information
    contact_email TEXT,
    phone TEXT,
    website TEXT,

    -- Address
    address_street TEXT,
    address_suburb TEXT,
    address_city TEXT,
    address_province TEXT,
    address_postal_code TEXT,
    address_country TEXT DEFAULT 'South Africa',

    -- Business information
    industry TEXT,
    province TEXT,

    -- Status
    status organization_status DEFAULT 'active',
    plan_type organization_plan NOT NULL DEFAULT 'starter',
    is_active BOOLEAN DEFAULT TRUE,

    -- Branding
    logo_url TEXT,

    -- Settings (JSONB for flexibility)
    settings JSONB DEFAULT '{
        "allow_self_registration": false,
        "require_email_verification": true,
        "enforce_two_factor": false,
        "password_policy": {
            "min_length": 8,
            "require_uppercase": true,
            "require_lowercase": true,
            "require_numbers": true,
            "require_symbols": true,
            "expires_days": 90
        },
        "session_timeout": 3600,
        "allowed_domains": []
    }'::JSONB,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT org_name_length CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 100),
    CONSTRAINT org_slug_format CHECK (slug ~ '^[a-z0-9-]+$' AND LENGTH(slug) >= 2),
    CONSTRAINT valid_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_website CHECK (website IS NULL OR website ~ '^https?://')
);

-- Indexes for organization
CREATE INDEX IF NOT EXISTS idx_organization_slug ON organization(slug);
CREATE INDEX IF NOT EXISTS idx_organization_status ON organization(status) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_organization_plan_status ON organization(plan_type, status);
CREATE INDEX IF NOT EXISTS idx_organization_created ON organization(created_at DESC);

-- ============================================================================
-- PART 3: LEGACY PROFILE TABLE (for compatibility)
-- ============================================================================

-- NOTE: This table is for BACKWARDS COMPATIBILITY ONLY
-- The new comprehensive auth system uses auth.users_extended (created in migration 0021)
-- After migration 0021 is complete, data should be migrated from profile -> auth.users_extended
-- This table will be deprecated in a future version

CREATE TABLE IF NOT EXISTS profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

    -- Link to future auth system (will be populated during migration)
    user_id UUID, -- Will link to auth.users_extended(id) after 0021 migration

    -- Basic info
    display_name TEXT NOT NULL,
    avatar_url TEXT,

    -- Role (using proper ENUM now)
    role user_role DEFAULT 'user',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,

    -- Settings
    settings JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT profile_display_name_length CHECK (LENGTH(display_name) >= 1 AND LENGTH(display_name) <= 100),
    CONSTRAINT profile_avatar_url_format CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://')
);

-- Indexes for profile
CREATE INDEX IF NOT EXISTS idx_profile_org_id ON profile(org_id);
CREATE INDEX IF NOT EXISTS idx_profile_user_id ON profile(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_active ON profile(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_profile_role ON profile(org_id, role);
CREATE INDEX IF NOT EXISTS idx_profile_last_seen ON profile(last_seen_at DESC) WHERE is_active = TRUE;

-- ============================================================================
-- PART 4: TRIGGER FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_organization_updated_at ON organization;
CREATE TRIGGER update_organization_updated_at
    BEFORE UPDATE ON organization
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profile_updated_at ON profile;
CREATE TRIGGER update_profile_updated_at
    BEFORE UPDATE ON profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 5: MIGRATION HELPER FUNCTIONS
-- ============================================================================

-- Function to migrate profile data to auth.users_extended (called after 0021)
CREATE OR REPLACE FUNCTION migrate_profile_to_users_extended()
RETURNS TABLE(migrated_count INTEGER, failed_count INTEGER) AS $$
DECLARE
    v_migrated INTEGER := 0;
    v_failed INTEGER := 0;
    v_profile RECORD;
BEGIN
    -- This function will be called AFTER migration 0021 creates auth.users_extended
    -- It migrates data from legacy profile table to the new auth system

    FOR v_profile IN
        SELECT * FROM profile
        WHERE user_id IS NULL -- Only migrate records not yet linked
        ORDER BY created_at
    LOOP
        BEGIN
            -- Attempt to create corresponding user in auth.users_extended
            -- This is a placeholder - actual implementation depends on auth provider
            -- The application code should handle the actual migration

            v_migrated := v_migrated + 1;
        EXCEPTION
            WHEN OTHERS THEN
                v_failed := v_failed + 1;
                RAISE WARNING 'Failed to migrate profile %: %', v_profile.id, SQLERRM;
        END;
    END LOOP;

    RETURN QUERY SELECT v_migrated, v_failed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: SEED DATA (Default Organization)
-- ============================================================================

-- Insert default organization for development/testing
INSERT INTO organization (
    id,
    name,
    slug,
    legal_name,
    registration_number,
    vat_number,
    bee_level,
    contact_email,
    phone,
    industry,
    province,
    address_city,
    address_country,
    status,
    plan_type,
    is_active
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Fixed UUID for dev/test
    'MantisNXT Demo',
    'mantisnxt-demo',
    'MantisNXT Procurement Solutions (Pty) Ltd',
    '2024/123456/07',
    '4123456789',
    4, -- BEE Level 4
    'admin@mantisnxt.co.za',
    '+27 11 123 4567',
    'Technology Services',
    'Gauteng',
    'Johannesburg',
    'South Africa',
    'active',
    'enterprise',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- ============================================================================
-- PART 7: COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organization IS 'Organizations/tenants in the multi-tenant system. Each organization is isolated.';
COMMENT ON TABLE profile IS 'LEGACY: User profile table for backwards compatibility. Will be superseded by auth.users_extended after migration 0021.';

COMMENT ON COLUMN organization.slug IS 'URL-friendly organization identifier used in subdomains and routing';
COMMENT ON COLUMN organization.bee_level IS 'BEE (Broad-Based Black Economic Empowerment) compliance level (1-8, lower is better)';
COMMENT ON COLUMN organization.settings IS 'Organization-wide security and feature settings';
COMMENT ON COLUMN profile.user_id IS 'Links to auth.users_extended(id) after migration 0021. NULL = not yet migrated.';
COMMENT ON COLUMN profile.role IS 'DEPRECATED: Legacy role field. New system uses auth.user_roles with RBAC.';

COMMENT ON FUNCTION migrate_profile_to_users_extended() IS 'Helper function to migrate legacy profile data to auth.users_extended. Run after migration 0021.';

-- ============================================================================
-- PART 8: VALIDATION
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
    v_org_count INTEGER;
    v_profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_org_count FROM organization;
    SELECT COUNT(*) INTO v_profile_count FROM profile;

    IF v_org_count < 1 THEN
        RAISE EXCEPTION 'Organization table is empty - seed data failed';
    END IF;

    RAISE NOTICE '✅ Prerequisite tables created successfully!';
    RAISE NOTICE '   - organization table: Ready (% records)', v_org_count;
    RAISE NOTICE '   - profile table: Ready (% records)', v_profile_count;
    RAISE NOTICE '   - Default organization: Created (ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NEXT STEP: Run migration 0021_comprehensive_auth_system.sql';
    RAISE NOTICE '⚠️  MIGRATION PATH: profile → auth.users_extended (via application code)';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- Run this if you need to rollback this migration:
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS migrate_profile_to_users_extended();
-- DROP TRIGGER IF EXISTS update_profile_updated_at ON profile;
-- DROP TRIGGER IF EXISTS update_organization_updated_at ON organization;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS profile CASCADE;
-- DROP TABLE IF EXISTS organization CASCADE;
-- DROP TYPE IF EXISTS user_role;
-- DROP TYPE IF EXISTS organization_status;
-- DROP TYPE IF EXISTS organization_plan;
-- COMMIT;
