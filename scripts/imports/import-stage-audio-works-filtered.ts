#!/usr/bin/env bun
/**
 * Import Stage Audio Works SOH CSV - Filtered Import
 *
 * Processes CSV file with SOH (Stock on Hand) data and imports ONLY products
 * that don't already exist under any supplier. This isolates products that
 * belong exclusively to Stage Audio Works.
 *
 * Usage:
 *   bun scripts/import-stage-audio-works-filtered.ts <csv-file-path>
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - CSV file at the specified path
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { Client } from 'pg';

interface ProductRow {
  productNo: string; // Supplier SKU
  productDescription: string;
  totalSOH: number; // Stock on Hand
  priceBeforeDiscountExVat: number; // Price in ZAR
  rowNumber: number;
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
  console.log(`   Detected delimiter: ${delimiter === ';' ? 'semicolon' : 'comma'}`);

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Find column indices (case-insensitive, flexible matching)
  const productNoIdx = headers.findIndex(h => 
    h.toLowerCase().includes('product no') && 
    !h.toLowerCase().includes('manufacturer')
  );
  const descriptionIdx = headers.findIndex(h => 
    h.toLowerCase().includes('product description') ||
    h.toLowerCase().includes('description')
  );
  const sohIdx = headers.findIndex(h => 
    h.toLowerCase().includes('total soh') || 
    h.toLowerCase().includes('soh') ||
    h.toLowerCase().includes('stock')
  );
  const priceIdx = headers.findIndex(h => 
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
    const priceCleaned = priceStr
      .replace(/^R\s*/i, '')
      .replace(/,/g, '')
      .trim();
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
 * Find supplier ID by name - specifically for Stage Audio Works (not Stage One)
 */
async function findStageAudioWorksSupplier(client: Client): Promise<string | null> {
  // Explicitly search for Stage Audio Works, avoiding Stage One
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE (LOWER(name) LIKE '%stage audio works%' 
        OR LOWER(name) LIKE '%stage audio%')
       AND LOWER(name) NOT LIKE '%stage one%'
     LIMIT 5`
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

  // Return first match
  return result.rows[0].supplier_id;
}

/**
 * Check which SKUs already exist under any supplier
 */
async function checkExistingSKUs(
  client: Client,
  skus: string[]
): Promise<Set<string>> {
  if (skus.length === 0) return new Set();

  const result = await client.query<{ supplier_sku: string; supplier_name: string }>(`
    SELECT DISTINCT 
      sp.supplier_sku,
      s.name as supplier_name
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    WHERE sp.supplier_sku = ANY($1::text[])
  `, [skus]);

  const existingSKUs = new Set<string>();
  const skuToSupplier = new Map<string, string>();

  result.rows.forEach(row => {
    existingSKUs.add(row.supplier_sku);
    skuToSupplier.set(row.supplier_sku, row.supplier_name);
  });

  // Log which SKUs exist and under which suppliers
  if (existingSKUs.size > 0) {
    console.log(`\n   Found ${existingSKUs.size} SKUs already existing under other suppliers:`);
    const bySupplier = new Map<string, number>();
    skuToSupplier.forEach((supplier, sku) => {
      const count = bySupplier.get(supplier) || 0;
      bySupplier.set(supplier, count + 1);
    });
    bySupplier.forEach((count, supplier) => {
      console.log(`     - ${supplier}: ${count} SKUs`);
    });
  }

  return existingSKUs;
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
          // Check if product already exists under Stage Audio Works
          const existingResult = await client.query(
            `SELECT supplier_product_id, name_from_supplier 
             FROM core.supplier_product 
             WHERE supplier_id = $1 AND supplier_sku = $2`,
            [supplierId, product.productNo]
          );

          const attrsJson = {
            price_before_discount_ex_vat: product.priceBeforeDiscountExVat,
            currency: 'ZAR',
            imported_from: 'SOH CSV',
            imported_at: new Date().toISOString(),
          };

          let supplierProductId: string;

          if (existingResult.rows.length === 0) {
            // Insert new product
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
              VALUES ($1, $2, $3, $4, NOW(), NULL, true, 'Initial import from SOH CSV', NOW())`,
              [
                randomUUID(),
                supplierProductId,
                product.priceBeforeDiscountExVat,
                'ZAR',
              ]
            );

            inserted++;
          } else {
            // Update existing product
            supplierProductId = existingResult.rows[0].supplier_product_id;

            await client.query(
              `UPDATE core.supplier_product SET
                name_from_supplier = $1,
                attrs_json = $2::jsonb,
                last_seen_at = NOW(),
                is_active = true,
                updated_at = NOW()
              WHERE supplier_product_id = $3`,
              [
                product.productDescription,
                JSON.stringify(attrsJson),
                supplierProductId,
              ]
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
              VALUES ($1, $2, $3, $4, NOW(), NULL, true, 'Price update from SOH CSV', NOW())`,
              [
                randomUUID(),
                supplierProductId,
                product.priceBeforeDiscountExVat,
                'ZAR',
              ]
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
 * Main execution
 */
async function main() {
  const csvFilePath = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  if (!csvFilePath) {
    console.error('❌ Usage: bun scripts/import-stage-audio-works-filtered.ts <csv-file-path>');
    console.error('   Example: bun scripts/import-stage-audio-works-filtered.ts "C:\\path\\to\\file.csv"');
    process.exit(1);
  }

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

    // Step 1: Find Stage Audio Works supplier
    console.log('🔍 Step 1: Finding Stage Audio Works supplier...');
    const supplierId = await findStageAudioWorksSupplier(client);

    if (!supplierId) {
      console.log('\n⚠️  Stage Audio Works supplier not found.');
      console.log('   Please ensure the supplier exists in the database.\n');

      // Show all suppliers with "stage" in the name
      const allSuppliers = await client.query(
        `SELECT supplier_id, name, code FROM core.supplier 
         WHERE LOWER(name) LIKE '%stage%' 
         ORDER BY name LIMIT 10`
      );
      console.log('Suppliers with "stage" in name:');
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
    const supplierDisplayName = supplierInfo.rows[0].name;
    console.log(
      `✅ Found supplier: ${supplierDisplayName} (${supplierInfo.rows[0].code}) - ID: ${supplierId}\n`
    );

    // Step 2: Read CSV file
    console.log(`📖 Step 2: Reading CSV file: ${csvFilePath}...`);
    const allProducts = parseCSV(csvFilePath);
    console.log(`✅ Parsed ${allProducts.length} products from CSV\n`);

    if (allProducts.length === 0) {
      console.log('⚠️  No products found in CSV file');
      process.exit(1);
    }

    // Step 3: Check which SKUs already exist under other suppliers
    console.log('🔍 Step 3: Checking for existing SKUs under other suppliers...');
    const skus = allProducts.map(p => p.productNo);
    const existingSKUs = await checkExistingSKUs(client, skus);
    console.log(`   Total SKUs in CSV: ${skus.length}`);
    console.log(`   SKUs already exist: ${existingSKUs.size}`);
    console.log(`   New SKUs to import: ${skus.length - existingSKUs.size}\n`);

    // Step 4: Filter products - only keep those that don't exist
    const productsToImport = allProducts.filter(p => !existingSKUs.has(p.productNo));
    
    if (productsToImport.length === 0) {
      console.log('⚠️  No new products to import - all SKUs already exist under other suppliers');
      process.exit(0);
    }

    console.log(`📦 Step 4: Importing ${productsToImport.length} new products (filtered from ${allProducts.length} total)...`);

    // Step 5: Get or create stock location
    console.log('📍 Step 5: Getting or creating stock location...');
    const locationId = await getOrCreateStockLocation(client, supplierId, supplierDisplayName);
    console.log(`✅ Using location ID: ${locationId}\n`);

    // Step 6: Import products
    console.log('📦 Step 6: Importing products and stock on hand...');
    const result = await importProducts(client, productsToImport, supplierId, locationId);

    console.log('\n✅ Import completed!');
    console.log(`   📥 Inserted: ${result.inserted} products`);
    console.log(`   🔄 Updated: ${result.updated} products`);
    console.log(`   ⏭️  Skipped: ${allProducts.length - productsToImport.length} products (already exist under other suppliers)`);
    console.log(`   ❌ Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.slice(0, 10).forEach(error => {
        console.log(`   - ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main();
}


