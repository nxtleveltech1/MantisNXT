#!/usr/bin/env bun
/**
 * Batch Stock Upload Script for PlusPortal Suppliers
 *
 * Processes multiple CSV stock files from `.archive/.uploads` directory.
 * Files are named by supplier but may contain misspellings.
 * Ensures products are uploaded only to their correct suppliers.
 * Supports multi-supplier products (same SKU can belong to multiple suppliers).
 *
 * Usage:
 *   bun scripts/imports/batch-stock-upload-plusportal.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - CSV files in `.archive/.uploads` directory
 */

import { randomUUID } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

interface ProductRow {
  productNo: string; // Supplier SKU
  productDescription: string;
  totalSOH: number; // Stock on Hand
  priceBeforeDiscountExVat: number; // Price in ZAR
  rowNumber: number;
}

interface FileProcessingResult {
  filename: string;
  supplierId: string | null;
  supplierName: string | null;
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
  uploadId: string | null;
  auditId: number | null;
}

interface BatchProcessingResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: FileProcessingResult[];
}

/**
 * Filename to supplier name mapping (handles misspellings)
 */
const FILENAME_TO_SUPPLIER: Record<string, string> = {
  'active music': 'Active Music Distribution',
  'active music.csv': 'Active Music Distribution',
  'av distrabution': 'AV Distribution',
  'av distrabution.csv': 'AV Distribution',
  'senhieser': 'Sennheiser',
  'senhieser.csv': 'Sennheiser',
  'stageaudioworkls': 'Stage Audio Works',
  'stageaudioworkls.csv': 'Stage Audio Works',
};

/**
 * Extract supplier name from filename
 */
function extractSupplierNameFromFilename(filename: string): string {
  // Remove extension and normalize
  const baseName = filename
    .replace(/\.csv$/i, '')
    .toLowerCase()
    .trim();

  // Check mapping first
  if (FILENAME_TO_SUPPLIER[baseName]) {
    return FILENAME_TO_SUPPLIER[baseName];
  }

  // Try with .csv extension
  if (FILENAME_TO_SUPPLIER[filename.toLowerCase()]) {
    return FILENAME_TO_SUPPLIER[filename.toLowerCase()];
  }

  // Return normalized filename as fallback
  return baseName
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Match supplier from filename
 */
async function matchSupplierFromFilename(
  client: Client,
  filename: string
): Promise<{ supplierId: string; supplierName: string } | null> {
  const supplierName = extractSupplierNameFromFilename(filename);
  
  // Use the existing findSupplierByName function (but we need to use client.query directly)
  // Since findSupplierByName uses the query function from @/lib/database, we'll implement similar logic
  const normalized = supplierName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');

  // Try exact match first
  const exactMatch = await client.query(
    `SELECT supplier_id, name 
     FROM core.supplier 
     WHERE LOWER(TRIM(name)) = $1 
     LIMIT 1`,
    [normalized]
  );

  if (exactMatch.rows.length > 0) {
    return {
      supplierId: exactMatch.rows[0].supplier_id,
      supplierName: exactMatch.rows[0].name,
    };
  }

  // Try partial match
  const partialMatch = await client.query(
    `SELECT supplier_id, name 
     FROM core.supplier 
     WHERE LOWER(TRIM(name)) ILIKE $1 
     LIMIT 5`,
    [`%${normalized}%`]
  );

  if (partialMatch.rows.length === 0) {
    return null;
  }

  // Handle known variants
  const variants: Record<string, string[]> = {
    'sennheiser': ['sennheiser', 'sennhieser', 'sennheiser electronic'],
    'active music distribution': ['active music distribution', 'active music distrabution'],
    'av distribution': ['av distribution', 'av distrabution', 'a.v. distribution'],
    'stage audio works': ['stage audio works', 'stage audio works pty ltd'],
  };

  for (const [key, variantList] of Object.entries(variants)) {
    if (variantList.some(v => normalized.includes(v))) {
      const bestMatch = partialMatch.rows.find(row =>
        variantList.some(v =>
          row.name.toLowerCase().replace(/[^\w\s]/g, '').includes(v)
        )
      );
      if (bestMatch) {
        return {
          supplierId: bestMatch.supplier_id,
          supplierName: bestMatch.name,
        };
      }
    }
  }

  // Return first match
  return {
    supplierId: partialMatch.rows[0].supplier_id,
    supplierName: partialMatch.rows[0].name,
  };
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
 * Parse CSV file
 */
function parseCSV(filePath: string): ProductRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines[0]);

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  // Find column indices (case-insensitive, flexible matching)
  const productNoIdx = headers.findIndex(
    h => h.toLowerCase().includes('product no') && !h.toLowerCase().includes('manufacturer')
  );
  const descriptionIdx = headers.findIndex(
    h => h.toLowerCase().includes('product description') || h.toLowerCase().includes('description')
  );
  const sohIdx = headers.findIndex(
    h =>
      h.toLowerCase().includes('total soh') ||
      h.toLowerCase().includes('soh') ||
      h.toLowerCase().includes('stock')
  );
  const priceIdx = headers.findIndex(
    h =>
      h.toLowerCase().includes('price before discount') ||
      h.toLowerCase().includes('price') ||
      h.toLowerCase().includes('cost')
  );

  if (productNoIdx === -1 || descriptionIdx === -1 || priceIdx === -1) {
    console.error('Headers found:', headers);
    throw new Error('Required columns not found in CSV header. Expected: Product No, Product Description, Price');
  }

  const products: ProductRow[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);

    const productNo = (values[productNoIdx] || '').trim().replace(/^"|"$/g, '');
    const description = (values[descriptionIdx] || '').trim().replace(/^"|"$/g, '');
    const sohStr = (values[sohIdx] || '0').trim().replace(/^"|"$/g, '');
    const priceStr = (values[priceIdx] || '').trim().replace(/^"|"$/g, '');

    if (!productNo || !description) {
      continue; // Skip rows without required data
    }

    // Parse stock quantity
    const totalSOH = parseInt(sohStr, 10) || 0;

    // Parse price (remove "R " prefix and commas)
    const priceCleaned = priceStr.replace(/^R\s*/i, '').replace(/,/g, '').trim();
    const priceBeforeDiscountExVat = parseFloat(priceCleaned) || 0;

    if (priceBeforeDiscountExVat <= 0) {
      continue; // Skip products with no price
    }

    products.push({
      productNo,
      productDescription: description,
      totalSOH,
      priceBeforeDiscountExVat,
      rowNumber: i + 1,
    });
  }

  return products;
}

/**
 * Find or create stock location for supplier
 */
async function getOrCreateStockLocation(
  client: Client,
  supplierId: string,
  supplierName: string
): Promise<string> {
  // Try to find existing location for this supplier
  const existingLocation = await client.query(
    `SELECT location_id FROM core.stock_location 
     WHERE supplier_id = $1 AND type = 'supplier' AND is_active = true
     LIMIT 1`,
    [supplierId]
  );

  if (existingLocation.rows.length > 0) {
    return existingLocation.rows[0].location_id;
  }

  // Create new location for supplier
  const locationId = randomUUID();
  await client.query(
    `INSERT INTO core.stock_location (
      location_id,
      name,
      type,
      supplier_id,
      is_active,
      created_at,
      updated_at
    )
    VALUES ($1, $2, 'supplier', $3, true, NOW(), NOW())`,
    [locationId, `${supplierName} - Main Warehouse`, supplierId]
  );

  return locationId;
}

/**
 * Create pricelist upload record
 */
async function createPricelistUpload(
  client: Client,
  supplierId: string,
  filename: string,
  rowCount: number
): Promise<string> {
  const uploadId = randomUUID();

  await client.query(
    `INSERT INTO spp.pricelist_upload (
      upload_id, supplier_id, received_at, filename, currency, 
      valid_from, row_count, status, processed_by, created_at, updated_at
    )
    VALUES ($1, $2, NOW(), $3, 'ZAR', NOW(), $4, 'merged', 'batch-stock-upload-plusportal', NOW(), NOW())`,
    [uploadId, supplierId, filename, rowCount]
  );

  return uploadId;
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  client: Client,
  supplierId: string | null,
  uploadId: string | null,
  action: string,
  status: string,
  details: Record<string, unknown>
): Promise<number> {
  const result = await client.query(
    `INSERT INTO public.ai_agent_audit (supplier_id, upload_id, action, status, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id`,
    [supplierId, uploadId, action, status, JSON.stringify(details)]
  );
  return result.rows[0].id as number;
}

/**
 * Import products to database
 */
async function importProducts(
  client: Client,
  products: ProductRow[],
  supplierId: string,
  locationId: string
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  const batchSize = 100; // Process in batches of 100

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(products.length / batchSize);

    console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`);

    await client.query('BEGIN');

    try {
      for (const product of batch) {
        try {
          // Check if product already exists for THIS supplier
          // Important: Only check products belonging to the matched supplier
          const existingResult = await client.query(
            `SELECT supplier_product_id, name_from_supplier 
             FROM core.supplier_product 
             WHERE supplier_id = $1 AND supplier_sku = $2`,
            [supplierId, product.productNo]
          );

          const attrsJson = {
            price_before_discount_ex_vat: product.priceBeforeDiscountExVat,
            currency: 'ZAR',
            imported_from: 'PlusPortal Batch Upload',
            imported_at: new Date().toISOString(),
          };

          let supplierProductId: string;

          if (existingResult.rows.length === 0) {
            // Insert new product for this supplier
            supplierProductId = randomUUID();

            await client.query(
              `INSERT INTO core.supplier_product (
                supplier_product_id,
                supplier_id,
                supplier_sku,
                name_from_supplier,
                uom,
                barcode,
                attrs_json,
                first_seen_at,
                last_seen_at,
                is_active,
                is_new,
                created_at,
                updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW(), true, true, NOW(), NOW())`,
              [
                supplierProductId,
                supplierId,
                product.productNo,
                product.productDescription,
                'each',
                null,
                JSON.stringify(attrsJson),
              ]
            );

            // Insert price history
            await client.query(
              `INSERT INTO core.price_history (
                price_history_id,
                supplier_product_id,
                price,
                currency,
                valid_from,
                valid_to,
                is_current,
                change_reason,
                created_at
              )
              VALUES ($1, $2, $3, $4, NOW(), NULL, true, 'Initial import from PlusPortal batch upload', NOW())`,
              [randomUUID(), supplierProductId, product.priceBeforeDiscountExVat, 'ZAR']
            );

            inserted++;
          } else {
            // Update existing product for this supplier
            supplierProductId = existingResult.rows[0].supplier_product_id;

            await client.query(
              `UPDATE core.supplier_product SET
                name_from_supplier = $1,
                attrs_json = $2::jsonb,
                last_seen_at = NOW(),
                is_active = true,
                updated_at = NOW()
              WHERE supplier_product_id = $3`,
              [product.productDescription, JSON.stringify(attrsJson), supplierProductId]
            );

            // Mark old prices as not current
            await client.query(
              `UPDATE core.price_history 
               SET is_current = false, valid_to = NOW()
               WHERE supplier_product_id = $1 AND is_current = true`,
              [supplierProductId]
            );

            // Insert new price history entry
            await client.query(
              `INSERT INTO core.price_history (
                price_history_id,
                supplier_product_id,
                price,
                currency,
                valid_from,
                valid_to,
                is_current,
                change_reason,
                created_at
              )
              VALUES ($1, $2, $3, $4, NOW(), NULL, true, 'Price update from PlusPortal batch upload', NOW())`,
              [randomUUID(), supplierProductId, product.priceBeforeDiscountExVat, 'ZAR']
            );

            updated++;
          }

          // Insert or update stock on hand
          await client.query(
            `INSERT INTO core.stock_on_hand (
              soh_id,
              location_id,
              supplier_product_id,
              qty,
              unit_cost,
              as_of_ts,
              source,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), 'import', NOW())
            ON CONFLICT (location_id, supplier_product_id) DO UPDATE SET
              qty = EXCLUDED.qty,
              unit_cost = COALESCE(EXCLUDED.unit_cost, core.stock_on_hand.unit_cost),
              as_of_ts = NOW()`,
            [
              randomUUID(),
              locationId,
              supplierProductId,
              product.totalSOH,
              product.priceBeforeDiscountExVat > 0 ? product.priceBeforeDiscountExVat : null,
            ]
          );
        } catch (error) {
          const errorMsg = `Row ${product.rowNumber} (${product.productNo}): ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      await client.query('COMMIT');
      console.log(`   ✅ Batch ${batchNum} completed: ${inserted} inserted, ${updated} updated so far`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Batch ${batchNum} failed:`, error instanceof Error ? error.message : String(error));

      // Add all products in this batch to errors
      batch.forEach(product => {
        errors.push(`Row ${product.rowNumber} (${product.productNo}): Batch processing error`);
      });
    }
  }

  return { inserted, updated, errors };
}

/**
 * Process a single stock file
 */
async function processStockFile(
  client: Client,
  filePath: string,
  filename: string
): Promise<FileProcessingResult> {
  const result: FileProcessingResult = {
    filename,
    supplierId: null,
    supplierName: null,
    success: false,
    inserted: 0,
    updated: 0,
    errors: [],
    uploadId: null,
    auditId: null,
  };

  try {
    console.log(`\n📄 Processing file: ${filename}`);

    // Step 1: Match supplier from filename
    console.log(`   🔍 Matching supplier from filename...`);
    const supplierMatch = await matchSupplierFromFilename(client, filename);

    if (!supplierMatch) {
      result.errors.push(`Supplier not found for filename: ${filename}`);
      console.error(`   ❌ Supplier not found for filename: ${filename}`);
      return result;
    }

    result.supplierId = supplierMatch.supplierId;
    result.supplierName = supplierMatch.supplierName;
    console.log(`   ✅ Matched supplier: ${supplierMatch.supplierName} (ID: ${supplierMatch.supplierId})`);

    // Step 2: Read CSV file
    console.log(`   📖 Reading CSV file...`);
    const products = parseCSV(filePath);
    console.log(`   ✅ Parsed ${products.length} products from CSV`);

    if (products.length === 0) {
      result.errors.push('No products found in CSV file');
      console.warn(`   ⚠️  No products found in CSV file`);
      return result;
    }

    // Step 3: Create pricelist upload record
    console.log(`   📝 Creating pricelist upload record...`);
    const uploadId = await createPricelistUpload(client, supplierMatch.supplierId, filename, products.length);
    result.uploadId = uploadId;
    console.log(`   ✅ Created upload record: ${uploadId}`);

    // Step 4: Create audit log entry (start)
    const auditStartId = await createAuditLog(
      client,
      supplierMatch.supplierId,
      uploadId,
      'stock_upload',
      'started',
      {
        filename,
        supplier_name: supplierMatch.supplierName,
        product_count: products.length,
      }
    );

    // Step 5: Get or create stock location
    console.log(`   📍 Getting or creating stock location...`);
    const locationId = await getOrCreateStockLocation(client, supplierMatch.supplierId, supplierMatch.supplierName);
    console.log(`   ✅ Using location ID: ${locationId}`);

    // Step 6: Import products
    console.log(`   📦 Importing products and stock on hand...`);
    const importResult = await importProducts(client, products, supplierMatch.supplierId, locationId);

    result.inserted = importResult.inserted;
    result.updated = importResult.updated;
    result.errors = importResult.errors;

    // Step 7: Create audit log entry (completed)
    result.auditId = await createAuditLog(
      client,
      supplierMatch.supplierId,
      uploadId,
      'stock_upload',
      'completed',
      {
        filename,
        supplier_name: supplierMatch.supplierName,
        products_inserted: importResult.inserted,
        products_updated: importResult.updated,
        errors_count: importResult.errors.length,
        errors: importResult.errors.slice(0, 10), // Limit to first 10 errors
      }
    );

    result.success = true;
    console.log(`   ✅ File processing completed: ${importResult.inserted} inserted, ${importResult.updated} updated`);

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    console.error(`   ❌ Error processing file ${filename}:`, error);
    return result;
  }
}

/**
 * Process batch stock upload
 */
async function processBatchStockUpload(): Promise<BatchProcessingResult> {
  const uploadsDir = join(process.cwd(), '.archive', '.uploads');
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL or NEON_SPP_DATABASE_URL environment variable not set');
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Find all CSV files
    console.log(`📁 Scanning directory: ${uploadsDir}`);
    const files = readdirSync(uploadsDir).filter(file => file.toLowerCase().endsWith('.csv'));

    if (files.length === 0) {
      console.log('⚠️  No CSV files found in .archive/.uploads directory');
      return {
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        results: [],
      };
    }

    console.log(`✅ Found ${files.length} CSV file(s)\n`);

    const results: FileProcessingResult[] = [];

    // Process each file sequentially
    for (const filename of files) {
      const filePath = join(uploadsDir, filename);
      const result = await processStockFile(client, filePath, filename);
      results.push(result);
    }

    // Summary
    const successfulFiles = results.filter(r => r.success).length;
    const failedFiles = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH PROCESSING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files: ${files.length}`);
    console.log(`✅ Successful: ${successfulFiles}`);
    console.log(`❌ Failed: ${failedFiles}`);
    console.log('\nDetailed Results:');

    for (const result of results) {
      console.log(`\n  📄 ${result.filename}`);
      if (result.success) {
        console.log(`     Supplier: ${result.supplierName} (${result.supplierId})`);
        console.log(`     ✅ Inserted: ${result.inserted}`);
        console.log(`     🔄 Updated: ${result.updated}`);
        console.log(`     Upload ID: ${result.uploadId}`);
        console.log(`     Audit ID: ${result.auditId}`);
        if (result.errors.length > 0) {
          console.log(`     ⚠️  Errors: ${result.errors.length}`);
          result.errors.slice(0, 5).forEach(error => {
            console.log(`        - ${error}`);
          });
        }
      } else {
        console.log(`     ❌ Failed`);
        result.errors.forEach(error => {
          console.log(`        - ${error}`);
        });
      }
    }

    console.log('\n✨ Batch processing completed!');

    return {
      totalFiles: files.length,
      successfulFiles,
      failedFiles,
      results,
    };
  } catch (error) {
    console.error('\n❌ Batch processing error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await processBatchStockUpload();
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
