-- Inventory performance indexes

-- 1) Composite index for supplier_product filtering with stock status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_soh_supplier_product_qty
ON core.stock_on_hand (supplier_product_id, qty);

-- 2) Partial index for low stock alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_soh_low_stock
ON core.stock_on_hand (qty)
WHERE qty <= 10;

-- 3) Composite index for supplier + SKU lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_product_supplier_sku
ON core.supplier_product (supplier_id, supplier_sku);

-- 4) Full-text search on supplier_sku and name_from_supplier
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_product_search_tsv
ON core.supplier_product USING GIN (
  to_tsvector('simple', coalesce(supplier_sku,'') || ' ' || coalesce(name_from_supplier,''))
);

-- 5) Composite index for category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_product_category_sku
ON core.supplier_product (category_id, supplier_sku);

