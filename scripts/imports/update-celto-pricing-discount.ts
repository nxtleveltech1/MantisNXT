#!/usr/bin/env bun
/**
 * Update Celto Brand Pricing - Apply 10% Discount
 *
 * Processes Excel pricelist file for BC Electronics Celto products
 * and applies a 10% discount to Cost Ex VAT pricing.
 *
 * Usage:
 *   bun scripts/imports/update-celto-pricing-discount.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Excel file at the specified path
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { Client } from 'pg';

// Get connection string from environment
function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_SPP_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    null
  );
}

const EXCEL_FILE_PATH = 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\BCE_Celto_Pricelist_Feb2026 - formatted data ready.xlsx';
const SUPPLIER_NAME = 'BC ELECTRONICS';
const BRAND_NAME = 'CELTO';
const DISCOUNT_PERCENT = 10; // 10% discount

interface ProductRow {
  sku: string;
  brand: string;
  costExVat: number | null;
  costIncVat: number | null;
  rowNumber: number;
}

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 OR LOWER(name) LIKE $3
     LIMIT 5`,
    [
      `%${supplierName.toLowerCase()}%`,
      `%bce brands%`,
      `%bc electronics%`,
    ]
  );

  if (result.rows.length === 0) {
    console.error(`❌ Supplier "${supplierName}" not found`);
    return null;
  }

  if (result.rows.length === 1) {
    const supplier = result.rows[0];
    console.log(
      `✅ Found supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`
    );
    return supplier.supplier_id;
  }

  // Multiple matches - show options
  console.log('\n⚠️  Multiple suppliers found:');
  result.rows.forEach((row, idx) => {
    console.log(`   ${idx + 1}. ${row.name} (${row.code}) - ID: ${row.supplier_id}`);
  });

  // Return first match
  const supplier = result.rows[0];
  console.log(
    `✅ Using supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`
  );
  return supplier.supplier_id;
}

/**
 * Normalize price value (handles various formats)
 */
function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Remove currency symbols and spaces
  let normalized = str.replace(/[R\s,]/g, '');
  
  // Handle European format "23.234,00" or "23 234,00"
  if (normalized.includes(',') && normalized.includes('.')) {
    // Format: "23.234,00" - dot is thousands, comma is decimal
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    // Could be "23,00" or "23 234,00"
    if (normalized.match(/\d+\s+\d+,\d+/)) {
      // Format: "23 234,00" - space is thousands, comma is decimal
      normalized = normalized.replace(/\s+/g, '').replace(',', '.');
    } else {
      // Format: "23,00" - comma is decimal
      normalized = normalized.replace(',', '.');
    }
  }

  // Remove any remaining non-numeric characters except decimal point
  normalized = normalized.replace(/[^\d.-]/g, '');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

/**
 * Read and parse Excel file
 */
function readExcelFile(filePath: string): ProductRow[] {
  console.log(`📖 Reading Excel file: ${filePath}`);

  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  console.log(`✅ File read successfully. Found ${workbook.SheetNames.length} sheet(s)`);

  const products: ProductRow[] = [];
  const sheetName = workbook.SheetNames[0];
  console.log(`\n📋 Processing sheet: "${sheetName}"`);

  const worksheet = workbook.Sheets[sheetName];
  
  // Read data
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  }) as unknown[][];
  
  // Helper to get formatted cell text
  const getFormattedCellValue = (rowIdx: number, colIdx: number): string => {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    const cell = worksheet[cellAddress];
    if (!cell) return '';
    return cell.w || String(cell.v || '');
  };

  if (jsonData.length < 2) {
    console.error('⚠️  File has no data rows');
    return products;
  }

  // Find header row
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let rowIdx = 0; rowIdx < Math.min(10, jsonData.length); rowIdx++) {
    const row = jsonData[rowIdx] || [];
    const rowHeaders = row
      .map(h => String(h || '').trim())
      .filter(h => h.length > 0);

    const rowText = rowHeaders.join(' ').toLowerCase();
    if (
      (rowText.includes('sku') || rowText.includes('code')) &&
      (rowText.includes('cost') || rowText.includes('price'))
    ) {
      headerRowIndex = rowIdx;
      headers = rowHeaders;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error('❌ Could not find header row');
    return products;
  }

  console.log(`✅ Found headers at row ${headerRowIndex + 1}:`, headers);

  // Find column indices
  const findCol = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase();
      if (patterns.some(p => h.includes(p.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  };

  const colSku = findCol(['sku', 'code', 'part number', 'item code']);
  const colBrand = findCol(['brand', 'manufacturer', 'make']);
  const colCostExVat = findCol(['cost ex vat', 'cost exvat', 'cost excluding', 'cost excl', 'ex vat', 'exvat', 'cost ex']);
  const colCostIncVat = findCol(['cost inc vat', 'cost incvat', 'cost including', 'cost incl', 'inc vat', 'incvat', 'cost inc']);

  console.log('\n📊 Column mappings:');
  console.log(`   SKU: ${colSku >= 0 ? headers[colSku] : 'NOT FOUND'}`);
  console.log(`   Brand: ${colBrand >= 0 ? headers[colBrand] : 'NOT FOUND'}`);
  console.log(`   Cost Ex VAT: ${colCostExVat >= 0 ? headers[colCostExVat] : 'NOT FOUND'}`);
  console.log(`   Cost Inc VAT: ${colCostIncVat >= 0 ? headers[colCostIncVat] : 'NOT FOUND'}`);

  if (colSku < 0) {
    console.error('❌ SKU column not found - cannot proceed');
    return products;
  }

  if (colCostExVat < 0 && colCostIncVat < 0) {
    console.error('❌ No cost columns found - cannot proceed');
    return products;
  }

  // Process data rows
  for (let rowIdx = headerRowIndex + 1; rowIdx < jsonData.length; rowIdx++) {
    const row = jsonData[rowIdx] || [];
    
    // Skip empty rows
    if (row.every(cell => !cell || String(cell).trim() === '')) {
      continue;
    }

    const sku = String(row[colSku] || '').trim();
    if (!sku) {
      continue;
    }

    const brand = colBrand >= 0 ? String(row[colBrand] || '').trim().toUpperCase() : BRAND_NAME;
    
    // Process all products in this file (it's a Celto-specific pricelist)
    // If brand column exists and doesn't match Celto, skip
    if (colBrand >= 0 && brand !== BRAND_NAME && !sku.toUpperCase().includes('CELTO')) {
      continue;
    }

    // Get cost values
    const costExVatValue = colCostExVat >= 0
      ? (getFormattedCellValue(rowIdx, colCostExVat) || String(row[colCostExVat] || ''))
      : '';
    const costIncVatValue = colCostIncVat >= 0
      ? (getFormattedCellValue(rowIdx, colCostIncVat) || String(row[colCostIncVat] || ''))
      : '';

    let costExVat = normalizePrice(costExVatValue);
    let costIncVat = normalizePrice(costIncVatValue);

    // If we have cost inc VAT but not ex VAT, calculate it
    if (costIncVat && !costExVat) {
      costExVat = costIncVat / 1.15; // Remove 15% VAT
    }
    // If we have cost ex VAT but not inc VAT, calculate it
    else if (costExVat && !costIncVat) {
      costIncVat = costExVat * 1.15; // Add 15% VAT
    }

    if (!costExVat || costExVat <= 0) {
      console.log(`⚠️  Skipping ${sku}: No valid cost ex VAT found`);
      continue;
    }

    const product: ProductRow = {
      sku,
      brand: brand || BRAND_NAME,
      costExVat,
      costIncVat,
      rowNumber: rowIdx + 1,
    };
    
    products.push(product);
  }

  console.log(`\n✅ Parsed ${products.length} Celto products from Excel`);
  return products;
}

/**
 * Update product pricing in database
 */
async function updateProductPricing(
  client: Client,
  supplierId: string,
  product: ProductRow
): Promise<{ updated: boolean; error?: string }> {
  try {
    // Find product by supplier SKU
    const findResult = await client.query(
      `SELECT supplier_product_id, attrs_json, supplier_sku
       FROM core.supplier_product
       WHERE supplier_id = $1 AND supplier_sku = $2
       LIMIT 1`,
      [supplierId, product.sku]
    );

    if (findResult.rows.length === 0) {
      return { updated: false, error: 'Product not found' };
    }

    const productId = findResult.rows[0].supplier_product_id;
    const existingAttrs = findResult.rows[0].attrs_json || {};

    // Apply 10% discount to cost ex VAT
    const originalCostExVat = product.costExVat;
    const discountedCostExVat = originalCostExVat * (1 - DISCOUNT_PERCENT / 100);
    const discountedCostIncVat = discountedCostExVat * 1.15; // Add 15% VAT

    // Update attrs_json
    const updatedAttrs = {
      ...existingAttrs,
      cost_excluding: discountedCostExVat,
      cost_including: discountedCostIncVat,
      discount_percent: DISCOUNT_PERCENT,
      original_cost_excluding: originalCostExVat,
      discount_applied_at: new Date().toISOString(),
    };

    // Update supplier_product
    await client.query(
      `UPDATE core.supplier_product
       SET attrs_json = $1::jsonb,
           updated_at = NOW()
       WHERE supplier_product_id = $2`,
      [JSON.stringify(updatedAttrs), productId]
    );

    // Update price_history - first close current price, then insert new one
    await client.query(
      `UPDATE core.price_history
       SET is_current = false, valid_to = NOW()
       WHERE supplier_product_id = $1 AND is_current = true`,
      [productId]
    );

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
        productId,
        discountedCostExVat,
        `Applied ${DISCOUNT_PERCENT}% discount to Celto pricing`,
      ]
    );

    return { updated: true };
  } catch (error) {
    return {
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Celto Pricing Update with 10% Discount\n');

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('❌ Database connection string not found');
    console.error('   Please set DATABASE_URL or NEON_SPP_DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find supplier
    const supplierId = await findSupplier(client, SUPPLIER_NAME);
    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found`);
    }

    // Read Excel file
    const products = readExcelFile(EXCEL_FILE_PATH);
    if (products.length === 0) {
      console.log('⚠️  No products found in Excel file');
      return;
    }

    console.log(`\n📦 Processing ${products.length} products...\n`);

    // Update each product
    let updated = 0;
    let errors = 0;
    const errorDetails: Array<{ sku: string; error: string }> = [];

    for (const product of products) {
      const result = await updateProductPricing(client, supplierId, product);
      
      if (result.updated) {
        const originalPrice = product.costExVat;
        const discountedPrice = originalPrice * (1 - DISCOUNT_PERCENT / 100);
        console.log(
          `✅ ${product.sku}: R ${originalPrice.toFixed(2)} → R ${discountedPrice.toFixed(2)} (${DISCOUNT_PERCENT}% discount)`
        );
        updated++;
      } else {
        console.log(`❌ ${product.sku}: ${result.error || 'Update failed'}`);
        errors++;
        errorDetails.push({ sku: product.sku, error: result.error || 'Update failed' });
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);

    if (errorDetails.length > 0) {
      console.log(`\n⚠️  Error details:`);
      errorDetails.forEach(({ sku, error }) => {
        console.log(`   - ${sku}: ${error}`);
      });
    }

    console.log('\n✅ Pricing update completed');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
