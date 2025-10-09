-- Migration 005: Performance Optimization Indexes
-- Purpose: Add missing composite indexes identified in backend audit
-- Created: 2025-10-09
-- Author: Aster (Backend Architecture Audit)

-- ============================================================================
-- OPTIMIZATION #1: Supplier List Filtering
-- ============================================================================
-- Common query pattern: SELECT * FROM core.supplier
--   WHERE status = 'active' AND performance_tier = 'gold'
-- Current: Two separate indexes (idx_supplier_active, no performance_tier index)
-- Improvement: Composite index for common filter combinations

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_list_filter
  ON core.supplier (status, performance_tier, primary_category)
  WHERE status = 'active';

COMMENT ON INDEX idx_supplier_list_filter IS
  'Composite index for supplier list filtering by status, tier, and category';

-- ============================================================================
-- OPTIMIZATION #2: Low Stock Alerts
-- ============================================================================
-- Common query pattern: SELECT * FROM public.inventory_items
--   WHERE stock_qty <= reorder_point AND stock_qty > 0
-- Current: No specific index for this pattern
-- Improvement: Partial index for low stock items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_qty_alerts
  ON core.stock_on_hand (quantity_on_hand, location_id, supplier_product_id)
  WHERE quantity_on_hand > 0 AND quantity_on_hand < 10;

COMMENT ON INDEX idx_stock_qty_alerts IS
  'Partial index for low stock alerts (qty between 1-10)';

-- ============================================================================
-- OPTIMIZATION #3: Supplier Product Search with Active Filter
-- ============================================================================
-- Common query pattern: SELECT * FROM core.supplier_product
--   WHERE supplier_id = X AND is_active = true
--   AND name_from_supplier ILIKE '%search%'
-- Current: Separate indexes, trigram index exists but not combined
-- Improvement: Composite index with supplier_id + is_active

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_product_active_search
  ON core.supplier_product (supplier_id, is_active)
  WHERE is_active = true;

COMMENT ON INDEX idx_supplier_product_active_search IS
  'Composite index for supplier product filtering by supplier and active status';

-- ============================================================================
-- OPTIMIZATION #4: Price History Current Price Lookup
-- ============================================================================
-- Common query pattern: Lateral join to get current price
--   FROM core.price_history WHERE supplier_product_id = X AND is_current = true
-- Current: idx_price_history_current exists but could be improved
-- Improvement: Covering index with price included

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_current_covering
  ON core.price_history (supplier_product_id, is_current)
  INCLUDE (price, valid_from, valid_to)
  WHERE is_current = true;

COMMENT ON INDEX idx_price_history_current_covering IS
  'Covering index for current price lookups (includes price data)';

-- ============================================================================
-- OPTIMIZATION #5: Pricelist Items by Active Pricelist
-- ============================================================================
-- Common query pattern: Get all items from active pricelists
--   JOIN core.pricelist_items ON pricelist_id = X
--   WHERE core.supplier_pricelists.is_active = true
-- Current: idx_pricelist_items_pricelist_id exists
-- Improvement: Additional composite for common joins

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pricelist_items_active
  ON core.pricelist_items (pricelist_id, sku, unit_price);

COMMENT ON INDEX idx_pricelist_items_active IS
  'Composite index for pricelist item queries (pricelist + sku + price)';

-- ============================================================================
-- OPTIMIZATION #6: Analytics Dashboard Queries
-- ============================================================================
-- Common query pattern: Recent anomalies and predictions
-- Current: Separate indexes on organization_id and timestamps
-- Improvement: Composite for dashboard queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_dashboard
  ON core.analytics_anomalies (organization_id, detected_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_dashboard
  ON core.analytics_predictions (organization_id, created_at DESC, confidence_score)
  WHERE confidence_score > 0.7;

COMMENT ON INDEX idx_analytics_anomalies_dashboard IS
  'Dashboard query optimization for unresolved anomalies by org';

COMMENT ON INDEX idx_analytics_predictions_dashboard IS
  'Dashboard query optimization for high-confidence predictions';

-- ============================================================================
-- OPTIMIZATION #7: Stock Movement History
-- ============================================================================
-- Common query pattern: Get recent movements for a product
-- Current: idx_stock_movements_item_id, idx_stock_movements_timestamp
-- Improvement: Composite for common queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_product_recent
  ON core.stock_movements (item_id, "timestamp" DESC, type);

COMMENT ON INDEX idx_stock_movements_product_recent IS
  'Composite index for recent stock movements by product';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all indexes were created successfully
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'core'
    AND indexname IN (
      'idx_supplier_list_filter',
      'idx_stock_qty_alerts',
      'idx_supplier_product_active_search',
      'idx_price_history_current_covering',
      'idx_pricelist_items_active',
      'idx_analytics_anomalies_dashboard',
      'idx_analytics_predictions_dashboard',
      'idx_stock_movements_product_recent'
    );

  RAISE NOTICE 'Created % performance optimization indexes', index_count;

  IF index_count < 8 THEN
    RAISE WARNING 'Expected 8 indexes but only created %', index_count;
  END IF;
END $$;

-- ============================================================================
-- PERFORMANCE IMPACT ESTIMATE
-- ============================================================================

-- Expected improvements:
-- - Supplier list queries: 40-60% faster (composite index usage)
-- - Low stock alerts: 70-80% faster (partial index)
-- - Supplier product search: 30-50% faster (better selectivity)
-- - Price lookups: 20-30% faster (covering index)
-- - Analytics dashboard: 50-60% faster (composite indexes)
-- - Stock movement history: 40-50% faster (composite index)

-- Overall expected improvement: 45-65% reduction in query execution time
-- for common dashboard and list operations.

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, execute 005_rollback.sql
-- or manually drop indexes:
--
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_supplier_list_filter;
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_stock_qty_alerts;
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_supplier_product_active_search;
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_price_history_current_covering;
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_pricelist_items_active;
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_analytics_anomalies_dashboard;
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_analytics_predictions_dashboard;
-- DROP INDEX CONCURRENTLY IF EXISTS core.idx_stock_movements_product_recent;
