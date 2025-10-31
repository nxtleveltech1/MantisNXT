-- SSOT: Canonical views for suppliers and inventory
BEGIN;

CREATE OR REPLACE VIEW public.canon_suppliers AS
  SELECT
    s.supplier_id::text AS id,
    s.name,
    CASE WHEN s.active THEN 'active'::text ELSE 'inactive'::text END AS status,
    s.code,
    s.created_at,
    s.updated_at
  FROM core.supplier s;

CREATE OR REPLACE VIEW public.canon_inventory AS
  SELECT
    sp.supplier_sku AS sku,
    sp.supplier_id::text AS supplier_id,
    sp.product_id::text AS product_id,
    soh.location_id::text AS warehouse_id,
    soh.qty AS quantity_on_hand,
    0::integer AS quantity_reserved,
    (sp.is_active) AS backorderable,
    COALESCE(soh.as_of_ts, sp.updated_at, NOW()) AS updated_at
  FROM core.stock_on_hand soh
  JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id;

COMMIT;
