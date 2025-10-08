-- =====================================================
-- SUPPLIER DEPENDENCY MAP
-- =====================================================
-- Comprehensive view of all tables and relationships
-- that depend on the supplier table
-- =====================================================

-- 1. DIRECT DEPENDENCIES (Tables with supplier_id FK)
-- =====================================================
WITH direct_dependencies AS (
    SELECT 
        tc.table_name,
        kcu.column_name,
        COUNT(DISTINCT s.id) as suppliers_referenced
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    LEFT JOIN supplier s ON true
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'supplier'
        AND ccu.column_name = 'id'
    GROUP BY tc.table_name, kcu.column_name
)
SELECT 
    '=== DIRECT DEPENDENCIES ===' as section,
    table_name,
    column_name,
    suppliers_referenced
FROM direct_dependencies
ORDER BY table_name;

-- 2. CASCADE IMPACT ANALYSIS
-- =====================================================
-- Show what would be affected by supplier deletion/merge
SELECT 
    '=== CASCADE IMPACT ===' as section,
    'inventory_item' as affected_table,
    COUNT(*) as records_affected,
    COUNT(DISTINCT supplier_id) as unique_suppliers
FROM inventory_item
WHERE supplier_id IS NOT NULL

UNION ALL

SELECT 
    '=== CASCADE IMPACT ===' as section,
    'purchase_order' as affected_table,
    COUNT(*) as records_affected,
    COUNT(DISTINCT supplier_id) as unique_suppliers
FROM purchase_order

UNION ALL

SELECT 
    '=== CASCADE IMPACT ===' as section,
    'purchase_order_item (indirect)' as affected_table,
    COUNT(DISTINCT poi.id) as records_affected,
    COUNT(DISTINCT po.supplier_id) as unique_suppliers
FROM purchase_order_item poi
JOIN purchase_order po ON poi.purchase_order_id = po.id;

-- 3. SUPPLIER USAGE HEATMAP
-- =====================================================
-- Show which suppliers are most heavily referenced
WITH supplier_usage AS (
    SELECT 
        s.id,
        s.name,
        s.org_id,
        s.status,
        (SELECT COUNT(*) FROM inventory_item WHERE supplier_id = s.id) as inventory_refs,
        (SELECT COUNT(*) FROM purchase_order WHERE supplier_id = s.id) as po_refs,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_order WHERE supplier_id = s.id) as total_po_value
    FROM supplier s
)
SELECT 
    '=== SUPPLIER USAGE HEATMAP ===' as section,
    name,
    status,
    inventory_refs,
    po_refs,
    total_po_value,
    (inventory_refs + po_refs) as total_references,
    CASE 
        WHEN inventory_refs + po_refs = 0 THEN 'UNUSED'
        WHEN inventory_refs + po_refs < 5 THEN 'LOW_USAGE'
        WHEN inventory_refs + po_refs < 20 THEN 'MEDIUM_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM supplier_usage
ORDER BY total_references DESC
LIMIT 20;

-- 4. ORPHANED RECORDS CHECK
-- =====================================================
-- Find any references to non-existent suppliers
SELECT 
    '=== ORPHANED RECORDS CHECK ===' as section,
    'inventory_item' as table_name,
    COUNT(*) as orphaned_count
FROM inventory_item i
WHERE i.supplier_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM supplier s WHERE s.id = i.supplier_id)

UNION ALL

SELECT 
    '=== ORPHANED RECORDS CHECK ===' as section,
    'purchase_order' as table_name,
    COUNT(*) as orphaned_count
FROM purchase_order po
WHERE po.supplier_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM supplier s WHERE s.id = po.supplier_id);

-- 5. DUPLICATE IMPACT SUMMARY
-- =====================================================
-- Summary of impact for duplicate suppliers
WITH duplicate_impact AS (
    SELECT 
        s.id,
        s.name,
        LOWER(TRIM(s.name)) as normalized_name,
        s.org_id,
        s.status,
        s.created_at,
        (SELECT COUNT(*) FROM inventory_item WHERE supplier_id = s.id) as inv_count,
        (SELECT COUNT(*) FROM purchase_order WHERE supplier_id = s.id) as po_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_order WHERE supplier_id = s.id) as po_value
    FROM supplier s
    WHERE LOWER(TRIM(s.name)) IN (
        SELECT LOWER(TRIM(name))
        FROM supplier
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
    )
)
SELECT 
    '=== DUPLICATE IMPACT SUMMARY ===' as section,
    normalized_name,
    COUNT(*) as duplicate_count,
    SUM(inv_count) as total_inventory_items,
    SUM(po_count) as total_purchase_orders,
    SUM(po_value) as total_po_value,
    STRING_AGG(id::text || ' (' || status || ')', ', ' ORDER BY created_at) as supplier_ids_and_status
FROM duplicate_impact
GROUP BY normalized_name
ORDER BY duplicate_count DESC, total_po_value DESC;