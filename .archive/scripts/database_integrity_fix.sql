-- ============================================================================
-- MANTISNXT DATABASE INTEGRITY RESTORATION
-- Critical fixes for supplier/inventory/analytics system
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ============================================================================
-- SECTION 1: ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- 1. supplier_pricelists -> suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_supplier_pricelists_supplier_id'
    ) THEN
        -- First clean up any orphaned records
        DELETE FROM supplier_pricelists
        WHERE supplier_id NOT IN (SELECT id FROM suppliers);

        -- Add the foreign key constraint
        ALTER TABLE supplier_pricelists
        ADD CONSTRAINT fk_supplier_pricelists_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: supplier_pricelists -> suppliers';
    END IF;
END $$;

-- 2. pricelist_items -> supplier_pricelists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_pricelist_items_pricelist_id'
    ) THEN
        -- Clean up orphaned records
        DELETE FROM pricelist_items
        WHERE pricelist_id NOT IN (SELECT id FROM supplier_pricelists);

        -- Add constraint
        ALTER TABLE pricelist_items
        ADD CONSTRAINT fk_pricelist_items_pricelist_id
        FOREIGN KEY (pricelist_id) REFERENCES supplier_pricelists(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: pricelist_items -> supplier_pricelists';
    END IF;
END $$;

-- 3. supplier_performance -> suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_supplier_performance_supplier_id'
    ) THEN
        -- Clean up orphaned records
        DELETE FROM supplier_performance
        WHERE supplier_id NOT IN (SELECT id FROM suppliers);

        -- Add constraint
        ALTER TABLE supplier_performance
        ADD CONSTRAINT fk_supplier_performance_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: supplier_performance -> suppliers';
    END IF;
END $$;

-- 4. inventory_items -> suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_items_supplier_id'
    ) THEN
        -- Set NULL for invalid supplier references instead of deleting
        UPDATE inventory_items
        SET supplier_id = NULL
        WHERE supplier_id IS NOT NULL
          AND supplier_id NOT IN (SELECT id FROM suppliers);

        -- Add constraint (allowing NULL)
        ALTER TABLE inventory_items
        ADD CONSTRAINT fk_inventory_items_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: inventory_items -> suppliers';
    END IF;
END $$;

-- 5. stock_movements -> inventory_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_stock_movements_item_id'
    ) THEN
        -- Clean up orphaned stock movements
        DELETE FROM stock_movements
        WHERE item_id IS NOT NULL
          AND item_id NOT IN (SELECT id FROM inventory_items);

        -- Add constraint
        ALTER TABLE stock_movements
        ADD CONSTRAINT fk_stock_movements_item_id
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: stock_movements -> inventory_items';
    END IF;
END $$;

-- 6. purchase_orders -> suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_orders_supplier_id'
    ) THEN
        -- Set NULL for invalid supplier references
        UPDATE purchase_orders
        SET supplier_id = NULL
        WHERE supplier_id IS NOT NULL
          AND supplier_id NOT IN (SELECT id FROM suppliers);

        -- Add constraint
        ALTER TABLE purchase_orders
        ADD CONSTRAINT fk_purchase_orders_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: purchase_orders -> suppliers';
    END IF;
END $$;

-- 7. purchase_order_items -> purchase_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_order_items_po_id'
    ) THEN
        -- Clean up orphaned PO items
        DELETE FROM purchase_order_items
        WHERE po_id IS NOT NULL
          AND po_id NOT IN (SELECT id FROM purchase_orders);

        -- Add constraint
        ALTER TABLE purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_po_id
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: purchase_order_items -> purchase_orders';
    END IF;
END $$;

-- 8. purchase_order_items -> inventory_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_order_items_item_id'
    ) THEN
        -- Set NULL for invalid item references
        UPDATE purchase_order_items
        SET item_id = NULL
        WHERE item_id IS NOT NULL
          AND item_id NOT IN (SELECT id FROM inventory_items);

        -- Add constraint
        ALTER TABLE purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_item_id
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: purchase_order_items -> inventory_items';
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: ENHANCE ANALYTICS TABLES STRUCTURE
-- ============================================================================

-- Enhance analytics_anomalies table
DO $$
BEGIN
    -- Add missing columns to analytics_anomalies if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'analytics_anomalies' AND column_name = 'supplier_id') THEN
        ALTER TABLE analytics_anomalies ADD COLUMN supplier_id UUID;
        ALTER TABLE analytics_anomalies ADD COLUMN anomaly_type VARCHAR(50) NOT NULL DEFAULT 'general';
        ALTER TABLE analytics_anomalies ADD COLUMN severity VARCHAR(20) NOT NULL DEFAULT 'medium';
        ALTER TABLE analytics_anomalies ADD COLUMN description TEXT;
        ALTER TABLE analytics_anomalies ADD COLUMN metric_name VARCHAR(100);
        ALTER TABLE analytics_anomalies ADD COLUMN expected_value NUMERIC;
        ALTER TABLE analytics_anomalies ADD COLUMN actual_value NUMERIC;
        ALTER TABLE analytics_anomalies ADD COLUMN deviation_percentage NUMERIC;
        ALTER TABLE analytics_anomalies ADD COLUMN confidence_score NUMERIC DEFAULT 0.8;
        ALTER TABLE analytics_anomalies ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE analytics_anomalies ADD COLUMN resolved_at TIMESTAMP;
        ALTER TABLE analytics_anomalies ADD COLUMN resolved_by VARCHAR(255);
        ALTER TABLE analytics_anomalies ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

        RAISE NOTICE 'Enhanced analytics_anomalies table structure';
    END IF;
END $$;

-- Enhance analytics_predictions table
DO $$
BEGIN
    -- Add missing columns to analytics_predictions if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'analytics_predictions' AND column_name = 'supplier_id') THEN
        ALTER TABLE analytics_predictions ADD COLUMN supplier_id UUID;
        ALTER TABLE analytics_predictions ADD COLUMN prediction_type VARCHAR(50) NOT NULL DEFAULT 'general';
        ALTER TABLE analytics_predictions ADD COLUMN metric_name VARCHAR(100);
        ALTER TABLE analytics_predictions ADD COLUMN predicted_value NUMERIC;
        ALTER TABLE analytics_predictions ADD COLUMN prediction_date DATE;
        ALTER TABLE analytics_predictions ADD COLUMN confidence_level NUMERIC DEFAULT 0.85;
        ALTER TABLE analytics_predictions ADD COLUMN model_version VARCHAR(20) DEFAULT '1.0';
        ALTER TABLE analytics_predictions ADD COLUMN input_parameters JSONB DEFAULT '{}';
        ALTER TABLE analytics_predictions ADD COLUMN actual_value NUMERIC;
        ALTER TABLE analytics_predictions ADD COLUMN variance NUMERIC;
        ALTER TABLE analytics_predictions ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE analytics_predictions ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

        RAISE NOTICE 'Enhanced analytics_predictions table structure';
    END IF;
END $$;

-- Add foreign keys for enhanced analytics tables
DO $$
BEGIN
    -- Analytics anomalies -> suppliers FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_analytics_anomalies_supplier_id'
    ) THEN
        ALTER TABLE analytics_anomalies
        ADD CONSTRAINT fk_analytics_anomalies_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: analytics_anomalies -> suppliers';
    END IF;

    -- Analytics predictions -> suppliers FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_analytics_predictions_supplier_id'
    ) THEN
        ALTER TABLE analytics_predictions
        ADD CONSTRAINT fk_analytics_predictions_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE 'Added FK: analytics_predictions -> suppliers';
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE PERFORMANCE INDEXES
-- ============================================================================

-- Supplier system indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_performance_tier ON suppliers(performance_tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_primary_category ON suppliers(primary_category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id);

-- Supplier pricelists indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_supplier_id ON supplier_pricelists(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_active ON supplier_pricelists(is_active, effective_from, effective_to);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_dates ON supplier_pricelists(effective_from, effective_to);

-- Pricelist items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pricelist_items_pricelist_id ON pricelist_items(pricelist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pricelist_items_sku ON pricelist_items(sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pricelist_items_supplier_sku ON pricelist_items(supplier_sku);

-- Inventory indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_stock_levels ON inventory_items(stock_qty, reorder_point);

-- Stock movements indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(movement_type, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- Purchase orders indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_dates ON purchase_orders(order_date, required_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);

-- Purchase order items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(po_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_items_item_id ON purchase_order_items(item_id);

-- Supplier performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_performance_supplier_id ON supplier_performance(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_performance_period ON supplier_performance(period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_performance_tier ON supplier_performance(performance_tier);

-- Analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_supplier_id ON analytics_anomalies(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_type_severity ON analytics_anomalies(anomaly_type, severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_detected_at ON analytics_anomalies(detected_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_status ON analytics_anomalies(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_supplier_id ON analytics_predictions(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_type ON analytics_predictions(prediction_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_date ON analytics_predictions(prediction_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_accuracy ON analytics_predictions(accuracy DESC);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_composite ON supplier_pricelists(supplier_id, is_active, effective_from, effective_to);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_supplier_category ON inventory_items(supplier_id, category, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_supplier_status ON purchase_orders(supplier_id, status, order_date);

RAISE NOTICE 'Created all performance indexes';

-- ============================================================================
-- SECTION 4: CREATE ANALYTICAL VIEWS
-- ============================================================================

-- View: Supplier Performance Summary
CREATE OR REPLACE VIEW v_supplier_performance_summary AS
SELECT
    s.id as supplier_id,
    s.name as supplier_name,
    s.performance_tier,
    s.spend_last_12_months,
    s.rating,
    sp.orders_placed,
    sp.orders_delivered,
    sp.delivery_rate,
    sp.on_time_rate,
    sp.quality_score,
    sp.response_time_hours,
    sp.defect_rate,
    sp.cost_savings,
    sp.last_calculated,
    COUNT(po.id) as active_purchase_orders,
    SUM(po.total_amount) as total_po_value,
    COUNT(ii.id) as inventory_items_count,
    AVG(ii.cost_price) as avg_item_cost
FROM suppliers s
LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status IN ('pending', 'approved', 'sent')
LEFT JOIN inventory_items ii ON s.id = ii.supplier_id AND ii.status = 'active'
WHERE s.status = 'active'
GROUP BY s.id, s.name, s.performance_tier, s.spend_last_12_months, s.rating,
         sp.orders_placed, sp.orders_delivered, sp.delivery_rate, sp.on_time_rate,
         sp.quality_score, sp.response_time_hours, sp.defect_rate, sp.cost_savings, sp.last_calculated;

-- View: Inventory Analytics
CREATE OR REPLACE VIEW v_inventory_analytics AS
SELECT
    ii.id as item_id,
    ii.sku,
    ii.name as item_name,
    ii.category,
    ii.brand,
    s.name as supplier_name,
    ii.stock_qty,
    ii.reserved_qty,
    ii.available_qty,
    ii.reorder_point,
    ii.cost_price,
    ii.sale_price,
    CASE
        WHEN ii.stock_qty <= ii.reorder_point THEN 'low_stock'
        WHEN ii.stock_qty = 0 THEN 'out_of_stock'
        WHEN ii.stock_qty > ii.max_stock THEN 'overstock'
        ELSE 'normal'
    END as stock_status,
    COALESCE(sm_in.total_in, 0) as total_stock_in,
    COALESCE(sm_out.total_out, 0) as total_stock_out,
    COALESCE(sm_in.total_in, 0) - COALESCE(sm_out.total_out, 0) as net_movement,
    ii.updated_at as last_updated
FROM inventory_items ii
LEFT JOIN suppliers s ON ii.supplier_id = s.id
LEFT JOIN (
    SELECT item_id, SUM(quantity) as total_in
    FROM stock_movements
    WHERE movement_type IN ('receipt', 'adjustment_in', 'return_in')
    GROUP BY item_id
) sm_in ON ii.id = sm_in.item_id
LEFT JOIN (
    SELECT item_id, SUM(ABS(quantity)) as total_out
    FROM stock_movements
    WHERE movement_type IN ('shipment', 'adjustment_out', 'return_out', 'waste')
    GROUP BY item_id
) sm_out ON ii.id = sm_out.item_id
WHERE ii.status = 'active';

-- View: Supplier Pricelist Summary
CREATE OR REPLACE VIEW v_supplier_pricelist_summary AS
SELECT
    s.id as supplier_id,
    s.name as supplier_name,
    sp.id as pricelist_id,
    sp.name as pricelist_name,
    sp.version,
    sp.currency,
    sp.effective_from,
    sp.effective_to,
    sp.is_active,
    sp.approval_status,
    COUNT(pi.id) as item_count,
    MIN(pi.unit_price) as min_price,
    MAX(pi.unit_price) as max_price,
    AVG(pi.unit_price) as avg_price,
    SUM(pi.unit_price * pi.minimum_quantity) as total_minimum_value
FROM suppliers s
INNER JOIN supplier_pricelists sp ON s.id = sp.supplier_id
LEFT JOIN pricelist_items pi ON sp.id = pi.pricelist_id
GROUP BY s.id, s.name, sp.id, sp.name, sp.version, sp.currency,
         sp.effective_from, sp.effective_to, sp.is_active, sp.approval_status;

-- View: Purchase Order Analytics
CREATE OR REPLACE VIEW v_purchase_order_analytics AS
SELECT
    po.id as po_id,
    po.po_number,
    s.name as supplier_name,
    po.status,
    po.order_date,
    po.required_date,
    po.total_amount,
    po.currency,
    COUNT(poi.id) as line_items,
    SUM(poi.quantity) as total_quantity,
    SUM(poi.received_qty) as total_received,
    CASE
        WHEN po.required_date < CURRENT_DATE AND po.status NOT IN ('completed', 'received') THEN 'overdue'
        WHEN po.required_date <= CURRENT_DATE + INTERVAL '7 days' AND po.status NOT IN ('completed', 'received') THEN 'due_soon'
        ELSE 'on_track'
    END as delivery_status,
    ROUND(
        (SUM(poi.received_qty)::NUMERIC / NULLIF(SUM(poi.quantity), 0) * 100), 2
    ) as fulfillment_percentage
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
GROUP BY po.id, po.po_number, s.name, po.status, po.order_date,
         po.required_date, po.total_amount, po.currency;

RAISE NOTICE 'Created analytical views';

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Verify foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN (
        'supplier_pricelists', 'pricelist_items', 'supplier_performance',
        'inventory_items', 'stock_movements', 'purchase_orders',
        'purchase_order_items', 'analytics_anomalies', 'analytics_predictions'
    )
ORDER BY tc.table_name, tc.constraint_name;

-- Show created indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'suppliers', 'supplier_pricelists', 'pricelist_items',
        'inventory_items', 'stock_movements', 'purchase_orders',
        'purchase_order_items', 'supplier_performance',
        'analytics_anomalies', 'analytics_predictions'
    )
ORDER BY tablename, indexname;

-- Show created views
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
    AND viewname LIKE 'v_%'
ORDER BY viewname;