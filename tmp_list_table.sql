SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'stock_on_hand'
ORDER BY ordinal_position;
