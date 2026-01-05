#!/usr/bin/env bun
/**
 * Remove products matching SKUs from CSV file
 * 
 * This script reads a CSV file and removes all supplier products
 * that match the SKUs listed in the CSV.
 * 
 * Usage:
 *   bun scripts/remove-products-by-csv-skus.ts <csv-file-path> [--dry-run]
 * 
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';

interface ProductRow {
  productNo: string;
}

/**
 * Detect CSV delimiter (comma or semicolon)
 */
function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current);

  return values;
}

/**
 * Parse CSV file and extract product SKUs
 */
function parseCSV(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines[0]);
  console.log(`   Detected delimiter: ${delimiter === ';' ? 'semicolon' : 'comma'}`);

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Find column index for Product No (case-insensitive, flexible matching)
  const productNoIdx = headers.findIndex(h => 
    h.toLowerCase().includes('product no') && 
    !h.toLowerCase().includes('manufacturer')
  );

  if (productNoIdx === -1) {
    console.error('Headers found:', headers);
    throw new Error('Product No column not found in CSV header');
  }

  const skus: string[] = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line, delimiter);
    const productNo = (values[productNoIdx] || '').trim().replace(/^"|"$/g, '');

    if (productNo) {
      skus.push(productNo);
    }
  }

  return [...new Set(skus)]; // Remove duplicates
}

/**
 * Find products matching the SKUs that were created TODAY (duplicates from incorrect upload)
 */
async function findDuplicateProductsBySKUs(
  client: Client,
  skus: string[]
): Promise<Array<{
  supplier_product_id: string;
  supplier_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  supplier_name: string;
  supplier_code: string;
  created_at: Date;
}>> {
  if (skus.length === 0) return [];

  // Only find products created TODAY that match the SKUs
  // This ensures we only delete duplicates from the incorrect upload, not existing correct imports
  const result = await client.query(`
    SELECT 
      sp.supplier_product_id,
      sp.supplier_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      s.name as supplier_name,
      s.code as supplier_code,
      sp.created_at
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    WHERE sp.supplier_sku = ANY($1::text[])
      AND (DATE(sp.created_at) = CURRENT_DATE OR DATE(sp.first_seen_at) = CURRENT_DATE)
    ORDER BY sp.created_at DESC
  `, [skus]);

  return result.rows;
}

/**
 * Delete products and all related data
 */
async function deleteProducts(
  client: Client,
  productIds: string[],
  dryRun: boolean
): Promise<{ deleted: number; errors: string[] }> {
  if (productIds.length === 0) {
    return { deleted: 0, errors: [] };
  }

  const errors: string[] = [];
  let deleted = 0;

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would delete ${productIds.length} products`);
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
  const csvFilePath = args.find(arg => !arg.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!csvFilePath) {
    console.error('❌ Usage: bun scripts/remove-products-by-csv-skus.ts <csv-file-path> [--dry-run]');
    console.error('   Example: bun scripts/remove-products-by-csv-skus.ts "C:\\path\\to\\file.csv"');
    process.exit(1);
  }

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

    // Step 1: Parse CSV file
    console.log(`📖 Step 1: Reading CSV file: ${csvFilePath}...`);
    const skus = parseCSV(csvFilePath);
    console.log(`✅ Found ${skus.length} unique SKUs in CSV\n`);

    if (skus.length === 0) {
      console.log('⚠️  No SKUs found in CSV file');
      process.exit(0);
    }

    // Step 2: Find duplicate products created TODAY (from incorrect upload)
    console.log(`🔍 Step 2: Finding duplicate products created TODAY matching ${skus.length} SKUs...`);
    const products = await findDuplicateProductsBySKUs(client, skus);
    console.log(`✅ Found ${products.length} duplicate products created today\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found matching the SKUs in CSV');
      process.exit(0);
    }

    // Show summary
    console.log(`📊 Summary:`);
    console.log(`   SKUs in CSV: ${skus.length}`);
    console.log(`   Duplicate products created TODAY: ${products.length}`);
    console.log(`   (Only products created today will be deleted - existing imports preserved)\n`);
    
    // Group by supplier
    const bySupplier = new Map<string, { name: string; code: string; count: number }>();
    products.forEach(p => {
      const key = p.supplier_id;
      const existing = bySupplier.get(key) || { name: p.supplier_name, code: p.supplier_code, count: 0 };
      existing.count++;
      bySupplier.set(key, existing);
    });
    
    console.log(`   Affected suppliers: ${bySupplier.size}`);
    bySupplier.forEach((info, supplierId) => {
      console.log(`     - ${info.name} (${info.code}): ${info.count} duplicate products`);
    });

    // Check for products that exist but weren't created today (these will be preserved)
    const allProductsResult = await client.query(`
      SELECT COUNT(*) as total_count
      FROM core.supplier_product
      WHERE supplier_sku = ANY($1::text[])
        AND (DATE(created_at) != CURRENT_DATE AND DATE(first_seen_at) != CURRENT_DATE)
    `, [skus]);
    const preservedCount = parseInt(allProductsResult.rows[0]?.total_count || '0');
    if (preservedCount > 0) {
      console.log(`\n   ✅ Preserving ${preservedCount} existing products (not created today)`);
    }

    // Step 3: Confirm deletion
    if (!dryRun) {
      console.log(`\n⚠️  About to delete ${products.length} products and all related data`);
      console.log('   This action cannot be undone!');
      console.log('\n   Press Ctrl+C to cancel, or wait 10 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Step 4: Delete products
    const productIds = products.map(p => p.supplier_product_id);
    console.log(`\n🗑️  Step 3: Deleting products${dryRun ? ' (DRY RUN)' : ''}...`);
    const result = await deleteProducts(client, productIds, dryRun);

    if (dryRun) {
      console.log(`\n✅ Dry run complete - ${products.length} products would be deleted`);
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

