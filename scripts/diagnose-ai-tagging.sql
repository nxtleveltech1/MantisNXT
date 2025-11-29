-- Quick diagnostic script to check AI tagging setup
-- Run this to see what's missing

-- Check if columns exist
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'supplier_product'
  AND column_name LIKE 'ai_tag%'
ORDER BY column_name;

-- Check if tables exist
SELECT 
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'core'
  AND table_name IN ('ai_tagging_job', 'ai_tagging_progress', 'ai_tag_assignment', 'ai_tag_library')
ORDER BY table_name;

-- Check current product status distribution
SELECT 
    ai_tagging_status,
    COUNT(*) as count
FROM core.supplier_product
GROUP BY ai_tagging_status
ORDER BY count DESC;

-- Check if any products have tags
SELECT 
    COUNT(DISTINCT supplier_product_id) as products_with_tags
FROM core.ai_tag_assignment;

-- Check total products
SELECT COUNT(*) as total_products FROM core.supplier_product WHERE is_active = true;









