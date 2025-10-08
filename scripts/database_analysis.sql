-- =====================================================
-- MANTIS NXT DATABASE ANALYSIS - DUPLICATE SUPPLIERS
-- =====================================================
-- Agent 1: Database Analysis Specialist
-- Purpose: Identify duplicate suppliers and analyze dependencies
-- =====================================================

-- 1. ANALYZE DUPLICATE SUPPLIERS
-- =====================================================
-- Find all suppliers with duplicate names (case-insensitive)
WITH supplier_duplicates AS (
    SELECT 
        LOWER(TRIM(name)) as normalized_name,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at) as supplier_ids,
        ARRAY_AGG(name ORDER BY created_at) as original_names,
        ARRAY_AGG(org_id ORDER BY created_at) as org_ids,
        ARRAY_AGG(status ORDER BY created_at) as statuses,
        ARRAY_AGG(created_at ORDER BY created_at) as created_dates
    FROM supplier
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
)
SELECT 
    normalized_name,
    duplicate_count,
    supplier_ids,
    original_names,
    org_ids,
    statuses,
    created_dates
FROM supplier_duplicates
ORDER BY duplicate_count DESC, normalized_name;

-- 2. COUNT TOTAL RECORDS IN MAJOR TABLES
-- =====================================================
SELECT 
    'suppliers' as table_name,
    COUNT(*) as record_count
FROM supplier
UNION ALL
SELECT 
    'inventory_items' as table_name,
    COUNT(*) as record_count
FROM inventory_item
UNION ALL
SELECT 
    'purchase_orders' as table_name,
    COUNT(*) as record_count
FROM purchase_order
UNION ALL
SELECT 
    'purchase_order_items' as table_name,
    COUNT(*) as record_count
FROM purchase_order_item
UNION ALL
SELECT 
    'products' as table_name,
    COUNT(*) as record_count
FROM product
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product')
UNION ALL
SELECT 
    'invoices' as table_name,
    COUNT(*) as record_count
FROM invoice
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice')
ORDER BY table_name;

-- 3. ANALYZE SUPPLIER DEPENDENCIES
-- =====================================================
-- Count references to each supplier in related tables
WITH supplier_dependencies AS (
    SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.org_id,
        s.status,
        -- Count inventory items
        (SELECT COUNT(*) FROM inventory_item WHERE supplier_id = s.id) as inventory_item_count,
        -- Count purchase orders
        (SELECT COUNT(*) FROM purchase_order WHERE supplier_id = s.id) as purchase_order_count,
        -- Count purchase order items through purchase orders
        (SELECT COUNT(*) 
         FROM purchase_order_item poi 
         JOIN purchase_order po ON poi.purchase_order_id = po.id 
         WHERE po.supplier_id = s.id) as purchase_order_item_count,
        -- Total PO value
        (SELECT COALESCE(SUM(total_amount), 0) 
         FROM purchase_order 
         WHERE supplier_id = s.id) as total_po_value
    FROM supplier s
)
SELECT * FROM supplier_dependencies
WHERE inventory_item_count > 0 
   OR purchase_order_count > 0
ORDER BY supplier_name;

-- 4. DETAILED DUPLICATE ANALYSIS WITH DEPENDENCIES
-- =====================================================
-- For each set of duplicate suppliers, show their dependencies
WITH duplicate_groups AS (
    SELECT 
        LOWER(TRIM(name)) as normalized_name,
        ARRAY_AGG(id ORDER BY created_at) as supplier_ids
    FROM supplier
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
)
SELECT 
    dg.normalized_name,
    s.id as supplier_id,
    s.name as original_name,
    s.org_id,
    s.status,
    s.created_at,
    (SELECT COUNT(*) FROM inventory_item WHERE supplier_id = s.id) as inventory_items,
    (SELECT COUNT(*) FROM purchase_order WHERE supplier_id = s.id) as purchase_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_order WHERE supplier_id = s.id) as total_po_value
FROM duplicate_groups dg
CROSS JOIN LATERAL unnest(dg.supplier_ids) AS supplier_id
JOIN supplier s ON s.id = supplier_id
ORDER BY dg.normalized_name, s.created_at;

-- 5. IDENTIFY TABLES WITH SUPPLIER_ID FOREIGN KEYS
-- =====================================================
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'supplier'
    AND ccu.column_name = 'id'
ORDER BY tc.table_name;

-- 6. SAMPLE DATA FROM DUPLICATE SUPPLIERS
-- =====================================================
-- Show a few examples of duplicate suppliers with their full details
WITH duplicate_names AS (
    SELECT LOWER(TRIM(name)) as normalized_name
    FROM supplier
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
    LIMIT 5
)
SELECT 
    s.*,
    (SELECT COUNT(*) FROM inventory_item WHERE supplier_id = s.id) as inventory_count,
    (SELECT COUNT(*) FROM purchase_order WHERE supplier_id = s.id) as po_count
FROM supplier s
WHERE LOWER(TRIM(s.name)) IN (SELECT normalized_name FROM duplicate_names)
ORDER BY LOWER(TRIM(s.name)), s.created_at;