-- ============================================================================
-- Migration 002: Create Analytics Tables (BIGINT Edition)
-- ============================================================================
-- Description: Creates analytics tables for performance tracking and predictions
-- ADR Reference: ADR-1 (Migration File Rewrite - BIGINT Strategy)
-- Schema: Uses core schema with BIGINT identity columns matching production
-- Author: Aster (Full-Stack Architect)
-- Date: 2025-10-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE SUPPLIER_PERFORMANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.supplier_performance (
    performance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supplier_id BIGINT NOT NULL,

    -- Evaluation details
    evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Performance metrics (0-100 scale)
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0
        CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100),
    quality_acceptance_rate DECIMAL(5,2) DEFAULT 0
        CHECK (quality_acceptance_rate >= 0 AND quality_acceptance_rate <= 100),

    -- Rating metrics (0-5 scale)
    overall_rating DECIMAL(3,2) DEFAULT 0
        CHECK (overall_rating >= 0 AND overall_rating <= 5),
    communication_score DECIMAL(3,2) DEFAULT 0
        CHECK (communication_score >= 0 AND communication_score <= 5),
    cost_competitiveness DECIMAL(3,2) DEFAULT 0
        CHECK (cost_competitiveness >= 0 AND cost_competitiveness <= 5),

    -- Response time
    response_time_hours INTEGER DEFAULT 24
        CHECK (response_time_hours >= 0),

    -- Order statistics
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(18,4) DEFAULT 0,

    -- Issue tracking
    issues_reported INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_supplier_performance_supplier_id
        FOREIGN KEY (supplier_id)
        REFERENCES core.supplier(supplier_id)
        ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 2: CREATE STOCK_MOVEMENTS TABLE
-- ============================================================================
-- Note: This table may already exist from migration 003. Using IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS core.stock_movements (
    movement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id BIGINT NOT NULL,

    -- Movement type
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('inbound', 'outbound', 'adjustment', 'transfer')),

    -- Quantity (can be negative for outbound)
    quantity INTEGER NOT NULL CHECK (quantity != 0),

    -- Cost information
    unit_cost DECIMAL(18,4),

    -- Reference information
    reference_number VARCHAR(255),
    notes TEXT,

    -- Additional tracking
    supplier_id BIGINT,
    location VARCHAR(255),
    batch_number VARCHAR(255),

    -- Audit fields
    created_by VARCHAR(255),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_stock_movements_item_id
        FOREIGN KEY (item_id)
        REFERENCES core.supplier_product(supplier_product_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_stock_movements_supplier_id
        FOREIGN KEY (supplier_id)
        REFERENCES core.supplier(supplier_id)
        ON DELETE SET NULL
);

-- ============================================================================
-- SECTION 3: CREATE ANALYTICS_ANOMALIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.analytics_anomalies (
    anomaly_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id INTEGER DEFAULT 1,

    -- Anomaly classification
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Entity reference
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,

    -- Details
    description TEXT NOT NULL,

    -- Detection information
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confidence_score DECIMAL(5,4) DEFAULT 0,
    impact_score DECIMAL(10,2) DEFAULT 0,

    -- Resolution tracking
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),
    auto_resolved BOOLEAN DEFAULT false,

    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- SECTION 4: CREATE ANALYTICS_PREDICTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.analytics_predictions (
    prediction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id INTEGER DEFAULT 1,

    -- Model information
    model_type VARCHAR(100) NOT NULL,

    -- Entity reference
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,

    -- Prediction details
    prediction_type VARCHAR(100) NOT NULL,
    predicted_value DECIMAL(18,4),

    -- Accuracy metrics
    confidence DECIMAL(5,4) DEFAULT 0,
    accuracy DECIMAL(5,4),

    -- Time horizon
    time_horizon_days INTEGER DEFAULT 30,

    -- Contributing factors
    factors JSONB DEFAULT '{}'::jsonb,

    -- Dates
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prediction_date TIMESTAMPTZ NOT NULL,

    -- Validation
    actual_value DECIMAL(18,4),
    validated_at TIMESTAMPTZ
);

-- ============================================================================
-- SECTION 5: CREATE ANALYTICS_DASHBOARD_CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.analytics_dashboard_config (
    organization_id INTEGER PRIMARY KEY DEFAULT 1,

    -- Configuration settings
    refresh_interval INTEGER DEFAULT 30000,

    -- Widget configuration
    widgets JSONB DEFAULT '{}'::jsonb,
    alerts JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 6: CREATE PURCHASE_ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.purchase_orders (
    purchase_order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supplier_id BIGINT NOT NULL,

    -- Order identification
    po_number VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',

    -- Dates
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_delivery_date TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,

    -- Financial information
    total_amount DECIMAL(18,4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Additional details
    notes TEXT,

    -- Approval tracking
    created_by VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_purchase_orders_supplier_id
        FOREIGN KEY (supplier_id)
        REFERENCES core.supplier(supplier_id)
        ON DELETE RESTRICT
);

-- ============================================================================
-- SECTION 7: CREATE PURCHASE_ORDER_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.purchase_order_items (
    po_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL,

    -- Product identification
    item_sku VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(255),

    -- Quantity and pricing
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(18,4) NOT NULL CHECK (unit_price >= 0),

    -- Calculated total (using generated column)
    total_amount DECIMAL(18,4) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    -- Delivery information
    delivery_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_purchase_order_items_po_id
        FOREIGN KEY (purchase_order_id)
        REFERENCES core.purchase_orders(purchase_order_id)
        ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 8: CREATE INDEXES
-- ============================================================================

-- Supplier performance indexes
CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id
    ON core.supplier_performance(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_performance_evaluation_date
    ON core.supplier_performance(evaluation_date DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_performance_rating
    ON core.supplier_performance(overall_rating DESC);

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id
    ON core.stock_movements(item_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_type
    ON core.stock_movements(type);

CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp
    ON core.stock_movements(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier_id
    ON core.stock_movements(supplier_id)
    WHERE supplier_id IS NOT NULL;

-- Analytics anomalies indexes
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_organization_id
    ON core.analytics_anomalies(organization_id);

CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_detected_at
    ON core.analytics_anomalies(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_severity
    ON core.analytics_anomalies(severity);

CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_resolved
    ON core.analytics_anomalies(resolved_at)
    WHERE resolved_at IS NULL;

-- Analytics predictions indexes
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_organization_id
    ON core.analytics_predictions(organization_id);

CREATE INDEX IF NOT EXISTS idx_analytics_predictions_created_at
    ON core.analytics_predictions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_predictions_entity
    ON core.analytics_predictions(entity_type, entity_id);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
    ON core.purchase_orders(supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date
    ON core.purchase_orders(order_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
    ON core.purchase_orders(status);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id
    ON core.purchase_order_items(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_sku
    ON core.purchase_order_items(item_sku);

-- ============================================================================
-- SECTION 9: CREATE TRIGGERS
-- ============================================================================

-- Reuse trigger function from migration 001
DROP TRIGGER IF EXISTS update_supplier_performance_updated_at ON core.supplier_performance;
CREATE TRIGGER update_supplier_performance_updated_at
    BEFORE UPDATE ON core.supplier_performance
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

DROP TRIGGER IF EXISTS update_analytics_dashboard_config_updated_at ON core.analytics_dashboard_config;
CREATE TRIGGER update_analytics_dashboard_config_updated_at
    BEFORE UPDATE ON core.analytics_dashboard_config
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON core.purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON core.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_order_items_updated_at ON core.purchase_order_items;
CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON core.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- ============================================================================
-- SECTION 10: COMMENTS
-- ============================================================================

COMMENT ON TABLE core.supplier_performance IS
    'Tracks supplier performance metrics over time';

COMMENT ON TABLE core.stock_movements IS
    'Records all inventory movements including inbound, outbound, and adjustments';

COMMENT ON TABLE core.analytics_anomalies IS
    'Stores detected anomalies from AI/ML analysis';

COMMENT ON TABLE core.analytics_predictions IS
    'Stores ML predictions for demand, pricing, and optimization';

COMMENT ON TABLE core.analytics_dashboard_config IS
    'Configuration settings for analytics dashboard per organization';

COMMENT ON TABLE core.purchase_orders IS
    'Purchase orders issued to suppliers';

COMMENT ON TABLE core.purchase_order_items IS
    'Line items within purchase orders';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_expected_tables TEXT[] := ARRAY[
        'supplier_performance',
        'stock_movements',
        'analytics_anomalies',
        'analytics_predictions',
        'analytics_dashboard_config',
        'purchase_orders',
        'purchase_order_items'
    ];
    v_table_name TEXT;
BEGIN
    v_table_count := 0;

    FOREACH v_table_name IN ARRAY v_expected_tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'core' AND table_name = v_table_name
        ) THEN
            v_table_count := v_table_count + 1;
            RAISE NOTICE 'Table exists: core.%', v_table_name;
        ELSE
            RAISE WARNING 'Table missing: core.%', v_table_name;
        END IF;
    END LOOP;

    RAISE NOTICE 'Migration 002: Created % out of % expected tables', v_table_count, array_length(v_expected_tables, 1);

    IF v_table_count = array_length(v_expected_tables, 1) THEN
        RAISE NOTICE 'Migration 002 completed successfully (BIGINT strategy)';
    ELSE
        RAISE EXCEPTION 'Migration 002 FAILED: Not all tables created!';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================
