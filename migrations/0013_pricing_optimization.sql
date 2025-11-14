-- =====================================================
-- PRICING & OPTIMIZATION SYSTEM
-- =====================================================
-- Migration: 0013_pricing_optimization.sql
-- Description: Production-ready pricing intelligence and optimization system
-- Features: Dynamic pricing, AI recommendations, elasticity analysis, competitor tracking
-- Supports: Multi-tier pricing, automated optimization, historical tracking, revenue analytics
-- up

-- =====================================================
-- ENUMS FOR PRICING SYSTEM
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_strategy') THEN
        CREATE TYPE pricing_strategy AS ENUM (
            'cost_plus',        -- Base cost + fixed markup
            'market_based',     -- Based on market conditions
            'value_based',      -- Based on perceived customer value
            'competitive',      -- Based on competitor pricing
            'dynamic',          -- Real-time algorithmic adjustment
            'tiered'            -- Volume/customer-based tiers
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_tier') THEN
        CREATE TYPE price_tier AS ENUM (
            'standard',         -- Default/retail pricing
            'wholesale',        -- Bulk/wholesale pricing
            'retail',           -- Standard retail markup
            'vip',              -- Premium customer pricing
            'promotional'       -- Limited-time promotional pricing
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'optimization_status') THEN
        CREATE TYPE optimization_status AS ENUM (
            'pending',          -- Queued for analysis
            'analyzing',        -- Analysis in progress
            'completed',        -- Analysis complete
            'applied',          -- Recommendations applied
            'rejected'          -- Recommendations rejected
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_type') THEN
        CREATE TYPE recommendation_type AS ENUM (
            'price_increase',   -- Suggest price increase
            'price_decrease',   -- Suggest price decrease
            'bundle',           -- Product bundling opportunity
            'promotion',        -- Promotional campaign
            'clearance'         -- Clearance/liquidation pricing
        );
    END IF;
END $$;

-- =====================================================
-- PRICING RULES ENGINE
-- =====================================================

-- Pricing rules for automated price calculation
CREATE TABLE pricing_rule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    strategy pricing_strategy NOT NULL DEFAULT 'cost_plus',

    -- Rule scope (product-specific or category-wide)
    inventory_item_id uuid REFERENCES inventory_item(id) ON DELETE CASCADE,
    category_id uuid,  -- For category-wide rules
    brand_id uuid REFERENCES brand(id) ON DELETE SET NULL,
    supplier_id uuid REFERENCES supplier(id) ON DELETE SET NULL,

    -- Base pricing parameters
    base_cost numeric(12,2),  -- Override cost if specified
    markup_percentage numeric(6,2),  -- Percentage markup on cost
    fixed_margin numeric(12,2),  -- Fixed profit margin

    -- Price constraints
    min_price numeric(12,2),  -- Minimum allowed price
    max_price numeric(12,2),  -- Maximum allowed price

    -- Tiered pricing
    tier price_tier DEFAULT 'standard',

    -- Advanced conditions (JSON)
    conditions jsonb DEFAULT '{}'::jsonb,  -- e.g., {"min_quantity": 10, "customer_segment": "wholesale", "date_range": {...}}

    -- Rule priority and activation
    is_active boolean DEFAULT true,
    priority integer DEFAULT 100,  -- Higher priority = applied first (for conflicting rules)
    valid_from timestamptz DEFAULT now(),
    valid_until timestamptz,

    -- Metadata
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT pricing_rule_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT pricing_rule_markup_positive CHECK (markup_percentage IS NULL OR markup_percentage >= 0),
    CONSTRAINT pricing_rule_margin_positive CHECK (fixed_margin IS NULL OR fixed_margin >= 0),
    CONSTRAINT pricing_rule_min_max_valid CHECK (min_price IS NULL OR max_price IS NULL OR min_price <= max_price),
    CONSTRAINT pricing_rule_priority_positive CHECK (priority > 0),
    CONSTRAINT pricing_rule_valid_dates CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT pricing_rule_has_scope CHECK (
        inventory_item_id IS NOT NULL OR
        category_id IS NOT NULL OR
        brand_id IS NOT NULL OR
        supplier_id IS NOT NULL
    )
);

-- Create index for rule matching
CREATE INDEX idx_pricing_rule_active ON pricing_rule(org_id, is_active, priority DESC) WHERE is_active = true;
CREATE INDEX idx_pricing_rule_product ON pricing_rule(inventory_item_id) WHERE inventory_item_id IS NOT NULL;
CREATE INDEX idx_pricing_rule_category ON pricing_rule(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_pricing_rule_brand ON pricing_rule(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX idx_pricing_rule_validity ON pricing_rule(valid_from, valid_until);

-- =====================================================
-- PRICE HISTORY & AUDIT TRAIL
-- =====================================================

-- Comprehensive price change history
CREATE TABLE price_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,

    -- Price change details
    old_price numeric(12,2),
    new_price numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'ZAR',

    -- Change context
    reason text NOT NULL,
    pricing_rule_id uuid REFERENCES pricing_rule(id) ON DELETE SET NULL,
    optimization_id uuid,  -- Links to pricing_recommendation if auto-applied

    -- Metadata
    changed_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    effective_date timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now(),

    CONSTRAINT price_history_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT price_history_new_price_positive CHECK (new_price > 0),
    CONSTRAINT price_history_reason_not_empty CHECK (char_length(reason) > 0)
);

-- Indexes for price history queries
CREATE INDEX idx_price_history_product ON price_history(inventory_item_id, effective_date DESC);
CREATE INDEX idx_price_history_org ON price_history(org_id, effective_date DESC);
CREATE INDEX idx_price_history_date ON price_history(effective_date DESC);

-- =====================================================
-- PRICING OPTIMIZATION ENGINE
-- =====================================================

-- Optimization analysis runs
CREATE TABLE pricing_optimization (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

    -- Analysis metadata
    name text NOT NULL,
    description text,
    status optimization_status DEFAULT 'pending',

    -- Analysis parameters
    analysis_period_start timestamptz NOT NULL,
    analysis_period_end timestamptz NOT NULL,
    target_categories jsonb DEFAULT '[]'::jsonb,  -- Array of category IDs
    target_brands jsonb DEFAULT '[]'::jsonb,      -- Array of brand IDs
    target_suppliers jsonb DEFAULT '[]'::jsonb,   -- Array of supplier IDs

    -- Analysis results summary
    products_analyzed integer DEFAULT 0,
    recommendations_generated integer DEFAULT 0,
    potential_revenue_impact numeric(15,2) DEFAULT 0,
    potential_margin_impact numeric(15,2) DEFAULT 0,

    -- Detailed analysis data (JSON)
    analysis_data jsonb DEFAULT '{}'::jsonb,  -- Stores metrics, charts, trends
    optimization_config jsonb DEFAULT '{}'::jsonb,  -- Algorithm parameters

    -- Execution tracking
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    started_at timestamptz,
    completed_at timestamptz,
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT pricing_optimization_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT pricing_optimization_period_valid CHECK (analysis_period_end > analysis_period_start),
    CONSTRAINT pricing_optimization_counts_non_negative CHECK (
        products_analyzed >= 0 AND
        recommendations_generated >= 0
    ),
    CONSTRAINT pricing_optimization_completed_after_started CHECK (
        completed_at IS NULL OR
        started_at IS NULL OR
        completed_at >= started_at
    )
);

-- Indexes for optimization queries
CREATE INDEX idx_pricing_optimization_org_status ON pricing_optimization(org_id, status, created_at DESC);
CREATE INDEX idx_pricing_optimization_dates ON pricing_optimization(analysis_period_start, analysis_period_end);

-- =====================================================
-- AI-POWERED PRICING RECOMMENDATIONS
-- =====================================================

-- Pricing recommendations with ML-driven insights
CREATE TABLE pricing_recommendation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    optimization_id uuid NOT NULL REFERENCES pricing_optimization(id) ON DELETE CASCADE,

    -- Product and pricing
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    current_price numeric(12,2) NOT NULL,
    recommended_price numeric(12,2) NOT NULL,

    -- Recommendation details
    type recommendation_type NOT NULL,
    confidence_score numeric(5,2) NOT NULL,  -- 0-100 confidence level
    reasoning text NOT NULL,  -- AI-generated explanation

    -- Supporting data
    data_points jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Sales velocity, competitor prices, demand elasticity, seasonality

    -- Impact projections
    estimated_revenue_impact numeric(12,2),  -- Expected revenue change
    estimated_margin_impact numeric(12,2),   -- Expected margin change
    estimated_volume_impact numeric(8,2),    -- Expected sales volume change (%)
    risk_level text DEFAULT 'medium',  -- low, medium, high

    -- Workflow status
    status text DEFAULT 'pending',  -- pending, approved, rejected, applied
    reviewed_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    review_notes text,
    applied_at timestamptz,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT pricing_recommendation_current_price_positive CHECK (current_price > 0),
    CONSTRAINT pricing_recommendation_recommended_price_positive CHECK (recommended_price > 0),
    CONSTRAINT pricing_recommendation_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 100),
    CONSTRAINT pricing_recommendation_reasoning_not_empty CHECK (char_length(reasoning) > 0),
    CONSTRAINT pricing_recommendation_risk_level_valid CHECK (risk_level IN ('low', 'medium', 'high')),
    CONSTRAINT pricing_recommendation_status_valid CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'expired')),
    CONSTRAINT pricing_recommendation_reviewed_data_valid CHECK (
        (reviewed_at IS NULL AND reviewed_by IS NULL) OR
        (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    )
);

-- Indexes for recommendation queries
CREATE INDEX idx_pricing_recommendation_optimization ON pricing_recommendation(optimization_id);
CREATE INDEX idx_pricing_recommendation_product ON pricing_recommendation(inventory_item_id, status);
CREATE INDEX idx_pricing_recommendation_status ON pricing_recommendation(org_id, status, created_at DESC);
CREATE INDEX idx_pricing_recommendation_confidence ON pricing_recommendation(confidence_score DESC) WHERE status = 'pending';

-- =====================================================
-- COMPETITOR PRICE TRACKING
-- =====================================================

-- Competitor pricing intelligence
CREATE TABLE competitor_pricing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,

    -- Competitor details
    competitor_name text NOT NULL,
    competitor_sku text,
    competitor_price numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'ZAR',

    -- Source tracking
    source_url text,
    source_type text DEFAULT 'manual',  -- manual, scraper, api, feed
    scraping_config jsonb DEFAULT '{}'::jsonb,

    -- Data freshness
    scraped_at timestamptz DEFAULT now(),
    verified_at timestamptz,
    verified_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,

    -- Availability and stock
    in_stock boolean DEFAULT true,
    stock_level text,  -- low, medium, high, out_of_stock

    -- Additional metadata
    metadata jsonb DEFAULT '{}'::jsonb,  -- shipping cost, ratings, reviews, etc.

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT competitor_pricing_name_not_empty CHECK (char_length(competitor_name) > 0),
    CONSTRAINT competitor_pricing_price_positive CHECK (competitor_price > 0),
    CONSTRAINT competitor_pricing_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT competitor_pricing_source_url_format CHECK (
        source_url IS NULL OR
        source_url ~ '^https?://.*'
    ),
    CONSTRAINT competitor_pricing_stock_level_valid CHECK (
        stock_level IS NULL OR
        stock_level IN ('low', 'medium', 'high', 'out_of_stock')
    )
);

-- Indexes for competitor pricing
CREATE INDEX idx_competitor_pricing_product ON competitor_pricing(inventory_item_id, is_active) WHERE is_active = true;
CREATE INDEX idx_competitor_pricing_competitor ON competitor_pricing(org_id, competitor_name);
CREATE INDEX idx_competitor_pricing_freshness ON competitor_pricing(scraped_at DESC) WHERE is_active = true;

-- =====================================================
-- PRICE ELASTICITY ANALYSIS
-- =====================================================

-- Price elasticity coefficients for demand forecasting
CREATE TABLE price_elasticity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,

    -- Price point data
    price_point numeric(12,2) NOT NULL,
    quantity_sold integer NOT NULL,
    revenue_generated numeric(12,2) NOT NULL,

    -- Analysis period
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,

    -- Elasticity calculations
    elasticity_coefficient numeric(8,4),  -- % change in quantity / % change in price
    confidence_level numeric(5,2),  -- Statistical confidence (0-100)
    sample_size integer,  -- Number of transactions in sample

    -- Contextual factors
    seasonal_factor numeric(5,2) DEFAULT 1.00,  -- Seasonality adjustment
    promotional_active boolean DEFAULT false,
    competitor_price_avg numeric(12,2),

    -- Metadata
    calculation_method text DEFAULT 'linear_regression',  -- method used to calculate elasticity
    statistical_metrics jsonb DEFAULT '{}'::jsonb,  -- R², p-value, etc.

    calculated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),

    CONSTRAINT price_elasticity_price_positive CHECK (price_point > 0),
    CONSTRAINT price_elasticity_quantity_positive CHECK (quantity_sold >= 0),
    CONSTRAINT price_elasticity_revenue_positive CHECK (revenue_generated >= 0),
    CONSTRAINT price_elasticity_date_range_valid CHECK (date_range_end >= date_range_start),
    CONSTRAINT price_elasticity_confidence_range CHECK (
        confidence_level IS NULL OR
        (confidence_level >= 0 AND confidence_level <= 100)
    ),
    CONSTRAINT price_elasticity_sample_size_positive CHECK (
        sample_size IS NULL OR
        sample_size > 0
    )
);

-- Indexes for elasticity queries
CREATE INDEX idx_price_elasticity_product ON price_elasticity(inventory_item_id, calculated_at DESC);
CREATE INDEX idx_price_elasticity_date_range ON price_elasticity(date_range_start, date_range_end);
CREATE INDEX idx_price_elasticity_confidence ON price_elasticity(confidence_level DESC) WHERE confidence_level IS NOT NULL;

-- =====================================================
-- TIERED PRICING TABLES
-- =====================================================

-- Customer-specific pricing tiers
CREATE TABLE customer_pricing_tier (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,

    tier price_tier NOT NULL DEFAULT 'standard',
    discount_percentage numeric(5,2) DEFAULT 0,  -- Overall discount
    minimum_order_value numeric(12,2),

    -- Tier qualifications
    qualification_criteria jsonb DEFAULT '{}'::jsonb,  -- Volume thresholds, relationship duration, etc.

    is_active boolean DEFAULT true,
    valid_from timestamptz DEFAULT now(),
    valid_until timestamptz,

    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT customer_pricing_tier_discount_range CHECK (discount_percentage >= 0 AND discount_percentage < 100),
    CONSTRAINT customer_pricing_tier_min_order_positive CHECK (
        minimum_order_value IS NULL OR
        minimum_order_value > 0
    ),
    CONSTRAINT customer_pricing_tier_dates_valid CHECK (
        valid_until IS NULL OR
        valid_until > valid_from
    )
);

-- Indexes for customer tier lookups
CREATE INDEX idx_customer_pricing_tier_customer ON customer_pricing_tier(customer_id, is_active) WHERE is_active = true;
CREATE INDEX idx_customer_pricing_tier_tier ON customer_pricing_tier(org_id, tier);

-- Volume-based pricing tiers
CREATE TABLE volume_pricing_tier (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,

    -- Tier definition
    tier_name text NOT NULL,
    min_quantity integer NOT NULL,
    max_quantity integer,  -- NULL = no upper limit

    -- Pricing
    unit_price numeric(12,2) NOT NULL,
    discount_percentage numeric(5,2),

    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT volume_pricing_tier_name_not_empty CHECK (char_length(tier_name) > 0),
    CONSTRAINT volume_pricing_tier_min_quantity_positive CHECK (min_quantity > 0),
    CONSTRAINT volume_pricing_tier_max_quantity_valid CHECK (
        max_quantity IS NULL OR
        max_quantity > min_quantity
    ),
    CONSTRAINT volume_pricing_tier_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT volume_pricing_tier_discount_range CHECK (
        discount_percentage IS NULL OR
        (discount_percentage >= 0 AND discount_percentage < 100)
    )
);

-- Indexes for volume tier lookups
CREATE INDEX idx_volume_pricing_tier_product ON volume_pricing_tier(inventory_item_id, is_active, min_quantity) WHERE is_active = true;

-- =====================================================
-- PRICING ANALYTICS VIEWS
-- =====================================================

-- Price performance summary view
CREATE OR REPLACE VIEW pricing_performance_summary AS
SELECT
    ii.id AS inventory_item_id,
    ii.org_id,
    ii.sku,
    ii.name,
    ii.category,

    -- Current pricing
    ii.unit_price AS current_price,
    ii.cost_price,
    (ii.unit_price - ii.cost_price) AS margin,
    CASE
        WHEN ii.cost_price > 0 THEN ((ii.unit_price - ii.cost_price) / ii.cost_price * 100)
        ELSE 0
    END AS margin_percentage,

    -- Price history stats (last 90 days)
    (SELECT COUNT(*) FROM price_history ph
     WHERE ph.inventory_item_id = ii.id
     AND ph.effective_date >= now() - interval '90 days') AS price_changes_90d,

    (SELECT new_price FROM price_history ph
     WHERE ph.inventory_item_id = ii.id
     ORDER BY effective_date DESC LIMIT 1) AS last_price_change,

    -- Competitor intelligence
    (SELECT AVG(competitor_price) FROM competitor_pricing cp
     WHERE cp.inventory_item_id = ii.id
     AND cp.is_active = true) AS avg_competitor_price,

    (SELECT MIN(competitor_price) FROM competitor_pricing cp
     WHERE cp.inventory_item_id = ii.id
     AND cp.is_active = true) AS min_competitor_price,

    -- Recommendations
    (SELECT COUNT(*) FROM pricing_recommendation pr
     WHERE pr.inventory_item_id = ii.id
     AND pr.status = 'pending') AS pending_recommendations,

    -- Elasticity
    (SELECT elasticity_coefficient FROM price_elasticity pe
     WHERE pe.inventory_item_id = ii.id
     ORDER BY calculated_at DESC LIMIT 1) AS latest_elasticity

FROM inventory_item ii
WHERE ii.is_active = true;

-- =====================================================
-- DATABASE FUNCTIONS FOR PRICING ENGINE
-- =====================================================

-- Function to calculate optimal price based on strategy
CREATE OR REPLACE FUNCTION calculate_optimal_price(
    p_inventory_item_id uuid,
    p_strategy pricing_strategy DEFAULT 'cost_plus',
    p_constraints jsonb DEFAULT '{}'::jsonb
)
RETURNS numeric AS $$
DECLARE
    v_cost_price numeric;
    v_markup numeric;
    v_calculated_price numeric;
    v_min_price numeric;
    v_max_price numeric;
    v_competitor_avg numeric;
    v_elasticity numeric;
BEGIN
    -- Get base cost
    SELECT cost_price INTO v_cost_price
    FROM inventory_item
    WHERE id = p_inventory_item_id;

    IF v_cost_price IS NULL OR v_cost_price <= 0 THEN
        RAISE EXCEPTION 'Invalid cost price for product';
    END IF;

    -- Get applicable pricing rule
    SELECT markup_percentage, min_price, max_price
    INTO v_markup, v_min_price, v_max_price
    FROM pricing_rule
    WHERE inventory_item_id = p_inventory_item_id
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    ORDER BY priority DESC
    LIMIT 1;

    -- Apply strategy
    CASE p_strategy
        WHEN 'cost_plus' THEN
            v_markup := COALESCE(v_markup, 30.00);  -- Default 30% markup
            v_calculated_price := v_cost_price * (1 + v_markup / 100);

        WHEN 'market_based' THEN
            -- Use competitor average with adjustment
            SELECT AVG(competitor_price) INTO v_competitor_avg
            FROM competitor_pricing
            WHERE inventory_item_id = p_inventory_item_id
            AND is_active = true;

            v_calculated_price := COALESCE(v_competitor_avg * 0.98, v_cost_price * 1.3);

        WHEN 'competitive' THEN
            -- Match lowest competitor
            SELECT MIN(competitor_price) INTO v_calculated_price
            FROM competitor_pricing
            WHERE inventory_item_id = p_inventory_item_id
            AND is_active = true;

            v_calculated_price := COALESCE(v_calculated_price, v_cost_price * 1.2);

        WHEN 'dynamic' THEN
            -- Use elasticity-based pricing
            SELECT elasticity_coefficient INTO v_elasticity
            FROM price_elasticity
            WHERE inventory_item_id = p_inventory_item_id
            ORDER BY calculated_at DESC
            LIMIT 1;

            -- If elastic (> 1), lower price; if inelastic (< 1), can raise price
            IF v_elasticity IS NOT NULL AND v_elasticity > 0 THEN
                v_calculated_price := v_cost_price * (1 + (50 / v_elasticity) / 100);
            ELSE
                v_calculated_price := v_cost_price * 1.3;
            END IF;

        ELSE
            -- Default cost_plus
            v_calculated_price := v_cost_price * 1.3;
    END CASE;

    -- Apply constraints
    IF v_min_price IS NOT NULL AND v_calculated_price < v_min_price THEN
        v_calculated_price := v_min_price;
    END IF;

    IF v_max_price IS NOT NULL AND v_calculated_price > v_max_price THEN
        v_calculated_price := v_max_price;
    END IF;

    -- Apply JSON constraints if provided
    IF p_constraints ? 'min_margin_percentage' THEN
        DECLARE
            v_min_margin_pct numeric;
            v_min_price_for_margin numeric;
        BEGIN
            v_min_margin_pct := (p_constraints->>'min_margin_percentage')::numeric;
            v_min_price_for_margin := v_cost_price * (1 + v_min_margin_pct / 100);

            IF v_calculated_price < v_min_price_for_margin THEN
                v_calculated_price := v_min_price_for_margin;
            END IF;
        END;
    END IF;

    RETURN ROUND(v_calculated_price, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get price for customer with tier discounts
CREATE OR REPLACE FUNCTION get_price_for_customer(
    p_inventory_item_id uuid,
    p_customer_id uuid,
    p_quantity integer DEFAULT 1
)
RETURNS numeric AS $$
DECLARE
    v_base_price numeric;
    v_tier_discount numeric := 0;
    v_volume_price numeric;
    v_final_price numeric;
BEGIN
    -- Get base price
    SELECT unit_price INTO v_base_price
    FROM inventory_item
    WHERE id = p_inventory_item_id;

    IF v_base_price IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- Check customer tier discount
    SELECT discount_percentage INTO v_tier_discount
    FROM customer_pricing_tier
    WHERE customer_id = p_customer_id
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    ORDER BY discount_percentage DESC
    LIMIT 1;

    -- Check volume pricing
    SELECT unit_price INTO v_volume_price
    FROM volume_pricing_tier
    WHERE inventory_item_id = p_inventory_item_id
    AND is_active = true
    AND min_quantity <= p_quantity
    AND (max_quantity IS NULL OR max_quantity >= p_quantity)
    ORDER BY min_quantity DESC
    LIMIT 1;

    -- Use volume price if available, otherwise base price
    v_final_price := COALESCE(v_volume_price, v_base_price);

    -- Apply tier discount
    IF v_tier_discount > 0 THEN
        v_final_price := v_final_price * (1 - v_tier_discount / 100);
    END IF;

    RETURN ROUND(v_final_price, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to analyze price performance over a period
CREATE OR REPLACE FUNCTION analyze_price_performance(
    p_inventory_item_id uuid,
    p_period_days integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_avg_price numeric;
    v_price_changes integer;
    v_price_volatility numeric;
    v_competitor_position text;
    v_avg_competitor_price numeric;
    v_current_price numeric;
BEGIN
    -- Get current price
    SELECT unit_price INTO v_current_price
    FROM inventory_item
    WHERE id = p_inventory_item_id;

    -- Calculate average price over period
    SELECT AVG(new_price) INTO v_avg_price
    FROM price_history
    WHERE inventory_item_id = p_inventory_item_id
    AND effective_date >= now() - (p_period_days || ' days')::interval;

    -- Count price changes
    SELECT COUNT(*) INTO v_price_changes
    FROM price_history
    WHERE inventory_item_id = p_inventory_item_id
    AND effective_date >= now() - (p_period_days || ' days')::interval;

    -- Calculate price volatility (standard deviation)
    SELECT STDDEV(new_price) INTO v_price_volatility
    FROM price_history
    WHERE inventory_item_id = p_inventory_item_id
    AND effective_date >= now() - (p_period_days || ' days')::interval;

    -- Get competitor price comparison
    SELECT AVG(competitor_price) INTO v_avg_competitor_price
    FROM competitor_pricing
    WHERE inventory_item_id = p_inventory_item_id
    AND is_active = true;

    -- Determine competitive position
    IF v_avg_competitor_price IS NOT NULL THEN
        IF v_current_price < v_avg_competitor_price * 0.9 THEN
            v_competitor_position := 'below_market';
        ELSIF v_current_price > v_avg_competitor_price * 1.1 THEN
            v_competitor_position := 'above_market';
        ELSE
            v_competitor_position := 'at_market';
        END IF;
    ELSE
        v_competitor_position := 'no_data';
    END IF;

    -- Build result JSON
    v_result := jsonb_build_object(
        'current_price', v_current_price,
        'avg_price', COALESCE(v_avg_price, v_current_price),
        'price_changes', v_price_changes,
        'price_volatility', COALESCE(v_price_volatility, 0),
        'competitor_avg_price', v_avg_competitor_price,
        'competitor_position', v_competitor_position,
        'period_days', p_period_days,
        'analysis_timestamp', now()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate pricing recommendations (batch)
CREATE OR REPLACE FUNCTION generate_pricing_recommendations(
    p_org_id uuid,
    p_optimization_id uuid,
    p_params jsonb DEFAULT '{}'::jsonb
)
RETURNS integer AS $$
DECLARE
    v_product record;
    v_recommendations_count integer := 0;
    v_current_price numeric;
    v_optimal_price numeric;
    v_price_diff_pct numeric;
    v_confidence numeric;
    v_reasoning text;
    v_recommendation_type recommendation_type;
    v_elasticity numeric;
    v_competitor_avg numeric;
BEGIN
    -- Loop through products in scope
    FOR v_product IN
        SELECT ii.id, ii.unit_price, ii.cost_price, ii.name, ii.sku
        FROM inventory_item ii
        WHERE ii.org_id = p_org_id
        AND ii.is_active = true
        AND ii.unit_price > 0
        AND ii.cost_price > 0
    LOOP
        v_current_price := v_product.unit_price;

        -- Calculate optimal price using cost_plus strategy
        v_optimal_price := calculate_optimal_price(v_product.id, 'dynamic');

        -- Calculate price difference percentage
        v_price_diff_pct := ((v_optimal_price - v_current_price) / v_current_price) * 100;

        -- Skip if change is minimal (< 2%)
        CONTINUE WHEN ABS(v_price_diff_pct) < 2;

        -- Get elasticity for confidence calculation
        SELECT elasticity_coefficient INTO v_elasticity
        FROM price_elasticity
        WHERE inventory_item_id = v_product.id
        ORDER BY calculated_at DESC
        LIMIT 1;

        -- Get competitor data
        SELECT AVG(competitor_price) INTO v_competitor_avg
        FROM competitor_pricing
        WHERE inventory_item_id = v_product.id
        AND is_active = true;

        -- Determine recommendation type
        IF v_price_diff_pct > 5 THEN
            v_recommendation_type := 'price_increase';
            v_reasoning := format('Current price (%.2f) is %.1f%% below optimal. Market conditions and cost structure support a price increase.',
                                  v_current_price, ABS(v_price_diff_pct));
        ELSIF v_price_diff_pct < -5 THEN
            v_recommendation_type := 'price_decrease';
            v_reasoning := format('Current price (%.2f) is %.1f%% above optimal. Price reduction could increase sales volume and overall revenue.',
                                  v_current_price, ABS(v_price_diff_pct));
        ELSE
            CONTINUE;  -- No significant change needed
        END IF;

        -- Calculate confidence score (0-100)
        v_confidence := 60;  -- Base confidence

        IF v_elasticity IS NOT NULL THEN
            v_confidence := v_confidence + 15;  -- Have elasticity data
        END IF;

        IF v_competitor_avg IS NOT NULL THEN
            v_confidence := v_confidence + 15;  -- Have competitor data
        END IF;

        IF EXISTS (SELECT 1 FROM price_history WHERE inventory_item_id = v_product.id) THEN
            v_confidence := v_confidence + 10;  -- Have price history
        END IF;

        -- Insert recommendation
        INSERT INTO pricing_recommendation (
            org_id,
            optimization_id,
            inventory_item_id,
            current_price,
            recommended_price,
            type,
            confidence_score,
            reasoning,
            data_points,
            estimated_revenue_impact,
            estimated_margin_impact,
            risk_level
        ) VALUES (
            p_org_id,
            p_optimization_id,
            v_product.id,
            v_current_price,
            v_optimal_price,
            v_recommendation_type,
            LEAST(v_confidence, 100),
            v_reasoning,
            jsonb_build_object(
                'price_diff_percentage', ROUND(v_price_diff_pct, 2),
                'elasticity_coefficient', v_elasticity,
                'competitor_avg_price', v_competitor_avg,
                'cost_price', v_product.cost_price,
                'current_margin', ROUND(((v_current_price - v_product.cost_price) / v_current_price * 100), 2),
                'projected_margin', ROUND(((v_optimal_price - v_product.cost_price) / v_optimal_price * 100), 2)
            ),
            NULL,  -- Revenue impact to be calculated
            (v_optimal_price - v_current_price),  -- Margin impact per unit
            CASE
                WHEN ABS(v_price_diff_pct) > 15 THEN 'high'
                WHEN ABS(v_price_diff_pct) > 8 THEN 'medium'
                ELSE 'low'
            END
        );

        v_recommendations_count := v_recommendations_count + 1;
    END LOOP;

    -- Update optimization summary
    UPDATE pricing_optimization
    SET
        recommendations_generated = v_recommendations_count,
        products_analyzed = (SELECT COUNT(*) FROM inventory_item WHERE org_id = p_org_id AND is_active = true),
        status = 'completed',
        completed_at = now()
    WHERE id = p_optimization_id;

    RETURN v_recommendations_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR PRICING SYSTEM
-- =====================================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_pricing_rule_updated_at
    BEFORE UPDATE ON pricing_rule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_optimization_updated_at
    BEFORE UPDATE ON pricing_optimization
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_recommendation_updated_at
    BEFORE UPDATE ON pricing_recommendation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitor_pricing_updated_at
    BEFORE UPDATE ON competitor_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_pricing_tier_updated_at
    BEFORE UPDATE ON customer_pricing_tier
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volume_pricing_tier_updated_at
    BEFORE UPDATE ON volume_pricing_tier
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create price history on inventory_item price changes
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.unit_price IS DISTINCT FROM NEW.unit_price AND NEW.unit_price IS NOT NULL THEN
        INSERT INTO price_history (
            org_id,
            inventory_item_id,
            old_price,
            new_price,
            currency,
            reason,
            changed_by
        ) VALUES (
            NEW.org_id,
            NEW.id,
            OLD.unit_price,
            NEW.unit_price,
            'ZAR',
            'Manual price update',
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_inventory_item_price_changes
    AFTER UPDATE ON inventory_item
    FOR EACH ROW
    WHEN (OLD.unit_price IS DISTINCT FROM NEW.unit_price)
    EXECUTE FUNCTION track_price_changes();

-- Audit triggers
CREATE TRIGGER audit_pricing_rule
    AFTER INSERT OR UPDATE OR DELETE ON pricing_rule
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_pricing_optimization
    AFTER INSERT OR UPDATE OR DELETE ON pricing_optimization
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_pricing_recommendation
    AFTER INSERT OR UPDATE OR DELETE ON pricing_recommendation
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE pricing_rule IS 'Configurable pricing rules for automated price calculation across products, categories, brands, or suppliers';
COMMENT ON TABLE price_history IS 'Complete audit trail of all price changes with timestamps and reasons';
COMMENT ON TABLE pricing_optimization IS 'Optimization analysis runs that generate AI-powered pricing recommendations';
COMMENT ON TABLE pricing_recommendation IS 'AI-generated pricing recommendations with confidence scores and impact projections';
COMMENT ON TABLE competitor_pricing IS 'Competitor price tracking for market intelligence and competitive positioning';
COMMENT ON TABLE price_elasticity IS 'Price elasticity coefficients calculated from historical sales data for demand forecasting';
COMMENT ON TABLE customer_pricing_tier IS 'Customer-specific pricing tiers and discount levels';
COMMENT ON TABLE volume_pricing_tier IS 'Volume-based pricing tiers for quantity discounts';

COMMENT ON FUNCTION calculate_optimal_price IS 'Calculates optimal price for a product based on strategy (cost_plus, market_based, competitive, dynamic) with constraint enforcement';
COMMENT ON FUNCTION get_price_for_customer IS 'Returns the final price for a customer considering tier discounts and volume pricing';
COMMENT ON FUNCTION analyze_price_performance IS 'Analyzes price performance over a period including volatility, competitor position, and trends';
COMMENT ON FUNCTION generate_pricing_recommendations IS 'Batch generates AI-powered pricing recommendations for all products in an organization';

INSERT INTO schema_migrations (migration_name)
VALUES ('0013_pricing_optimization')
ON CONFLICT (migration_name) DO NOTHING;

-- down

-- Drop triggers
DROP TRIGGER IF EXISTS audit_pricing_recommendation ON pricing_recommendation;
DROP TRIGGER IF EXISTS audit_pricing_optimization ON pricing_optimization;
DROP TRIGGER IF EXISTS audit_pricing_rule ON pricing_rule;
DROP TRIGGER IF EXISTS track_inventory_item_price_changes ON inventory_item;
DROP TRIGGER IF EXISTS update_volume_pricing_tier_updated_at ON volume_pricing_tier;
DROP TRIGGER IF EXISTS update_customer_pricing_tier_updated_at ON customer_pricing_tier;
DROP TRIGGER IF EXISTS update_competitor_pricing_updated_at ON competitor_pricing;
DROP TRIGGER IF EXISTS update_pricing_recommendation_updated_at ON pricing_recommendation;
DROP TRIGGER IF EXISTS update_pricing_optimization_updated_at ON pricing_optimization;
DROP TRIGGER IF EXISTS update_pricing_rule_updated_at ON pricing_rule;

-- Drop functions
DROP FUNCTION IF EXISTS track_price_changes() CASCADE;
DROP FUNCTION IF EXISTS generate_pricing_recommendations(uuid, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS analyze_price_performance(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS get_price_for_customer(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS calculate_optimal_price(uuid, pricing_strategy, jsonb) CASCADE;

-- Drop views
DROP VIEW IF EXISTS pricing_performance_summary;

-- Drop tables
DROP TABLE IF EXISTS volume_pricing_tier;
DROP TABLE IF EXISTS customer_pricing_tier;
DROP TABLE IF EXISTS price_elasticity;
DROP TABLE IF EXISTS competitor_pricing;
DROP TABLE IF EXISTS pricing_recommendation;
DROP TABLE IF EXISTS pricing_optimization;
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS pricing_rule;

-- Drop enums
DROP TYPE IF EXISTS recommendation_type;
DROP TYPE IF EXISTS optimization_status;
DROP TYPE IF EXISTS price_tier;
DROP TYPE IF EXISTS pricing_strategy;
