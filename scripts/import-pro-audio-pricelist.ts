#!/usr/bin/env bun
/**
 * Import Pro Audio Platinum Pricelist
 * 
 * Processes Excel pricelist file with multiple brand sheets and imports
 * into core.supplier_product table.
 * 
 * Usage: 
 *   bun scripts/import-pro-audio-pricelist.ts [supplier-id]
 * 
 * Or set SUPPLIER_ID environment variable:
 *   SUPPLIER_ID=xxx bun scripts/import-pro-audio-pricelist.ts
 * 
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Excel file at the specified path
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { Client } from 'pg';

const EXCEL_FILE_PATH = 'C:\\Users\\garet\\Downloads\\drive-download-20251103T124908Z-1-001\\Pro Audio platinum .xlsx';
const NEON_PROJECT_ID = 'proud-mud-50346856';

// Column mappings based on the Excel structure shown in the image
const COLUMN_MAPPINGS = {
  SKU: ['sku', 'item_sku', 'product_sku', 'code'],
  ProductName: ['product name', 'name', 'product_name', 'item_name'],
  Barcode: ['barcode', 'ean', 'upc'],
  Description: ['product description', 'description', 'desc', 'details'],
  CostExcluding: ['cost excluding', 'cost_excluding', 'cost exc', 'price_excl'],
  CostIncluding: ['cost including', 'cost_including', 'cost inc', 'price_incl'],
  RecommendedRetailPrice: ['recommended retail price', 'rsp', 'rrp', 'recommended_retail_price', 'recommended_price'],
} as const;

interface ProductRow {
  sku: string;
  productName: string;
  barcode?: string;
  description?: string;
  costExcluding?: number;
  costIncluding?: number;
  recommendedRetailPrice?: number;
  brand: string; // From sheet name
  sheetName: string;
  rowNumber: number;
}

/**
 * Find column index in headers array
 */
function findColumnIndex(headers: string[], patterns: readonly string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || '').toLowerCase().trim();
    for (const pattern of patterns) {
      if (header.includes(pattern.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Normalize price value (remove currency symbols, spaces, etc.)
 */
function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const str = String(value).replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Extract brand name from sheet name
 */
function extractBrandName(sheetName: string): string {
  // Remove common prefixes/suffixes and clean up
  return sheetName
    .replace(/^(AUDIO TECHNICA|AT)\s*/i, '')
    .replace(/\s*(PRO|CONSUMER)$/i, '')
    .trim() || sheetName;
}

/**
 * Read and parse Excel file
 */
function readExcelFile(filePath: string): { workbook: XLSX.WorkBook; sheets: Map<string, ProductRow[]> } {
  console.log(`📖 Reading Excel file: ${filePath}`);
  
  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  console.log(`✅ File read successfully. Found ${workbook.SheetNames.length} sheets`);
  
  const allProducts = new Map<string, ProductRow[]>();
  
  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n📋 Processing sheet: "${sheetName}"`);
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
    
    if (jsonData.length < 2) {
      console.log(`⚠️  Sheet "${sheetName}" has no data rows, skipping`);
      continue;
    }
    
    // First row is headers
    const headers = (jsonData[0] || []).map(h => String(h || '').trim());
    
    // Find column indices
    const skuIndex = findColumnIndex(headers, COLUMN_MAPPINGS.SKU);
    const nameIndex = findColumnIndex(headers, COLUMN_MAPPINGS.ProductName);
    const barcodeIndex = findColumnIndex(headers, COLUMN_MAPPINGS.Barcode);
    const descIndex = findColumnIndex(headers, COLUMN_MAPPINGS.Description);
    const costExclIndex = findColumnIndex(headers, COLUMN_MAPPINGS.CostExcluding);
    const costInclIndex = findColumnIndex(headers, COLUMN_MAPPINGS.CostIncluding);
    const rspIndex = findColumnIndex(headers, COLUMN_MAPPINGS.RecommendedRetailPrice);
    
    console.log(`   Columns found: SKU=${skuIndex !== -1 ? '✓' : '✗'}, Name=${nameIndex !== -1 ? '✓' : '✗'}, Cost Excl=${costExclIndex !== -1 ? '✓' : '✗'}, Cost Incl=${costInclIndex !== -1 ? '✓' : '✗'}, RSP=${rspIndex !== -1 ? '✓' : '✗'}`);
    
    if (skuIndex === -1 || nameIndex === -1) {
      console.log(`⚠️  Sheet "${sheetName}" missing required columns (SKU or Name), skipping`);
      continue;
    }
    
    const brandName = extractBrandName(sheetName);
    const products: ProductRow[] = [];
    
    // Process data rows (skip header)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      const sku = String(row[skuIndex] || '').trim();
      const productName = String(row[nameIndex] || '').trim();
      
      // Skip empty rows
      if (!sku && !productName) {
        continue;
      }
      
      // Skip if missing required fields
      if (!sku || !productName) {
        console.log(`⚠️  Row ${i + 1}: Missing SKU or Product Name, skipping`);
        continue;
      }
      
      const product: ProductRow = {
        sku: sku.toUpperCase(),
        productName,
        brand: brandName,
        sheetName,
        rowNumber: i + 1,
        barcode: barcodeIndex !== -1 ? String(row[barcodeIndex] || '').trim() || undefined : undefined,
        description: descIndex !== -1 ? String(row[descIndex] || '').trim() || undefined : undefined,
        costExcluding: costExclIndex !== -1 ? normalizePrice(row[costExclIndex]) : null,
        costIncluding: costInclIndex !== -1 ? normalizePrice(row[costInclIndex]) : null,
        recommendedRetailPrice: rspIndex !== -1 ? normalizePrice(row[rspIndex]) : null,
      };
      
      products.push(product);
    }
    
    console.log(`   ✅ Extracted ${products.length} products from sheet "${sheetName}"`);
    allProducts.set(sheetName, products);
  }
  
  return { workbook, sheets: allProducts };
}

/**
 * Generate SQL for inserting/updating supplier products
 */
function generateInsertSQL(products: ProductRow[], supplierId: string): string[] {
  const sqlStatements: string[] = [];
  
  for (const product of products) {
    // Use cost_including as primary price, fallback to cost_excluding
    const primaryPrice = product.costIncluding ?? product.costExcluding;
    
    if (!primaryPrice || primaryPrice <= 0) {
      console.log(`⚠️  Skipping product ${product.sku} (${product.productName}): No valid price found`);
      continue;
    }
    
    // Prepare attrs_json with additional pricing info
    const attrsJson: Record<string, unknown> = {
      brand: product.brand,
      sheetName: product.sheetName,
      rowNumber: product.rowNumber,
    };
    
    if (product.costExcluding !== null) {
      attrsJson.cost_excluding = product.costExcluding;
    }
    if (product.costIncluding !== null) {
      attrsJson.cost_including = product.costIncluding;
    }
    if (product.recommendedRetailPrice !== null) {
      attrsJson.rsp = product.recommendedRetailPrice;
    }
    if (product.description) {
      attrsJson.description = product.description;
    }
    
    // Insert or update supplier_product
    const upsertSQL = `
      INSERT INTO core.supplier_product (
        supplier_id,
        supplier_sku,
        name_from_supplier,
        uom,
        barcode,
        attrs_json,
        last_seen_at,
        is_active,
        is_new
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        NOW(),
        true,
        false
      )
      ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
        name_from_supplier = EXCLUDED.name_from_supplier,
        uom = EXCLUDED.uom,
        barcode = COALESCE(EXCLUDED.barcode, core.supplier_product.barcode),
        attrs_json = EXCLUDED.attrs_json,
        last_seen_at = NOW(),
        is_active = true,
        updated_at = NOW()
      RETURNING supplier_product_id;
    `;
    
    sqlStatements.push(`
      DO $$
      DECLARE
        v_product_id UUID;
      BEGIN
        INSERT INTO core.supplier_product (
          supplier_id,
          supplier_sku,
          name_from_supplier,
          uom,
          barcode,
          attrs_json,
          last_seen_at,
          is_active,
          is_new
        )
        VALUES (
          '${supplierId}'::uuid,
          '${product.sku.replace(/'/g, "''")}',
          '${product.productName.replace(/'/g, "''")}',
          'each',
          ${product.barcode ? `'${product.barcode.replace(/'/g, "''")}'` : 'NULL'},
          '${JSON.stringify(attrsJson)}'::jsonb,
          NOW(),
          true,
          false
        )
        ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
          name_from_supplier = EXCLUDED.name_from_supplier,
          uom = EXCLUDED.uom,
          barcode = COALESCE(EXCLUDED.barcode, core.supplier_product.barcode),
          attrs_json = EXCLUDED.attrs_json,
          last_seen_at = NOW(),
          is_active = true,
          updated_at = NOW()
        RETURNING supplier_product_id INTO v_product_id;
        
        -- Insert price into price_history if we have a valid price
        IF v_product_id IS NOT NULL THEN
          -- Mark old prices as not current
          UPDATE core.price_history
          SET is_current = false, valid_to = NOW()
          WHERE supplier_product_id = v_product_id AND is_current = true;
          
          -- Insert new price
          INSERT INTO core.price_history (
            supplier_product_id,
            price,
            currency,
            valid_from,
            is_current,
            change_reason
          )
          VALUES (
            v_product_id,
            ${primaryPrice},
            'ZAR',
            NOW(),
            true,
            'Pricelist import from ${product.sheetName.replace(/'/g, "''")}'
          );
        END IF;
      END $$;
    `);
  }
  
  return sqlStatements;
}

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2
     LIMIT 5`,
    [`%${supplierName.toLowerCase()}%`, `%platinum%`]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  if (result.rows.length === 1) {
    return result.rows[0].supplier_id;
  }
  
  // Multiple matches - show options
  console.log('\n⚠️  Multiple suppliers found:');
  result.rows.forEach((row, idx) => {
    console.log(`   ${idx + 1}. ${row.name} (${row.code}) - ID: ${row.supplier_id}`);
  });
  
  // Return first match for now
  return result.rows[0].supplier_id;
}

/**
 * Import products to database
 */
async function importProducts(client: Client, products: ProductRow[], supplierId: string): Promise<{ inserted: number; updated: number; errors: string[] }> {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  for (const product of products) {
    // Use cost_including as primary price, fallback to cost_excluding
    const primaryPrice = product.costIncluding ?? product.costExcluding;
    
    if (!primaryPrice || primaryPrice <= 0) {
      errors.push(`Product ${product.sku} (${product.productName}): No valid price found`);
      continue;
    }
    
    try {
      // Prepare attrs_json with additional pricing info
      const attrsJson: Record<string, unknown> = {
        brand: product.brand,
        sheetName: product.sheetName,
        rowNumber: product.rowNumber,
      };
      
      if (product.costExcluding !== null) {
        attrsJson.cost_excluding = product.costExcluding;
      }
      if (product.costIncluding !== null) {
        attrsJson.cost_including = product.costIncluding;
      }
      if (product.recommendedRetailPrice !== null) {
        attrsJson.rsp = product.recommendedRetailPrice;
      }
      if (product.description) {
        attrsJson.description = product.description;
      }
      
      // Insert or update supplier_product
      const upsertResult = await client.query(
        `INSERT INTO core.supplier_product (
          supplier_id,
          supplier_sku,
          name_from_supplier,
          uom,
          barcode,
          attrs_json,
          last_seen_at,
          is_active,
          is_new
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), true, false)
        ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
          name_from_supplier = EXCLUDED.name_from_supplier,
          uom = EXCLUDED.uom,
          barcode = COALESCE(EXCLUDED.barcode, core.supplier_product.barcode),
          attrs_json = EXCLUDED.attrs_json,
          last_seen_at = NOW(),
          is_active = true,
          updated_at = NOW()
        RETURNING supplier_product_id`,
        [
          supplierId,
          product.sku,
          product.productName,
          'each',
          product.barcode || null,
          JSON.stringify(attrsJson),
        ]
      );
      
      const supplierProductId = upsertResult.rows[0].supplier_product_id;
      
      // Check if this was an insert or update by checking if created_at is recent
      // If created_at is within 1 second of now, it's likely an insert
      const checkInsertResult = await client.query(
        `SELECT created_at, last_seen_at 
         FROM core.supplier_product 
         WHERE supplier_product_id = $1`,
        [supplierProductId]
      );
      
      const createdAt = new Date(checkInsertResult.rows[0].created_at);
      const lastSeenAt = new Date(checkInsertResult.rows[0].last_seen_at);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
      
      // If created_at is recent (within 5 seconds), it's likely an insert
      if (timeDiff < 5000 && lastSeenAt.getTime() - createdAt.getTime() < 5000) {
        inserted++;
      } else {
        updated++;
      }
      
      // Mark old prices as not current
      await client.query(
        `UPDATE core.price_history
         SET is_current = false, valid_to = NOW()
         WHERE supplier_product_id = $1 AND is_current = true`,
        [supplierProductId]
      );
      
      // Insert new price into price_history
      await client.query(
        `INSERT INTO core.price_history (
          supplier_product_id,
          price,
          currency,
          valid_from,
          is_current,
          change_reason
        )
        VALUES ($1, $2, 'ZAR', NOW(), true, $3)`,
        [
          supplierProductId,
          primaryPrice,
          `Pricelist import from ${product.sheetName}`,
        ]
      );
      
    } catch (error) {
      errors.push(`Product ${product.sku}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return { inserted, updated, errors };
}

/**
 * Main execution function
 */
async function main() {
  console.log('\n🚀 Pro Audio Platinum Pricelist Import');
  console.log('=======================================\n');
  
  // Get supplier ID from args or env
  const supplierIdArg = process.argv[2] || process.env.SUPPLIER_ID;
  
  // Get database connection
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or NEON_SPP_DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');
    
    // Step 1: Find supplier ID
    let supplierId: string | null = null;
    if (supplierIdArg) {
      supplierId = supplierIdArg;
      console.log(`✅ Using provided supplier ID: ${supplierId}\n`);
    } else {
      console.log('🔍 Step 1: Finding supplier "Pro Audio platinum"...');
      supplierId = await findSupplier(client, 'Pro Audio platinum');
      
      if (!supplierId) {
        console.log('\n⚠️  Supplier not found. Please provide supplier ID:');
        console.log('   bun scripts/import-pro-audio-pricelist.ts <supplier-id>\n');
        
        // Show all suppliers
        const allSuppliers = await client.query('SELECT supplier_id, name, code FROM core.supplier ORDER BY name LIMIT 20');
        console.log('Available suppliers:');
        allSuppliers.rows.forEach((row) => {
          console.log(`   ${row.supplier_id} - ${row.name} (${row.code})`);
        });
        console.log();
        process.exit(1);
      }
      
      const supplierInfo = await client.query('SELECT name, code FROM core.supplier WHERE supplier_id = $1', [supplierId]);
      console.log(`✅ Found supplier: ${supplierInfo.rows[0].name} (${supplierInfo.rows[0].code}) - ID: ${supplierId}\n`);
    }
    
    // Step 2: Read Excel file
    console.log('📖 Step 2: Reading Excel file...');
    const { sheets } = readExcelFile(EXCEL_FILE_PATH);
    
    // Step 3: Show summary
    console.log('\n📊 Step 3: Summary');
    console.log('==================');
    let totalProducts = 0;
    for (const [sheetName, products] of sheets.entries()) {
      console.log(`   ${sheetName}: ${products.length} products`);
      totalProducts += products.length;
    }
    console.log(`\n   Total: ${totalProducts} products across ${sheets.size} sheets\n`);
    
    // Step 4: Import products
    console.log('📥 Step 4: Importing products to database...');
    let totalInserted = 0;
    let totalUpdated = 0;
    const allErrors: string[] = [];
    
    for (const [sheetName, products] of sheets.entries()) {
      console.log(`\n   Processing sheet: "${sheetName}" (${products.length} products)...`);
      const result = await importProducts(client, products, supplierId);
      totalInserted += result.inserted;
      totalUpdated += result.updated;
      allErrors.push(...result.errors);
      console.log(`   ✅ Inserted: ${result.inserted}, Updated: ${result.updated}, Errors: ${result.errors.length}`);
    }
    
    // Final summary
    console.log('\n🎉 Import Complete!');
    console.log('===================');
    console.log(`   Total Inserted: ${totalInserted}`);
    console.log(`   Total Updated: ${totalUpdated}`);
    console.log(`   Total Errors: ${allErrors.length}`);
    
    if (allErrors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      allErrors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
      if (allErrors.length > 10) {
        console.log(`   ... and ${allErrors.length - 10} more errors`);
      }
    }
    
    console.log();
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

