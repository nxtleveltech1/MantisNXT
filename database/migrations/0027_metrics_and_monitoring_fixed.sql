-- 0027_metrics_and_monitoring.sql
-- Metrics tracking for extraction pipeline performance

CREATE TABLE IF NOT EXISTS spp.extraction_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('upload', 'extraction', 'import', 'validation', 'error')),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(12, 3),
  dimensions JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioning would be ideal here for production
CREATE INDEX IF NOT EXISTS idx_metrics_org_type ON spp.extraction_metrics(org_id, metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON spp.extraction_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON spp.extraction_metrics(metric_name, timestamp DESC);

-- Add updated_at triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION spp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pricelist_uploads_updated_at
  BEFORE UPDATE ON spp.pricelist_uploads
  FOR EACH ROW
  EXECUTE FUNCTION spp.update_updated_at_column();

CREATE TRIGGER update_extraction_jobs_updated_at
  BEFORE UPDATE ON spp.extraction_jobs
  FOR EACH ROW
  EXECUTE FUNCTION spp.update_updated_at_column();