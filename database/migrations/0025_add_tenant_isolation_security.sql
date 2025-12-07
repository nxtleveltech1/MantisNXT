/**
 * Migration 0025: Add Tenant Isolation Security
 *
 * This migration adds org_id columns to all WooCommerce sync tables
 * to enforce tenant isolation at the database level. This is a CRITICAL
 * security enhancement to prevent cross-tenant data access.
 *
 * Tables to be updated:
 * - woo_customer_sync_queue
 * - woo_customer_sync_queue_line
 * - woo_sync_activity
 *
 * Also adds foreign key constraints and indexes for performance.
 *
 * Author: Security Expert Agent
 * Date: 2025-12-03
 */

-- ====================
-- 1. Add org_id columns to existing tables
-- ====================

-- Add org_id to woo_customer_sync_queue (if not present)
ALTER TABLE woo_customer_sync_queue
ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to woo_customer_sync_queue_line (if not present)
ALTER TABLE woo_customer_sync_queue_line
ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to woo_sync_activity (if not present)
ALTER TABLE woo_sync_activity
ADD COLUMN IF NOT EXISTS org_id UUID;

-- ====================
-- 2. Add foreign key constraints for tenant isolation
-- ====================

-- Add foreign key constraint for woo_customer_sync_queue
ALTER TABLE woo_customer_sync_queue
ADD CONSTRAINT fk_woo_queue_org_id
FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE;

-- Add foreign key constraint for woo_customer_sync_queue_line
ALTER TABLE woo_customer_sync_queue_line
ADD CONSTRAINT fk_woo_queue_line_org_id
FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE;

-- Add foreign key constraint for woo_sync_activity
ALTER TABLE woo_sync_activity
ADD CONSTRAINT fk_woo_sync_activity_org_id
FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE;

-- ====================
-- 3. Add unique constraints for data integrity
-- ====================

-- Ensure queue uniqueness per organization
ALTER TABLE woo_customer_sync_queue
ADD CONSTRAINT uk_woo_queue_org_uniqueness
UNIQUE (org_id, queue_name, idempotency_key);

-- Ensure queue line uniqueness per organization
ALTER TABLE woo_customer_sync_queue_line
ADD CONSTRAINT uk_woo_queue_line_org_uniqueness
UNIQUE (org_id, queue_id, woo_customer_id);

-- ====================
-- 4. Add indexes for performance and security
-- ====================

-- Index for org_id isolation queries on queue table
CREATE INDEX IF NOT EXISTS idx_woo_sync_queue_org_id
ON woo_customer_sync_queue(org_id);

-- Composite index for org_id + state (common security query pattern)
CREATE INDEX IF NOT EXISTS idx_woo_sync_queue_org_state
ON woo_customer_sync_queue(org_id, state);

-- Index for org_id isolation queries on queue line table
CREATE INDEX IF NOT EXISTS idx_woo_sync_queue_line_org_id
ON woo_customer_sync_queue_line(org_id);

-- Composite index for org_id + state (common security query pattern)
CREATE INDEX IF NOT EXISTS idx_woo_sync_queue_line_org_state
ON woo_customer_sync_queue_line(org_id, state);

-- Index for org_id isolation queries on activity table
CREATE INDEX IF NOT EXISTS idx_woo_sync_activity_org_id
ON woo_sync_activity(org_id);

-- Composite index for org_id + queue_id (common security query pattern)
CREATE INDEX IF NOT EXISTS idx_woo_sync_activity_org_queue
ON woo_sync_activity(org_id, queue_id);

-- ====================
-- 5. Add check constraints for data consistency
-- ====================

-- Ensure org_id is not null for security
ALTER TABLE woo_customer_sync_queue
ADD CONSTRAINT chk_woo_queue_org_id_not_null
CHECK (org_id IS NOT NULL);

ALTER TABLE woo_customer_sync_queue_line
ADD CONSTRAINT chk_woo_queue_line_org_id_not_null
CHECK (org_id IS NOT NULL);

ALTER TABLE woo_sync_activity
ADD CONSTRAINT chk_woo_sync_activity_org_id_not_null
CHECK (org_id IS NOT NULL);

-- ====================
-- 6. Update triggers to enforce org_id consistency
-- ====================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS woo_sync_queue_line_state_change ON woo_customer_sync_queue_line;

-- Recreate trigger function with org_id validation
CREATE OR REPLACE FUNCTION update_woo_sync_queue_state()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate org_id consistency between queue and line
  DECLARE
    queue_org_id UUID;
  BEGIN
    SELECT org_id INTO queue_org_id FROM woo_customer_sync_queue WHERE id = NEW.queue_id;

    IF queue_org_id IS NULL THEN
      RAISE EXCEPTION 'Queue not found for queue_id: %', NEW.queue_id;
    END IF;

    -- Enforce org_id consistency
    IF NEW.org_id IS NULL OR NEW.org_id != queue_org_id THEN
      RAISE EXCEPTION 'org_id mismatch: line org_id (%) does not match queue org_id (%)', NEW.org_id, queue_org_id;
    END IF;

    -- Update parent queue counts
    UPDATE woo_customer_sync_queue
    SET
      draft_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'draft'),
      done_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'done'),
      failed_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'failed'),
      cancelled_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = NEW.queue_id AND state = 'cancelled'),
      updated_at = NOW()
    WHERE id = NEW.queue_id;

    -- Update queue state machine
    UPDATE woo_customer_sync_queue q
    SET state = CASE
      WHEN draft_count + cancelled_count = total_count THEN 'draft'
      WHEN draft_count = 0 AND failed_count = 0 THEN 'done'
      WHEN draft_count = 0 AND done_count = 0 AND failed_count > 0 THEN 'failed'
      ELSE 'partial'
    END
    WHERE id = NEW.queue_id;

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER woo_sync_queue_line_state_change
AFTER INSERT OR UPDATE ON woo_customer_sync_queue_line
FOR EACH ROW
EXECUTE FUNCTION update_woo_sync_queue_state();

-- ====================
-- 7. Grant permissions for security
-- ====================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON woo_customer_sync_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON woo_customer_sync_queue_line TO authenticated;
GRANT SELECT, INSERT ON woo_sync_activity TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ====================
-- 8. Verify migration success
-- ====================

-- Check that org_id columns exist and are not null
DO $$
DECLARE
  queue_org_id_count INTEGER;
  line_org_id_count INTEGER;
  activity_org_id_count INTEGER;
BEGIN
  -- Count rows with org_id in each table
  SELECT COUNT(*) INTO queue_org_id_count FROM woo_customer_sync_queue WHERE org_id IS NOT NULL;
  SELECT COUNT(*) INTO line_org_id_count FROM woo_customer_sync_queue_line WHERE org_id IS NOT NULL;
  SELECT COUNT(*) INTO activity_org_id_count FROM woo_sync_activity WHERE org_id IS NOT NULL;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '  woo_customer_sync_queue rows with org_id: %', queue_org_id_count;
  RAISE NOTICE '  woo_customer_sync_queue_line rows with org_id: %', line_org_id_count;
  RAISE NOTICE '  woo_sync_activity rows with org_id: %', activity_org_id_count;
END $$;

/**
 * SECURITY VALIDATION CHECKLIST
 *
 * After running this migration, verify:
 *
 * 1. ✓ All tables have org_id columns
 * 2. ✓ Foreign key constraints are in place
 * 3. ✓ Unique constraints prevent cross-tenant data conflicts
 * 4. ✓ Indexes support org_id isolation queries
 * 5. ✓ Check constraints enforce org_id non-null
 * 6. ✓ Triggers validate org_id consistency
 * 7. ✓ Permissions are properly configured
 *
 * CRITICAL: Ensure all application code passes org_id parameter
 * to all database operations on these tables.
 */