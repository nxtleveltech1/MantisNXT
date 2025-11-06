/**
 * Migration 0023: Sync Orchestration Tables
 *
 * Creates tables for orchestrated multi-system synchronization:
 * - sync_orchestration: Main orchestration records
 * - sync_idempotency_log: Prevent duplicate processing
 * - sync_conflict: Conflict detection and resolution
 * - sync_activity_log: Audit trail for sync operations
 *
 * Author: Claude Code
 * Date: 2025-11-06
 */

-- Create sync orchestration record table
CREATE TABLE IF NOT EXISTS sync_orchestration (
  id BIGSERIAL PRIMARY KEY,
  sync_id VARCHAR(255) NOT NULL UNIQUE,
  org_id VARCHAR(255) NOT NULL,
  systems JSONB NOT NULL, -- Array of systems: ["woocommerce", "odoo"]
  entity_types JSONB NOT NULL, -- Array of entity types: ["customers", "products", ...]
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, queued, processing, paused, done, partial, failed, cancelled
  config JSONB NOT NULL, -- SyncConfig: { conflictStrategy, batchSize, maxRetries, rateLimit }
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_orchestration_org_id ON sync_orchestration(org_id);
CREATE INDEX idx_sync_orchestration_status ON sync_orchestration(status);
CREATE INDEX idx_sync_orchestration_created_at ON sync_orchestration(created_at DESC);

-- Create idempotency log to prevent duplicate processing
CREATE TABLE IF NOT EXISTS sync_idempotency_log (
  id BIGSERIAL PRIMARY KEY,
  sync_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_idempotency_log_sync_id ON sync_idempotency_log(sync_id);
CREATE INDEX idx_sync_idempotency_log_key ON sync_idempotency_log(idempotency_key);

-- Create conflict tracking table
CREATE TABLE IF NOT EXISTS sync_conflict (
  id VARCHAR(255) PRIMARY KEY,
  sync_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  conflict_type VARCHAR(100) NOT NULL, -- DataMismatch, DuplicateKey, ValidationError, AuthError, etc.
  data JSONB NOT NULL, -- Full conflict details
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_action VARCHAR(50), -- accept, reject, custom
  resolved_data JSONB, -- Custom resolution data if applicable
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_conflict_sync_id ON sync_conflict(sync_id);
CREATE INDEX idx_sync_conflict_is_resolved ON sync_conflict(is_resolved);
CREATE INDEX idx_sync_conflict_conflict_type ON sync_conflict(conflict_type);
CREATE INDEX idx_sync_conflict_created_at ON sync_conflict(created_at DESC);

-- Create activity log for audit trail
CREATE TABLE IF NOT EXISTS sync_activity_log (
  id BIGSERIAL PRIMARY KEY,
  sync_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL, -- SYNC_STARTED, SYNC_COMPLETED, BATCH_PROCESSED, SYNC_ERROR, etc.
  details JSONB, -- Additional details for the action
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_activity_log_sync_id ON sync_activity_log(sync_id);
CREATE INDEX idx_sync_activity_log_org_id ON sync_activity_log(org_id);
CREATE INDEX idx_sync_activity_log_action ON sync_activity_log(action);
CREATE INDEX idx_sync_activity_log_created_at ON sync_activity_log(created_at DESC);

-- Add columns to existing queue tables if not present
ALTER TABLE woo_customer_sync_queue
ADD COLUMN IF NOT EXISTS sync_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS delta JSONB,
ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_woo_sync_queue_sync_id ON woo_customer_sync_queue(sync_id);
CREATE INDEX IF NOT EXISTS idx_woo_sync_queue_idempotency_key ON woo_customer_sync_queue(idempotency_key);

ALTER TABLE odoo_sync_queue
ADD COLUMN IF NOT EXISTS sync_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS delta JSONB,
ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_sync_id ON odoo_sync_queue(sync_id);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_idempotency_key ON odoo_sync_queue(idempotency_key);

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO neon_default_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO neon_default_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO neon_default_admin;
