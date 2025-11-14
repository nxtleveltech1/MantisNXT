SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_item'
  AND column_name IN ('stock_qty', 'reserved_qty', 'available_qty');
