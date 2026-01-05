#!/usr/bin/env bun
/**
 * Import Planet World SA Inventory from CSV Files - Single File Processor
 *
 * Processes CSV files one by one with detailed error reporting.
 * This version processes files individually to isolate errors.
 *
 * Usage:
 *   bun scripts/import-planetworld-csv-inventory-single.ts [file_path]
 *   bun scripts/import-planetworld-csv-inventory-single.ts --all
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Supplier "PLANET WORLD SA" or "PLANETWORLD SA" must exist in core.supplier table
 */

import { pricelistService } from '../src/lib/services/PricelistService';
import { query } from '../src/lib/database';
import type { PricelistRow } from '../src/types/nxt-spp';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const DOWNLOADS_PATH = 'C:\\00Project\\NXT_OCR\\Downloads';
const SUPPLIER_NAMES = ['PLANET WORLD SA', 'PLANETWORLD SA', 'Planet World SA'];
const VAT_RATE = 0.15;

interface CSVRow {
  Brand?: string;
  Category?: string;
  ItemCode?: string;
  ItemName?: string;
  StockStatus?: string;
  'Cost Price ExVAT'?: string;
  'Promo Price'?: string;
  RSP?: string;
  ETA?: string;
  ComboParent?: string;
  IsComponent?: string;
  [key: string]: unknown;
}

/**
 * Find supplier by name (tries multiple name variations)
 */
async function findSupplier(names: string[]): Promise<{ supplierId: string; name: string; orgId: string } | null> {
  try {
    for (const name of names) {
      const result = await query<{ supplier_id: string; name: string; org_id: string }>(
        `SELECT supplier_id, name, org_id 
         FROM core.supplier 
         WHERE name ILIKE $1 OR code ILIKE $1
         LIMIT 1`,
        [name]
      );

      if (result.rows.length > 0) {
        return {
          supplierId: result.rows[0].supplier_id,
          name: result.rows[0].name,
          orgId: result.rows[0].org_id,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding supplier:', error);
    throw error;
  }
}

/**
 * Find or create brand
 */
async function findOrCreateBrand(brandName: string, orgId: string, supplierId: string): Promise<string> {
  const normalizedName = brandName.trim();
  
  if (!normalizedName) {
    throw new Error('Brand name cannot be empty');
  }

  // Check if brand exists
  const existing = await query<{ id: string }>(
    `SELECT id FROM public.brand 
     WHERE org_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
    [orgId, normalizedName]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new brand
  const result = await query<{ id: string }>(
    `INSERT INTO public.brand (org_id, name, is_active, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW())
     RETURNING id`,
    [orgId, normalizedName]
  );

  if (result.rows.length === 0) {
    throw new Error(`Failed to create brand: ${normalizedName}`);
  }

  console.log(`   ✅ Created brand: ${normalizedName}`);
  return result.rows[0].id;
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
  
  if (!str) return undefined;
  
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse date value from various formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
 */
function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const str = String(value).trim();
  if (!str) return null;

  // Try DD/MM/YYYY format (common in CSV)
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try standard date parsing
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
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
 * Transform CSV row to PricelistRow format
 */
function transformRowToPricelistRow(
  row: CSVRow,
  brandName: string,
  uploadId: string,
  rowNum: number
): PricelistRow | null {
  try {
    // Extract SKU (ItemCode)
    const sku = sanitizeText(row.ItemCode);
    if (!sku) {
      return null; // Skip rows without SKU
    }

    // Extract name (ItemName)
    const name = sanitizeText(row.ItemName) || sku;

    // Extract brand (prefer from CSV, fallback to folder name)
    const brand = sanitizeText(row.Brand) || brandName;

    // Extract prices
    const costExVAT = parseNumber(row['Cost Price ExVAT']);
    const promoPrice = parseNumber(row['Promo Price']);
    const rsp = parseNumber(row.RSP);

    // Use cost_ex_vat as primary price, fallback to promo price, then RSP
    let price = costExVAT;
    let priceSource = 'cost_ex_vat';
    
    if (price === undefined && promoPrice !== undefined && promoPrice > 0) {
      price = promoPrice;
      priceSource = 'promo_price';
    }
    if (price === undefined && rsp !== undefined && rsp > 0) {
      // Use RSP as price if no cost price available (will be marked in attrs)
      price = rsp;
      priceSource = 'rsp';
    }

    // Need at least one price - use RSP even if 0 (will be validated later)
    if (price === undefined) {
      // Debug: log why row was skipped
      if (rowNum <= 5) {
        console.log(`   🔍 Debug skip row ${rowNum}: costExVAT=${costExVAT}, promoPrice=${promoPrice}, rsp=${rsp}, RSP raw="${row.RSP}"`);
      }
      return null; // Skip rows without valid price
    }

    // Extract stock status
    const stockStatus = sanitizeText(row.StockStatus) || undefined;
    if (stockStatus === '') {
      // Don't set empty string
    }

    // Extract ETA
    const eta = parseDate(row.ETA);

    // Extract category
    const category = sanitizeText(row.Category) || undefined;

    // Build attrs_json with additional data
    const attrs: Record<string, unknown> = {
      brand_from_csv: brand,
      source_folder: brandName,
      price_source: priceSource, // Track where price came from
    };

    if (costExVAT !== undefined && costExVAT > 0) {
      attrs.cost_excluding = costExVAT;
    }
    if (promoPrice !== undefined && promoPrice > 0) {
      attrs.promo_price = promoPrice;
    }
    if (rsp !== undefined && rsp > 0) {
      attrs.rsp = rsp;
    }
    if (row.ComboParent) {
      attrs.combo_parent = sanitizeText(row.ComboParent);
    }
    if (row.IsComponent) {
      attrs.is_component = sanitizeText(row.IsComponent);
    }

    return {
      upload_id: uploadId,
      row_num: rowNum,
      supplier_sku: sku,
      name,
      brand,
      uom: 'each',
      pack_size: undefined,
      price: price || 0, // Ensure price is never undefined
      currency: 'ZAR',
      category_raw: category,
      vat_code: undefined,
      barcode: undefined,
      stock_status: stockStatus,
      eta: eta || undefined,
      attrs_json: attrs,
    };
  } catch (error) {
    console.error(`   ⚠️  Error transforming row ${rowNum}:`, error);
    return null;
  }
}

/**
 * Process a single CSV file
 */
async function processCSVFile(
  filePath: string,
  brandName: string,
  supplierId: string,
  orgId: string,
  uploadId: string,
  startRowNum: number
): Promise<{ processed: number; skipped: number; rowNum: number; errors: string[] }> {
  const errors: string[] = [];
  console.log(`\n   📄 Processing: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    const error = `File not found: ${filePath}`;
    errors.push(error);
    console.error(`   ❌ ${error}`);
    return { processed: 0, skipped: 0, rowNum: startRowNum, errors };
  }

  try {
    // Read CSV file
    const csvContent = fs.readFileSync(filePath, 'utf-8');

    if (!csvContent || csvContent.trim().length === 0) {
      const error = `File is empty: ${filePath}`;
      errors.push(error);
      console.error(`   ❌ ${error}`);
      return { processed: 0, skipped: 0, rowNum: startRowNum, errors };
    }

    // Parse CSV with more lenient settings for quotes
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
      cast: false, // Don't auto-cast, we'll handle it manually
      quote: '"',
      escape: '"',
      relax_quotes: true, // Allow unescaped quotes in fields
      skip_records_with_error: true, // Skip problematic rows instead of failing
    }) as CSVRow[];

    if (records.length === 0) {
      const error = `No data rows found in ${path.basename(filePath)}`;
      errors.push(error);
      console.warn(`   ⚠️  ${error}`);
      return { processed: 0, skipped: 0, rowNum: startRowNum, errors };
    }

    console.log(`   📊 Found ${records.length} rows`);

    // Ensure brand exists
    try {
      await findOrCreateBrand(brandName, orgId, supplierId);
    } catch (error) {
      const errorMsg = `Failed to create brand ${brandName}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }

    // Transform rows
    const pricelistRows: PricelistRow[] = [];
    let rowNum = startRowNum;
    let skipped = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const pricelistRow = transformRowToPricelistRow(row, brandName, uploadId, rowNum);

        if (pricelistRow) {
          pricelistRows.push(pricelistRow);
          rowNum++;
        } else {
          skipped++;
          if (i < 5) { // Log first 5 skipped rows for debugging
            console.log(`   ⚠️  Skipped row ${i + 1}: SKU=${row.ItemCode || 'N/A'}, Name=${row.ItemName || 'N/A'}`);
          }
        }
      } catch (error) {
        skipped++;
        const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        if (i < 5) {
          console.warn(`   ⚠️  ${errorMsg}`);
        }
      }
    }

    // Insert rows
    if (pricelistRows.length > 0) {
      try {
        const inserted = await pricelistService.insertRows(uploadId, pricelistRows);
        console.log(`   ✅ Inserted ${inserted} rows (${skipped} skipped)`);
        return { processed: pricelistRows.length, skipped, rowNum, errors };
      } catch (error) {
        const errorMsg = `Failed to insert rows: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
        return { processed: 0, skipped, rowNum: startRowNum, errors };
      }
    } else {
      const error = `No valid rows to insert from ${path.basename(filePath)}`;
      errors.push(error);
      console.warn(`   ⚠️  ${error}`);
      return { processed: 0, skipped, rowNum: startRowNum, errors };
    }
  } catch (error) {
    const errorMsg = `Error processing file: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);
    console.error(`   ❌ ${errorMsg}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    return { processed: 0, skipped: 0, rowNum: startRowNum, errors };
  }
}

/**
 * Get brand name from folder path
 */
function getBrandNameFromPath(filePath: string, basePath: string): string {
  const relativePath = path.relative(basePath, filePath);
  const parts = relativePath.split(path.sep);
  
  // Brand name is typically the folder containing the CSV
  // Path structure: AUTO/BrandName/BrandName_PriceList_CLEAN.csv
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  
  // Fallback: use filename
  const filename = path.basename(filePath, '.csv');
  return filename.replace('_PriceList_CLEAN', '').replace('_CLEAN', '');
}

/**
 * Find all CSV files in a directory
 */
function findCSVFiles(dirPath: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively search subdirectories
      files.push(...findCSVFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.csv') && entry.name.includes('CLEAN')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Process all files one by one
 */
async function processAllFiles() {
  console.log('🚀 Starting Planet World SA CSV inventory import (one-by-one mode)...\n');

  try {
    // Step 1: Find supplier
    console.log(`🔍 Looking for supplier (trying: ${SUPPLIER_NAMES.join(', ')})...`);
    const supplier = await findSupplier(SUPPLIER_NAMES);

    if (!supplier) {
      throw new Error(`None of the suppliers (${SUPPLIER_NAMES.join(', ')}) found in database. Please create one first.`);
    }

    console.log(`✅ Found supplier: ${supplier.name} (ID: ${supplier.supplierId}, Org: ${supplier.orgId})\n`);

    // Step 2: Find all CSV files
    console.log('📋 Discovering CSV files...');
    const autoPath = path.join(DOWNLOADS_PATH, 'AUTO');
    const homePath = path.join(DOWNLOADS_PATH, 'HOME');

    const autoFiles = findCSVFiles(autoPath);
    const homeFiles = findCSVFiles(homePath);
    const allFiles = [...autoFiles, ...homeFiles];

    console.log(`✅ Found ${allFiles.length} CSV files (${autoFiles.length} AUTO, ${homeFiles.length} HOME)\n`);

    if (allFiles.length === 0) {
      throw new Error('No CSV files found in AUTO and HOME folders');
    }

    // Step 3: Process files one by one, creating a new upload for each file
    console.log('📥 Processing CSV files one by one...\n');
    let totalProcessed = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];
    const successfulFiles: string[] = [];
    const failedFiles: string[] = [];
    const uploadIds: string[] = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const brandName = getBrandNameFromPath(file, DOWNLOADS_PATH);
      
      console.log(`\n[${i + 1}/${allFiles.length}] Processing: ${path.basename(file)}`);
      console.log(`   Brand: ${brandName}`);

      try {
        // Create a new upload for each file to avoid row number conflicts
        const upload = await pricelistService.createUpload({
          supplier_id: supplier.supplierId,
          filename: path.basename(file),
          currency: 'ZAR',
          valid_from: new Date(),
        });

        uploadIds.push(upload.upload_id);

        const result = await processCSVFile(
          file,
          brandName,
          supplier.supplierId,
          supplier.orgId,
          upload.upload_id,
          1 // Start from row 1 for each file
        );

        totalProcessed += result.processed;
        totalSkipped += result.skipped;
        allErrors.push(...result.errors);

        if (result.processed > 0) {
          successfulFiles.push(file);
          
          // Validate and merge this file's upload immediately
          console.log(`\n   ✔️  Validating upload ${upload.upload_id}...`);
          try {
            const validationResult = await pricelistService.validateUpload(upload.upload_id);
            console.log(`   ✅ Validation: ${validationResult.status} (${validationResult.valid_rows}/${validationResult.total_rows} valid)`);

            if (validationResult.status === 'valid' || validationResult.status === 'validated' || validationResult.status === 'warning') {
              console.log(`   🔄 Merging into core schema...`);
              const mergeResult = await pricelistService.mergePricelist(upload.upload_id, {
                skipInvalidRows: validationResult.status === 'warning',
              });
              console.log(`   ✅ Merge complete: ${mergeResult.products_created} created, ${mergeResult.products_updated} updated`);
            }
          } catch (error) {
            console.error(`   ⚠️  Validation/Merge failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          failedFiles.push(file);
        }

        // Small delay between files
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        const errorMsg = `Failed to process ${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}`;
        allErrors.push(errorMsg);
        failedFiles.push(file);
        console.error(`   ❌ ${errorMsg}`);
      }
    }

    console.log(`\n\n✅ Processing complete!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Upload IDs created: ${uploadIds.length}`);
    console.log(`   Files processed: ${allFiles.length}`);
    console.log(`   Successful files: ${successfulFiles.length}`);
    console.log(`   Failed files: ${failedFiles.length}`);
    console.log(`   Products imported: ${totalProcessed}`);
    console.log(`   Products skipped: ${totalSkipped}`);

    if (failedFiles.length > 0) {
      console.log(`\n❌ Failed files:`);
      failedFiles.forEach(file => {
        console.log(`   - ${path.basename(file)}`);
      });
    }

    if (allErrors.length > 0) {
      console.log(`\n⚠️  Errors encountered (${allErrors.length}):`);
      allErrors.slice(0, 20).forEach(error => {
        console.log(`   - ${error}`);
      });
      if (allErrors.length > 20) {
        console.log(`   ... and ${allErrors.length - 20} more errors`);
      }
    }

    if (totalProcessed === 0) {
      console.log('\n⚠️  No products were imported. Check errors above.');
      return;
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Process a single file
 */
async function processSingleFile(filePath: string) {
  console.log(`🚀 Processing single file: ${filePath}\n`);

  try {
    // Step 1: Find supplier
    console.log(`🔍 Looking for supplier (trying: ${SUPPLIER_NAMES.join(', ')})...`);
    const supplier = await findSupplier(SUPPLIER_NAMES);

    if (!supplier) {
      throw new Error(`None of the suppliers (${SUPPLIER_NAMES.join(', ')}) found in database. Please create one first.`);
    }

    console.log(`✅ Found supplier: ${supplier.name} (ID: ${supplier.supplierId}, Org: ${supplier.orgId})\n`);

    // Step 2: Get brand name
    const brandName = getBrandNameFromPath(filePath, DOWNLOADS_PATH);
    console.log(`📦 Brand: ${brandName}\n`);

    // Step 3: Create pricelist upload
    console.log('📝 Creating pricelist upload record...');
    const upload = await pricelistService.createUpload({
      supplier_id: supplier.supplierId,
      filename: path.basename(filePath),
      currency: 'ZAR',
      valid_from: new Date(),
    });

    console.log(`✅ Created upload with ID: ${upload.upload_id}\n`);

    // Step 4: Process file
    const result = await processCSVFile(
      filePath,
      brandName,
      supplier.supplierId,
      supplier.orgId,
      upload.upload_id,
      1
    );

    console.log(`\n📊 Results:`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Skipped: ${result.skipped}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
      result.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }

    if (result.processed === 0) {
      console.log('\n⚠️  No products were imported.');
      return;
    }

    // Step 5: Validate and merge
    console.log('\n✔️  Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);
    console.log(`✅ Validation: ${validationResult.status} (${validationResult.valid_rows}/${validationResult.total_rows} valid)`);

    if (validationResult.status === 'valid' || validationResult.status === 'validated' || validationResult.status === 'warning') {
      console.log('\n🔄 Merging into core schema...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id, {
        skipInvalidRows: validationResult.status === 'warning',
      });
      console.log(`✅ Merge complete: ${mergeResult.products_created} created, ${mergeResult.products_updated} updated`);
    }

  } catch (error) {
    console.error('❌ Processing failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--all') {
  // Process all files
  processAllFiles()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
} else {
  // Process single file
  const filePath = args[0];
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  processSingleFile(filePath)
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

