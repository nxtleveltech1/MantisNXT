-- ============================================================================
-- MantisNXT Replication Monitoring Queries
-- ============================================================================
-- ADR: ADR-1 (Logical Replication Configuration)
-- Purpose: Comprehensive monitoring queries for replication health
-- Author: Data Oracle
-- Date: 2025-10-09
-- ============================================================================

-- ============================================================================
-- SECTION 1: PUBLISHER (NEON) MONITORING QUERIES
-- ============================================================================

-- Run these queries on NEON PRIMARY database

-- 1.1: Check Publication Status
-- ============================================================================
SELECT
  pubname AS publication_name,
  puballtables AS all_tables,
  pubinsert AS insert,
  pubupdate AS update,
  pubdelete AS delete,
  pubtruncate AS truncate
FROM pg_publication
WHERE pubname = 'mantisnxt_core_replication';

-- 1.2: List Tables in Publication with Sizes
-- ============================================================================
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_publication_tables
WHERE pubname = 'mantisnxt_core_replication'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- 1.3: Check Active Replication Slots
-- ============================================================================
SELECT
  slot_name,
  plugin,
  slot_type,
  database,
  active,
  active_pid,
  restart_lsn,
  confirmed_flush_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag_size,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes,
  CASE
    WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824 THEN 'CRITICAL: >1GB lag'
    WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 104857600 THEN 'WARNING: >100MB lag'
    ELSE 'OK'
  END AS lag_status
FROM pg_replication_slots
WHERE database = CURRENT_DATABASE()
AND slot_name LIKE '%mantisnxt%'
ORDER BY slot_name;

-- 1.4: Check WAL Sender Processes (Active Replication Connections)
-- ============================================================================
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  client_port,
  backend_start,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  sync_state,
  pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS replication_lag,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
  CASE
    WHEN state != 'streaming' THEN 'ERROR: Not streaming'
    WHEN pg_wal_lsn_diff(sent_lsn, replay_lsn) > 10485760 THEN 'WARNING: >10MB lag'
    ELSE 'OK'
  END AS status
FROM pg_stat_replication
ORDER BY application_name;

-- 1.5: WAL Generation Rate (for capacity planning)
-- ============================================================================
SELECT
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) AS total_wal_generated,
  pg_current_wal_lsn() AS current_wal_lsn;

-- 1.6: Replication Lag Summary (Publisher Side)
-- ============================================================================
SELECT
  COALESCE(application_name, 'No active replication') AS subscriber,
  COALESCE(state, 'N/A') AS state,
  COALESCE(pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)), 'N/A') AS lag_size,
  COALESCE(pg_wal_lsn_diff(sent_lsn, replay_lsn)::TEXT, 'N/A') AS lag_bytes,
  CASE
    WHEN state IS NULL THEN 'ERROR: No connection'
    WHEN state != 'streaming' THEN 'ERROR: Not streaming'
    WHEN pg_wal_lsn_diff(sent_lsn, replay_lsn) > 10485760 THEN 'WARNING'
    ELSE 'OK'
  END AS health_status
FROM pg_stat_replication
WHERE application_name LIKE '%mantisnxt%' OR application_name IS NULL;

-- ============================================================================
-- SECTION 2: SUBSCRIBER (POSTGRES OLD) MONITORING QUERIES
-- ============================================================================

-- Run these queries on POSTGRES OLD (REPLICA) database

-- 2.1: Check Subscription Status
-- ============================================================================
SELECT
  subname AS subscription_name,
  subenabled AS enabled,
  subpublications AS publications,
  subslotname AS slot_name,
  subsynccommit AS sync_commit
FROM pg_subscription
WHERE subname = 'mantisnxt_from_neon';

-- 2.2: Subscription Worker Status and Lag
-- ============================================================================
SELECT
  subname AS subscription,
  pid AS worker_pid,
  CASE
    WHEN pid IS NULL THEN 'ERROR: Worker not running'
    WHEN received_lsn IS NULL THEN 'ERROR: No data received'
    WHEN received_lsn = latest_end_lsn THEN 'OK: Up to date'
    ELSE 'WARNING: Lagging'
  END AS status,
  received_lsn,
  latest_end_lsn,
  pg_size_pretty(pg_wal_lsn_diff(latest_end_lsn, received_lsn)) AS lag_size,
  pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS lag_bytes,
  latest_end_time AS last_message_time,
  NOW() - latest_end_time AS time_lag,
  CASE
    WHEN pid IS NULL THEN 'CRITICAL: No worker'
    WHEN NOW() - latest_end_time > INTERVAL '10 seconds' THEN 'CRITICAL: Lag >10s'
    WHEN NOW() - latest_end_time > INTERVAL '5 seconds' THEN 'WARNING: Lag >5s'
    WHEN NOW() - latest_end_time > INTERVAL '1 second' THEN 'NOTICE: Lag >1s'
    ELSE 'OK'
  END AS lag_status
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon';

-- 2.3: Table Synchronization Status
-- ============================================================================
SELECT
  s.subname AS subscription,
  srw.relid::regclass AS table_name,
  CASE srw.srsubstate
    WHEN 'i' THEN 'initializing'
    WHEN 'd' THEN 'data is being copied'
    WHEN 's' THEN 'synchronized'
    WHEN 'r' THEN 'ready (streaming)'
    ELSE 'unknown'
  END AS sync_state,
  srw.srsublsn AS lsn
FROM pg_subscription_rel srw
JOIN pg_subscription s ON s.oid = srw.srsubid
WHERE s.subname = 'mantisnxt_from_neon'
ORDER BY
  CASE srw.srsubstate
    WHEN 'r' THEN 1
    WHEN 's' THEN 2
    WHEN 'd' THEN 3
    WHEN 'i' THEN 4
  END,
  srw.relid::regclass::text;

-- 2.4: Replication Worker Processes
-- ============================================================================
SELECT
  pid,
  backend_type,
  application_name,
  state,
  backend_start,
  state_change,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE backend_type LIKE '%logical replication%'
OR application_name LIKE '%mantisnxt%'
ORDER BY backend_start;

-- 2.5: Table Record Counts (for data consistency verification)
-- ============================================================================
SELECT
  c.relname AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS table_size,
  (SELECT COUNT(*) FROM ONLY c.oid::regclass) AS record_count,
  CASE srw.srsubstate
    WHEN 'r' THEN 'ready'
    WHEN 's' THEN 'syncing'
    WHEN 'd' THEN 'copying'
    WHEN 'i' THEN 'initializing'
  END AS replication_state
FROM pg_subscription_rel srw
JOIN pg_subscription sub ON sub.oid = srw.srsubid
JOIN pg_class c ON c.oid = srw.relid
WHERE sub.subname = 'mantisnxt_from_neon'
ORDER BY pg_total_relation_size(c.oid) DESC;

-- 2.6: Replication Lag Detailed Analysis
-- ============================================================================
WITH lag_stats AS (
  SELECT
    subname,
    pid,
    received_lsn,
    latest_end_lsn,
    pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS lag_bytes,
    EXTRACT(EPOCH FROM (NOW() - latest_end_time)) AS lag_seconds,
    latest_end_time
  FROM pg_stat_subscription
  WHERE subname = 'mantisnxt_from_neon'
)
SELECT
  subname AS subscription,
  pid AS worker_pid,
  pg_size_pretty(lag_bytes) AS lag_size,
  ROUND(lag_seconds::NUMERIC, 2) AS lag_seconds,
  CASE
    WHEN lag_seconds > 10 THEN 'CRITICAL'
    WHEN lag_seconds > 5 THEN 'WARNING'
    WHEN lag_seconds > 1 THEN 'NOTICE'
    ELSE 'OK'
  END AS severity,
  to_char(latest_end_time, 'YYYY-MM-DD HH24:MI:SS') AS last_message
FROM lag_stats;

-- ============================================================================
-- SECTION 3: DATA CONSISTENCY VERIFICATION QUERIES
-- ============================================================================

-- Run these queries on BOTH databases to compare results

-- 3.1: Record Count Summary
-- ============================================================================
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

-- 3.2: Sample Data Verification (check recent records)
-- ============================================================================
SELECT
  'stock_movement' AS table_name,
  movement_id AS record_id,
  movement_ts AS timestamp
FROM core.stock_movement
ORDER BY movement_ts DESC
LIMIT 5;

-- 3.3: Checksum Verification (advanced consistency check)
-- ============================================================================
-- This creates checksums to verify data integrity
SELECT
  'product' AS table_name,
  COUNT(*) AS record_count,
  MD5(STRING_AGG(product_id::TEXT, ',' ORDER BY product_id)) AS id_checksum
FROM core.product
UNION ALL
SELECT
  'supplier' AS table_name,
  COUNT(*) AS record_count,
  MD5(STRING_AGG(supplier_id::TEXT, ',' ORDER BY supplier_id)) AS id_checksum
FROM core.supplier;

-- ============================================================================
-- SECTION 4: HEALTH CHECK SUMMARY VIEWS
-- ============================================================================

-- 4.1: Create Health Check View (for subscriber)
-- ============================================================================
CREATE OR REPLACE VIEW core.replication_health AS
SELECT
  'mantisnxt_from_neon' AS subscription_name,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_subscription WHERE subname = 'mantisnxt_from_neon')
      THEN 'CRITICAL: Subscription does not exist'
    WHEN NOT (SELECT subenabled FROM pg_subscription WHERE subname = 'mantisnxt_from_neon')
      THEN 'CRITICAL: Subscription is disabled'
    WHEN NOT EXISTS (SELECT 1 FROM pg_stat_subscription WHERE subname = 'mantisnxt_from_neon' AND pid IS NOT NULL)
      THEN 'CRITICAL: Worker not running'
    WHEN EXISTS (
      SELECT 1 FROM pg_stat_subscription
      WHERE subname = 'mantisnxt_from_neon'
      AND NOW() - latest_end_time > INTERVAL '10 seconds'
    )
      THEN 'CRITICAL: Replication lag > 10 seconds'
    WHEN EXISTS (
      SELECT 1 FROM pg_stat_subscription
      WHERE subname = 'mantisnxt_from_neon'
      AND NOW() - latest_end_time > INTERVAL '5 seconds'
    )
      THEN 'WARNING: Replication lag > 5 seconds'
    WHEN EXISTS (
      SELECT 1 FROM pg_subscription_rel srw
      JOIN pg_subscription s ON s.oid = srw.srsubid
      WHERE s.subname = 'mantisnxt_from_neon'
      AND srw.srsubstate != 'r'
    )
      THEN 'WARNING: Some tables not ready'
    ELSE 'OK: Replication healthy'
  END AS health_status,
  (
    SELECT COUNT(*)
    FROM pg_subscription_rel srw
    JOIN pg_subscription s ON s.oid = srw.srsubid
    WHERE s.subname = 'mantisnxt_from_neon'
    AND srw.srsubstate = 'r'
  ) AS tables_ready,
  (
    SELECT COUNT(*)
    FROM pg_subscription_rel srw
    JOIN pg_subscription s ON s.oid = srw.srsubid
    WHERE s.subname = 'mantisnxt_from_neon'
  ) AS total_tables,
  (
    SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - latest_end_time))::NUMERIC, 2)
    FROM pg_stat_subscription
    WHERE subname = 'mantisnxt_from_neon'
  ) AS lag_seconds,
  (
    SELECT pg_size_pretty(pg_wal_lsn_diff(latest_end_lsn, received_lsn))
    FROM pg_stat_subscription
    WHERE subname = 'mantisnxt_from_neon'
  ) AS lag_size,
  NOW() AS checked_at;

-- Query the health check view
SELECT * FROM core.replication_health;

-- ============================================================================
-- SECTION 5: ALERTING QUERIES
-- ============================================================================

-- 5.1: Critical Issues Requiring Immediate Action
-- ============================================================================
SELECT
  'CRITICAL' AS severity,
  'Subscription worker not running' AS issue,
  'Check logs and restart subscription' AS action
FROM pg_subscription sub
WHERE sub.subname = 'mantisnxt_from_neon'
AND NOT EXISTS (
  SELECT 1 FROM pg_stat_subscription stat
  WHERE stat.subname = sub.subname AND stat.pid IS NOT NULL
)
UNION ALL
SELECT
  'CRITICAL',
  'Replication lag exceeds 10 seconds',
  'Investigate network/performance issues'
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon'
AND NOW() - latest_end_time > INTERVAL '10 seconds'
UNION ALL
SELECT
  'CRITICAL',
  'Replication slot lag exceeds 1GB on publisher',
  'Check if subscriber is connected and healthy'
WHERE EXISTS (
  SELECT 1 FROM pg_replication_slots
  WHERE slot_name LIKE '%mantisnxt%'
  AND pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824
);

-- 5.2: Warnings Requiring Attention
-- ============================================================================
SELECT
  'WARNING' AS severity,
  'Replication lag between 5-10 seconds' AS issue,
  'Monitor closely, may need investigation' AS action
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon'
AND NOW() - latest_end_time BETWEEN INTERVAL '5 seconds' AND INTERVAL '10 seconds'
UNION ALL
SELECT
  'WARNING',
  'Some tables not in ready state',
  'Check table sync status'
FROM pg_subscription_rel srw
JOIN pg_subscription s ON s.oid = srw.srsubid
WHERE s.subname = 'mantisnxt_from_neon'
AND srw.srsubstate != 'r'
LIMIT 1;

-- ============================================================================
-- SECTION 6: PERFORMANCE METRICS
-- ============================================================================

-- 6.1: Replication Throughput (approximate)
-- ============================================================================
SELECT
  subname AS subscription,
  pg_size_pretty(pg_wal_lsn_diff(latest_end_lsn, received_lsn)) AS pending_data,
  ROUND(
    pg_wal_lsn_diff(latest_end_lsn, received_lsn)::NUMERIC /
    GREATEST(EXTRACT(EPOCH FROM (NOW() - latest_end_time)), 1),
    2
  ) AS bytes_per_second,
  pg_size_pretty(
    ROUND(
      pg_wal_lsn_diff(latest_end_lsn, received_lsn)::NUMERIC /
      GREATEST(EXTRACT(EPOCH FROM (NOW() - latest_end_time)), 1)
    )::BIGINT
  ) AS throughput
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon';

-- ============================================================================
-- END OF MONITORING QUERIES
-- ============================================================================
