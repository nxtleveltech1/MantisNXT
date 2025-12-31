#!/usr/bin/env bun
/**
 * Remove products created today
 * 
 * This script identifies and removes products that were created TODAY ONLY
 * to resolve supplier confusion issues from recent batch imports.
 * 
 * Usage:
 *   bun scripts/remove-recent-imported-products.ts [--dry-run]
 * 
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 */

import { Client } from 'pg';

interface ProductToDelete {
  supplier_product_id: string;
  supplier_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  created_at: Date;
  first_seen_at: Date;
}

/**
 * Find products created today
 */
async function findTodayProducts(
  client: Client
): Promise<ProductToDelete[]> {
  const query = `
    SELECT 
      supplier_product_id,
      supplier_id,
      supplier_sku,
      name_from_supplier,
      created_at,
      first_seen_at
    FROM core.supplier_product
    WHERE DATE(created_at) = CURRENT_DATE
       OR DATE(first_seen_at) = CURRENT_DATE
    ORDER BY created_at DESC, first_seen_at DESC
  `;

  const result = await client.query<ProductToDelete>(query);
  return result.rows;
}

/**
 * Delete products and all related data
 */
async function deleteProducts(
  client: Client,
  products: ProductToDelete[],
  dryRun: boolean
): Promise<{ deleted: number; errors: string[] }> {
  if (products.length === 0) {
    return { deleted: 0, errors: [] };
  }

  const productIds = products.map(p => p.supplier_product_id);
  const errors: string[] = [];
  let deleted = 0;

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would delete ${products.length} products`);
    return { deleted: 0, errors: [] };
  }

  await client.query('BEGIN');

  try {
    // Delete in dependency order

    // 1. Delete stock on hand records
    const sohResult = await client.query(`
      DELETE FROM core.stock_on_hand
      WHERE supplier_product_id = ANY($1::uuid[])
    `, [productIds]);
    console.log(`   Deleted ${sohResult.rowCount || 0} stock on hand records`);

    // 2. Delete inventory selected items
    const selectedResult = await client.query(`
      DELETE FROM core.inventory_selected_item
      WHERE supplier_product_id = ANY($1::uuid[])
    `, [productIds]);
    console.log(`   Deleted ${selectedResult.rowCount || 0} inventory selected items`);

    // 3. Delete price history records
    const priceResult = await client.query(`
      DELETE FROM core.price_history
      WHERE supplier_product_id = ANY($1::uuid[])
    `, [productIds]);
    console.log(`   Deleted ${priceResult.rowCount || 0} price history records`);

    // 4. Delete supplier products
    const productResult = await client.query(`
      DELETE FROM core.supplier_product
      WHERE supplier_product_id = ANY($1::uuid[])
    `, [productIds]);
    deleted = productResult.rowCount || 0;
    console.log(`   Deleted ${deleted} supplier products`);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  return { deleted, errors };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or NEON_SPP_DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Step 1: Find products created TODAY
    console.log(`🔍 Finding products created TODAY (${new Date().toISOString().split('T')[0]})...`);
    const productsToDelete = await findTodayProducts(client);
    console.log(`   Found ${productsToDelete.length} products`);

    if (productsToDelete.length === 0) {
      console.log('\n⚠️  No products found to delete');
      process.exit(0);
    }

    // Show summary
    console.log(`\n📊 Summary:`);
    console.log(`   Products to delete: ${productsToDelete.length}`);
    
    // Group by supplier
    const bySupplier = new Map<string, number>();
    productsToDelete.forEach(p => {
      const count = bySupplier.get(p.supplier_id) || 0;
      bySupplier.set(p.supplier_id, count + 1);
    });
    
    console.log(`   Affected suppliers: ${bySupplier.size}`);
    
    // Get supplier names
    if (bySupplier.size > 0) {
      const supplierIds = Array.from(bySupplier.keys());
      const supplierInfo = await client.query<{ supplier_id: string; name: string; code: string }>(`
        SELECT supplier_id, name, code
        FROM core.supplier
        WHERE supplier_id = ANY($1::uuid[])
      `, [supplierIds]);
      
      const supplierMap = new Map(supplierInfo.rows.map(s => [s.supplier_id, s]));
      
      bySupplier.forEach((count, supplierId) => {
        const supplier = supplierMap.get(supplierId);
        const name = supplier ? `${supplier.name} (${supplier.code})` : supplierId;
        console.log(`     - ${name}: ${count} products`);
      });
    }

    // Show date range
    if (productsToDelete.length > 0) {
      const dates = productsToDelete.map(p => p.created_at || p.first_seen_at).filter(Boolean);
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        console.log(`   Date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
      }
    }

    // Step 2: Confirm deletion
    if (!dryRun) {
      console.log(`\n⚠️  About to delete ${productsToDelete.length} products and all related data`);
      console.log('   This action cannot be undone!');
      console.log('\n   Press Ctrl+C to cancel, or wait 10 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Step 3: Delete products
    console.log(`\n🗑️  Deleting products${dryRun ? ' (DRY RUN)' : ''}...`);
    const result = await deleteProducts(client, productsToDelete, dryRun);

    if (dryRun) {
      console.log(`\n✅ Dry run complete - ${productsToDelete.length} products would be deleted`);
    } else {
      console.log(`\n✅ Deletion complete!`);
      console.log(`   Deleted: ${result.deleted} products`);
      console.log(`   Errors: ${result.errors.length}`);
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.slice(0, 10).forEach(error => {
        console.log(`   - ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main();
}

