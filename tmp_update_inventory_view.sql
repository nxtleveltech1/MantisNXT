DROP VIEW IF EXISTS public.inventory_items;

CREATE VIEW public.inventory_items AS
SELECT
  soh.soh_id::text AS id,
  sp.supplier_sku AS sku,
  COALESCE(sp.name_from_supplier, sp.supplier_sku) AS name,
  COALESCE(sp.attrs_json->>'category', 'Unknown') AS category,
  COALESCE(sp.attrs_json->>'brand', NULL) AS brand,
  soh.qty AS stock_qty,
  0::integer AS reserved_qty,
  0::integer AS reorder_point,
  CASE
    WHEN sp.is_active THEN 'active'
    ELSE 'inactive'
  END AS status,
  sl.name AS location,
  (sp.supplier_id)::text AS supplier_id,
  sp.product_id AS product_id,
  soh.created_at,
  soh.as_of_ts AS updated_at,
  soh.location_id,
  sp.attrs_json->>'description' AS description,
  sp.barcode,
  soh.selling_price AS sale_price,
  soh.unit_cost AS cost_price,
  0::integer AS max_stock,
  ARRAY[]::text[] AS tags,
  NULL::jsonb AS custom_fields,
  NULL::numeric AS markup_percentage,
  soh.qty AS quantity_on_hand,
  soh.qty AS available_qty,
  COALESCE(sp.attrs_json->>'unit', sp.uom) AS unit,
  NULL::numeric AS weight,
  NULL::jsonb AS dimensions,
  NULL::text AS notes
FROM core.stock_on_hand soh
JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
LEFT JOIN core.stock_location sl ON soh.location_id = sl.location_id;
