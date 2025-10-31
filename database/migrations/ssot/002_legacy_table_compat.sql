-- SSOT: Ensure legacy tables are replaced by views pointing to core schema
DO $$
DECLARE
  relkind_char char;
BEGIN
  -- If a real table named public.suppliers exists, rename it and create view
  SELECT c.relkind INTO relkind_char
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'suppliers';

  IF relkind_char = 'r' THEN
    EXECUTE 'ALTER TABLE public.suppliers RENAME TO suppliers_legacy';
  END IF;

  -- Drop existing view (if any) to avoid column mismatch issues
  EXECUTE 'DROP VIEW IF EXISTS public.suppliers CASCADE';
  -- Create compatibility view for public.suppliers pointing to core.supplier
  EXECUTE 'CREATE VIEW public.suppliers AS
    SELECT
      s.supplier_id::text as id,
      s.name,
      CASE WHEN s.active THEN ''active''::text ELSE ''inactive''::text END as status,
      s.contact_info->>''email'' as email,
      s.contact_info->>''phone'' as phone,
      s.payment_terms as payment_terms_days,
      s.default_currency as currency,
      NULL::text as terms,
      s.created_at,
      s.updated_at,
      s.code
    FROM core.supplier s';

  -- Handle inventory_items similarly
  SELECT c.relkind INTO relkind_char
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'inventory_items';

  IF relkind_char = 'r' THEN
    EXECUTE 'ALTER TABLE public.inventory_items RENAME TO inventory_items_legacy';
  END IF;

  EXECUTE 'DROP VIEW IF EXISTS public.inventory_items CASCADE';
  EXECUTE 'CREATE VIEW public.inventory_items AS
    SELECT
      soh.soh_id::text as id,
      sp.supplier_sku as sku,
      sp.name_from_supplier as name,
      ''Unknown''::text as category,
      NULL::text as brand,
      soh.qty as stock_qty,
      0::integer as reserved_qty,
      0::integer as reorder_point,
      CASE WHEN sp.is_active THEN ''active''::text ELSE ''inactive''::text END as status,
      sl.name as location,
      sp.supplier_id::text as supplier_id,
      NULL::uuid as product_id,
      soh.created_at,
      soh.as_of_ts as updated_at,
      NULL::uuid as location_id
    FROM core.stock_on_hand soh
    JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
    LEFT JOIN core.stock_location sl ON soh.location_id = sl.location_id';
END $$;
