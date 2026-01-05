-- Migration: 0252_add_supplier_discount_rules.sql
-- Description: Add supplier discount rules table to support category/brand/SKU-level discounts
-- Date: 2025-01-XX

BEGIN;

-- ============================================================================
-- CREATE SUPPLIER DISCOUNT RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.supplier_discount_rules (
  discount_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
  rule_name VARCHAR(200) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('supplier', 'category', 'brand', 'sku')),
  
  -- Scope-specific fields (only one should be set based on scope_type)
  category_id UUID REFERENCES core.category(category_id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brand(id) ON DELETE CASCADE,
  supplier_sku VARCHAR(100),
  
  -- Rule configuration
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints to ensure only one scope field is set
  CONSTRAINT chk_scope_fields CHECK (
    (scope_type = 'supplier' AND category_id IS NULL AND brand_id IS NULL AND supplier_sku IS NULL) OR
    (scope_type = 'category' AND category_id IS NOT NULL AND brand_id IS NULL AND supplier_sku IS NULL) OR
    (scope_type = 'brand' AND category_id IS NULL AND brand_id IS NOT NULL AND supplier_sku IS NULL) OR
    (scope_type = 'sku' AND category_id IS NULL AND brand_id IS NULL AND supplier_sku IS NOT NULL)
  ),
  
  -- Note: Unique constraints are enforced via partial unique indexes below
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for supplier lookups
CREATE INDEX IF NOT EXISTS idx_supplier_discount_rules_supplier 
  ON core.supplier_discount_rules(supplier_id, is_active, priority DESC);

-- Index for category queries
CREATE INDEX IF NOT EXISTS idx_supplier_discount_rules_category 
  ON core.supplier_discount_rules(supplier_id, scope_type, category_id) 
  WHERE scope_type = 'category' AND category_id IS NOT NULL;

-- Index for brand queries
CREATE INDEX IF NOT EXISTS idx_supplier_discount_rules_brand 
  ON core.supplier_discount_rules(supplier_id, scope_type, brand_id) 
  WHERE scope_type = 'brand' AND brand_id IS NOT NULL;

-- Index for SKU queries
CREATE INDEX IF NOT EXISTS idx_supplier_discount_rules_sku 
  ON core.supplier_discount_rules(supplier_id, scope_type, supplier_sku) 
  WHERE scope_type = 'sku' AND supplier_sku IS NOT NULL;

-- Index for active rules with validity dates
CREATE INDEX IF NOT EXISTS idx_supplier_discount_rules_active_valid 
  ON core.supplier_discount_rules(supplier_id, is_active, valid_from, valid_until) 
  WHERE is_active = true;

-- Partial unique indexes to prevent duplicate rules
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_category_rule 
  ON core.supplier_discount_rules(supplier_id, category_id) 
  WHERE scope_type = 'category' AND category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_brand_rule 
  ON core.supplier_discount_rules(supplier_id, brand_id) 
  WHERE scope_type = 'brand' AND brand_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_sku_rule 
  ON core.supplier_discount_rules(supplier_id, supplier_sku) 
  WHERE scope_type = 'sku' AND supplier_sku IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_supplier_rule 
  ON core.supplier_discount_rules(supplier_id) 
  WHERE scope_type = 'supplier';

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION core.update_supplier_discount_rules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_supplier_discount_rules_updated_at ON core.supplier_discount_rules;
CREATE TRIGGER trigger_supplier_discount_rules_updated_at
  BEFORE UPDATE ON core.supplier_discount_rules
  FOR EACH ROW
  EXECUTE FUNCTION core.update_supplier_discount_rules_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE core.supplier_discount_rules IS 'Discount rules for suppliers at different scope levels (supplier, category, brand, SKU)';
COMMENT ON COLUMN core.supplier_discount_rules.discount_rule_id IS 'Primary key for discount rule';
COMMENT ON COLUMN core.supplier_discount_rules.supplier_id IS 'Supplier this rule applies to';
COMMENT ON COLUMN core.supplier_discount_rules.rule_name IS 'Human-readable name for the discount rule';
COMMENT ON COLUMN core.supplier_discount_rules.discount_percent IS 'Discount percentage (0-100)';
COMMENT ON COLUMN core.supplier_discount_rules.scope_type IS 'Scope of the rule: supplier, category, brand, or sku';
COMMENT ON COLUMN core.supplier_discount_rules.category_id IS 'Category ID when scope_type is category';
COMMENT ON COLUMN core.supplier_discount_rules.brand_id IS 'Brand ID when scope_type is brand';
COMMENT ON COLUMN core.supplier_discount_rules.supplier_sku IS 'Supplier SKU when scope_type is sku';
COMMENT ON COLUMN core.supplier_discount_rules.priority IS 'Priority for rule matching (higher = applied first)';
COMMENT ON COLUMN core.supplier_discount_rules.is_active IS 'Whether the rule is currently active';
COMMENT ON COLUMN core.supplier_discount_rules.valid_from IS 'Rule validity start date';
COMMENT ON COLUMN core.supplier_discount_rules.valid_until IS 'Rule validity end date (NULL for indefinite)';

-- ============================================================================
-- MIGRATE EXISTING BASE DISCOUNTS
-- ============================================================================

-- Create supplier-level discount rules from existing base_discount_percent values
INSERT INTO core.supplier_discount_rules (
  supplier_id,
  rule_name,
  discount_percent,
  scope_type,
  priority,
  is_active,
  created_at,
  updated_at
)
SELECT 
  supplier_id,
  'Base Discount (Migrated)',
  base_discount_percent,
  'supplier',
  0, -- Lowest priority as fallback
  true,
  created_at,
  updated_at
FROM core.supplier
WHERE base_discount_percent > 0
  AND NOT EXISTS (
    SELECT 1 FROM core.supplier_discount_rules sdr
    WHERE sdr.supplier_id = core.supplier.supplier_id
      AND sdr.scope_type = 'supplier'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON core.supplier_discount_rules TO authenticated;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'core' AND table_name = 'supplier_discount_rules'
  ) THEN
    RAISE EXCEPTION 'Migration failed: supplier_discount_rules table not created';
  END IF;
  
  RAISE NOTICE 'Migration 0252_add_supplier_discount_rules completed successfully';
END $$;

COMMIT;

