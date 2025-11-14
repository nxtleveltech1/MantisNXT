BEGIN;

CREATE TABLE IF NOT EXISTS sync_orchestration (
  id BIGSERIAL PRIMARY KEY,
  sync_id VARCHAR(255) NOT NULL UNIQUE,
  org_id VARCHAR(255) NOT NULL,
  systems JSONB NOT NULL,
  entity_types JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_orchestration_org_id ON sync_orchestration(org_id);
CREATE INDEX IF NOT EXISTS idx_sync_orchestration_status ON sync_orchestration(status);
CREATE INDEX IF NOT EXISTS idx_sync_orchestration_created_at ON sync_orchestration(created_at DESC);

CREATE TABLE IF NOT EXISTS sync_idempotency_log (
  id BIGSERIAL PRIMARY KEY,
  sync_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_idempotency_log_sync_id ON sync_idempotency_log(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_idempotency_log_key ON sync_idempotency_log(idempotency_key);

CREATE TABLE IF NOT EXISTS sync_conflict (
  id VARCHAR(255) PRIMARY KEY,
  sync_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  conflict_type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_action VARCHAR(50),
  resolved_data JSONB,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_conflict_sync_id ON sync_conflict(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflict_is_resolved ON sync_conflict(is_resolved);
CREATE INDEX IF NOT EXISTS idx_sync_conflict_conflict_type ON sync_conflict(conflict_type);
CREATE INDEX IF NOT EXISTS idx_sync_conflict_created_at ON sync_conflict(created_at DESC);

COMMIT;

