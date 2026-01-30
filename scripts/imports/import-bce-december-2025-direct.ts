#!/usr/bin/env bun
/**
 * Direct Import: BC Electronics December 2025 Pricelist (Excel)
 *
 * Processes Excel pricelist file directly and imports into database
 * without requiring API server to be running.
 *
 * Usage:
 *   bun scripts/imports/import-bce-december-2025-direct.ts
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

const EXCEL_FILE_PATH = 'C:\\Users\\garet\\Downloads\\BCE_Brands_Pricelist_December2025.xlsx';
const SUPPLIER_NAME = 'BC ELECTRONICS';
const SUPPLIER_ID_OVERRIDE = process.env.BCE_SUPPLIER_ID || 'fcd35140-4d43-4275-977b-56275e6daeb1';

interface ProductRow {
  supplier: string;
  category: string;
  sku: string;
  modelSeries: string;
  description: string;
  rsp: number | null;
  exVat: number | null;
  sellPriceExVat: number | null;
  rowNumber: number;
}

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 OR LOWER(name) LIKE $3 OR LOWER(name) LIKE $4
     LIMIT 5`,
    [
      `%${supplierName.toLowerCase()}%`,
      `%bce brands%`,
      `%bc electronics%`,
      `%bce%`
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
 * Normalize price value (handles European format "23 234,00" with space as thousands separator)
 * Based on CurrencyNormalizer.parsePrice logic
 * 
 * IMPORTANT: XLSX may parse "23 234,00" as 23.23 (treating comma as decimal).
 * This function detects and corrects such misparsing by checking if the number
 * seems too small compared to the string representation.
 */
function normalizePrice(value: unknown, cellAddress?: string): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let str = String(value).trim();
  
  // If XLSX parsed it as a number, we need to check if it's correct
  // For example: "23 234,00" might be parsed as 23.23
  if (typeof value === 'number') {
    // Check if the string representation suggests a misparse
    // If the original string has spaces or multiple digits before comma, it's likely thousands
    const originalStr = str;
    
    // If number is suspiciously small (< 1000) but string suggests larger value, 
    // try to reparse from the cell's formatted text
    if (value < 1000 && originalStr.includes(',')) {
      // Likely misparsed - treat comma as thousands separator, not decimal
      // But we can't recover the original, so we'll use the number as-is
      // This is a limitation - we'd need to read formatted cell text
      console.warn(`⚠️  Possible misparsed price: ${value} from "${originalStr}"${cellAddress ? ` at ${cellAddress}` : ''}`);
    }
    
    return value > 0 ? value : null;
  }

  // Handle empty or invalid
  if (!str || str === '-' || str.toLowerCase() === 'n/a') {
    return null;
  }

  // Remove currency symbols
  str = str.replace(/[R$€£¥₹₽₩฿₪₦₵]/g, '');
  str = str.replace(/\b(ZAR|USD|EUR|GBP|JPY|INR|AUD|CAD|SEK|CHF|PLN|RUB|KRW|THB|ILS|NGN|GHS)\b/gi, '');
  str = str.trim();

  // Determine format by analyzing separators
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  const hasSpace = str.includes(' ');

  let normalized: string;

  // Case 1: European format with space as thousands separator: "23 234,00"
  if (hasSpace && hasComma && !hasDot) {
    // Format: 23 234,00 -> 23234.00
    normalized = str.replace(/\s/g, '').replace(',', '.');
  }
  // Case 2: European format with dot as thousands: "23.234,00"
  else if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Format: 23.234,00 (European)
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Format: 23,234.00 (US)
      normalized = str.replace(/,/g, '');
    }
  }
  // Case 3: Only comma (could be decimal or thousand separator)
  else if (hasComma && !hasDot) {
    const commaCount = (str.match(/,/g) || []).length;
    const lastCommaIndex = str.lastIndexOf(',');
    const digitsAfterLastComma = str.length - lastCommaIndex - 1;

    if (commaCount === 1 && digitsAfterLastComma === 2) {
      // Likely decimal: 1234,56 -> 1234.56
      normalized = str.replace(',', '.');
    } else {
      // Likely thousand separator: 1,234 -> 1234
      normalized = str.replace(/,/g, '');
    }
  }
  // Case 4: Only dot (could be decimal or thousand separator)
  else if (hasDot && !hasComma) {
    const dotCount = (str.match(/\./g) || []).length;
    const lastDotIndex = str.lastIndexOf('.');
    const digitsAfterLastDot = str.length - lastDotIndex - 1;

    if (dotCount === 1 && digitsAfterLastDot <= 3) {
      // Likely decimal: 1234.56 -> 1234.56
      normalized = str;
    } else if (dotCount > 1) {
      // Thousand separator: 1.234.567 -> 1234567
      normalized = str.replace(/\./g, '');
    } else {
      normalized = str;
    }
  }
  // Case 5: Only space (thousands separator)
  else if (hasSpace) {
    // Format: 23 234 -> 23234 (no decimal part)
    normalized = str.replace(/\s/g, '');
  }
  // Case 6: No separators
  else {
    normalized = str;
  }

  // Clean up any remaining non-numeric characters except dot and minus
  normalized = normalized.replace(/[^\d.-]/g, '');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
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
  
  // Read data - we'll use raw:false to get formatted strings, but need to handle
  // price columns specially to preserve "23 234,00" format
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false, // Get formatted values as strings
    blankrows: false,
  }) as unknown[][];
  
  // Helper to get formatted cell text (preserves Excel formatting like "23 234,00")
  const getFormattedCellValue = (rowIdx: number, colIdx: number): string => {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    const cell = worksheet[cellAddress];
    if (!cell) return '';
    // Use formatted text (w property) if available, otherwise use value
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
      rowText.includes('supplier') &&
      rowText.includes('sku') &&
      (rowText.includes('category') || rowText.includes('description'))
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

  const colSupplier = findCol(['supplier']);
  const colCategory = findCol(['category']);
  const colSku = findCol(['sku']);
  const colModelSeries = findCol(['model series', 'model', 'series']);
  const colDescription = findCol(['description']);
  const colRsp = findCol(['rsp', 'retail']);
  const colExVat = findCol(['ex vat', 'exvat', 'excl']);
  const colSellPrice = findCol(['sell price', 'selling price', 'sell']);

  console.log('\n📊 Column mappings:');
  console.log(`   Supplier: ${colSupplier >= 0 ? headers[colSupplier] : 'NOT FOUND'}`);
  console.log(`   Category: ${colCategory >= 0 ? headers[colCategory] : 'NOT FOUND'}`);
  console.log(`   SKU: ${colSku >= 0 ? headers[colSku] : 'NOT FOUND'}`);
  console.log(`   Model Series: ${colModelSeries >= 0 ? headers[colModelSeries] : 'NOT FOUND'}`);
  console.log(`   Description: ${colDescription >= 0 ? headers[colDescription] : 'NOT FOUND'}`);
  console.log(`   RSP: ${colRsp >= 0 ? headers[colRsp] : 'NOT FOUND'}`);
  console.log(`   Ex VAT: ${colExVat >= 0 ? headers[colExVat] : 'NOT FOUND'}`);
  console.log(`   Sell Price: ${colSellPrice >= 0 ? headers[colSellPrice] : 'NOT FOUND'}`);

  if (colSku < 0) {
    console.error('❌ SKU column not found - cannot proceed');
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
      continue; // Skip rows without SKU
    }

    // For price columns, read formatted cell text to preserve "23 234,00" format
    const rspValue = colRsp >= 0 
      ? (getFormattedCellValue(rowIdx, colRsp) || String(row[colRsp] || ''))
      : '';
    const exVatValue = colExVat >= 0
      ? (getFormattedCellValue(rowIdx, colExVat) || String(row[colExVat] || ''))
      : '';
    const sellPriceValue = colSellPrice >= 0
      ? (getFormattedCellValue(rowIdx, colSellPrice) || String(row[colSellPrice] || ''))
      : '';

    const product: ProductRow = {
      supplier: colSupplier >= 0 ? String(row[colSupplier] || '').trim() : '',
      category: colCategory >= 0 ? String(row[colCategory] || '').trim() : '',
      sku,
      modelSeries: colModelSeries >= 0 ? String(row[colModelSeries] || '').trim() : '',
      description: colDescription >= 0 ? String(row[colDescription] || '').trim() : '',
      rsp: normalizePrice(rspValue),
      exVat: normalizePrice(exVatValue),
      sellPriceExVat: normalizePrice(sellPriceValue),
      rowNumber: rowIdx + 1,
    };
    
    // Debug log for the problematic product
    if (product.sku === 'AMPCEL009') {
      console.log(`\n🔍 Debug AMPCEL009:`);
      console.log(`   Raw RSP cell value: ${row[colRsp]}`);
      console.log(`   Formatted RSP: ${rspValue}`);
      console.log(`   Parsed RSP: ${product.rsp}`);
    }

    products.push(product);
  }

  console.log(`\n✅ Parsed ${products.length} products from Excel file`);
  return products;
}

/**
 * Upsert supplier product
 */
async function upsertSupplierProduct(
  client: Client,
  supplierId: string,
  product: ProductRow
): Promise<string> {
  // Check if product exists
  const existing = await client.query(
    `SELECT supplier_product_id FROM core.supplier_product 
     WHERE supplier_id = $1 AND supplier_sku = $2 
     LIMIT 1`,
    [supplierId, product.sku]
  );

  const productName = product.description || product.modelSeries || product.sku;
  const costPrice = product.exVat || product.sellPriceExVat || product.rsp;

  if (existing.rows.length > 0) {
    // Update existing
    const productId = existing.rows[0].supplier_product_id;
    await client.query(
      `UPDATE core.supplier_product SET
        name_from_supplier = COALESCE($3, name_from_supplier),
        attrs_json = COALESCE(
          jsonb_build_object(
            'description', COALESCE($4, (attrs_json->>'description')),
            'model_series', COALESCE($5, (attrs_json->>'model_series')),
            'rsp', COALESCE($6::numeric, (attrs_json->>'rsp')::numeric),
            'ex_vat', COALESCE($7::numeric, (attrs_json->>'ex_vat')::numeric),
            'sell_price_ex_vat', COALESCE($8::numeric, (attrs_json->>'sell_price_ex_vat')::numeric)
          ),
          attrs_json
        ),
        last_seen_at = NOW(),
        updated_at = NOW()
       WHERE supplier_product_id = $1 AND supplier_id = $2`,
      [
        productId,
        supplierId,
        productName,
        product.description || null,
        product.modelSeries || null,
        product.rsp !== null && product.rsp !== undefined ? Number(product.rsp) : null,
        product.exVat !== null && product.exVat !== undefined ? Number(product.exVat) : null,
        product.sellPriceExVat !== null && product.sellPriceExVat !== undefined ? Number(product.sellPriceExVat) : null,
      ]
    );

    // Update price history if we have a cost price
    if (costPrice !== null && costPrice !== undefined) {
      // Check if current price exists
      const currentPrice = await client.query(
        `SELECT price_history_id, price FROM core.price_history 
         WHERE supplier_product_id = $1 AND is_current = true 
         LIMIT 1`,
        [productId]
      );

      if (currentPrice.rows.length > 0) {
        const oldPrice = parseFloat(currentPrice.rows[0].price);
        // Only update if price changed significantly (> 0.01)
        if (Math.abs(oldPrice - costPrice) > 0.01) {
          // Close old price record
          await client.query(
            `UPDATE core.price_history 
             SET valid_to = NOW(), is_current = false 
             WHERE price_history_id = $1`,
            [currentPrice.rows[0].price_history_id]
          );

          // Insert new price record
          await client.query(
            `INSERT INTO core.price_history (
              supplier_product_id, price, currency, valid_from, is_current, change_reason
            ) VALUES ($1, $2, 'ZAR', NOW(), true, 'Updated from December 2025 pricelist')
            `,
            [productId, costPrice]
          );
        }
      } else {
        // No current price, insert new one
        await client.query(
          `INSERT INTO core.price_history (
            supplier_product_id, price, currency, valid_from, is_current, change_reason
          ) VALUES ($1, $2, 'ZAR', NOW(), true, 'Initial price from December 2025 pricelist')
          `,
          [productId, costPrice]
        );
      }
    }

    return productId;
  } else {
    // Insert new
    const result = await client.query(
      `INSERT INTO core.supplier_product (
        supplier_id, supplier_sku, name_from_supplier, uom, attrs_json, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, 'unit', $4, true, NOW(), NOW())
      RETURNING supplier_product_id`,
      [
        supplierId,
        product.sku,
        productName,
        JSON.stringify({
          description: product.description || null,
          model_series: product.modelSeries || null,
          category: product.category || null,
          rsp: product.rsp !== null && product.rsp !== undefined ? Number(product.rsp) : null,
          ex_vat: product.exVat !== null && product.exVat !== undefined ? Number(product.exVat) : null,
          sell_price_ex_vat: product.sellPriceExVat !== null && product.sellPriceExVat !== undefined ? Number(product.sellPriceExVat) : null,
        }),
      ]
    );

    const productId = result.rows[0].supplier_product_id;

    // Insert initial price if available
    if (costPrice !== null && costPrice !== undefined) {
      await client.query(
        `INSERT INTO core.price_history (
          supplier_product_id, price, currency, valid_from, is_current, change_reason
        ) VALUES ($1, $2, 'ZAR', NOW(), true, 'Initial price from December 2025 pricelist')
        `,
        [productId, costPrice]
      );
    }

    return productId;
  }
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

  console.log(`\n📦 Importing ${products.length} products...`);

  for (const product of products) {
    try {
      const existing = await client.query(
        `SELECT supplier_product_id FROM core.supplier_product 
         WHERE supplier_id = $1 AND supplier_sku = $2 
         LIMIT 1`,
        [supplierId, product.sku]
      );

      await upsertSupplierProduct(client, supplierId, product);

      if (existing.rows.length > 0) {
        updated++;
      } else {
        inserted++;
      }

      if ((inserted + updated) % 100 === 0) {
        console.log(`   Processed ${inserted + updated} products...`);
      }
    } catch (error) {
      const errorMsg = `Row ${product.rowNumber} (SKU: ${product.sku}): ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  return { inserted, updated, errors };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting BC Electronics December 2025 Direct Import\n');
  console.log('='.repeat(60));

  // Get database connection
  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('❌ DATABASE_URL or NEON_SPP_DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find supplier
    const supplierId = (await findSupplier(client, SUPPLIER_NAME)) || SUPPLIER_ID_OVERRIDE;
    
    if (!supplierId) {
      console.error('❌ Could not find supplier ID');
      process.exit(1);
    }

    console.log(`\n📋 Using Supplier ID: ${supplierId}\n`);

    // Read Excel file
    console.log('='.repeat(60));
    console.log('📅 Processing DECEMBER 2025 pricelist');
    console.log('='.repeat(60));
    
    const products = readExcelFile(EXCEL_FILE_PATH);

    if (products.length === 0) {
      console.error('❌ No products found in Excel file');
      process.exit(1);
    }

    // Import to database
    console.log('\n' + '='.repeat(60));
    console.log('💾 Importing to database');
    console.log('='.repeat(60));

    // Use transaction
    await client.query('BEGIN');
    let result;
    try {
      result = await importProducts(client, products, supplierId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total products processed: ${products.length}`);
    console.log(`✅ Inserted: ${result.inserted}`);
    console.log(`🔄 Updated: ${result.updated}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('\n✅ Import process completed!\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
