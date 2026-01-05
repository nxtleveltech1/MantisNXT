-- Migration: 0226_supplier_json_feed.sql
-- Description: Add JSON feed sync capability and base discount fields to suppliers
-- Date: 2024-12-17

-- ============================================================================
-- ADD JSON FEED COLUMNS TO SUPPLIER TABLE
-- ============================================================================

-- JSON Feed URL/API endpoint for pulling supplier data
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS json_feed_url TEXT;

-- Enable/disable JSON feed sync
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS json_feed_enabled BOOLEAN NOT NULL DEFAULT false;

-- Sync interval in minutes (e.g., 15, 30, 60, 240, 1440)
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS json_feed_interval_minutes INTEGER NOT NULL DEFAULT 60;

-- Last successful sync timestamp
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS json_feed_last_sync TIMESTAMPTZ;

-- Last sync status (success, error, message details)
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS json_feed_last_status JSONB;

-- Feed type to identify the JSON structure (e.g., 'woocommerce', 'stage_one', 'custom')
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS json_feed_type VARCHAR(50) DEFAULT 'woocommerce';

-- Base discount percentage for the supplier
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS base_discount_percent DECIMAL(5, 2) DEFAULT 0;

-- ============================================================================
-- JSON FEED SYNC LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.supplier_json_feed_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, success, error
  products_fetched INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB, -- Additional sync details
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_supplier_json_feed_log_supplier 
ON core.supplier_json_feed_log(supplier_id, sync_started_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN core.supplier.json_feed_url IS 'URL or API endpoint for JSON product feed';
COMMENT ON COLUMN core.supplier.json_feed_enabled IS 'Whether automatic JSON feed sync is enabled';
COMMENT ON COLUMN core.supplier.json_feed_interval_minutes IS 'How often to sync in minutes (15, 30, 60, 240, 1440)';
COMMENT ON COLUMN core.supplier.json_feed_last_sync IS 'Timestamp of last successful sync';
COMMENT ON COLUMN core.supplier.json_feed_last_status IS 'Status details of last sync attempt';
COMMENT ON COLUMN core.supplier.json_feed_type IS 'Type of JSON feed format (woocommerce, stage_one, custom)';
COMMENT ON COLUMN core.supplier.base_discount_percent IS 'Default discount percentage applied to all products from this supplier';

COMMENT ON TABLE core.supplier_json_feed_log IS 'Audit log for supplier JSON feed sync operations';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON core.supplier_json_feed_log TO authenticated;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

DO $$
BEGIN
  -- Verify columns were added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'core' AND table_name = 'supplier' AND column_name = 'json_feed_url'
  ) THEN
    RAISE EXCEPTION 'Migration failed: json_feed_url column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'core' AND table_name = 'supplier' AND column_name = 'base_discount_percent'
  ) THEN
    RAISE EXCEPTION 'Migration failed: base_discount_percent column not created';
  END IF;
  
  RAISE NOTICE 'Migration 0226_supplier_json_feed completed successfully';
END $$;

