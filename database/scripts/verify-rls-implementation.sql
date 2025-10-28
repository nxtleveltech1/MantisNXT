-- ============================================================================
-- RLS (Row-Level Security) Implementation Verification
-- ============================================================================
-- This script verifies RLS policies on critical tables in the MantisNXT schema
--
-- Usage:
--   psql $DATABASE_URL -f database/scripts/verify-rls-implementation.sql
--
-- Checks:
--   1. RLS enabled status on critical tables
--   2. Existing RLS policies and their definitions
--   3. Role-based access configurations
--   4. Policy coverage for CRUD operations
-- ============================================================================

\set ON_ERROR_STOP on
\timing on

-- Set output format
\pset border 2
\pset format wrapped

-- Display header
\echo ''
\echo '================================================================================'
\echo '  RLS IMPLEMENTATION VERIFICATION'
\echo '================================================================================'
\echo ''

-- ============================================================================
-- 1. CHECK RLS STATUS ON CORE TABLES
-- ============================================================================

\echo '→ Checking RLS status on core tables...'
\echo ''

SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as rls_status,
  CASE
    WHEN rowsecurity THEN 'RLS is active - policies enforced'
    ELSE 'RLS is inactive - full table access allowed'
  END as description
FROM pg_tables
WHERE schemaname = 'core'
  AND tablename IN (
    'supplier',
    'product',
    'pricelist',
    'inventory',
    'stock_on_hand',
    'stock_movement',
    'purchase_order',
    'purchase_order_item',
    'analytics_anomalies',
    'analytics_predictions',
    'user_account',
    'organization'
  )
ORDER BY tablename;

\echo ''
\echo '→ RLS Summary'

SELECT
  COUNT(*) as total_tables,
  COUNT(*) FILTER (WHERE rowsecurity) as rls_enabled,
  COUNT(*) FILTER (WHERE NOT rowsecurity) as rls_disabled,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rowsecurity) / NULLIF(COUNT(*), 0),
    1
  ) as enabled_percentage
FROM pg_tables
WHERE schemaname = 'core'
  AND tablename IN (
    'supplier', 'product', 'pricelist', 'inventory',
    'stock_on_hand', 'stock_movement', 'purchase_order',
    'purchase_order_item', 'analytics_anomalies',
    'analytics_predictions', 'user_account', 'organization'
  );

-- ============================================================================
-- 2. LIST ALL RLS POLICIES
-- ============================================================================

\echo ''
\echo '→ Listing RLS policies on core tables...'
\echo ''

SELECT
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN '✓ PERMISSIVE'
    ELSE '✗ RESTRICTIVE'
  END as policy_type,
  roles,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN '✓ WITH CHECK'
    ELSE '✗ NO CHECK'
  END as has_check_clause
FROM pg_policies
WHERE schemaname = 'core'
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. POLICY COVERAGE ANALYSIS
-- ============================================================================

\echo ''
\echo '→ Analyzing policy coverage per table...'
\echo ''

WITH policy_coverage AS (
  SELECT
    tablename,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
    COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
    COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies,
    COUNT(*) FILTER (WHERE cmd = 'ALL') as all_policies
  FROM pg_policies
  WHERE schemaname = 'core'
  GROUP BY tablename
),
tables_with_rls AS (
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'core'
    AND rowsecurity = true
)
SELECT
  t.tablename,
  COALESCE(pc.total_policies, 0) as total_policies,
  CASE
    WHEN pc.select_policies > 0 OR pc.all_policies > 0 THEN '✓'
    ELSE '✗'
  END as select_covered,
  CASE
    WHEN pc.insert_policies > 0 OR pc.all_policies > 0 THEN '✓'
    ELSE '✗'
  END as insert_covered,
  CASE
    WHEN pc.update_policies > 0 OR pc.all_policies > 0 THEN '✓'
    ELSE '✗'
  END as update_covered,
  CASE
    WHEN pc.delete_policies > 0 OR pc.all_policies > 0 THEN '✓'
    ELSE '✗'
  END as delete_covered,
  CASE
    WHEN COALESCE(pc.total_policies, 0) = 0 THEN '⚠ NO POLICIES'
    WHEN (pc.select_policies > 0 OR pc.all_policies > 0)
      AND (pc.insert_policies > 0 OR pc.all_policies > 0)
      AND (pc.update_policies > 0 OR pc.all_policies > 0)
      AND (pc.delete_policies > 0 OR pc.all_policies > 0)
      THEN '✓ FULL COVERAGE'
    ELSE '⚠ PARTIAL COVERAGE'
  END as coverage_status
FROM tables_with_rls t
LEFT JOIN policy_coverage pc ON t.tablename = pc.tablename
ORDER BY t.tablename;

-- ============================================================================
-- 4. ROLE-BASED POLICY ANALYSIS
-- ============================================================================

\echo ''
\echo '→ Analyzing policies by role...'
\echo ''

SELECT
  unnest(roles) as role_name,
  COUNT(*) as policy_count,
  COUNT(DISTINCT tablename) as tables_covered,
  array_agg(DISTINCT cmd ORDER BY cmd) as operations
FROM pg_policies
WHERE schemaname = 'core'
GROUP BY unnest(roles)
ORDER BY policy_count DESC;

-- ============================================================================
-- 5. DETAILED POLICY DEFINITIONS
-- ============================================================================

\echo ''
\echo '→ Detailed policy definitions (first 5 for brevity)...'
\echo ''

SELECT
  tablename,
  policyname,
  CASE
    WHEN length(qual) > 100 THEN substring(qual from 1 for 100) || '...'
    ELSE qual
  END as using_clause,
  CASE
    WHEN length(with_check) > 100 THEN substring(with_check from 1 for 100) || '...'
    ELSE with_check
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'core'
ORDER BY tablename, policyname
LIMIT 5;

-- ============================================================================
-- 6. IDENTIFY TABLES WITHOUT RLS
-- ============================================================================

\echo ''
\echo '→ Tables without RLS enabled (potential security gaps)...'
\echo ''

SELECT
  schemaname,
  tablename,
  '⚠ RLS NOT ENABLED' as status,
  'Consider enabling RLS for multi-tenant security' as recommendation
FROM pg_tables
WHERE schemaname = 'core'
  AND rowsecurity = false
  AND tablename IN (
    'supplier', 'product', 'pricelist', 'inventory',
    'stock_on_hand', 'stock_movement', 'purchase_order',
    'purchase_order_item', 'analytics_anomalies',
    'analytics_predictions', 'user_account', 'organization'
  )
ORDER BY tablename;

-- ============================================================================
-- 7. POLICY COMPLEXITY ANALYSIS
-- ============================================================================

\echo ''
\echo '→ Policy complexity analysis...'
\echo ''

SELECT
  tablename,
  policyname,
  length(qual) as using_clause_length,
  length(with_check) as check_clause_length,
  CASE
    WHEN length(qual) > 500 OR length(with_check) > 500 THEN '⚠ COMPLEX'
    WHEN length(qual) > 200 OR length(with_check) > 200 THEN '→ MODERATE'
    ELSE '✓ SIMPLE'
  END as complexity
FROM pg_policies
WHERE schemaname = 'core'
ORDER BY
  GREATEST(length(qual), length(with_check)) DESC
LIMIT 10;

-- ============================================================================
-- 8. FINAL RECOMMENDATIONS
-- ============================================================================

\echo ''
\echo '================================================================================'
\echo '  RECOMMENDATIONS'
\echo '================================================================================'
\echo ''

DO $$
DECLARE
  total_tables INTEGER;
  rls_enabled_count INTEGER;
  tables_without_policies INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*)
  INTO total_tables
  FROM pg_tables
  WHERE schemaname = 'core'
    AND tablename IN (
      'supplier', 'product', 'pricelist', 'inventory',
      'stock_on_hand', 'stock_movement', 'purchase_order',
      'purchase_order_item', 'analytics_anomalies',
      'analytics_predictions', 'user_account', 'organization'
    );

  -- Count RLS enabled
  SELECT COUNT(*)
  INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'core'
    AND rowsecurity = true
    AND tablename IN (
      'supplier', 'product', 'pricelist', 'inventory',
      'stock_on_hand', 'stock_movement', 'purchase_order',
      'purchase_order_item', 'analytics_anomalies',
      'analytics_predictions', 'user_account', 'organization'
    );

  -- Count tables with RLS but no policies
  SELECT COUNT(*)
  INTO tables_without_policies
  FROM pg_tables t
  WHERE t.schemaname = 'core'
    AND t.rowsecurity = true
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
    );

  RAISE NOTICE '';
  RAISE NOTICE '→ Total core tables: %', total_tables;
  RAISE NOTICE '→ Tables with RLS enabled: % (%.1f%%)',
    rls_enabled_count,
    ROUND(100.0 * rls_enabled_count / NULLIF(total_tables, 0), 1);

  IF tables_without_policies > 0 THEN
    RAISE WARNING '→ Tables with RLS enabled but no policies: %', tables_without_policies;
    RAISE WARNING '  These tables will DENY all access by default!';
  END IF;

  IF rls_enabled_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✓ Single-tenant mode detected (no RLS)';
    RAISE NOTICE '  This is acceptable for single-organization deployments.';
    RAISE NOTICE '  For multi-tenant deployments, consider enabling RLS.';
  ELSIF rls_enabled_count < total_tables THEN
    RAISE WARNING '';
    RAISE WARNING '⚠ Partial RLS implementation detected';
    RAISE WARNING '  % tables without RLS protection', total_tables - rls_enabled_count;
    RAISE WARNING '  Review tables without RLS for security requirements';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✓ Full RLS coverage on all core tables';
  END IF;

  RAISE NOTICE '';
END $$;

\echo ''
\echo '================================================================================'
\echo '  VERIFICATION COMPLETE'
\echo '================================================================================'
\echo ''

\timing off
