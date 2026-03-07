-- 0261_inventory_name_description_integrity
-- Fixes inventory name/description integrity without changing API response shape.
--
-- Includes:
-- 1) Targeted backfill: stock-take impacted products get attrs_json.description (fill blanks only)
-- 2) Targeted backfill: Rolling Thunder blank names fallback to supplier_sku
-- 3) Recreate/refresh public.inventory_items view with safe name + description fallbacks

-- 1) Fill missing attrs_json.description for products impacted by stock take.
WITH impacted AS (
  SELECT DISTINCT sm.supplier_product_id
  FROM core.stock_movement sm
  WHERE sm.reference_doc = 'STOCK_TAKE_2026-02-26'
)
UPDATE core.supplier_product sp
SET
  attrs_json = jsonb_set(
    COALESCE(sp.attrs_json, '{}'::jsonb),
    '{description}',
    to_jsonb(BTRIM(sp.name_from_supplier)),
    true
  ),
  updated_at = NOW()
FROM impacted i
WHERE sp.supplier_product_id = i.supplier_product_id
  AND COALESCE(NULLIF(BTRIM(sp.name_from_supplier), ''), '') <> ''
  AND COALESCE(NULLIF(BTRIM(sp.attrs_json->>'description'), ''), '') = '';

-- 2) Fix known screenshot issue source: Rolling Thunder blank names.
UPDATE core.supplier_product sp
SET
  name_from_supplier = BTRIM(sp.supplier_sku),
  attrs_json = CASE
    WHEN COALESCE(NULLIF(BTRIM(sp.attrs_json->>'description'), ''), '') = ''
      THEN jsonb_set(
        COALESCE(sp.attrs_json, '{}'::jsonb),
        '{description}',
        to_jsonb(BTRIM(sp.supplier_sku)),
        true
      )
    ELSE sp.attrs_json
  END,
  updated_at = NOW()
WHERE sp.supplier_id = '99123c0b-90ca-4112-a0e4-a8ae42de2aa9'::uuid
  AND COALESCE(NULLIF(BTRIM(sp.name_from_supplier), ''), '') = ''
  AND COALESCE(NULLIF(BTRIM(sp.supplier_sku), ''), '') <> '';

-- 3) Refresh public.inventory_items shape/logic.
DO $$
DECLARE
  relkind CHAR;
BEGIN
  SELECT c.relkind INTO relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'inventory_items';

  IF relkind = 'r' THEN
    -- Table compatibility branch
    ALTER TABLE public.inventory_items
      ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,4),
      ADD COLUMN IF NOT EXISTS sale_price NUMERIC(15,4),
      ADD COLUMN IF NOT EXISTS rsp NUMERIC(15,4),
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS max_stock INTEGER,
      ADD COLUMN IF NOT EXISTS tags TEXT[];

    UPDATE public.inventory_items i
    SET name = COALESCE(NULLIF(BTRIM(i.name), ''), NULLIF(BTRIM(i.sku), ''), i.name)
    WHERE COALESCE(NULLIF(BTRIM(i.name), ''), '') = '';

    UPDATE public.inventory_items i
    SET description = COALESCE(
      NULLIF(BTRIM(i.description), ''),
      NULLIF(BTRIM(i.name), ''),
      NULLIF(BTRIM(i.sku), ''),
      i.description
    )
    WHERE COALESCE(NULLIF(BTRIM(i.description), ''), '') = '';
  ELSE
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
