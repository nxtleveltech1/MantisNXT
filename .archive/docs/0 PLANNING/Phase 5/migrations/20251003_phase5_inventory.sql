
-- Phase 5 Migration — Inventory Operations & Allocations
-- Date: 2025-10-03
-- Assumes PostgreSQL 13+
-- This migration adds inventory allocations, hardens constraints, and introduces
-- soft-delete behavior with write-off movements. Movement↔inventory syncing can be
-- enforced either in API transactions (preferred) or via the triggers below.

BEGIN;

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- 1) Enumerations (if you already use enums, adjust accordingly)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE movement_type AS ENUM (
      'IN', 'OUT', 'ADJUST', 'TRANSFER', 'CONSIGNMENT_IN', 'CONSIGNMENT_OUT', 'WRITE_OFF'
    );
  END IF;
END$$;

-- 2) Table: stock_movements (ensure required columns & constraints)
-- NOTE: If the table exists, we attempt to align schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='stock_movements' AND column_name='movement_type') THEN
    ALTER TABLE stock_movements ADD COLUMN movement_type movement_type;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='stock_movements' AND column_name='quantity') THEN
    ALTER TABLE stock_movements ADD COLUMN quantity INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='stock_movements' AND column_name='created_at') THEN
    ALTER TABLE stock_movements ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END$$;

-- Basic integrity checks
ALTER TABLE stock_movements
  ALTER COLUMN quantity SET NOT NULL,
  ADD CONSTRAINT stock_movements_qty_positive CHECK (quantity > 0);

-- 3) Table: inventory_items constraints & soft delete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='inventory_items' AND column_name='deleted_at') THEN
    ALTER TABLE inventory_items ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;
END$$;

ALTER TABLE inventory_items
  ALTER COLUMN stock_qty SET NOT NULL,
  ALTER COLUMN reserved_qty SET NOT NULL,
  ADD CONSTRAINT inventory_items_stock_nonneg CHECK (stock_qty >= 0),
  ADD CONSTRAINT inventory_items_reserved_nonneg CHECK (reserved_qty >= 0),
  ADD CONSTRAINT inventory_items_reserved_le_stock CHECK (reserved_qty <= stock_qty);

-- 4) Table: inventory_allocations
CREATE TABLE IF NOT EXISTS inventory_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'closed'
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allocations_item ON inventory_allocations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_allocations_supplier ON inventory_allocations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON inventory_allocations(status);

-- 5) Helpful indexes for movements
CREATE INDEX IF NOT EXISTS idx_movements_item_created ON stock_movements(inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type_created ON stock_movements(movement_type, created_at DESC);

-- 6) Trigger: update updated_at on allocations
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allocations_updated_at ON inventory_allocations;
CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON inventory_allocations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7) Triggered write-off on soft delete (optional but recommended)
CREATE OR REPLACE FUNCTION inventory_soft_delete_writeoff() RETURNS TRIGGER AS $$
DECLARE
  v_qty INTEGER;
BEGIN
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    SELECT stock_qty INTO v_qty FROM inventory_items WHERE id = NEW.id FOR UPDATE;
    IF v_qty IS NULL THEN
      RAISE EXCEPTION 'Inventory item % not found during soft delete', NEW.id;
    END IF;
    IF v_qty > 0 THEN
      -- Insert a WRITE_OFF movement for the remaining quantity
      INSERT INTO stock_movements (inventory_item_id, movement_type, quantity, created_at)
      VALUES (NEW.id, 'WRITE_OFF', v_qty, now());

      -- Zero out stock after write-off
      NEW.stock_qty := 0;
      NEW.reserved_qty := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_soft_delete_writeoff ON inventory_items;
CREATE TRIGGER trg_inventory_soft_delete_writeoff
  BEFORE UPDATE OF deleted_at ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION inventory_soft_delete_writeoff();

-- 8) Optional: movement→inventory sync at DB layer
-- If you prefer the API to own this, skip creating these triggers.
-- They ensure atomicity when an INSERT happens on stock_movements.
CREATE OR REPLACE FUNCTION apply_movement_to_inventory() RETURNS TRIGGER AS $$
DECLARE
  delta INTEGER;
  current_reserved INTEGER;
  new_stock INTEGER;
BEGIN
  -- Determine delta based on movement_type
  IF NEW.movement_type IN ('IN','CONSIGNMENT_IN') THEN
    delta := NEW.quantity;
  ELSIF NEW.movement_type IN ('OUT','CONSIGNMENT_OUT','WRITE_OFF') THEN
    delta := -NEW.quantity;
  ELSIF NEW.movement_type = 'ADJUST' THEN
    -- ADJUST is absolute delta provided as quantity with signed flag? We assume positive means increase; use NEW.quantity_sign if present.
    delta := NEW.quantity; -- if negative adjustments are needed, represent via OUT or WRITE_OFF for auditability.
  ELSIF NEW.movement_type = 'TRANSFER' THEN
    -- Expect a separate paired movement to the target item; this entry is treated as OUT here.
    delta := -NEW.quantity;
  ELSE
    RAISE EXCEPTION 'Unknown movement_type: %', NEW.movement_type;
  END IF;

  -- Lock row and compute new stock
  SELECT reserved_qty INTO current_reserved FROM inventory_items WHERE id = NEW.inventory_item_id FOR UPDATE;
  UPDATE inventory_items
    SET stock_qty = stock_qty + delta
    WHERE id = NEW.inventory_item_id
    RETURNING stock_qty INTO new_stock;

  -- Guardrails: do not allow stock below reserved or below zero
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative for item % (attempted %)', NEW.inventory_item_id, new_stock;
  END IF;
  IF current_reserved > new_stock THEN
    RAISE EXCEPTION 'Reserved (% for item %) exceeds new stock (%)', current_reserved, NEW.inventory_item_id, new_stock;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_movement_to_inventory ON stock_movements;
CREATE TRIGGER trg_apply_movement_to_inventory
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION apply_movement_to_inventory();

COMMIT;
