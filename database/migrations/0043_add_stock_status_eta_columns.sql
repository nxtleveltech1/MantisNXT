-- Migration 0043: Add Stock Status and New Stock ETA columns
-- Date: 2026-01-03
-- Purpose: Add stock_status and new_stock_eta columns for supplier inventory management
-- 
-- These columns support:
--   - Supplier-provided stock status (In Stock, Out of Stock, Low Stock)
--   - Expected restock dates for out-of-stock items
--   - Import mapping from supplier pricelist data

-- ============================================================================
-- ADD COLUMNS TO core.supplier_product
-- ============================================================================

-- Add stock_status column for supplier-provided availability status
ALTER TABLE core.supplier_product
ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50);

COMMENT ON COLUMN core.supplier_product.stock_status IS 'Supplier-provided stock status: In Stock, Out of Stock, Low Stock, etc.';

-- Add new_stock_eta column for expected restock date
ALTER TABLE core.supplier_product
ADD COLUMN IF NOT EXISTS new_stock_eta DATE;

COMMENT ON COLUMN core.supplier_product.new_stock_eta IS 'Expected date for new stock arrival from supplier';

-- Add index for stock_status filtering
CREATE INDEX IF NOT EXISTS idx_supplier_product_stock_status
ON core.supplier_product (stock_status)
WHERE stock_status IS NOT NULL;

-- Add index for new_stock_eta for filtering items with upcoming stock
CREATE INDEX IF NOT EXISTS idx_supplier_product_new_stock_eta
ON core.supplier_product (new_stock_eta)
WHERE new_stock_eta IS NOT NULL;

-- ============================================================================
-- ADD COLUMNS TO spp.pricelist_row (import staging table)
-- ============================================================================

-- Add stock_status column for import mapping
ALTER TABLE spp.pricelist_row
ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50);

COMMENT ON COLUMN spp.pricelist_row.stock_status IS 'Stock status from supplier pricelist import';

-- Add eta column for import mapping (maps to new_stock_eta)
ALTER TABLE spp.pricelist_row
ADD COLUMN IF NOT EXISTS eta DATE;

COMMENT ON COLUMN spp.pricelist_row.eta IS 'ETA date from supplier pricelist, maps to core.supplier_product.new_stock_eta';

-- ============================================================================
-- ADD COLUMN TO core.stock_on_hand (location-specific status)
-- ============================================================================

-- Add stock_status column for location-specific availability
ALTER TABLE core.stock_on_hand
ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50);

COMMENT ON COLUMN core.stock_on_hand.stock_status IS 'Location-specific stock status';

-- Add index for stock_status on stock_on_hand
CREATE INDEX IF NOT EXISTS idx_stock_on_hand_stock_status
ON core.stock_on_hand (stock_status)
WHERE stock_status IS NOT NULL;

-- ============================================================================
-- VERIFY COLUMNS WERE ADDED
-- ============================================================================

SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name IN ('stock_status', 'new_stock_eta', 'eta')
  AND table_schema IN ('core', 'spp')
ORDER BY table_schema, table_name, column_name;

