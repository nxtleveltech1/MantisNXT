-- Migration 007: Add Missing Supplier Columns
-- Date: 2025-10-10
-- Purpose: Add contact_person and related index to core.supplier

-- Add contact_person column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'contact_person'
  ) THEN
    ALTER TABLE core.supplier
    ADD COLUMN contact_person TEXT;
    RAISE NOTICE 'Added contact_person column to core.supplier';
  ELSE
    RAISE NOTICE 'contact_person column already exists';
  END IF;
END $$;

-- Add index for contact_person searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_contact_person
ON core.supplier (contact_person)
WHERE contact_person IS NOT NULL;

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'supplier'
  AND column_name = 'contact_person';

