#!/usr/bin/env bun
/**
 * Fix Sennheiser Mislinked Products
 * 
 * This script removes/deactivates products that were incorrectly linked
 * to the Sennheiser supplier from other brands (Audac, Amphenol, Atlona,
 * Aida Imaging, Appotronics, Adam Hall).
 * 
 * Usage:
 *   bun scripts/database/fix-sennheiser-mislinked-products.ts --dry-run    # Preview changes
 *   bun scripts/database/fix-sennheiser-mislinked-products.ts --deactivate # Deactivate only (recoverable)
 *   bun scripts/database/fix-sennheiser-mislinked-products.ts --delete     # Permanently delete
 */

import 'dotenv/config';
import { query } from '../../src/lib/database/unified-connection';

const MISLINKED_PREFIXES = ['AUA-%', 'AMP-%', 'ATL-%', 'AID-%', 'APT-%', 'ADA-%'];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.length === 0;
  const deactivate = args.includes('--deactivate');
  const deleteProducts = args.includes('--delete');

  console.log('='.repeat(70));
  console.log('🔧 Fix Sennheiser Mislinked Products');
  console.log('='.repeat(70));
  console.log();

  if (!deactivate && !deleteProducts) {
    console.log('📋 DRY RUN MODE - No changes will be made\n');
  }

  // Find Sennheiser supplier
  const sennheiser = await query<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name FROM core.supplier WHERE LOWER(name) LIKE '%sennheiser%'`
  );

  if (sennheiser.rows.length === 0) {
    console.error('❌ Sennheiser supplier not found');
    process.exit(1);
  }

  const supplierId = sennheiser.rows[0].supplier_id;
  console.log(`✅ Found supplier: ${sennheiser.rows[0].name}`);
  console.log(`   ID: ${supplierId}\n`);

  // Count mislinked products by prefix
  console.log('📊 Mislinked products by brand:\n');
  
  let totalMislinked = 0;
  for (const prefix of MISLINKED_PREFIXES) {
    const brand = prefix.replace('-%', '');
    const count = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM core.supplier_product 
       WHERE supplier_id = $1 AND is_active = true AND supplier_sku LIKE $2`,
      [supplierId, prefix]
    );
    const countNum = parseInt(count.rows[0].count);
    totalMislinked += countNum;
    console.log(`   ${brand.padEnd(5)}: ${countNum.toString().padStart(4)} products`);
  }
  
  console.log(`   ${'─'.repeat(20)}`);
  console.log(`   TOTAL: ${totalMislinked.toString().padStart(4)} products\n`);

  if (totalMislinked === 0) {
    console.log('✅ No mislinked products found. Database is clean.');
    process.exit(0);
  }

  // Get sample of affected products
  const sample = await query<{ sku: string; name: string }>(
    `SELECT supplier_sku as sku, name_from_supplier as name
     FROM core.supplier_product
     WHERE supplier_id = $1 
       AND is_active = true
       AND (supplier_sku LIKE $2 OR supplier_sku LIKE $3 OR supplier_sku LIKE $4 
            OR supplier_sku LIKE $5 OR supplier_sku LIKE $6 OR supplier_sku LIKE $7)
     ORDER BY supplier_sku
     LIMIT 10`,
    [supplierId, ...MISLINKED_PREFIXES]
  );

  console.log('📋 Sample affected products:');
  for (const row of sample.rows) {
    console.log(`   ${row.sku}: ${row.name?.substring(0, 50) || '(no name)'}...`);
  }
  console.log();

  if (dryRun && !deactivate && !deleteProducts) {
    console.log('💡 To apply changes, run with:');
    console.log('   --deactivate  : Set is_active = false (recoverable)');
    console.log('   --delete      : Permanently delete products\n');
    process.exit(0);
  }

  // Build the WHERE clause for mislinked products
  const whereClause = `(supplier_sku LIKE $2 OR supplier_sku LIKE $3 OR supplier_sku LIKE $4 
                        OR supplier_sku LIKE $5 OR supplier_sku LIKE $6 OR supplier_sku LIKE $7)`;

  // Apply the fix
  if (deactivate) {
    console.log('🔄 Deactivating mislinked products...\n');
    
    const result = await query(
      `UPDATE core.supplier_product
       SET is_active = false, 
           updated_at = NOW(),
           attrs_json = COALESCE(attrs_json, '{}'::jsonb) || 
             jsonb_build_object('deactivated_reason', 'Mislinked to Sennheiser supplier - cleanup 2026-01-07')
       WHERE supplier_id = $1 
         AND is_active = true
         AND ${whereClause}`,
      [supplierId, ...MISLINKED_PREFIXES]
    );

    console.log(`✅ Deactivated ${result.rowCount} products\n`);
  }

  if (deleteProducts) {
    console.log('⚠️  DELETING mislinked products (this is permanent!)...\n');
    
    // First delete from stock_on_hand
    const stockResult = await query(
      `DELETE FROM core.stock_on_hand
       WHERE supplier_product_id IN (
         SELECT supplier_product_id FROM core.supplier_product
         WHERE supplier_id = $1 AND ${whereClause}
       )`,
      [supplierId, ...MISLINKED_PREFIXES]
    );
    console.log(`   Deleted ${stockResult.rowCount} stock_on_hand records`);

    // Delete from price_history
    const priceResult = await query(
      `DELETE FROM core.price_history
       WHERE supplier_product_id IN (
         SELECT supplier_product_id FROM core.supplier_product
         WHERE supplier_id = $1 AND ${whereClause}
       )`,
      [supplierId, ...MISLINKED_PREFIXES]
    );
    console.log(`   Deleted ${priceResult.rowCount} price_history records`);

    // Delete the products
    const productResult = await query(
      `DELETE FROM core.supplier_product
       WHERE supplier_id = $1 AND ${whereClause}`,
      [supplierId, ...MISLINKED_PREFIXES]
    );
    console.log(`   Deleted ${productResult.rowCount} supplier_product records`);
    
    console.log(`\n✅ Deleted ${productResult.rowCount} mislinked products\n`);
  }

  // Verify remaining products
  const remaining = await query<{ prefix: string; count: string }>(
    `SELECT SPLIT_PART(supplier_sku, '-', 1) AS prefix, COUNT(*) as count
     FROM core.supplier_product
     WHERE supplier_id = $1 AND is_active = true
     GROUP BY SPLIT_PART(supplier_sku, '-', 1)
     ORDER BY count DESC`,
    [supplierId]
  );

  console.log('📊 Remaining products by prefix:');
  for (const row of remaining.rows) {
    console.log(`   ${row.prefix.padEnd(5)}: ${row.count.toString().padStart(4)} products`);
  }
  
  const total = remaining.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
  console.log(`   ${'─'.repeat(20)}`);
  console.log(`   TOTAL: ${total.toString().padStart(4)} products\n`);
  
  console.log('✅ Cleanup complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

