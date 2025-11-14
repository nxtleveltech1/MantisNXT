-- 0026_import_and_rollback.sql
-- Import operations and rollback support

CREATE TABLE IF NOT EXISTS spp.import_jobs (
  import_job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES spp.extraction_jobs(job_id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'importing' CHECK (status IN ('importing', 'completed', 'failed', 'rolled_back')),
  config JSONB NOT NULL,
  results JSONB,
  rollback_data JSONB,
  rollback_expires_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_org ON spp.import_jobs(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_rollback ON spp.import_jobs(rollback_expires_at) WHERE rollback_expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS spp.extraction_job_dlq (
  dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  upload_id UUID,
  config JSONB NOT NULL,
  error JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0,
  failed_at TIMESTAMPTZ DEFAULT NOW(),
  last_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dlq_unresolved ON spp.extraction_job_dlq(failed_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dlq_job ON spp.extraction_job_dlq(job_id);
