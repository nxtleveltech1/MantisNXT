-- Migration: Add contact_person column to suppliers table
-- Date: 2025-10-28
-- Phase: A (Stabilization) - Critical Data Fix
-- Issue: Schema mismatch causing /api/inventory/complete route failures

BEGIN;

-- Add contact_person column to core.supplier table
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS contact_person JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN core.supplier.contact_person IS 'Primary contact person information (name, email, phone, title)';

-- Create index for JSONB queries on contact_person
CREATE INDEX IF NOT EXISTS idx_supplier_contact_person_gin
ON core.supplier USING GIN (contact_person);

-- Update any existing rows to have empty object instead of NULL
UPDATE core.supplier
SET contact_person = '{}'::jsonb
WHERE contact_person IS NULL;

COMMIT;

-- Verification query
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'supplier'
  AND column_name = 'contact_person';
