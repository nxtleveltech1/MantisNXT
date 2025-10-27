
-- Phase 5 DOWN Migration — Revert Inventory Operations & Allocations
-- WARNING: Only run if you intend to fully roll back Phase 5 changes.
BEGIN;

-- 8) Drop movement->inventory trigger & function (if created)
DROP TRIGGER IF EXISTS trg_apply_movement_to_inventory ON stock_movements;
DROP FUNCTION IF EXISTS apply_movement_to_inventory();

-- 7) Drop soft delete write-off trigger & function
DROP TRIGGER IF EXISTS trg_inventory_soft_delete_writeoff ON inventory_items;
DROP FUNCTION IF EXISTS inventory_soft_delete_writeoff();

-- 6) Drop allocations updated_at trigger & function
DROP TRIGGER IF EXISTS trg_allocations_updated_at ON inventory_allocations;
DROP FUNCTION IF EXISTS set_updated_at();

-- 5) Drop movement indexes
DROP INDEX IF EXISTS idx_movements_item_created;
DROP INDEX IF EXISTS idx_movements_type_created;

-- 4) Drop inventory_allocations table
DROP TABLE IF EXISTS inventory_allocations;

-- 3) Remove constraints/columns added to inventory_items
ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_reserved_le_stock,
  DROP CONSTRAINT IF EXISTS inventory_items_reserved_nonneg,
  DROP CONSTRAINT IF EXISTS inventory_items_stock_nonneg;

ALTER TABLE inventory_items
  DROP COLUMN IF EXISTS deleted_at;

-- 2) Revert stock_movements constraints/columns (best-effort; will not drop data)
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_qty_positive;

-- Note: Only drop columns if they were created by Phase 5 and are safe to remove
ALTER TABLE stock_movements
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS movement_type;

-- 1) Drop ENUM if and only if no columns depend on it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE udt_name = 'movement_type'
  ) THEN
    DROP TYPE IF EXISTS movement_type;
  END IF;
END$$;

COMMIT;
