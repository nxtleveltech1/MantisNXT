SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_item'
ORDER BY ordinal_position;
