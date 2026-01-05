BEGIN;

-- Ensure non-negative stock and reserved <= stock
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_inventory_stock_non_negative') THEN
    ALTER TABLE inventory_item ADD CONSTRAINT ck_inventory_stock_non_negative CHECK (stock_qty >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_inventory_reserved_le_stock') THEN
    ALTER TABLE inventory_item ADD CONSTRAINT ck_inventory_reserved_le_stock CHECK (reserved_qty >= 0 AND reserved_qty <= stock_qty);
  END IF;
END $$;

-- Ensure movement quantities are positive
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_movement'
      AND column_name = 'quantity_change'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_stock_movement_qty_nonzero') THEN
      ALTER TABLE stock_movement
        ADD CONSTRAINT ck_stock_movement_qty_nonzero CHECK (quantity_change <> 0);
    END IF;
  END IF;
END $$;

-- Soft delete column
ALTER TABLE inventory_item
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0204_inventory_constraints')
ON CONFLICT (migration_name) DO NOTHING;
