-- ============================================================================
-- MantisNXT Replication Test Suite
-- ============================================================================
-- ADR: ADR-1 (Logical Replication Configuration)
-- Purpose: Test logical replication between Neon and the Neon replica
-- Author: Data Oracle
-- Date: 2025-10-09
-- ============================================================================

-- NOTE: This test suite has two parts:
-- Part A: Run on PUBLISHER (Neon)
-- Part B: Run on SUBSCRIBER (Neon replica)

-- ============================================================================
-- PART A: PUBLISHER (NEON) TESTS
-- ============================================================================

\echo '============================================================'
\echo 'REPLICATION TESTS - PART A: PUBLISHER (NEON)'
\echo '============================================================'

-- TEST A1: Publication Exists
-- ============================================================================
DO $$
DECLARE
  v_pub_exists BOOLEAN;
  v_table_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'mantisnxt_core_replication'
  ) INTO v_pub_exists;

  ASSERT v_pub_exists, 'TEST A1 FAILED: Publication does not exist';

  SELECT COUNT(*) INTO v_table_count
  FROM pg_publication_tables
  WHERE pubname = 'mantisnxt_core_replication';

  ASSERT v_table_count = 11, FORMAT('TEST A1 FAILED: Expected 11 tables, found %s', v_table_count);

  RAISE NOTICE 'TEST A1 PASSED: Publication exists with 11 tables ✓';
END $$;

-- TEST A2: Required Tables in Publication
-- ============================================================================
DO $$
DECLARE
  v_required_tables TEXT[] := ARRAY[
    'inventory_items',
    'product',
    'supplier',
    'supplier_product',
    'stock_movement',
    'stock_on_hand',
    'stock_location',
    'analytics_events',
    'brand',
    'purchase_orders',
    'purchase_order_items'
  ];
  v_table TEXT;
  v_in_publication BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_required_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'mantisnxt_core_replication'
      AND schemaname = 'core'
      AND tablename = v_table
    ) INTO v_in_publication;

    ASSERT v_in_publication, FORMAT('TEST A2 FAILED: Table %s not in publication', v_table);
  END LOOP;

  RAISE NOTICE 'TEST A2 PASSED: All required tables in publication ✓';
END $$;

-- TEST A3: Publication Configuration
-- ============================================================================
DO $$
DECLARE
  v_pub RECORD;
BEGIN
  SELECT * INTO v_pub FROM pg_publication WHERE pubname = 'mantisnxt_core_replication';

  ASSERT v_pub.pubinsert, 'TEST A3 FAILED: INSERT not published';
  ASSERT v_pub.pubupdate, 'TEST A3 FAILED: UPDATE not published';
  ASSERT v_pub.pubdelete, 'TEST A3 FAILED: DELETE not published';

  RAISE NOTICE 'TEST A3 PASSED: Publication configured for INSERT, UPDATE, DELETE ✓';
END $$;

-- TEST A4: WAL Level Configuration
-- ============================================================================
DO $$
DECLARE
  v_wal_level TEXT;
BEGIN
  SELECT setting INTO v_wal_level FROM pg_settings WHERE name = 'wal_level';

  ASSERT v_wal_level = 'logical', FORMAT('TEST A4 FAILED: WAL level is %s, expected logical', v_wal_level);

  RAISE NOTICE 'TEST A4 PASSED: WAL level set to logical ✓';
END $$;

-- TEST A5: Replication Slots
-- ============================================================================
DO $$
DECLARE
  v_slot_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_slot_count
  FROM pg_replication_slots
  WHERE database = CURRENT_DATABASE()
  AND slot_name LIKE '%mantisnxt%';

  -- Note: Slot may not exist until subscription connects
  RAISE NOTICE 'TEST A5 INFO: Found % replication slots', v_slot_count;

  IF v_slot_count > 0 THEN
    RAISE NOTICE 'TEST A5 PASSED: Replication slots present ✓';
  ELSE
    RAISE NOTICE 'TEST A5 WARNING: No replication slots yet (subscriber may not be connected)';
  END IF;
END $$;

-- TEST A6: WAL Senders (Active Connections)
-- ============================================================================
DO $$
DECLARE
  v_sender_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sender_count FROM pg_stat_replication;

  RAISE NOTICE 'TEST A6 INFO: Found % active WAL senders', v_sender_count;

  IF v_sender_count > 0 THEN
    RAISE NOTICE 'TEST A6 PASSED: WAL senders active ✓';
  ELSE
    RAISE NOTICE 'TEST A6 WARNING: No WAL senders (subscriber may not be connected)';
  END IF;
END $$;

\echo ''
\echo 'Part A: Publisher tests completed. Run Part B on subscriber.'
\echo ''

-- ============================================================================
-- PART B: SUBSCRIBER (POSTGRES OLD) TESTS
-- ============================================================================

-- Copy and run this section on POSTGRES OLD database

/*

\echo '============================================================'
\echo 'REPLICATION TESTS - PART B: SUBSCRIBER (POSTGRES OLD)'
\echo '============================================================'

-- TEST B1: Subscription Exists
-- ============================================================================
DO $$
DECLARE
  v_sub_exists BOOLEAN;
  v_sub_enabled BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_subscription WHERE subname = 'mantisnxt_from_neon'
  ) INTO v_sub_exists;

  ASSERT v_sub_exists, 'TEST B1 FAILED: Subscription does not exist';

  SELECT subenabled INTO v_sub_enabled FROM pg_subscription WHERE subname = 'mantisnxt_from_neon';

  ASSERT v_sub_enabled, 'TEST B1 FAILED: Subscription is disabled';

  RAISE NOTICE 'TEST B1 PASSED: Subscription exists and is enabled ✓';
END $$;

-- TEST B2: Subscription Worker Running
-- ============================================================================
DO $$
DECLARE
  v_worker_running BOOLEAN;
  v_pid INTEGER;
BEGIN
  SELECT pid IS NOT NULL INTO v_worker_running
  FROM pg_stat_subscription
  WHERE subname = 'mantisnxt_from_neon';

  ASSERT v_worker_running, 'TEST B2 FAILED: Subscription worker not running';

  SELECT pid INTO v_pid FROM pg_stat_subscription WHERE subname = 'mantisnxt_from_neon';

  RAISE NOTICE 'TEST B2 PASSED: Subscription worker running (PID: %) ✓', v_pid;
END $$;

-- TEST B3: All Tables Synchronized
-- ============================================================================
DO $$
DECLARE
  v_total_tables INTEGER;
  v_ready_tables INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_tables
  FROM pg_subscription_rel srw
  JOIN pg_subscription s ON s.oid = srw.srsubid
  WHERE s.subname = 'mantisnxt_from_neon';

  SELECT COUNT(*) INTO v_ready_tables
  FROM pg_subscription_rel srw
  JOIN pg_subscription s ON s.oid = srw.srsubid
  WHERE s.subname = 'mantisnxt_from_neon'
  AND srw.srsubstate = 'r';

  ASSERT v_total_tables = 11, FORMAT('TEST B3 FAILED: Expected 11 tables, found %s', v_total_tables);
  ASSERT v_ready_tables = v_total_tables, FORMAT('TEST B3 FAILED: Only %s/%s tables ready', v_ready_tables, v_total_tables);

  RAISE NOTICE 'TEST B3 PASSED: All 11 tables synchronized and ready ✓';
END $$;

-- TEST B4: Replication Lag Check
-- ============================================================================
DO $$
DECLARE
  v_lag_seconds NUMERIC;
  v_lag_bytes BIGINT;
BEGIN
  SELECT
    EXTRACT(EPOCH FROM (NOW() - latest_end_time)),
    pg_wal_lsn_diff(latest_end_lsn, received_lsn)
  INTO v_lag_seconds, v_lag_bytes
  FROM pg_stat_subscription
  WHERE subname = 'mantisnxt_from_neon';

  RAISE NOTICE 'TEST B4 INFO: Replication lag: %s seconds, %s bytes', ROUND(v_lag_seconds, 2), v_lag_bytes;

  IF v_lag_seconds > 10 THEN
    RAISE WARNING 'TEST B4 WARNING: Replication lag exceeds 10 seconds';
  ELSIF v_lag_seconds > 5 THEN
    RAISE WARNING 'TEST B4 WARNING: Replication lag exceeds 5 seconds target';
  ELSE
    RAISE NOTICE 'TEST B4 PASSED: Replication lag within acceptable limits ✓';
  END IF;
END $$;

-- TEST B5: Required Tables Exist on Subscriber
-- ============================================================================
DO $$
DECLARE
  v_required_tables TEXT[] := ARRAY[
    'inventory_items',
    'product',
    'supplier',
    'supplier_product',
    'stock_movement',
    'stock_on_hand',
    'stock_location',
    'analytics_events',
    'brand',
    'purchase_orders',
    'purchase_order_items'
  ];
  v_table TEXT;
  v_table_exists BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_required_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'core' AND table_name = v_table
    ) INTO v_table_exists;

    ASSERT v_table_exists, FORMAT('TEST B5 FAILED: Table %s does not exist', v_table);
  END LOOP;

  RAISE NOTICE 'TEST B5 PASSED: All required tables exist on subscriber ✓';
END $$;

\echo ''
\echo 'Part B: Subscriber tests completed.'
\echo ''

*/

-- ============================================================================
-- PART C: DATA CONSISTENCY TESTS (RUN ON BOTH)
-- ============================================================================

-- Copy and run this section on BOTH databases, then compare results

/*

\echo '============================================================'
\echo 'REPLICATION TESTS - PART C: DATA CONSISTENCY'
\echo '============================================================'

-- TEST C1: Record Counts
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TEST C1: Record counts by table';
END $$;

SELECT
  'inventory_items' AS table_name,
  COUNT(*) AS record_count
FROM core.inventory_items
UNION ALL
SELECT 'product', COUNT(*) FROM core.product
UNION ALL
SELECT 'supplier', COUNT(*) FROM core.supplier
UNION ALL
SELECT 'supplier_product', COUNT(*) FROM core.supplier_product
UNION ALL
SELECT 'stock_movement', COUNT(*) FROM core.stock_movement
UNION ALL
SELECT 'stock_on_hand', COUNT(*) FROM core.stock_on_hand
UNION ALL
SELECT 'stock_location', COUNT(*) FROM core.stock_location
UNION ALL
SELECT 'analytics_events', COUNT(*) FROM core.analytics_events
UNION ALL
SELECT 'brand', COUNT(*) FROM core.brand
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM core.purchase_orders
UNION ALL
SELECT 'purchase_order_items', COUNT(*) FROM core.purchase_order_items
ORDER BY table_name;

-- TEST C2: Sample Data Checksums
-- ============================================================================
SELECT
  'product' AS table_name,
  COUNT(*) AS record_count,
  MD5(STRING_AGG(product_id::TEXT, ',' ORDER BY product_id)) AS id_checksum
FROM core.product
UNION ALL
SELECT
  'supplier',
  COUNT(*),
  MD5(STRING_AGG(supplier_id::TEXT, ',' ORDER BY supplier_id))
FROM core.supplier
UNION ALL
SELECT
  'brand',
  COUNT(*),
  MD5(STRING_AGG(brand_id::TEXT, ',' ORDER BY brand_id))
FROM core.brand;

*/

-- ============================================================================
-- PART D: LIVE REPLICATION TEST
-- ============================================================================

-- Run this ONLY ON PUBLISHER (Neon) to test live replication

/*

\echo '============================================================'
\echo 'REPLICATION TESTS - PART D: LIVE REPLICATION'
\echo '============================================================'

BEGIN;

-- Create test data
INSERT INTO core.brand (name, code, description)
VALUES ('REPLICATION_TEST_BRAND', 'REPTEST', 'Test brand for replication verification')
RETURNING brand_id, name, code;

-- Wait for replication (5 seconds)
SELECT pg_sleep(5);

COMMIT;

\echo ''
\echo 'Test brand created. Wait 5 seconds, then check on subscriber:'
\echo 'SELECT * FROM core.brand WHERE code = ''REPTEST'';'
\echo ''
\echo 'If the record appears on subscriber, replication is working.'
\echo ''
\echo 'After verification, delete the test record on PUBLISHER:'
\echo 'DELETE FROM core.brand WHERE code = ''REPTEST'';'
\echo ''

*/

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

\echo '============================================================'
\echo 'REPLICATION TEST SUITE SUMMARY'
\echo '============================================================'
\echo 'Publisher Tests (Part A): Run on NEON'
\echo '  - Publication exists'
\echo '  - Required tables in publication'
\echo '  - Publication configuration'
\echo '  - WAL level configuration'
\echo '  - Replication slots'
\echo '  - WAL senders'
\echo ''
\echo 'Subscriber Tests (Part B): Run on POSTGRES OLD'
\echo '  - Subscription exists'
\echo '  - Subscription worker running'
\echo '  - All tables synchronized'
\echo '  - Replication lag check'
\echo '  - Required tables exist'
\echo ''
\echo 'Data Consistency Tests (Part C): Run on BOTH'
\echo '  - Record counts match'
\echo '  - Data checksums match'
\echo ''
\echo 'Live Replication Test (Part D): Run on PUBLISHER'
\echo '  - Insert test data'
\echo '  - Verify on subscriber'
\echo '  - Delete test data'
\echo '============================================================'

-- ============================================================================
-- END OF REPLICATION TEST SUITE
-- ============================================================================
