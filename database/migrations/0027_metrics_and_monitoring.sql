-- 0027_metrics_and_monitoring.sql
-- Monitoring and observability tables

CREATE TABLE IF NOT EXISTS spp.extraction_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES spp.extraction_jobs(job_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  rows_processed INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_created ON spp.extraction_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_status ON spp.extraction_metrics(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_error ON spp.extraction_metrics(error_code, created_at DESC) WHERE error_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS api_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time ON api_rate_limit(key, timestamp DESC);
