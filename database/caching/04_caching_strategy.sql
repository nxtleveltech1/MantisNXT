-- ===============================================
-- MULTI-LAYER CACHING STRATEGY
-- Database-level, Redis, and Application caching
-- ===============================================

-- =================
-- MATERIALIZED VIEWS FOR DATABASE CACHING
-- =================

-- Product catalog with aggregated data
CREATE MATERIALIZED VIEW mv_product_catalog AS
SELECT
    p.id,
    p.sku,
    p.name,
    p.description,
    p.sale_price,
    p.base_cost,
    p.weight_kg,
    p.barcode,
    p.reorder_level,
    p.is_active,
    c.name as category_name,
    c.path as category_path,
    b.name as brand_name,

    -- Aggregated inventory data
    COALESCE(SUM(ib.quantity_on_hand), 0) as total_quantity_on_hand,
    COALESCE(SUM(ib.quantity_available), 0) as total_quantity_available,
    COUNT(DISTINCT ib.location_id) as locations_count,

    -- Low stock indicator
    CASE
        WHEN COALESCE(SUM(ib.quantity_available), 0) <= p.reorder_level THEN true
        ELSE false
    END as is_low_stock,

    -- Last movement timestamp
    MAX(ib.last_movement_at) as last_movement_at,

    p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN inventory_balances ib ON p.id = ib.product_id
WHERE p.is_active = true
GROUP BY p.id, p.sku, p.name, p.description, p.sale_price, p.base_cost,
         p.weight_kg, p.barcode, p.reorder_level, p.is_active,
         c.name, c.path, b.name, p.updated_at;

-- Unique index for fast lookups
CREATE UNIQUE INDEX idx_mv_product_catalog_id ON mv_product_catalog(id);
CREATE INDEX idx_mv_product_catalog_sku ON mv_product_catalog(sku);
CREATE INDEX idx_mv_product_catalog_category ON mv_product_catalog(category_name);
CREATE INDEX idx_mv_product_catalog_low_stock ON mv_product_catalog(is_low_stock) WHERE is_low_stock = true;

-- Inventory summary by location
CREATE MATERIALIZED VIEW mv_inventory_summary AS
SELECT
    l.id as location_id,
    l.code as location_code,
    l.name as location_name,
    COUNT(DISTINCT ib.product_id) as unique_products,
    SUM(ib.quantity_on_hand) as total_quantity_on_hand,
    SUM(ib.quantity_available) as total_quantity_available,
    SUM(ib.quantity_allocated) as total_quantity_allocated,

    -- Value calculations
    SUM(ib.quantity_on_hand * COALESCE(p.base_cost, 0)) as total_cost_value,
    SUM(ib.quantity_on_hand * COALESCE(p.sale_price, 0)) as total_sale_value,

    -- Low stock counts
    COUNT(*) FILTER (WHERE ib.quantity_available <= p.reorder_level AND p.reorder_level > 0) as low_stock_items,

    MAX(ib.last_movement_at) as last_movement_at
FROM locations l
LEFT JOIN inventory_balances ib ON l.id = ib.location_id
LEFT JOIN products p ON ib.product_id = p.id
WHERE l.is_active = true
GROUP BY l.id, l.code, l.name;

CREATE UNIQUE INDEX idx_mv_inventory_summary_id ON mv_inventory_summary(location_id);

-- Category hierarchy with product counts
CREATE MATERIALIZED VIEW mv_category_hierarchy AS
WITH RECURSIVE category_tree AS (
    -- Root categories
    SELECT id, name, parent_id, path, level, 0 as depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Child categories
    SELECT c.id, c.name, c.parent_id, c.path, c.level, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
    ct.id,
    ct.name,
    ct.parent_id,
    ct.path,
    ct.level,
    ct.depth,
    COUNT(DISTINCT p.id) as product_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) as active_product_count,
    SUM(COALESCE(ib.quantity_on_hand, 0)) as total_inventory_quantity
FROM category_tree ct
LEFT JOIN products p ON ct.id = p.category_id
LEFT JOIN inventory_balances ib ON p.id = ib.product_id
GROUP BY ct.id, ct.name, ct.parent_id, ct.path, ct.level, ct.depth;

CREATE UNIQUE INDEX idx_mv_category_hierarchy_id ON mv_category_hierarchy(id);

-- =================
-- REFRESH FUNCTIONS
-- =================

-- Intelligent refresh of materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views(view_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    refresh_log TEXT := '';
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
BEGIN
    start_time := NOW();

    IF view_name IS NULL OR view_name = 'mv_product_catalog' THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_catalog;
        refresh_log := refresh_log || 'mv_product_catalog refreshed. ';
    END IF;

    IF view_name IS NULL OR view_name = 'mv_inventory_summary' THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_summary;
        refresh_log := refresh_log || 'mv_inventory_summary refreshed. ';
    END IF;

    IF view_name IS NULL OR view_name = 'mv_category_hierarchy' THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_hierarchy;
        refresh_log := refresh_log || 'mv_category_hierarchy refreshed. ';
    END IF;

    end_time := NOW();
    refresh_log := refresh_log || 'Total time: ' || (end_time - start_time);

    RETURN refresh_log;
END;
$$ LANGUAGE plpgsql;

-- =================
-- CACHE INVALIDATION TRIGGERS
-- =================

-- Function to trigger cache refresh
CREATE OR REPLACE FUNCTION trigger_cache_refresh()
RETURNS TRIGGER AS $$
BEGIN
    -- Use NOTIFY to signal application layer for cache invalidation
    IF TG_TABLE_NAME = 'products' THEN
        PERFORM pg_notify('cache_invalidate', 'products');
        PERFORM pg_notify('cache_invalidate', 'product_catalog');
    ELSIF TG_TABLE_NAME = 'inventory_balances' THEN
        PERFORM pg_notify('cache_invalidate', 'inventory');
        PERFORM pg_notify('cache_invalidate', 'product_catalog');
    ELSIF TG_TABLE_NAME = 'categories' THEN
        PERFORM pg_notify('cache_invalidate', 'categories');
        PERFORM pg_notify('cache_invalidate', 'product_catalog');
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER trigger_products_cache_invalidate
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_cache_refresh();

CREATE TRIGGER trigger_inventory_cache_invalidate
    AFTER INSERT OR UPDATE OR DELETE ON inventory_balances
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_cache_refresh();

CREATE TRIGGER trigger_categories_cache_invalidate
    AFTER INSERT OR UPDATE OR DELETE ON categories
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_cache_refresh();

-- =================
-- CACHE STATISTICS AND MONITORING
-- =================

-- Cache performance tracking
CREATE TABLE cache_performance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_type VARCHAR(50) NOT NULL, -- 'materialized_view', 'redis', 'application'
    cache_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'hit', 'miss', 'refresh', 'invalidate'
    execution_time_ms INTEGER,
    cache_size_bytes BIGINT,
    hit_ratio DECIMAL(5,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cache_performance_log_date ON cache_performance_log(created_at DESC);
CREATE INDEX idx_cache_performance_log_cache ON cache_performance_log(cache_type, cache_name, created_at DESC);

-- Function to log cache performance
CREATE OR REPLACE FUNCTION log_cache_performance(
    p_cache_type VARCHAR(50),
    p_cache_name VARCHAR(100),
    p_operation VARCHAR(20),
    p_execution_time_ms INTEGER DEFAULT NULL,
    p_cache_size_bytes BIGINT DEFAULT NULL,
    p_hit_ratio DECIMAL(5,4) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO cache_performance_log (
        cache_type, cache_name, operation,
        execution_time_ms, cache_size_bytes, hit_ratio
    ) VALUES (
        p_cache_type, p_cache_name, p_operation,
        p_execution_time_ms, p_cache_size_bytes, p_hit_ratio
    );
END;
$$ LANGUAGE plpgsql;

-- =================
-- AUTOMATED CACHE REFRESH SCHEDULE
-- =================

-- Scheduled refresh jobs (requires pg_cron extension)
-- Refresh product catalog every 15 minutes during business hours
-- SELECT cron.schedule('refresh-product-catalog', '*/15 8-18 * * 1-5', 'SELECT refresh_materialized_views(''mv_product_catalog'');');

-- Refresh inventory summary every 30 minutes
-- SELECT cron.schedule('refresh-inventory-summary', '*/30 * * * *', 'SELECT refresh_materialized_views(''mv_inventory_summary'');');

-- Refresh category hierarchy once daily
-- SELECT cron.schedule('refresh-category-hierarchy', '0 1 * * *', 'SELECT refresh_materialized_views(''mv_category_hierarchy'');');

-- =================
-- REDIS CACHE PATTERNS (SQL COMMENTS FOR DOCUMENTATION)
-- =================

/*
REDIS CACHING PATTERNS FOR APPLICATION LAYER:

1. Product Cache Patterns:
   - Key: "product:{sku}"
   - TTL: 1 hour
   - Data: Full product details with inventory
   - Invalidation: On product updates

2. Search Results Cache:
   - Key: "search:{hash(query_params)}"
   - TTL: 30 minutes
   - Data: Paginated search results
   - Invalidation: On inventory changes

3. Category Cache:
   - Key: "category:{id}"
   - TTL: 4 hours
   - Data: Category hierarchy and product counts
   - Invalidation: On category/product changes

4. User Session Cache:
   - Key: "session:{user_id}"
   - TTL: Session duration
   - Data: User preferences, cart, recent views
   - Invalidation: On session end

5. Low Stock Alerts:
   - Key: "low_stock:alerts"
   - TTL: 15 minutes
   - Data: List of products below reorder level
   - Invalidation: On inventory movements

CACHE WARMING STRATEGIES:
- Pre-load popular products on application start
- Background refresh of materialized views
- Proactive caching of search results for common queries
- Scheduled cache population during off-peak hours

CACHE EVICTION POLICIES:
- LRU (Least Recently Used) for product data
- TTL-based for search results
- Manual invalidation for critical data
- Memory pressure-based for large datasets
*/