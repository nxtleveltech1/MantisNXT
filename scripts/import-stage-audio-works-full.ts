#!/usr/bin/env bun
/**
 * Import Stage Audio Works SOH CSV - FULL Import
 *
 * This script follows the new multi-supplier SKU architecture where:
 * - The same SKU can exist under multiple suppliers (composite identity: supplier_id + supplier_sku)
 * - Products are ISOLATED to Stage Audio Works only - ZERO tolerance for supplier bleed
 * - Existing products (~1600) are UPDATED with full price history tracking
 * - New products are CREATED with proper initialization
 *
 * IMPORTANT: This change applies SOLELY to Stage Audio Works.
 * Items should NOT be loaded anywhere except Stage Audio Works.
 *
 * Usage:
 *   bun scripts/import-stage-audio-works-full.ts <csv-file-path>
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - CSV file at the specified path
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { Client } from 'pg';

// ============================================================================
// TYPES
// ============================================================================

interface ProductRow {
  productNo: string; // Supplier SKU (Product No.)
  manufacturerProductNo: string; // Manufacturer's SKU
  productDescription: string;
  totalSOH: number; // Stock on Hand
  priceBeforeDiscountExVat: number; // Price in ZAR
  rowNumber: number;
}

interface ImportStats {
  inserted: number;
  updated: number;
  priceChanges: number;
  stockUpdates: number;
  errors: string[];
}

// ============================================================================
// CSV PARSING
// ============================================================================

function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCSV(filePath: string): ProductRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  const delimiter = detectDelimiter(lines[0]);
  console.log(`   Detected delimiter: ${delimiter === ';' ? 'semicolon' : 'comma'}`);

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map(h =>
    h.trim().replace(/^"|"$/g, '')
  );

  console.log(`   Headers found: ${headers.join(', ')}`);

  // Find column indices - match expected CSV structure
  // "Product No.","Manufacturer Product No.","Product Description","Total SOH","Price Before Discount Ex Vat"
  const productNoIdx = headers.findIndex(
    h => h.toLowerCase().includes('product no') && !h.toLowerCase().includes('manufacturer')
  );
  const manufacturerNoIdx = headers.findIndex(h =>
    h.toLowerCase().includes('manufacturer product no') ||
    h.toLowerCase().includes('manufacturer')
  );
  const descriptionIdx = headers.findIndex(
    h => h.toLowerCase().includes('product description') || h.toLowerCase().includes('description')
  );
  const sohIdx = headers.findIndex(
    h =>
      h.toLowerCase().includes('total soh') ||
      (h.toLowerCase().includes('soh') && !h.toLowerCase().includes('price'))
  );
  const priceIdx = headers.findIndex(
    h => h.toLowerCase().includes('price before discount') || h.toLowerCase().includes('price')
  );

  console.log(
    `   Column indices: productNo=${productNoIdx}, manufacturerNo=${manufacturerNoIdx}, desc=${descriptionIdx}, soh=${sohIdx}, price=${priceIdx}`
  );

  if (productNoIdx === -1 || descriptionIdx === -1 || priceIdx === -1) {
    throw new Error(
      'Required columns not found. Expected: Product No., Product Description, Price Before Discount Ex Vat'
    );
  }

  const products: ProductRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);

    const productNo = (values[productNoIdx] || '').trim().replace(/^"|"$/g, '');
    const manufacturerProductNo =
      manufacturerNoIdx >= 0
        ? (values[manufacturerNoIdx] || '').trim().replace(/^"|"$/g, '')
        : '';
    const description = (values[descriptionIdx] || '').trim().replace(/^"|"$/g, '');
    const sohStr = sohIdx >= 0 ? (values[sohIdx] || '0').trim().replace(/^"|"$/g, '') : '0';
    const priceStr = (values[priceIdx] || '').trim().replace(/^"|"$/g, '');

    if (!productNo || !description) {
      continue; // Skip rows without required data
    }

    // Parse stock quantity
    const totalSOH = parseInt(sohStr, 10) || 0;

    // Parse price (remove "R " prefix and commas, handle decimal)
    const priceCleaned = priceStr
      .replace(/^R\s*/i, '')
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .trim();
    const priceBeforeDiscountExVat = parseFloat(priceCleaned) || 0;

    // Accept products even with 0 price - they may be updated later
    products.push({
      productNo,
      manufacturerProductNo,
      productDescription: description,
      totalSOH,
      priceBeforeDiscountExVat,
      rowNumber: i + 1,
    });
  }

  return products;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Find Stage Audio Works supplier by name - SPECIFICALLY excluding Stage One
 */
async function findStageAudioWorksSupplier(client: Client): Promise<{
  supplierId: string;
  supplierName: string;
  supplierCode: string;
} | null> {
  const result = await client.query<{
    supplier_id: string;
    name: string;
    code: string;
  }>(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE (LOWER(name) LIKE '%stage audio works%' 
        OR LOWER(name) = 'stage audio'
        OR code = 'SAW' 
        OR code = 'STAGEAUDIO')
       AND LOWER(name) NOT LIKE '%stage one%'
       AND active = true
     ORDER BY 
       CASE WHEN LOWER(name) = 'stage audio works' THEN 1 ELSE 2 END,
       name
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    supplierId: result.rows[0].supplier_id,
    supplierName: result.rows[0].name,
    supplierCode: result.rows[0].code,
  };
}

/**
 * Get or create stock location for supplier
 */
async function getOrCreateStockLocation(
  client: Client,
  supplierId: string,
  supplierName: string
): Promise<string> {
  const existingLocation = await client.query<{ location_id: string }>(
    `SELECT location_id FROM core.stock_location 
     WHERE supplier_id = $1 AND type = 'supplier' AND is_active = true
     LIMIT 1`,
    [supplierId]
  );

  if (existingLocation.rows.length > 0) {
    return existingLocation.rows[0].location_id;
  }

  const locationId = randomUUID();
  await client.query(
    `INSERT INTO core.stock_location (
      location_id, name, type, supplier_id, is_active, created_at, updated_at
    )
    VALUES ($1, $2, 'supplier', $3, true, NOW(), NOW())`,
    [locationId, `${supplierName} - Main Warehouse`, supplierId]
  );

  return locationId;
}

/**
 * Create pricelist upload record for tracking
 */
async function createPricelistUpload(
  client: Client,
  supplierId: string,
  filename: string,
  rowCount: number
): Promise<string> {
  const uploadId = randomUUID();

  // Status must be one of: 'received', 'validating', 'validated', 'merged', 'failed', 'rejected'
  await client.query(
    `INSERT INTO spp.pricelist_upload (
      upload_id, supplier_id, received_at, filename, currency, 
      valid_from, row_count, status, created_at, updated_at
    )
    VALUES ($1, $2, NOW(), $3, 'ZAR', NOW(), $4, 'merged', NOW(), NOW())`,
    [uploadId, supplierId, filename, rowCount]
  );

  return uploadId;
}

/**
 * Get existing products for Stage Audio Works
 */
async function getExistingProducts(
  client: Client,
  supplierId: string,
  skus: string[]
): Promise<
  Map<
    string,
    {
      supplier_product_id: string;
      current_price: number | null;
    }
  >
> {
  if (skus.length === 0) return new Map();

  // Batch the query to avoid parameter limits
  const batchSize = 1000;
  const existingProducts = new Map<
    string,
    { supplier_product_id: string; current_price: number | null }
  >();

  for (let i = 0; i < skus.length; i += batchSize) {
    const batch = skus.slice(i, i + batchSize);

    const result = await client.query<{
      supplier_sku: string;
      supplier_product_id: string;
      current_price: number | null;
    }>(
      `SELECT 
        sp.supplier_sku,
        sp.supplier_product_id,
        ph.price AS current_price
       FROM core.supplier_product sp
       LEFT JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id AND ph.is_current = true
       WHERE sp.supplier_id = $1 AND sp.supplier_sku = ANY($2::text[])`,
      [supplierId, batch]
    );

    result.rows.forEach(row => {
      existingProducts.set(row.supplier_sku, {
        supplier_product_id: row.supplier_product_id,
        current_price: row.current_price,
      });
    });
  }

  return existingProducts;
}

/**
 * Import products with full upsert logic and price history tracking
 */
async function importProducts(
  client: Client,
  products: ProductRow[],
  supplierId: string,
  locationId: string,
  uploadId: string
): Promise<ImportStats> {
  const stats: ImportStats = {
    inserted: 0,
    updated: 0,
    priceChanges: 0,
    stockUpdates: 0,
    errors: [],
  };

  console.log('   Fetching existing products for Stage Audio Works...');
  const skus = products.map(p => p.productNo);
  const existingProducts = await getExistingProducts(client, supplierId, skus);
  console.log(`   Found ${existingProducts.size} existing products\n`);

  const batchSize = 100;
  const totalBatches = Math.ceil(products.length / batchSize);

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    process.stdout.write(
      `\r   Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`
    );

    await client.query('BEGIN');

    try {
      for (const product of batch) {
        try {
          const existing = existingProducts.get(product.productNo);

          const attrsJson = {
            cost_excluding: product.priceBeforeDiscountExVat,
            manufacturer_sku: product.manufacturerProductNo || null,
            stock_quantity: product.totalSOH,
            currency: 'ZAR',
            imported_from: 'SOH CSV Import',
            imported_at: new Date().toISOString(),
            upload_id: uploadId,
          };

          let supplierProductId: string;

          if (!existing) {
            // ========== INSERT NEW PRODUCT ==========
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
              VALUES ($1, $2, $3, $4, 'EA', $5, $6::jsonb, NOW(), NOW(), true, true, NOW(), NOW())`,
              [
                supplierProductId,
                supplierId,
                product.productNo,
                product.productDescription,
                null, // barcode
                JSON.stringify(attrsJson),
              ]
            );

            // Insert initial price history
            if (product.priceBeforeDiscountExVat > 0) {
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
                VALUES ($1, $2, $3, 'ZAR', NOW(), NULL, true, 'Initial import from SOH CSV', NOW())`,
                [randomUUID(), supplierProductId, product.priceBeforeDiscountExVat]
              );
            }

            stats.inserted++;
          } else {
            // ========== UPDATE EXISTING PRODUCT ==========
            supplierProductId = existing.supplier_product_id;

            await client.query(
              `UPDATE core.supplier_product SET
                name_from_supplier = $1,
                attrs_json = attrs_json || $2::jsonb,
                last_seen_at = NOW(),
                is_active = true,
                is_new = false,
                updated_at = NOW()
              WHERE supplier_product_id = $3`,
              [product.productDescription, JSON.stringify(attrsJson), supplierProductId]
            );

            // Check if price changed
            const priceChanged =
              existing.current_price !== null &&
              Math.abs((existing.current_price || 0) - product.priceBeforeDiscountExVat) > 0.01;

            if (priceChanged || existing.current_price === null) {
              // Mark old price as not current
              await client.query(
                `UPDATE core.price_history 
                 SET is_current = false, valid_to = NOW()
                 WHERE supplier_product_id = $1 AND is_current = true`,
                [supplierProductId]
              );

              // Insert new price history entry
              if (product.priceBeforeDiscountExVat > 0) {
                const changeReason =
                  existing.current_price === null
                    ? 'Price set from SOH CSV import'
                    : `Price update from SOH CSV: R${existing.current_price?.toFixed(2)} → R${product.priceBeforeDiscountExVat.toFixed(2)}`;

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
                  VALUES ($1, $2, $3, 'ZAR', NOW(), NULL, true, $4, NOW())`,
                  [
                    randomUUID(),
                    supplierProductId,
                    product.priceBeforeDiscountExVat,
                    changeReason,
                  ]
                );

                stats.priceChanges++;
              }
            }

            stats.updated++;
          }

          // ========== UPDATE STOCK ON HAND ==========
          // Valid source values: 'manual', 'import', 'system'
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

          stats.stockUpdates++;

          // ========== INSERT PRICELIST ROW FOR TRACKING ==========
          await client.query(
            `INSERT INTO spp.pricelist_row (
              upload_id, row_num, supplier_sku, name, brand, uom, pack_size,
              price, currency, category_raw, vat_code, barcode, attrs_json
            )
            VALUES ($1, $2, $3, $4, NULL, 'EA', NULL, $5, 'ZAR', NULL, 'S', NULL, $6::jsonb)`,
            [
              uploadId,
              product.rowNumber,
              product.productNo,
              product.productDescription,
              product.priceBeforeDiscountExVat,
              JSON.stringify({
                manufacturer_sku: product.manufacturerProductNo || null,
                stock_on_hand: product.totalSOH,
              }),
            ]
          );
        } catch (error) {
          const errorMsg = `Row ${product.rowNumber} (${product.productNo}): ${
            error instanceof Error ? error.message : String(error)
          }`;
          stats.errors.push(errorMsg);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(
        `\n   ❌ Batch ${batchNum} failed:`,
        error instanceof Error ? error.message : String(error)
      );

      batch.forEach(product => {
        stats.errors.push(`Row ${product.rowNumber} (${product.productNo}): Batch processing error`);
      });
    }
  }

  console.log('\n');
  return stats;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const csvFilePath = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  STAGE AUDIO WORKS - FULL SOH CSV IMPORT');
  console.log('  Multi-Supplier SKU Architecture - Composite Identity Pattern');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (!csvFilePath) {
    console.error('❌ Usage: bun scripts/import-stage-audio-works-full.ts <csv-file-path>');
    console.error('   Example: bun scripts/import-stage-audio-works-full.ts "C:\\path\\to\\SOH.csv"');
    process.exit(1);
  }

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or NEON_SPP_DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Step 1: Find Stage Audio Works supplier
    console.log('🔍 Step 1: Finding Stage Audio Works supplier (STRICT MATCH)...');
    const supplier = await findStageAudioWorksSupplier(client);

    if (!supplier) {
      console.error('❌ Stage Audio Works supplier not found in database');

      const allSuppliers = await client.query(
        `SELECT supplier_id, name, code FROM core.supplier 
         WHERE LOWER(name) LIKE '%stage%' AND active = true
         ORDER BY name LIMIT 10`
      );

      if (allSuppliers.rows.length > 0) {
        console.log('\n   Suppliers with "stage" in name:');
        allSuppliers.rows.forEach(row => {
          console.log(`   - ${row.name} (${row.code}) - ID: ${row.supplier_id}`);
        });
      }

      process.exit(1);
    }

    console.log(`✅ Found: ${supplier.supplierName} (${supplier.supplierCode})`);
    console.log(`   Supplier ID: ${supplier.supplierId}\n`);

    // Step 2: Verify supplier isolation
    console.log('🔒 Step 2: Verifying supplier isolation...');
    console.log(`   ⚠️  ISOLATION CHECK: All products will be loaded ONLY to ${supplier.supplierName}`);
    console.log(`   ⚠️  ZERO TOLERANCE for supplier bleed - products scoped to supplier_id: ${supplier.supplierId}\n`);

    // Step 3: Read CSV file
    console.log(`📖 Step 3: Reading CSV file: ${csvFilePath}`);
    const products = parseCSV(csvFilePath);
    console.log(`✅ Parsed ${products.length} products from CSV\n`);

    if (products.length === 0) {
      console.error('❌ No valid products found in CSV file');
      process.exit(1);
    }

    // Show sample data
    console.log('   Sample products:');
    products.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.productNo} - ${p.productDescription.substring(0, 50)}... - R${p.priceBeforeDiscountExVat.toFixed(2)} - SOH: ${p.totalSOH}`);
    });
    if (products.length > 3) {
      console.log(`   ... and ${products.length - 3} more\n`);
    }

    // Step 4: Get or create stock location
    console.log('📍 Step 4: Setting up stock location...');
    const locationId = await getOrCreateStockLocation(
      client,
      supplier.supplierId,
      supplier.supplierName
    );
    console.log(`✅ Using location ID: ${locationId}\n`);

    // Step 5: Create pricelist upload record
    console.log('📝 Step 5: Creating pricelist upload record for tracking...');
    const filename = csvFilePath.split(/[/\\]/).pop() || 'SOH_Import.csv';
    const uploadId = await createPricelistUpload(
      client,
      supplier.supplierId,
      filename,
      products.length
    );
    console.log(`✅ Upload ID: ${uploadId}\n`);

    // Step 6: Import products
    console.log('📦 Step 6: Importing products to Stage Audio Works...');
    console.log('   This will:');
    console.log('   • INSERT new products');
    console.log('   • UPDATE existing products');
    console.log('   • TRACK price history for all changes');
    console.log('   • UPDATE stock on hand quantities\n');

    const stats = await importProducts(
      client,
      products,
      supplier.supplierId,
      locationId,
      uploadId
    );

    // Step 7: Summary
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  IMPORT COMPLETED');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    console.log(`   Supplier: ${supplier.supplierName} (${supplier.supplierCode})`);
    console.log(`   Supplier ID: ${supplier.supplierId}`);
    console.log(`   Upload ID: ${uploadId}\n`);
    console.log(`   📥 Products Inserted: ${stats.inserted}`);
    console.log(`   🔄 Products Updated: ${stats.updated}`);
    console.log(`   💰 Price Changes Tracked: ${stats.priceChanges}`);
    console.log(`   📦 Stock Records Updated: ${stats.stockUpdates}`);
    console.log(`   ❌ Errors: ${stats.errors.length}\n`);

    if (stats.errors.length > 0) {
      console.log('   ⚠️  Errors encountered:');
      stats.errors.slice(0, 10).forEach(error => {
        console.log(`      - ${error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`      ... and ${stats.errors.length - 10} more errors`);
      }
    }

    console.log('\n✨ Import completed successfully!');
    console.log(`   Total: ${stats.inserted + stats.updated} products processed for Stage Audio Works`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main();
}

