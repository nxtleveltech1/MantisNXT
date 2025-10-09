-- ============================================================================
-- ROLLBACK Script for Migration 001: Create Pricelist Tables (BIGINT Edition)
-- ============================================================================
-- Description: Safely rolls back migration 001_create_pricelist_tables_BIGINT.sql
-- ADR Reference: ADR-1 (Migration File Rewrite - BIGINT Strategy)
-- Author: Aster (Full-Stack Architect)
-- Date: 2025-10-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- SAFETY CHECK: Verify we're rolling back the correct migration
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting rollback of Migration 001 (Pricelist Tables - BIGINT)';
    RAISE NOTICE 'This will DROP the following tables:';
    RAISE NOTICE '  - core.pricelist_items';
    RAISE NOTICE '  - core.supplier_pricelists';
    RAISE WARNING 'ALL DATA IN THESE TABLES WILL BE LOST!';
END $$;

-- ============================================================================
-- STEP 1: DROP DEPENDENT TABLES FIRST (respect foreign key constraints)
-- ============================================================================

-- Drop pricelist_items first (has FK to supplier_pricelists)
DROP TABLE IF EXISTS core.pricelist_items CASCADE;
RAISE NOTICE 'Dropped table: core.pricelist_items';

-- ============================================================================
-- STEP 2: DROP PARENT TABLES
-- ============================================================================

-- Drop supplier_pricelists
DROP TABLE IF EXISTS core.supplier_pricelists CASCADE;
RAISE NOTICE 'Dropped table: core.supplier_pricelists';

-- ============================================================================
-- STEP 3: DROP TRIGGER FUNCTION (only if not used elsewhere)
-- ============================================================================

-- Note: We DO NOT drop core.update_updated_at_column() as it may be used
-- by other tables. Only drop if you're certain no other tables use it.

-- Uncomment the following lines ONLY if no other tables use this function:
-- DROP FUNCTION IF EXISTS core.update_updated_at_column() CASCADE;
-- RAISE NOTICE 'Dropped function: core.update_updated_at_column()';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_pricelists_exists BOOLEAN;
    v_items_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'core' AND table_name = 'supplier_pricelists'
    ) INTO v_pricelists_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'core' AND table_name = 'pricelist_items'
    ) INTO v_items_exists;

    IF v_pricelists_exists OR v_items_exists THEN
        RAISE EXCEPTION 'Rollback FAILED: Tables still exist!';
    ELSE
        RAISE NOTICE 'Rollback validation: Tables successfully dropped';
        RAISE NOTICE 'Migration 001 rolled back successfully';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
