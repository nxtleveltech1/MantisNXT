#!/usr/bin/env bun
/**
 * Cleanup Stage One Mismatched Products
 * 
 * This script removes products from Stage One that are not in their API.
 * Based on verification results from verify-stage-one-products.ts
 * 
 * Usage:
 *   bun scripts/cleanup-stage-one-mismatches.ts [--dry-run] [--remove]
 * 
 * Options:
 *   --dry-run: Only show what would be removed, don't make changes
 *   --remove: Actually remove mismatched products (requires confirmation)
 */

import { readdirSync, readFileSync } from 'fs';
import { query as dbQuery, withTransaction } from '../src/lib/database/unified-connection';

const SUPPLIER_NAME = 'Stage One';

interface MismatchRecord {
  sku: string;
  name: string;
  product_id: string;
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
 * Read mismatches from CSV file
 */
function readMismatchesFromCSV(csvPath: string): MismatchRecord[] {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1); // Skip header
  
  const mismatches: MismatchRecord[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Parse CSV (handling quoted fields)
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    
    if (parts.length >= 4 && parts[0] && parts[3]) {
      mismatches.push({
        sku: parts[0],
        name: parts[1].replace(/^"|"$/g, ''), // Remove quotes
        product_id: parts[3],
      });
    }
  }
  
  return mismatches;
}

/**
 * Main cleanup function
 */
async function cleanupMismatches(dryRun: boolean = true) {
  console.log('🧹 Stage One Mismatch Cleanup\n');
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
    
    // Step 2: Find latest mismatch CSV file
    const allFiles = readdirSync('.');
    const csvFiles = allFiles.filter(f => f.startsWith('stage-one-mismatches-') && f.endsWith('.csv'));
    if (csvFiles.length === 0) {
      throw new Error('No mismatch CSV file found. Please run verify-stage-one-products.ts first.');
    }
    
    const latestCsv = csvFiles.sort().reverse()[0];
    console.log(`📄 Reading mismatches from: ${latestCsv}\n`);
    
    const mismatches = readMismatchesFromCSV(latestCsv);
    console.log(`📊 Found ${mismatches.length} mismatched products\n`);
    
    if (mismatches.length === 0) {
      console.log('✅ No mismatches to clean up!\n');
      return;
    }
    
    // Step 3: Group by brand/type for summary
    const audacProducts = mismatches.filter(m => m.sku.startsWith('AUA-'));
    const sennheiserProducts = mismatches.filter(m => m.sku.startsWith('SEN-'));
    const otherProducts = mismatches.filter(m => !m.sku.startsWith('AUA-') && !m.sku.startsWith('SEN-'));
    
    console.log('📋 Summary by Brand:');
    console.log(`   Audac products: ${audacProducts.length}`);
    console.log(`   Sennheiser products: ${sennheiserProducts.length}`);
    console.log(`   Other products: ${otherProducts.length}\n`);
    
    // Step 4: Verify products exist in database
    console.log('🔍 Verifying products in database...\n');
    const productIds = mismatches.map(m => m.product_id);
    
    const verifySql = `
      SELECT supplier_product_id, supplier_sku, name_from_supplier
      FROM core.supplier_product
      WHERE supplier_id = $1
        AND supplier_product_id = ANY($2::uuid[])
        AND is_active = true
    `;
    
    const verifyResult = await dbQuery<{
      supplier_product_id: string;
      supplier_sku: string;
      name_from_supplier: string;
    }>(verifySql, [supplierId, productIds]);
    
    console.log(`✅ Found ${verifyResult.rows.length} active products to deactivate\n`);
    
    if (verifyResult.rows.length === 0) {
      console.log('⚠️  No active products found. They may have already been removed.\n');
      return;
    }
    
    // Step 5: Show sample of products to be removed
    console.log('📋 Sample of products to be removed (first 10):');
    verifyResult.rows.slice(0, 10).forEach((product, idx) => {
      console.log(`   ${idx + 1}. ${product.supplier_sku} - ${product.name_from_supplier.substring(0, 60)}...`);
    });
    if (verifyResult.rows.length > 10) {
      console.log(`   ... and ${verifyResult.rows.length - 10} more\n`);
    } else {
      console.log('');
    }
    
    // Step 6: Remove products if not dry run
    if (!dryRun) {
      console.log('⚠️  REMOVAL MODE - This will deactivate products');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🗑️  Deactivating mismatched products...\n');
      
      await withTransaction(async (client) => {
        let removed = 0;
        
        for (const product of verifyResult.rows) {
          await client.query(
            `UPDATE core.supplier_product 
             SET is_active = false, updated_at = NOW()
             WHERE supplier_product_id = $1`,
            [product.supplier_product_id]
          );
          removed++;
          
          if (removed % 50 === 0) {
            console.log(`   ✅ Deactivated ${removed}/${verifyResult.rows.length} products...`);
          }
        }
        
        console.log(`\n✅ Deactivated ${removed} products\n`);
      });
      
      // Step 7: Show which supplier should own Audac products
      if (audacProducts.length > 0) {
        console.log('📋 Note: Audac products should belong to AV Distribution');
        console.log(`   Found ${audacProducts.length} Audac products that were removed from Stage One`);
        console.log('   These products may already exist in AV Distribution inventory\n');
      }
      
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
  console.log('⚠️  WARNING: This will remove mismatched products from Stage One');
  console.log('   Make sure you have reviewed the verification report first!\n');
}

// Run cleanup
cleanupMismatches(dryRun)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

