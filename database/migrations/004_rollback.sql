-- ============================================================================
-- MantisNXT Database Migration Rollback - Purchase Orders Table
-- ============================================================================
-- Migration: 004
-- Description: Rollback purchase_orders and purchase_order_items tables
-- Author: Data Oracle
-- Date: 2025-10-09
-- ============================================================================

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS po_items_check_completion ON core.purchase_order_items;
DROP TRIGGER IF EXISTS po_items_update_totals ON core.purchase_order_items;
DROP TRIGGER IF EXISTS po_items_update_timestamp ON core.purchase_order_items;
DROP TRIGGER IF EXISTS purchase_orders_update_timestamp ON core.purchase_orders;

-- Drop functions
DROP FUNCTION IF EXISTS core.check_purchase_order_completion() CASCADE;
DROP FUNCTION IF EXISTS core.update_purchase_order_totals() CASCADE;
DROP FUNCTION IF EXISTS core.update_po_item_timestamp() CASCADE;
DROP FUNCTION IF EXISTS core.update_purchase_order_timestamp() CASCADE;
DROP FUNCTION IF EXISTS core.get_purchase_order_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS core.generate_po_number(VARCHAR) CASCADE;

-- Drop tables (cascade will remove foreign keys)
DROP TABLE IF EXISTS core.purchase_order_items CASCADE;
DROP TABLE IF EXISTS core.purchase_orders CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS core.purchase_order_status CASCADE;

-- Verify cleanup
DO $$
DECLARE
  v_po_exists BOOLEAN;
  v_poi_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'purchase_orders'
  ) INTO v_po_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'purchase_order_items'
  ) INTO v_poi_exists;

  IF v_po_exists OR v_poi_exists THEN
    RAISE EXCEPTION 'Rollback failed - tables still exist';
  END IF;

  RAISE NOTICE 'Rollback completed successfully';
END $$;

COMMIT;
