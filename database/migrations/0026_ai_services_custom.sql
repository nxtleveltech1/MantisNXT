-- =============================================================================
-- Custom AI Services (Org-defined)
-- =============================================================================

-- Service catalog per organization
CREATE TABLE IF NOT EXISTS ai_service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  service_key TEXT NOT NULL,   -- slug/key (e.g., 'demand-forecasting')
  service_label TEXT NOT NULL, -- human label (e.g., 'Demand Forecasting')
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_service_key UNIQUE (org_id, service_key)
);

ALTER TABLE ai_service ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_service'
      AND policyname = 'ai_service_tenant_isolation'
  ) THEN
    CREATE POLICY ai_service_tenant_isolation ON ai_service
      FOR ALL
      USING (org_id = current_setting('app.current_org_id', true)::uuid);
  END IF;
END $$;

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS trg_ai_service_updated ON ai_service;
CREATE TRIGGER trg_ai_service_updated
BEFORE UPDATE ON ai_service
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Link configs to service_id while keeping legacy compatibility
ALTER TABLE ai_service_config
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES ai_service(id);

-- Relax legacy uniqueness; prefer uniqueness by (org_id, service_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_org_service'
      AND conrelid = 'ai_service_config'::regclass
  ) THEN
    ALTER TABLE ai_service_config DROP CONSTRAINT unique_org_service;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uniq_ai_service_config_org_service_id'
  ) THEN
    CREATE UNIQUE INDEX uniq_ai_service_config_org_service_id
      ON ai_service_config(org_id, service_id)
      WHERE service_id IS NOT NULL;
  END IF;
END $$;


