-- =====================================================
-- PRICING AUTOMATION CONFIGURATION TABLE
-- =====================================================
-- Migration: 0016_pricing_automation_config.sql
-- Description: Creates pricing_automation_config table for organization-level
--              pricing automation settings
-- Dependencies: Requires organization table in public schema
-- Date: 2025-11-24

-- Create pricing_automation_config table
CREATE TABLE IF NOT EXISTS pricing_automation_config (
    org_id uuid PRIMARY KEY REFERENCES public.organization(id) ON DELETE CASCADE,
    
    -- Auto-activation settings
    enable_auto_activation boolean NOT NULL DEFAULT false,
    auto_activation_confidence_threshold numeric(5,2) NOT NULL DEFAULT 85.0,
    
    -- AI recommendations
    enable_ai_recommendations boolean NOT NULL DEFAULT true,
    
    -- Margin settings
    default_margin_percent numeric(5,2) NOT NULL DEFAULT 30.0,
    min_margin_percent numeric(5,2) NOT NULL DEFAULT 5.0,
    max_price_increase_percent numeric(5,2) NOT NULL DEFAULT 50.0,
    
    -- Review settings
    require_review_for_high_impact boolean NOT NULL DEFAULT true,
    high_impact_threshold_percent numeric(5,2) NOT NULL DEFAULT 20.0,
    
    -- Batch processing
    enable_batch_processing boolean NOT NULL DEFAULT true,
    batch_size integer NOT NULL DEFAULT 100,
    
    -- Metadata
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT pricing_automation_config_confidence_range 
        CHECK (auto_activation_confidence_threshold >= 0 AND auto_activation_confidence_threshold <= 100),
    CONSTRAINT pricing_automation_config_high_impact_range 
        CHECK (high_impact_threshold_percent >= 0 AND high_impact_threshold_percent <= 100),
    CONSTRAINT pricing_automation_config_margins_positive 
        CHECK (default_margin_percent >= 0 AND min_margin_percent >= 0 AND max_price_increase_percent >= 0),
    CONSTRAINT pricing_automation_config_batch_size_positive 
        CHECK (batch_size > 0)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pricing_automation_config_org 
    ON pricing_automation_config(org_id);

-- Create function to get pricing automation config (for backward compatibility)
CREATE OR REPLACE FUNCTION get_pricing_automation_config(p_org_id uuid)
RETURNS TABLE (
    enable_auto_activation boolean,
    auto_activation_confidence_threshold numeric,
    enable_ai_recommendations boolean,
    default_margin_percent numeric,
    min_margin_percent numeric,
    max_price_increase_percent numeric,
    require_review_for_high_impact boolean,
    high_impact_threshold_percent numeric,
    enable_batch_processing boolean,
    batch_size integer
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pac.enable_auto_activation,
        pac.auto_activation_confidence_threshold,
        pac.enable_ai_recommendations,
        pac.default_margin_percent,
        pac.min_margin_percent,
        pac.max_price_increase_percent,
        pac.require_review_for_high_impact,
        pac.high_impact_threshold_percent,
        pac.enable_batch_processing,
        pac.batch_size
    FROM pricing_automation_config pac
    WHERE pac.org_id = p_org_id;
    
    -- Return defaults if no config found
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false::boolean,
            85.0::numeric,
            true::boolean,
            30.0::numeric,
            5.0::numeric,
            50.0::numeric,
            true::boolean,
            20.0::numeric,
            true::boolean,
            100::integer;
    END IF;
END;
$$;

-- Add comment to table
COMMENT ON TABLE pricing_automation_config IS 
    'Organization-level configuration for pricing automation, AI recommendations, and auto-activation settings';

-- Add comments to columns
COMMENT ON COLUMN pricing_automation_config.enable_auto_activation IS 
    'Enable automatic application of AI recommendations above confidence threshold';
COMMENT ON COLUMN pricing_automation_config.auto_activation_confidence_threshold IS 
    'Minimum confidence score (0-100) required for auto-activation';
COMMENT ON COLUMN pricing_automation_config.enable_ai_recommendations IS 
    'Enable AI-powered pricing recommendations';
COMMENT ON COLUMN pricing_automation_config.default_margin_percent IS 
    'Default target margin percentage for pricing calculations';
COMMENT ON COLUMN pricing_automation_config.min_margin_percent IS 
    'Minimum allowed margin percentage';
COMMENT ON COLUMN pricing_automation_config.max_price_increase_percent IS 
    'Maximum allowed price increase percentage';
COMMENT ON COLUMN pricing_automation_config.require_review_for_high_impact IS 
    'Require manual review for recommendations with high impact';
COMMENT ON COLUMN pricing_automation_config.high_impact_threshold_percent IS 
    'Impact percentage threshold (0-100) that triggers review requirement';
COMMENT ON COLUMN pricing_automation_config.enable_batch_processing IS 
    'Enable batch processing for optimization runs';
COMMENT ON COLUMN pricing_automation_config.batch_size IS 
    'Number of products to process per batch';

