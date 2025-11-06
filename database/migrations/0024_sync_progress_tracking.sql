/**
 * Sync Progress Tracking Infrastructure (Real-Time)
 *
 * Provides persistent tracking of sync job progress with:
 * - Real-time metrics calculation (speed, ETA)
 * - Failure rate tracking
 * - Audit trail via history table
 * - Efficient indexes for fast queries
 * - Support for SSE client subscriptions
 *
 * Tables:
 * - sync_progress: Active/completed sync job tracking
 * - sync_progress_history: Detailed audit trail for metrics
 */

-- Main sync progress tracking table
CREATE TABLE IF NOT EXISTS sync_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Job Identity
  job_name VARCHAR(255),
  source_system VARCHAR(100), -- e.g., 'woocommerce', 'odoo', 'manual'

  -- Progress Tracking
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,

  -- Status State Machine
  status VARCHAR(50) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Detailed progress history for audit trail and metrics replay
CREATE TABLE IF NOT EXISTS sync_progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES sync_progress(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Snapshot data
  processed_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  total_items INTEGER NOT NULL,

  -- Calculated metrics at snapshot time
  items_per_min DECIMAL(10, 2),
  eta_seconds INTEGER,
  elapsed_seconds INTEGER,
  failure_rate DECIMAL(5, 2),

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sync_progress_org_status ON sync_progress(org_id, status);
CREATE INDEX idx_sync_progress_org_created ON sync_progress(org_id, created_at DESC);
CREATE INDEX idx_sync_progress_started ON sync_progress(started_at DESC);
CREATE INDEX idx_sync_progress_status ON sync_progress(status);
CREATE INDEX idx_sync_progress_org ON sync_progress(org_id);

-- Indexes for history queries
CREATE INDEX idx_sync_progress_history_job ON sync_progress_history(job_id, created_at DESC);
CREATE INDEX idx_sync_progress_history_org ON sync_progress_history(org_id, created_at DESC);

-- Unique constraint to prevent duplicate jobs
CREATE UNIQUE INDEX idx_sync_progress_idempotent
  ON sync_progress(org_id, job_name, started_at)
  WHERE status IN ('running', 'completed');

-- Trigger: Update updated_at on sync_progress changes
CREATE OR REPLACE FUNCTION update_sync_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_progress_update_timestamp ON sync_progress;
CREATE TRIGGER sync_progress_update_timestamp
BEFORE UPDATE ON sync_progress
FOR EACH ROW
EXECUTE FUNCTION update_sync_progress_timestamp();

-- View: Current progress metrics for running jobs
CREATE OR REPLACE VIEW v_sync_progress_current AS
  SELECT
    sp.id,
    sp.org_id,
    sp.job_name,
    sp.source_system,
    sp.total_items,
    sp.processed_count,
    sp.failed_count,
    sp.status,
    ROUND(
      (sp.processed_count::NUMERIC / NULLIF(sp.total_items, 0) * 100)::NUMERIC,
      2
    ) AS completion_percent,
    ROUND(
      (sp.failed_count::NUMERIC / NULLIF(sp.processed_count, 0) * 100)::NUMERIC,
      2
    ) AS failure_rate,
    EXTRACT(EPOCH FROM (NOW() - sp.started_at))::INTEGER AS elapsed_seconds,
    CASE
      WHEN sp.processed_count > 0 THEN
        ROUND(
          ((sp.processed_count::NUMERIC / EXTRACT(EPOCH FROM (NOW() - sp.started_at))) * 60)::NUMERIC,
          2
        )
      ELSE 0
    END AS items_per_min,
    CASE
      WHEN sp.processed_count > 0 AND sp.processed_count < sp.total_items THEN
        CEIL(
          ((sp.total_items - sp.processed_count)::NUMERIC /
           (sp.processed_count::NUMERIC / EXTRACT(EPOCH FROM (NOW() - sp.started_at)))) * 60
        )::INTEGER
      ELSE 0
    END AS eta_seconds,
    sp.started_at,
    sp.completed_at,
    sp.updated_at
  FROM sync_progress sp;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sync_progress TO authenticated;
GRANT SELECT, INSERT ON sync_progress_history TO authenticated;
GRANT SELECT ON v_sync_progress_current TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE sync_progress IS
  'Real-time sync job progress tracking with metrics for SSE streaming. Primary source of truth for frontend progress indicators.';

COMMENT ON TABLE sync_progress_history IS
  'Detailed audit trail of progress snapshots for metrics calculation and historical analysis.';

COMMENT ON COLUMN sync_progress.status IS
  'Job state machine: running -> (completed|failed|cancelled)';

COMMENT ON COLUMN sync_progress.metadata IS
  'JSONB metadata: {config, retry_count, batch_size, source_config, etc.}';
