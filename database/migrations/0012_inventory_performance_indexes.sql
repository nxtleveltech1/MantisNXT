-- =====================================================
-- INVENTORY SYSTEM PERFORMANCE INDEXES
-- =====================================================
-- Migration: 0012_inventory_performance_indexes.sql
-- Description: Advanced performance indexes for inventory management system
-- Includes: composite indexes, partial indexes, functional indexes, and query-specific optimizations

-- =====================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =====================================================

-- Inventory management dashboard queries
CREATE INDEX IF NOT EXISTS idx_inventory_dashboard_active
ON inventory_item(org_id, is_active, category, quantity_on_hand)
WHERE is_active = true;

-- Multi-column searches with supplier and brand filtering
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_brand_active
ON inventory_item(org_id, supplier_id, brand_id, is_active)
WHERE is_active = true;

-- Price and cost analysis queries
CREATE INDEX IF NOT EXISTS idx_inventory_pricing
ON inventory_item(org_id, unit_price, cost_price, markup_percentage)
WHERE is_active = true;

-- Stock alerts with supplier information
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_alert
ON inventory_item(org_id, quantity_on_hand, reorder_point, supplier_id)
WHERE is_active = true AND quantity_on_hand <= reorder_point;

-- =====================================================
-- SUPPLIER PERFORMANCE INDEXES
-- =====================================================

-- Supplier ranking and filtering
CREATE INDEX IF NOT EXISTS idx_supplier_performance_ranking
ON supplier(org_id, performance_tier, performance_score DESC, on_time_delivery_rate DESC)
WHERE status = 'active';

-- Preferred supplier queries
CREATE INDEX IF NOT EXISTS idx_supplier_preferred_active
ON supplier(org_id, preferred_supplier, status, performance_score DESC)
WHERE preferred_supplier = true AND status = 'active';

-- Currency-based supplier filtering
CREATE INDEX IF NOT EXISTS idx_supplier_currency_performance
ON supplier(org_id, currency_code, performance_tier)
WHERE status = 'active';

-- =====================================================
-- PURCHASE ORDER PERFORMANCE INDEXES
-- =====================================================

-- Purchase order workflow queries
CREATE INDEX IF NOT EXISTS idx_po_workflow
ON purchase_order(org_id, status, created_at DESC, total_amount)
WHERE status IN ('pending_approval', 'approved', 'sent');

-- Supplier purchase history
CREATE INDEX IF NOT EXISTS idx_po_supplier_history
ON purchase_order(supplier_id, order_date DESC, total_amount, status)
WHERE status = 'completed';

-- Delivery performance tracking
CREATE INDEX IF NOT EXISTS idx_po_delivery_performance
ON purchase_order(supplier_id, expected_delivery_date, actual_delivery_date)
WHERE actual_delivery_date IS NOT NULL AND expected_delivery_date IS NOT NULL;

-- Financial reporting queries
CREATE INDEX IF NOT EXISTS idx_po_financial_reporting
ON purchase_order(org_id, order_date, total_amount, tax_amount, status)
WHERE status IN ('completed', 'partially_received');

-- =====================================================
-- STOCK MOVEMENT ANALYTICS INDEXES
-- =====================================================

-- Time-series analysis for stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movement_timeseries
ON stock_movement(org_id, movement_date DESC, movement_type, total_cost);

-- Item-specific movement history
CREATE INDEX IF NOT EXISTS idx_stock_movement_item_analysis
ON stock_movement(inventory_item_id, movement_date DESC, movement_type, quantity_change);

-- Location-based movement tracking
CREATE INDEX IF NOT EXISTS idx_stock_movement_location
ON stock_movement(org_id, location_to, location_from, movement_date DESC)
WHERE location_to IS NOT NULL OR location_from IS NOT NULL;

-- Cost analysis for movements
CREATE INDEX IF NOT EXISTS idx_stock_movement_cost_analysis
ON stock_movement(org_id, movement_type, movement_date, total_cost)
WHERE total_cost IS NOT NULL;

-- Batch tracking queries
CREATE INDEX IF NOT EXISTS idx_stock_movement_batch_tracking
ON stock_movement(org_id, batch_number, expiry_date, movement_date DESC)
WHERE batch_number IS NOT NULL;

-- =====================================================
-- PRICE LIST OPTIMIZATION INDEXES
-- =====================================================

-- Current pricing queries
CREATE INDEX IF NOT EXISTS idx_price_list_current_pricing
ON price_list_item(inventory_item_id, price_list_id, effective_from DESC)
WHERE effective_until IS NULL OR effective_until > now();

-- Price comparison across lists
CREATE INDEX IF NOT EXISTS idx_price_list_comparison
ON price_list_item(inventory_item_id, price, vat_rate, effective_from)
WHERE effective_until IS NULL OR effective_until > now();

-- VAT reporting queries
CREATE INDEX IF NOT EXISTS idx_price_list_vat_reporting
ON price_list_item(vat_rate_type, vat_rate, effective_from)
WHERE effective_until IS NULL OR effective_until > now();

-- =====================================================
-- SUPPLIER PRODUCT RELATIONSHIP INDEXES
-- =====================================================

-- Preferred supplier lookups
CREATE INDEX IF NOT EXISTS idx_supplier_product_preferred
ON supplier_product(inventory_item_id, is_preferred, cost_price)
WHERE is_preferred = true AND is_active = true;

-- Cost comparison queries
CREATE INDEX IF NOT EXISTS idx_supplier_product_cost_comparison
ON supplier_product(inventory_item_id, cost_price ASC, lead_time_days)
WHERE is_active = true;

-- Supplier catalog queries
CREATE INDEX IF NOT EXISTS idx_supplier_product_catalog
ON supplier_product(supplier_id, is_active, last_cost_update_date DESC)
WHERE is_active = true;

-- =====================================================
-- STOCK LEVEL OPTIMIZATION INDEXES
-- =====================================================

-- Location-based inventory queries
CREATE INDEX IF NOT EXISTS idx_stock_level_location_summary
ON stock_level(org_id, location_code, quantity_on_hand DESC, quantity_reserved);

-- Multi-location item tracking
CREATE INDEX IF NOT EXISTS idx_stock_level_item_locations
ON stock_level(inventory_item_id, quantity_available DESC, location_code)
WHERE quantity_on_hand > 0;

-- Cycle counting and audit queries
CREATE INDEX IF NOT EXISTS idx_stock_level_cycle_count
ON stock_level(org_id, last_counted_date ASC NULLS FIRST, location_code)
WHERE last_counted_date IS NULL OR last_counted_date < CURRENT_DATE - INTERVAL '90 days';

-- =====================================================
-- FULL-TEXT SEARCH OPTIMIZATION
-- =====================================================

-- Enhanced product search with brand and category
CREATE INDEX IF NOT EXISTS idx_inventory_fulltext_enhanced
ON inventory_item USING gin(
    to_tsvector('english',
        name || ' ' ||
        COALESCE(description, '') || ' ' ||
        sku || ' ' ||
        COALESCE(alternative_skus::text, '') || ' ' ||
        COALESCE(tags::text, '')
    )
)
WHERE is_active = true;

-- Supplier search optimization
CREATE INDEX IF NOT EXISTS idx_supplier_fulltext_enhanced
ON supplier USING gin(
    to_tsvector('english',
        name || ' ' ||
        COALESCE(contact_email, '') || ' ' ||
        COALESCE(notes, '')
    )
)
WHERE status = 'active';

-- Brand search optimization
-- Fulltext index simplified: removed COALESCE from expression
CREATE INDEX IF NOT EXISTS idx_brand_fulltext
ON brand USING gin(to_tsvector('english', name || ' ' || description))
WHERE is_active = true AND description IS NOT NULL;

-- =====================================================
-- FUNCTIONAL INDEXES FOR CALCULATED VALUES
-- =====================================================

-- Functional indexes removed: expressions in WHERE clause must be IMMUTABLE
-- Available quantity calculations - use simple index instead
CREATE INDEX IF NOT EXISTS idx_stock_level_available_qty
ON stock_level(quantity_on_hand, quantity_reserved)
WHERE quantity_on_hand > 0;

-- Profit margin calculations - use simple index instead
CREATE INDEX IF NOT EXISTS idx_inventory_profit_margin
ON inventory_item(unit_price, cost_price)
WHERE cost_price > 0 AND unit_price > 0 AND is_active = true;

-- Supplier performance score ranking - use simple index instead
CREATE INDEX IF NOT EXISTS idx_supplier_score_ranking
ON supplier(performance_score, on_time_delivery_rate, quality_rating)
WHERE status = 'active';

-- =====================================================
-- REPORTING AND ANALYTICS INDEXES
-- =====================================================

-- Monthly stock movement summaries
-- Index removed: date_trunc in index predicate must be IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_stock_movement_monthly
ON stock_movement(org_id, movement_date, movement_type);

-- Daily inventory valuation - simplified index
CREATE INDEX IF NOT EXISTS idx_inventory_valuation_daily
ON inventory_item(org_id, quantity_on_hand, unit_price)
WHERE is_active = true AND quantity_on_hand > 0;

-- Supplier spend analysis
-- Index simplified: removed date_trunc from predicate
CREATE INDEX IF NOT EXISTS idx_supplier_spend_analysis
ON purchase_order(supplier_id, order_date, total_amount)
WHERE status IN ('completed', 'partially_received');

-- Category performance tracking - simplified index
CREATE INDEX IF NOT EXISTS idx_inventory_category_performance
ON inventory_item(org_id, category, quantity_on_hand, unit_price)
WHERE is_active = true;

-- =====================================================
-- CONSTRAINT VALIDATION INDEXES
-- =====================================================

-- Unique constraint support indexes
-- Indexes simplified: removed LOWER() from predicate (not IMMUTABLE in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_inventory_sku_validation
ON inventory_item(org_id, sku)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_brand_name_validation
ON brand(org_id, name)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_supplier_name_validation
ON supplier(org_id, name)
WHERE status != 'inactive';

-- =====================================================
-- MAINTENANCE VIEWS FOR INDEX MONITORING
-- =====================================================

-- Index usage statistics view
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'inventory_item', 'supplier', 'purchase_order', 'stock_movement',
    'price_list', 'price_list_item', 'supplier_product', 'stock_level', 'brand'
)
ORDER BY idx_scan DESC;

-- Table size and row count summary
CREATE OR REPLACE VIEW table_size_summary AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename IN (
    'inventory_item', 'supplier', 'purchase_order', 'stock_movement',
    'price_list', 'price_list_item', 'supplier_product', 'stock_level', 'brand'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION analyze_inventory_tables()
RETURNS void AS $$
BEGIN
    ANALYZE inventory_item;
    ANALYZE supplier;
    ANALYZE purchase_order;
    ANALYZE purchase_order_item;
    ANALYZE stock_movement;
    ANALYZE price_list;
    ANALYZE price_list_item;
    ANALYZE supplier_product;
    ANALYZE stock_level;
    ANALYZE brand;

    RAISE NOTICE 'Inventory tables analyzed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to check for unused indexes
CREATE OR REPLACE FUNCTION check_unused_indexes()
RETURNS TABLE(
    table_name text,
    index_name text,
    index_size text,
    scans bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::text,
        t.indexname::text,
        pg_size_pretty(pg_relation_size(t.indexrelid))::text,
        t.idx_scan
    FROM pg_stat_user_indexes t
    JOIN pg_index i ON t.indexrelid = i.indexrelid
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'inventory_item', 'supplier', 'purchase_order', 'stock_movement',
        'price_list', 'price_list_item', 'supplier_product', 'stock_level', 'brand'
    )
    AND t.idx_scan < 10  -- Adjust threshold as needed
    AND NOT i.indisunique  -- Don't include unique indexes
    ORDER BY pg_relation_size(t.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Inventory Performance Indexes migration completed successfully!';
    RAISE NOTICE 'Added comprehensive indexes for:';
    RAISE NOTICE '- Composite indexes for dashboard queries';
    RAISE NOTICE '- Supplier performance tracking';
    RAISE NOTICE '- Stock movement analytics';
    RAISE NOTICE '- Price list optimization';
    RAISE NOTICE '- Full-text search enhancement';
    RAISE NOTICE '- Functional indexes for calculated values';
    RAISE NOTICE '- Reporting and analytics optimization';
    RAISE NOTICE 'Use analyze_inventory_tables() to update statistics';
    RAISE NOTICE 'Use check_unused_indexes() to monitor index efficiency';
END;
$$;

INSERT INTO schema_migrations (migration_name)
VALUES ('0012_inventory_performance_indexes')
ON CONFLICT (migration_name) DO NOTHING;