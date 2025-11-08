-- =============================================================================
-- AI Provider Registry (Org-wide presets, no secrets)
-- =============================================================================

-- Enum ai_provider is expected from prior migrations.
-- For compatibility environments, this migration tolerates pre-existing types/tables.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_provider') THEN
        CREATE TYPE ai_provider AS ENUM (
          'openai',
          'anthropic',
          'azure_openai',
          'bedrock'
        );
    END IF;
END $$;

-- Registry table: stores reusable provider presets (no API keys)
CREATE TABLE IF NOT EXISTS ai_provider_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- Application-managed, tenant scoped
  name TEXT NOT NULL,
  provider_type ai_provider NOT NULL,
  base_url TEXT,
  default_model TEXT,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_provider_registry_org
  ON ai_provider_registry(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_registry_enabled
  ON ai_provider_registry(enabled) WHERE enabled = TRUE;

-- RLS
ALTER TABLE ai_provider_registry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ai_provider_registry'
          AND policyname = 'ai_provider_registry_tenant_isolation'
    ) THEN
        CREATE POLICY ai_provider_registry_tenant_isolation ON ai_provider_registry
          FOR ALL
          USING (org_id = current_setting('app.current_org_id', true)::uuid);
    END IF;
END $$;

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_provider_registry_updated ON ai_provider_registry;
CREATE TRIGGER trg_ai_provider_registry_updated
BEFORE UPDATE ON ai_provider_registry
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();


