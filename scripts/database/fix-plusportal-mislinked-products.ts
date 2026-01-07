#!/usr/bin/env bun
/**
 * Fix PlusPortal Mislinked Products
 * 
 * Cleans up products incorrectly assigned to the wrong PlusPortal suppliers.
 * 
 * Usage:
 *   bun scripts/database/fix-plusportal-mislinked-products.ts --dry-run
 *   bun scripts/database/fix-plusportal-mislinked-products.ts --delete
 */

import 'dotenv/config';
import { query } from '../../src/lib/database/unified-connection';

// Supplier -> Valid SKU prefixes mapping
const SUPPLIER_VALID_PREFIXES: Record<string, string[]> = {
  // AV Distribution carries Atlona, Aida Imaging, Appotronics
  'av distribution': ['ATL', 'AID', 'APT'],
  
  // Stage Audio Works carries Audac, Amphenol, Adam Hall
  'stage audio': ['AUA', 'AMP', 'ADA'],
  
  // Active Music Distribution - all products appear mislinked
  // They have no AMD-prefixed products, suggesting entire catalog is wrong
  'active music': [],
};

interface SupplierInfo {
  supplier_id: string;
  name: string;
  code: string;
  valid_prefixes: string[];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.length === 0;
  const deleteProducts = args.includes('--delete');

  console.log('='.repeat(70));
  console.log('🔧 Fix PlusPortal Mislinked Products');
  console.log('='.repeat(70));
  console.log();

  if (!deleteProducts) {
    console.log('📋 DRY RUN MODE - No changes will be made');
    console.log('   Run with --delete to permanently remove mislinked products\n');
  } else {
    console.log('⚠️  DELETE MODE - Will permanently remove mislinked products!\n');
  }

  // Find all PlusPortal suppliers
  const suppliers: SupplierInfo[] = [];

  for (const [namePart, prefixes] of Object.entries(SUPPLIER_VALID_PREFIXES)) {
    const result = await query<{ supplier_id: string; name: string; code: string }>(
      `SELECT supplier_id, name, code FROM core.supplier WHERE LOWER(name) LIKE $1`,
      [`%${namePart}%`]
    );
    
    if (result.rows.length > 0) {
      suppliers.push({
        ...result.rows[0],
        valid_prefixes: prefixes,
      });
    }
  }

  console.log(`Found ${suppliers.length} PlusPortal suppliers to clean:\n`);
  for (const s of suppliers) {
    console.log(`  - ${s.name} (valid: ${s.valid_prefixes.length > 0 ? s.valid_prefixes.join(', ') : 'NONE - delete all'})`);
  }
  console.log();

  let grandTotalDeleted = 0;

  // Process each supplier
  for (const supplier of suppliers) {
    console.log('─'.repeat(70));
    console.log(`📦 ${supplier.name}`);
    console.log('─'.repeat(70));

    // Build the WHERE clause for mislinked products
    let whereClause: string;
    
    if (supplier.valid_prefixes.length === 0) {
      // Delete ALL products for this supplier
      whereClause = `supplier_id = '${supplier.supplier_id}'`;
    } else {
      // Delete products that DON'T match valid prefixes
      const validConditions = supplier.valid_prefixes
        .map(p => `supplier_sku LIKE '${p}-%'`)
        .join(' OR ');
      whereClause = `supplier_id = '${supplier.supplier_id}' AND NOT (${validConditions})`;
    }

    // Count mislinked products
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM core.supplier_product WHERE ${whereClause} AND is_active = true`
    );
    const mislinkedCount = parseInt(countResult.rows[0].count);

    if (mislinkedCount === 0) {
      console.log('   ✅ No mislinked products found.\n');
      continue;
    }

    // Get breakdown by prefix
    const prefixBreakdown = await query<{ prefix: string; count: string }>(
      `SELECT SPLIT_PART(supplier_sku, '-', 1) as prefix, COUNT(*) as count
       FROM core.supplier_product 
       WHERE ${whereClause} AND is_active = true
       GROUP BY SPLIT_PART(supplier_sku, '-', 1)
       ORDER BY count DESC`
    );

    console.log(`\n   Mislinked products to remove: ${mislinkedCount}\n`);
    console.log('   By prefix:');
    for (const row of prefixBreakdown.rows.slice(0, 15)) {
      console.log(`     ${row.prefix.padEnd(5)}: ${row.count.padStart(5)}`);
    }
    if (prefixBreakdown.rows.length > 15) {
      console.log(`     ... and ${prefixBreakdown.rows.length - 15} more prefixes`);
    }

    if (dryRun) {
      console.log(`\n   📋 Would delete ${mislinkedCount} products (dry run)\n`);
      continue;
    }

    // Delete associated records first (foreign key constraints)
    console.log('\n   Deleting associated records...');

    const deleteStockResult = await query(
      `DELETE FROM core.stock_on_hand
       WHERE supplier_product_id IN (
         SELECT supplier_product_id FROM core.supplier_product WHERE ${whereClause}
       )`
    );
    console.log(`     - stock_on_hand: ${deleteStockResult.rowCount} records`);

    const deletePriceResult = await query(
      `DELETE FROM core.price_history
       WHERE supplier_product_id IN (
         SELECT supplier_product_id FROM core.supplier_product WHERE ${whereClause}
       )`
    );
    console.log(`     - price_history: ${deletePriceResult.rowCount} records`);

    // Delete the products
    const deleteProductsResult = await query(
      `DELETE FROM core.supplier_product WHERE ${whereClause}`
    );
    console.log(`     - supplier_product: ${deleteProductsResult.rowCount} records`);

    grandTotalDeleted += deleteProductsResult.rowCount || 0;
    console.log(`\n   ✅ Deleted ${deleteProductsResult.rowCount} mislinked products\n`);
  }

  // Final summary
  console.log('='.repeat(70));
  if (dryRun) {
    console.log('📋 DRY RUN COMPLETE - No changes were made');
  } else {
    console.log(`✅ CLEANUP COMPLETE - Deleted ${grandTotalDeleted} total mislinked products`);
  }
  console.log('='.repeat(70));

  // Verify remaining counts
  console.log('\n📊 Final product counts per supplier:\n');
  
  for (const supplier of suppliers) {
    const remaining = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM core.supplier_product 
       WHERE supplier_id = $1 AND is_active = true`,
      [supplier.supplier_id]
    );
    console.log(`   ${supplier.name}: ${remaining.rows[0].count} products`);
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

