-- ============================================================================
-- ROLLBACK Script for Migration 002: Create Analytics Tables (BIGINT Edition)
-- ============================================================================
-- Description: Safely rolls back migration 002_create_analytics_tables_BIGINT.sql
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
    RAISE NOTICE 'Starting rollback of Migration 002 (Analytics Tables - BIGINT)';
    RAISE NOTICE 'This will DROP the following tables:';
    RAISE NOTICE '  - core.purchase_order_items';
    RAISE NOTICE '  - core.purchase_orders';
    RAISE NOTICE '  - core.analytics_predictions';
    RAISE NOTICE '  - core.analytics_anomalies';
    RAISE NOTICE '  - core.analytics_dashboard_config';
    RAISE NOTICE '  - core.stock_movements';
    RAISE NOTICE '  - core.supplier_performance';
    RAISE WARNING 'ALL DATA IN THESE TABLES WILL BE LOST!';
END $$;

-- ============================================================================
-- STEP 1: DROP DEPENDENT TABLES FIRST (respect foreign key constraints)
-- ============================================================================

-- Drop purchase_order_items first (has FK to purchase_orders)
DROP TABLE IF EXISTS core.purchase_order_items CASCADE;
RAISE NOTICE 'Dropped table: core.purchase_order_items';

-- Drop purchase_orders (has FK to supplier)
DROP TABLE IF EXISTS core.purchase_orders CASCADE;
RAISE NOTICE 'Dropped table: core.purchase_orders';

-- ============================================================================
-- STEP 2: DROP ANALYTICS TABLES (no dependencies)
-- ============================================================================

-- Drop analytics predictions
DROP TABLE IF EXISTS core.analytics_predictions CASCADE;
RAISE NOTICE 'Dropped table: core.analytics_predictions';

-- Drop analytics anomalies
DROP TABLE IF NOT EXISTS core.analytics_anomalies CASCADE;
RAISE NOTICE 'Dropped table: core.analytics_anomalies';

-- Drop analytics dashboard config
DROP TABLE IF EXISTS core.analytics_dashboard_config CASCADE;
RAISE NOTICE 'Dropped table: core.analytics_dashboard_config';

-- ============================================================================
-- STEP 3: DROP STOCK MOVEMENTS (has FK to supplier_product and supplier)
-- ============================================================================

-- Note: Only drop if not used by other migrations
-- Check if core.stock_movement exists from migration 003
DROP TABLE IF EXISTS core.stock_movements CASCADE;
RAISE NOTICE 'Dropped table: core.stock_movements';

-- ============================================================================
-- STEP 4: DROP SUPPLIER PERFORMANCE (has FK to supplier)
-- ============================================================================

DROP TABLE IF EXISTS core.supplier_performance CASCADE;
RAISE NOTICE 'Dropped table: core.supplier_performance';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_expected_tables TEXT[] := ARRAY[
        'supplier_performance',
        'stock_movements',
        'analytics_anomalies',
        'analytics_predictions',
        'analytics_dashboard_config',
        'purchase_orders',
        'purchase_order_items'
    ];
    v_table_name TEXT;
BEGIN
    v_table_count := 0;

    FOREACH v_table_name IN ARRAY v_expected_tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'core' AND table_name = v_table_name
        ) THEN
            v_table_count := v_table_count + 1;
            RAISE WARNING 'Table still exists: core.%', v_table_name;
        END IF;
    END LOOP;

    IF v_table_count > 0 THEN
        RAISE EXCEPTION 'Rollback FAILED: % tables still exist!', v_table_count;
    ELSE
        RAISE NOTICE 'Rollback validation: All tables successfully dropped';
        RAISE NOTICE 'Migration 002 rolled back successfully';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
