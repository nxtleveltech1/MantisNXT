#!/usr/bin/env bun
/**
 * Remove products imported in batches
 * 
 * This script identifies and removes all products that were imported through
 * batch imports (31 batches) to resolve supplier confusion issues.
 * 
 * Usage:
 *   bun scripts/remove-batch-imported-products.ts [--dry-run] [--batch-count=31]
 * 
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 */

import { Client } from 'pg';
import { randomUUID } from 'crypto';

interface BatchInfo {
  batch_id: string;
  job_id: string;
  created_at: Date;
  products_created: number;
  status: string;
}

interface ProductToDelete {
  supplier_product_id: string;
  supplier_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  batch_id?: string;
  upload_id?: string;
}

/**
 * Find batches to remove products from
 */
async function findBatches(client: Client, batchCount?: number): Promise<BatchInfo[]> {
  // Check if spp.import_batches table exists
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'spp' 
      AND table_name = 'import_batches'
    )
  `);

  if (tableExists.rows[0].exists) {
    const query = batchCount
      ? `SELECT batch_id, job_id, created_at, products_created, status
         FROM spp.import_batches
         ORDER BY created_at DESC
         LIMIT $1`
      : `SELECT batch_id, job_id, created_at, products_created, status
         FROM spp.import_batches
         ORDER BY created_at DESC`;

    const result = await client.query<BatchInfo>(query, batchCount ? [batchCount] : []);
    return result.rows;
  }

  return [];
}

/**
 * Find products imported through batches
 */
async function findProductsFromBatches(
  client: Client,
  batchIds: string[]
): Promise<ProductToDelete[]> {
  if (batchIds.length === 0) return [];

  const result = await client.query<ProductToDelete>(`
    SELECT DISTINCT
      sp.supplier_product_id,
      sp.supplier_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      ep.batch_id
    FROM core.supplier_product sp
    JOIN spp.extracted_products ep ON ep.supplier_sku = sp.supplier_sku
    WHERE ep.batch_id = ANY($1::uuid[])
  `, [batchIds]);

  return result.rows;
}

/**
 * Find products imported through pricelist uploads (if batches are actually uploads)
 */
async function findProductsFromUploads(
  client: Client,
  limit?: number
): Promise<ProductToDelete[]> {
  // Check if spp.pricelist_upload table exists
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'spp' 
      AND table_name = 'pricelist_upload'
    )
  `);

  if (!tableExists.rows[0].exists) {
    return [];
  }

  const query = limit
    ? `SELECT DISTINCT
         sp.supplier_product_id,
         sp.supplier_id,
         sp.supplier_sku,
         sp.name_from_supplier,
         pr.upload_id
       FROM core.supplier_product sp
       JOIN spp.pricelist_row pr ON pr.supplier_sku = sp.supplier_sku
       JOIN spp.pricelist_upload pu ON pu.upload_id = pr.upload_id
       WHERE pu.status = 'imported'
       ORDER BY sp.supplier_product_id DESC
       LIMIT $1`
    : `SELECT DISTINCT
         sp.supplier_product_id,
         sp.supplier_id,
         sp.supplier_sku,
         sp.name_from_supplier,
         pr.upload_id
       FROM core.supplier_product sp
       JOIN spp.pricelist_row pr ON pr.supplier_sku = sp.supplier_sku
       JOIN spp.pricelist_upload pu ON pu.upload_id = pr.upload_id
       WHERE pu.status = 'imported'
       ORDER BY sp.supplier_product_id DESC`;

  const result = await client.query<ProductToDelete>(
    query,
    limit ? [limit] : []
  );

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
  const batchCountArg = args.find(arg => arg.startsWith('--batch-count='));
  const batchCount = batchCountArg ? parseInt(batchCountArg.split('=')[1]) : 31;

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

    // Step 1: Find batches
    console.log(`🔍 Step 1: Finding batches (limit: ${batchCount})...`);
    const batches = await findBatches(client, batchCount);
    console.log(`   Found ${batches.length} batches`);

    if (batches.length > 0) {
      batches.forEach((batch, idx) => {
        console.log(`   Batch ${idx + 1}: ${batch.batch_id} (${batch.products_created} products, ${batch.status})`);
      });
    }

    // Step 2: Find products from batches
    let productsToDelete: ProductToDelete[] = [];

    if (batches.length > 0) {
      const batchIds = batches.map(b => b.batch_id);
      console.log(`\n🔍 Step 2: Finding products from ${batches.length} batches...`);
      productsToDelete = await findProductsFromBatches(client, batchIds);
      console.log(`   Found ${productsToDelete.length} products from batches`);
    }

    // Step 3: Also check pricelist uploads (in case batches refer to uploads)
    if (productsToDelete.length === 0) {
      console.log(`\n🔍 Step 2 (alternative): Checking pricelist uploads...`);
      productsToDelete = await findProductsFromUploads(client, batchCount);
      console.log(`   Found ${productsToDelete.length} products from uploads`);
    }

    if (productsToDelete.length === 0) {
      console.log('\n⚠️  No products found to delete');
      console.log('   This could mean:');
      console.log('   - The batches have already been processed');
      console.log('   - Products were imported through a different mechanism');
      console.log('   - The batch tracking tables don\'t exist');
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
    bySupplier.forEach((count, supplierId) => {
      console.log(`     - ${supplierId}: ${count} products`);
    });

    // Step 4: Confirm deletion
    if (!dryRun) {
      console.log(`\n⚠️  About to delete ${productsToDelete.length} products and all related data`);
      console.log('   This action cannot be undone!');
      console.log('\n   Press Ctrl+C to cancel, or wait 10 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Step 5: Delete products
    console.log(`\n🗑️  Step 3: Deleting products${dryRun ? ' (DRY RUN)' : ''}...`);
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

