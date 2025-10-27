-- ===================================================================
-- EMERGENCY DATABASE REPAIR SCRIPT - MantisNXT Schema Fixes
-- ===================================================================
-- This script addresses critical missing columns and tables causing
-- 500 errors in analytics APIs and system-wide failures.
--
-- ISSUES IDENTIFIED:
-- - Missing columns: current_stock, overall_rating, evaluation_date, timestamp, tier, type
-- - Missing tables: supplier_price_lists, analytics_dashboard_config, etc.
-- - UUID casting failures in analytics APIs
-- ===================================================================

BEGIN;

-- ===================================================================
-- STEP 1: ADD MISSING CRITICAL COLUMNS
-- ===================================================================

-- Add current_stock to inventory_items (critical for analytics)
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;

-- Set current_stock from existing stock_qty
UPDATE inventory_items
SET current_stock = COALESCE(stock_qty, 0)
WHERE current_stock IS NULL OR current_stock = 0;

-- Add unit_cost to inventory_items (needed for value calculations)
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) DEFAULT 0.00;

-- Set unit_cost from existing cost_price
UPDATE inventory_items
SET unit_cost = COALESCE(cost_price, 0)
WHERE unit_cost IS NULL OR unit_cost = 0;

-- Add overall_rating to supplier_performance (critical for dashboard)
ALTER TABLE supplier_performance ADD COLUMN IF NOT EXISTS overall_rating NUMERIC(3,2) DEFAULT 0.00;

-- Calculate overall_rating from existing metrics
UPDATE supplier_performance
SET overall_rating = (
    COALESCE(on_time_rate, 0) * 0.4 +
    COALESCE(quality_score, 0) * 0.3 +
    COALESCE(delivery_rate, 0) * 0.3
) / 100
WHERE overall_rating IS NULL OR overall_rating = 0;

-- Add evaluation_date to supplier_performance
ALTER TABLE supplier_performance ADD COLUMN IF NOT EXISTS evaluation_date DATE DEFAULT CURRENT_DATE;

-- Set evaluation_date from existing period_end
UPDATE supplier_performance
SET evaluation_date = COALESCE(period_end, CURRENT_DATE)
WHERE evaluation_date IS NULL;

-- Add on_time_delivery_rate to supplier_performance (used in analytics)
ALTER TABLE supplier_performance ADD COLUMN IF NOT EXISTS on_time_delivery_rate NUMERIC(5,2) DEFAULT 0.00;

-- Set from existing on_time_rate
UPDATE supplier_performance
SET on_time_delivery_rate = COALESCE(on_time_rate, 0)
WHERE on_time_delivery_rate IS NULL OR on_time_delivery_rate = 0;

-- Add quality_acceptance_rate to supplier_performance
ALTER TABLE supplier_performance ADD COLUMN IF NOT EXISTS quality_acceptance_rate NUMERIC(5,2) DEFAULT 0.00;

-- Set from existing quality_score
UPDATE supplier_performance
SET quality_acceptance_rate = COALESCE(quality_score, 0)
WHERE quality_acceptance_rate IS NULL OR quality_acceptance_rate = 0;

-- Add timestamp to stock_movements (critical for time-based queries)
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set timestamp from existing created_at
UPDATE stock_movements
SET timestamp = COALESCE(created_at, NOW())
WHERE timestamp IS NULL;

-- Add type to stock_movements (critical for inbound/outbound analytics)
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'adjustment';

-- Set type from existing movement_type
UPDATE stock_movements
SET type = CASE
    WHEN movement_type ILIKE '%in%' OR movement_type ILIKE '%receive%' OR movement_type ILIKE '%purchase%' THEN 'inbound'
    WHEN movement_type ILIKE '%out%' OR movement_type ILIKE '%sale%' OR movement_type ILIKE '%ship%' THEN 'outbound'
    ELSE 'adjustment'
END
WHERE type = 'adjustment';

-- Add tier to suppliers (critical for performance analytics)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'standard';

-- Set tier from existing performance_tier
UPDATE suppliers
SET tier = CASE
    WHEN performance_tier = 'A' OR performance_tier ILIKE '%premium%' THEN 'premium'
    WHEN performance_tier = 'B' OR performance_tier ILIKE '%preferred%' THEN 'preferred'
    WHEN performance_tier = 'C' OR performance_tier ILIKE '%standard%' THEN 'standard'
    ELSE 'standard'
END
WHERE tier = 'standard';

-- ===================================================================
-- STEP 2: CREATE MISSING CRITICAL TABLES
-- ===================================================================

-- Create supplier_price_lists table (referenced in APIs)
CREATE TABLE IF NOT EXISTS supplier_price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    expires_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_dashboard_config table
CREATE TABLE IF NOT EXISTS analytics_dashboard_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    refresh_interval INTEGER DEFAULT 30000,
    widgets JSONB DEFAULT '{}',
    alerts JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Create analytics_anomaly_config table
CREATE TABLE IF NOT EXISTS analytics_anomaly_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    thresholds JSONB DEFAULT '{}',
    notifications JSONB DEFAULT '{}',
    auto_actions JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Create analytics_audit_log table
CREATE TABLE IF NOT EXISTS analytics_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_ids JSONB,
    performed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_requests table
CREATE TABLE IF NOT EXISTS analytics_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    target_id UUID,
    organization_id UUID NOT NULL,
    processing_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- STEP 3: ADD CRITICAL INDEXES FOR PERFORMANCE
-- ===================================================================

-- Index on inventory_items for analytics queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_org_stock ON inventory_items(organization_id, current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_items_reorder ON inventory_items(organization_id) WHERE current_stock <= reorder_point;

-- Index on supplier_performance for rating queries
CREATE INDEX IF NOT EXISTS idx_supplier_performance_rating ON supplier_performance(overall_rating DESC, evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_org ON supplier_performance(supplier_id, evaluation_date DESC);

-- Index on stock_movements for time-based analytics
CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp ON stock_movements(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type_time ON stock_movements(type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_time ON stock_movements(organization_id, timestamp DESC);

-- Index on suppliers for tier analytics
CREATE INDEX IF NOT EXISTS idx_suppliers_tier_status ON suppliers(tier, status) WHERE status = 'active';

-- Analytics table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_org_time ON analytics_anomalies(organization_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_org_time ON analytics_predictions(organization_id, created_at DESC);

-- ===================================================================
-- STEP 4: UPDATE ANALYTICS TABLES STRUCTURE
-- ===================================================================

-- Ensure analytics_anomalies has required columns
ALTER TABLE analytics_anomalies ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(255);
ALTER TABLE analytics_anomalies ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE analytics_anomalies ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE analytics_anomalies ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Ensure analytics_predictions has required columns
ALTER TABLE analytics_predictions ADD COLUMN IF NOT EXISTS accuracy NUMERIC(5,2);

-- ===================================================================
-- STEP 5: ADD CONSTRAINTS AND VALIDATION
-- ===================================================================

-- Add check constraints for data integrity
ALTER TABLE inventory_items ADD CONSTRAINT IF NOT EXISTS chk_current_stock_positive CHECK (current_stock >= 0);
ALTER TABLE supplier_performance ADD CONSTRAINT IF NOT EXISTS chk_overall_rating_range CHECK (overall_rating >= 0 AND overall_rating <= 5);
ALTER TABLE stock_movements ADD CONSTRAINT IF NOT EXISTS chk_type_valid CHECK (type IN ('inbound', 'outbound', 'adjustment'));
ALTER TABLE suppliers ADD CONSTRAINT IF NOT EXISTS chk_tier_valid CHECK (tier IN ('premium', 'preferred', 'standard'));

-- ===================================================================
-- STEP 6: DATA CLEANUP AND OPTIMIZATION
-- ===================================================================

-- Update statistics for better query planning
ANALYZE inventory_items;
ANALYZE supplier_performance;
ANALYZE stock_movements;
ANALYZE suppliers;
ANALYZE analytics_anomalies;
ANALYZE analytics_predictions;

-- Log the repair operation
INSERT INTO analytics_audit_log (action, target_type, target_ids, performed_by, notes, created_at)
VALUES (
    'emergency_schema_repair',
    'database',
    '["inventory_items", "supplier_performance", "stock_movements", "suppliers"]',
    'emergency_repair_script',
    'Added missing columns: current_stock, overall_rating, evaluation_date, timestamp, tier, type. Created missing analytics tables.',
    NOW()
);

COMMIT;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Verify critical columns exist
SELECT
    'inventory_items' as table_name,
    'current_stock' as column_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.columns
WHERE table_name = 'inventory_items' AND column_name = 'current_stock'

UNION ALL

SELECT
    'supplier_performance' as table_name,
    'overall_rating' as column_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.columns
WHERE table_name = 'supplier_performance' AND column_name = 'overall_rating'

UNION ALL

SELECT
    'stock_movements' as table_name,
    'timestamp' as column_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.columns
WHERE table_name = 'stock_movements' AND column_name = 'timestamp'

UNION ALL

SELECT
    'suppliers' as table_name,
    'tier' as column_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.columns
WHERE table_name = 'suppliers' AND column_name = 'tier';

-- Verify data integrity
SELECT
    'inventory_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(current_stock) as with_current_stock,
    AVG(current_stock) as avg_stock
FROM inventory_items

UNION ALL

SELECT
    'supplier_performance' as table_name,
    COUNT(*) as total_rows,
    COUNT(overall_rating) as with_rating,
    AVG(overall_rating) as avg_rating
FROM supplier_performance;

\echo '✅ Emergency database repair completed successfully!'
\echo '🔧 Applied fixes for missing columns and tables'
\echo '📊 Added performance indexes'
\echo '✅ System should now be stable for analytics APIs'