-- WooCommerce Sync Queue Infrastructure (Production Pattern)
-- Based on Odoo queue.data.mixin.ept pattern
-- Tracks sync progress, batches, and recovery state

CREATE TABLE IF NOT EXISTS woo_customer_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Queue Identity
  queue_name VARCHAR(255) NOT NULL,
  source_system VARCHAR(50) NOT NULL DEFAULT 'woocommerce',

  -- State Machine
  state VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'processing', 'partial', 'done', 'failed', 'cancelled')),

  -- Processing Metadata
  total_count INTEGER NOT NULL DEFAULT 0,
  draft_count INTEGER NOT NULL DEFAULT 0,
  processing_count INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  cancelled_count INTEGER NOT NULL DEFAULT 0,

  -- Process Tracking (Odoo pattern: max 3 retries)
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
  created_by UUID NOT NULL REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  CONSTRAINT queue_uniqueness UNIQUE (org_id, queue_name, idempotency_key)
);

-- Queue Line Items (each customer)
CREATE TABLE IF NOT EXISTS woo_customer_sync_queue_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES woo_customer_sync_queue(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Line Identity
  woo_customer_id BIGINT NOT NULL,
  external_id VARCHAR(255),

  -- Customer Data (cached from WooCommerce)
  customer_data JSONB NOT NULL,

  -- Processing State Machine
  state VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'processing', 'done', 'failed', 'cancelled')),

  -- Process Tracking
  process_count INTEGER DEFAULT 0,
  last_process_date TIMESTAMP WITH TIME ZONE,

  -- Error Handling
  error_message TEXT,
  error_count INTEGER DEFAULT 0,
  last_error_timestamp TIMESTAMP WITH TIME ZONE,

  -- Result
  result_customer_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  was_update BOOLEAN,

  -- Idempotency
  idempotency_token VARCHAR(255) UNIQUE,

  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT line_idempotency UNIQUE (queue_id, woo_customer_id)
);

-- Sync Activity Log (detailed audit trail)
CREATE TABLE IF NOT EXISTS woo_sync_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES woo_customer_sync_queue(id) ON DELETE CASCADE,
  queue_line_id UUID REFERENCES woo_customer_sync_queue_line(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  activity_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,

  message TEXT,
  details JSONB,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_woo_sync_queue_org_state ON woo_customer_sync_queue(org_id, state);
CREATE INDEX idx_woo_sync_queue_processing ON woo_customer_sync_queue(is_processing, org_id);
CREATE INDEX idx_woo_sync_queue_action_required ON woo_customer_sync_queue(is_action_required, org_id);
CREATE INDEX idx_woo_queue_line_state ON woo_customer_sync_queue_line(queue_id, state);
CREATE INDEX idx_woo_queue_line_woo_id ON woo_customer_sync_queue_line(queue_id, woo_customer_id);
CREATE INDEX idx_woo_queue_line_idempotency ON woo_customer_sync_queue_line(idempotency_token);
CREATE INDEX idx_woo_sync_activity_queue ON woo_sync_activity(queue_id, created_at DESC);
CREATE INDEX idx_woo_sync_activity_line ON woo_sync_activity(queue_line_id, created_at DESC);

-- Trigger: Update parent queue state based on line states
CREATE OR REPLACE FUNCTION update_woo_sync_queue_state()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE woo_customer_sync_queue
  SET
    draft_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'draft'),
    done_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'done'),
    failed_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'failed'),
    cancelled_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'cancelled'),
    updated_at = NOW()
  WHERE id = NEW.queue_id;

  -- Update queue state machine
  UPDATE woo_customer_sync_queue q
  SET state = CASE
    WHEN draft_count + cancelled_count = total_count THEN 'draft'
    WHEN draft_count = 0 AND failed_count = 0 THEN 'done'
    WHEN draft_count = 0 AND done_count = 0 AND failed_count > 0 THEN 'failed'
    ELSE 'partial'
  END
  WHERE id = NEW.queue_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS woo_sync_queue_line_state_change ON woo_customer_sync_queue_line;
CREATE TRIGGER woo_sync_queue_line_state_change
AFTER INSERT OR UPDATE ON woo_customer_sync_queue_line
FOR EACH ROW
EXECUTE FUNCTION update_woo_sync_queue_state();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON woo_customer_sync_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON woo_customer_sync_queue_line TO authenticated;
GRANT SELECT, INSERT ON woo_sync_activity TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
