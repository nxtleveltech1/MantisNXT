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

const EXCEL_FILE_PATH =
  'C:\\Users\\garet\\Downloads\\drive-download-20251103T124908Z-1-001\\Pro Audio platinum .xlsx';
const NEON_PROJECT_ID = 'proud-mud-50346856';

// Column mappings - EXACT match to Excel file structure
// Columns in order: SKU, Product Name, Barcode, Product Description, Cost Excluding, Cost Including, Recommended Retail Price
const COLUMN_MAPPINGS = {
  SKU: ['sku'],
  ProductName: ['product name'],
  Barcode: ['barcode'],
  Description: ['product description'],
  CostExcluding: ['cost excluding'],
  CostIncluding: ['cost including'],
  RecommendedRetailPrice: ['recommended retail price'],
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
    const header = String(headers[i] || '').trim();
    if (!header) continue;

    const lowerHeader = header.toLowerCase();
    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();
      // Try exact match first
      if (lowerHeader === lowerPattern) {
        return i;
      }
      // Try contains match
      if (lowerHeader.includes(lowerPattern) || lowerPattern.includes(lowerHeader)) {
        return i;
      }
      // Try word boundary match for common patterns
      const patternRegex = new RegExp(
        `\\b${lowerPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i'
      );
      if (patternRegex.test(lowerHeader)) {
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

  const str = String(value)
    .replace(/[^\d.,-]/g, '')
    .replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Extract brand name from sheet name
 */
function extractBrandName(sheetName: string): string {
  // Normalize sheet name to brand
  let brand = sheetName.trim();

  // POWERWORKS LINE ARRAY and POWERWORKS are the same brand
  if (/^POWERWORKS/i.test(brand)) {
    return 'POWERWORKS';
  }

  // Remove common prefixes/suffixes and clean up
  brand = brand
    .replace(/^(AUDIO TECHNICA|AT)\s*/i, 'Audio Technica')
    .replace(/\s*(PRO|CONSUMER)$/i, '')
    .trim();

  return brand || sheetName;
}

/**
 * Read and parse Excel file
 */
function readExcelFile(filePath: string): {
  workbook: XLSX.WorkBook;
  sheets: Map<string, ProductRow[]>;
} {
  console.log(`📖 Reading Excel file: ${filePath}`);

  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  console.log(`✅ File read successfully. Found ${workbook.SheetNames.length} sheets`);

  const allProducts = new Map<string, ProductRow[]>();

  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n📋 Processing sheet: "${sheetName}"`);

    const worksheet = workbook.Sheets[sheetName];

    // Try multiple parsing strategies
    // First, try with default settings
    let jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    }) as unknown[][];

    // If that doesn't work, try with raw values
    if (
      !jsonData ||
      jsonData.length === 0 ||
      !jsonData[0] ||
      jsonData[0].every((c: unknown) => !c)
    ) {
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: true,
        blankrows: false,
      }) as unknown[][];
    }

    // Get cell range to check for merged cells or special formatting
    const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
    if (range) {
      // Check for merged cells (these might contain headers)
      const mergedCells = worksheet['!merges'] || [];
      if (
        mergedCells.length > 0 &&
        (sheetName === 'AUDIO TECHNICA CONSUMER' || sheetName === workbook.SheetNames[0])
      ) {
        console.log(`   📋 Sheet has ${mergedCells.length} merged cell ranges`);
      }
    }

    if (jsonData.length < 2) {
      console.log(`⚠️  Sheet "${sheetName}" has no data rows, skipping`);
      continue;
    }

    // Find header row - check first 10 rows for actual headers
    // Excel files often have title rows, merged cells, or headers not in row 0
    let headerRowIndex = -1;
    let headers: string[] = [];

    // Look for header row in first 10 rows
    for (let rowIdx = 0; rowIdx < Math.min(10, jsonData.length); rowIdx++) {
      const row = jsonData[rowIdx] || [];
      const rowHeaders = row
        .map(h => {
          const val = String(h || '').trim();
          return val;
        })
        .filter(h => h.length > 0); // Remove empty cells

      // Check if this row looks like headers (contains common column names)
      const rowText = rowHeaders.join(' ').toLowerCase();
      const hasSku = /sku|product.*code|item.*code|part.*no|^code$/i.test(rowText);
      const hasPrice = /price|cost|excluding|including|retail|rsp|rrp/i.test(rowText);
      const hasName = /product.*name|name|description|item.*name/i.test(rowText);

      // Must have SKU and at least one other field
      if (hasSku && (hasPrice || hasName) && rowHeaders.length >= 3) {
        headerRowIndex = rowIdx;
        // Use full row length, not just non-empty cells
        headers = row.map(h => String(h || '').trim());

        // Debug for first sheet
        if (sheetName === workbook.SheetNames[0]) {
          console.log(
            `   🔍 Found headers in row ${rowIdx + 1}: ${rowHeaders.slice(0, 7).join(', ')}`
          );
        }
        break;
      }
    }

    // Fallback: try to find headers by looking for common patterns even if not perfect match
    if (headerRowIndex === -1) {
      for (let rowIdx = 0; rowIdx < Math.min(15, jsonData.length); rowIdx++) {
        const row = jsonData[rowIdx] || [];
        const rowText = row.map(h => String(h || '').toLowerCase()).join(' ');

        // Look for any indication of product data (SKU-like patterns, prices, etc.)
        if (
          /\b(sku|code|price|cost|name|product)\b/i.test(rowText) &&
          row.filter(c => c).length >= 3
        ) {
          headerRowIndex = rowIdx;
          headers = row.map(h => String(h || '').trim());
          console.log(
            `   ⚠️  Using row ${rowIdx + 1} as headers (best guess): ${headers
              .slice(0, 5)
              .filter(h => h)
              .join(', ')}`
          );
          break;
        }
      }
    }

    // Last resort: use first row
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      headers = (jsonData[0] || []).map(h => String(h || '').trim());
    }

    // Debug: show actual headers for debugging
    if (sheetName === 'AUDIO TECHNICA CONSUMER' || sheetName === workbook.SheetNames[0]) {
      console.log(`   📝 Headers from row ${headerRowIndex + 1}:`);
      headers.forEach((h, idx) => {
        if (h) console.log(`      [${idx}] "${h}"`);
      });
      if (jsonData.length > headerRowIndex + 1) {
        const firstDataRow = jsonData[headerRowIndex + 1] || [];
        console.log(`   📊 First data row (${headerRowIndex + 2}):`);
        firstDataRow.slice(0, 7).forEach((v, idx) => {
          if (v) console.log(`      [${idx}] "${String(v).substring(0, 30)}"`);
        });
      }
    }

    // Find column indices with more flexible matching
    const skuIndex = findColumnIndex(headers, COLUMN_MAPPINGS.SKU);
    const nameIndex = findColumnIndex(headers, COLUMN_MAPPINGS.ProductName);
    const barcodeIndex = findColumnIndex(headers, COLUMN_MAPPINGS.Barcode);
    const descIndex = findColumnIndex(headers, COLUMN_MAPPINGS.Description);
    const costExclIndex = findColumnIndex(headers, COLUMN_MAPPINGS.CostExcluding);
    const costInclIndex = findColumnIndex(headers, COLUMN_MAPPINGS.CostIncluding);
    const rspIndex = findColumnIndex(headers, COLUMN_MAPPINGS.RecommendedRetailPrice);

    console.log(
      `   Columns found: SKU=${skuIndex !== -1 ? '✓' : '✗'}, Name=${nameIndex !== -1 ? '✓' : '✗'}, Cost Excl=${costExclIndex !== -1 ? '✓' : '✗'}, Cost Incl=${costInclIndex !== -1 ? '✓' : '✗'}, RSP=${rspIndex !== -1 ? '✓' : '✗'}`
    );

    // Try alternative column names based on actual headers found
    const actualSkuIndex =
      skuIndex !== -1 ? skuIndex : headers.findIndex(h => /^sku$/i.test(String(h).trim()));
    const actualNameIndex =
      nameIndex !== -1
        ? nameIndex
        : headers.findIndex(h => /product.*name/i.test(String(h).trim()));
    const actualCostExclIndex =
      costExclIndex !== -1
        ? costExclIndex
        : headers.findIndex(h => /cost.*excluding/i.test(String(h).trim()));
    const actualCostInclIndex =
      costInclIndex !== -1
        ? costInclIndex
        : headers.findIndex(h => /cost.*including/i.test(String(h).trim()));
    const actualRspIndex =
      rspIndex !== -1
        ? rspIndex
        : headers.findIndex(h => /recommended.*retail.*price/i.test(String(h).trim()));

    if (actualSkuIndex === -1 || actualNameIndex === -1) {
      console.log(
        `⚠️  Sheet "${sheetName}" missing required columns (SKU or Product Name), skipping`
      );
      if (headers.length > 0 && headers.some(h => h)) {
        console.log(`   Available headers: ${headers.filter(h => h).join(', ')}`);
      }
      continue;
    }

    // Use actual indices found
    const finalSkuIndex = actualSkuIndex;
    const finalNameIndex = actualNameIndex;
    const finalBarcodeIndex =
      barcodeIndex !== -1
        ? barcodeIndex
        : headers.findIndex(h => /^barcode$/i.test(String(h).trim()));
    const finalDescIndex =
      descIndex !== -1
        ? descIndex
        : headers.findIndex(h => /product.*description|description/i.test(String(h).trim()));
    const finalCostExclIndex = actualCostExclIndex;
    const finalCostInclIndex = actualCostInclIndex;
    const finalRspIndex = actualRspIndex;

    // Update status message with found indices
    if (finalSkuIndex !== -1 && finalNameIndex !== -1) {
      console.log(
        `   ✅ Columns mapped: SKU[${finalSkuIndex}], Name[${finalNameIndex}], Cost Excl[${finalCostExclIndex}], Cost Incl[${finalCostInclIndex}], RSP[${finalRspIndex}]`
      );
    }

    const brandName = extractBrandName(sheetName);
    const products: ProductRow[] = [];

    // Process data rows (skip header row + any title rows)
    const dataStartRow = headerRowIndex + 1;
    for (let i = dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      const sku = String(row[finalSkuIndex] || '').trim();
      const productName = String(row[finalNameIndex] || '').trim();

      // Skip empty rows
      if (!sku && !productName) {
        continue;
      }

      // Skip if missing required fields (but don't log every skip - too noisy)
      if (!sku || !productName) {
        // Only log if it's clearly a data row (has some content) not just empty
        const hasContent = row.some((cell: unknown) => cell && String(cell).trim().length > 0);
        if (hasContent && process.env.DEBUG) {
          console.log(
            `⚠️  Row ${i + 1}: Missing SKU or Product Name (has content but missing fields), skipping`
          );
        }
        continue;
      }

      const product: ProductRow = {
        sku: sku.toUpperCase(),
        productName,
        brand: brandName,
        sheetName,
        rowNumber: i + 1,
        barcode:
          finalBarcodeIndex !== -1
            ? String(row[finalBarcodeIndex] || '').trim() || undefined
            : undefined,
        description:
          finalDescIndex !== -1 ? String(row[finalDescIndex] || '').trim() || undefined : undefined,
        costExcluding: finalCostExclIndex !== -1 ? normalizePrice(row[finalCostExclIndex]) : null,
        costIncluding: finalCostInclIndex !== -1 ? normalizePrice(row[finalCostInclIndex]) : null,
        recommendedRetailPrice: finalRspIndex !== -1 ? normalizePrice(row[finalRspIndex]) : null,
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
      console.log(
        `⚠️  Skipping product ${product.sku} (${product.productName}): No valid price found`
      );
      continue;
    }

    // Prepare attrs_json with additional pricing info
    const attrsJson: Record<string, unknown> = {
      brand: product.brand,
      sheetName: product.sheetName,
      rowNumber: product.rowNumber,
    };

    if (product.description) {
      attrsJson.description = product.description;
    }
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
async function importProducts(
  client: Client,
  products: ProductRow[],
  supplierId: string
): Promise<{ inserted: number; updated: number; errors: string[] }> {
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
        [supplierProductId, primaryPrice, `Pricelist import from ${product.sheetName}`]
      );
    } catch (error) {
      errors.push(
        `Product ${product.sku}: ${error instanceof Error ? error.message : String(error)}`
      );
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
        const allSuppliers = await client.query(
          'SELECT supplier_id, name, code FROM core.supplier ORDER BY name LIMIT 20'
        );
        console.log('Available suppliers:');
        allSuppliers.rows.forEach(row => {
          console.log(`   ${row.supplier_id} - ${row.name} (${row.code})`);
        });
        console.log();
        process.exit(1);
      }

      const supplierInfo = await client.query(
        'SELECT name, code FROM core.supplier WHERE supplier_id = $1',
        [supplierId]
      );
      console.log(
        `✅ Found supplier: ${supplierInfo.rows[0].name} (${supplierInfo.rows[0].code}) - ID: ${supplierId}\n`
      );
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
      console.log(
        `   ✅ Inserted: ${result.inserted}, Updated: ${result.updated}, Errors: ${result.errors.length}`
      );
    }

    // Final summary
    console.log('\n🎉 Import Complete!');
    console.log('===================');
    console.log(`   Total Inserted: ${totalInserted}`);
    console.log(`   Total Updated: ${totalUpdated}`);
    console.log(`   Total Errors: ${allErrors.length}`);

    if (allErrors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      allErrors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
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
