-- DANGER: This will delete ALL inventory data
-- Use this script to purge all inventory-related data for fresh import
-- Make sure to backup your data before running this script

-- Optional backup command (uncomment if needed):
-- pg_dump $NEON_SPP_DATABASE_URL --schema=spp --schema=core > backup_$(date +%Y%m%d_%H%M%S).sql

BEGIN;

-- Log start of purge
\echo 'Starting inventory data purge...'

-- Delete in dependency order (children first, parents last)

-- 1. Delete stock on hand records (no dependencies)
DELETE FROM core.stock_on_hand;
\echo 'Deleted stock on hand records:' :ROW_COUNT 'rows'

-- 2. Delete inventory selected items (references inventory_selection, supplier_product)
DELETE FROM core.inventory_selected_item;
\echo 'Deleted inventory selected items:' :ROW_COUNT 'rows'

-- 3. Delete inventory selections (no dependencies on it)
DELETE FROM core.inventory_selection;
\echo 'Deleted inventory selections:' :ROW_COUNT 'rows'

-- 4. Delete price history records (references supplier_product)
DELETE FROM core.price_history;
\echo 'Deleted price history records:' :ROW_COUNT 'rows'

-- 5. Delete supplier products (references supplier, product)
DELETE FROM core.supplier_product;
\echo 'Deleted supplier products:' :ROW_COUNT 'rows'

-- 6. Delete pricelist rows (references pricelist_upload)
DELETE FROM spp.pricelist_row;
\echo 'Deleted pricelist rows:' :ROW_COUNT 'rows'

-- 7. Delete pricelist uploads (references supplier)
DELETE FROM spp.pricelist_upload;
\echo 'Deleted pricelist uploads:' :ROW_COUNT 'rows'

-- 8. Delete products (if not referenced elsewhere)
DELETE FROM core.product;
\echo 'Deleted products:' :ROW_COUNT 'rows'

-- 9. Delete categories (if not referenced elsewhere)
DELETE FROM core.category;
\echo 'Deleted categories:' :ROW_COUNT 'rows'

-- 10. Delete stock locations (before suppliers to respect potential FKs)
DELETE FROM core.stock_location;
\echo 'Deleted stock locations:' :ROW_COUNT 'rows'

-- 11. Delete suppliers (last)
DELETE FROM core.supplier;
\echo 'Deleted suppliers:' :ROW_COUNT 'rows'

-- Note: Not disabling triggers to ensure safety; rely on FK order instead

-- Reset sequences if using SERIAL/BIGSERIAL columns
-- Note: Adjust sequence names based on actual table definitions
-- ALTER SEQUENCE core.supplier_supplier_id_seq RESTART WITH 1;
-- ALTER SEQUENCE core.product_product_id_seq RESTART WITH 1;
-- ALTER SEQUENCE core.category_category_id_seq RESTART WITH 1;

-- Verification queries to confirm all tables are empty
\echo 'Verifying all tables are empty...'

SELECT 'core.supplier' as table_name, COUNT(*) as row_count FROM core.supplier
UNION ALL
SELECT 'core.category', COUNT(*) FROM core.category
UNION ALL
SELECT 'core.product', COUNT(*) FROM core.product
UNION ALL
SELECT 'core.supplier_product', COUNT(*) FROM core.supplier_product
UNION ALL
SELECT 'core.price_history', COUNT(*) FROM core.price_history
UNION ALL
SELECT 'core.inventory_selection', COUNT(*) FROM core.inventory_selection
UNION ALL
SELECT 'core.inventory_selected_item', COUNT(*) FROM core.inventory_selected_item
UNION ALL
SELECT 'core.stock_location', COUNT(*) FROM core.stock_location
UNION ALL
SELECT 'core.stock_on_hand', COUNT(*) FROM core.stock_on_hand
UNION ALL
SELECT 'spp.pricelist_upload', COUNT(*) FROM spp.pricelist_upload
UNION ALL
SELECT 'spp.pricelist_row', COUNT(*) FROM spp.pricelist_row
ORDER BY table_name;

-- Success message
\echo '✅ Inventory data purge completed successfully!'
\echo 'All inventory-related tables have been cleared and are ready for fresh import.'

COMMIT;
