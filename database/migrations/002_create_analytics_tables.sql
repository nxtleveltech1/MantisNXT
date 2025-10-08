-- Create analytics tables for MantisNXT
-- These tables support the analytics dashboard and ML features

-- Create supplier_performance table
CREATE TABLE IF NOT EXISTS supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    evaluation_date TIMESTAMP NOT NULL DEFAULT NOW(),
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0 CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100),
    quality_acceptance_rate DECIMAL(5,2) DEFAULT 0 CHECK (quality_acceptance_rate >= 0 AND quality_acceptance_rate <= 100),
    overall_rating DECIMAL(3,2) DEFAULT 0 CHECK (overall_rating >= 0 AND overall_rating <= 5),
    response_time_hours INTEGER DEFAULT 24 CHECK (response_time_hours >= 0),
    communication_score DECIMAL(3,2) DEFAULT 0 CHECK (communication_score >= 0 AND communication_score <= 5),
    cost_competitiveness DECIMAL(3,2) DEFAULT 0 CHECK (cost_competitiveness >= 0 AND cost_competitiveness <= 5),
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(15,4) DEFAULT 0,
    issues_reported INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Add unique constraint later
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL CHECK (quantity != 0),
    unit_cost DECIMAL(15,4),
    reference_number VARCHAR(255),
    notes TEXT,
    created_by VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Additional fields for tracking
    purchase_order_id UUID,
    supplier_id UUID REFERENCES suppliers(id),
    location VARCHAR(255),
    batch_number VARCHAR(255)
);

-- Create analytics_anomalies table
CREATE TABLE IF NOT EXISTS analytics_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INTEGER DEFAULT 1,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    confidence_score DECIMAL(5,4) DEFAULT 0,
    impact_score DECIMAL(10,2) DEFAULT 0,
    auto_resolved BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

-- Create analytics_predictions table
CREATE TABLE IF NOT EXISTS analytics_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INTEGER DEFAULT 1,
    model_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    prediction_type VARCHAR(100) NOT NULL,
    predicted_value DECIMAL(15,4),
    confidence DECIMAL(5,4) DEFAULT 0,
    accuracy DECIMAL(5,4),
    time_horizon_days INTEGER DEFAULT 30,
    factors JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    prediction_date TIMESTAMP NOT NULL,
    actual_value DECIMAL(15,4),
    validated_at TIMESTAMP
);

-- Create analytics_dashboard_config table
CREATE TABLE IF NOT EXISTS analytics_dashboard_config (
    organization_id INTEGER PRIMARY KEY DEFAULT 1,
    refresh_interval INTEGER DEFAULT 30000,
    widgets JSONB DEFAULT '{}',
    alerts JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create purchase_order_items table (referenced in analytics)
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL,
    item_sku VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,4) NOT NULL CHECK (unit_price >= 0),
    total_amount DECIMAL(15,4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    delivery_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create purchase_orders table (referenced in analytics)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    po_number VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    order_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    total_amount DECIMAL(15,4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    created_by VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint for purchase_order_items after both tables exist
-- This will be done below after purchase_orders table is created
-- Commented out for now to avoid dependency issues

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id ON supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_evaluation_date ON supplier_performance(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_rating ON supplier_performance(overall_rating);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp ON stock_movements(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier_id ON stock_movements(supplier_id);

CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_organization_id ON analytics_anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_detected_at ON analytics_anomalies(detected_at);
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_severity ON analytics_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_resolved ON analytics_anomalies(resolved_at);

CREATE INDEX IF NOT EXISTS idx_analytics_predictions_organization_id ON analytics_predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_created_at ON analytics_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_entity ON analytics_predictions(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_sku ON purchase_order_items(item_sku);

-- Create triggers for timestamp updates
CREATE TRIGGER update_supplier_performance_updated_at
    BEFORE UPDATE ON supplier_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_dashboard_config_updated_at
    BEFORE UPDATE ON analytics_dashboard_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing analytics
INSERT INTO supplier_performance (
    supplier_id, evaluation_date, on_time_delivery_rate, quality_acceptance_rate,
    overall_rating, response_time_hours, communication_score, cost_competitiveness,
    total_orders, total_value, issues_reported, issues_resolved
)
SELECT
    id,
    NOW() - INTERVAL '7 days',
    85.5 + (RANDOM() * 14),
    90.0 + (RANDOM() * 10),
    4.0 + (RANDOM() * 1),
    12 + (RANDOM() * 24)::INTEGER,
    4.2 + (RANDOM() * 0.8),
    4.1 + (RANDOM() * 0.9),
    (RANDOM() * 50)::INTEGER,
    (RANDOM() * 100000),
    (RANDOM() * 5)::INTEGER,
    (RANDOM() * 3)::INTEGER
FROM suppliers
LIMIT 5
ON CONFLICT DO NOTHING;

-- Insert sample stock movements
INSERT INTO stock_movements (item_id, type, quantity, unit_cost, reference_number, notes, created_by, timestamp)
SELECT
    ii.id,
    CASE WHEN RANDOM() > 0.5 THEN 'inbound' ELSE 'outbound' END,
    (RANDOM() * 100 + 1)::INTEGER * CASE WHEN RANDOM() > 0.5 THEN 1 ELSE -1 END,
    ii.unit_cost * (0.9 + RANDOM() * 0.2),
    'MV-' || LPAD((RANDOM() * 10000)::INTEGER::TEXT, 5, '0'),
    'Sample movement for testing',
    'system@company.com',
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM inventory_items ii
LIMIT 20
ON CONFLICT DO NOTHING;

-- Insert sample analytics anomalies
INSERT INTO analytics_anomalies (
    organization_id, type, severity, entity_type, entity_id,
    description, detected_at, confidence_score, impact_score
)
SELECT
    1,
    CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'price_spike'
        WHEN 1 THEN 'delivery_delay'
        WHEN 2 THEN 'quality_issue'
        ELSE 'demand_anomaly'
    END,
    CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'medium'
        WHEN 2 THEN 'high'
        ELSE 'critical'
    END,
    'supplier',
    s.id,
    'Sample anomaly detected by AI system for testing',
    NOW() - (RANDOM() * INTERVAL '7 days'),
    0.7 + RANDOM() * 0.3,
    RANDOM() * 1000
FROM suppliers s
LIMIT 3
ON CONFLICT DO NOTHING;

-- Insert sample predictions
INSERT INTO analytics_predictions (
    organization_id, model_type, entity_type, entity_id,
    prediction_type, predicted_value, confidence, time_horizon_days,
    factors, created_at, prediction_date
)
SELECT
    1,
    'demand_forecast',
    'inventory_item',
    ii.id,
    'demand_quantity',
    (RANDOM() * 100 + 10),
    0.75 + RANDOM() * 0.25,
    30,
    '{"seasonality": 0.3, "trend": 0.2, "historical": 0.5}',
    NOW(),
    NOW() + INTERVAL '30 days'
FROM inventory_items ii
LIMIT 5
ON CONFLICT DO NOTHING;

COMMENT ON TABLE supplier_performance IS 'Tracks supplier performance metrics over time';
COMMENT ON TABLE stock_movements IS 'Records all inventory movements including inbound, outbound, and adjustments';
COMMENT ON TABLE analytics_anomalies IS 'Stores detected anomalies from AI/ML analysis';
COMMENT ON TABLE analytics_predictions IS 'Stores ML predictions for demand, pricing, and optimization';
COMMENT ON TABLE analytics_dashboard_config IS 'Configuration settings for analytics dashboard per organization';