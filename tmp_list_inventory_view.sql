SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_items'
ORDER BY ordinal_position;
