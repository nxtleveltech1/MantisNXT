-- =====================================================
-- XERO ACCOUNTING INTEGRATION
-- =====================================================
-- Migration: 0257_xero_integration.sql
-- Description: Creates tables for Xero OAuth connections,
--              entity mappings, account mappings, and sync logging
-- Author: System
-- Date: 2026-01-13
-- up

-- =====================================================
-- 1. XERO OAUTH CONNECTIONS
-- =====================================================
-- Stores OAuth tokens per organization for Xero tenants
CREATE TABLE IF NOT EXISTS xero_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  xero_tenant_id TEXT NOT NULL,
  xero_tenant_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT xero_connections_org_tenant_unique UNIQUE(org_id, xero_tenant_id)
);

-- Index for quick org lookups
CREATE INDEX IF NOT EXISTS idx_xero_connections_org_id ON xero_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_xero_connections_active ON xero_connections(org_id, is_active) WHERE is_active = true;

COMMENT ON TABLE xero_connections IS 'Stores Xero OAuth 2.0 tokens per organization. Tokens are encrypted at application layer.';
COMMENT ON COLUMN xero_connections.xero_tenant_id IS 'Xero tenant/organization ID from OAuth flow';
COMMENT ON COLUMN xero_connections.access_token IS 'Encrypted access token (30 min expiry)';
COMMENT ON COLUMN xero_connections.refresh_token IS 'Encrypted refresh token (60 day sliding window)';

-- =====================================================
-- 2. XERO ENTITY MAPPINGS
-- =====================================================
-- Maps NXT entity IDs to Xero entity IDs for sync tracking
CREATE TABLE IF NOT EXISTS xero_entity_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  nxt_entity_id UUID NOT NULL,
  xero_entity_id TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error', 'deleted')),
  last_synced_at TIMESTAMPTZ,
  xero_updated_date_utc TIMESTAMPTZ,
  sync_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT xero_entity_mappings_unique UNIQUE(org_id, entity_type, nxt_entity_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_xero_entity_mappings_org_type ON xero_entity_mappings(org_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_xero_entity_mappings_xero_id ON xero_entity_mappings(xero_entity_id);
CREATE INDEX IF NOT EXISTS idx_xero_entity_mappings_nxt_id ON xero_entity_mappings(nxt_entity_id);
CREATE INDEX IF NOT EXISTS idx_xero_entity_mappings_pending ON xero_entity_mappings(org_id, sync_status) WHERE sync_status = 'pending';

COMMENT ON TABLE xero_entity_mappings IS 'Maps NXT entities to their Xero counterparts for bidirectional sync';
COMMENT ON COLUMN xero_entity_mappings.entity_type IS 'Type of entity: contact, invoice, item, payment, purchase_order, quote, credit_note';
COMMENT ON COLUMN xero_entity_mappings.sync_hash IS 'Hash of last synced data to detect changes';

-- =====================================================
-- 3. XERO ACCOUNT MAPPINGS
-- =====================================================
-- User-configurable mapping of NXT transaction types to Xero account codes
CREATE TABLE IF NOT EXISTS xero_account_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  mapping_key TEXT NOT NULL,
  xero_account_id TEXT NOT NULL,
  xero_account_code TEXT NOT NULL,
  xero_account_name TEXT,
  xero_account_type TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT xero_account_mappings_unique UNIQUE(org_id, mapping_key)
);

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_xero_account_mappings_org ON xero_account_mappings(org_id);

COMMENT ON TABLE xero_account_mappings IS 'Maps NXT transaction types to Xero chart of accounts';
COMMENT ON COLUMN xero_account_mappings.mapping_key IS 'NXT mapping key: sales_revenue, cogs, shipping_revenue, inventory_asset, etc.';

-- =====================================================
-- 4. XERO SYNC LOG
-- =====================================================
-- Audit trail for all sync operations
CREATE TABLE IF NOT EXISTS xero_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  nxt_entity_id UUID,
  xero_entity_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'fetch', 'batch_sync')),
  direction TEXT NOT NULL CHECK (direction IN ('to_xero', 'from_xero', 'bidirectional')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped', 'partial')),
  error_message TEXT,
  error_code TEXT,
  request_payload JSONB,
  response_payload JSONB,
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Indexes for log queries
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_org ON xero_sync_log(org_id);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_entity ON xero_sync_log(org_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_status ON xero_sync_log(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_created ON xero_sync_log(created_at DESC);

-- Partial index for errors (for quick error review)
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_errors ON xero_sync_log(org_id, created_at DESC) WHERE status = 'error';

COMMENT ON TABLE xero_sync_log IS 'Audit trail for all Xero synchronization operations';

-- =====================================================
-- 5. XERO WEBHOOK EVENTS
-- =====================================================
-- Stores incoming webhook events for processing
CREATE TABLE IF NOT EXISTS xero_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_event_id TEXT UNIQUE,
  resource_id TEXT NOT NULL,
  resource_url TEXT,
  event_category TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date_utc TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL,
  payload JSONB,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'skipped')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook processing
CREATE INDEX IF NOT EXISTS idx_xero_webhook_events_tenant ON xero_webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_webhook_events_pending ON xero_webhook_events(processing_status, created_at) WHERE processing_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_xero_webhook_events_resource ON xero_webhook_events(resource_id);

COMMENT ON TABLE xero_webhook_events IS 'Stores incoming Xero webhook events for async processing';

-- =====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION xero_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_xero_connections_updated_at
  BEFORE UPDATE ON xero_connections
  FOR EACH ROW EXECUTE FUNCTION xero_update_updated_at();

CREATE TRIGGER trigger_xero_entity_mappings_updated_at
  BEFORE UPDATE ON xero_entity_mappings
  FOR EACH ROW EXECUTE FUNCTION xero_update_updated_at();

CREATE TRIGGER trigger_xero_account_mappings_updated_at
  BEFORE UPDATE ON xero_account_mappings
  FOR EACH ROW EXECUTE FUNCTION xero_update_updated_at();

-- =====================================================
-- 7. DEFAULT ACCOUNT MAPPING KEYS
-- =====================================================
-- Insert default mapping keys (values to be configured by user)
-- This is a reference table, actual mappings created when user connects

CREATE TABLE IF NOT EXISTS xero_account_mapping_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mapping_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  default_xero_account_code TEXT,
  xero_account_type TEXT,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO xero_account_mapping_defaults (mapping_key, display_name, description, default_xero_account_code, xero_account_type, is_required, sort_order)
VALUES
  ('sales_revenue', 'Sales Revenue', 'Revenue from product sales', '200', 'REVENUE', true, 1),
  ('service_revenue', 'Service Revenue', 'Revenue from services (repairs, rentals)', '200', 'REVENUE', false, 2),
  ('rental_revenue', 'Rental Revenue', 'Revenue from equipment rentals', '200', 'REVENUE', false, 3),
  ('shipping_revenue', 'Shipping Revenue', 'Revenue from shipping charges', '260', 'REVENUE', false, 4),
  ('cost_of_goods_sold', 'Cost of Goods Sold', 'Direct costs of products sold', '300', 'DIRECTCOSTS', true, 5),
  ('shipping_expense', 'Shipping Expense', 'Outbound shipping costs', '429', 'EXPENSE', false, 6),
  ('inventory_asset', 'Inventory Asset', 'Inventory on hand', '630', 'INVENTORY', false, 7),
  ('accounts_receivable', 'Accounts Receivable', 'Customer amounts owed', '610', 'CURRENT', true, 8),
  ('accounts_payable', 'Accounts Payable', 'Supplier amounts owed', '800', 'CURRLIAB', true, 9),
  ('deposits_received', 'Customer Deposits', 'Security deposits and prepayments received', '820', 'CURRLIAB', false, 10),
  ('bank_account', 'Primary Bank Account', 'Main operating bank account', '090', 'BANK', true, 11)
ON CONFLICT (mapping_key) DO NOTHING;

COMMENT ON TABLE xero_account_mapping_defaults IS 'Reference table of available account mapping keys with defaults';

-- =====================================================
-- 8. RECORD MIGRATION
-- =====================================================
INSERT INTO schema_migrations (migration_name)
VALUES ('0257_xero_integration')
ON CONFLICT (migration_name) DO NOTHING;

-- =====================================================
-- DOWN MIGRATION (for rollback)
-- =====================================================
-- To rollback:
-- DROP TABLE IF EXISTS xero_webhook_events CASCADE;
-- DROP TABLE IF EXISTS xero_sync_log CASCADE;
-- DROP TABLE IF EXISTS xero_account_mapping_defaults CASCADE;
-- DROP TABLE IF EXISTS xero_account_mappings CASCADE;
-- DROP TABLE IF EXISTS xero_entity_mappings CASCADE;
-- DROP TABLE IF EXISTS xero_connections CASCADE;
-- DROP FUNCTION IF EXISTS xero_update_updated_at() CASCADE;
-- DELETE FROM schema_migrations WHERE migration_name = '0257_xero_integration';
