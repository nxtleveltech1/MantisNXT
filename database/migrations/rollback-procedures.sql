-- ============================================================================
-- Rollback Procedures: rollback-procedures.sql
-- Description: Safe rollback procedures for auth system migrations
-- Author: AS Team - Database Admin
-- Date: 2025-11-04
--
-- WARNING: Rolling back these migrations will DELETE all authentication data!
-- Use with extreme caution and only in emergency situations.
--
-- ROLLBACK ORDER (must be followed):
-- 1. Rollback 0022_critical_fixes.sql (advanced features)
-- 2. Rollback 0021_comprehensive_auth_system_FIXED.sql (core auth)
-- 3. Rollback 0001_prerequisite_core_tables.sql (base tables)
-- ============================================================================

-- ============================================================================
-- ROLLBACK: 0022_critical_fixes.sql
-- Description: Remove advanced optimizations and features
-- ============================================================================

\echo ''
\echo '⚠️  ROLLBACK: 0022 Critical Fixes'
\echo ''
\prompt 'Are you sure you want to rollback 0022_critical_fixes? (yes/no): ' confirm_0022

\if :'confirm_0022' = 'yes'

BEGIN;

RAISE NOTICE 'Rolling back 0022_critical_fixes.sql...';

-- Drop performance monitoring functions
DROP FUNCTION IF EXISTS auth.get_slow_queries() CASCADE;
DROP FUNCTION IF EXISTS auth.get_table_sizes() CASCADE;
DROP FUNCTION IF EXISTS auth.get_system_health() CASCADE;

-- Drop admin panel views
DROP VIEW IF EXISTS auth.v_user_permission_matrix CASCADE;
DROP VIEW IF EXISTS auth.v_login_failures_analysis CASCADE;
DROP VIEW IF EXISTS auth.v_security_audit_recent CASCADE;
DROP VIEW IF EXISTS auth.v_active_sessions_summary CASCADE;
DROP VIEW IF EXISTS auth.v_role_permissions_matrix CASCADE;
DROP VIEW IF EXISTS auth.v_user_management CASCADE;

-- Drop partition functions
DROP FUNCTION IF EXISTS auth.archive_old_partitions(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS auth.create_monthly_partition(TEXT, INTEGER) CASCADE;

-- Drop partitioned tables (if they exist)
DO $$
DECLARE
    v_partition RECORD;
BEGIN
    -- Drop all partitions
    FOR v_partition IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'auth'
        AND tablename LIKE 'audit_events_%'
        AND tablename != 'audit_events'
        AND tablename != 'audit_events_partitioned'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS auth.%I CASCADE', v_partition.tablename);
    END LOOP;
END $$;

DROP TABLE IF EXISTS auth.audit_events_partitioned CASCADE;

-- Drop session cleanup
DROP VIEW IF EXISTS auth.v_session_health CASCADE;
DROP FUNCTION IF EXISTS auth.cleanup_expired_sessions(INTEGER) CASCADE;

-- Drop role hierarchy validation
DROP TRIGGER IF EXISTS validate_role_hierarchy_trigger ON auth.roles;
DROP FUNCTION IF EXISTS auth.validate_role_hierarchy() CASCADE;
DROP FUNCTION IF EXISTS auth.detect_role_hierarchy_cycle(UUID, UUID) CASCADE;

-- Drop 2FA encryption
DROP FUNCTION IF EXISTS auth.set_user_2fa_secret(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS auth.get_user_2fa_secret(UUID) CASCADE;
ALTER TABLE auth.users_extended DROP COLUMN IF EXISTS two_factor_secret_encrypted CASCADE;
DROP FUNCTION IF EXISTS auth.decrypt_secret(BYTEA) CASCADE;
DROP FUNCTION IF EXISTS auth.encrypt_secret(TEXT) CASCADE;

-- Drop additional indexes created in 0022
DROP INDEX IF EXISTS auth.idx_login_history_analysis;
DROP INDEX IF EXISTS auth.idx_audit_events_org_type_severity;
DROP INDEX IF EXISTS auth.idx_user_sessions_cleanup;
DROP INDEX IF EXISTS auth.idx_user_roles_effective_dates;
DROP INDEX IF EXISTS auth.idx_users_extended_org_dept_active;
DROP INDEX IF EXISTS auth.idx_users_extended_org_active_email;

-- Drop optimized RLS policies
DROP POLICY IF EXISTS users_service_bypass ON auth.users_extended;
DROP POLICY IF EXISTS users_admin_manage_org ON auth.users_extended;
DROP POLICY IF EXISTS users_select_org_optimized ON auth.users_extended;
DROP POLICY IF EXISTS roles_admin_manage ON auth.roles;
DROP POLICY IF EXISTS roles_select_org_optimized ON auth.roles;
DROP POLICY IF EXISTS audit_select_org_optimized ON auth.audit_events;

RAISE NOTICE '✅ Rollback 0022 complete';

COMMIT;

\echo '✅ Rollback of 0022_critical_fixes.sql completed'
\echo ''

\else
\echo '❌ Rollback of 0022 cancelled'
\echo ''
\endif

-- ============================================================================
-- ROLLBACK: 0021_comprehensive_auth_system_FIXED.sql
-- Description: Remove core authentication system
-- ============================================================================

\echo ''
\echo '⚠️  ROLLBACK: 0021 Comprehensive Auth System'
\echo '⚠️  WARNING: This will delete ALL authentication data!'
\echo ''
\prompt 'Are you ABSOLUTELY sure you want to rollback 0021? (YES in capital letters): ' confirm_0021

\if :'confirm_0021' = 'YES'

BEGIN;

RAISE NOTICE 'Rolling back 0021_comprehensive_auth_system_FIXED.sql...';

-- Drop RLS policies
DROP POLICY IF EXISTS preferences_update_own ON auth.user_preferences;
DROP POLICY IF EXISTS preferences_select_own ON auth.user_preferences;
DROP POLICY IF EXISTS sessions_delete_own ON auth.user_sessions;
DROP POLICY IF EXISTS sessions_select_own ON auth.user_sessions;
DROP POLICY IF EXISTS users_service_all ON auth.users_extended;
DROP POLICY IF EXISTS users_select_own ON auth.users_extended;

-- Disable RLS
ALTER TABLE auth.feature_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.system_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.login_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.audit_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users_extended DISABLE ROW LEVEL SECURITY;

-- Drop triggers
DROP TRIGGER IF EXISTS audit_users_extended_changes ON auth.users_extended;
DROP TRIGGER IF EXISTS update_system_config_updated_at ON auth.system_config;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON auth.user_preferences;
DROP TRIGGER IF EXISTS update_roles_updated_at ON auth.roles;
DROP TRIGGER IF EXISTS update_users_extended_updated_at ON auth.users_extended;

-- Drop functions
DROP FUNCTION IF EXISTS auth.audit_user_changes() CASCADE;
DROP FUNCTION IF EXISTS auth.log_audit_event(UUID, UUID, audit_event_type, TEXT, TEXT, UUID, JSONB, JSONB, JSONB) CASCADE;
DROP FUNCTION IF EXISTS auth.get_user_permissions(UUID) CASCADE;
DROP FUNCTION IF EXISTS auth.user_has_permission(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS auth.update_updated_at_column() CASCADE;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS auth.feature_flags CASCADE;
DROP TABLE IF EXISTS auth.system_config CASCADE;
DROP TABLE IF EXISTS auth.user_preferences CASCADE;
DROP TABLE IF EXISTS auth.login_history CASCADE;
DROP TABLE IF EXISTS auth.audit_events CASCADE;
DROP TABLE IF EXISTS auth.user_sessions CASCADE;
DROP TABLE IF EXISTS auth.user_permissions CASCADE;
DROP TABLE IF EXISTS auth.user_roles CASCADE;
DROP TABLE IF EXISTS auth.role_permissions CASCADE;
DROP TABLE IF EXISTS auth.permissions CASCADE;
DROP TABLE IF EXISTS auth.roles CASCADE;
DROP TABLE IF EXISTS auth.users_extended CASCADE;

-- Drop enums
DROP TYPE IF EXISTS bee_status_type CASCADE;
DROP TYPE IF EXISTS employment_equity_type CASCADE;
DROP TYPE IF EXISTS audit_event_type CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS permission_action CASCADE;
DROP TYPE IF EXISTS user_role_type CASCADE;

RAISE NOTICE '✅ Rollback 0021 complete';

COMMIT;

\echo '✅ Rollback of 0021_comprehensive_auth_system_FIXED.sql completed'
\echo ''

\else
\echo '❌ Rollback of 0021 cancelled'
\echo ''
\endif

-- ============================================================================
-- ROLLBACK: 0001_prerequisite_core_tables.sql
-- Description: Remove base organization and profile tables
-- ============================================================================

\echo ''
\echo '⚠️  ROLLBACK: 0001 Prerequisite Core Tables'
\echo '⚠️  WARNING: This will delete ALL organization and profile data!'
\echo ''
\prompt 'Are you ABSOLUTELY sure you want to rollback 0001? (YES in capital letters): ' confirm_0001

\if :'confirm_0001' = 'YES'

BEGIN;

RAISE NOTICE 'Rolling back 0001_prerequisite_core_tables.sql...';

-- Drop migration helper function
DROP FUNCTION IF EXISTS migrate_profile_to_users_extended() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_profile_updated_at ON profile;
DROP TRIGGER IF EXISTS update_organization_updated_at ON organization;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables
DROP TABLE IF EXISTS profile CASCADE;
DROP TABLE IF EXISTS organization CASCADE;

-- Drop enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS organization_status CASCADE;
DROP TYPE IF EXISTS organization_plan CASCADE;

-- Drop extensions (only if not used elsewhere)
-- DROP EXTENSION IF EXISTS pgcrypto;
-- DROP EXTENSION IF EXISTS "uuid-ossp";

RAISE NOTICE '✅ Rollback 0001 complete';

COMMIT;

\echo '✅ Rollback of 0001_prerequisite_core_tables.sql completed'
\echo ''

\else
\echo '❌ Rollback of 0001 cancelled'
\echo ''
\endif

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo ''
\echo '📊 POST-ROLLBACK VERIFICATION'
\echo ''

DO $$
DECLARE
    v_auth_tables INTEGER;
    v_org_tables INTEGER;
BEGIN
    -- Count remaining auth tables
    SELECT COUNT(*) INTO v_auth_tables
    FROM information_schema.tables
    WHERE table_schema = 'auth';

    -- Count organization tables
    SELECT COUNT(*) INTO v_org_tables
    FROM information_schema.tables
    WHERE table_name IN ('organization', 'profile');

    RAISE NOTICE 'Auth tables remaining: %', v_auth_tables;
    RAISE NOTICE 'Organization tables remaining: %', v_org_tables;

    IF v_auth_tables = 0 AND v_org_tables = 0 THEN
        RAISE NOTICE '✅ Complete rollback successful';
    ELSE
        RAISE WARNING '⚠️  Some tables remain - may need manual cleanup';
    END IF;
END $$;

-- ============================================================================
-- EMERGENCY COMPLETE ROLLBACK (USE WITH EXTREME CAUTION)
-- ============================================================================

\echo ''
\echo '🚨 EMERGENCY COMPLETE ROLLBACK'
\echo '🚨 This will forcefully remove ALL auth-related objects!'
\echo '🚨 USE ONLY if incremental rollback failed!'
\echo ''
\prompt 'Type "FORCE_ROLLBACK" to proceed: ' force_confirm

\if :'force_confirm' = 'FORCE_ROLLBACK'

BEGIN;

RAISE NOTICE '🚨 Executing force rollback...';

-- Drop auth schema entirely
DROP SCHEMA IF EXISTS auth CASCADE;

-- Recreate empty auth schema
CREATE SCHEMA auth;

-- Drop organization and profile
DROP TABLE IF EXISTS profile CASCADE;
DROP TABLE IF EXISTS organization CASCADE;

-- Drop all custom types
DO $$
DECLARE
    v_type RECORD;
BEGIN
    FOR v_type IN
        SELECT typname
        FROM pg_type
        WHERE typnamespace = 'public'::regnamespace
        AND typname IN (
            'organization_plan', 'organization_status', 'user_role',
            'user_role_type', 'permission_action', 'session_status',
            'audit_event_type', 'employment_equity_type', 'bee_status_type'
        )
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', v_type.typname);
    END LOOP;
END $$;

RAISE NOTICE '✅ Force rollback complete';

COMMIT;

\echo '✅ Emergency force rollback completed'
\echo '⚠️  You will need to re-run all migrations from scratch'
\echo ''

\else
\echo '❌ Force rollback cancelled'
\echo ''
\endif

-- ============================================================================
-- FINAL NOTES
-- ============================================================================

\echo ''
\echo '📝 ROLLBACK NOTES:'
\echo '1. If you rolled back 0022 only, you can re-apply it without issues'
\echo '2. If you rolled back 0021, you must re-apply 0001, 0021, and 0022 in order'
\echo '3. If you rolled back 0001, you must re-apply ALL migrations from scratch'
\echo '4. All user data, roles, and permissions have been deleted'
\echo '5. Verify your application still functions correctly'
\echo ''
\echo '✅ Rollback procedures complete'
\echo ''

-- ============================================================================
-- END OF ROLLBACK PROCEDURES
-- ============================================================================
