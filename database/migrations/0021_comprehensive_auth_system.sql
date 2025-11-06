-- ============================================================================
-- Migration: 0021_comprehensive_auth_system.sql
-- Description: Comprehensive Role-Based Authentication System with Neon Auth Integration
-- Author: AS Team (Auth & Security)
-- Date: 2025-11-04
-- Dependencies: Requires 0001_init_core.sql (organization, profile tables)
-- ============================================================================

-- ============================================================================
-- PART 1: ENUMS AND TYPES
-- ============================================================================

-- User role types (extends existing user_role enum if needed)
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'super_admin',
        'admin',
        'manager',
        'user',
        'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Permission action types
CREATE TYPE permission_action AS ENUM (
    'create',
    'read',
    'update',
    'delete',
    'manage',
    'execute'
);

-- Session status
CREATE TYPE session_status AS ENUM (
    'active',
    'expired',
    'revoked',
    'suspicious'
);

-- Audit event types (extends existing audit_action)
CREATE TYPE audit_event_type AS ENUM (
    'login',
    'logout',
    'login_failed',
    'password_changed',
    'password_reset_requested',
    'password_reset_completed',
    'two_factor_enabled',
    'two_factor_disabled',
    'two_factor_verified',
    'role_changed',
    'permission_granted',
    'permission_revoked',
    'user_created',
    'user_updated',
    'user_deleted',
    'user_suspended',
    'user_activated',
    'session_created',
    'session_terminated',
    'security_event',
    'data_export',
    'data_import',
    'settings_changed'
);

-- Employment equity (BEE compliance - South African)
CREATE TYPE employment_equity_type AS ENUM (
    'african',
    'coloured',
    'indian',
    'white',
    'other',
    'prefer_not_to_say'
);

-- BEE status levels
CREATE TYPE bee_status_type AS ENUM (
    'level_1',
    'level_2',
    'level_3',
    'level_4',
    'level_5',
    'level_6',
    'level_7',
    'level_8',
    'non_compliant'
);

-- ============================================================================
-- PART 2: CORE AUTHENTICATION TABLES
-- ============================================================================

-- Enhanced users table (extends Supabase auth.users)
-- Links to both Supabase auth and Neon Auth (Stack Auth)
CREATE TABLE IF NOT EXISTS auth.users_extended (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to Supabase auth.users (if using Supabase Auth)
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Neon Auth (Stack Auth) integration
    stack_auth_user_id TEXT UNIQUE, -- Stack Auth user ID
    stack_auth_provider TEXT, -- 'stack', 'google', 'github', etc.

    -- Basic information
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,

    -- Profile
    first_name TEXT,
    last_name TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    mobile TEXT,

    -- Organization
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    department TEXT,
    job_title TEXT,
    employee_id TEXT,

    -- South African compliance fields
    id_number TEXT, -- SA ID number
    employment_equity employment_equity_type,
    bee_status bee_status_type,

    -- Address
    address_street TEXT,
    address_suburb TEXT,
    address_city TEXT,
    address_province TEXT,
    address_postal_code TEXT,
    address_country TEXT DEFAULT 'South Africa',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID REFERENCES auth.users_extended(id),
    suspension_reason TEXT,

    -- Security
    password_hash TEXT, -- For local auth, nullable if using external provider
    password_changed_at TIMESTAMPTZ,
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- Two-factor authentication
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT, -- Encrypted TOTP secret
    two_factor_backup_codes TEXT[], -- Encrypted backup codes
    two_factor_enabled_at TIMESTAMPTZ,

    -- Session management
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_activity_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete

    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_display_name CHECK (LENGTH(display_name) >= 1 AND LENGTH(display_name) <= 100),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-\(\)]+$')
);

-- Create indexes for users_extended
CREATE INDEX idx_users_extended_org_id ON auth.users_extended(org_id);
CREATE INDEX idx_users_extended_email ON auth.users_extended(email);
CREATE INDEX idx_users_extended_stack_auth_id ON auth.users_extended(stack_auth_user_id);
CREATE INDEX idx_users_extended_active ON auth.users_extended(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_extended_department ON auth.users_extended(org_id, department);
CREATE INDEX idx_users_extended_last_login ON auth.users_extended(last_login_at DESC);

-- ============================================================================
-- PART 3: ROLES AND PERMISSIONS
-- ============================================================================

-- Roles table (hierarchical role definitions)
CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

    -- Role details
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL-friendly identifier
    description TEXT,

    -- Role type (system-defined or custom)
    is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be deleted if true
    role_level INTEGER DEFAULT 0, -- Higher = more permissions

    -- Hierarchy
    parent_role_id UUID REFERENCES auth.roles(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users_extended(id),

    -- Constraints
    CONSTRAINT unique_role_slug_per_org UNIQUE(org_id, slug),
    CONSTRAINT valid_role_name CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 50),
    CONSTRAINT valid_role_slug CHECK (slug ~ '^[a-z0-9_-]+$')
);

-- Permissions table (atomic permission definitions)
CREATE TABLE IF NOT EXISTS auth.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Permission details
    name TEXT NOT NULL UNIQUE, -- e.g., 'users:read', 'orders:create'
    resource TEXT NOT NULL, -- e.g., 'users', 'orders', 'inventory'
    action permission_action NOT NULL,
    description TEXT,

    -- Conditions for attribute-based access control (ABAC)
    conditions JSONB DEFAULT '[]'::JSONB, -- Array of condition objects

    -- System permission (cannot be deleted)
    is_system_permission BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_permission_resource_action UNIQUE(resource, action),
    CONSTRAINT valid_permission_name CHECK (name ~ '^[a-z0-9_:]+$')
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS auth.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,

    -- Optional constraints/conditions for this specific assignment
    constraints JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users_extended(id),

    -- Constraints
    CONSTRAINT unique_role_permission UNIQUE(role_id, permission_id)
);

-- User-Role mapping (many-to-many)
CREATE TABLE IF NOT EXISTS auth.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,

    -- Effective dates (for temporary role assignments)
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users_extended(id),

    -- Constraints
    CONSTRAINT unique_user_role UNIQUE(user_id, role_id),
    CONSTRAINT valid_effective_dates CHECK (
        effective_until IS NULL OR effective_until > effective_from
    )
);

-- User-specific permission overrides (for granular control)
CREATE TABLE IF NOT EXISTS auth.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,

    -- Grant or deny (allows explicit denials)
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,

    -- Optional constraints/conditions
    constraints JSONB DEFAULT '{}',

    -- Effective dates
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users_extended(id),

    -- Constraints
    CONSTRAINT unique_user_permission UNIQUE(user_id, permission_id)
);

-- Create indexes for roles and permissions
CREATE INDEX idx_roles_org_id ON auth.roles(org_id);
CREATE INDEX idx_roles_slug ON auth.roles(org_id, slug);
CREATE INDEX idx_role_permissions_role ON auth.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON auth.role_permissions(permission_id);
CREATE INDEX idx_user_roles_user ON auth.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON auth.user_roles(role_id);
CREATE INDEX idx_user_permissions_user ON auth.user_permissions(user_id);

-- ============================================================================
-- PART 4: SESSION MANAGEMENT
-- ============================================================================

-- Active sessions table (tracks all user sessions)
CREATE TABLE IF NOT EXISTS auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,

    -- Session tokens
    session_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,

    -- Device information
    device_name TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    device_fingerprint TEXT,
    user_agent TEXT,

    -- Location
    ip_address INET NOT NULL,
    country TEXT,
    city TEXT,

    -- Status
    status session_status DEFAULT 'active',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users_extended(id),
    revocation_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create indexes for sessions
CREATE INDEX idx_sessions_user_id ON auth.user_sessions(user_id);
CREATE INDEX idx_sessions_token ON auth.user_sessions(session_token);
CREATE INDEX idx_sessions_status ON auth.user_sessions(status) WHERE status = 'active';
CREATE INDEX idx_sessions_expires ON auth.user_sessions(expires_at) WHERE status = 'active';

-- ============================================================================
-- PART 5: ENHANCED AUDIT LOGGING
-- ============================================================================

-- Comprehensive audit trail
CREATE TABLE IF NOT EXISTS auth.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization and user
    org_id UUID REFERENCES organization(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    session_id UUID REFERENCES auth.user_sessions(id) ON DELETE SET NULL,

    -- Event details
    event_type audit_event_type NOT NULL,
    event_category TEXT, -- 'authentication', 'authorization', 'data_access', etc.
    severity TEXT DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'

    -- Resource details
    resource_type TEXT, -- 'user', 'role', 'permission', etc.
    resource_id UUID,
    resource_name TEXT,

    -- Action details
    action TEXT NOT NULL, -- Detailed action description
    status TEXT DEFAULT 'success', -- 'success', 'failure', 'warning'

    -- Changes
    old_values JSONB,
    new_values JSONB,
    changes JSONB, -- Computed diff

    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'warning', 'pending'))
);

-- Create indexes for audit events
CREATE INDEX idx_audit_org_id ON auth.audit_events(org_id);
CREATE INDEX idx_audit_user_id ON auth.audit_events(user_id);
CREATE INDEX idx_audit_event_type ON auth.audit_events(event_type);
CREATE INDEX idx_audit_created_at ON auth.audit_events(created_at DESC);
CREATE INDEX idx_audit_severity ON auth.audit_events(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_audit_resource ON auth.audit_events(resource_type, resource_id);

-- Login history (optimized for quick lookups)
CREATE TABLE IF NOT EXISTS auth.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,

    -- Attempt details
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,

    -- Location and device
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_type TEXT,
    country TEXT,
    city TEXT,

    -- Two-factor
    two_factor_used BOOLEAN DEFAULT FALSE,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for login history
CREATE INDEX idx_login_history_user_id ON auth.login_history(user_id);
CREATE INDEX idx_login_history_email ON auth.login_history(email);
CREATE INDEX idx_login_history_created_at ON auth.login_history(created_at DESC);
CREATE INDEX idx_login_history_failed ON auth.login_history(success) WHERE success = FALSE;

-- ============================================================================
-- PART 6: USER PREFERENCES AND CUSTOMIZATION
-- ============================================================================

-- User preferences (detailed settings)
CREATE TABLE IF NOT EXISTS auth.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users_extended(id) ON DELETE CASCADE,

    -- Localization
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'Africa/Johannesburg',
    date_format TEXT DEFAULT 'dd/mm/yyyy',
    time_format TEXT DEFAULT '24h',
    currency TEXT DEFAULT 'ZAR',

    -- Notifications
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    notification_digest_frequency TEXT DEFAULT 'daily', -- 'realtime', 'daily', 'weekly', 'never'

    -- UI preferences
    theme TEXT DEFAULT 'light', -- 'light', 'dark', 'auto'
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    dashboard_layout JSONB DEFAULT '[]'::JSONB, -- Widget configuration
    quick_actions JSONB DEFAULT '[]'::JSONB,

    -- Privacy
    profile_visibility TEXT DEFAULT 'organization', -- 'public', 'organization', 'private'
    show_email BOOLEAN DEFAULT FALSE,
    show_phone BOOLEAN DEFAULT FALSE,

    -- Accessibility
    high_contrast BOOLEAN DEFAULT FALSE,
    reduced_motion BOOLEAN DEFAULT FALSE,
    screen_reader_optimized BOOLEAN DEFAULT FALSE,

    -- Other preferences
    preferences JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 7: SYSTEM CONFIGURATION
-- ============================================================================

-- System-wide configuration settings
CREATE TABLE IF NOT EXISTS auth.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

    -- Configuration key-value
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL,

    -- Metadata
    description TEXT,
    is_secret BOOLEAN DEFAULT FALSE, -- If true, value should be encrypted
    category TEXT, -- 'security', 'features', 'integrations', etc.

    -- Version control
    version INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users_extended(id),

    -- Constraints
    CONSTRAINT unique_config_key_per_org UNIQUE(org_id, config_key)
);

-- Feature flags
CREATE TABLE IF NOT EXISTS auth.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organization(id) ON DELETE CASCADE, -- NULL = global

    -- Flag details
    flag_key TEXT NOT NULL,
    flag_name TEXT NOT NULL,
    description TEXT,

    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,

    -- Rollout (gradual feature activation)
    rollout_percentage INTEGER DEFAULT 100, -- 0-100
    rollout_user_ids UUID[], -- Specific users who have access
    rollout_rules JSONB DEFAULT '[]'::JSONB,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_flag_key_per_org UNIQUE(org_id, flag_key),
    CONSTRAINT valid_rollout_percentage CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);

-- ============================================================================
-- PART 8: HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION auth.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION auth.user_has_permission(
    p_user_id UUID,
    p_permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- Check direct user permission grants
    SELECT EXISTS(
        SELECT 1
        FROM auth.user_permissions up
        JOIN auth.permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id
          AND p.name = p_permission_name
          AND up.is_granted = TRUE
          AND (up.effective_until IS NULL OR up.effective_until > NOW())
    ) INTO v_has_permission;

    IF v_has_permission THEN
        RETURN TRUE;
    END IF;

    -- Check permissions through roles
    SELECT EXISTS(
        SELECT 1
        FROM auth.user_roles ur
        JOIN auth.role_permissions rp ON ur.role_id = rp.role_id
        JOIN auth.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
          AND p.name = p_permission_name
          AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION auth.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Direct permissions
    SELECT DISTINCT p.name, p.resource, p.action::TEXT
    FROM auth.user_permissions up
    JOIN auth.permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
      AND up.is_granted = TRUE
      AND (up.effective_until IS NULL OR up.effective_until > NOW())

    UNION

    -- Role-based permissions
    SELECT DISTINCT p.name, p.resource, p.action::TEXT
    FROM auth.user_roles ur
    JOIN auth.role_permissions rp ON ur.role_id = rp.role_id
    JOIN auth.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND (ur.effective_until IS NULL OR ur.effective_until > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit event
CREATE OR REPLACE FUNCTION auth.log_audit_event(
    p_org_id UUID,
    p_user_id UUID,
    p_event_type audit_event_type,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO auth.audit_events (
        org_id, user_id, event_type, action,
        resource_type, resource_id, old_values, new_values, metadata
    )
    VALUES (
        p_org_id, p_user_id, p_event_type, p_action,
        p_resource_type, p_resource_id, p_old_values, p_new_values, p_metadata
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at on users_extended
CREATE TRIGGER update_users_extended_updated_at
    BEFORE UPDATE ON auth.users_extended
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_updated_at_column();

-- Trigger: Update updated_at on roles
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON auth.roles
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_updated_at_column();

-- Trigger: Update updated_at on user_preferences
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON auth.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_updated_at_column();

-- Trigger: Update updated_at on system_config
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON auth.system_config
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_updated_at_column();

-- Trigger: Audit user changes
CREATE OR REPLACE FUNCTION auth.audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        PERFORM auth.log_audit_event(
            NEW.org_id,
            NEW.id,
            'user_updated'::audit_event_type,
            'User profile updated',
            'user',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM auth.log_audit_event(
            NEW.org_id,
            NEW.id,
            'user_created'::audit_event_type,
            'User account created',
            'user',
            NEW.id,
            NULL,
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_users_extended_changes
    AFTER INSERT OR UPDATE ON auth.users_extended
    FOR EACH ROW
    EXECUTE FUNCTION auth.audit_user_changes();

-- ============================================================================
-- PART 10: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE auth.users_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own data
CREATE POLICY users_select_own
    ON auth.users_extended FOR SELECT
    USING (id = auth.uid() OR org_id IN (
        SELECT org_id FROM auth.users_extended WHERE id = auth.uid()
    ));

-- RLS Policy: Admins can manage users in their organization
CREATE POLICY users_admin_all
    ON auth.users_extended FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.user_roles ur
            JOIN auth.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.slug IN ('super_admin', 'admin')
              AND ur.user_id IN (SELECT id FROM auth.users_extended WHERE org_id = users_extended.org_id)
        )
    );

-- RLS Policy: Users can read roles in their organization
CREATE POLICY roles_select_org
    ON auth.roles FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM auth.users_extended WHERE id = auth.uid()
    ));

-- RLS Policy: Admins can manage roles
CREATE POLICY roles_admin_all
    ON auth.roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.user_roles ur
            JOIN auth.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.slug IN ('super_admin', 'admin')
        )
    );

-- RLS Policy: Users can read their own sessions
CREATE POLICY sessions_select_own
    ON auth.user_sessions FOR SELECT
    USING (user_id = auth.uid());

-- RLS Policy: Users can revoke their own sessions
CREATE POLICY sessions_delete_own
    ON auth.user_sessions FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policy: Users can read audit events in their organization
CREATE POLICY audit_select_org
    ON auth.audit_events FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM auth.users_extended WHERE id = auth.uid()
    ));

-- RLS Policy: Users can read their own preferences
CREATE POLICY preferences_select_own
    ON auth.user_preferences FOR SELECT
    USING (user_id = auth.uid());

-- RLS Policy: Users can update their own preferences
CREATE POLICY preferences_update_own
    ON auth.user_preferences FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================================
-- PART 11: SEED DATA (SYSTEM ROLES AND PERMISSIONS)
-- ============================================================================

-- Insert system permissions
INSERT INTO auth.permissions (name, resource, action, description, is_system_permission) VALUES
    -- User management
    ('users:create', 'users', 'create', 'Create new users', TRUE),
    ('users:read', 'users', 'read', 'View user information', TRUE),
    ('users:update', 'users', 'update', 'Update user information', TRUE),
    ('users:delete', 'users', 'delete', 'Delete users', TRUE),
    ('users:manage', 'users', 'manage', 'Full user management access', TRUE),

    -- Role management
    ('roles:create', 'roles', 'create', 'Create new roles', TRUE),
    ('roles:read', 'roles', 'read', 'View roles', TRUE),
    ('roles:update', 'roles', 'update', 'Update roles', TRUE),
    ('roles:delete', 'roles', 'delete', 'Delete roles', TRUE),
    ('roles:manage', 'roles', 'manage', 'Full role management access', TRUE),

    -- Permission management
    ('permissions:read', 'permissions', 'read', 'View permissions', TRUE),
    ('permissions:manage', 'permissions', 'manage', 'Manage permissions', TRUE),

    -- System configuration
    ('system:read', 'system', 'read', 'View system configuration', TRUE),
    ('system:update', 'system', 'update', 'Update system configuration', TRUE),
    ('system:manage', 'system', 'manage', 'Full system management access', TRUE),

    -- Audit logs
    ('audit:read', 'audit', 'read', 'View audit logs', TRUE),

    -- Organization management
    ('organization:read', 'organization', 'read', 'View organization information', TRUE),
    ('organization:update', 'organization', 'update', 'Update organization information', TRUE),
    ('organization:manage', 'organization', 'manage', 'Full organization management', TRUE)
ON CONFLICT (resource, action) DO NOTHING;

-- Note: System roles will be created per-organization through the application
-- as they require organization context. See migration documentation for details.

-- ============================================================================
-- PART 12: COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE auth.users_extended IS 'Extended user profiles with Neon Auth integration';
COMMENT ON TABLE auth.roles IS 'Role definitions for RBAC system';
COMMENT ON TABLE auth.permissions IS 'Atomic permission definitions';
COMMENT ON TABLE auth.role_permissions IS 'Many-to-many mapping between roles and permissions';
COMMENT ON TABLE auth.user_roles IS 'User role assignments with temporal support';
COMMENT ON TABLE auth.user_permissions IS 'User-specific permission overrides';
COMMENT ON TABLE auth.user_sessions IS 'Active user sessions with device tracking';
COMMENT ON TABLE auth.audit_events IS 'Comprehensive audit trail for all system events';
COMMENT ON TABLE auth.login_history IS 'Login attempt history for security monitoring';
COMMENT ON TABLE auth.user_preferences IS 'User-specific preferences and customization';
COMMENT ON TABLE auth.system_config IS 'System-wide configuration settings';
COMMENT ON TABLE auth.feature_flags IS 'Feature flag management for gradual rollouts';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
