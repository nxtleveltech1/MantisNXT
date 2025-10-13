-- ============================================================================
-- Fix created_by Column Default Value
-- ============================================================================
-- Description: Set default value for created_by column
-- Date: 2025-10-13
-- ============================================================================

BEGIN;

-- Set default value for created_by column
ALTER TABLE core.stock_movement
  ALTER COLUMN created_by SET DEFAULT 'system';

-- Update existing NULL values to 'system'
UPDATE core.stock_movement
SET created_by = 'system'
WHERE created_by IS NULL;

-- Add NOT NULL constraint
ALTER TABLE core.stock_movement
  ALTER COLUMN created_by SET NOT NULL;

-- Validation
DO $$
DECLARE
  v_default_value TEXT;
  v_is_nullable TEXT;
BEGIN
  SELECT column_default, is_nullable
  INTO v_default_value, v_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'core'
    AND table_name = 'stock_movement'
    AND column_name = 'created_by';

  IF v_default_value IS NULL OR v_is_nullable = 'YES' THEN
    RAISE EXCEPTION 'Failed to set created_by column constraints';
  END IF;

  RAISE NOTICE '✅ created_by column default and NOT NULL constraint set successfully';
  RAISE NOTICE '   Default: %', v_default_value;
  RAISE NOTICE '   Nullable: %', v_is_nullable;
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
