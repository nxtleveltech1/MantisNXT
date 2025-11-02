-- ============================================================================
-- LOYALTY SCHEMA FIXES - Pre-migration compatibility
-- ============================================================================
-- Adds missing columns to existing loyalty tables
-- ============================================================================

BEGIN;

-- Add missing column to reward_catalog
ALTER TABLE reward_catalog
ADD COLUMN IF NOT EXISTS redemption_count integer DEFAULT 0;

-- Add missing column to loyalty_transaction (metadata)
ALTER TABLE loyalty_transaction
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Update existing redemption_count from actual data
UPDATE reward_catalog rc
SET redemption_count = (
    SELECT COUNT(*)
    FROM reward_redemption rr
    WHERE rr.reward_id = rc.id
    AND rr.status NOT IN ('cancelled', 'expired')
)
WHERE redemption_count IS NULL OR redemption_count = 0;

COMMIT;

SELECT 'Schema fixes applied successfully' AS status;
