#!/usr/bin/env bun
/**
 * Merge duplicate suppliers into one
 * Keeps the one with PlusPortal enabled, migrates all data from the other
 */

import { query, withTransaction } from '../../src/lib/database/unified-connection';

const KEEP_SUPPLIER_ID = '146836e6-706a-4cda-b415-8da00b138c96'; // PlusPortal enabled
const DELETE_SUPPLIER_ID = '8e912e1e-2456-41ce-ab6d-1c60e51f82d0'; // PlusPortal disabled

async function mergeSuppliers() {
  console.log('='.repeat(70));
  console.log('MERGE DUPLICATE SUPPLIERS');
  console.log('='.repeat(70));

  // Verify both suppliers exist
  const keepSupplier = await query<{ name: string; plusportal_enabled: boolean }>(
    `SELECT name, COALESCE(plusportal_enabled, false) as plusportal_enabled 
     FROM core.supplier WHERE supplier_id = $1`,
    [KEEP_SUPPLIER_ID]
  );

  const deleteSupplier = await query<{ name: string; plusportal_enabled: boolean }>(
    `SELECT name, COALESCE(plusportal_enabled, false) as plusportal_enabled 
     FROM core.supplier WHERE supplier_id = $1`,
    [DELETE_SUPPLIER_ID]
  );

  if (keepSupplier.rows.length === 0 || deleteSupplier.rows.length === 0) {
    console.log('One or both suppliers not found!');
    process.exit(1);
  }

  console.log(`\nKEEPING: ${keepSupplier.rows[0].name} (${KEEP_SUPPLIER_ID})`);
  console.log(`  PlusPortal: ${keepSupplier.rows[0].plusportal_enabled ? 'enabled' : 'disabled'}`);
  
  console.log(`\nDELETING: ${deleteSupplier.rows[0].name} (${DELETE_SUPPLIER_ID})`);
  console.log(`  PlusPortal: ${deleteSupplier.rows[0].plusportal_enabled ? 'enabled' : 'disabled'}`);

  // Count products in each
  const keepProductCount = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1`,
    [KEEP_SUPPLIER_ID]
  );
  const deleteProductCount = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1`,
    [DELETE_SUPPLIER_ID]
  );

  console.log(`\nProducts to keep: ${keepProductCount.rows[0].count}`);
  console.log(`Products to migrate: ${deleteProductCount.rows[0].count}`);

  // Get products from supplier to delete
  const productsToMigrate = await query<{ 
    supplier_product_id: string; 
    supplier_sku: string;
    name_from_supplier: string;
    attrs_json: Record<string, unknown>;
  }>(
    `SELECT supplier_product_id, supplier_sku, name_from_supplier, attrs_json
     FROM core.supplier_product 
     WHERE supplier_id = $1`,
    [DELETE_SUPPLIER_ID]
  );

  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATING DATA...');
  console.log('='.repeat(70));

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of productsToMigrate.rows) {
    try {
      // Check if SKU already exists in target supplier
      const existing = await query<{ supplier_product_id: string }>(
        `SELECT supplier_product_id FROM core.supplier_product 
         WHERE supplier_id = $1 AND supplier_sku = $2`,
        [KEEP_SUPPLIER_ID, product.supplier_sku]
      );

      if (existing.rows.length > 0) {
        // SKU exists - merge attrs and skip
        const existingId = existing.rows[0].supplier_product_id;
        
        // Get existing attrs
        const existingAttrs = await query<{ attrs_json: Record<string, unknown> }>(
          `SELECT attrs_json FROM core.supplier_product WHERE supplier_product_id = $1`,
          [existingId]
        );
        
        // Merge attrs (keep existing, add new from duplicate)
        const mergedAttrs = {
          ...product.attrs_json,
          ...existingAttrs.rows[0]?.attrs_json,
        };
        
        await query(
          `UPDATE core.supplier_product SET attrs_json = $1 WHERE supplier_product_id = $2`,
          [JSON.stringify(mergedAttrs), existingId]
        );
        
        // Migrate any stock_on_hand records
        await query(
          `UPDATE core.stock_on_hand 
           SET supplier_product_id = $1 
           WHERE supplier_product_id = $2
           ON CONFLICT (location_id, supplier_product_id) DO NOTHING`,
          [existingId, product.supplier_product_id]
        );
        
        // Migrate any price_history records (mark old product's as not current)
        await query(
          `UPDATE core.price_history 
           SET is_current = false 
           WHERE supplier_product_id = $1`,
          [product.supplier_product_id]
        );
        
        // Delete duplicate product's related records
        await query(`DELETE FROM core.stock_on_hand WHERE supplier_product_id = $1`, [product.supplier_product_id]);
        await query(`DELETE FROM core.price_history WHERE supplier_product_id = $1`, [product.supplier_product_id]);
        await query(`DELETE FROM core.supplier_product WHERE supplier_product_id = $1`, [product.supplier_product_id]);
        
        skipped++;
      } else {
        // SKU doesn't exist - migrate the product
        await query(
          `UPDATE core.supplier_product 
           SET supplier_id = $1 
           WHERE supplier_product_id = $2`,
          [KEEP_SUPPLIER_ID, product.supplier_product_id]
        );
        migrated++;
      }
    } catch (error) {
      console.error(`Error migrating ${product.supplier_sku}:`, error);
      errors++;
    }
  }

  console.log(`\nMigrated: ${migrated}`);
  console.log(`Merged (duplicate SKUs): ${skipped}`);
  console.log(`Errors: ${errors}`);

  // Migrate sync logs
  console.log('\nMigrating sync logs...');
  await query(
    `UPDATE core.plusportal_sync_log SET supplier_id = $1 WHERE supplier_id = $2`,
    [KEEP_SUPPLIER_ID, DELETE_SUPPLIER_ID]
  );

  // Migrate stock locations
  console.log('Migrating stock locations...');
  await query(
    `UPDATE core.stock_location SET supplier_id = $1 WHERE supplier_id = $2`,
    [KEEP_SUPPLIER_ID, DELETE_SUPPLIER_ID]
  );

  // Delete the duplicate supplier
  console.log('\nDeleting duplicate supplier...');
  
  // First check if there are any remaining products
  const remainingProducts = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1`,
    [DELETE_SUPPLIER_ID]
  );
  
  if (parseInt(remainingProducts.rows[0].count) > 0) {
    console.log(`WARNING: ${remainingProducts.rows[0].count} products still remain - cannot delete supplier`);
  } else {
    await query(`DELETE FROM core.supplier WHERE supplier_id = $1`, [DELETE_SUPPLIER_ID]);
    console.log('✓ Duplicate supplier deleted');
  }

  // Final verification
  const finalCount = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1`,
    [KEEP_SUPPLIER_ID]
  );

  console.log(`\n${'='.repeat(70)}`);
  console.log('MERGE COMPLETE');
  console.log('='.repeat(70));
  console.log(`Final product count: ${finalCount.rows[0].count}`);
}

mergeSuppliers()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });

