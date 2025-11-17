BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_agent_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id UUID,
  supplier_id UUID,
  upload_id UUID,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_upload ON public.ai_agent_audit(upload_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_supplier ON public.ai_agent_audit(supplier_id);

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0213_ai_agent_audit')
ON CONFLICT (migration_name) DO NOTHING;