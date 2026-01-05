BEGIN;

-- Drop overly strict unique SKU index to allow multi-org identical SKUs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'ux_inventory_item_sku'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS ux_inventory_item_sku';
  END IF;
END $$;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0201_adjust_inventory_indexes')
ON CONFLICT (migration_name) DO NOTHING;

