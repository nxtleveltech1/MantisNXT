#!/usr/bin/env bun
/**
 * Check Stage One Products for Missing Stock Numbers
 * 
 * This script:
 * 1. Queries all Stage One products from the database
 * 2. Checks for missing stock numbers (stock_quantity in attrs_json)
 * 3. Reports statistics on missing stock data
 * 4. Then runs a full Stage One online data sync
 * 
 * Usage:
 *   bun scripts/database/check-stage-one-stock-numbers.ts
 */

import { query as dbQuery } from '../../src/lib/database/unified-connection';
import { SupplierJsonSyncService } from '../../src/lib/services/SupplierJsonSyncService';

const SUPPLIER_NAME = 'Stage One';

interface ProductStockInfo {
  supplier_product_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  stock_quantity: number | null;
  qty_on_order: number | null;
  has_stock_quantity: boolean;
  has_qty_on_order: boolean;
  attrs_json: Record<string, unknown>;
}

/**
 * Find supplier by name
 */
async function findSupplier(name: string): Promise<string | null> {
  const result = await dbQuery<{ supplier_id: string }>(
    `SELECT supplier_id 
     FROM core.supplier 
     WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1)
     LIMIT 1`,
    [name]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0].supplier_id;
}

/**
 * Get all Stage One products with stock information
 */
async function getStageOneProductsWithStock(supplierId: string): Promise<ProductStockInfo[]> {
  const sql = `
    SELECT 
      sp.supplier_product_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.attrs_json,
      COALESCE(
        (sp.attrs_json->>'stock_quantity')::int,
        (sp.attrs_json->>'stock')::int,
        NULL
      ) AS stock_quantity,
      COALESCE(
        (sp.attrs_json->>'qty_on_order')::int,
        (sp.attrs_json->>'stock_on_order')::int,
        NULL
      ) AS qty_on_order,
      CASE 
        WHEN (sp.attrs_json->>'stock_quantity') IS NOT NULL 
          OR (sp.attrs_json->>'stock') IS NOT NULL 
        THEN true 
        ELSE false 
      END AS has_stock_quantity,
      CASE 
        WHEN (sp.attrs_json->>'qty_on_order') IS NOT NULL 
          OR (sp.attrs_json->>'stock_on_order') IS NOT NULL 
        THEN true 
        ELSE false 
      END AS has_qty_on_order
    FROM core.supplier_product sp
    WHERE sp.supplier_id = $1
      AND sp.is_active = true
    ORDER BY sp.supplier_sku
  `;
  
  const result = await dbQuery<ProductStockInfo>(sql, [supplierId]);
  return result.rows;
}

/**
 * Check stock numbers and generate report
 */
async function checkStockNumbers() {
  console.log('🔍 Checking Stage One Products for Missing Stock Numbers\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Find supplier
    const supplierId = await findSupplier(SUPPLIER_NAME);
    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found in database`);
    }

    console.log(`✅ Found supplier: ${SUPPLIER_NAME} (ID: ${supplierId})\n`);

    // Step 2: Get all products with stock info
    console.log('📊 Querying products...\n');
    const products = await getStageOneProductsWithStock(supplierId);

    console.log(`✅ Found ${products.length} products\n`);

    // Step 3: Analyze stock data
    const stats = {
      total: products.length,
      withStockQuantity: 0,
      withoutStockQuantity: 0,
      withQtyOnOrder: 0,
      withoutQtyOnOrder: 0,
      missingBoth: 0,
      stockZero: 0,
      stockPositive: 0,
      stockNegative: 0,
    };

    const missingStock: ProductStockInfo[] = [];
    const missingBoth: ProductStockInfo[] = [];

    for (const product of products) {
      if (product.has_stock_quantity) {
        stats.withStockQuantity++;
        const stockQty = product.stock_quantity ?? 0;
        if (stockQty === 0) {
          stats.stockZero++;
        } else if (stockQty > 0) {
          stats.stockPositive++;
        } else {
          stats.stockNegative++;
        }
      } else {
        stats.withoutStockQuantity++;
        missingStock.push(product);
      }

      if (product.has_qty_on_order) {
        stats.withQtyOnOrder++;
      } else {
        stats.withoutQtyOnOrder++;
      }

      if (!product.has_stock_quantity && !product.has_qty_on_order) {
        stats.missingBoth++;
        missingBoth.push(product);
      }
    }

    // Step 4: Display statistics
    console.log('📊 Stock Number Statistics:');
    console.log('='.repeat(70) + '\n');
    console.log(`Total Products: ${stats.total}`);
    console.log(`\nStock Quantity (SUP-SOH):`);
    console.log(`  ✅ With stock quantity: ${stats.withStockQuantity} (${((stats.withStockQuantity / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Missing stock quantity: ${stats.withoutStockQuantity} (${((stats.withoutStockQuantity / stats.total) * 100).toFixed(1)}%)`);
    console.log(`\nStock Quantity Values:`);
    console.log(`  📈 Positive stock: ${stats.stockPositive}`);
    console.log(`  📉 Zero stock: ${stats.stockZero}`);
    console.log(`  ⚠️  Negative stock: ${stats.stockNegative}`);
    console.log(`\nQuantity on Order:`);
    console.log(`  ✅ With qty on order: ${stats.withQtyOnOrder} (${((stats.withQtyOnOrder / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Missing qty on order: ${stats.withoutQtyOnOrder} (${((stats.withoutQtyOnOrder / stats.total) * 100).toFixed(1)}%)`);
    console.log(`\n⚠️  Missing Both Stock & Qty on Order: ${stats.missingBoth}\n`);

    // Step 5: Show sample of missing stock products
    if (missingStock.length > 0) {
      console.log('📋 Sample Products Missing Stock Quantity:');
      console.log('-'.repeat(70));
      const sampleSize = Math.min(10, missingStock.length);
      for (let i = 0; i < sampleSize; i++) {
        const p = missingStock[i];
        console.log(`  ${i + 1}. SKU: ${p.supplier_sku}`);
        console.log(`     Name: ${p.name_from_supplier}`);
        console.log(`     Product ID: ${p.supplier_product_id}`);
        console.log('');
      }
      if (missingStock.length > sampleSize) {
        console.log(`  ... and ${missingStock.length - sampleSize} more products\n`);
      }
    }

    if (missingBoth.length > 0) {
      console.log('📋 Products Missing Both Stock & Qty on Order:');
      console.log('-'.repeat(70));
      const sampleSize = Math.min(10, missingBoth.length);
      for (let i = 0; i < sampleSize; i++) {
        const p = missingBoth[i];
        console.log(`  ${i + 1}. SKU: ${p.supplier_sku}`);
        console.log(`     Name: ${p.name_from_supplier}`);
        console.log('');
      }
      if (missingBoth.length > sampleSize) {
        console.log(`  ... and ${missingBoth.length - sampleSize} more products\n`);
      }
    }

    return {
      supplierId,
      stats,
      missingStock,
      missingBoth,
    };
  } catch (error) {
    console.error('❌ Error checking stock numbers:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Run full Stage One sync
 */
async function runFullSync(supplierId: string) {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 Running Full Stage One Online Data Sync');
  console.log('='.repeat(70) + '\n');

  try {
    const syncService = new SupplierJsonSyncService(supplierId);
    
    // Check if feed is configured
    const config = await syncService.getFeedConfig();
    if (!config || !config.feedUrl) {
      throw new Error('No JSON feed URL configured for Stage One. Please configure the feed URL first.');
    }

    console.log(`📡 Feed URL: ${config.feedUrl}`);
    console.log(`📋 Feed Type: ${config.feedType}`);
    console.log(`✅ Feed Enabled: ${config.enabled}`);
    console.log(`⏱️  Sync Interval: ${config.intervalMinutes} minutes\n`);

    if (!config.enabled) {
      console.log('⚠️  Feed is disabled. Enabling it for this sync...\n');
      await syncService.updateFeedConfig({ enabled: true });
    }

    // Run sync
    console.log('🚀 Starting sync...\n');
    const result = await syncService.sync();

    console.log('\n' + '='.repeat(70));
    console.log('✅ Sync Complete');
    console.log('='.repeat(70) + '\n');
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Products Fetched: ${result.productsFetched}`);
    console.log(`Products Updated: ${result.productsUpdated}`);
    console.log(`Products Created: ${result.productsCreated}`);
    console.log(`Products Failed: ${result.productsFailed}`);
    
    if (result.errorMessage) {
      console.log(`\n❌ Error: ${result.errorMessage}`);
    }

    if (result.logId) {
      console.log(`\n📝 Log ID: ${result.logId}`);
    }

    return result;
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Step 1: Check stock numbers
    const checkResult = await checkStockNumbers();

    // Step 2: Run full sync
    await runFullSync(checkResult.supplierId);

    // Step 3: Re-check stock numbers after sync
    console.log('\n' + '='.repeat(70));
    console.log('🔍 Re-checking Stock Numbers After Sync');
    console.log('='.repeat(70) + '\n');

    const postSyncCheck = await checkStockNumbers();

    // Step 4: Compare before/after
    console.log('\n' + '='.repeat(70));
    console.log('📊 Before/After Comparison');
    console.log('='.repeat(70) + '\n');
    console.log('Stock Quantity Coverage:');
    console.log(`  Before: ${checkResult.stats.withStockQuantity}/${checkResult.stats.total} (${((checkResult.stats.withStockQuantity / checkResult.stats.total) * 100).toFixed(1)}%)`);
    console.log(`  After:  ${postSyncCheck.stats.withStockQuantity}/${postSyncCheck.stats.total} (${((postSyncCheck.stats.withStockQuantity / postSyncCheck.stats.total) * 100).toFixed(1)}%)`);
    console.log(`  Change: ${postSyncCheck.stats.withStockQuantity - checkResult.stats.withStockQuantity > 0 ? '+' : ''}${postSyncCheck.stats.withStockQuantity - checkResult.stats.withStockQuantity} products\n`);

    console.log('✅ Script completed successfully\n');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });


