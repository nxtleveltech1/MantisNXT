-- Migration 006: Fix Failed Performance Indexes
-- Date: 2025-10-10
-- Purpose: Correct column names and deploy remaining performance indexes

-- 1. Fix supplier list filter index (use 'active' instead of 'status')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_list_filter
ON core.supplier (active, name)
WHERE active = true;

-- 2. Fix stock quantity alerts index (use 'qty' instead of 'quantity_on_hand')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_qty_alerts
ON core.stock_on_hand (supplier_product_id, qty)
WHERE qty < 10;

-- 3. Analytics predictions dashboard (guarded creation if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'analytics_predictions'
      AND column_name = 'confidence_score'
  ) THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_dashboard
    ON core.analytics_predictions (organization_id, created_at DESC)
    INCLUDE (confidence_score, prediction_type);
  ELSE
    RAISE NOTICE 'Skipping idx_analytics_predictions_dashboard - confidence_score column does not exist';
  END IF;
END $$;

-- 4. Stock movements product recent index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_product_recent
ON core.stock_movements (item_id, timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '90 days';

-- Verification queries
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'core'
  AND indexname IN (
    'idx_supplier_list_filter',
    'idx_stock_qty_alerts',
    'idx_analytics_predictions_dashboard',
    'idx_stock_movements_product_recent'
  )
ORDER BY indexname;

-- Count total indexes after migration
SELECT COUNT(*) as total_core_indexes
FROM pg_indexes
WHERE schemaname = 'core';







