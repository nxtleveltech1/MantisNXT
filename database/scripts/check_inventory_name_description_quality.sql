-- Inventory data quality gate for CI/staging.
-- Fails if:
-- 1) Any inventory item has blank name.
-- 2) Any product impacted by stock-take movement has blank inventory description.

DO $$
DECLARE
  v_blank_name_count INTEGER;
  v_blank_stocktake_desc_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_blank_name_count
  FROM public.inventory_items iv
  WHERE COALESCE(NULLIF(BTRIM(iv.name), ''), '') = '';

  WITH impacted AS (
    SELECT DISTINCT sm.supplier_product_id
    FROM core.stock_movement sm
    WHERE sm.reference_doc = 'STOCK_TAKE_2026-02-26'
  )
  SELECT COUNT(*)
  INTO v_blank_stocktake_desc_count
  FROM impacted i
  JOIN core.supplier_product sp
    ON sp.supplier_product_id = i.supplier_product_id
  JOIN public.inventory_items iv
    ON iv.sku = sp.supplier_sku
   AND iv.supplier_id::text = sp.supplier_id::text
  WHERE COALESCE(NULLIF(BTRIM(iv.description), ''), '') = '';

  IF v_blank_name_count > 0 THEN
    RAISE EXCEPTION 'Inventory quality check failed: % rows have blank inventory_items.name', v_blank_name_count;
  END IF;

  IF v_blank_stocktake_desc_count > 0 THEN
    RAISE EXCEPTION 'Inventory quality check failed: % stock-take impacted rows have blank inventory_items.description', v_blank_stocktake_desc_count;
  END IF;

  RAISE NOTICE 'Inventory quality checks passed. blank_name_count=0, blank_stocktake_desc_count=0';
END $$;
