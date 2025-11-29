-- 0039_fix_schema_migrations_duration_ms.sql
-- Add duration_ms column to schema_migrations for compatibility with migration-runner

BEGIN;

-- Add duration_ms if it does not exist
ALTER TABLE schema_migrations
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Ensure status column exists (safety for older setups)
ALTER TABLE schema_migrations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Ensure error_message column exists (safety for older setups)
ALTER TABLE schema_migrations
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Ensure rollback_performed column exists (safety for older setups)
ALTER TABLE schema_migrations
ADD COLUMN IF NOT EXISTS rollback_performed BOOLEAN DEFAULT FALSE;

COMMIT;
