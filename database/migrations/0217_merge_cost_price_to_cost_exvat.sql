-- Migration: Merge Cost Price into Cost ExVAT
-- This migration copies current_price from price_history to attrs_json.cost_excluding
-- for all supplier products where cost_excluding is missing or null

BEGIN;

-- Update attrs_json to include cost_excluding from current price_history
-- Only update where cost_excluding is missing or null
UPDATE core.supplier_product sp
SET attrs_json = 
  CASE 
    WHEN sp.attrs_json IS NULL THEN
      jsonb_build_object('cost_excluding', cp.price)
    WHEN sp.attrs_json->>'cost_excluding' IS NULL OR sp.attrs_json->>'cost_excluding' = '' THEN
      sp.attrs_json || jsonb_build_object('cost_excluding', cp.price)
    ELSE
      sp.attrs_json
  END,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (supplier_product_id)
    supplier_product_id,
    price
  FROM core.price_history
  WHERE is_current = true
  ORDER BY supplier_product_id, valid_from DESC
) cp
WHERE sp.supplier_product_id = cp.supplier_product_id
  AND cp.price IS NOT NULL
  AND cp.price > 0
  AND (sp.attrs_json->>'cost_excluding' IS NULL OR sp.attrs_json->>'cost_excluding' = '');

-- Log the number of records updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % supplier products with cost_excluding from price_history', updated_count;
END $$;

COMMIT;

