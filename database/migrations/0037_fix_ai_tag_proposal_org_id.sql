-- 0037_fix_ai_tag_proposal_org_id.sql
-- Add missing org_id column to core.ai_tag_proposal table if it doesn't exist
-- This ensures compatibility with TaggingEngine code that expects org_id

BEGIN;

-- Add org_id column if it doesn't exist
ALTER TABLE core.ai_tag_proposal
ADD COLUMN IF NOT EXISTS org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add unique constraint on (org_id, normalized_name) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ai_tag_proposal_org_name_uniq'
        AND conrelid = 'core.ai_tag_proposal'::regclass
    ) THEN
        ALTER TABLE core.ai_tag_proposal
        ADD CONSTRAINT ai_tag_proposal_org_name_uniq
        UNIQUE (org_id, normalized_name);
    END IF;
END $$;

COMMIT;