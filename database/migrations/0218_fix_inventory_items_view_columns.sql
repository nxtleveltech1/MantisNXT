-- 0218: Fix inventory_items view to include all required columns from SIP
-- Adds cost_price, sale_price, rsp, barcode, description, max_stock, tags
-- to support inventory queries and import functionality

DO $$
DECLARE
  relkind CHAR;
BEGIN
  SELECT c.relkind INTO relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'inventory_items';

  IF relkind = 'r' THEN
    -- Real table: add missing columns
    ALTER TABLE public.inventory_items
      ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,4),
      ADD COLUMN IF NOT EXISTS sale_price NUMERIC(15,4),
      ADD COLUMN IF NOT EXISTS rsp NUMERIC(15,4),
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS max_stock INTEGER,
      ADD COLUMN IF NOT EXISTS tags TEXT[];

    -- Backfill cost_price from unit_cost if available
    UPDATE public.inventory_items
    SET cost_price = (
      SELECT soh.unit_cost
      FROM core.stock_on_hand soh
      WHERE soh.soh_id::text = inventory_items.id
      LIMIT 1
    )
    WHERE cost_price IS NULL;
x110
  ELSE
    -- View: recreate with all required columns
    DROP VIEW IF EXISTS public.inventory_items;
    
    CREATE VIEW public.inventory_items AS
    SELECT
      soh.soh_id::text AS id,
      sp.supplier_sku AS sku,
      sp.name_from_supplier AS name,
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
      -- Cost and pricing columns
      soh.unit_cost AS cost_price,
      COALESCE(pr.price, ph.price, NULL)::numeric AS sale_price,
      COALESCE(pr.price, ph.price, NULL)::numeric AS rsp,
      -- Additional columns
      sp.barcode,
      NULL::text AS description,
      NULL::integer AS max_stock,
      NULL::text[] AS tags
    FROM core.stock_on_hand soh
    JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
    LEFT JOIN core.stock_location sl ON soh.location_id = sl.location_id
    -- Get latest price from pricelist (preferred source for RSP)
    LEFT JOIN LATERAL (
      SELECT r.price, r.brand, r.category_raw
      FROM spp.pricelist_row r
      JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
      WHERE r.supplier_sku = sp.supplier_sku 
        AND u.supplier_id = sp.supplier_id
      ORDER BY u.received_at DESC
      LIMIT 1
    ) pr ON TRUE
    -- Fallback to price_history if no pricelist data
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

