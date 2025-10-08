-- Migration: Add Query Performance Indexes
-- Purpose: Optimize inventory and supplier queries to eliminate 90+ second timeouts
-- Date: 2025-10-03

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- =====================================================
-- INVENTORY_ITEMS TABLE OPTIMIZATION
-- =====================================================

-- 1. Trigram indexes for ILIKE searches (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_sku_trgm 
  ON inventory_items USING gin(sku gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_name_trgm 
  ON inventory_items USING gin(name gin_trgm_ops);

COMMENT ON INDEX idx_inventory_items_sku_trgm IS 'Trigram index for fast ILIKE searches on SKU';
COMMENT ON INDEX idx_inventory_items_name_trgm IS 'Trigram index for fast ILIKE searches on name';

-- 2. Composite index for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_supplier_category_stock 
  ON inventory_items(supplier_id, category, stock_qty);

COMMENT ON INDEX idx_inventory_items_supplier_category_stock IS 'Composite index for supplier + category + stock filters';

-- 3. Composite index for stock status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_stock_status 
  ON inventory_items(stock_qty, reorder_point);

COMMENT ON INDEX idx_inventory_items_stock_status IS 'Composite index for stock level and reorder point queries';

-- 4. Covering index for inventory list queries (includes commonly selected columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_list_covering 
  ON inventory_items(sku) 
  INCLUDE (id, name, category, stock_qty, reserved_qty, cost_price, sale_price, supplier_id);

COMMENT ON INDEX idx_inventory_items_list_covering IS 'Covering index for inventory list queries - avoids table lookups';

-- 5. Index for category filtering with ANY() operator
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_category_gin 
  ON inventory_items USING gin(category gin_trgm_ops);

COMMENT ON INDEX idx_inventory_items_category_gin IS 'GIN index for category = ANY() queries';

-- 6. Composite index for out-of-stock queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_out_of_stock 
  ON inventory_items(stock_qty, supplier_id) 
  WHERE stock_qty = 0;

COMMENT ON INDEX idx_inventory_items_out_of_stock IS 'Partial index for out-of-stock items';

-- 7. Composite index for low-stock queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_low_stock 
  ON inventory_items(stock_qty, reorder_point) 
  WHERE stock_qty > 0 AND stock_qty <= reorder_point;

COMMENT ON INDEX idx_inventory_items_low_stock IS 'Partial index for low-stock items';

-- 8. Index for brand filtering (if brand column exists)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_brand 
--   ON inventory_items(brand) 
--   WHERE brand IS NOT NULL;
-- 
-- COMMENT ON INDEX idx_inventory_items_brand IS 'Index for brand filtering';

-- =====================================================
-- SUPPLIERS TABLE OPTIMIZATION
-- =====================================================

-- 1. Composite index for supplier search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_search_composite 
  ON suppliers(status, primary_category, performance_tier, name) 
  WHERE status = 'active';

COMMENT ON INDEX idx_suppliers_search_composite IS 'Composite index for supplier search and filtering';

-- 2. Trigram index for supplier name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_name_trgm 
  ON suppliers USING gin(name gin_trgm_ops);

COMMENT ON INDEX idx_suppliers_name_trgm IS 'Trigram index for fast ILIKE searches on supplier name';

-- 3. Index for email and contact search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_email_contact 
  ON suppliers(email, contact_person) 
  WHERE status = 'active';

COMMENT ON INDEX idx_suppliers_email_contact IS 'Index for email and contact person searches';

-- =====================================================
-- UPDATE STATISTICS
-- =====================================================

ANALYZE inventory_items;
ANALYZE suppliers;

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

-- Test query 1: ILIKE search on SKU (should use trigram index)
-- EXPLAIN ANALYZE SELECT * FROM inventory_items WHERE sku ILIKE '%ABC%';

-- Test query 2: ILIKE search on name (should use trigram index)
-- EXPLAIN ANALYZE SELECT * FROM inventory_items WHERE name ILIKE '%Widget%';

-- Test query 3: Composite filter (should use composite index)
-- EXPLAIN ANALYZE SELECT * FROM inventory_items WHERE supplier_id = 'some-uuid' AND category = 'Electronics' AND stock_qty > 0;

-- Test query 4: Low stock query (should use partial index)
-- EXPLAIN ANALYZE SELECT * FROM inventory_items WHERE stock_qty > 0 AND stock_qty <= reorder_point;

-- Test query 5: Supplier search (should use trigram index)
-- EXPLAIN ANALYZE SELECT * FROM suppliers WHERE name ILIKE '%Corp%' AND status = 'active';

