-- 0039_fix_schema_migrations_duration_ms.sql
-- Add duration_ms column to schema_migrations for compatibility with migration-runner
-- and backfill legacy AI tagging tables with tag_proposal_id support

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

-- ---------------------------------------------------------------------------
-- AI Tagging compatibility patch
-- ---------------------------------------------------------------------------

-- Ensure tag_proposal_id exists on core.ai_tag_proposal
ALTER TABLE core.ai_tag_proposal
ADD COLUMN IF NOT EXISTS tag_proposal_id UUID;

-- Backfill tag_proposal_id from legacy proposal_id column when needed
UPDATE core.ai_tag_proposal
SET tag_proposal_id = proposal_id
WHERE tag_proposal_id IS NULL
  AND proposal_id IS NOT NULL;

-- Generate ids for any rows that still have NULL values
UPDATE core.ai_tag_proposal
SET tag_proposal_id = gen_random_uuid()
WHERE tag_proposal_id IS NULL;

-- Align defaults and nullability
ALTER TABLE core.ai_tag_proposal
ALTER COLUMN tag_proposal_id SET DEFAULT gen_random_uuid();

ALTER TABLE core.ai_tag_proposal
ALTER COLUMN tag_proposal_id SET NOT NULL;

-- Keep proposal_id and tag_proposal_id synchronized for legacy integrations
CREATE OR REPLACE FUNCTION core.sync_ai_tag_proposal_ids()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tag_proposal_id IS NULL THEN
        NEW.tag_proposal_id := NEW.proposal_id;
    END IF;

    IF NEW.proposal_id IS NULL THEN
        NEW.proposal_id := NEW.tag_proposal_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ai_tag_proposal_ids ON core.ai_tag_proposal;

CREATE TRIGGER trg_sync_ai_tag_proposal_ids
    BEFORE INSERT OR UPDATE ON core.ai_tag_proposal
    FOR EACH ROW
    EXECUTE FUNCTION core.sync_ai_tag_proposal_ids();

-- ---------------------------------------------------------------------------
-- AI Tag Proposal Product backfill and trigger logic
-- ---------------------------------------------------------------------------

-- Ensure tag_proposal_id column exists on core.ai_tag_proposal_product
ALTER TABLE core.ai_tag_proposal_product
ADD COLUMN IF NOT EXISTS tag_proposal_id UUID;

-- Backfill tag_proposal_id from proposal_id when present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'ai_tag_proposal_product'
          AND column_name = 'proposal_id'
    ) THEN
        -- Backfill via proposal_id -> ai_tag_proposal lookup
        UPDATE core.ai_tag_proposal_product tpp
        SET tag_proposal_id = tp.tag_proposal_id
        FROM core.ai_tag_proposal tp
        WHERE tpp.tag_proposal_id IS NULL
          AND tpp.proposal_id IS NOT NULL
          AND (
              tp.proposal_id = tpp.proposal_id
              OR tp.tag_proposal_id = tpp.proposal_id
          );
    END IF;
END $$;

-- Generate tag_proposal_id for any remaining NULL values by finding matching proposals
-- This handles cases where proposal_id might not exist or doesn't match
DO $$
DECLARE
    unmatched_count INTEGER;
BEGIN
    -- Try to match via job_id if available
    UPDATE core.ai_tag_proposal_product tpp
    SET tag_proposal_id = (
        SELECT tp.tag_proposal_id
        FROM core.ai_tag_proposal tp
        WHERE tp.last_seen_job_id = tpp.job_id
           OR tp.first_seen_job_id = tpp.job_id
        LIMIT 1
    )
    WHERE tpp.tag_proposal_id IS NULL
      AND tpp.job_id IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM core.ai_tag_proposal tp
          WHERE tp.last_seen_job_id = tpp.job_id
             OR tp.first_seen_job_id = tpp.job_id
      );

    -- For any remaining NULLs, we can't safely backfill without more context
    -- Log a warning but don't fail - these will need manual intervention
    SELECT COUNT(*) INTO unmatched_count
    FROM core.ai_tag_proposal_product
    WHERE tag_proposal_id IS NULL;

    IF unmatched_count > 0 THEN
        RAISE NOTICE 'Warning: % rows in ai_tag_proposal_product have NULL tag_proposal_id and could not be backfilled automatically', unmatched_count;
    END IF;
END $$;

-- Enforce NOT NULL constraint after backfill
-- Note: We don't set a default UUID here because it must reference an existing ai_tag_proposal
-- The trigger will validate and sync the value on insert/update
DO $$
BEGIN
    -- Only enforce NOT NULL if all rows have been backfilled
    IF NOT EXISTS (
        SELECT 1
        FROM core.ai_tag_proposal_product
        WHERE tag_proposal_id IS NULL
    ) THEN
        ALTER TABLE core.ai_tag_proposal_product
        ALTER COLUMN tag_proposal_id SET NOT NULL;
    END IF;
END $$;

-- Ensure FK constraint exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ai_tag_proposal_product_tag_proposal_id_fkey'
          AND conrelid = 'core.ai_tag_proposal_product'::regclass
    ) THEN
        ALTER TABLE core.ai_tag_proposal_product
            ADD CONSTRAINT ai_tag_proposal_product_tag_proposal_id_fkey
            FOREIGN KEY (tag_proposal_id)
            REFERENCES core.ai_tag_proposal(tag_proposal_id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- Sync function to keep proposal_id and tag_proposal_id aligned for legacy callers
CREATE OR REPLACE FUNCTION core.sync_ai_tag_proposal_product_ids()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tag_proposal_id IS NULL THEN
        -- Try to get from proposal_id if it exists
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'core'
              AND table_name = 'ai_tag_proposal_product'
              AND column_name = 'proposal_id'
        ) THEN
            IF NEW.proposal_id IS NOT NULL THEN
                SELECT tag_proposal_id INTO NEW.tag_proposal_id
                FROM core.ai_tag_proposal
                WHERE proposal_id = NEW.proposal_id
                   OR tag_proposal_id = NEW.proposal_id
                LIMIT 1;
            END IF;
        END IF;

        -- If still NULL after lookup attempts, raise error to prevent FK violation
        -- The application should provide a valid tag_proposal_id
        IF NEW.tag_proposal_id IS NULL THEN
            RAISE EXCEPTION 'tag_proposal_id is required and must reference an existing ai_tag_proposal';
        END IF;
    END IF;

    -- Sync proposal_id if it exists and is NULL
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'ai_tag_proposal_product'
          AND column_name = 'proposal_id'
    ) THEN
        IF NEW.proposal_id IS NULL AND NEW.tag_proposal_id IS NOT NULL THEN
            NEW.proposal_id := NEW.tag_proposal_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ai_tag_proposal_product_ids ON core.ai_tag_proposal_product;

CREATE TRIGGER trg_sync_ai_tag_proposal_product_ids
    BEFORE INSERT OR UPDATE ON core.ai_tag_proposal_product
    FOR EACH ROW
    EXECUTE FUNCTION core.sync_ai_tag_proposal_product_ids();

COMMIT;
