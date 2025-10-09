-- ============================================================================
-- MantisNXT Database Schema Fixes - Phase 1 ROLLBACK
-- ============================================================================
-- Description: Complete rollback script for migration 003
-- WARNING: This will undo ALL changes from 003_critical_schema_fixes.sql
-- Author: Data Oracle
-- Date: 2025-10-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- BACKUP DATA BEFORE ROLLBACK
-- ============================================================================

-- Create backup schema if not exists
CREATE SCHEMA IF NOT EXISTS backup;

-- Backup brand table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'brand') THEN
    DROP TABLE IF EXISTS backup.brand_backup_20251008;
    CREATE TABLE backup.brand_backup_20251008 AS SELECT * FROM core.brand;
    RAISE NOTICE 'Brand data backed up to backup.brand_backup_20251008';
  END IF;
END $$;

-- Backup stock_movement table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'stock_movement') THEN
    DROP TABLE IF EXISTS backup.stock_movement_backup_20251008;
    CREATE TABLE backup.stock_movement_backup_20251008 AS SELECT * FROM core.stock_movement;
    RAISE NOTICE 'Stock movement data backed up to backup.stock_movement_backup_20251008';
  END IF;
END $$;

-- Backup stock_on_hand cost data
DO $$ BEGIN
  DROP TABLE IF EXISTS backup.stock_on_hand_cost_backup_20251008;
  CREATE TABLE backup.stock_on_hand_cost_backup_20251008 AS
  SELECT
    id,
    product_id,
    warehouse_id,
    cost_price,
    cost_method,
    last_cost_update_at,
    total_value
  FROM core.stock_on_hand
  WHERE cost_price IS NOT NULL;
  RAISE NOTICE 'Stock on hand cost data backed up';
END $$;

-- Backup supplier contact data
DO $$ BEGIN
  DROP TABLE IF EXISTS backup.suppliers_contact_backup_20251008;
  CREATE TABLE backup.suppliers_contact_backup_20251008 AS
  SELECT
    id,
    name,
    contact_phone,
    contact_email,
    website,
    payment_terms
  FROM core.suppliers
  WHERE contact_email IS NOT NULL
     OR contact_phone IS NOT NULL
     OR website IS NOT NULL;
  RAISE NOTICE 'Supplier contact data backed up';
END $$;

-- ============================================================================
-- SECTION 1: DROP MATERIALIZED VIEWS
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS core.mv_low_stock_alerts CASCADE;
RAISE NOTICE 'Dropped mv_low_stock_alerts';

DROP MATERIALIZED VIEW IF EXISTS core.mv_product_stock_summary CASCADE;
RAISE NOTICE 'Dropped mv_product_stock_summary';

DROP MATERIALIZED VIEW IF EXISTS core.mv_inventory_valuation CASCADE;
RAISE NOTICE 'Dropped mv_inventory_valuation';

DROP FUNCTION IF EXISTS core.refresh_all_inventory_views();
RAISE NOTICE 'Dropped refresh_all_inventory_views function';

-- ============================================================================
-- SECTION 2: DROP PERFORMANCE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS core.idx_suppliers_search;
DROP INDEX IF EXISTS core.idx_products_search;
DROP INDEX IF EXISTS core.idx_suppliers_name_lower;
DROP INDEX IF EXISTS core.idx_products_sku_lower;
DROP INDEX IF EXISTS core.idx_products_name_lower;
DROP INDEX IF EXISTS core.idx_stock_on_hand_valuation;
DROP INDEX IF EXISTS core.idx_products_active;
DROP INDEX IF EXISTS core.idx_suppliers_active;
DROP INDEX IF EXISTS core.idx_stock_on_hand_active;
RAISE NOTICE 'Dropped performance indexes';

-- ============================================================================
-- SECTION 3: REVERT FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Note: Reverting to original constraints without CASCADE
-- If original constraints didn't exist, these will fail silently

-- Products → Stock on Hand (remove CASCADE)
ALTER TABLE core.stock_on_hand
DROP CONSTRAINT IF EXISTS stock_on_hand_product_id_fkey;
ALTER TABLE core.stock_on_hand
ADD CONSTRAINT stock_on_hand_product_id_fkey
FOREIGN KEY (product_id) REFERENCES core.products(id);

-- Products → Stock Movement (will be dropped with table)
-- No action needed

-- Warehouses → Stock on Hand (remove RESTRICT)
ALTER TABLE core.stock_on_hand
DROP CONSTRAINT IF EXISTS stock_on_hand_warehouse_id_fkey;
ALTER TABLE core.stock_on_hand
ADD CONSTRAINT stock_on_hand_warehouse_id_fkey
FOREIGN KEY (warehouse_id) REFERENCES core.warehouses(id);

-- Brand → Products (will be dropped with brand table)
ALTER TABLE core.products
DROP CONSTRAINT IF EXISTS products_brand_id_fkey;
-- Don't recreate - table will be dropped

RAISE NOTICE 'Reverted foreign key constraints';

-- ============================================================================
-- SECTION 4: DROP TRIGGERS AND FUNCTIONS
-- ============================================================================

DROP TRIGGER IF EXISTS stock_movement_update_cost ON core.stock_movement;
DROP FUNCTION IF EXISTS core.update_stock_cost_on_movement();
RAISE NOTICE 'Dropped cost update trigger and function';

DROP TRIGGER IF EXISTS brand_update_timestamp ON core.brand;
DROP FUNCTION IF EXISTS core.update_brand_timestamp();
RAISE NOTICE 'Dropped brand timestamp trigger and function';

-- ============================================================================
-- SECTION 5: REVERT SUPPLIER CONTACT FIELDS
-- ============================================================================

ALTER TABLE core.suppliers
DROP CONSTRAINT IF EXISTS suppliers_website_format;
ALTER TABLE core.suppliers
DROP CONSTRAINT IF EXISTS suppliers_phone_format;
ALTER TABLE core.suppliers
DROP CONSTRAINT IF EXISTS suppliers_email_format;

DROP INDEX IF EXISTS core.idx_suppliers_phone;
DROP INDEX IF EXISTS core.idx_suppliers_email;

ALTER TABLE core.suppliers
DROP COLUMN IF EXISTS payment_terms,
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS contact_email,
DROP COLUMN IF EXISTS contact_phone;

RAISE NOTICE 'Reverted supplier contact fields';

-- ============================================================================
-- SECTION 6: REVERT STOCK_ON_HAND COST COLUMNS
-- ============================================================================

ALTER TABLE core.stock_on_hand
DROP CONSTRAINT IF EXISTS stock_on_hand_cost_positive;

ALTER TABLE core.stock_on_hand
DROP COLUMN IF EXISTS total_value,
DROP COLUMN IF EXISTS last_cost_update_at,
DROP COLUMN IF EXISTS cost_method,
DROP COLUMN IF EXISTS cost_price;

RAISE NOTICE 'Reverted stock_on_hand cost columns';

-- ============================================================================
-- SECTION 7: DROP STOCK_MOVEMENT TABLE
-- ============================================================================

-- Remove brand_id foreign key from products before dropping brand table
UPDATE core.products SET brand_id = NULL WHERE brand_id IS NOT NULL;

DROP TABLE IF EXISTS core.stock_movement CASCADE;
RAISE NOTICE 'Dropped stock_movement table';

-- ============================================================================
-- SECTION 8: DROP BRAND TABLE
-- ============================================================================

DROP INDEX IF EXISTS core.idx_brand_metadata;
DROP INDEX IF EXISTS core.idx_brand_active;
DROP INDEX IF EXISTS core.idx_brand_code_unique;
DROP INDEX IF EXISTS core.idx_brand_name_unique;

DROP TABLE IF EXISTS core.brand CASCADE;
RAISE NOTICE 'Dropped brand table';

-- ============================================================================
-- SECTION 9: DROP ENUMS
-- ============================================================================

DROP TYPE IF EXISTS core.cost_method CASCADE;
RAISE NOTICE 'Dropped cost_method enum';

DROP TYPE IF EXISTS core.reference_type CASCADE;
RAISE NOTICE 'Dropped reference_type enum';

DROP TYPE IF EXISTS core.movement_type CASCADE;
RAISE NOTICE 'Dropped movement_type enum';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
  v_brand_exists BOOLEAN;
  v_stock_movement_exists BOOLEAN;
  v_cost_price_exists BOOLEAN;
BEGIN
  -- Check tables dropped
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'brand'
  ) INTO v_brand_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'stock_movement'
  ) INTO v_stock_movement_exists;

  -- Check columns dropped
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'stock_on_hand'
      AND column_name = 'cost_price'
  ) INTO v_cost_price_exists;

  RAISE NOTICE 'Brand table exists: %', v_brand_exists;
  RAISE NOTICE 'Stock movement table exists: %', v_stock_movement_exists;
  RAISE NOTICE 'Cost price column exists: %', v_cost_price_exists;

  IF v_brand_exists OR v_stock_movement_exists OR v_cost_price_exists THEN
    RAISE WARNING 'Some objects still exist after rollback!';
  ELSE
    RAISE NOTICE 'Rollback completed successfully';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK NOTES
-- ============================================================================

-- Backup data is stored in:
-- - backup.brand_backup_20251008
-- - backup.stock_movement_backup_20251008
-- - backup.stock_on_hand_cost_backup_20251008
-- - backup.suppliers_contact_backup_20251008

-- To restore data if needed:
-- 1. Re-run the forward migration: 003_critical_schema_fixes.sql
-- 2. Restore from backup tables

-- To permanently delete backup data:
-- DROP TABLE IF EXISTS backup.brand_backup_20251008;
-- DROP TABLE IF EXISTS backup.stock_movement_backup_20251008;
-- DROP TABLE IF EXISTS backup.stock_on_hand_cost_backup_20251008;
-- DROP TABLE IF EXISTS backup.suppliers_contact_backup_20251008;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
