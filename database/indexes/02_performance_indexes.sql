-- ===============================================
-- PERFORMANCE INDEXES FOR INVENTORY SYSTEM
-- Optimized for search, filtering, and reporting
-- ===============================================

-- =================
-- PRIMARY LOOKUP INDEXES
-- =================

-- Products: Fast SKU and barcode lookups
CREATE UNIQUE INDEX idx_products_sku_active ON products(sku) WHERE is_active = true;
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Products: Category and brand filtering
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
CREATE INDEX idx_products_brand_active ON products(brand_id, is_active) WHERE brand_id IS NOT NULL;

-- Products: Full-text search on name and description
CREATE INDEX idx_products_search_gin ON products USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Products: Trigram search for fuzzy matching
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON products USING gin(sku gin_trgm_ops);

-- =================
-- INVENTORY PERFORMANCE INDEXES
-- =================

-- Inventory balances: Primary lookup patterns
CREATE UNIQUE INDEX idx_inventory_product_location ON inventory_balances(product_id, location_id);
CREATE INDEX idx_inventory_location_product ON inventory_balances(location_id, product_id);

-- Inventory balances: Low stock alerts
CREATE INDEX idx_inventory_low_stock ON inventory_balances(product_id)
WHERE quantity_available > 0 AND quantity_available <= (
    SELECT reorder_level FROM products p WHERE p.id = inventory_balances.product_id
);

-- Inventory balances: Available stock filtering
CREATE INDEX idx_inventory_available ON inventory_balances(quantity_available DESC)
WHERE quantity_available > 0;

-- Inventory movements: Time-based queries
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX idx_movements_product_date ON inventory_movements(product_id, created_at DESC);
CREATE INDEX idx_movements_location_date ON inventory_movements(location_id, created_at DESC);

-- Inventory movements: Type-based filtering
CREATE INDEX idx_movements_type_date ON inventory_movements(movement_type, created_at DESC);
CREATE INDEX idx_movements_reference ON inventory_movements(reference_type, reference_id)
WHERE reference_id IS NOT NULL;

-- =================
-- BATCH/LOT TRACKING INDEXES
-- =================

-- Product batches: Expiry monitoring
CREATE INDEX idx_batches_expiry ON product_batches(expiry_date ASC)
WHERE expiry_date IS NOT NULL AND quantity_remaining > 0;

-- Product batches: Product lookup
CREATE INDEX idx_batches_product ON product_batches(product_id, expiry_date ASC);

-- Product batches: Batch number lookup
CREATE INDEX idx_batches_number ON product_batches(batch_number);

-- =================
-- HIERARCHICAL CATEGORY INDEXES
-- =================

-- Categories: Hierarchy traversal using materialized path
CREATE INDEX idx_categories_path ON categories USING gin(path gin_trgm_ops);
CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_categories_level ON categories(level, sort_order);

-- =================
-- AUDIT & REPORTING INDEXES
-- =================

-- Price history: Product and date lookup
CREATE INDEX idx_price_history_product_date ON product_price_history(product_id, effective_date DESC);
CREATE INDEX idx_price_history_date ON product_price_history(effective_date DESC);

-- Stock adjustments: Analysis and reporting
CREATE INDEX idx_adjustments_date ON stock_adjustments(created_at DESC);
CREATE INDEX idx_adjustments_product_date ON stock_adjustments(product_id, created_at DESC);
CREATE INDEX idx_adjustments_type ON stock_adjustments(adjustment_type, created_at DESC);

-- =================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- =================

-- Product search with category filter
CREATE INDEX idx_products_category_name ON products(category_id, name) WHERE is_active = true;

-- Product search with active status and stock
CREATE INDEX idx_products_active_with_stock ON products(is_active, id)
WHERE is_active = true AND EXISTS (
    SELECT 1 FROM inventory_balances ib
    WHERE ib.product_id = products.id AND ib.quantity_available > 0
);

-- Movement analysis by product and type
CREATE INDEX idx_movements_product_type_date ON inventory_movements(
    product_id, movement_type, created_at DESC
);

-- =================
-- PARTIAL INDEXES FOR EFFICIENCY
-- =================

-- Only index active products for most queries
CREATE INDEX idx_products_active_created ON products(created_at DESC) WHERE is_active = true;

-- Only index products with reorder levels set
CREATE INDEX idx_products_reorder_level ON products(reorder_level)
WHERE reorder_level > 0 AND is_active = true;

-- Only index expired batches with remaining stock
CREATE INDEX idx_batches_expired_remaining ON product_batches(product_id, expiry_date)
WHERE expiry_date < CURRENT_DATE AND quantity_remaining > 0;

-- =================
-- COVERING INDEXES FOR FREQUENT QUERIES
-- =================

-- Product list with basic info (covering index)
CREATE INDEX idx_products_list_covering ON products(category_id, is_active, name)
INCLUDE (id, sku, sale_price, created_at);

-- Inventory summary covering index
CREATE INDEX idx_inventory_summary_covering ON inventory_balances(location_id)
INCLUDE (product_id, quantity_on_hand, quantity_available, last_movement_at);

-- =================
-- SPECIALIZED INDEXES
-- =================

-- Array search for serial numbers
CREATE INDEX idx_movements_serial_numbers ON inventory_movements USING gin(serial_numbers)
WHERE serial_numbers IS NOT NULL;

-- Brands lookup optimization
CREATE UNIQUE INDEX idx_brands_name_active ON brands(name) WHERE is_active = true;

-- Locations lookup optimization
CREATE UNIQUE INDEX idx_locations_code_active ON locations(code) WHERE is_active = true;

-- =================
-- INDEX MAINTENANCE COMMENTS
-- =================

COMMENT ON INDEX idx_products_search_gin IS 'Full-text search index - rebuild weekly for optimal performance';
COMMENT ON INDEX idx_movements_created_at IS 'Time-series index - partition table when > 10M records';
COMMENT ON INDEX idx_inventory_low_stock IS 'Conditional index for low stock alerts - very selective';
COMMENT ON INDEX idx_products_list_covering IS 'Covering index for product listings - includes commonly needed columns';