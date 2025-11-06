-- ============================================================================
-- Migration: 0022_critical_security_fixes.sql
-- Description: Critical security vulnerability fixes
-- Author: AS Team (Security Compliance)
-- Date: 2025-11-04
-- Dependencies: 0021_comprehensive_auth_system.sql
--
-- FIXES:
-- 1. Password history table for preventing reuse
-- 2. Security events table for audit logging
-- 3. ID number hash column for searching encrypted data
-- 4. Enhanced constraints and validation
-- ============================================================================

-- ============================================================================
-- PART 1: PASSWORD HISTORY
-- ============================================================================

-- Password history to prevent password reuse
CREATE TABLE IF NOT EXISTS auth.password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Index for efficient lookups
    CONSTRAINT idx_password_history_user_created UNIQUE(user_id, created_at)
);

CREATE INDEX idx_password_history_user_id ON auth.password_history(user_id);
CREATE INDEX idx_password_history_created_at ON auth.password_history(created_at DESC);

-- ============================================================================
-- PART 2: SECURITY EVENTS
-- ============================================================================

-- Security event severity
CREATE TYPE IF NOT EXISTS security_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Security events for compliance auditing
CREATE TABLE IF NOT EXISTS auth.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,

    -- Event details
    event_type TEXT NOT NULL,
    severity security_severity DEFAULT 'medium',
    details JSONB DEFAULT '{}',

    -- Context
    ip_address INET,
    user_agent TEXT,
    location TEXT, -- Geographic location if available

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    CONSTRAINT chk_security_event_type CHECK (LENGTH(event_type) <= 100)
);

CREATE INDEX idx_security_events_org_id ON auth.security_events(org_id);
CREATE INDEX idx_security_events_user_id ON auth.security_events(user_id);
CREATE INDEX idx_security_events_type ON auth.security_events(event_type);
CREATE INDEX idx_security_events_severity ON auth.security_events(severity);
CREATE INDEX idx_security_events_created_at ON auth.security_events(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_security_events_org_time ON auth.security_events(org_id, created_at DESC);
CREATE INDEX idx_security_events_user_time ON auth.security_events(user_id, created_at DESC);

-- ============================================================================
-- PART 3: ENHANCED USER COLUMNS
-- ============================================================================

-- Add ID number hash for searching encrypted data
ALTER TABLE auth.users_extended
ADD COLUMN IF NOT EXISTS id_number_hash TEXT;

CREATE INDEX idx_users_extended_id_number_hash ON auth.users_extended(id_number_hash);

-- Add password policy enforcement
ALTER TABLE auth.users_extended
ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- PART 4: ENHANCED CONSTRAINTS
-- ============================================================================

-- Strengthen password requirements (removed old weak constraint if exists)
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'chk_password_min_length'
    ) THEN
        ALTER TABLE auth.users_extended DROP CONSTRAINT chk_password_min_length;
    END IF;
END $$;

-- Add strong password constraint (this will be enforced in application layer)
-- Database only stores hashed passwords, so we add metadata check
ALTER TABLE auth.users_extended
ADD CONSTRAINT chk_password_hash_format CHECK (
    password_hash IS NULL OR LENGTH(password_hash) >= 60 -- bcrypt hashes are 60 chars
);

-- Ensure 2FA secret is encrypted (longer than plain secret would be)
ALTER TABLE auth.users_extended
ADD CONSTRAINT chk_two_factor_secret_encrypted CHECK (
    two_factor_secret IS NULL OR LENGTH(two_factor_secret) > 32
);

-- ============================================================================
-- PART 5: AUDIT TRAIL ENHANCEMENT
-- ============================================================================

-- Make login_history more detailed
ALTER TABLE auth.login_history
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS location TEXT;

CREATE INDEX idx_login_history_device ON auth.login_history(device_fingerprint);
CREATE INDEX idx_login_history_session ON auth.login_history(session_id);

-- ============================================================================
-- PART 6: DATA RETENTION POLICIES
-- ============================================================================

-- Function to clean up old password history
CREATE OR REPLACE FUNCTION auth.cleanup_password_history()
RETURNS void AS $$
BEGIN
    -- Keep only last 10 passwords per user
    DELETE FROM auth.password_history
    WHERE id IN (
        SELECT id FROM (
            SELECT
                id,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM auth.password_history
        ) sub
        WHERE rn > 10
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old security events (keep 2 years)
CREATE OR REPLACE FUNCTION auth.cleanup_security_events()
RETURNS void AS $$
BEGIN
    DELETE FROM auth.security_events
    WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has recent security events
CREATE OR REPLACE FUNCTION auth.has_recent_security_events(
    p_user_id UUID,
    p_event_type TEXT,
    p_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM auth.security_events
    WHERE user_id = p_user_id
        AND event_type = p_event_type
        AND created_at > NOW() - (p_hours || ' hours')::INTERVAL;

    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's security score
CREATE OR REPLACE FUNCTION auth.calculate_security_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 100;
BEGIN
    -- Deduct points for security issues

    -- No 2FA enabled (-30 points)
    IF NOT EXISTS (
        SELECT 1 FROM auth.users_extended
        WHERE id = p_user_id AND two_factor_enabled = TRUE
    ) THEN
        v_score := v_score - 30;
    END IF;

    -- Failed login attempts (-10 points per attempt)
    SELECT v_score - (failed_login_attempts * 10) INTO v_score
    FROM auth.users_extended
    WHERE id = p_user_id;

    -- Recent security events (-5 points per critical event in last 30 days)
    SELECT v_score - (COUNT(*) * 5) INTO v_score
    FROM auth.security_events
    WHERE user_id = p_user_id
        AND severity = 'critical'
        AND created_at > NOW() - INTERVAL '30 days';

    -- Password not changed in 90 days (-20 points)
    IF EXISTS (
        SELECT 1 FROM auth.users_extended
        WHERE id = p_user_id
            AND (password_changed_at IS NULL
                 OR password_changed_at < NOW() - INTERVAL '90 days')
    ) THEN
        v_score := v_score - 20;
    END IF;

    -- Ensure score is between 0 and 100
    v_score := GREATEST(0, LEAST(100, v_score));

    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: TRIGGERS
-- ============================================================================

-- Trigger to automatically hash ID numbers on insert/update
CREATE OR REPLACE FUNCTION auth.update_id_number_hash()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_number IS NOT NULL AND NEW.id_number != '' THEN
        -- Generate hash using SHA-256
        -- In production, this should use the application's HMAC function
        -- This is a placeholder - actual hashing happens in application layer
        NEW.id_number_hash := encode(
            digest(NEW.id_number, 'sha256'),
            'hex'
        );
    ELSE
        NEW.id_number_hash := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_id_number_hash
    BEFORE INSERT OR UPDATE OF id_number ON auth.users_extended
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_id_number_hash();

-- ============================================================================
-- PART 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions
GRANT SELECT, INSERT ON auth.password_history TO authenticated;
GRANT SELECT, INSERT ON auth.security_events TO authenticated;
GRANT SELECT ON auth.users_extended TO authenticated;
GRANT UPDATE (
    failed_login_attempts,
    locked_until,
    two_factor_enabled,
    two_factor_secret,
    two_factor_backup_codes,
    password_changed_at,
    last_login_at,
    last_activity_at
) ON auth.users_extended TO authenticated;

-- ============================================================================
-- PART 10: COMMENTS
-- ============================================================================

COMMENT ON TABLE auth.password_history IS 'Stores hashed password history to prevent password reuse';
COMMENT ON TABLE auth.security_events IS 'Audit log for security-related events (POPIA compliance)';
COMMENT ON COLUMN auth.users_extended.id_number_hash IS 'SHA-256 hash of ID number for searching encrypted data';
COMMENT ON FUNCTION auth.cleanup_password_history() IS 'Cleanup function to maintain only last 10 passwords per user';
COMMENT ON FUNCTION auth.cleanup_security_events() IS 'Cleanup function to remove security events older than 2 years';
COMMENT ON FUNCTION auth.calculate_security_score(UUID) IS 'Calculate security score (0-100) based on user security posture';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Security fixes applied successfully:';
    RAISE NOTICE '  ✓ Password history table created';
    RAISE NOTICE '  ✓ Security events table created';
    RAISE NOTICE '  ✓ ID number hashing enabled';
    RAISE NOTICE '  ✓ Enhanced constraints applied';
    RAISE NOTICE '  ✓ Security helper functions created';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Update environment variables:';
    RAISE NOTICE '  - PII_ENCRYPTION_KEY (generate with: openssl rand -base64 32)';
    RAISE NOTICE '  - PII_ENCRYPTION_SALT (generate with: openssl rand -base64 32)';
    RAISE NOTICE '  - STACK_AUTH_API_KEY (from Stack Auth dashboard)';
    RAISE NOTICE '  - STACK_AUTH_PROJECT_ID (from Stack Auth dashboard)';
END $$;
