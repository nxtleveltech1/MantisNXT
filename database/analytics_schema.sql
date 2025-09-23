-- Analytics and ML System Database Schema
-- This schema supports the intelligent analytics features for MantisNXT

-- Analytics Cache Table for storing computed results
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    organization_id INTEGER REFERENCES organizations(id),
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    INDEX(type, organization_id, created_at)
);

-- Demand Forecasts Table
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id),
    predictions JSONB NOT NULL, -- {next7Days, next30Days, next90Days}
    seasonality JSONB NOT NULL, -- {weeklyPattern, monthlyPattern, yearlyTrend}
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    model_version VARCHAR(50) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(item_id),
    INDEX(organization_id, confidence DESC),
    INDEX(created_at DESC)
);

-- Price Optimizations Table
CREATE TABLE IF NOT EXISTS price_optimizations (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id),
    current_price DECIMAL(15,4) NOT NULL,
    optimized_price DECIMAL(15,4) NOT NULL,
    expected_profit_increase DECIMAL(5,4) NOT NULL,
    demand_sensitivity DECIMAL(5,4),
    competitive_position VARCHAR(20) CHECK (competitive_position IN ('low', 'competitive', 'premium')),
    recommendation TEXT,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    model_version VARCHAR(50) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    implemented_at TIMESTAMP NULL,
    implementation_notes TEXT,

    INDEX(organization_id, expected_profit_increase DESC),
    INDEX(created_at DESC)
);

-- Analytics Anomalies Table
CREATE TABLE IF NOT EXISTS analytics_anomalies (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    type VARCHAR(100) NOT NULL, -- 'delivery_performance', 'quality_issues', 'low_stock', etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    value DECIMAL(15,4),
    threshold DECIMAL(15,4),
    entity_type VARCHAR(50), -- 'supplier', 'inventory_item', 'system'
    entity_id INTEGER,
    detected_at TIMESTAMP DEFAULT NOW(),
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    false_positive BOOLEAN DEFAULT FALSE,

    INDEX(organization_id, severity, detected_at DESC),
    INDEX(entity_type, entity_id),
    INDEX(resolved_at) WHERE resolved_at IS NULL -- Partial index for active anomalies
);

-- Analytics Predictions Table
CREATE TABLE IF NOT EXISTS analytics_predictions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    prediction_type VARCHAR(100) NOT NULL, -- 'supplier_performance', 'demand_forecast', etc.
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id INTEGER NOT NULL,
    prediction_value DECIMAL(15,6) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    factors JSONB, -- Contributing factors and their weights
    model_version VARCHAR(50) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    actual_value DECIMAL(15,6), -- For accuracy measurement
    measured_at TIMESTAMP,
    accuracy DECIMAL(5,4), -- Calculated accuracy when actual value is known

    INDEX(organization_id, prediction_type, created_at DESC),
    INDEX(target_entity_type, target_entity_id),
    INDEX(confidence DESC),
    INDEX(accuracy DESC) WHERE accuracy IS NOT NULL
);

-- Analytics Recommendations Table
CREATE TABLE IF NOT EXISTS analytics_recommendations (
    id VARCHAR(255) PRIMARY KEY, -- Custom ID from recommendation engine
    organization_id INTEGER REFERENCES organizations(id),
    type VARCHAR(100) NOT NULL, -- 'supplier_optimization', 'inventory_reorder', etc.
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    timeframe VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'procurement', 'inventory', 'financial', etc.
    target_entity JSONB NOT NULL, -- {type, id, name}
    metrics JSONB NOT NULL, -- {currentValue, targetValue, improvementPotential, roi}
    actions JSONB NOT NULL, -- Array of action steps
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    accepted_by INTEGER REFERENCES users(id),
    accepted_at TIMESTAMP,
    rejected_by INTEGER REFERENCES users(id),
    rejected_at TIMESTAMP,
    implemented_by INTEGER REFERENCES users(id),
    implemented_at TIMESTAMP,
    notes TEXT,

    INDEX(organization_id, priority, status, created_at DESC),
    INDEX(type, category),
    INDEX(confidence DESC),
    INDEX(expires_at) WHERE expires_at IS NOT NULL
);

-- Query Performance Metrics Table
CREATE TABLE IF NOT EXISTS query_performance_metrics (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    query_hash VARCHAR(100) NOT NULL,
    query_text TEXT,
    execution_time INTEGER NOT NULL, -- milliseconds
    rows_returned INTEGER,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(10,2), -- MB
    indexes_used TEXT[],
    plan_hash VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW(),

    INDEX(organization_id, query_hash, timestamp DESC),
    INDEX(execution_time DESC),
    INDEX(timestamp DESC)
);

-- Optimization Log Table
CREATE TABLE IF NOT EXISTS optimization_log (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    optimization_type VARCHAR(100) NOT NULL,
    target VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    before_metrics JSONB,
    after_metrics JSONB,
    improvement_percentage DECIMAL(5,2),
    applied_by INTEGER REFERENCES users(id),
    applied_at TIMESTAMP DEFAULT NOW(),
    rollback_at TIMESTAMP,
    rollback_reason TEXT,

    INDEX(organization_id, applied_at DESC),
    INDEX(optimization_type, improvement_percentage DESC)
);

-- Analytics Dashboard Configuration Table
CREATE TABLE IF NOT EXISTS analytics_dashboard_config (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) UNIQUE,
    refresh_interval INTEGER DEFAULT 30000, -- milliseconds
    widgets JSONB DEFAULT '{}',
    alerts JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    layout JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Anomaly Configuration Table
CREATE TABLE IF NOT EXISTS analytics_anomaly_config (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) UNIQUE,
    thresholds JSONB NOT NULL DEFAULT '{}', -- Custom thresholds for anomaly detection
    notifications JSONB DEFAULT '{}', -- Notification settings
    auto_actions JSONB DEFAULT '{}', -- Automated response actions
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Audit Log Table
CREATE TABLE IF NOT EXISTS analytics_audit_log (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_ids JSONB, -- Array of affected IDs
    performed_by INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX(organization_id, created_at DESC),
    INDEX(action, target_type),
    INDEX(performed_by, created_at DESC)
);

-- Analytics Requests Table (for tracking API usage)
CREATE TABLE IF NOT EXISTS analytics_requests (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    request_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    processing_time INTEGER, -- milliseconds
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX(organization_id, request_type, created_at DESC),
    INDEX(processing_time DESC),
    INDEX(success, created_at DESC)
);

-- Supplier Risk Scores Table (computed from analytics)
CREATE TABLE IF NOT EXISTS supplier_risk_scores (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id),
    risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_factors JSONB NOT NULL, -- {deliveryReliability, qualityIssues, etc.}
    recommendation VARCHAR(20) CHECK (recommendation IN ('maintain', 'monitor', 'review', 'replace')),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    model_version VARCHAR(50) DEFAULT '1.0',
    calculated_at TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,

    INDEX(organization_id, risk_score DESC),
    INDEX(supplier_id, calculated_at DESC),
    INDEX(recommendation, risk_score DESC)
);

-- Inventory Optimization Table
CREATE TABLE IF NOT EXISTS inventory_optimizations (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id),
    optimization_type VARCHAR(50) NOT NULL, -- 'reorder_point', 'order_quantity', 'safety_stock'
    current_value DECIMAL(15,4) NOT NULL,
    optimized_value DECIMAL(15,4) NOT NULL,
    expected_improvement DECIMAL(5,2), -- percentage
    carrying_cost_impact DECIMAL(15,4),
    stockout_risk_impact DECIMAL(5,4),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    model_version VARCHAR(50) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    implemented_at TIMESTAMP,
    implementation_notes TEXT,

    INDEX(organization_id, optimization_type, expected_improvement DESC),
    INDEX(item_id, created_at DESC)
);

-- Competitor Pricing Table (for price optimization)
CREATE TABLE IF NOT EXISTS competitor_pricing (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    item_sku VARCHAR(100) NOT NULL,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_price DECIMAL(15,4) NOT NULL,
    price_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    source VARCHAR(100), -- 'manual', 'api', 'scraper'
    confidence DECIMAL(3,2) DEFAULT 0.8,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX(organization_id, item_sku, price_date DESC),
    INDEX(competitor_name, price_date DESC),
    UNIQUE(organization_id, item_sku, competitor_name, price_date)
);

-- Materialized Views for Performance

-- Daily Analytics Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_summary AS
SELECT
    organization_id,
    DATE(created_at) as summary_date,
    COUNT(*) as total_predictions,
    AVG(confidence) as avg_confidence,
    COUNT(*) FILTER (WHERE prediction_type = 'supplier_performance') as supplier_predictions,
    COUNT(*) FILTER (WHERE prediction_type = 'demand_forecast') as demand_predictions,
    COUNT(*) FILTER (WHERE prediction_type = 'price_optimization') as price_predictions
FROM analytics_predictions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY organization_id, DATE(created_at);

-- Refresh materialized views daily
CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_org_date
ON analytics_daily_summary(organization_id, summary_date DESC);

-- Supplier Performance Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS supplier_performance_summary AS
SELECT
    s.organization_id,
    s.id as supplier_id,
    s.name as supplier_name,
    s.tier,
    srs.risk_score,
    srs.recommendation,
    df.confidence as forecast_confidence,
    COUNT(po.id) as total_orders_30d,
    SUM(po.total_amount) as total_value_30d,
    AVG(sp.on_time_delivery_rate) as avg_delivery_rate,
    AVG(sp.quality_acceptance_rate) as avg_quality_rate
FROM suppliers s
LEFT JOIN supplier_risk_scores srs ON s.id = srs.supplier_id
    AND srs.calculated_at = (
        SELECT MAX(calculated_at)
        FROM supplier_risk_scores srs2
        WHERE srs2.supplier_id = s.id
    )
LEFT JOIN demand_forecasts df ON s.id = df.item_id -- This would need proper supplier-item mapping
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
    AND po.order_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
    AND sp.evaluation_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE s.status = 'active'
GROUP BY s.organization_id, s.id, s.name, s.tier, srs.risk_score, srs.recommendation, df.confidence;

CREATE INDEX IF NOT EXISTS idx_supplier_performance_summary_org_risk
ON supplier_performance_summary(organization_id, risk_score DESC NULLS LAST);

-- Functions for Analytics

-- Function to calculate forecast accuracy
CREATE OR REPLACE FUNCTION calculate_forecast_accuracy()
RETURNS TRIGGER AS $$
BEGIN
    -- Update prediction accuracy when actual value is recorded
    UPDATE analytics_predictions
    SET accuracy = 1.0 - ABS(prediction_value - NEW.actual_value) / GREATEST(prediction_value, NEW.actual_value, 1)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate accuracy
CREATE TRIGGER trigger_calculate_forecast_accuracy
    AFTER UPDATE OF actual_value ON analytics_predictions
    FOR EACH ROW
    WHEN (NEW.actual_value IS NOT NULL AND OLD.actual_value IS NULL)
    EXECUTE FUNCTION calculate_forecast_accuracy();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_analytics_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Indexes for Performance Optimization

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_org_type_date
ON analytics_predictions(organization_id, prediction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_org_severity_date
ON analytics_anomalies(organization_id, severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_recommendations_org_priority_status
ON analytics_recommendations(organization_id, priority, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_performance_org_hash_time
ON query_performance_metrics(organization_id, query_hash, timestamp DESC);

-- Partial indexes for active/unresolved items
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_active
ON analytics_anomalies(organization_id, severity, detected_at DESC)
WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_recommendations_pending
ON analytics_recommendations(organization_id, priority, created_at DESC)
WHERE status = 'pending';

-- Comments for documentation
COMMENT ON TABLE analytics_cache IS 'Stores computed analytics results for performance optimization';
COMMENT ON TABLE demand_forecasts IS 'Machine learning demand forecasts for inventory items';
COMMENT ON TABLE price_optimizations IS 'Price optimization recommendations from ML models';
COMMENT ON TABLE analytics_anomalies IS 'Detected anomalies in supplier and inventory data';
COMMENT ON TABLE analytics_predictions IS 'ML model predictions with accuracy tracking';
COMMENT ON TABLE analytics_recommendations IS 'Intelligent business recommendations';
COMMENT ON TABLE query_performance_metrics IS 'Database query performance monitoring';
COMMENT ON TABLE supplier_risk_scores IS 'Calculated risk scores for suppliers';
COMMENT ON TABLE inventory_optimizations IS 'Inventory parameter optimization recommendations';

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA analytics TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO app_user;