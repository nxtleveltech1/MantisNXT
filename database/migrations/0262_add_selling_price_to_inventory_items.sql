-- 0262_add_selling_price_to_inventory_items
-- Adds selling_price column to public.inventory_items (view or table).
-- selling_price = the price NXT sells at (customer-facing).
-- Source priority: core.stock_on_hand.selling_price > pricelist > price_history.

DO $$
DECLARE
  relkind CHAR;
BEGIN
  SELECT c.relkind INTO relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'inventory_items';

  IF relkind = 'r' THEN
    -- Real table: add column and backfill from SOH
    ALTER TABLE public.inventory_items
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,4);

    UPDATE public.inventory_items i
    SET selling_price = sub.sp
    FROM (
      SELECT
        soh.soh_id::text AS id,
        COALESCE(soh.selling_price, i2.sale_price, i2.rsp) AS sp
      FROM core.stock_on_hand soh
      JOIN public.inventory_items i2 ON soh.soh_id::text = i2.id
    ) sub
    WHERE i.id = sub.id
      AND i.selling_price IS NULL;

  ELSE
    -- View: recreate with selling_price column
    CREATE OR REPLACE VIEW public.inventory_items AS
    SELECT
      soh.soh_id::text AS id,
      sp.supplier_sku AS sku,
      COALESCE(NULLIF(BTRIM(sp.name_from_supplier), ''), sp.supplier_sku)::varchar(500) AS name,
      COALESCE(pr.category_raw, 'Unknown')::text AS category,
      COALESCE(pr.brand, NULL)::text AS brand,
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
      soh.location_id,
      soh.unit_cost AS cost_price,
      COALESCE(pr.price, ph.price, NULL)::numeric AS sale_price,
      COALESCE(pr.price, ph.price, NULL)::numeric AS rsp,
      COALESCE(soh.selling_price, pr.price, ph.price, NULL)::numeric AS selling_price,
      sp.barcode,
      COALESCE(
        NULLIF(BTRIM(sp.attrs_json->>'description'), ''),
        NULLIF(BTRIM(sp.name_from_supplier), '')
      )::text AS description,
      NULL::integer AS max_stock,
      NULL::text[] AS tags
    FROM core.stock_on_hand soh
    JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
    LEFT JOIN core.stock_location sl ON soh.location_id = sl.location_id
    LEFT JOIN LATERAL (
      SELECT r.price, r.brand, r.category_raw
      FROM spp.pricelist_row r
      JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
      WHERE r.supplier_sku = sp.supplier_sku
        AND u.supplier_id = sp.supplier_id
      ORDER BY u.received_at DESC
      LIMIT 1
    ) pr ON TRUE
    LEFT JOIN LATERAL (
      SELECT price
      FROM core.price_history
      WHERE supplier_product_id = sp.supplier_product_id
        AND is_current = true
      ORDER BY valid_from DESC
      LIMIT 1
    ) ph ON TRUE;
  END IF;
END $$;
