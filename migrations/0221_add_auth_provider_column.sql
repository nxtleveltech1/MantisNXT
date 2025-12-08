-- Migration: 0221_add_auth_provider_column.sql
-- Fix auth_provider column and constraint

-- Drop the broken constraint
ALTER TABLE auth.users_extended
DROP CONSTRAINT IF EXISTS auth_provider_not_empty;

-- Add auth_provider column if missing
ALTER TABLE auth.users_extended
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';

-- Update any existing NULLs
UPDATE auth.users_extended
SET auth_provider = 'local'
WHERE auth_provider IS NULL;

-- Set NOT NULL with default
ALTER TABLE auth.users_extended
ALTER COLUMN auth_provider SET DEFAULT 'local';

ALTER TABLE auth.users_extended
ALTER COLUMN auth_provider SET NOT NULL;