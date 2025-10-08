-- Minimal analytics tables for immediate functionality

-- Create supplier_performance table
CREATE TABLE IF NOT EXISTS supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    evaluation_date TIMESTAMP NOT NULL DEFAULT NOW(),
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 85,
    quality_acceptance_rate DECIMAL(5,2) DEFAULT 95,
    overall_rating DECIMAL(3,2) DEFAULT 4.0,
    response_time_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create analytics_anomalies table
CREATE TABLE IF NOT EXISTS analytics_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INTEGER DEFAULT 1,
    type VARCHAR(100) NOT NULL DEFAULT 'general',
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    entity_type VARCHAR(100) NOT NULL DEFAULT 'supplier',
    entity_id UUID NOT NULL,
    description TEXT NOT NULL DEFAULT 'Sample anomaly',
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    confidence_score DECIMAL(5,4) DEFAULT 0.8
);

-- Create analytics_predictions table
CREATE TABLE IF NOT EXISTS analytics_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INTEGER DEFAULT 1,
    model_type VARCHAR(100) NOT NULL DEFAULT 'demand_forecast',
    entity_type VARCHAR(100) NOT NULL DEFAULT 'inventory',
    entity_id UUID NOT NULL,
    prediction_type VARCHAR(100) NOT NULL DEFAULT 'demand',
    predicted_value DECIMAL(15,4) DEFAULT 0,
    confidence DECIMAL(5,4) DEFAULT 0.8,
    accuracy DECIMAL(5,4) DEFAULT 0.75,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    prediction_date TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert sample data for testing
INSERT INTO supplier_performance (supplier_id, on_time_delivery_rate, quality_acceptance_rate, overall_rating, response_time_hours)
SELECT id, 85.5 + (RANDOM() * 14), 90.0 + (RANDOM() * 10), 4.0 + (RANDOM() * 1), 12 + (RANDOM() * 24)::INTEGER
FROM suppliers LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO analytics_anomalies (entity_id, description, detected_at)
SELECT id, 'Sample performance anomaly detected', NOW() - (RANDOM() * INTERVAL '7 days')
FROM suppliers LIMIT 2
ON CONFLICT DO NOTHING;

INSERT INTO analytics_predictions (entity_id, predicted_value, prediction_date)
SELECT id, RANDOM() * 100 + 10, NOW() + INTERVAL '30 days'
FROM inventory_items LIMIT 3
ON CONFLICT DO NOTHING;

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id ON supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_organization_id ON analytics_anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_organization_id ON analytics_predictions(organization_id);