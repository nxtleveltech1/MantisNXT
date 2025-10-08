-- =====================================================
-- SLOW QUERY ANALYSIS SCRIPT
-- Purpose: Diagnose and analyze slow queries in production
-- =====================================================

-- Enable timing for all queries
\timing on

-- =====================================================
-- 1. IDENTIFY SLOW QUERIES FROM pg_stat_statements
-- =====================================================

-- Requires pg_stat_statements extension
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 20 slowest queries by average execution time
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Top 20 queries by total execution time (most impactful)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  (total_exec_time / sum(total_exec_time) OVER ()) * 100 AS pct_total_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- =====================================================
-- 2. ANALYZE INVENTORY_ITEMS TABLE
-- =====================================================

-- Table statistics
SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'inventory_items';

-- Index usage statistics
SELECT
  indexrelname AS index_name,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND tablename = 'inventory_items'
ORDER BY idx_scan DESC;

-- Unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexrelname AS index_name,
  idx_scan AS index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
  AND tablename = 'inventory_items'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- 3. TEST QUERY PERFORMANCE WITH EXPLAIN ANALYZE
-- =====================================================

-- Test 1: ILIKE search on SKU (should use trigram index)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE sku ILIKE '%ABC%'
LIMIT 50;

-- Test 2: ILIKE search on name (should use trigram index)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE name ILIKE '%Widget%'
LIMIT 50;

-- Test 3: Combined search (should use both trigram indexes)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE (sku ILIKE '%ABC%' OR name ILIKE '%ABC%')
LIMIT 50;

-- Test 4: Category filter with ANY (should use GIN index)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE category = ANY(ARRAY['Electronics', 'Hardware'])
LIMIT 50;

-- Test 5: Supplier + category + stock filter (should use composite index)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE supplier_id = 'some-uuid-here'
  AND category = 'Electronics'
  AND stock_qty > 0
LIMIT 50;

-- Test 6: Low stock query (should use partial index)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE stock_qty > 0
  AND stock_qty <= reorder_point
LIMIT 50;

-- Test 7: Out of stock query (should use partial index)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE stock_qty = 0
LIMIT 50;

-- Test 8: Large OFFSET pagination (slow - should use cursor instead)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
ORDER BY sku ASC
LIMIT 50 OFFSET 10000;

-- Test 9: Cursor-based pagination (fast alternative)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM inventory_items
WHERE (sku > 'LAST_SKU' OR (sku = 'LAST_SKU' AND id > 'last-uuid'))
ORDER BY sku ASC, id ASC
LIMIT 50;

-- =====================================================
-- 4. ANALYZE SUPPLIERS TABLE
-- =====================================================

-- Table statistics
SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE tablename = 'suppliers';

-- Index usage
SELECT
  indexrelname AS index_name,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND tablename = 'suppliers'
ORDER BY idx_scan DESC;

-- Test supplier search (should use trigram index)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM suppliers
WHERE name ILIKE '%Corp%' AND status = 'active'
LIMIT 50;

-- =====================================================
-- 5. CHECK FOR MISSING INDEXES
-- =====================================================

-- Queries that might benefit from indexes
SELECT
  schemaname,
  tablename,
  seq_scan AS sequential_scans,
  seq_tup_read AS rows_read_sequentially,
  idx_scan AS index_scans,
  n_live_tup AS row_count,
  CASE
    WHEN seq_scan > 0 THEN seq_tup_read / seq_scan
    ELSE 0
  END AS avg_rows_per_seq_scan
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 0
  AND seq_tup_read > 0
ORDER BY seq_tup_read DESC
LIMIT 20;

-- =====================================================
-- 6. MAINTENANCE RECOMMENDATIONS
-- =====================================================

-- Tables that need VACUUM
SELECT
  schemaname,
  tablename,
  n_dead_tup AS dead_rows,
  n_live_tup AS live_rows,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 1000
ORDER BY dead_pct DESC;

-- Tables that need ANALYZE
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze,
  n_mod_since_analyze AS modifications_since_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_mod_since_analyze > 1000
ORDER BY n_mod_since_analyze DESC;

-- =====================================================
-- 7. RECOMMENDATIONS
-- =====================================================

/*
Based on the analysis above:

1. If ILIKE queries show "Seq Scan" instead of "Bitmap Index Scan":
   - Trigram indexes are missing or not being used
   - Run the migration script to create trigram indexes

2. If queries show high "Buffers: shared read" values:
   - Data is not in cache, causing disk I/O
   - Consider increasing shared_buffers in PostgreSQL config
   - Run VACUUM ANALYZE to update statistics

3. If queries show "Seq Scan" on large tables:
   - Missing indexes for filter conditions
   - Add composite indexes for common filter combinations

4. If pagination queries are slow:
   - Large OFFSET values cause performance issues
   - Switch to cursor-based pagination

5. If index scans are low or zero:
   - Indexes are not being used
   - Check query structure and WHERE clause order
   - Update table statistics with ANALYZE

6. If dead_pct is high (>10%):
   - Run VACUUM to reclaim space
   - Consider adjusting autovacuum settings
*/

