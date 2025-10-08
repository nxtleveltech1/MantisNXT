-- Create essential analytics tables for MantisNXT

-- Create supplier_performance table
CREATE TABLE IF NOT EXISTS supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    evaluation_date TIMESTAMP NOT NULL DEFAULT NOW(),
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 85,
    quality_acceptance_rate DECIMAL(5,2) DEFAULT 95,
    overall_rating DECIMAL(3,2) DEFAULT 4.0,
    response_time_hours INTEGER DEFAULT 24,
    communication_score DECIMAL(3,2) DEFAULT 4.0,
    cost_competitiveness DECIMAL(3,2) DEFAULT 4.0,
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(15,4) DEFAULT 0,
    issues_reported INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(15,4),
    reference_number VARCHAR(255),
    notes TEXT,
    created_by VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    supplier_id UUID,
    location VARCHAR(255),
    batch_number VARCHAR(255)
);

-- Create analytics_anomalies table
CREATE TABLE IF NOT EXISTS analytics_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INTEGER DEFAULT 1,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    confidence_score DECIMAL(5,4) DEFAULT 0,
    impact_score DECIMAL(10,2) DEFAULT 0,
    auto_resolved BOOLEAN DEFAULT false,
    metadata TEXT DEFAULT '{}'
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
    factors TEXT DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    prediction_date TIMESTAMP NOT NULL,
    actual_value DECIMAL(15,4),
    validated_at TIMESTAMP
);

-- Create analytics_dashboard_config table
CREATE TABLE IF NOT EXISTS analytics_dashboard_config (
    organization_id INTEGER PRIMARY KEY DEFAULT 1,
    refresh_interval INTEGER DEFAULT 30000,
    widgets TEXT DEFAULT '{}',
    alerts TEXT DEFAULT '{}',
    preferences TEXT DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create purchase_orders table (referenced in analytics)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
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

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL,
    item_sku VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    total_amount DECIMAL(15,4),
    delivery_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Computed column will be handled by application logic

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id ON supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_organization_id ON analytics_anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_organization_id ON analytics_predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);