-- 0034_add_metadata_to_stock_location.sql
-- Add missing metadata column to existing stock_location table

BEGIN;

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'stock_location'
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE core.stock_location
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE 'Added metadata column to core.stock_location';
    ELSE
        RAISE NOTICE 'metadata column already exists in core.stock_location';
    END IF;
END $$;

COMMIT;
