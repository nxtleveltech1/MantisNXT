-- ============================================================================
-- MantisNXT Database Schema Fixes - Phase 1 VALIDATION
-- ============================================================================
-- Description: Comprehensive validation queries for migration 003
-- Run after: 003_critical_schema_fixes.sql
-- Author: Data Oracle
-- Date: 2025-10-08
-- ============================================================================

-- ============================================================================
-- SECTION 1: SCHEMA VALIDATION
-- ============================================================================

\echo '============================================================================'
\echo 'SECTION 1: SCHEMA VALIDATION'
\echo '============================================================================'

-- 1.1 Verify all tables exist
\echo '\n1.1 Table Existence Check:'
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'brand')
    THEN '✓ brand table exists'
    ELSE '✗ ERROR: brand table missing'
  END as brand_check,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'stock_movement')
    THEN '✓ stock_movement table exists'
    ELSE '✗ ERROR: stock_movement table missing'
  END as stock_movement_check;

-- 1.2 Verify enums created
\echo '\n1.2 Enum Type Check:'
SELECT
  typname,
  string_agg(enumlabel, ', ' ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'core'
  AND typname IN ('movement_type', 'reference_type', 'cost_method')
GROUP BY typname
ORDER BY typname;

-- 1.3 Verify stock_on_hand columns added
\echo '\n1.3 Stock On Hand Column Check:'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'stock_on_hand'
  AND column_name IN ('cost_price', 'cost_method', 'last_cost_update_at', 'total_value')
ORDER BY ordinal_position;

-- 1.4 Verify supplier columns added
\echo '\n1.4 Supplier Column Check:'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'suppliers'
  AND column_name IN ('contact_phone', 'contact_email', 'website', 'payment_terms')
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 2: CONSTRAINT VALIDATION
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 2: CONSTRAINT VALIDATION'
\echo '============================================================================'

-- 2.1 Check all CHECK constraints
\echo '\n2.1 CHECK Constraints:'
SELECT
  tc.table_name,
  tc.constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM information_schema.table_constraints tc
JOIN pg_constraint con ON con.conname = tc.constraint_name
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'core'
  AND tc.table_name IN ('stock_movement', 'stock_on_hand', 'suppliers', 'brand')
ORDER BY tc.table_name, tc.constraint_name;

-- 2.2 Verify foreign key CASCADE rules
\echo '\n2.2 Foreign Key CASCADE Rules:'
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'core'
  AND tc.table_name IN ('stock_movement', 'stock_on_hand', 'products', 'supplier_products')
ORDER BY tc.table_name, kcu.column_name;

-- 2.3 Check unique constraints
\echo '\n2.3 Unique Constraints:'
SELECT
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'core'
  AND tc.table_name IN ('brand', 'stock_movement', 'stock_on_hand')
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- ============================================================================
-- SECTION 3: INDEX VALIDATION
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 3: INDEX VALIDATION'
\echo '============================================================================'

-- 3.1 Check stock_movement indexes
\echo '\n3.1 Stock Movement Indexes:'
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'core'
  AND tablename = 'stock_movement'
ORDER BY indexname;

-- 3.2 Check brand indexes
\echo '\n3.2 Brand Table Indexes:'
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'core'
  AND tablename = 'brand'
ORDER BY indexname;

-- 3.3 Check performance indexes
\echo '\n3.3 Performance Indexes:'
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'core'
  AND (
    indexname LIKE '%_active' OR
    indexname LIKE '%_lower' OR
    indexname LIKE '%_search' OR
    indexname LIKE '%_valuation'
  )
ORDER BY tablename, indexname;

-- 3.4 Index size and usage statistics
\echo '\n3.4 Index Size Statistics:'
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'core'
  AND tablename IN ('stock_movement', 'brand', 'stock_on_hand', 'suppliers', 'products')
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 20;

-- ============================================================================
-- SECTION 4: TRIGGER & FUNCTION VALIDATION
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 4: TRIGGER & FUNCTION VALIDATION'
\echo '============================================================================'

-- 4.1 Verify triggers exist
\echo '\n4.1 Trigger Existence:'
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgtype,
  tgenabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid::regclass::text LIKE 'core.%'
  AND tgname IN ('stock_movement_update_cost', 'brand_update_timestamp')
ORDER BY table_name, trigger_name;

-- 4.2 Verify functions exist
\echo '\n4.2 Function Existence:'
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'core'
  AND p.proname IN (
    'update_stock_cost_on_movement',
    'update_brand_timestamp',
    'refresh_all_inventory_views'
  )
ORDER BY p.proname;

-- ============================================================================
-- SECTION 5: DATA VALIDATION
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 5: DATA VALIDATION'
\echo '============================================================================'

-- 5.1 Brand data coverage
\echo '\n5.1 Brand Data Coverage:'
SELECT
  COUNT(*) as total_brands,
  COUNT(*) FILTER (WHERE is_active = true) as active_brands,
  COUNT(*) FILTER (WHERE code IS NOT NULL) as brands_with_code,
  COUNT(*) FILTER (WHERE website IS NOT NULL) as brands_with_website
FROM core.brand;

-- 5.2 Products with brand assignment
\echo '\n5.2 Product Brand Assignment:'
SELECT
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE brand_id IS NOT NULL) as products_with_brand,
  COUNT(*) FILTER (WHERE brand_id IS NULL AND brand_from_supplier IS NOT NULL) as unmatched_brands,
  ROUND(100.0 * COUNT(*) FILTER (WHERE brand_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as brand_coverage_pct
FROM core.products;

-- 5.3 Top 10 brands by product count
\echo '\n5.3 Top 10 Brands:'
SELECT
  b.name as brand_name,
  b.code,
  COUNT(p.id) as product_count,
  b.is_active
FROM core.brand b
LEFT JOIN core.products p ON p.brand_id = b.id
GROUP BY b.id, b.name, b.code, b.is_active
ORDER BY product_count DESC
LIMIT 10;

-- 5.4 Stock on hand cost coverage
\echo '\n5.4 Stock On Hand Cost Coverage:'
SELECT
  COUNT(*) as total_stock_records,
  COUNT(*) FILTER (WHERE quantity > 0) as active_stock_records,
  COUNT(*) FILTER (WHERE cost_price IS NOT NULL) as records_with_cost,
  COUNT(*) FILTER (WHERE cost_price IS NOT NULL AND quantity > 0) as active_with_cost,
  ROUND(AVG(cost_price), 2) as avg_cost_price,
  pg_size_pretty(SUM(total_value)::numeric) as total_inventory_value
FROM core.stock_on_hand;

-- 5.5 Cost method distribution
\echo '\n5.5 Cost Method Distribution:'
SELECT
  cost_method,
  COUNT(*) as record_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM core.stock_on_hand
WHERE cost_price IS NOT NULL
GROUP BY cost_method
ORDER BY record_count DESC;

-- 5.6 Supplier contact data coverage
\echo '\n5.6 Supplier Contact Coverage:'
SELECT
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE contact_email IS NOT NULL) as suppliers_with_email,
  COUNT(*) FILTER (WHERE contact_phone IS NOT NULL) as suppliers_with_phone,
  COUNT(*) FILTER (WHERE website IS NOT NULL) as suppliers_with_website,
  COUNT(*) FILTER (
    WHERE contact_email IS NOT NULL
      AND contact_phone IS NOT NULL
      AND website IS NOT NULL
  ) as fully_populated,
  ROUND(100.0 * COUNT(*) FILTER (WHERE contact_email IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as email_coverage_pct
FROM core.suppliers;

-- 5.7 Payment terms distribution
\echo '\n5.7 Payment Terms Distribution:'
SELECT
  payment_terms,
  COUNT(*) as supplier_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM core.suppliers
WHERE payment_terms IS NOT NULL
GROUP BY payment_terms
ORDER BY supplier_count DESC
LIMIT 10;

-- 5.8 Stock movement data (if any exists)
\echo '\n5.8 Stock Movement Summary:'
SELECT
  COUNT(*) as total_movements,
  COUNT(DISTINCT product_id) as products_affected,
  COUNT(DISTINCT warehouse_id) as warehouses_affected,
  SUM(quantity) FILTER (WHERE quantity > 0) as total_inbound,
  SUM(ABS(quantity)) FILTER (WHERE quantity < 0) as total_outbound,
  MIN(created_at) as earliest_movement,
  MAX(created_at) as latest_movement
FROM core.stock_movement;

-- ============================================================================
-- SECTION 6: ORPHANED RECORD DETECTION
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 6: ORPHANED RECORD DETECTION (SHOULD ALL BE 0)'
\echo '============================================================================'

-- 6.1 Orphaned stock_on_hand records
\echo '\n6.1 Orphaned Stock on Hand (should be 0):'
SELECT COUNT(*) as orphaned_stock_records
FROM core.stock_on_hand soh
LEFT JOIN core.products p ON p.id = soh.product_id
LEFT JOIN core.warehouses w ON w.id = soh.warehouse_id
WHERE p.id IS NULL OR w.id IS NULL;

-- 6.2 Orphaned stock_movement records
\echo '\n6.2 Orphaned Stock Movement (should be 0):'
SELECT COUNT(*) as orphaned_movement_records
FROM core.stock_movement sm
LEFT JOIN core.products p ON p.id = sm.product_id
LEFT JOIN core.warehouses w ON w.id = sm.warehouse_id
WHERE p.id IS NULL OR w.id IS NULL;

-- 6.3 Products with invalid brand_id
\echo '\n6.3 Products with Invalid Brand (should be 0):'
SELECT COUNT(*) as products_with_invalid_brand
FROM core.products p
LEFT JOIN core.brand b ON b.id = p.brand_id
WHERE p.brand_id IS NOT NULL AND b.id IS NULL;

-- ============================================================================
-- SECTION 7: MATERIALIZED VIEW VALIDATION
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 7: MATERIALIZED VIEW VALIDATION'
\echo '============================================================================'

-- 7.1 Verify materialized views exist
\echo '\n7.1 Materialized View Existence:'
SELECT
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || matviewname)) as size
FROM pg_matviews
WHERE schemaname = 'core'
  AND matviewname IN (
    'mv_inventory_valuation',
    'mv_product_stock_summary',
    'mv_low_stock_alerts'
  )
ORDER BY matviewname;

-- 7.2 Inventory valuation summary
\echo '\n7.2 Inventory Valuation Summary:'
SELECT
  warehouse_name,
  product_count,
  total_units,
  pg_size_pretty(total_value::numeric) as total_value,
  ROUND(avg_unit_cost, 2) as avg_unit_cost,
  last_refresh
FROM core.mv_inventory_valuation
ORDER BY total_value DESC;

-- 7.3 Low stock alerts by severity
\echo '\n7.3 Low Stock Alerts by Severity:'
SELECT
  severity,
  COUNT(*) as alert_count,
  SUM(units_below_min) as total_units_needed
FROM core.mv_low_stock_alerts
GROUP BY severity
ORDER BY
  CASE severity
    WHEN 'OUT_OF_STOCK' THEN 1
    WHEN 'CRITICAL' THEN 2
    WHEN 'LOW' THEN 3
    WHEN 'WARNING' THEN 4
  END;

-- 7.4 Top 10 products by stock value
\echo '\n7.4 Top 10 Products by Value:'
SELECT
  name,
  sku,
  brand_name,
  total_quantity,
  warehouse_count,
  pg_size_pretty(total_value::numeric) as total_value,
  ROUND(avg_cost, 2) as avg_cost
FROM core.mv_product_stock_summary
ORDER BY total_value DESC
LIMIT 10;

-- ============================================================================
-- SECTION 8: PERFORMANCE METRICS
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 8: PERFORMANCE METRICS'
\echo '============================================================================'

-- 8.1 Table sizes
\echo '\n8.1 Table Sizes:'
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) -
                 pg_relation_size(schemaname || '.' || tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'core'
  AND tablename IN ('stock_movement', 'brand', 'stock_on_hand', 'suppliers', 'products')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- 8.2 Test query performance (inventory valuation)
\echo '\n8.2 Test Query: Inventory Valuation (with EXPLAIN ANALYZE):'
EXPLAIN ANALYZE
SELECT
  w.name as warehouse_name,
  COUNT(DISTINCT soh.product_id) as product_count,
  SUM(soh.quantity) as total_units,
  SUM(soh.total_value) as total_value
FROM core.warehouses w
LEFT JOIN core.stock_on_hand soh ON soh.warehouse_id = w.id AND soh.quantity > 0
GROUP BY w.id, w.name
ORDER BY total_value DESC;

-- 8.3 Test query performance (product search)
\echo '\n8.3 Test Query: Product Search by Name (with EXPLAIN):'
EXPLAIN
SELECT p.id, p.name, p.sku, b.name as brand_name
FROM core.products p
LEFT JOIN core.brand b ON b.id = p.brand_id
WHERE LOWER(p.name) LIKE '%test%'
ORDER BY p.name
LIMIT 10;

-- ============================================================================
-- SECTION 9: CONSTRAINT VIOLATION TESTS
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 9: CONSTRAINT VIOLATION TESTS (ALL SHOULD FAIL)'
\echo '============================================================================'

-- These tests verify that constraints are working by attempting violations

-- 9.1 Test stock_movement quantity != 0 constraint
\echo '\n9.1 Test: Stock movement with quantity = 0 (should fail):'
DO $$
BEGIN
  BEGIN
    INSERT INTO core.stock_movement (movement_type, product_id, warehouse_id, quantity)
    SELECT 'RECEIPT', p.id, w.id, 0
    FROM core.products p, core.warehouses w
    LIMIT 1;
    RAISE EXCEPTION 'CONSTRAINT FAILURE: quantity = 0 was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Constraint working: quantity = 0 rejected';
  END;
END $$;

-- 9.2 Test negative cost_price constraint
\echo '\n9.2 Test: Negative cost_price (should fail):'
DO $$
BEGIN
  BEGIN
    UPDATE core.stock_on_hand
    SET cost_price = -10
    WHERE id = (SELECT id FROM core.stock_on_hand LIMIT 1);
    RAISE EXCEPTION 'CONSTRAINT FAILURE: negative cost_price was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Constraint working: negative cost_price rejected';
  END;
END $$;

-- 9.3 Test invalid email format
\echo '\n9.3 Test: Invalid email format (should fail):'
DO $$
BEGIN
  BEGIN
    UPDATE core.suppliers
    SET contact_email = 'invalid-email'
    WHERE id = (SELECT id FROM core.suppliers LIMIT 1);
    RAISE EXCEPTION 'CONSTRAINT FAILURE: invalid email was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Constraint working: invalid email rejected';
  END;
END $$;

-- 9.4 Test duplicate brand name (case-insensitive)
\echo '\n9.4 Test: Duplicate brand name (should fail):'
DO $$
DECLARE
  v_brand_name TEXT;
BEGIN
  SELECT name INTO v_brand_name FROM core.brand LIMIT 1;
  IF v_brand_name IS NOT NULL THEN
    BEGIN
      INSERT INTO core.brand (name) VALUES (UPPER(v_brand_name));
      RAISE EXCEPTION 'CONSTRAINT FAILURE: duplicate brand name was allowed!';
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE '✓ Constraint working: duplicate brand name rejected';
    END;
  ELSE
    RAISE NOTICE '⚠ No brands exist to test duplicate constraint';
  END IF;
END $$;

-- ============================================================================
-- SECTION 10: TRIGGER FUNCTIONALITY TESTS
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 10: TRIGGER FUNCTIONALITY TESTS'
\echo '============================================================================'

-- 10.1 Test cost_price trigger (mock test)
\echo '\n10.1 Test: Cost Price Update Trigger:'
DO $$
DECLARE
  v_product_id UUID;
  v_warehouse_id UUID;
  v_old_cost NUMERIC;
  v_new_cost NUMERIC;
BEGIN
  -- Get a product and warehouse
  SELECT p.id, w.id INTO v_product_id, v_warehouse_id
  FROM core.products p, core.warehouses w
  LIMIT 1;

  IF v_product_id IS NOT NULL AND v_warehouse_id IS NOT NULL THEN
    -- Get current cost
    SELECT cost_price INTO v_old_cost
    FROM core.stock_on_hand
    WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;

    -- Insert test movement
    BEGIN
      INSERT INTO core.stock_movement (
        movement_type, product_id, warehouse_id, quantity, cost_price
      ) VALUES (
        'RECEIPT', v_product_id, v_warehouse_id, 10, 50.00
      );

      -- Check if cost was updated
      SELECT cost_price INTO v_new_cost
      FROM core.stock_on_hand
      WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;

      -- Clean up test data
      DELETE FROM core.stock_movement
      WHERE product_id = v_product_id
        AND warehouse_id = v_warehouse_id
        AND created_at > NOW() - INTERVAL '1 second';

      IF v_new_cost IS NOT NULL THEN
        RAISE NOTICE '✓ Trigger working: cost_price updated (old: %, new: %)', v_old_cost, v_new_cost;
      ELSE
        RAISE NOTICE '⚠ Trigger may not be working: cost_price is NULL';
      END IF;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE '✗ Error testing trigger: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '⚠ No product/warehouse to test trigger';
  END IF;
END $$;

-- ============================================================================
-- SECTION 11: FINAL SUMMARY
-- ============================================================================

\echo '\n============================================================================'
\echo 'SECTION 11: FINAL VALIDATION SUMMARY'
\echo '============================================================================'

DO $$
DECLARE
  v_brand_count INTEGER;
  v_stock_movement_exists BOOLEAN;
  v_cost_price_exists BOOLEAN;
  v_supplier_email_exists BOOLEAN;
  v_matview_count INTEGER;
  v_errors TEXT := '';
BEGIN
  -- Check critical objects
  SELECT COUNT(*) INTO v_brand_count FROM core.brand;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'stock_movement'
  ) INTO v_stock_movement_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'stock_on_hand'
      AND column_name = 'cost_price'
  ) INTO v_cost_price_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'suppliers'
      AND column_name = 'contact_email'
  ) INTO v_supplier_email_exists;

  SELECT COUNT(*) INTO v_matview_count
  FROM pg_matviews
  WHERE schemaname = 'core'
    AND matviewname LIKE 'mv_%';

  -- Build error report
  IF v_brand_count = 0 THEN
    v_errors := v_errors || E'\n✗ ERROR: No brands created';
  END IF;

  IF NOT v_stock_movement_exists THEN
    v_errors := v_errors || E'\n✗ ERROR: stock_movement table missing';
  END IF;

  IF NOT v_cost_price_exists THEN
    v_errors := v_errors || E'\n✗ ERROR: cost_price column missing';
  END IF;

  IF NOT v_supplier_email_exists THEN
    v_errors := v_errors || E'\n✗ ERROR: supplier contact columns missing';
  END IF;

  IF v_matview_count < 3 THEN
    v_errors := v_errors || E'\n✗ ERROR: Materialized views missing (expected 3, found ' || v_matview_count || ')';
  END IF;

  -- Print summary
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'VALIDATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Brand records: %', v_brand_count;
  RAISE NOTICE 'Stock movement table: %', CASE WHEN v_stock_movement_exists THEN 'EXISTS ✓' ELSE 'MISSING ✗' END;
  RAISE NOTICE 'Cost price column: %', CASE WHEN v_cost_price_exists THEN 'EXISTS ✓' ELSE 'MISSING ✗' END;
  RAISE NOTICE 'Supplier contact columns: %', CASE WHEN v_supplier_email_exists THEN 'EXISTS ✓' ELSE 'MISSING ✗' END;
  RAISE NOTICE 'Materialized views: % of 3', v_matview_count;

  IF v_errors = '' THEN
    RAISE NOTICE E'\n✓✓✓ MIGRATION SUCCESSFUL - ALL VALIDATIONS PASSED ✓✓✓';
  ELSE
    RAISE NOTICE E'\n✗✗✗ MIGRATION ERRORS DETECTED ✗✗✗%', v_errors;
    RAISE NOTICE E'\nPlease review migration logs and re-run if necessary.';
  END IF;
END $$;

-- ============================================================================
-- END OF VALIDATION
-- ============================================================================
