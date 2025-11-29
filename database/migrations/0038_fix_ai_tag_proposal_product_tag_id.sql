-- 0038_fix_ai_tag_proposal_product_tag_id.sql
-- Align ai_tag_proposal_product with application expectations (tag_proposal_id, resolved_at, sync trigger)

BEGIN;

-- Add tag_proposal_id if missing (legacy schema used proposal_id)
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
        EXECUTE '
          UPDATE core.ai_tag_proposal_product
          SET tag_proposal_id = proposal_id
          WHERE tag_proposal_id IS NULL AND proposal_id IS NOT NULL
        ';

        -- Make proposal_id nullable to allow inserts that only provide tag_proposal_id
        EXECUTE '
          ALTER TABLE core.ai_tag_proposal_product
          ALTER COLUMN proposal_id DROP NOT NULL
        ';
    END IF;
END $$;

-- Enforce tag_proposal_id presence once backfilled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'ai_tag_proposal_product'
          AND column_name = 'tag_proposal_id'
    ) THEN
        EXECUTE '
          ALTER TABLE core.ai_tag_proposal_product
          ALTER COLUMN tag_proposal_id SET NOT NULL
        ';
    END IF;
END $$;

-- Add resolved_at for completeness (matches proposal and code expectations)
ALTER TABLE core.ai_tag_proposal_product
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL;

-- Add FK on tag_proposal_id if missing
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

-- Ensure ON CONFLICT (supplier_product_id, tag_proposal_id) is supported
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ai_tag_proposal_product_supplier_product_tag_proposal_uniq'
          AND conrelid = 'core.ai_tag_proposal_product'::regclass
    ) THEN
        ALTER TABLE core.ai_tag_proposal_product
            ADD CONSTRAINT ai_tag_proposal_product_supplier_product_tag_proposal_uniq
            UNIQUE (supplier_product_id, tag_proposal_id);
    END IF;
END $$;

-- Index for tag_proposal_id lookups (idempotent)
CREATE INDEX IF NOT EXISTS idx_ai_tag_proposal_product_tag_proposal
    ON core.ai_tag_proposal_product (tag_proposal_id);

-- Sync function to keep proposal_id and tag_proposal_id aligned for legacy callers
CREATE OR REPLACE FUNCTION core.sync_ai_tag_proposal_product_ids()
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

DROP TRIGGER IF EXISTS trg_sync_ai_tag_proposal_product_ids ON core.ai_tag_proposal_product;

CREATE TRIGGER trg_sync_ai_tag_proposal_product_ids
    BEFORE INSERT OR UPDATE ON core.ai_tag_proposal_product
    FOR EACH ROW
    EXECUTE FUNCTION core.sync_ai_tag_proposal_product_ids();

COMMIT;
