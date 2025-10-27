-- Migration: Add indexes to optimize inventory alerts queries
-- Created: 2025-09-30
-- Purpose: Speed up alerts endpoint by adding composite indexes
-- Note: CONCURRENTLY removed to allow execution in transaction blocks

-- Index for alerts query WHERE clause (stock_qty checks and reorder_point comparisons)
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_stock_levels
ON inventory_items (stock_qty, reorder_point, updated_at DESC)
WHERE stock_qty <= reorder_point OR stock_qty = 0;

-- Index for supplier JOIN in alerts query
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_join
ON inventory_items (supplier_id)
WHERE supplier_id IS NOT NULL;

-- Partial index for out of stock items (most critical alerts)
CREATE INDEX IF NOT EXISTS idx_inventory_out_of_stock
ON inventory_items (updated_at DESC)
WHERE stock_qty = 0;

-- Partial index for low stock items
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
ON inventory_items (stock_qty, reorder_point, updated_at DESC)
WHERE stock_qty > 0 AND stock_qty <= reorder_point;

-- Index for trends queries on updated_at with aggregations
CREATE INDEX IF NOT EXISTS idx_inventory_updated_at_agg
ON inventory_items (updated_at DESC, category, stock_qty, cost_price);

-- Analyze table to update statistics after index creation
ANALYZE inventory_items;