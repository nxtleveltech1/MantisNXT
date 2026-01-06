#!/usr/bin/env bun
/**
 * Force cleanup of remaining products and delete duplicate supplier
 */

import { query } from '../../src/lib/database/unified-connection';

const KEEP_SUPPLIER_ID = '146836e6-706a-4cda-b415-8da00b138c96';
const DELETE_SUPPLIER_ID = '8e912e1e-2456-41ce-ab6d-1c60e51f82d0';

async function forceCleanup() {
  console.log('Force cleanup of duplicate supplier...\n');

  // Get remaining products
  const remaining = await query<{ supplier_product_id: string; supplier_sku: string }>(
    `SELECT supplier_product_id, supplier_sku 
     FROM core.supplier_product 
     WHERE supplier_id = $1`,
    [DELETE_SUPPLIER_ID]
  );

  console.log(`Remaining products to migrate: ${remaining.rows.length}`);

  for (const product of remaining.rows) {
    console.log(`  Processing: ${product.supplier_sku}`);
    
    // Check if SKU exists in target
    const existing = await query<{ supplier_product_id: string }>(
      `SELECT supplier_product_id FROM core.supplier_product 
       WHERE supplier_id = $1 AND supplier_sku = $2`,
      [KEEP_SUPPLIER_ID, product.supplier_sku]
    );

    if (existing.rows.length > 0) {
      // Delete duplicate - keep the one in target supplier
      console.log(`    SKU exists in target - deleting duplicate`);
      await query(`DELETE FROM core.stock_on_hand WHERE supplier_product_id = $1`, [product.supplier_product_id]);
      await query(`DELETE FROM core.price_history WHERE supplier_product_id = $1`, [product.supplier_product_id]);
      await query(`DELETE FROM core.supplier_product WHERE supplier_product_id = $1`, [product.supplier_product_id]);
    } else {
      // Migrate to target
      console.log(`    Migrating to target supplier`);
      await query(
        `UPDATE core.supplier_product SET supplier_id = $1 WHERE supplier_product_id = $2`,
        [KEEP_SUPPLIER_ID, product.supplier_product_id]
      );
    }
  }

  // Delete any remaining related records
  console.log('\nCleaning up related records...');
  await query(`DELETE FROM core.stock_on_hand WHERE supplier_product_id IN (SELECT supplier_product_id FROM core.supplier_product WHERE supplier_id = $1)`, [DELETE_SUPPLIER_ID]);
  await query(`DELETE FROM core.price_history WHERE supplier_product_id IN (SELECT supplier_product_id FROM core.supplier_product WHERE supplier_id = $1)`, [DELETE_SUPPLIER_ID]);
  await query(`DELETE FROM core.supplier_product WHERE supplier_id = $1`, [DELETE_SUPPLIER_ID]);
  await query(`DELETE FROM core.plusportal_sync_log WHERE supplier_id = $1`, [DELETE_SUPPLIER_ID]);
  await query(`DELETE FROM core.stock_location WHERE supplier_id = $1`, [DELETE_SUPPLIER_ID]);

  // Delete the duplicate supplier
  console.log('Deleting duplicate supplier...');
  await query(`DELETE FROM core.supplier WHERE supplier_id = $1`, [DELETE_SUPPLIER_ID]);
  console.log('✓ Duplicate supplier deleted');

  // Verify
  const verifySupplier = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM core.supplier WHERE supplier_id = $1`,
    [DELETE_SUPPLIER_ID]
  );
  
  const verifyProducts = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1`,
    [KEEP_SUPPLIER_ID]
  );

  console.log(`\n✅ Cleanup complete`);
  console.log(`Duplicate supplier exists: ${verifySupplier.rows[0].count === '0' ? 'NO ✓' : 'YES ⚠️'}`);
  console.log(`Final product count in Active Music Distribution: ${verifyProducts.rows[0].count}`);
}

forceCleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });

