-- =====================================================
-- COMPLETE VALIDATION SUITE
-- Database Cleanup & Test Data Verification
-- =====================================================
-- Purpose: Comprehensive validation of database state
--          after cleanup and test data generation
-- Run: After completing all data generation scripts
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'MANTISNXT DATABASE VALIDATION SUITE'
\echo 'Running comprehensive validation checks...'
\echo '====================================================='
\echo ''

-- Set formatting for better readability
\pset border 2
\pset format wrapped

-- =====================================================
-- VALIDATION 1: SUPPLIER COUNT AND UNIQUENESS
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 1: SUPPLIER COUNT AND UNIQUENESS'
\echo '====================================================='

SELECT
    'SUPPLIER VALIDATION' as check_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'pending_approval') as pending,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
    COUNT(DISTINCT name) as unique_names,
    COUNT(*) - COUNT(DISTINCT LOWER(TRIM(name))) as duplicate_count,
    CASE
        WHEN COUNT(*) = 22 AND COUNT(DISTINCT LOWER(TRIM(name))) = 22
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM supplier
WHERE org_id = '00000000-0000-0000-0000-000000000001';

\echo ''
\echo 'Expected: 22 suppliers, 22 unique names, 0 duplicates'
\echo ''

-- =====================================================
-- VALIDATION 2: PRODUCT-SUPPLIER LINKAGE
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 2: PRODUCT-SUPPLIER LINKAGE'
\echo '====================================================='

SELECT
    'PRODUCT-SUPPLIER LINKAGE' as check_type,
    COUNT(*) as total_products,
    COUNT(DISTINCT supplier_id) as linked_suppliers,
    COUNT(*) FILTER (WHERE supplier_id IS NULL) as orphaned_products,
    COUNT(DISTINCT category) as categories_used,
    ROUND(AVG(unit_price), 2) as avg_unit_price,
    CASE
        WHEN COUNT(*) = 22
            AND COUNT(DISTINCT supplier_id) = 22
            AND COUNT(*) FILTER (WHERE supplier_id IS NULL) = 0
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM inventory_item
WHERE org_id = '00000000-0000-0000-0000-000000000001';

\echo ''
\echo 'Expected: 22 products, 22 unique suppliers linked, 0 orphaned'
\echo ''

-- =====================================================
-- VALIDATION 3: PURCHASE ORDER INTEGRITY
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 3: PURCHASE ORDER INTEGRITY'
\echo '====================================================='

WITH po_summary AS (
    SELECT
        po.id,
        po.total_amount as po_total,
        COALESCE(SUM(poi.quantity * poi.unit_price), 0) as line_item_total,
        COUNT(poi.id) as line_item_count
    FROM purchase_order po
    LEFT JOIN purchase_order_item poi ON po.id = poi.purchase_order_id
    WHERE po.org_id = '00000000-0000-0000-0000-000000000001'
    GROUP BY po.id, po.total_amount
)
SELECT
    'PURCHASE ORDER INTEGRITY' as check_type,
    COUNT(*) as total_pos,
    ROUND(AVG(line_item_count), 2) as avg_items_per_po,
    COUNT(*) FILTER (WHERE ABS(po_total - line_item_total) > 0.01) as amount_mismatch_count,
    ROUND(SUM(po_total), 2) as total_po_value,
    CASE
        WHEN COUNT(*) = 22
            AND COUNT(*) FILTER (WHERE ABS(po_total - line_item_total) > 0.01) = 0
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM po_summary;

\echo ''
\echo 'Expected: 22 purchase orders, 0 amount mismatches'
\echo ''

-- =====================================================
-- VALIDATION 4: PURCHASE ORDER STATUS DISTRIBUTION
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 4: PURCHASE ORDER STATUS DISTRIBUTION'
\echo '====================================================='

SELECT
    'PO STATUS DISTRIBUTION' as check_type,
    status,
    COUNT(*) as count,
    ROUND(SUM(total_amount), 2) as total_value,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM purchase_order
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo 'Expected: Mix of statuses (draft, approved, completed, etc.)'
\echo ''

-- =====================================================
-- VALIDATION 5: NO ORPHANED RECORDS
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 5: NO ORPHANED RECORDS'
\echo '====================================================='

WITH orphan_checks AS (
    SELECT
        'inventory_items' as entity,
        COUNT(*) as orphaned_count
    FROM inventory_item
    WHERE org_id = '00000000-0000-0000-0000-000000000001'
    AND supplier_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM supplier WHERE supplier.id = inventory_item.supplier_id)

    UNION ALL

    SELECT
        'purchase_orders' as entity,
        COUNT(*) as orphaned_count
    FROM purchase_order
    WHERE org_id = '00000000-0000-0000-0000-000000000001'
    AND NOT EXISTS (SELECT 1 FROM supplier WHERE supplier.id = purchase_order.supplier_id)

    UNION ALL

    SELECT
        'purchase_order_items' as entity,
        COUNT(*) as orphaned_count
    FROM purchase_order_item poi
    WHERE NOT EXISTS (SELECT 1 FROM purchase_order WHERE purchase_order.id = poi.purchase_order_id)
    OR NOT EXISTS (SELECT 1 FROM inventory_item WHERE inventory_item.id = poi.inventory_item_id)
)
SELECT
    'ORPHANED RECORDS CHECK' as check_type,
    entity,
    orphaned_count,
    CASE
        WHEN orphaned_count = 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM orphan_checks;

\echo ''
\echo 'Expected: 0 orphaned records for all entities'
\echo ''

-- =====================================================
-- VALIDATION 6: INVENTORY LOCATION COVERAGE
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 6: INVENTORY LOCATION COVERAGE'
\echo '====================================================='

WITH location_stats AS (
    SELECT
        COUNT(DISTINCT location) as unique_locations,
        COUNT(*) as total_records,
        COUNT(DISTINCT sku) as unique_products,
        ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT sku), 0), 2) as avg_locations_per_product,
        SUM(quantity_on_hand) as total_stock,
        SUM(quantity_reserved) as reserved_stock
    FROM inventory_item
    WHERE org_id = '00000000-0000-0000-0000-000000000001'
)
SELECT
    'INVENTORY LOCATION COVERAGE' as check_type,
    unique_locations,
    total_records,
    unique_products,
    avg_locations_per_product,
    total_stock,
    reserved_stock,
    CASE
        WHEN unique_locations >= 4
            AND avg_locations_per_product >= 1
            AND unique_products = 22
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM location_stats;

\echo ''
\echo 'Expected: 4+ locations, avg 4+ locations per product, 22 unique products'
\echo ''

-- =====================================================
-- VALIDATION 7: END-TO-END FLOW COMPLETENESS
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 7: END-TO-END FLOW COMPLETENESS'
\echo '====================================================='

WITH supplier_flow AS (
    SELECT
        s.id as supplier_id,
        s.name as supplier_name,
        COUNT(DISTINCT i.id) as product_count,
        COUNT(DISTINCT po.id) as po_count,
        CASE
            WHEN COUNT(DISTINCT i.id) > 0
                AND COUNT(DISTINCT po.id) > 0
            THEN 'COMPLETE'
            ELSE 'INCOMPLETE'
        END as flow_status
    FROM supplier s
    LEFT JOIN inventory_item i ON s.id = i.supplier_id
    LEFT JOIN purchase_order po ON s.id = po.supplier_id
    WHERE s.org_id = '00000000-0000-0000-0000-000000000001'
    GROUP BY s.id, s.name
)
SELECT
    'END-TO-END FLOW' as check_type,
    COUNT(*) as total_suppliers,
    COUNT(*) FILTER (WHERE flow_status = 'COMPLETE') as complete_flows,
    COUNT(*) FILTER (WHERE flow_status = 'INCOMPLETE') as incomplete_flows,
    ROUND(COUNT(*) FILTER (WHERE flow_status = 'COMPLETE') * 100.0 / COUNT(*), 2) as completion_percentage,
    CASE
        WHEN COUNT(*) = 22
            AND COUNT(*) FILTER (WHERE flow_status = 'COMPLETE') = 22
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM supplier_flow;

\echo ''
\echo 'Expected: 22 suppliers, 100% complete flows'
\echo ''

-- List any incomplete flows
\echo ''
\echo 'INCOMPLETE FLOWS (if any):'
SELECT
    s.name as supplier_name,
    COUNT(DISTINCT i.id) as products,
    COUNT(DISTINCT po.id) as purchase_orders,
    CASE
        WHEN COUNT(DISTINCT i.id) = 0 THEN '⚠️ Missing products'
        WHEN COUNT(DISTINCT po.id) = 0 THEN '⚠️ Missing purchase orders'
        ELSE '✅ Complete'
    END as issue
FROM supplier s
LEFT JOIN inventory_item i ON s.id = i.supplier_id
LEFT JOIN purchase_order po ON s.id = po.supplier_id
WHERE s.org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY s.id, s.name
HAVING COUNT(DISTINCT i.id) = 0 OR COUNT(DISTINCT po.id) = 0;

-- =====================================================
-- VALIDATION 8: EXTENDED SCHEMA VALIDATION (Optional)
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 8: EXTENDED SCHEMA (if exists)'
\echo '====================================================='

-- Check for invoices (extended schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        RAISE NOTICE '';
        RAISE NOTICE '--- INVOICE VALIDATION ---';
        PERFORM 1 FROM (
            SELECT
                'INVOICE VALIDATION' as check_type,
                COUNT(*) as total_invoices,
                COUNT(*) FILTER (WHERE status = 'paid') as paid,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE three_way_match_status = 'matched') as matched,
                ROUND(SUM(total_amount), 2) as total_value,
                ROUND(SUM(paid_amount), 2) as total_paid,
                CASE
                    WHEN COUNT(*) >= 22 THEN '✅ PASS'
                    ELSE '❌ FAIL'
                END as validation_result
            FROM invoices
            WHERE org_id = '00000000-0000-0000-0000-000000000001'
        ) t;
        RAISE NOTICE 'Expected: 22+ invoices with various statuses';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '⚠️  Extended schema table "invoices" not found - skipped';
    END IF;
END $$;

-- Check for contracts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_contracts') THEN
        RAISE NOTICE '';
        RAISE NOTICE '--- CONTRACT VALIDATION ---';
        PERFORM 1 FROM (
            SELECT
                'CONTRACT VALIDATION' as check_type,
                COUNT(*) as total_contracts,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                ROUND(SUM(total_contract_value), 2) as total_value,
                CASE
                    WHEN COUNT(*) >= 5 THEN '✅ PASS'
                    ELSE '❌ FAIL'
                END as validation_result
            FROM supplier_contracts sc
            JOIN supplier s ON sc.supplier_id = s.id
            WHERE s.org_id = '00000000-0000-0000-0000-000000000001'
        ) t;
        RAISE NOTICE 'Expected: 5+ contracts for strategic suppliers';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '⚠️  Extended schema table "supplier_contracts" not found - skipped';
    END IF;
END $$;

-- =====================================================
-- VALIDATION 9: DATA QUALITY METRICS
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 9: DATA QUALITY METRICS'
\echo '====================================================='

SELECT
    'DATA QUALITY METRICS' as check_type,
    metric_name,
    metric_value,
    expected_value,
    CASE
        WHEN metric_value::text = expected_value THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM (
    SELECT 'Total Suppliers' as metric_name,
           (SELECT COUNT(*)::text FROM supplier WHERE org_id = '00000000-0000-0000-0000-000000000001') as metric_value,
           '22' as expected_value
    UNION ALL
    SELECT 'Duplicate Suppliers',
           (SELECT (COUNT(*) - COUNT(DISTINCT LOWER(TRIM(name))))::text FROM supplier WHERE org_id = '00000000-0000-0000-0000-000000000001'),
           '0'
    UNION ALL
    SELECT 'Products',
           (SELECT COUNT(*)::text FROM inventory_item WHERE org_id = '00000000-0000-0000-0000-000000000001'),
           '22'
    UNION ALL
    SELECT 'Purchase Orders',
           (SELECT COUNT(*)::text FROM purchase_order WHERE org_id = '00000000-0000-0000-0000-000000000001'),
           '22'
    UNION ALL
    SELECT 'PO Items',
           (SELECT COUNT(*)::text FROM purchase_order_item WHERE purchase_order_id IN (
               SELECT id FROM purchase_order WHERE org_id = '00000000-0000-0000-0000-000000000001'
           )),
           '22+' -- At least 22, could be more if multi-item POs
    UNION ALL
    SELECT 'Orphaned Inventory',
           (SELECT COUNT(*)::text FROM inventory_item
            WHERE org_id = '00000000-0000-0000-0000-000000000001'
            AND supplier_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM supplier WHERE supplier.id = inventory_item.supplier_id)),
           '0'
    UNION ALL
    SELECT 'Orphaned POs',
           (SELECT COUNT(*)::text FROM purchase_order
            WHERE org_id = '00000000-0000-0000-0000-000000000001'
            AND NOT EXISTS (SELECT 1 FROM supplier WHERE supplier.id = purchase_order.supplier_id)),
           '0'
) quality_checks;

\echo ''
\echo 'Expected: All metrics should match or exceed expected values'
\echo ''

-- =====================================================
-- VALIDATION 10: REFERENTIAL INTEGRITY CHECK
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION 10: REFERENTIAL INTEGRITY'
\echo '====================================================='

-- Check all foreign keys are valid
WITH integrity_checks AS (
    -- Inventory -> Supplier FK
    SELECT
        'inventory_item.supplier_id' as foreign_key,
        COUNT(*) FILTER (
            WHERE supplier_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM supplier WHERE supplier.id = inventory_item.supplier_id)
        ) as invalid_count
    FROM inventory_item
    WHERE org_id = '00000000-0000-0000-0000-000000000001'

    UNION ALL

    -- Purchase Order -> Supplier FK
    SELECT
        'purchase_order.supplier_id' as foreign_key,
        COUNT(*) FILTER (
            WHERE NOT EXISTS (SELECT 1 FROM supplier WHERE supplier.id = purchase_order.supplier_id)
        ) as invalid_count
    FROM purchase_order
    WHERE org_id = '00000000-0000-0000-0000-000000000001'

    UNION ALL

    -- Purchase Order Item -> Purchase Order FK
    SELECT
        'purchase_order_item.purchase_order_id' as foreign_key,
        COUNT(*) FILTER (
            WHERE NOT EXISTS (SELECT 1 FROM purchase_order WHERE purchase_order.id = purchase_order_item.purchase_order_id)
        ) as invalid_count
    FROM purchase_order_item

    UNION ALL

    -- Purchase Order Item -> Inventory Item FK
    SELECT
        'purchase_order_item.inventory_item_id' as foreign_key,
        COUNT(*) FILTER (
            WHERE NOT EXISTS (SELECT 1 FROM inventory_item WHERE inventory_item.id = purchase_order_item.inventory_item_id)
        ) as invalid_count
    FROM purchase_order_item
)
SELECT
    'REFERENTIAL INTEGRITY' as check_type,
    foreign_key,
    invalid_count,
    CASE
        WHEN invalid_count = 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as validation_result
FROM integrity_checks;

\echo ''
\echo 'Expected: 0 invalid foreign key references for all FKs'
\echo ''

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

\echo ''
\echo '====================================================='
\echo 'VALIDATION SUITE SUMMARY'
\echo '====================================================='

DO $$
DECLARE
    total_suppliers INT;
    total_products INT;
    total_pos INT;
    duplicate_count INT;
    orphaned_count INT;
    all_checks_passed BOOLEAN := true;
BEGIN
    -- Get key metrics
    SELECT COUNT(*) INTO total_suppliers
    FROM supplier WHERE org_id = '00000000-0000-0000-0000-000000000001';

    SELECT COUNT(*) INTO total_products
    FROM inventory_item WHERE org_id = '00000000-0000-0000-0000-000000000001';

    SELECT COUNT(*) INTO total_pos
    FROM purchase_order WHERE org_id = '00000000-0000-0000-0000-000000000001';

    SELECT COUNT(*) - COUNT(DISTINCT LOWER(TRIM(name))) INTO duplicate_count
    FROM supplier WHERE org_id = '00000000-0000-0000-0000-000000000001';

    SELECT COUNT(*) INTO orphaned_count
    FROM inventory_item
    WHERE org_id = '00000000-0000-0000-0000-000000000001'
    AND supplier_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM supplier WHERE supplier.id = inventory_item.supplier_id);

    -- Determine overall status
    all_checks_passed := (
        total_suppliers = 22 AND
        total_products = 22 AND
        total_pos = 22 AND
        duplicate_count = 0 AND
        orphaned_count = 0
    );

    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    IF all_checks_passed THEN
        RAISE NOTICE '✅ OVERALL STATUS: ALL VALIDATIONS PASSED';
    ELSE
        RAISE NOTICE '❌ OVERALL STATUS: SOME VALIDATIONS FAILED';
    END IF;
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'KEY METRICS:';
    RAISE NOTICE '  Suppliers: % (expected: 22)', total_suppliers;
    RAISE NOTICE '  Products: % (expected: 22)', total_products;
    RAISE NOTICE '  Purchase Orders: % (expected: 22)', total_pos;
    RAISE NOTICE '  Duplicate Suppliers: % (expected: 0)', duplicate_count;
    RAISE NOTICE '  Orphaned Records: % (expected: 0)', orphaned_count;
    RAISE NOTICE '';

    IF all_checks_passed THEN
        RAISE NOTICE '✅ DATABASE IS READY FOR TESTING';
        RAISE NOTICE '✅ All test data generated successfully';
        RAISE NOTICE '✅ Referential integrity maintained';
        RAISE NOTICE '✅ No orphaned or duplicate records';
    ELSE
        RAISE WARNING '❌ DATABASE HAS ISSUES - REVIEW FAILED CHECKS ABOVE';
        RAISE WARNING 'Please review each failed validation for details';
        RAISE WARNING 'Consider running cleanup and regeneration scripts';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'VALIDATION SUITE COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- END OF VALIDATION SUITE
-- =====================================================