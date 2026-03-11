-- Migration: 0263_cron_execution_log.sql
-- Description: Log cron job executions for visibility on frontend
-- Date: 2026-03-10

CREATE TABLE IF NOT EXISTS core.cron_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  processed_count INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_execution_log_type_started
ON core.cron_execution_log(cron_type, started_at DESC);

COMMENT ON TABLE core.cron_execution_log IS 'Execution log for scheduled cron jobs (json-feed-sync, plusportal-sync)';
