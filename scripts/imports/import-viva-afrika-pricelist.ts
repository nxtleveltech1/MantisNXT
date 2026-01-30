#!/usr/bin/env bun
/**
 * Import Viva Afrika Dealer Pricelist from CSV
 *
 * Processes CSV file with semicolon delimiter, calculates cost ex VAT from cost inc VAT,
 * and imports products through the full SPP workflow.
 *
 * Usage:
 *   bun scripts/imports/import-viva-afrika-pricelist.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Supplier "VIVA AFRIKA" or variations must exist in core.supplier table
 *   - CSV file must be at: .archive/.uploads/Viva_Afrika_Dealer_Price_List - fixed import data.csv
 */

import { pricelistService } from '../../src/lib/services/PricelistService';
import { findSupplierByName } from '../../src/lib/utils/supplier-matcher';
import { query } from '../../src/lib/database';
import type { PricelistRow } from '../../src/types/nxt-spp';
import * as fs from 'fs';
import * as path from 'path';

const CSV_FILE_PATH = path.join(process.cwd(), '.archive', '.uploads', 'Viva_Afrika_Dealer_Price_List - fixed import data.csv');
const SUPPLIER_NAMES = [
  'VIVA AFRIKA',
  'VIVA AFRIKA CAR AUDIO',
  'VIVA AFRIKA JHB & CPT',
  'VIVAAFRIKA',
  'VIVA AFRICA',
];
const VAT_RATE = 0.15; // 15% South African VAT rate

interface CSVRow {
  SKU?: string;
  BRAND?: string;
  'MODEL SEIRES'?: string;
  DESCRIPTION?: string;
  RSP?: string;
  'COST INC VAT'?: string;
  [key: string]: unknown; // For the ignored date column
}

/**
 * Find supplier by name (tries multiple name variations)
 */
async function findSupplier(names: string[]): Promise<{ supplierId: string; name: string } | null> {
  try {
    // Try each name in order
    for (const name of names) {
      const supplierId = await findSupplierByName(name);
      if (supplierId) {
        // Get full supplier details
        const result = await query<{ supplier_id: string; name: string }>(
          `SELECT supplier_id, name 
           FROM core.supplier 
           WHERE supplier_id = $1
           LIMIT 1`,
          [supplierId]
        );

        if (result.rows.length > 0) {
          return {
            supplierId: result.rows[0].supplier_id,
            name: result.rows[0].name,
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding supplier:', error);
    throw error;
  }
}

/**
 * Parse number value, handling currency symbols and commas
 */
function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value;
  }
  
  const str = String(value)
    .replace(/[R$€£,\s]/g, '')
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

/**
 * Sanitize text value
 */
function sanitizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Calculate cost ex VAT from cost inc VAT
 * Formula: cost_ex_vat = cost_inc_vat / (1 + vat_rate)
 */
function calculateCostExVat(costIncVat: number, vatRate: number = VAT_RATE): number {
  return Number((costIncVat / (1 + vatRate)).toFixed(2));
}

/**
 * Parse CSV line with semicolon delimiter, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      values.push(currentValue.trim().replace(/^"|"$/g, ''));
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue.trim().replace(/^"|"$/g, '')); // Last value

  return values;
}

/**
 * Transform CSV row to PricelistRow format
 */
function transformRowToPricelistRow(
  row: CSVRow,
  uploadId: string,
  rowNum: number
): PricelistRow | null {
  // Extract SKU
  const sku = sanitizeText(row.SKU);
  if (!sku) {
    return null; // Skip rows without SKU
  }

  // Extract name (DESCRIPTION)
  const name = sanitizeText(row.DESCRIPTION) || sku;
  if (!name) {
    return null; // Skip rows without name
  }

  // Extract brand
  const brand = sanitizeText(row.BRAND) || undefined;

  // Extract model series
  const modelSeries = sanitizeText(row['MODEL SEIRES']) || undefined;

  // Extract RSP (Retail Selling Price)
  const rsp = parseNumber(row.RSP);

  // Extract cost inc VAT
  const costIncVat = parseNumber(row['COST INC VAT']);
  if (costIncVat === undefined || costIncVat <= 0) {
    return null; // Skip rows without valid cost inc VAT
  }

  // Calculate cost ex VAT
  const costExVat = calculateCostExVat(costIncVat, VAT_RATE);

  // Build attrs_json with additional data
  const attrs: Record<string, unknown> = {
    cost_including: costIncVat,
    cost_excluding: costExVat,
    vat_rate: VAT_RATE,
    price_source: 'derived_from_inc',
  };

  if (modelSeries) {
    attrs.model_series = modelSeries;
  }
  if (rsp !== undefined) {
    attrs.rsp = rsp;
  }

  return {
    upload_id: uploadId,
    row_num: rowNum,
    supplier_sku: sku,
    name,
    brand,
    uom: 'EA',
    pack_size: undefined,
    price: costExVat, // Required field - use cost ex VAT
    currency: 'ZAR',
    category_raw: brand || undefined,
    vat_code: undefined,
    barcode: undefined,
    attrs_json: attrs,
  };
}

/**
 * Main import function
 */
async function importVivaAfrikaPricelist() {
  console.log('🚀 Starting Viva Afrika pricelist import...\n');

  try {
    // Step 1: Verify CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at: ${CSV_FILE_PATH}`);
    }
    console.log(`✅ Found CSV file: ${path.basename(CSV_FILE_PATH)}\n`);

    // Step 2: Find supplier
    console.log(`🔍 Looking for supplier (trying: ${SUPPLIER_NAMES.join(', ')})...`);
    const supplier = await findSupplier(SUPPLIER_NAMES);

    if (!supplier) {
      throw new Error(`None of the suppliers (${SUPPLIER_NAMES.join(', ')}) found in database. Please create one first.`);
    }

    console.log(`✅ Found supplier: ${supplier.name} (ID: ${supplier.supplierId})\n`);

    // Step 3: Read and parse CSV file
    console.log('📄 Reading CSV file...');
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or has no data rows');
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    console.log(`📊 CSV Headers: ${headers.join(', ')}`);
    console.log(`📊 Total lines: ${lines.length} (${lines.length - 1} data rows)\n`);

    // Step 4: Create pricelist upload record
    console.log('📝 Creating pricelist upload record...');
    const upload = await pricelistService.createUpload({
      supplier_id: supplier.supplierId,
      file: Buffer.from(''), // Empty buffer - we parse CSV manually
      filename: path.basename(CSV_FILE_PATH),
      currency: 'ZAR',
      valid_from: new Date(),
      options: {
        auto_validate: false,
        auto_merge: false,
      },
    });

    console.log(`✅ Created upload record: ${upload.upload_id}\n`);

    // Step 5: Parse and transform rows
    console.log('🔄 Parsing and transforming rows...');
    const pricelistRows: PricelistRow[] = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        continue; // Skip empty lines
      }

      try {
        // Parse CSV line (semicolon-delimited)
        const values = parseCSVLine(line);
        
        // Map values to CSVRow object
        // Note: Column 6 (index 5) is the date column - we ignore it
        const row: CSVRow = {
          SKU: values[0],
          BRAND: values[1],
          'MODEL SEIRES': values[2],
          DESCRIPTION: values[3],
          RSP: values[4],
          // Skip values[5] - date column (ignored)
          'COST INC VAT': values[6],
        };

        const pricelistRow = transformRowToPricelistRow(row, upload.upload_id, pricelistRows.length + 1);

        if (pricelistRow) {
          pricelistRows.push(pricelistRow);
        } else {
          skipped++;
        }
      } catch (error) {
        console.warn(`⚠️  Error processing row ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        skipped++;
      }
    }

    console.log(`✅ Parsed ${pricelistRows.length} valid rows (${skipped} skipped)\n`);

    if (pricelistRows.length === 0) {
      throw new Error('No valid rows to import');
    }

    // Step 6: Insert rows
    console.log('💾 Inserting rows into database...');
    const insertedCount = await pricelistService.insertRows(upload.upload_id, pricelistRows);
    console.log(`✅ Inserted ${insertedCount} rows\n`);

    // Step 7: Validate upload
    console.log('🔍 Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);
    console.log(`✅ Validation status: ${validationResult.status}`);
    if (validationResult.errors && validationResult.errors.length > 0) {
      console.log(`⚠️  Validation errors: ${validationResult.errors.length}`);
      validationResult.errors.slice(0, 10).forEach((error, idx) => {
        console.log(`   ${idx + 1}. Row ${error.row_num}: ${error.message}`);
      });
      if (validationResult.errors.length > 10) {
        console.log(`   ... and ${validationResult.errors.length - 10} more errors`);
      }
    }
    console.log();

    // Step 8: Merge pricelist (create/update products)
    if (validationResult.status === 'valid') {
      console.log('🔄 Merging pricelist into catalog...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id);
      console.log(`✅ Merge completed:`);
      console.log(`   - Products created: ${mergeResult.products_created || 0}`);
      console.log(`   - Products updated: ${mergeResult.products_updated || 0}`);
      console.log(`   - Supplier products created: ${mergeResult.supplier_products_created || 0}`);
      console.log(`   - Supplier products updated: ${mergeResult.supplier_products_updated || 0}`);
      console.log(`   - Errors: ${mergeResult.errors?.length || 0}\n`);
    } else {
      console.warn('⚠️  Upload validation failed. Skipping merge.');
      console.warn('   Please review validation errors and fix them before merging.\n');
    }

    console.log('✅ Import completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Upload ID: ${upload.upload_id}`);
    console.log(`   - Supplier: ${supplier.name}`);
    console.log(`   - Rows processed: ${pricelistRows.length}`);
    console.log(`   - Rows skipped: ${skipped}`);
    console.log(`   - Validation status: ${validationResult.status}`);

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run import if executed directly
if (import.meta.main) {
  importVivaAfrikaPricelist()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}
