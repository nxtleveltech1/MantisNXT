-- ============================================================================
-- Add created_by Column to stock_movement Table
-- ============================================================================
-- Description: Add user tracking column for audit trail
-- Date: 2025-10-13
-- ============================================================================

BEGIN;

-- Add created_by column for audit tracking
DO $$ BEGIN
  ALTER TABLE core.stock_movement
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index for filtering by creator
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_by
  ON core.stock_movement(created_by);

-- Add comment
COMMENT ON COLUMN core.stock_movement.created_by IS 'User or system that created the stock movement record';

-- Validation
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'stock_movement'
      AND column_name = 'created_by'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'Failed to add created_by column to stock_movement table';
  END IF;

  RAISE NOTICE '✅ created_by column added successfully to core.stock_movement';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
