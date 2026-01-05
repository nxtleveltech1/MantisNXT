BEGIN;

-- Ensure movement_type enum exists for future alignment (do not alter existing column types)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    BEGIN
      ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'write_off';
    EXCEPTION
      WHEN duplicate_object THEN
        -- Value already exists; ignore
        NULL;
    END;
  END IF;
END$$;

-- Ensure stock_movements has created_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_movement' AND column_name='created_at'
  ) THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stock_movement'
  ) THEN
    ALTER TABLE stock_movement ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Helpful indexes on stock_movements
CREATE INDEX IF NOT EXISTS idx_movements_item_created ON stock_movement(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type_created ON stock_movement(movement_type, created_at DESC);

-- Soft-delete write-off trigger on inventory_item (singular)
CREATE OR REPLACE FUNCTION inventory_soft_delete_writeoff() RETURNS TRIGGER AS $$
DECLARE
  v_qty INTEGER;
BEGIN
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    SELECT stock_qty INTO v_qty FROM inventory_item WHERE id = NEW.id FOR UPDATE;
    IF v_qty IS NULL THEN
      RAISE EXCEPTION 'Inventory item % not found during soft delete', NEW.id;
    END IF;
    IF v_qty > 0 THEN
      INSERT INTO stock_movement (id, org_id, inventory_item_id, movement_type, quantity_change, quantity_before, quantity_after, movement_date)
      VALUES (
        gen_random_uuid(),
        NEW.org_id,
        NEW.id,
        'write_off',
        -v_qty,
        v_qty,
        0,
        now()
      );
      NEW.stock_qty := 0;
      NEW.reserved_qty := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_soft_delete_writeoff ON inventory_item;
CREATE TRIGGER trg_inventory_soft_delete_writeoff
  BEFORE UPDATE OF deleted_at ON inventory_item
  FOR EACH ROW
  EXECUTE FUNCTION inventory_soft_delete_writeoff();

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0205_phase5_inventory')
ON CONFLICT (migration_name) DO NOTHING;
 
