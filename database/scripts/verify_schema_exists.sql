-- Schema Verification Script for NXT-SPP System
-- This script checks if all required schemas, tables, views, and indexes exist

\echo 'Verifying NXT-SPP schema structure...'
\echo '====================================='

-- Check schemas exist
\echo ''
\echo 'Checking schemas...'
SELECT 
    CASE 
        WHEN schema_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Schema: ' || schema_name as object_name
FROM information_schema.schemata 
WHERE schema_name IN ('spp', 'core', 'serve')
ORDER BY schema_name;

-- Check SPP tables
\echo ''
\echo 'Checking SPP tables...'

-- Check spp.pricelist_upload
SELECT 
    CASE 
        WHEN table_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Table: spp.pricelist_upload' as object_name
FROM information_schema.tables 
WHERE table_schema = 'spp' AND table_name = 'pricelist_upload';

-- Check spp.pricelist_row
SELECT 
    CASE 
        WHEN table_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Table: spp.pricelist_row' as object_name
FROM information_schema.tables 
WHERE table_schema = 'spp' AND table_name = 'pricelist_row';

-- Check CORE tables
\echo ''
\echo 'Checking CORE tables...'

SELECT 
    CASE 
        WHEN table_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Table: core.' || table_name as object_name
FROM information_schema.tables 
WHERE table_schema = 'core' 
AND table_name IN (
    'supplier', 'category', 'product', 'supplier_product', 
    'price_history', 'inventory_selection', 'inventory_selected_item',
    'stock_location', 'stock_on_hand'
)
ORDER BY table_name;

-- Check SERVE views (if they exist)
\echo ''
\echo 'Checking SERVE views...'

SELECT 
    CASE 
        WHEN table_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'View: serve.' || table_name as object_name
FROM information_schema.views 
WHERE table_schema = 'serve' 
AND table_name IN (
    'v_product_table_by_supplier', 'v_selected_catalog', 
    'v_soh_by_supplier', 'v_nxt_soh'
)
ORDER BY table_name;

-- Check critical indexes
\echo ''
\echo 'Checking critical indexes...'

-- Check indexes on foreign keys and frequently queried columns
SELECT 
    CASE 
        WHEN indexname IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Index: ' || schemaname || '.' || indexname as object_name
FROM pg_indexes 
WHERE schemaname IN ('spp', 'core', 'serve')
AND (
    indexname LIKE '%_supplier_id%' OR
    indexname LIKE '%_product_id%' OR
    indexname LIKE '%_status%' OR
    indexname LIKE '%_is_current%' OR
    indexname LIKE '%_upload_id%' OR
    indexname LIKE '%_selection_id%'
)
ORDER BY schemaname, indexname;

-- Summary section
\echo ''
\echo '====================================='
\echo 'SUMMARY:'

-- Count missing objects
WITH missing_objects AS (
    -- Missing schemas
    SELECT 'Missing Schema' as object_type, 'spp' as object_name
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'spp')
    UNION ALL
    SELECT 'Missing Schema', 'core'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')
    UNION ALL
    SELECT 'Missing Schema', 'serve'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'serve')
    
    -- Missing SPP tables
    UNION ALL
    SELECT 'Missing SPP Table', 'pricelist_upload'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'spp' AND table_name = 'pricelist_upload')
    UNION ALL
    SELECT 'Missing SPP Table', 'pricelist_row'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'spp' AND table_name = 'pricelist_row')
    
    -- Missing CORE tables
    UNION ALL
    SELECT 'Missing CORE Table', t.table_name
    FROM (VALUES ('supplier'), ('category'), ('product'), ('supplier_product'), 
                 ('price_history'), ('inventory_selection'), ('inventory_selected_item'),
                 ('stock_location'), ('stock_on_hand')) AS t(table_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'core' AND table_name = t.table_name
    )
)
SELECT 
    object_type,
    COUNT(*) as missing_count,
    STRING_AGG(object_name, ', ') as missing_objects
FROM missing_objects
GROUP BY object_type
ORDER BY object_type;

-- Recommendations
\echo ''
\echo 'RECOMMENDATIONS:'
\echo 'If any objects are missing, run:'
\echo '  psql $NEON_SPP_DATABASE_URL -f database/scripts/create_missing_schemas.sql'
\echo ''
\echo 'This will create all missing schemas, tables, views, and indexes.'

-- Final status
WITH total_checks AS (
    SELECT COUNT(*) as total FROM (
        SELECT 1 FROM information_schema.schemata WHERE schema_name IN ('spp', 'core', 'serve')
        UNION ALL
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'spp' AND table_name IN ('pricelist_upload', 'pricelist_row')
        UNION ALL
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name IN ('supplier', 'category', 'product', 'supplier_product', 'price_history', 'inventory_selection', 'inventory_selected_item', 'stock_location', 'stock_on_hand')
    ) t
),
expected_total AS (
    SELECT 14 as expected  -- 3 schemas + 2 SPP tables + 9 CORE tables
)
SELECT 
    CASE 
        WHEN total_checks.total = expected_total.expected THEN '✅ All required objects exist'
        ELSE '⚠️  Some objects are missing (' || total_checks.total || '/' || expected_total.expected || ')'
    END as final_status
FROM total_checks, expected_total;
