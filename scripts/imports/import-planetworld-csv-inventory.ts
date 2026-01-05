#!/usr/bin/env bun
/**
 * Import Planet World SA Inventory from CSV Files
 *
 * Processes CSV files from AUTO and HOME folders, creates brands, and imports inventory
 * with correct column mappings including Stock Status and ETA.
 *
 * Usage:
 *   bun scripts/import-planetworld-csv-inventory.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Supplier "PLANET WORLD SA" or "PLANETWORLD SA" must exist in core.supplier table
 *   - CSV files must be in C:\00Project\NXT_OCR\Downloads\AUTO and HOME folders
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
    // Try each name in order
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

  // Use cost_ex_vat as primary price, fallback to promo price
  let price = costExVAT;
  if (price === undefined && promoPrice !== undefined) {
    price = promoPrice;
  }

  // Need at least one price
  if (price === undefined || price <= 0) {
    return null; // Skip rows without valid price
  }

  // Extract stock status
  const stockStatus = sanitizeText(row.StockStatus) || undefined;

  // Extract ETA
  const eta = parseDate(row.ETA);

  // Extract category
  const category = sanitizeText(row.Category) || undefined;

  // Build attrs_json with additional data
  const attrs: Record<string, unknown> = {
    brand_from_csv: brand,
    source_folder: brandName,
  };

  if (costExVAT !== undefined) {
    attrs.cost_excluding = costExVAT;
  }
  if (promoPrice !== undefined) {
    attrs.promo_price = promoPrice;
  }
  if (rsp !== undefined) {
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
    price,
    currency: 'ZAR',
    category_raw: category,
    vat_code: undefined,
    barcode: undefined,
    stock_status: stockStatus,
    eta: eta || undefined,
    attrs_json: attrs,
  };
}

/**
 * Process a single CSV file
 */
async function processCSVFile(
  filePath: string,
  brandName: string,
  supplierId: string,
  uploadId: string,
  startRowNum: number
): Promise<{ processed: number; skipped: number; rowNum: number }> {
  console.log(`\n   📄 Processing: ${path.basename(filePath)}`);

  // Read CSV file
  const csvContent = fs.readFileSync(filePath, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as CSVRow[];

  if (records.length === 0) {
    console.warn(`   ⚠️  No data rows found in ${path.basename(filePath)}`);
    return { processed: 0, skipped: 0, rowNum: startRowNum };
  }

  console.log(`   📊 Found ${records.length} rows`);

  // Transform rows
  const pricelistRows: PricelistRow[] = [];
  let rowNum = startRowNum;
  let skipped = 0;

  for (const row of records) {
    try {
      const pricelistRow = transformRowToPricelistRow(row, brandName, uploadId, rowNum);

      if (pricelistRow) {
        pricelistRows.push(pricelistRow);
        rowNum++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.warn(`   ⚠️  Error transforming row ${rowNum}: ${error instanceof Error ? error.message : String(error)}`);
      skipped++;
    }
  }

  // Insert rows
  if (pricelistRows.length > 0) {
    const inserted = await pricelistService.insertRows(uploadId, pricelistRows);
    console.log(`   ✅ Inserted ${inserted} rows (${skipped} skipped)`);
  } else {
    console.warn(`   ⚠️  No valid rows to insert`);
  }

  return { processed: pricelistRows.length, skipped, rowNum };
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
 * Main import function
 */
async function importPlanetWorldCSVInventory() {
  console.log('🚀 Starting Planet World SA CSV inventory import...\n');

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

    // Step 3: Group files by brand
    const filesByBrand = new Map<string, string[]>();
    for (const file of allFiles) {
      const brandName = getBrandNameFromPath(file, DOWNLOADS_PATH);
      if (!filesByBrand.has(brandName)) {
        filesByBrand.set(brandName, []);
      }
      filesByBrand.get(brandName)!.push(file);
    }

    console.log(`📦 Found ${filesByBrand.size} unique brands:\n`);
    for (const [brand, files] of filesByBrand.entries()) {
      console.log(`   - ${brand}: ${files.length} file(s)`);
    }
    console.log('');

    // Step 4: Create brands
    console.log('🏷️  Creating/verifying brands...\n');
    const brandIds = new Map<string, string>();
    for (const brandName of filesByBrand.keys()) {
      try {
        const brandId = await findOrCreateBrand(brandName, supplier.orgId, supplier.supplierId);
        brandIds.set(brandName, brandId);
      } catch (error) {
        console.error(`   ❌ Error creating brand ${brandName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log('');

    // Step 5: Create pricelist upload
    console.log('📝 Creating pricelist upload record...');
    const upload = await pricelistService.createUpload({
      supplier_id: supplier.supplierId,
      filename: `planetworld-csv-import-${new Date().toISOString().split('T')[0]}.csv`,
      currency: 'ZAR',
      valid_from: new Date(),
    });

    console.log(`✅ Created upload with ID: ${upload.upload_id}\n`);

    // Step 6: Process all CSV files
    console.log('📥 Processing CSV files...\n');
    let totalProcessed = 0;
    let totalSkipped = 0;
    let rowNum = 1;

    for (const [brandName, files] of filesByBrand.entries()) {
      console.log(`\n📦 Processing brand: ${brandName}`);
      console.log(`   Files: ${files.length}`);

      for (const file of files) {
        try {
          const result = await processCSVFile(file, brandName, supplier.supplierId, upload.upload_id, rowNum);
          totalProcessed += result.processed;
          totalSkipped += result.skipped;
          rowNum = result.rowNum;
        } catch (error) {
          console.error(`   ❌ Error processing ${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    console.log(`\n✅ Processed ${totalProcessed} products total (${totalSkipped} skipped)\n`);

    if (totalProcessed === 0) {
      throw new Error('No products extracted from any CSV files');
    }

    // Step 7: Validate upload
    console.log('✔️  Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);
    console.log(`✅ Validation complete:`);
    console.log(`   Status: ${validationResult.status}`);
    console.log(`   Total rows: ${validationResult.total_rows}`);
    console.log(`   Valid rows: ${validationResult.valid_rows}`);
    console.log(`   Invalid rows: ${validationResult.invalid_rows}`);
    console.log(`   New products: ${validationResult.summary.new_products}`);
    console.log(`   Updated prices: ${validationResult.summary.updated_prices}\n`);

    if (validationResult.status === 'invalid' && validationResult.errors.length > 0) {
      console.log('⚠️  Validation errors found:');
      validationResult.errors.slice(0, 10).forEach(error => {
        console.log(`   Row ${error.row_num}: ${error.message}`);
      });
      if (validationResult.errors.length > 10) {
        console.log(`   ... and ${validationResult.errors.length - 10} more errors`);
      }
      console.log('');
    }

    // Step 8: Merge pricelist into core schema
    if (validationResult.status === 'valid' || validationResult.status === 'validated' || validationResult.status === 'warning') {
      console.log('🔄 Merging pricelist into core schema (SIP staging -> core)...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id, {
        skipInvalidRows: validationResult.status === 'warning',
      });

      console.log(`✅ Merge complete:`);
      console.log(`   Products created: ${mergeResult.products_created}`);
      console.log(`   Products updated: ${mergeResult.products_updated}`);
      console.log(`   Prices updated: ${mergeResult.prices_updated}`);
      console.log(`   Duration: ${mergeResult.duration_ms}ms\n`);

      if (mergeResult.errors.length > 0) {
        console.log('⚠️  Merge errors:');
        mergeResult.errors.forEach(error => {
          console.log(`   ${error}`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  Skipping merge due to validation errors\n');
    }

    console.log('✅ Import completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Upload ID: ${upload.upload_id}`);
    console.log(`   Brands processed: ${filesByBrand.size}`);
    console.log(`   CSV files processed: ${allFiles.length}`);
    console.log(`   Products imported: ${totalProcessed}`);
    console.log(`   Products skipped: ${totalSkipped}`);
    console.log(`   Validation status: ${validationResult.status}`);
  } catch (error) {
    console.error('❌ Import failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the import
importPlanetWorldCSVInventory()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

