#!/usr/bin/env bun
/**
 * Cleanup Stage One Products Missing Brand or Category
 * 
 * This script removes products from Stage One that are missing:
 * - Brand name (not found in pricelist_row or attrs_json)
 * - Category (category_id is NULL)
 * 
 * Products without brand or category indicate they were incorrectly imported
 * and did not come from Stage One's online source.
 * 
 * Usage:
 *   bun scripts/cleanup-stage-one-missing-data.ts [--dry-run] [--remove]
 * 
 * Options:
 *   --dry-run: Only show what would be removed, don't make changes
 *   --remove: Actually remove products (requires confirmation)
 */

import { query as dbQuery, withTransaction } from '../src/lib/database/unified-connection';

const SUPPLIER_NAME = 'Stage One';

interface ProductToRemove {
  supplier_product_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  brand: string | null;
  category_id: string | null;
  missing_brand: boolean;
  missing_category: boolean;
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
 * Find products missing brand or category
 */
async function findProductsMissingData(supplierId: string): Promise<ProductToRemove[]> {
  const sql = `
    WITH product_brands AS (
      SELECT DISTINCT ON (sp.supplier_product_id)
        sp.supplier_product_id,
        COALESCE(
          (SELECT r.brand 
           FROM spp.pricelist_row r
           JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
           WHERE r.supplier_sku = sp.supplier_sku 
             AND r.brand IS NOT NULL 
             AND r.brand <> ''
           ORDER BY u.received_at DESC, r.row_num DESC
           LIMIT 1),
          sp.attrs_json->>'brand',
          (sp.attrs_json->'brands'->>0)::text,
          NULL
        ) AS brand
      FROM core.supplier_product sp
      WHERE sp.supplier_id = $1
        AND sp.is_active = true
    )
    SELECT 
      sp.supplier_product_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      pb.brand,
      sp.category_id,
      CASE WHEN pb.brand IS NULL OR pb.brand = '' THEN true ELSE false END AS missing_brand,
      CASE WHEN sp.category_id IS NULL THEN true ELSE false END AS missing_category
    FROM core.supplier_product sp
    LEFT JOIN product_brands pb ON pb.supplier_product_id = sp.supplier_product_id
    WHERE sp.supplier_id = $1
      AND sp.is_active = true
      AND (
        pb.brand IS NULL 
        OR pb.brand = ''
        OR sp.category_id IS NULL
      )
    ORDER BY sp.supplier_sku
  `;
  
  const result = await dbQuery<ProductToRemove>(sql, [supplierId]);
  return result.rows;
}

/**
 * Main cleanup function
 */
async function cleanupMissingData(dryRun: boolean = true) {
  console.log('🧹 Stage One Cleanup: Products Missing Brand or Category\n');
  console.log('='.repeat(60) + '\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Step 1: Find supplier
    const supplierId = await findSupplier(SUPPLIER_NAME);
    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found in database`);
    }
    
    console.log(`✅ Found supplier: ${SUPPLIER_NAME} (ID: ${supplierId})\n`);
    
    // Step 2: Find products missing brand or category
    console.log('🔍 Finding products missing brand or category...\n');
    const productsToRemove = await findProductsMissingData(supplierId);
    
    console.log(`📊 Found ${productsToRemove.length} products to remove\n`);
    
    if (productsToRemove.length === 0) {
      console.log('✅ No products missing brand or category!\n');
      return;
    }
    
    // Step 3: Analyze what's missing
    const missingBrand = productsToRemove.filter(p => p.missing_brand);
    const missingCategory = productsToRemove.filter(p => p.missing_category);
    const missingBoth = productsToRemove.filter(p => p.missing_brand && p.missing_category);
    
    console.log('📋 Analysis:');
    console.log(`   Missing brand only: ${missingBrand.length - missingBoth.length}`);
    console.log(`   Missing category only: ${missingCategory.length - missingBoth.length}`);
    console.log(`   Missing both: ${missingBoth.length}`);
    console.log(`   Total to remove: ${productsToRemove.length}\n`);
    
    // Step 4: Show sample of products to be removed
    console.log('📋 Sample of products to be removed (first 20):');
    productsToRemove.slice(0, 20).forEach((product, idx) => {
      const issues: string[] = [];
      if (product.missing_brand) issues.push('no brand');
      if (product.missing_category) issues.push('no category');
      console.log(`   ${idx + 1}. ${product.supplier_sku} - ${product.name_from_supplier.substring(0, 50)}... [${issues.join(', ')}]`);
    });
    if (productsToRemove.length > 20) {
      console.log(`   ... and ${productsToRemove.length - 20} more\n`);
    } else {
      console.log('');
    }
    
    // Step 5: Group by brand prefix for summary
    const audacProducts = productsToRemove.filter(p => p.supplier_sku.startsWith('AUA-'));
    const sennheiserProducts = productsToRemove.filter(p => p.supplier_sku.startsWith('SEN-'));
    const otherProducts = productsToRemove.filter(p => !p.supplier_sku.startsWith('AUA-') && !p.supplier_sku.startsWith('SEN-'));
    
    console.log('📋 Summary by SKU prefix:');
    console.log(`   Audac (AUA-): ${audacProducts.length}`);
    console.log(`   Sennheiser (SEN-): ${sennheiserProducts.length}`);
    console.log(`   Other: ${otherProducts.length}\n`);
    
    // Step 6: Remove products if not dry run
    if (!dryRun) {
      console.log('⚠️  REMOVAL MODE - This will deactivate products');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🗑️  Deactivating products missing brand or category...\n');
      
      await withTransaction(async (client) => {
        let removed = 0;
        const productIds = productsToRemove.map(p => p.supplier_product_id);
        
        // Deactivate in batches for better performance
        const batchSize = 100;
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          
          await client.query(
            `UPDATE core.supplier_product 
             SET is_active = false, updated_at = NOW()
             WHERE supplier_product_id = ANY($1::uuid[])`,
            [batch]
          );
          
          removed += batch.length;
          
          if (removed % 500 === 0 || removed === productIds.length) {
            console.log(`   ✅ Deactivated ${removed}/${productIds.length} products...`);
          }
        }
        
        console.log(`\n✅ Deactivated ${removed} products\n`);
      });
      
      // Step 7: Show summary
      console.log('📋 Cleanup Summary:');
      console.log(`   Products removed: ${productsToRemove.length}`);
      if (audacProducts.length > 0) {
        console.log(`   Note: ${audacProducts.length} Audac products removed (should belong to AV Distribution)`);
      }
      if (sennheiserProducts.length > 0) {
        console.log(`   Note: ${sennheiserProducts.length} Sennheiser products removed`);
      }
      console.log('');
      
    } else {
      console.log('💡 To actually remove these products, run with --remove flag\n');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--remove');
const remove = args.includes('--remove');

if (remove && !dryRun) {
  console.log('⚠️  WARNING: This will remove products missing brand or category from Stage One');
  console.log('   These products were incorrectly imported and do not come from Stage One\'s online source\n');
}

// Run cleanup
cleanupMissingData(dryRun)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


