-- Odoo Sync Queue Infrastructure (Production Pattern)
-- Tracks sync progress for Odoo-bound operations similar to Woo queue

BEGIN;

CREATE TABLE IF NOT EXISTS odoo_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Queue Identity
  queue_name VARCHAR(255) NOT NULL,
  source_system VARCHAR(50) NOT NULL DEFAULT 'odoo',

  -- State Machine
  state VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'processing', 'partial', 'done', 'failed', 'cancelled')),

  -- Processing Metadata
  total_count INTEGER NOT NULL DEFAULT 0,
  draft_count INTEGER NOT NULL DEFAULT 0,
  processing_count INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  cancelled_count INTEGER NOT NULL DEFAULT 0,

  -- Process Tracking
  process_count INTEGER NOT NULL DEFAULT 0,
  last_process_date TIMESTAMP WITH TIME ZONE,
  is_processing BOOLEAN DEFAULT FALSE,
  is_action_required BOOLEAN DEFAULT FALSE,
  action_required_reason TEXT,

  -- Batch Configuration
  batch_size INTEGER DEFAULT 50,
  batch_delay_ms INTEGER DEFAULT 2000,

  -- Error Tracking
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  last_error_timestamp TIMESTAMP WITH TIME ZONE,

  -- Idempotency & Resumption
  idempotency_key VARCHAR(255),
  resume_from_line INTEGER DEFAULT 0,

  -- Audit Trail
  created_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS odoo_sync_queue_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES odoo_sync_queue(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Entity identity
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customers','products','orders','inventory','payments')),
  external_id TEXT,
  local_id UUID,

  -- Payloads
  data JSONB NOT NULL DEFAULT '{}',
  delta JSONB DEFAULT '{}',

  -- Processing state
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','skipped')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  -- Idempotency
  idempotency_key VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_org ON odoo_sync_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_state ON odoo_sync_queue(state);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_updated ON odoo_sync_queue(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_line_queue ON odoo_sync_queue_line(queue_id);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_line_org ON odoo_sync_queue_line(org_id);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_line_entity ON odoo_sync_queue_line(entity_type);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_line_status ON odoo_sync_queue_line(status);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_queue_line_idem ON odoo_sync_queue_line(idempotency_key) WHERE idempotency_key IS NOT NULL;

COMMIT;

