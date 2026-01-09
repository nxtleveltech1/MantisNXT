-- =====================================================
-- ALLOW GLOBAL PRICING RULES
-- =====================================================
-- Migration: 0256_allow_global_pricing_rules.sql
-- Description: Relaxes pricing_rule constraints to allow global rules
--              that apply to all products (no specific scope required)
-- Author: Aster
-- Date: 2026-01-07
-- up

-- Drop the existing constraint that requires at least one scope
ALTER TABLE pricing_rule
DROP CONSTRAINT IF EXISTS pricing_rule_has_scope;

-- Add an optional is_global flag to make intent explicit
ALTER TABLE pricing_rule
ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- Update existing rules: if all scopes are NULL, mark as global
UPDATE pricing_rule
SET is_global = true
WHERE inventory_item_id IS NULL
  AND category_id IS NULL
  AND brand_id IS NULL
  AND supplier_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN pricing_rule.is_global IS 'When true, this rule applies to all products regardless of category, brand, supplier, or product filters';

-- Create index for global rules lookup
CREATE INDEX IF NOT EXISTS idx_pricing_rule_global ON pricing_rule(org_id, is_global, is_active, priority DESC) WHERE is_global = true AND is_active = true;

INSERT INTO schema_migrations (migration_name)
VALUES ('0256_allow_global_pricing_rules')
ON CONFLICT (migration_name) DO NOTHING;

-- down

-- Remove the global index
DROP INDEX IF EXISTS idx_pricing_rule_global;

-- Remove the is_global column
ALTER TABLE pricing_rule DROP COLUMN IF EXISTS is_global;

-- Restore the original constraint (optional - may cause issues if global rules exist)
-- ALTER TABLE pricing_rule
-- ADD CONSTRAINT pricing_rule_has_scope CHECK (
--     inventory_item_id IS NOT NULL OR
--     category_id IS NOT NULL OR
--     brand_id IS NOT NULL OR
--     supplier_id IS NOT NULL
-- );




