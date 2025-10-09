-- ============================================================================
-- MantisNXT Logical Replication Setup - Subscription (Postgres OLD Replica)
-- ============================================================================
-- ADR: ADR-1 (Logical Replication Configuration)
-- Purpose: Configure subscription on Postgres OLD to receive from Neon
-- Database: Postgres OLD Replica (62.169.20.53:6600)
-- Source: Neon Primary
-- Author: Data Oracle
-- Date: 2025-10-09
-- ============================================================================

-- IMPORTANT: Run this on POSTGRES OLD (REPLICA) database
-- Connection: Use OLD database credentials from .env.local (commented section)
-- Host: 62.169.20.53:6600
-- User: nxtdb_admin
-- Database: nxtprod-db_001

-- ============================================================================
-- SECTION 1: VERIFY PREREQUISITES ON SUBSCRIBER
-- ============================================================================

-- Check PostgreSQL version (must be >= 10)
SELECT version();

-- Check current database and user
SELECT CURRENT_DATABASE() AS database, CURRENT_USER AS user;

-- Check if logical replication is supported
DO $$
DECLARE
  v_version INTEGER;
BEGIN
  SELECT CAST(current_setting('server_version_num') AS INTEGER) INTO v_version;

  RAISE NOTICE 'PostgreSQL version: %', v_version;

  IF v_version < 100000 THEN
    RAISE EXCEPTION 'Logical replication requires PostgreSQL 10 or higher';
  END IF;
END $$;

-- Check max_replication_slots and max_worker_processes
SELECT
  name,
  setting,
  unit,
  context
FROM pg_settings
WHERE name IN ('max_replication_slots', 'max_worker_processes', 'max_logical_replication_workers')
ORDER BY name;

-- ============================================================================
-- SECTION 2: CREATE SCHEMA AND TABLES (MATCH NEON STRUCTURE)
-- ============================================================================

-- Create core schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS core;

-- Grant usage on schema
GRANT USAGE ON SCHEMA core TO nxtdb_admin;
GRANT ALL ON SCHEMA core TO nxtdb_admin;

-- Note: Tables MUST exist on subscriber before creating subscription
-- The subscriber must have the same table structure as the publisher

-- Verify tables exist (they should from previous migrations)
DO $$
DECLARE
  v_missing_tables TEXT[];
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
  v_missing_tables := ARRAY[]::TEXT[];

  FOREACH v_table IN ARRAY v_required_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'core' AND table_name = v_table
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
      v_missing_tables := array_append(v_missing_tables, v_table);
    END IF;
  END LOOP;

  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE WARNING 'Missing tables on subscriber: %', array_to_string(v_missing_tables, ', ');
    RAISE NOTICE 'You must create these tables before setting up subscription';
    RAISE NOTICE 'Run all migration scripts on this database first';
  ELSE
    RAISE NOTICE 'All required tables exist on subscriber';
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE SUBSCRIPTION
-- ============================================================================

-- Drop existing subscription if exists (for clean setup)
DROP SUBSCRIPTION IF EXISTS mantisnxt_from_neon CASCADE;

-- Create subscription to Neon publication
-- IMPORTANT: Replace the connection string with your actual Neon connection details

CREATE SUBSCRIPTION mantisnxt_from_neon
CONNECTION 'host=ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech port=5432 dbname=neondb user=neondb_owner password=npg_84ELeCFbOcGA sslmode=require'
PUBLICATION mantisnxt_core_replication
WITH (
  enabled = true,
  create_slot = true,
  slot_name = 'mantisnxt_replication_slot',
  copy_data = true,
  synchronous_commit = 'off',
  connect = true
);

-- Verify subscription created
SELECT
  subname,
  subenabled,
  subconninfo,
  subslotname,
  subsynccommit,
  subpublications
FROM pg_subscription
WHERE subname = 'mantisnxt_from_neon';

-- ============================================================================
-- SECTION 4: MONITOR SUBSCRIPTION STATUS
-- ============================================================================

-- Check subscription status
SELECT
  subname AS subscription_name,
  subenabled AS enabled,
  subpublications AS publications,
  pid,
  received_lsn,
  latest_end_lsn,
  latest_end_time,
  pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS lag_bytes
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon';

-- Check replication worker status
SELECT
  s.subname AS subscription_name,
  srw.relid::regclass AS table_name,
  srw.srsubstate AS state,
  srw.srsublsn AS lsn
FROM pg_subscription_rel srw
JOIN pg_subscription s ON s.oid = srw.srsubid
WHERE s.subname = 'mantisnxt_from_neon'
ORDER BY srw.relid::regclass::text;

-- Check for replication errors
SELECT
  subname AS subscription,
  pid,
  relid::regclass AS table_name,
  state,
  last_msg_send_time,
  last_msg_receipt_time,
  latest_end_lsn,
  latest_end_time
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon';

-- ============================================================================
-- SECTION 5: INITIAL DATA SYNC MONITORING
-- ============================================================================

-- Monitor initial table copy progress
-- This query shows which tables are being synchronized
SELECT
  s.subname AS subscription,
  srw.relid::regclass AS table,
  CASE srw.srsubstate
    WHEN 'i' THEN 'initializing'
    WHEN 'd' THEN 'data is being copied'
    WHEN 's' THEN 'synchronized'
    WHEN 'r' THEN 'ready (normal replication)'
  END AS state,
  srw.srsublsn AS lsn
FROM pg_subscription_rel srw
JOIN pg_subscription s ON s.oid = srw.srsubid
WHERE s.subname = 'mantisnxt_from_neon'
ORDER BY srw.relid::regclass::text;

-- Wait for initial sync to complete
-- Run this periodically until all tables show state 'r' (ready)
DO $$
DECLARE
  v_all_ready BOOLEAN;
  v_table_count INTEGER;
  v_ready_count INTEGER;
BEGIN
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE srsubstate = 'r') AS ready
  INTO v_table_count, v_ready_count
  FROM pg_subscription_rel srw
  JOIN pg_subscription s ON s.oid = srw.srsubid
  WHERE s.subname = 'mantisnxt_from_neon';

  v_all_ready := (v_table_count = v_ready_count);

  RAISE NOTICE 'Synchronization status: % of % tables ready', v_ready_count, v_table_count;

  IF v_all_ready THEN
    RAISE NOTICE 'All tables synchronized and ready for replication';
  ELSE
    RAISE NOTICE 'Waiting for % tables to complete initial sync', v_table_count - v_ready_count;
  END IF;
END $$;

-- ============================================================================
-- SECTION 6: VERIFY DATA REPLICATION
-- ============================================================================

-- Compare record counts between source and replica
-- Run this after initial sync completes

CREATE OR REPLACE FUNCTION core.verify_replication_counts()
RETURNS TABLE (
  table_name TEXT,
  local_count BIGINT,
  sync_state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT AS table_name,
    (SELECT COUNT(*) FROM ONLY c.oid::regclass) AS local_count,
    CASE srw.srsubstate
      WHEN 'i' THEN 'initializing'
      WHEN 'd' THEN 'copying data'
      WHEN 's' THEN 'synchronized'
      WHEN 'r' THEN 'ready'
    END AS sync_state
  FROM pg_subscription_rel srw
  JOIN pg_subscription sub ON sub.oid = srw.srsubid
  JOIN pg_class c ON c.oid = srw.relid
  WHERE sub.subname = 'mantisnxt_from_neon'
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- Execute verification
SELECT * FROM core.verify_replication_counts();

-- ============================================================================
-- SECTION 7: REPLICATION LAG MONITORING
-- ============================================================================

-- Create view for easy replication lag monitoring
CREATE OR REPLACE VIEW core.replication_lag AS
SELECT
  subname AS subscription_name,
  pid AS worker_pid,
  CASE
    WHEN received_lsn IS NULL THEN 'Not connected'
    WHEN received_lsn = latest_end_lsn THEN 'Up to date'
    ELSE 'Lagging'
  END AS status,
  received_lsn,
  latest_end_lsn,
  pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS lag_bytes,
  pg_size_pretty(pg_wal_lsn_diff(latest_end_lsn, received_lsn)) AS lag_size,
  latest_end_time,
  NOW() - latest_end_time AS time_lag,
  CASE
    WHEN NOW() - latest_end_time > INTERVAL '5 seconds' THEN 'WARNING: Lag > 5s'
    WHEN NOW() - latest_end_time > INTERVAL '1 second' THEN 'NOTICE: Lag > 1s'
    ELSE 'OK'
  END AS lag_status
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon';

-- Query replication lag
SELECT * FROM core.replication_lag;

-- ============================================================================
-- SECTION 8: SUBSCRIPTION MANAGEMENT COMMANDS
-- ============================================================================

-- Disable subscription (stops replication temporarily)
-- ALTER SUBSCRIPTION mantisnxt_from_neon DISABLE;

-- Enable subscription (resumes replication)
-- ALTER SUBSCRIPTION mantisnxt_from_neon ENABLE;

-- Refresh subscription (reload table list from publication)
-- ALTER SUBSCRIPTION mantisnxt_from_neon REFRESH PUBLICATION;

-- Change connection string
-- ALTER SUBSCRIPTION mantisnxt_from_neon CONNECTION 'new_connection_string';

-- Drop subscription (removes subscription and replication slot)
-- DROP SUBSCRIPTION IF EXISTS mantisnxt_from_neon;

-- ============================================================================
-- SECTION 9: TROUBLESHOOTING QUERIES
-- ============================================================================

-- Check for subscription errors in logs
SELECT
  subname,
  pid,
  backend_start,
  state,
  received_lsn,
  latest_end_lsn,
  latest_end_time
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon';

-- Check for conflicting data (if sync fails)
-- This helps identify data conflicts preventing replication
SELECT
  'Checking for potential conflicts' AS status;

-- Check worker processes
SELECT
  pid,
  backend_type,
  application_name,
  state,
  backend_start
FROM pg_stat_activity
WHERE backend_type = 'logical replication worker'
OR application_name LIKE '%mantisnxt%';

-- Check replication slot on subscriber
SELECT
  slot_name,
  plugin,
  slot_type,
  database,
  active,
  restart_lsn
FROM pg_replication_slots
WHERE slot_name LIKE '%mantisnxt%';

-- ============================================================================
-- SECTION 10: VALIDATION QUERIES
-- ============================================================================

DO $$
DECLARE
  v_sub_exists BOOLEAN;
  v_sub_enabled BOOLEAN;
  v_worker_running BOOLEAN;
BEGIN
  -- Check subscription exists
  SELECT EXISTS (
    SELECT 1 FROM pg_subscription WHERE subname = 'mantisnxt_from_neon'
  ) INTO v_sub_exists;

  -- Check subscription is enabled
  SELECT subenabled INTO v_sub_enabled
  FROM pg_subscription
  WHERE subname = 'mantisnxt_from_neon';

  -- Check worker is running
  SELECT EXISTS (
    SELECT 1 FROM pg_stat_subscription
    WHERE subname = 'mantisnxt_from_neon' AND pid IS NOT NULL
  ) INTO v_worker_running;

  RAISE NOTICE 'Subscription exists: %', v_sub_exists;
  RAISE NOTICE 'Subscription enabled: %', COALESCE(v_sub_enabled::TEXT, 'N/A');
  RAISE NOTICE 'Worker running: %', v_worker_running;

  IF NOT v_sub_exists THEN
    RAISE EXCEPTION 'Subscription was not created successfully!';
  END IF;

  IF NOT v_sub_enabled THEN
    RAISE WARNING 'Subscription exists but is disabled';
  END IF;

  IF NOT v_worker_running THEN
    RAISE WARNING 'Subscription worker is not running - check logs';
  END IF;

  RAISE NOTICE 'Subscription setup completed';
END $$;

-- ============================================================================
-- IMPORTANT NOTES FOR POSTGRES OLD SETUP
-- ============================================================================

/*
CRITICAL SETUP STEPS:

1. Prerequisites:
   - All migration scripts must be run on Postgres OLD first
   - Tables must have IDENTICAL structure to Neon
   - Ensure network connectivity from Postgres OLD to Neon (port 5432)

2. Connection String:
   - Update the CONNECTION parameter with actual Neon credentials
   - Use SSL mode (sslmode=require) for security
   - Verify Neon allows connections from Postgres OLD IP

3. Initial Sync:
   - copy_data = true will copy existing data from Neon
   - This can take time for large tables
   - Monitor progress with pg_subscription_rel queries

4. Ongoing Replication:
   - After initial sync, changes on Neon are replicated in real-time
   - Monitor lag using pg_stat_subscription
   - Alert if lag > 5 seconds

5. Conflicts:
   - DO NOT write to replicated tables on Postgres OLD
   - Writes should only happen on Neon (primary)
   - Postgres OLD is READ-ONLY replica for disaster recovery

6. Monitoring:
   - Check replication lag regularly
   - Monitor subscription worker status
   - Set up alerts for replication failures

7. Failover Procedure:
   - If Neon fails, you can promote Postgres OLD to primary
   - Drop subscription: DROP SUBSCRIPTION mantisnxt_from_neon
   - Enable writes on Postgres OLD
   - Update application connection string

8. Security:
   - Store Neon password securely (use environment variables)
   - Restrict network access to replication ports
   - Use TLS/SSL for all replication traffic
*/

-- ============================================================================
-- END OF SUBSCRIPTION SETUP
-- ============================================================================
