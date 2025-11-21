-- 0216: Add Recommended Selling Price (RSP) to inventory_items (view-safe)
-- Handles both table and compatibility-view variants used across environments.

DO $$
DECLARE
  relkind CHAR;
BEGIN
  SELECT c.relkind INTO relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'inventory_items';

  IF relkind = 'r' THEN
    -- Real table: add column and backfill
    ALTER TABLE public.inventory_items
      ADD COLUMN IF NOT EXISTS rsp NUMERIC(15,4);

    UPDATE public.inventory_items
    SET rsp = sale_price
    WHERE rsp IS NULL
      AND sale_price IS NOT NULL;
  ELSE
    -- View: recreate with rsp column passthrough
    PERFORM 1;
    DROP VIEW IF EXISTS public.inventory_items;
    CREATE VIEW public.inventory_items AS
    SELECT
      soh.soh_id::text AS id,
      sp.supplier_sku AS sku,
      sp.name_from_supplier AS name,
      'Unknown'::text AS category,
      NULL::text AS brand,
      soh.qty AS stock_qty,
      0 AS reserved_qty,
      0 AS reorder_point,
      CASE
        WHEN sp.is_active THEN 'active'::text
        ELSE 'inactive'::text
      END AS status,
      sl.name AS location,
      sp.supplier_id::text AS supplier_id,
      NULL::uuid AS product_id,
      soh.created_at,
      soh.as_of_ts AS updated_at,
      NULL::uuid AS location_id,
      NULL::numeric AS rsp
    FROM core.stock_on_hand soh
    JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
    LEFT JOIN core.stock_location sl ON soh.location_id = sl.location_id;
  END IF;
END $$;
