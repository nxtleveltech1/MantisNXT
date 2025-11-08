-- Add unique constraint for built-in services (service_type without service_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uniq_ai_service_config_org_service_type'
  ) THEN
    CREATE UNIQUE INDEX uniq_ai_service_config_org_service_type
      ON ai_service_config(org_id, service_type)
      WHERE service_id IS NULL;
  END IF;
END $$;

