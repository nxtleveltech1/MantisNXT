\set ON_ERROR_STOP on
BEGIN;
WITH s AS (
  INSERT INTO core.supplier(name, code, active, default_currency)
  VALUES ('Acme Suppliers','ACME', true, 'ZAR')
  ON CONFLICT DO NOTHING
  RETURNING supplier_id
), s2 AS (
  SELECT supplier_id FROM s
  UNION ALL
  SELECT supplier_id FROM core.supplier WHERE code='ACME'
), c AS (
  INSERT INTO core.category(name, path, level, is_active)
  VALUES ('Uncategorized','/uncategorized',0,true)
  ON CONFLICT DO NOTHING
  RETURNING category_id
), c2 AS (
  SELECT category_id FROM c
  UNION ALL
  SELECT category_id FROM core.category WHERE name='Uncategorized'
), p AS (
  INSERT INTO core.product(name, uom, barcode, category_id, is_active)
  SELECT 'Demo Product','ea','0000001', (SELECT category_id FROM c2), true
  ON CONFLICT DO NOTHING
  RETURNING product_id
), p2 AS (
  SELECT product_id FROM p
  UNION ALL
  SELECT product_id FROM core.product WHERE barcode='0000001'
), sp AS (
  INSERT INTO core.supplier_product(supplier_id, supplier_sku, product_id, name_from_supplier, uom, barcode, is_active, is_new)
  SELECT (SELECT supplier_id FROM s2), 'SKU-001', (SELECT product_id FROM p2), 'Demo Product', 'ea', '0000001', true, false
  ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET is_active=EXCLUDED.is_active
  RETURNING supplier_product_id
), l AS (
  INSERT INTO core.stock_location(name, type, supplier_id, is_active)
  SELECT 'Main','internal',(SELECT supplier_id FROM s2), true
  ON CONFLICT DO NOTHING
  RETURNING location_id
), l2 AS (
  SELECT location_id FROM l
  UNION ALL
  SELECT location_id FROM core.stock_location WHERE name='Main' AND type='internal'
)
INSERT INTO core.stock_on_hand(location_id, supplier_product_id, qty, unit_cost, source)
SELECT (SELECT location_id FROM l2), (SELECT supplier_product_id FROM sp), 25, 100.00, 'system'
ON CONFLICT DO NOTHING;

-- Activate a selection and include the demo product
WITH sel AS (
  INSERT INTO core.inventory_selection(selection_name, description, created_by, status, valid_from)
  VALUES ('Default Selection','Initial demo selection','system','active', NOW())
  ON CONFLICT DO NOTHING
  RETURNING selection_id
), sel2 AS (
  SELECT selection_id FROM sel
  UNION ALL
  SELECT selection_id FROM core.inventory_selection WHERE selection_name='Default Selection'
)
INSERT INTO core.inventory_selected_item(selection_id, supplier_product_id, status, selected_by)
SELECT (SELECT selection_id FROM sel2), (SELECT supplier_product_id FROM core.supplier_product WHERE supplier_sku='SKU-001'), 'selected','system'
ON CONFLICT DO NOTHING;
COMMIT;

