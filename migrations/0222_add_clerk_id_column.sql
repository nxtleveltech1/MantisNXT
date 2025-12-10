-- Migration: Add Clerk ID column to users_extended table
-- Purpose: Support Clerk authentication integration
-- Date: 2024-12-09

-- Add clerk_id column to auth.users_extended
ALTER TABLE auth.users_extended
ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE;

-- Create index for clerk_id lookups
CREATE INDEX IF NOT EXISTS idx_users_extended_clerk_id
ON auth.users_extended(clerk_id)
WHERE clerk_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN auth.users_extended.clerk_id IS 'Clerk authentication provider user ID';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, UPDATE ON auth.users_extended TO authenticated;

