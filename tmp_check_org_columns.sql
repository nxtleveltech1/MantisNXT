SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'supplier',
  'inventory_item',
  'purchase_order',
  'purchase_order_item',
  'customer',
  'integration_log',
  'ai_dataset',
  'ai_conversation',
  'ai_prompt_template'
)
AND column_name = 'org_id'
ORDER BY table_name;

