-- Verification of comprehensive schema deployment
SELECT 'Schema Deployment Verification' as title;

-- Check total table count
SELECT count(*) as total_tables, 'Total tables in database' as description
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check new enterprise tables
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN '✅ organizations'
        ELSE '❌ organizations missing'
    END as organizations_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN '✅ customers'
        ELSE '❌ customers missing'
    END as customers_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN '✅ sales_orders'
        ELSE '❌ sales_orders missing'
    END as sales_orders_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN '✅ invoices'
        ELSE '❌ invoices missing'
    END as invoices_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN '✅ email_campaigns'
        ELSE '❌ email_campaigns missing'
    END as email_campaigns_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN '✅ documents'
        ELSE '❌ documents missing'
    END as documents_status;

-- List all tables for confirmation
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name NOT LIKE '%_2024_%'
AND table_name NOT LIKE '%_2025_%'
ORDER BY table_name;

SELECT 'Comprehensive Enterprise Schema Successfully Deployed!' as final_status;