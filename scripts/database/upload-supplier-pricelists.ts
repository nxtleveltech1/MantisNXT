#!/usr/bin/env bun
/**
 * Upload Supplier Pricelists
 * 
 * Processes and uploads three supplier pricelist files:
 * - Musical Distributors
 * - Marshall Music Distributors  
 * - AudioSure
 * 
 * Usage:
 *   bun scripts/database/upload-supplier-pricelists.ts
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { query, withTransaction } from '@/lib/database';
import { pricelistService } from '@/lib/services/PricelistService';
import type { PricelistRow } from '@/types/nxt-spp';

interface FileConfig {
  path: string;
  supplierName: string;
  supplierId?: string;
}

const FILES: FileConfig[] = [
  {
    path: 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\Musical Distrabutors External Stock 2026-02-04.xlsx',
    supplierName: 'Musical Distributors',
  },
  {
    path: 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\Marshall Music Distrabutors - Extract Ready.xlsx',
    supplierName: 'Marshall Music Distributors',
  },
  {
    path: 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\Audiosure - Extract Ready X.xlsx',
    supplierName: 'AudioSure',
  },
];

/**
 * Find or create supplier
 */
async function findOrCreateSupplier(supplierName: string): Promise<string> {
  const normalized = supplierName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Try exact match first
  const exactMatch = await query<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name 
     FROM core.supplier 
     WHERE LOWER(TRIM(name)) = $1 
     LIMIT 1`,
    [normalized]
  );

  if (exactMatch.rows.length > 0) {
    return exactMatch.rows[0].supplier_id;
  }

  // Try partial match
  const partialMatch = await query<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name 
     FROM core.supplier 
     WHERE LOWER(TRIM(name)) ILIKE $1 
     LIMIT 1`,
    [`%${normalized}%`]
  );

  if (partialMatch.rows.length > 0) {
    return partialMatch.rows[0].supplier_id;
  }

  // Create supplier if not found
  console.log(`   ⚠️  Supplier "${supplierName}" not found, creating...`);
  const code = supplierName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 20);

  const createResult = await query<{ supplier_id: string }>(
    `INSERT INTO core.supplier (
       name, code, active, default_currency, payment_terms, created_at, updated_at
     ) VALUES ($1, $2, true, 'ZAR', '30 days', NOW(), NOW())
     RETURNING supplier_id`,
    [supplierName, code]
  );

  if (createResult.rows.length === 0) {
    throw new Error(`Failed to create supplier: ${supplierName}`);
  }

  console.log(`   ✅ Created supplier "${supplierName}" (ID: ${createResult.rows[0].supplier_id})`);
  return createResult.rows[0].supplier_id;
}

/**
 * Normalize price value
 */
function normalizePrice(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 ? 0 : value;
  }

  const str = String(value).trim();
  if (!str) return 0;

  // Remove currency symbols and spaces
  let normalized = str.replace(/[R\s,]/g, '');
  
  // Handle European format
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    if (normalized.match(/\d+\s+\d+,\d+/)) {
      normalized = normalized.replace(/\s+/g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(',', '.');
    }
  }

  normalized = normalized.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
}

/**
 * Find column index by patterns
 */
function findColumn(headers: string[], patterns: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (patterns.some(p => h.includes(p.toLowerCase()))) {
      return i;
    }
  }
  return -1;
}

/**
 * Process Excel file and extract rows
 */
function processExcelFile(filePath: string, supplierName: string): {
  headers: string[];
  rows: Array<Record<string, unknown>>;
} {
  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Read data
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  }) as unknown[][];

  if (jsonData.length < 2) {
    throw new Error('File has insufficient data rows');
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
      (rowText.includes('cost') || rowText.includes('price') || rowText.includes('brand'))
    ) {
      headerRowIndex = rowIdx;
      headers = rowHeaders;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not identify header row');
  }

  // Convert to object array
  const rows: Array<Record<string, unknown>> = [];
  for (let rowIdx = headerRowIndex + 1; rowIdx < jsonData.length; rowIdx++) {
    const row = jsonData[rowIdx] || [];
    const rowObj: Record<string, unknown> = {};
    headers.forEach((header, colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      const cell = worksheet[cellAddress];
      rowObj[header] = cell?.w || String(row[colIdx] || '').trim();
    });
    
    // Skip empty rows
    if (Object.values(rowObj).some(v => String(v).trim())) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

/**
 * Map row data to PricelistRow format
 */
function mapRowToPricelistRow(
  row: Record<string, unknown>,
  headers: string[],
  supplierName: string
): PricelistRow | null {
  // Find columns
  const colSku = findColumn(headers, ['sku', 'code', 'part number', 'item code', 'product code']);
  const colBrand = findColumn(headers, ['brand', 'manufacturer', 'make', 'supplier']);
  const colName = findColumn(headers, ['product name', 'name', 'product', 'item name', 'description', 'itemdescription']);
  const colDescription = findColumn(headers, ['description', 'desc', 'product description']);
  const colCostExVat = findColumn(headers, ['cost ex vat', 'cost exvat', 'cost excluding', 'cost excl', 'ex vat', 'exvat', 'cost ex', 'price ex vat', 'price exvat']);
  const colCostIncVat = findColumn(headers, ['cost inc vat', 'cost incvat', 'cost including', 'cost incl', 'inc vat', 'incvat', 'cost inc', 'price inc vat', 'price incvat']);
  const colRsp = findColumn(headers, ['rsp', 'retail', 'retail price', 'suggested retail', 'list price', 'rrp']);
  const colCategory = findColumn(headers, ['category', 'cat', 'group', 'type', 'class']);
  const colStock = findColumn(headers, ['stock', 'qty', 'quantity', 'qty on hand', 'stock qty', 'available', 'soh']);
  const colBaseDiscount = findColumn(headers, ['base discount', 'discount', 'discount %', 'discount percent', 'disc', 'base disc']);

  // Extract values
  const sku = colSku >= 0 ? String(row[headers[colSku]] || '').trim() : '';
  if (!sku) return null; // Skip rows without SKU

  const brand = colBrand >= 0 ? String(row[headers[colBrand]] || '').trim() : undefined;
  const name = colName >= 0 ? String(row[headers[colName]] || '').trim() : '';
  const description = colDescription >= 0 ? String(row[headers[colDescription]] || '').trim() : undefined;
  
  // Price handling - prefer Cost Ex VAT, calculate from Cost Inc VAT if needed
  let price = 0;
  if (colCostExVat >= 0) {
    price = normalizePrice(row[headers[colCostExVat]]);
  } else if (colCostIncVat >= 0) {
    const incVatPrice = normalizePrice(row[headers[colCostIncVat]]);
    // Calculate Ex VAT from Inc VAT (15% VAT)
    price = incVatPrice / 1.15;
  }

  if (price <= 0) return null; // Skip rows without valid price

  const category = colCategory >= 0 ? String(row[headers[colCategory]] || '').trim() : undefined;
  const stockQty = colStock >= 0 ? parseInt(String(row[headers[colStock]] || '0')) || 0 : 0;

  // Parse discount percentage (handles "-25%", "25%", "25", etc.)
  let baseDiscount: number | undefined = undefined;
  if (colBaseDiscount >= 0) {
    const discountValue = String(row[headers[colBaseDiscount]] || '').trim();
    if (discountValue) {
      // Remove % sign and parse
      const cleaned = discountValue.replace(/%/g, '').replace(/-/g, '').trim();
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        baseDiscount = parsed;
      }
    }
  }

  // Build attrs_json
  const attrs: Record<string, unknown> = {};
  if (stockQty > 0) attrs.stock_qty = stockQty;
  if (colRsp >= 0) {
    const rsp = normalizePrice(row[headers[colRsp]]);
    if (rsp > 0) attrs.rsp = rsp;
  }
  if (colCostIncVat >= 0 && colCostExVat < 0) {
    attrs.cost_inc_vat = normalizePrice(row[headers[colCostIncVat]]);
  }
  if (baseDiscount !== undefined) {
    attrs.base_discount = baseDiscount;
    attrs.base_discount_percent = baseDiscount;
  }

  return {
    upload_id: '', // Will be set after upload creation
    row_num: 0, // Will be set during insertion
    supplier_sku: sku,
    name: name || sku,
    brand: brand || undefined,
    uom: 'EA',
    pack_size: undefined,
    price,
    currency: 'ZAR',
    category_raw: category,
    vat_code: undefined,
    barcode: undefined,
    attrs_json: Object.keys(attrs).length > 0 ? attrs : undefined,
  };
}

/**
 * Upload a single pricelist file
 */
async function uploadPricelistFile(config: FileConfig): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📤 Uploading: ${config.supplierName}`);
  console.log(`📁 File: ${config.path.split('\\').pop()}`);
  console.log('='.repeat(80));

  try {
    // Find or create supplier
    const supplierId = await findOrCreateSupplier(config.supplierName);
    config.supplierId = supplierId;

    // Process Excel file
    console.log('\n📊 Processing Excel file...');
    const { headers, rows } = processExcelFile(config.path, config.supplierName);
    console.log(`   ✅ Found ${headers.length} columns, ${rows.length} data rows`);

    // Create upload record
    const filename = config.path.split('\\').pop() || 'unknown.xlsx';
    const upload = await pricelistService.createUpload({
      supplier_id: supplierId,
      filename,
      currency: 'ZAR',
      valid_from: new Date(),
    });

    console.log(`   ✅ Created upload record (ID: ${upload.upload_id})`);

    // Map rows to PricelistRow format
    console.log('\n🔄 Mapping rows...');
    const pricelistRows: PricelistRow[] = [];
    let skippedCount = 0;

    for (const row of rows) {
      const mappedRow = mapRowToPricelistRow(row, headers, config.supplierName);
      if (mappedRow) {
        mappedRow.upload_id = upload.upload_id;
        pricelistRows.push(mappedRow);
      } else {
        skippedCount++;
      }
    }

    console.log(`   ✅ Mapped ${pricelistRows.length} valid rows (skipped ${skippedCount} invalid rows)`);

    // Insert rows
    console.log('\n💾 Inserting rows into database...');
    const insertedCount = await pricelistService.insertRows(upload.upload_id, pricelistRows);
    console.log(`   ✅ Inserted ${insertedCount} rows`);

    // Validate upload
    console.log('\n✅ Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);
    
    if (validationResult.status === 'valid' || validationResult.status === 'validated' || validationResult.status === 'warning') {
      console.log(`   ✅ Validation passed: ${validationResult.summary.valid_rows} valid rows`);
      
      if (validationResult.summary.error_rows > 0) {
        console.log(`   ⚠️  ${validationResult.summary.error_rows} errors found`);
      }
      if (validationResult.summary.warning_rows > 0) {
        console.log(`   ⚠️  ${validationResult.summary.warning_rows} warnings found`);
      }

      // Merge into core catalog
      console.log('\n🔄 Merging pricelist into core catalog...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id, {
        skipInvalidRows: validationResult.status === 'warning',
      });

      if (mergeResult.success) {
        console.log(`   ✅ Merge complete:`);
        console.log(`      Products created: ${mergeResult.products_created}`);
        console.log(`      Products updated: ${mergeResult.products_updated}`);
        console.log(`      Prices updated: ${mergeResult.prices_updated}`);
        
        if (mergeResult.errors.length > 0) {
          console.log(`   ⚠️  Merge errors: ${mergeResult.errors.length}`);
          mergeResult.errors.slice(0, 5).forEach(err => console.log(`      - ${err}`));
        }
      } else {
        console.log(`   ❌ Merge failed: ${mergeResult.errors.join(', ')}`);
        throw new Error(`Merge failed: ${mergeResult.errors.join(', ')}`);
      }
    } else {
      console.log(`   ❌ Validation failed: ${validationResult.status}`);
      console.log(`   Errors: ${validationResult.summary.error_rows}, Warnings: ${validationResult.summary.warning_rows}`);
      throw new Error(`Validation failed with status: ${validationResult.status}`);
    }

    console.log(`\n✅ Successfully uploaded and merged ${config.supplierName} pricelist`);
    console.log(`   Upload ID: ${upload.upload_id}`);
    console.log(`   Rows: ${insertedCount}`);

  } catch (error) {
    console.error(`\n❌ Error uploading ${config.supplierName}:`, error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Supplier Pricelist Upload');
  console.log('='.repeat(80));

  const results: Array<{ supplier: string; success: boolean; error?: string }> = [];

  for (const fileConfig of FILES) {
    try {
      await uploadPricelistFile(fileConfig);
      results.push({ supplier: fileConfig.supplierName, success: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.push({ supplier: fileConfig.supplierName, success: false, error: errorMsg });
      console.error(`\n❌ Failed to upload ${fileConfig.supplierName}: ${errorMsg}`);
    }
  }

  // Final summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(80));

  results.forEach(result => {
    if (result.success) {
      console.log(`   ✅ ${result.supplier}: SUCCESS`);
    } else {
      console.log(`   ❌ ${result.supplier}: FAILED - ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Completed: ${successCount}/${results.length} uploads successful`);
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
