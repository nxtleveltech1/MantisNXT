SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'ai_conversation',
  'ai_dataset',
  'ai_prompt_template',
  'customer_interaction',
  'support_ticket',
  'ticket_comment',
  'dashboard',
  'dashboard_share',
  'dashboard_favorite',
  'integration_connector',
  'data_import',
  'automation_pipeline',
  'pipeline_execution',
  'notification'
)
AND column_name IN ('user_id', 'created_by', 'shared_by', 'shared_with', 'assigned_to')
ORDER BY table_name, column_name;

