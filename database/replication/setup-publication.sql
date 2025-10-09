-- ============================================================================
-- MantisNXT Logical Replication Setup - Publication (Neon Primary)
-- ============================================================================
-- ADR: ADR-1 (Logical Replication Configuration)
-- Purpose: Configure publication on Neon for replication to Postgres OLD
-- Database: Neon Primary (ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech)
-- Target: Disaster recovery and data redundancy
-- Author: Data Oracle
-- Date: 2025-10-09
-- ============================================================================

-- IMPORTANT: Run this on NEON PRIMARY database
-- Connection: DATABASE_URL from .env.local (Neon)

-- ============================================================================
-- SECTION 1: VERIFY REPLICATION PREREQUISITES
-- ============================================================================

-- Check if logical replication is enabled
DO $$
DECLARE
  v_wal_level TEXT;
  v_max_wal_senders INTEGER;
  v_max_replication_slots INTEGER;
BEGIN
  -- Check WAL level (must be 'logical')
  SELECT setting INTO v_wal_level
  FROM pg_settings
  WHERE name = 'wal_level';

  SELECT setting::INTEGER INTO v_max_wal_senders
  FROM pg_settings
  WHERE name = 'max_wal_senders';

  SELECT setting::INTEGER INTO v_max_replication_slots
  FROM pg_settings
  WHERE name = 'max_replication_slots';

  RAISE NOTICE 'WAL Level: % (must be "logical")', v_wal_level;
  RAISE NOTICE 'Max WAL Senders: % (should be > 0)', v_max_wal_senders;
  RAISE NOTICE 'Max Replication Slots: % (should be > 0)', v_max_replication_slots;

  IF v_wal_level != 'logical' THEN
    RAISE WARNING 'WAL level is %. Logical replication requires "logical". Contact Neon support to enable.', v_wal_level;
  END IF;

  IF v_max_wal_senders = 0 OR v_max_replication_slots = 0 THEN
    RAISE WARNING 'Replication parameters not configured. Contact Neon support.';
  END IF;
END $$;

-- Check current user privileges
SELECT
  rolname,
  rolsuper,
  rolreplication,
  rolcanlogin
FROM pg_roles
WHERE rolname = CURRENT_USER;

-- ============================================================================
-- SECTION 2: CREATE PUBLICATION FOR CORE TABLES
-- ============================================================================

-- Drop existing publication if exists (for clean setup)
DROP PUBLICATION IF EXISTS mantisnxt_core_replication;

-- Create publication for all core schema tables
CREATE PUBLICATION mantisnxt_core_replication
FOR TABLE
  core.inventory_items,
  core.product,
  core.supplier,
  core.supplier_product,
  core.stock_movement,
  core.stock_on_hand,
  core.stock_location,
  core.analytics_events,
  core.brand,
  core.purchase_orders,
  core.purchase_order_items
WITH (publish = 'insert, update, delete');

-- Verify publication created
SELECT
  pubname,
  puballtables,
  pubinsert,
  pubupdate,
  pubdelete,
  pubtruncate
FROM pg_publication
WHERE pubname = 'mantisnxt_core_replication';

-- List all tables included in publication
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS table_size
FROM pg_publication_tables
WHERE pubname = 'mantisnxt_core_replication'
ORDER BY schemaname, tablename;

-- ============================================================================
-- SECTION 3: CREATE REPLICATION USER (OPTIONAL - Neon Managed)
-- ============================================================================

-- Note: Neon typically manages replication users.
-- If you need a specific replication user, uncomment and modify:

/*
-- Create dedicated replication user (if allowed by Neon)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'replication_user') THEN
    CREATE ROLE replication_user WITH REPLICATION LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
    GRANT USAGE ON SCHEMA core TO replication_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA core TO replication_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT SELECT ON TABLES TO replication_user;
  END IF;
END $$;
*/

-- ============================================================================
-- SECTION 4: CONFIGURE REPLICATION SLOT (OPTIONAL)
-- ============================================================================

-- Note: Neon typically manages replication slots automatically.
-- Manual slot creation may not be necessary or allowed.

-- Check existing replication slots
SELECT
  slot_name,
  plugin,
  slot_type,
  database,
  active,
  restart_lsn,
  confirmed_flush_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS replication_lag_bytes
FROM pg_replication_slots
WHERE database = CURRENT_DATABASE();

-- Create replication slot (if needed and allowed)
-- This will be created automatically when subscription connects
-- Uncomment only if manual creation is required:

/*
SELECT pg_create_logical_replication_slot(
  'mantisnxt_replication_slot',
  'pgoutput'
);
*/

-- ============================================================================
-- SECTION 5: GRANT PERMISSIONS FOR PUBLICATION
-- ============================================================================

-- Grant necessary permissions on publication (for subscription to connect)
-- Note: Neon may handle this automatically

-- Grant select on all tables in publication to replication role
DO $$
DECLARE
  v_table RECORD;
BEGIN
  FOR v_table IN
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'mantisnxt_core_replication'
  LOOP
    EXECUTE format('GRANT SELECT ON %I.%I TO neondb_owner',
      v_table.schemaname,
      v_table.tablename
    );
  END LOOP;
END $$;

-- ============================================================================
-- SECTION 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify publication exists and is properly configured
DO $$
DECLARE
  v_pub_exists BOOLEAN;
  v_table_count INTEGER;
BEGIN
  -- Check publication exists
  SELECT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'mantisnxt_core_replication'
  ) INTO v_pub_exists;

  -- Count tables in publication
  SELECT COUNT(*) INTO v_table_count
  FROM pg_publication_tables
  WHERE pubname = 'mantisnxt_core_replication';

  RAISE NOTICE 'Publication exists: %', v_pub_exists;
  RAISE NOTICE 'Tables in publication: %', v_table_count;

  IF NOT v_pub_exists THEN
    RAISE EXCEPTION 'Publication was not created successfully!';
  END IF;

  IF v_table_count < 11 THEN
    RAISE WARNING 'Expected 11 tables in publication, found: %', v_table_count;
  END IF;

  RAISE NOTICE 'Publication setup completed successfully';
END $$;

-- ============================================================================
-- SECTION 7: MONITORING QUERIES (FOR ONGOING USE)
-- ============================================================================

-- Query to check publication status
-- Run this periodically to monitor replication health

-- Publication details
SELECT
  pubname AS publication_name,
  puballtables AS all_tables,
  pubinsert AS publishes_insert,
  pubupdate AS publishes_update,
  pubdelete AS publishes_delete,
  pubtruncate AS publishes_truncate
FROM pg_publication
WHERE pubname = 'mantisnxt_core_replication';

-- Tables in publication with sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
  pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_publication_tables
WHERE pubname = 'mantisnxt_core_replication'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Active replication slots (should show subscription connection)
SELECT
  slot_name,
  plugin,
  slot_type,
  database,
  active,
  active_pid,
  restart_lsn,
  confirmed_flush_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag_bytes,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes_raw
FROM pg_replication_slots
WHERE database = CURRENT_DATABASE()
ORDER BY slot_name;

-- WAL sender processes (shows active replication connections)
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
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
FROM pg_stat_replication
ORDER BY application_name;

-- ============================================================================
-- SECTION 8: TROUBLESHOOTING QUERIES
-- ============================================================================

-- If publication is not working, check these:

-- 1. Verify WAL settings
SELECT name, setting, unit, context
FROM pg_settings
WHERE name IN ('wal_level', 'max_wal_senders', 'max_replication_slots', 'wal_sender_timeout')
ORDER BY name;

-- 2. Check table ownership (all should be owned by neondb_owner or accessible)
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'core'
AND tablename IN (
  'inventory_items', 'product', 'supplier', 'supplier_product',
  'stock_movement', 'stock_on_hand', 'stock_location',
  'analytics_events', 'brand', 'purchase_orders', 'purchase_order_items'
)
ORDER BY tablename;

-- 3. Check for table locks that might prevent replication
SELECT
  l.pid,
  l.mode,
  l.granted,
  c.relname AS table_name,
  a.query
FROM pg_locks l
JOIN pg_class c ON c.oid = l.relation
JOIN pg_stat_activity a ON a.pid = l.pid
WHERE c.relnamespace = 'core'::regnamespace
AND NOT l.granted
ORDER BY c.relname;

-- ============================================================================
-- NEON-SPECIFIC NOTES
-- ============================================================================

/*
IMPORTANT NEON CONSIDERATIONS:

1. Logical Replication Support:
   - Neon supports logical replication on paid plans
   - Free tier may have limitations
   - Check Neon documentation: https://neon.tech/docs/guides/logical-replication

2. Configuration:
   - WAL settings are managed by Neon
   - You cannot modify postgresql.conf directly
   - Contact Neon support if wal_level is not 'logical'

3. Connection String:
   - Use the connection string from Neon console
   - Ensure SSL is enabled (sslmode=require)
   - The subscriber needs network access to Neon's endpoint

4. Performance Considerations:
   - Replication slot consumes WAL space
   - Monitor slot lag to prevent WAL buildup
   - Consider using pgBouncer for connection pooling

5. Security:
   - Neon databases are TLS-encrypted by default
   - Use strong passwords for replication users
   - Restrict IP access if possible (Neon IP allowlist)

6. Monitoring:
   - Use pg_stat_replication on publisher
   - Use pg_stat_subscription on subscriber
   - Monitor replication lag regularly
*/

-- ============================================================================
-- END OF PUBLICATION SETUP
-- ============================================================================
