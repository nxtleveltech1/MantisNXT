-- Migration: 0225_add_discount_columns
-- Description: Add Base Discount and Cost After Discount support to supplier products
-- Adds discount_percentage to supplier_profiles and supports product-level discount overrides

BEGIN;

-- Update existing supplier_profiles to include discount_percentage in pricing guidelines
-- Set default to 0 if not already present
UPDATE public.supplier_profiles
SET guidelines = 
  CASE 
    WHEN guidelines->'pricing' IS NULL THEN
      guidelines || '{"pricing": {"discount_percentage": 0}}'::jsonb
    WHEN guidelines->'pricing'->>'discount_percentage' IS NULL THEN
      jsonb_set(guidelines, '{pricing,discount_percentage}', '0'::jsonb)
    ELSE
      guidelines
  END,
  updated_at = NOW()
WHERE guidelines->'pricing'->>'discount_percentage' IS NULL 
   OR guidelines->'pricing' IS NULL;

-- Ensure all new supplier profiles get discount_percentage by default
-- This is handled in application code, but we add a comment here for reference
-- The application should set discount_percentage: 0 when creating new profiles

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0225_add_discount_columns')
ON CONFLICT (migration_name) DO NOTHING;










