#!/usr/bin/env bun
/**
 * Re-upload Marshall Music Distributors with Base Discounts
 * 
 * Re-processes the Marshall Music Distributors file to capture
 * the Base Discount column that was missed in the initial upload.
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { query } from '@/lib/database';
import { pricelistService } from '@/lib/services/PricelistService';
import type { PricelistRow } from '@/types/nxt-spp';

const FILE_PATH = 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\Marshall Music Distrabutors - Extract Ready.xlsx';
const SUPPLIER_NAME = 'Marshall Music Distributors';

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
  let normalized = str.replace(/[R\s,]/g, '');
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
function processExcelFile(filePath: string): {
  headers: string[];
  rows: Array<Record<string, unknown>>;
} {
  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

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
    
    if (Object.values(rowObj).some(v => String(v).trim())) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

/**
 * Map row data to PricelistRow format WITH DISCOUNTS
 */
function mapRowToPricelistRow(
  row: Record<string, unknown>,
  headers: string[]
): PricelistRow | null {
  const colSku = findColumn(headers, ['sku', 'code', 'part number', 'item code', 'product code']);
  const colBrand = findColumn(headers, ['brand', 'manufacturer', 'make', 'supplier']);
  const colName = findColumn(headers, ['product name', 'name', 'product', 'item name', 'description', 'itemdescription']);
  const colCostExVat = findColumn(headers, ['cost ex vat', 'cost exvat', 'cost excluding', 'cost excl', 'ex vat', 'exvat', 'cost ex', 'price ex vat', 'price exvat']);
  const colCostIncVat = findColumn(headers, ['cost inc vat', 'cost incvat', 'cost including', 'cost incl', 'inc vat', 'incvat', 'cost inc', 'price inc vat', 'price incvat']);
  const colCategory = findColumn(headers, ['category', 'cat', 'group', 'type', 'class']);
  const colBaseDiscount = findColumn(headers, ['base discount', 'discount', 'discount %', 'discount percent', 'disc', 'base disc']);

  const sku = colSku >= 0 ? String(row[headers[colSku]] || '').trim() : '';
  if (!sku) return null;

  const brand = colBrand >= 0 ? String(row[headers[colBrand]] || '').trim() : undefined;
  const name = colName >= 0 ? String(row[headers[colName]] || '').trim() : '';
  
  // Price handling
  let price = 0;
  if (colCostExVat >= 0) {
    price = normalizePrice(row[headers[colCostExVat]]);
  } else if (colCostIncVat >= 0) {
    const incVatPrice = normalizePrice(row[headers[colCostIncVat]]);
    price = incVatPrice / 1.15;
  }

  if (price <= 0) return null;

  const category = colCategory >= 0 ? String(row[headers[colCategory]] || '').trim() : undefined;

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

  // Build attrs_json WITH DISCOUNTS
  const attrs: Record<string, unknown> = {};
  if (colCostIncVat >= 0 && colCostExVat < 0) {
    attrs.cost_inc_vat = normalizePrice(row[headers[colCostIncVat]]);
  }
  if (baseDiscount !== undefined) {
    attrs.base_discount = baseDiscount;
    attrs.base_discount_percent = baseDiscount;
    console.log(`   📊 SKU ${sku}: Base Discount = ${baseDiscount}%`);
  }

  return {
    upload_id: '',
    row_num: 0,
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

async function main() {
  console.log('🔄 Re-uploading Marshall Music Distributors with Base Discounts');
  console.log('='.repeat(80));

  try {
    // Find supplier
    const supplierResult = await query<{ supplier_id: string }>(
      `SELECT supplier_id FROM core.supplier WHERE LOWER(TRIM(name)) = $1 LIMIT 1`,
      [SUPPLIER_NAME.toLowerCase().trim()]
    );

    if (supplierResult.rows.length === 0) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found`);
    }

    const supplierId = supplierResult.rows[0].supplier_id;
    console.log(`✅ Found supplier: ${SUPPLIER_NAME} (ID: ${supplierId})\n`);

    // Process Excel file
    console.log('📊 Processing Excel file...');
    const { headers, rows } = processExcelFile(FILE_PATH);
    console.log(`   ✅ Found ${headers.length} columns, ${rows.length} data rows`);
    console.log(`   📋 Headers: ${headers.join(', ')}\n`);

    // Create upload record
    const filename = FILE_PATH.split('\\').pop() || 'unknown.xlsx';
    const upload = await pricelistService.createUpload({
      supplier_id: supplierId,
      filename: `${filename} (with-discounts)`,
      currency: 'ZAR',
      valid_from: new Date(),
    });

    console.log(`   ✅ Created upload record (ID: ${upload.upload_id})\n`);

    // Map rows WITH DISCOUNTS
    console.log('🔄 Mapping rows with discounts...');
    const pricelistRows: PricelistRow[] = [];
    let skippedCount = 0;
    let discountCount = 0;

    for (const row of rows) {
      const mappedRow = mapRowToPricelistRow(row, headers);
      if (mappedRow) {
        mappedRow.upload_id = upload.upload_id;
        pricelistRows.push(mappedRow);
        if (mappedRow.attrs_json?.base_discount) {
          discountCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`   ✅ Mapped ${pricelistRows.length} valid rows`);
    console.log(`   💰 Found ${discountCount} rows with base discounts`);
    console.log(`   ⏭️  Skipped ${skippedCount} invalid rows\n`);

    // Insert rows
    console.log('💾 Inserting rows into database...');
    const insertedCount = await pricelistService.insertRows(upload.upload_id, pricelistRows);
    console.log(`   ✅ Inserted ${insertedCount} rows\n`);

    // Validate upload
    console.log('✅ Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);
    
    if (validationResult.status === 'valid' || validationResult.status === 'validated' || validationResult.status === 'warning') {
      console.log(`   ✅ Validation passed\n`);

      // MERGE into core schema
      console.log('🔄 Merging into core schema (this will update products with discounts)...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id, {
        skipInvalidRows: validationResult.status === 'warning',
      });

      console.log(`\n✅ Merge complete:`);
      console.log(`   Products created: ${mergeResult.products_created}`);
      console.log(`   Products updated: ${mergeResult.products_updated}`);
      console.log(`   Prices updated: ${mergeResult.prices_updated}`);
      console.log(`   Duration: ${mergeResult.duration_ms}ms`);

      if (mergeResult.errors.length > 0) {
        console.log(`\n⚠️  Merge errors:`);
        mergeResult.errors.forEach(error => console.log(`   - ${error}`));
      }

      console.log(`\n✅ Successfully re-uploaded and merged with discounts!`);
      console.log(`   Upload ID: ${upload.upload_id}`);
      console.log(`   Discounts processed: ${discountCount}`);
    } else {
      console.log(`   ⚠️  Validation status: ${validationResult.status}`);
    }

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    throw error;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
