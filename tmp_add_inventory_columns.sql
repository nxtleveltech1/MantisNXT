ALTER TABLE inventory_item
  ADD COLUMN IF NOT EXISTS stock_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED,
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS supplier_id UUID,
  ADD COLUMN IF NOT EXISTS brand_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_item'
      AND column_name = 'quantity_on_hand'
  ) THEN
    EXECUTE 'UPDATE inventory_item SET stock_qty = COALESCE(stock_qty, quantity_on_hand)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_item'
      AND column_name = 'quantity_reserved'
  ) THEN
    EXECUTE 'UPDATE inventory_item SET reserved_qty = COALESCE(reserved_qty, quantity_reserved)';
  END IF;
END $$;
