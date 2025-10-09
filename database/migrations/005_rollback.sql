-- Rollback Migration 005: Performance Optimization Indexes
-- Purpose: Remove indexes created in migration 005
-- Created: 2025-10-09

-- Drop all indexes created in migration 005
DROP INDEX CONCURRENTLY IF EXISTS core.idx_supplier_list_filter;
DROP INDEX CONCURRENTLY IF EXISTS core.idx_stock_qty_alerts;
DROP INDEX CONCURRENTLY IF EXISTS core.idx_supplier_product_active_search;
DROP INDEX CONCURRENTLY IF EXISTS core.idx_price_history_current_covering;
DROP INDEX CONCURRENTLY IF EXISTS core.idx_pricelist_items_active;
DROP INDEX CONCURRENTLY IF EXISTS core.idx_analytics_anomalies_dashboard;
DROP INDEX CONCURRENTLY IF EXISTS core.idx_analytics_predictions_dashboard;
DROP INDEX CONCURRENTLY IF EXISTS core.idx_stock_movements_product_recent;

-- Verification
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
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

  IF remaining_count = 0 THEN
    RAISE NOTICE 'All performance optimization indexes successfully removed';
  ELSE
    RAISE WARNING 'Found % indexes still present after rollback', remaining_count;
  END IF;
END $$;
