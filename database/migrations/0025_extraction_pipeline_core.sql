-- 0025_extraction_pipeline_core.sql
-- Extraction pipeline core tables for pricelist data processing

CREATE TABLE IF NOT EXISTS spp.pricelist_uploads (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'validating', 'validated', 'failed', 'processing', 'completed')),
  validation_result JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_uploads_org_supplier ON spp.pricelist_uploads(org_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON spp.pricelist_uploads(status) WHERE status IN ('uploaded', 'validating', 'processing');
CREATE INDEX IF NOT EXISTS idx_uploads_expires ON spp.pricelist_uploads(expires_at) WHERE expires_at > NOW();

CREATE TABLE IF NOT EXISTS spp.extraction_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES spp.pricelist_uploads(upload_id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  config JSONB NOT NULL,
  progress JSONB,
  error_details JSONB,
  priority INTEGER DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON spp.extraction_jobs(status) WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_jobs_org ON spp.extraction_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON spp.extraction_jobs(priority DESC, queued_at ASC) WHERE status = 'queued';

CREATE TABLE IF NOT EXISTS spp.extraction_results (
  job_id UUID PRIMARY KEY REFERENCES spp.extraction_jobs(job_id) ON DELETE CASCADE,
  products JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_results_expires ON spp.extraction_results(expires_at) WHERE expires_at > NOW();
