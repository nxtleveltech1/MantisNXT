BEGIN;

-- Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table if missing; otherwise, adapt existing to required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_item'
  ) THEN
    CREATE TABLE inventory_item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku TEXT NOT NULL,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      reserved_qty INTEGER NOT NULL DEFAULT 0,
      available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED,
      cost_price NUMERIC(15,2),
      sale_price NUMERIC(15,2),
      supplier_id UUID,
      brand_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    -- Add required columns if they do not exist yet
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='stock_qty'
    ) THEN
      EXECUTE 'ALTER TABLE inventory_item ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='reserved_qty'
    ) THEN
      EXECUTE 'ALTER TABLE inventory_item ADD COLUMN reserved_qty INTEGER NOT NULL DEFAULT 0';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='available_qty'
    ) THEN
      EXECUTE 'ALTER TABLE inventory_item ADD COLUMN available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='cost_price'
    ) THEN
      EXECUTE 'ALTER TABLE inventory_item ADD COLUMN cost_price NUMERIC(15,2)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='sale_price'
    ) THEN
      EXECUTE 'ALTER TABLE inventory_item ADD COLUMN sale_price NUMERIC(15,2)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='supplier_id'
    ) THEN
      EXECUTE 'ALTER TABLE inventory_item ADD COLUMN supplier_id UUID';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='brand_id'
    ) THEN
      EXECUTE 'ALTER TABLE inventory_item ADD COLUMN brand_id UUID';
    END IF;

    -- Backfill new columns from legacy column names when present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='quantity_on_hand'
    ) THEN
      EXECUTE 'UPDATE inventory_item SET stock_qty = COALESCE(stock_qty, quantity_on_hand)';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' AND column_name='quantity_reserved'
    ) THEN
      EXECUTE 'UPDATE inventory_item SET reserved_qty = COALESCE(reserved_qty, quantity_reserved)';
    END IF;
  END IF;
END $$;

-- Ensure uniqueness and performance indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_item_sku ON inventory_item (sku);
CREATE INDEX IF NOT EXISTS idx_inventory_item_supplier ON inventory_item (supplier_id);

-- If old plural table exists, merge data and then create compatibility view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_items'
  ) THEN
    -- If inventory_items is a table, rename it to _legacy to free the name for a view
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='inventory_items' AND c.relkind='r'
    ) THEN
      EXECUTE 'ALTER TABLE public.inventory_items RENAME TO inventory_items_legacy';
    END IF;
  END IF;
END $$;

-- Create or replace compatibility view
DROP VIEW IF EXISTS inventory_items CASCADE;
CREATE VIEW inventory_items AS SELECT * FROM inventory_item;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0200_unify_inventory_schema')
ON CONFLICT (migration_name) DO NOTHING;
