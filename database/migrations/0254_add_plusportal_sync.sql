-- Migration: 0254_add_plusportal_sync.sql
-- Description: Add PlusPortal automated sync capability for suppliers
-- Date: 2024-12-20

-- ============================================================================
-- ADD PLUSPORTAL COLUMNS TO SUPPLIER TABLE
-- ============================================================================

-- Enable/disable PlusPortal sync
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS plusportal_enabled BOOLEAN NOT NULL DEFAULT false;

-- PlusPortal username
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS plusportal_username TEXT;

-- PlusPortal password (encrypted)
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS plusportal_password_encrypted TEXT;

-- Sync interval in minutes (e.g., 15, 30, 60, 240, 1440)
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS plusportal_interval_minutes INTEGER NOT NULL DEFAULT 1440;

-- Last successful sync timestamp
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS plusportal_last_sync TIMESTAMPTZ;

-- ============================================================================
-- PLUSPORTAL SYNC LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.plusportal_sync_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, failed
  csv_downloaded BOOLEAN NOT NULL DEFAULT false,
  products_processed INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_skipped INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_plusportal_sync_log_supplier 
ON core.plusportal_sync_log(supplier_id, sync_started_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN core.supplier.plusportal_enabled IS 'Whether automatic PlusPortal sync is enabled';
COMMENT ON COLUMN core.supplier.plusportal_username IS 'PlusPortal login username';
COMMENT ON COLUMN core.supplier.plusportal_password_encrypted IS 'Encrypted PlusPortal password';
COMMENT ON COLUMN core.supplier.plusportal_interval_minutes IS 'How often to sync in minutes (15, 30, 60, 240, 1440)';
COMMENT ON COLUMN core.supplier.plusportal_last_sync IS 'Timestamp of last successful PlusPortal sync';

COMMENT ON TABLE core.plusportal_sync_log IS 'Audit log for PlusPortal sync operations';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON core.plusportal_sync_log TO authenticated;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

DO $$
BEGIN
  -- Verify columns were added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'core' AND table_name = 'supplier' AND column_name = 'plusportal_enabled'
  ) THEN
    RAISE EXCEPTION 'Migration failed: plusportal_enabled column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'core' AND table_name = 'plusportal_sync_log'
  ) THEN
    RAISE EXCEPTION 'Migration failed: plusportal_sync_log table not created';
  END IF;
  
  RAISE NOTICE 'Migration 0254_add_plusportal_sync completed successfully';
END $$;

