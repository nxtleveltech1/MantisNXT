-- =====================================================
-- PRICING OPTIMIZATION TABLES (Core Schema)
-- =====================================================
-- Migration: 0018_create_optimization_tables.sql
-- Description: Creates optimization_runs, optimization_recommendations, and price_change_log tables
--              that match the PricingOptimizationService expectations
-- Date: 2025-01-27
-- Dependencies: Requires core schema and core.product, core.supplier_product tables

-- Ensure core schema exists
CREATE SCHEMA IF NOT EXISTS core;

-- =====================================================
-- OPTIMIZATION RUNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core.optimization_runs (
    run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_name text NOT NULL,
    strategy text NOT NULL CHECK (strategy IN (
        'maximize_revenue',
        'maximize_profit',
        'maximize_volume',
        'match_competition',
        'premium_positioning',
        'value_positioning'
    )),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled'
    )),
    
    -- Configuration (JSONB)
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Scope (JSONB)
    scope jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Results
    total_products_analyzed integer DEFAULT 0,
    recommendations_generated integer DEFAULT 0,
    estimated_revenue_impact numeric(15,2),
    estimated_profit_impact numeric(15,2),
    
    -- Progress tracking
    progress_percent numeric(5,2) DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    current_step text,
    products_processed integer DEFAULT 0,
    
    -- Execution tracking
    started_at timestamptz,
    completed_at timestamptz,
    error_message text,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,
    
    CONSTRAINT optimization_runs_name_length CHECK (char_length(run_name) >= 1 AND char_length(run_name) <= 200),
    CONSTRAINT optimization_runs_counts_non_negative CHECK (
        total_products_analyzed >= 0 AND
        recommendations_generated >= 0 AND
        products_processed >= 0
    ),
    CONSTRAINT optimization_runs_completed_after_started CHECK (
        completed_at IS NULL OR
        started_at IS NULL OR
        completed_at >= started_at
    )
);

-- Indexes for optimization_runs
CREATE INDEX IF NOT EXISTS idx_optimization_runs_status 
    ON core.optimization_runs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_progress 
    ON core.optimization_runs(status, progress_percent) 
    WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_optimization_runs_created_at 
    ON core.optimization_runs(created_at DESC);

-- Comments
COMMENT ON TABLE core.optimization_runs IS 'Pricing optimization analysis runs';
COMMENT ON COLUMN core.optimization_runs.config IS 'Optimization configuration including algorithms, target margins, constraints';
COMMENT ON COLUMN core.optimization_runs.scope IS 'Product scope filters (category_ids, brand_ids, supplier_ids, product_ids)';
COMMENT ON COLUMN core.optimization_runs.progress_percent IS 'Progress percentage (0-100) for optimization runs';

-- =====================================================
-- OPTIMIZATION RECOMMENDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core.optimization_recommendations (
    recommendation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES core.optimization_runs(run_id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES core.product(product_id) ON DELETE CASCADE,
    supplier_product_id uuid REFERENCES core.supplier_product(supplier_product_id) ON DELETE SET NULL,
    
    -- Current state
    current_price numeric(12,2) NOT NULL,
    current_cost numeric(12,2),
    current_margin_percent numeric(6,2),
    
    -- Recommended changes
    recommended_price numeric(12,2) NOT NULL,
    recommended_margin_percent numeric(6,2),
    price_change_percent numeric(8,4) NOT NULL,
    price_change_amount numeric(12,2) NOT NULL,
    
    -- Analysis
    confidence_score numeric(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    reasoning text NOT NULL,
    algorithm_used text NOT NULL,
    
    -- Impact projections
    projected_demand_change_percent numeric(8,4),
    projected_revenue_impact numeric(15,2),
    projected_profit_impact numeric(15,2),
    
    -- Supporting data (JSONB)
    competitor_prices jsonb,
    elasticity_estimate numeric(8,4),
    historical_performance jsonb,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'applied',
        'expired'
    )),
    applied_at timestamptz,
    applied_by uuid,
    rejection_reason text,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    
    CONSTRAINT optimization_recommendations_price_positive CHECK (
        current_price > 0 AND recommended_price > 0
    ),
    CONSTRAINT optimization_recommendations_reasoning_not_empty CHECK (
        char_length(reasoning) > 0
    )
);

-- Indexes for optimization_recommendations
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_run_id 
    ON core.optimization_recommendations(run_id);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_product_id 
    ON core.optimization_recommendations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_status 
    ON core.optimization_recommendations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_confidence 
    ON core.optimization_recommendations(confidence_score DESC) 
    WHERE status = 'pending';

-- Comments
COMMENT ON TABLE core.optimization_recommendations IS 'AI-powered pricing recommendations from optimization runs';
COMMENT ON COLUMN core.optimization_recommendations.competitor_prices IS 'Array of competitor price data';
COMMENT ON COLUMN core.optimization_recommendations.historical_performance IS 'Historical sales and pricing performance data';

-- =====================================================
-- PRICE CHANGE LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core.price_change_log (
    log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES core.product(product_id) ON DELETE CASCADE,
    supplier_product_id uuid REFERENCES core.supplier_product(supplier_product_id) ON DELETE SET NULL,
    
    -- Price changes
    old_price numeric(12,2) NOT NULL,
    new_price numeric(12,2) NOT NULL,
    price_change_percent numeric(8,4) NOT NULL,
    price_change_amount numeric(12,2) NOT NULL,
    
    -- Context
    change_reason text NOT NULL CHECK (change_reason IN (
        'rule_applied',
        'optimization',
        'manual',
        'cost_change',
        'competitor_change',
        'market_adjustment'
    )),
    rule_id uuid,
    recommendation_id uuid REFERENCES core.optimization_recommendations(recommendation_id) ON DELETE SET NULL,
    
    -- Metadata
    changed_at timestamptz DEFAULT now(),
    changed_by uuid,
    notes text,
    
    CONSTRAINT price_change_log_price_positive CHECK (
        old_price > 0 AND new_price > 0
    )
);

-- Indexes for price_change_log
CREATE INDEX IF NOT EXISTS idx_price_change_log_product_id 
    ON core.price_change_log(product_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_change_log_recommendation_id 
    ON core.price_change_log(recommendation_id) 
    WHERE recommendation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_change_log_changed_at 
    ON core.price_change_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_change_log_reason 
    ON core.price_change_log(change_reason, changed_at DESC);

-- Comments
COMMENT ON TABLE core.price_change_log IS 'Audit log of all price changes with context and reasoning';
COMMENT ON COLUMN core.price_change_log.change_reason IS 'Reason for price change (rule_applied, optimization, manual, etc.)';

-- =====================================================
-- COMPETITOR PRICES TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS core.competitor_prices (
    competitor_price_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES core.product(product_id) ON DELETE CASCADE,
    competitor_name text NOT NULL,
    competitor_sku text,
    price numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'ZAR',
    availability text DEFAULT 'unknown' CHECK (availability IN (
        'in_stock',
        'out_of_stock',
        'limited',
        'unknown'
    )),
    source_url text,
    last_checked timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT competitor_prices_price_positive CHECK (price > 0),
    CONSTRAINT competitor_prices_name_not_empty CHECK (char_length(competitor_name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_competitor_prices_product_id 
    ON core.competitor_prices(product_id, is_active) 
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_competitor_prices_last_checked 
    ON core.competitor_prices(last_checked DESC) 
    WHERE is_active = true;

-- =====================================================
-- PRICE ELASTICITY TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS core.price_elasticity (
    elasticity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES core.product(product_id) ON DELETE CASCADE,
    elasticity_coefficient numeric(8,4) NOT NULL,
    confidence_interval_lower numeric(8,4),
    confidence_interval_upper numeric(8,4),
    analysis_start_date date NOT NULL,
    analysis_end_date date NOT NULL,
    data_points_count integer NOT NULL,
    optimal_price numeric(12,2),
    optimal_price_confidence numeric(5,2),
    price_range_analyzed jsonb,
    demand_range_observed jsonb,
    created_at timestamptz DEFAULT now(),
    model_version text DEFAULT '1.0',
    is_current boolean DEFAULT true,
    
    CONSTRAINT price_elasticity_date_range_valid CHECK (
        analysis_end_date >= analysis_start_date
    ),
    CONSTRAINT price_elasticity_data_points_positive CHECK (
        data_points_count > 0
    )
);

CREATE INDEX IF NOT EXISTS idx_price_elasticity_product_id 
    ON core.price_elasticity(product_id, is_current) 
    WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_price_elasticity_date_range 
    ON core.price_elasticity(analysis_start_date, analysis_end_date);



