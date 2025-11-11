-- =====================================================
-- SOH PRICING WITH AI RECOMMENDATIONS
-- =====================================================
-- Migration: 0015_soh_pricing_with_ai.sql
-- Description: Add selling price to stock_on_hand with AI-powered pricing recommendations
-- Features:
--   - Selling price and margin tracking on SOH items
--   - AI recommendation review queue with auto-activation
--   - Pricing automation configuration per organization
--   - Complete audit trail for price decisions
--
-- Author: MantisNXT Pricing Team
-- Date: 2025-11-11
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: EXTEND AI SERVICE TYPES
-- =====================================================

-- Add 'pricing_recommendation' to ai_service_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pricing_recommendation'
    AND enumtypid = 'ai_service_type'::regtype
  ) THEN
    ALTER TYPE ai_service_type ADD VALUE 'pricing_recommendation';
  END IF;
END $$;

-- =====================================================
-- STEP 2: ADD SELLING PRICE TO STOCK_ON_HAND
-- =====================================================

-- Add selling_price and pricing metadata to stock_on_hand
ALTER TABLE core.stock_on_hand
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS calculated_margin DECIMAL(15,4)
  GENERATED ALWAYS AS (COALESCE(selling_price, 0) - COALESCE(unit_cost, 0)) STORED,
ADD COLUMN IF NOT EXISTS calculated_margin_pct DECIMAL(6,2)
  GENERATED ALWAYS AS (
    CASE WHEN unit_cost > 0
    THEN ((COALESCE(selling_price, 0) - unit_cost) / unit_cost * 100)
    ELSE 0 END
  ) STORED,
ADD COLUMN IF NOT EXISTS pricing_rule_id UUID REFERENCES pricing_rule(id),
ADD COLUMN IF NOT EXISTS pricing_recommendation_id UUID REFERENCES pricing_recommendation(id),
ADD COLUMN IF NOT EXISTS price_calculated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS price_calculation_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS price_source VARCHAR(50) DEFAULT 'rule_based';

-- Add check constraint for price_source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_price_source'
    AND conrelid = 'core.stock_on_hand'::regclass
  ) THEN
    ALTER TABLE core.stock_on_hand
    ADD CONSTRAINT check_price_source
    CHECK (price_source IN ('rule_based', 'ai_recommendation', 'manual', 'hybrid'));
  END IF;
END $$;

-- =====================================================
-- STEP 3: CREATE PRICING AUTOMATION CONFIG
-- =====================================================

-- Pricing automation configuration per organization
CREATE TABLE IF NOT EXISTS pricing_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Auto-activation settings
  enable_auto_activation BOOLEAN NOT NULL DEFAULT false,
  auto_activation_confidence_threshold DECIMAL(5,2) NOT NULL DEFAULT 85.00,

  -- AI Settings
  enable_ai_recommendations BOOLEAN NOT NULL DEFAULT true,
  ai_batch_size INTEGER NOT NULL DEFAULT 10,
  ai_max_retries INTEGER NOT NULL DEFAULT 2,

  -- Rule-based settings
  default_margin_percent DECIMAL(6,2) NOT NULL DEFAULT 30.00,
  min_margin_percent DECIMAL(6,2) NOT NULL DEFAULT 5.00,
  max_price_increase_percent DECIMAL(6,2) NOT NULL DEFAULT 50.00,

  -- Review queue settings
  require_manual_review_above_amount DECIMAL(15,4),
  require_manual_review_for_new_products BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_org_pricing_config UNIQUE(org_id),
  CONSTRAINT valid_confidence_threshold CHECK (
    auto_activation_confidence_threshold >= 0 AND
    auto_activation_confidence_threshold <= 100
  ),
  CONSTRAINT valid_margin_constraints CHECK (
    min_margin_percent >= 0 AND
    default_margin_percent >= min_margin_percent AND
    max_price_increase_percent > 0
  )
);

-- RLS for pricing_automation_config
ALTER TABLE pricing_automation_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pricing_automation_config'
      AND policyname = 'pricing_automation_config_tenant_isolation'
  ) THEN
    CREATE POLICY pricing_automation_config_tenant_isolation
    ON pricing_automation_config
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true)::uuid);
  END IF;
END $$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trg_pricing_automation_config_updated ON pricing_automation_config;
CREATE TRIGGER trg_pricing_automation_config_updated
BEFORE UPDATE ON pricing_automation_config
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- STEP 4: ENHANCE PRICING_RECOMMENDATION TABLE
-- =====================================================

-- Add review workflow columns to pricing_recommendation
ALTER TABLE pricing_recommendation
ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS auto_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- Add check constraint for review_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_review_status'
    AND conrelid = 'pricing_recommendation'::regclass
  ) THEN
    ALTER TABLE pricing_recommendation
    ADD CONSTRAINT check_review_status
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'auto_approved'));
  END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE PRICING RECOMMENDATION REVIEW QUEUE VIEW
-- =====================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS pricing_recommendation_queue;

-- Create comprehensive review queue view
CREATE OR REPLACE VIEW pricing_recommendation_queue AS
SELECT
  pr.id AS recommendation_id,
  pr.org_id,
  pr.inventory_item_id,
  soh.supplier_product_id,
  sp.supplier_sku,
  sp.name_from_supplier AS product_name,
  s.name AS supplier_name,

  -- Pricing details
  soh.unit_cost,
  soh.selling_price AS current_selling_price,
  pr.current_price AS rule_based_price,
  pr.recommended_price AS ai_recommended_price,
  (pr.recommended_price - pr.current_price) AS price_difference,
  (pr.recommended_price - soh.unit_cost) AS recommended_margin,
  pr.confidence_score,

  -- Impact analysis
  pr.impact_on_revenue,
  pr.impact_on_margin,
  pr.impact_on_volume,
  pr.reasoning,
  pr.risk_factors,

  -- Review status
  pr.review_status,
  pr.status AS recommendation_status,
  pr.auto_applied,
  pr.created_at AS recommendation_created_at,
  pr.reviewed_by,
  pr.reviewed_at,
  pr.review_notes,

  -- Priority scoring for queue ordering
  CASE
    WHEN pr.confidence_score >= 90 THEN 'high'
    WHEN pr.confidence_score >= 75 THEN 'medium'
    ELSE 'low'
  END AS priority,

  -- Auto-apply eligibility
  CASE
    WHEN pac.enable_auto_activation
         AND pr.confidence_score >= pac.auto_activation_confidence_threshold
    THEN true
    ELSE false
  END AS eligible_for_auto_apply

FROM pricing_recommendation pr
JOIN core.stock_on_hand soh ON pr.inventory_item_id = soh.supplier_product_id
JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
JOIN core.supplier s ON sp.supplier_id = s.supplier_id
LEFT JOIN pricing_automation_config pac ON pr.org_id = pac.org_id
WHERE pr.review_status = 'pending'
ORDER BY pr.confidence_score DESC, pr.created_at ASC;

-- =====================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes on stock_on_hand
CREATE INDEX IF NOT EXISTS idx_soh_selling_price
ON core.stock_on_hand(selling_price)
WHERE selling_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_soh_pricing_recommendation
ON core.stock_on_hand(pricing_recommendation_id)
WHERE pricing_recommendation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_soh_price_source
ON core.stock_on_hand(price_source);

CREATE INDEX IF NOT EXISTS idx_soh_price_calculated_at
ON core.stock_on_hand(price_calculated_at DESC)
WHERE price_calculated_at IS NOT NULL;

-- Indexes on pricing_recommendation
CREATE INDEX IF NOT EXISTS idx_pricing_rec_review_status
ON pricing_recommendation(review_status, confidence_score DESC)
WHERE review_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pricing_rec_org_status
ON pricing_recommendation(org_id, review_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_rec_auto_applied
ON pricing_recommendation(auto_applied, applied_at DESC)
WHERE auto_applied = true;

CREATE INDEX IF NOT EXISTS idx_pricing_rec_inventory_item
ON pricing_recommendation(inventory_item_id, created_at DESC);

-- Index on pricing_automation_config
CREATE INDEX IF NOT EXISTS idx_pricing_automation_config_org
ON pricing_automation_config(org_id);

-- =====================================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get pricing configuration for organization
CREATE OR REPLACE FUNCTION get_pricing_automation_config(p_org_id UUID)
RETURNS TABLE (
  enable_auto_activation BOOLEAN,
  auto_activation_confidence_threshold DECIMAL(5,2),
  enable_ai_recommendations BOOLEAN,
  default_margin_percent DECIMAL(6,2),
  min_margin_percent DECIMAL(6,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pac.enable_auto_activation,
    pac.auto_activation_confidence_threshold,
    pac.enable_ai_recommendations,
    pac.default_margin_percent,
    pac.min_margin_percent
  FROM pricing_automation_config pac
  WHERE pac.org_id = p_org_id;

  -- Return defaults if no config exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 85.00::DECIMAL(5,2), true, 30.00::DECIMAL(6,2), 5.00::DECIMAL(6,2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if price should be auto-applied
CREATE OR REPLACE FUNCTION should_auto_apply_price(
  p_org_id UUID,
  p_confidence_score DECIMAL(5,2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_config RECORD;
BEGIN
  SELECT * INTO v_config FROM get_pricing_automation_config(p_org_id);

  RETURN v_config.enable_auto_activation
         AND p_confidence_score >= v_config.auto_activation_confidence_threshold;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'stock_on_hand'
  AND column_name IN ('selling_price', 'calculated_margin', 'calculated_margin_pct', 'pricing_recommendation_id');

-- Verify pricing_automation_config table
SELECT COUNT(*) as config_table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'pricing_automation_config';

-- Verify review queue view
SELECT COUNT(*) as view_exists
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'pricing_recommendation_queue';

-- Verify AI service type
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'ai_service_type'::regtype
  AND enumlabel = 'pricing_recommendation';

-- Show migration completion
SELECT 'Migration 0015 completed successfully' AS status;
