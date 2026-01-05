-- ============================================================================
-- Migration: 0213_sync_view_compat.sql
-- Purpose : Provide pluralized compatibility views for sync services
-- Author  : GPT-5.1 Codex
-- Date    : 2025-11-14
-- ============================================================================

BEGIN;

-- Customers view (expected by DeltaDetectionService)
DROP VIEW IF EXISTS customers CASCADE;
DO $customers$
BEGIN
  IF to_regclass('public.customer') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE VIEW customers AS
      SELECT
        id,
        org_id AS organization_id,
        name,
        email,
        phone,
        company,
        tags,
        metadata,
        segment,
        status,
        lifetime_value,
        acquisition_date,
        last_interaction_date,
        address,
        created_at,
        updated_at
      FROM customer;
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE VIEW customers AS
      SELECT
        NULL::uuid AS id,
        NULL::uuid AS organization_id,
        NULL::text AS name,
        NULL::text AS email,
        NULL::text AS phone,
        NULL::text AS company,
        NULL::text[] AS tags,
        NULL::jsonb AS metadata,
        NULL::text AS segment,
        NULL::text AS status,
        NULL::numeric AS lifetime_value,
        NULL::timestamptz AS acquisition_date,
        NULL::timestamptz AS last_interaction_date,
        NULL::jsonb AS address,
        NULL::timestamptz AS created_at,
        NULL::timestamptz AS updated_at
      WHERE FALSE;
    $sql$;
  END IF;
END;
$customers$;

-- Products view
DROP VIEW IF EXISTS products CASCADE;
DO $products$
BEGIN
  IF to_regclass('public.inventory_item') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE VIEW products AS
      SELECT
        id,
        org_id AS organization_id,
        sku,
        name,
        description,
        unit_price AS price,
        quantity_on_hand AS stock_quantity,
        quantity_on_hand AS stock_level,
        sale_price,
        tags,
        created_at,
        updated_at
      FROM inventory_item;
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE VIEW products AS
      SELECT
        NULL::uuid AS id,
        NULL::uuid AS organization_id,
        NULL::text AS sku,
        NULL::text AS name,
        NULL::text AS description,
        NULL::numeric AS price,
        NULL::numeric AS stock_quantity,
        NULL::numeric AS stock_level,
        NULL::numeric AS sale_price,
        NULL::text[] AS tags,
        NULL::timestamptz AS created_at,
        NULL::timestamptz AS updated_at
      WHERE FALSE;
    $sql$;
  END IF;
END;
$products$;

-- Orders view (fallback to purchase orders)
DROP VIEW IF EXISTS orders CASCADE;
DO $orders$
DECLARE
  rel_schema text;
  rel_name text;
  qualified text;
  id_column text;
BEGIN
  SELECT n.nspname, c.relname
  INTO rel_schema, rel_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'purchase_orders'
    AND c.relkind IN ('r', 'v', 'm')
  ORDER BY CASE WHEN n.nspname = 'public' THEN 0 ELSE 1 END
  LIMIT 1;

  IF rel_name IS NOT NULL THEN
    qualified := format('%I.%I', rel_schema, rel_name);
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = rel_schema
        AND table_name = rel_name
        AND column_name = 'purchase_order_id'
    ) THEN
      id_column := 'purchase_order_id';
    ELSE
      id_column := 'id';
    END IF;

    EXECUTE format(
      'CREATE VIEW orders AS
       SELECT
         %1$I AS id,
         NULL::uuid AS org_id,
         status,
         total_amount AS total_amount,
         total_amount AS total,
         supplier_id AS customer_id,
         to_jsonb(notes) AS billing,
         created_at,
         updated_at
       FROM %2$s;',
      id_column,
      qualified
    );
  ELSE
    EXECUTE $sql$
      CREATE VIEW orders AS
      SELECT
        NULL::uuid AS id,
        NULL::uuid AS org_id,
        NULL::text AS status,
        NULL::numeric AS total_amount,
        NULL::numeric AS total,
        NULL::uuid AS customer_id,
        NULL::jsonb AS billing,
        NULL::timestamptz AS created_at,
        NULL::timestamptz AS updated_at
      WHERE FALSE;
    $sql$;
  END IF;
END;
$orders$;

INSERT INTO schema_migrations (migration_name)
VALUES ('0213_sync_view_compat')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

-- ============================================================================
-- End of migration
-- ============================================================================

