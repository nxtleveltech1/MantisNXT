-- ============================================================================
-- Performance Benchmarks: performance-benchmarks.sql
-- Description: Comprehensive performance testing for auth system
-- Author: AS Team - Database Admin
-- Date: 2025-11-04
-- Usage: Run this AFTER migrations to measure baseline performance
-- ============================================================================

\timing on
\set QUIET on

BEGIN;

-- ============================================================================
-- SETUP: Create test data
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '🎯 ============================================================';
RAISE NOTICE '🎯 PERFORMANCE BENCHMARK SUITE';
RAISE NOTICE '🎯 ============================================================';
RAISE NOTICE '';

-- Create test organization if needed
INSERT INTO organization (
    id, name, slug, status, plan_type
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Benchmark Test Org',
    'benchmark-test-org',
    'active',
    'enterprise'
) ON CONFLICT (id) DO NOTHING;

-- Create test users for benchmarking
DO $$
DECLARE
    v_user_id UUID;
    v_i INTEGER;
BEGIN
    FOR v_i IN 1..100 LOOP
        INSERT INTO auth.users_extended (
            stack_auth_user_id,
            email,
            display_name,
            org_id,
            is_active
        ) VALUES (
            'benchmark_user_' || v_i,
            'benchmark' || v_i || '@test.com',
            'Benchmark User ' || v_i,
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            TRUE
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;
END $$;

-- Create test roles
INSERT INTO auth.roles (
    org_id, name, slug, role_level, is_system_role
) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Benchmark Admin', 'benchmark-admin', 90, FALSE),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Benchmark Manager', 'benchmark-manager', 70, FALSE),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Benchmark User', 'benchmark-user', 50, FALSE)
ON CONFLICT (org_id, slug) DO NOTHING;

-- Assign roles to users
DO $$
DECLARE
    v_user RECORD;
    v_role_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM auth.roles WHERE slug = 'benchmark-user' LIMIT 1;

    FOR v_user IN
        SELECT id FROM auth.users_extended
        WHERE email LIKE 'benchmark%@test.com'
        LIMIT 50
    LOOP
        INSERT INTO auth.user_roles (user_id, role_id)
        VALUES (v_user.id, v_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END LOOP;
END $$;

-- Create test sessions
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN
        SELECT id FROM auth.users_extended
        WHERE email LIKE 'benchmark%@test.com'
        LIMIT 20
    LOOP
        INSERT INTO auth.user_sessions (
            user_id,
            session_token,
            ip_address,
            expires_at,
            status
        ) VALUES (
            v_user.id,
            'benchmark_token_' || v_user.id,
            '127.0.0.1'::INET,
            NOW() + INTERVAL '1 hour',
            'active'
        ) ON CONFLICT (session_token) DO NOTHING;
    END LOOP;
END $$;

COMMIT;

RAISE NOTICE '✅ Test data created';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 1: User Queries
-- ============================================================================

RAISE NOTICE '📊 Benchmark 1/10: User Queries';

\echo '--- Single user lookup by email ---'
\timing on
SELECT * FROM auth.users_extended WHERE email = 'benchmark1@test.com';
\timing off

\echo '--- User lookup by stack_auth_id ---'
\timing on
SELECT * FROM auth.users_extended WHERE stack_auth_user_id = 'benchmark_user_1';
\timing off

\echo '--- Active users in organization ---'
\timing on
SELECT COUNT(*) FROM auth.users_extended
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
AND is_active = TRUE;
\timing off

\echo '--- Users with department filter ---'
\timing on
SELECT * FROM auth.users_extended
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
AND is_active = TRUE
ORDER BY last_login_at DESC NULLS LAST
LIMIT 20;
\timing off

RAISE NOTICE '✅ User queries benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 2: Permission Checks
-- ============================================================================

RAISE NOTICE '📊 Benchmark 2/10: Permission Checks';

\echo '--- Permission check (direct) ---'
\timing on
DO $$
DECLARE
    v_user_id UUID;
    v_has_perm BOOLEAN;
BEGIN
    SELECT id INTO v_user_id FROM auth.users_extended WHERE email = 'benchmark1@test.com';
    v_has_perm := auth.user_has_permission(v_user_id, 'users:read');
END $$;
\timing off

\echo '--- Get all user permissions ---'
\timing on
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users_extended WHERE email = 'benchmark1@test.com';
    PERFORM * FROM auth.get_user_permissions(v_user_id);
END $$;
\timing off

\echo '--- Permission matrix view ---'
\timing on
SELECT * FROM auth.v_user_permission_matrix
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
LIMIT 100;
\timing off

RAISE NOTICE '✅ Permission checks benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 3: Role Operations
-- ============================================================================

RAISE NOTICE '📊 Benchmark 3/10: Role Operations';

\echo '--- Get user roles ---'
\timing on
SELECT
    u.email,
    ARRAY_AGG(r.name) as roles
FROM auth.users_extended u
JOIN auth.user_roles ur ON u.id = ur.user_id
JOIN auth.roles r ON ur.role_id = r.id
WHERE u.org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
GROUP BY u.id, u.email
LIMIT 50;
\timing off

\echo '--- Role permissions matrix ---'
\timing on
SELECT * FROM auth.v_role_permissions_matrix
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\timing off

\echo '--- Role hierarchy traversal ---'
\timing on
WITH RECURSIVE role_tree AS (
    SELECT id, name, parent_role_id, 1 as depth
    FROM auth.roles
    WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    AND parent_role_id IS NULL

    UNION ALL

    SELECT r.id, r.name, r.parent_role_id, rt.depth + 1
    FROM auth.roles r
    JOIN role_tree rt ON r.parent_role_id = rt.id
    WHERE rt.depth < 5
)
SELECT * FROM role_tree ORDER BY depth;
\timing off

RAISE NOTICE '✅ Role operations benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 4: Session Management
-- ============================================================================

RAISE NOTICE '📊 Benchmark 4/10: Session Management';

\echo '--- Active sessions lookup ---'
\timing on
SELECT * FROM auth.user_sessions
WHERE status = 'active'
AND expires_at > NOW()
ORDER BY last_activity_at DESC
LIMIT 100;
\timing off

\echo '--- User active sessions ---'
\timing on
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users_extended WHERE email = 'benchmark1@test.com';
    PERFORM * FROM auth.user_sessions
    WHERE user_id = v_user_id
    AND status = 'active';
END $$;
\timing off

\echo '--- Session health view ---'
\timing on
SELECT * FROM auth.v_session_health;
\timing off

\echo '--- Active sessions summary view ---'
\timing on
SELECT * FROM auth.v_active_sessions_summary
LIMIT 50;
\timing off

RAISE NOTICE '✅ Session management benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 5: Audit Queries
-- ============================================================================

RAISE NOTICE '📊 Benchmark 5/10: Audit Queries';

\echo '--- Recent audit events (7 days) ---'
\timing on
SELECT * FROM auth.audit_events
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;
\timing off

\echo '--- Audit events by user ---'
\timing on
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users_extended WHERE email = 'benchmark1@test.com';
    PERFORM * FROM auth.audit_events
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT 50;
END $$;
\timing off

\echo '--- Security audit view ---'
\timing on
SELECT * FROM auth.v_security_audit_recent
LIMIT 100;
\timing off

\echo '--- Audit events with filters ---'
\timing on
SELECT * FROM auth.audit_events
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
AND event_type IN ('login', 'logout', 'user_updated')
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
\timing off

RAISE NOTICE '✅ Audit queries benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 6: Admin Panel Views
-- ============================================================================

RAISE NOTICE '📊 Benchmark 6/10: Admin Panel Views';

\echo '--- User management view ---'
\timing on
SELECT * FROM auth.v_user_management
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
ORDER BY created_at DESC
LIMIT 50;
\timing off

\echo '--- Login failures analysis ---'
\timing on
SELECT * FROM auth.v_login_failures_analysis
LIMIT 20;
\timing off

\echo '--- User search (ILIKE) ---'
\timing on
SELECT * FROM auth.v_user_management
WHERE email ILIKE '%benchmark%'
OR display_name ILIKE '%Benchmark%'
LIMIT 20;
\timing off

RAISE NOTICE '✅ Admin panel views benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 7: Bulk Operations
-- ============================================================================

RAISE NOTICE '📊 Benchmark 7/10: Bulk Operations';

\echo '--- Bulk user insert (10 users) ---'
\timing on
BEGIN;
DO $$
DECLARE
    v_i INTEGER;
BEGIN
    FOR v_i IN 1..10 LOOP
        INSERT INTO auth.users_extended (
            stack_auth_user_id,
            email,
            display_name,
            org_id
        ) VALUES (
            'bulk_test_' || v_i || '_' || extract(epoch from now()),
            'bulktest' || v_i || '_' || extract(epoch from now()) || '@test.com',
            'Bulk Test User ' || v_i,
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
        );
    END LOOP;
END $$;
ROLLBACK;
\timing off

\echo '--- Bulk role assignment (50 users) ---'
\timing on
BEGIN;
DO $$
DECLARE
    v_role_id UUID;
    v_user RECORD;
BEGIN
    SELECT id INTO v_role_id FROM auth.roles WHERE slug = 'benchmark-user' LIMIT 1;

    FOR v_user IN
        SELECT id FROM auth.users_extended
        WHERE email LIKE 'benchmark%@test.com'
        LIMIT 50
    LOOP
        INSERT INTO auth.user_roles (user_id, role_id)
        VALUES (v_user.id, v_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END LOOP;
END $$;
ROLLBACK;
\timing off

\echo '--- Bulk permission grant (all users) ---'
\timing on
BEGIN;
DO $$
DECLARE
    v_perm_id UUID;
    v_user RECORD;
BEGIN
    SELECT id INTO v_perm_id FROM auth.permissions WHERE name = 'users:read' LIMIT 1;

    FOR v_user IN
        SELECT id FROM auth.users_extended
        WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
        LIMIT 100
    LOOP
        INSERT INTO auth.user_permissions (user_id, permission_id, is_granted)
        VALUES (v_user.id, v_perm_id, TRUE)
        ON CONFLICT (user_id, permission_id) DO NOTHING;
    END LOOP;
END $$;
ROLLBACK;
\timing off

RAISE NOTICE '✅ Bulk operations benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 8: Complex Joins
-- ============================================================================

RAISE NOTICE '📊 Benchmark 8/10: Complex Joins';

\echo '--- Full user context (user + roles + permissions + sessions) ---'
\timing on
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users_extended WHERE email = 'benchmark1@test.com';

    PERFORM
        u.id,
        u.email,
        u.display_name,
        COALESCE(json_agg(DISTINCT jsonb_build_object('role', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') as roles,
        COALESCE(json_agg(DISTINCT jsonb_build_object('permission', p.name)) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions,
        (SELECT COUNT(*) FROM auth.user_sessions s WHERE s.user_id = u.id AND s.status = 'active') as active_sessions
    FROM auth.users_extended u
    LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
        AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
    LEFT JOIN auth.roles r ON ur.role_id = r.id
    LEFT JOIN auth.role_permissions rp ON r.id = rp.role_id
    LEFT JOIN auth.permissions p ON rp.permission_id = p.id
    WHERE u.id = v_user_id
    GROUP BY u.id;
END $$;
\timing off

\echo '--- Organization summary (users + roles + sessions) ---'
\timing on
SELECT
    o.name as org_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.is_active) as active_users,
    COUNT(DISTINCT r.id) as total_roles,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') as active_sessions
FROM organization o
LEFT JOIN auth.users_extended u ON o.id = u.org_id
LEFT JOIN auth.roles r ON o.id = r.org_id
LEFT JOIN auth.user_sessions s ON u.id = s.user_id
WHERE o.id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
GROUP BY o.id, o.name;
\timing off

RAISE NOTICE '✅ Complex joins benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 9: Write Performance
-- ============================================================================

RAISE NOTICE '📊 Benchmark 9/10: Write Performance';

\echo '--- Single user insert ---'
\timing on
BEGIN;
INSERT INTO auth.users_extended (
    stack_auth_user_id,
    email,
    display_name,
    org_id
) VALUES (
    'write_test_' || extract(epoch from now()),
    'writetest_' || extract(epoch from now()) || '@test.com',
    'Write Test User',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
ROLLBACK;
\timing off

\echo '--- Single audit event insert ---'
\timing on
BEGIN;
INSERT INTO auth.audit_events (
    org_id,
    event_type,
    action,
    severity
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'security_event',
    'Performance test',
    'info'
);
ROLLBACK;
\timing off

\echo '--- User update ---'
\timing on
BEGIN;
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users_extended WHERE email = 'benchmark1@test.com';
    UPDATE auth.users_extended
    SET last_login_at = NOW()
    WHERE id = v_user_id;
END $$;
ROLLBACK;
\timing off

RAISE NOTICE '✅ Write performance benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- BENCHMARK 10: Index Effectiveness
-- ============================================================================

RAISE NOTICE '📊 Benchmark 10/10: Index Effectiveness';

\echo '--- Query with index (org_id + is_active) ---'
\timing on
EXPLAIN ANALYZE
SELECT * FROM auth.users_extended
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
AND is_active = TRUE
LIMIT 10;
\timing off

\echo '--- Query with composite index (org_id, email) ---'
\timing on
EXPLAIN ANALYZE
SELECT * FROM auth.users_extended
WHERE org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
AND is_active = TRUE
AND email LIKE 'benchmark%'
LIMIT 10;
\timing off

\echo '--- Permission check with indexes ---'
\timing on
EXPLAIN ANALYZE
SELECT 1
FROM auth.user_roles ur
JOIN auth.role_permissions rp ON ur.role_id = rp.role_id
JOIN auth.permissions p ON rp.permission_id = p.id
WHERE ur.user_id = (SELECT id FROM auth.users_extended WHERE email = 'benchmark1@test.com' LIMIT 1)
AND p.name = 'users:read'
AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
LIMIT 1;
\timing off

RAISE NOTICE '✅ Index effectiveness benchmarked';
RAISE NOTICE '';

-- ============================================================================
-- SYSTEM HEALTH REPORT
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '📊 ============================================================';
RAISE NOTICE '📊 SYSTEM HEALTH & STATISTICS';
RAISE NOTICE '📊 ============================================================';
RAISE NOTICE '';

DO $$
DECLARE
    v_health RECORD;
BEGIN
    RAISE NOTICE 'System Health Metrics:';
    FOR v_health IN SELECT * FROM auth.get_system_health() ORDER BY metric
    LOOP
        RAISE NOTICE '  %: % [%]',
            RPAD(v_health.metric, 30),
            LPAD(v_health.value::TEXT, 8),
            v_health.status;
    END LOOP;
END $$;

RAISE NOTICE '';

DO $$
DECLARE
    v_size RECORD;
BEGIN
    RAISE NOTICE 'Table Sizes:';
    FOR v_size IN SELECT * FROM auth.get_table_sizes() ORDER BY table_name LIMIT 15
    LOOP
        RAISE NOTICE '  %: % (indexes: %)',
            RPAD(v_size.table_name, 30),
            LPAD(v_size.table_size, 10),
            v_size.indexes_size;
    END LOOP;
END $$;

RAISE NOTICE '';

-- Index usage statistics
DO $$
DECLARE
    v_idx RECORD;
BEGIN
    RAISE NOTICE 'Index Usage (Top 10):';
    FOR v_idx IN
        SELECT
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'auth'
        ORDER BY idx_scan DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '  %: % scans',
            RPAD(v_idx.indexname, 40),
            LPAD(v_idx.idx_scan::TEXT, 8);
    END LOOP;
END $$;

-- ============================================================================
-- PERFORMANCE SUMMARY
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '✅ ============================================================';
RAISE NOTICE '✅ PERFORMANCE BENCHMARK COMPLETE';
RAISE NOTICE '✅ ============================================================';
RAISE NOTICE '';
RAISE NOTICE 'RECOMMENDATIONS:';
RAISE NOTICE '1. Review EXPLAIN ANALYZE output for slow queries';
RAISE NOTICE '2. Monitor index usage with pg_stat_user_indexes';
RAISE NOTICE '3. Schedule regular VACUUM and ANALYZE';
RAISE NOTICE '4. Consider partitioning if audit_events grows > 1M rows';
RAISE NOTICE '5. Enable pg_stat_statements for query performance tracking';
RAISE NOTICE '';
RAISE NOTICE 'MAINTENANCE SCHEDULE:';
RAISE NOTICE '- Daily: Run auth.cleanup_expired_sessions()';
RAISE NOTICE '- Weekly: VACUUM ANALYZE auth schema';
RAISE NOTICE '- Monthly: Run auth.create_monthly_partition() for audit tables';
RAISE NOTICE '- Quarterly: Review and archive old audit partitions';
RAISE NOTICE '';

-- ============================================================================
-- CLEANUP TEST DATA
-- ============================================================================

BEGIN;

-- Remove benchmark test data
DELETE FROM auth.user_sessions WHERE session_token LIKE 'benchmark_token_%';
DELETE FROM auth.user_roles WHERE user_id IN (
    SELECT id FROM auth.users_extended WHERE email LIKE 'benchmark%@test.com'
);
DELETE FROM auth.users_extended WHERE email LIKE 'benchmark%@test.com' OR email LIKE 'bulktest%@test.com';
DELETE FROM auth.roles WHERE slug LIKE 'benchmark-%';
DELETE FROM organization WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

COMMIT;

RAISE NOTICE '✅ Test data cleaned up';
RAISE NOTICE '';

-- ============================================================================
-- END OF PERFORMANCE BENCHMARKS
-- ============================================================================

\set QUIET off
