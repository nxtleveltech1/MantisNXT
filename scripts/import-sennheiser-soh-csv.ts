#!/usr/bin/env bun
/**
 * Import Sennheiser SOH CSV
 *
 * Processes CSV file with SOH (Stock on Hand) data and imports
 * into core.supplier_product table with price history.
 *
 * Usage:
 *   bun scripts/import-sennheiser-soh-csv.ts [supplier-id]
 *
 * Or set SUPPLIER_ID environment variable:
 *   SUPPLIER_ID=xxx bun scripts/import-sennheiser-soh-csv.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - CSV file at the specified path
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { Client } from 'pg';

const CSV_FILE_PATH = 'C:\\Users\\garet\\Downloads\\SOH info_20251228_0941.csv';
const SUPPLIER_NAME = 'Sennheiser Electronics (SA) (Pty) Ltd';

interface ProductRow {
  productNo: string; // Supplier SKU (e.g., "SEN-509486")
  manufacturerProductNo: string; // Manufacturer part number (e.g., "509486")
  productDescription: string;
  totalSOH: number; // Stock on Hand
  priceBeforeDiscountExVat: number; // Price in ZAR
  rowNumber: number;
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

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  // Find column indices
  const productNoIdx = headers.findIndex(h => 
    h.toLowerCase().includes('product no') && !h.toLowerCase().includes('manufacturer')
  );
  const manufacturerProductNoIdx = headers.findIndex(h => 
    h.toLowerCase().includes('manufacturer product no')
  );
  const descriptionIdx = headers.findIndex(h => 
    h.toLowerCase().includes('product description')
  );
  const sohIdx = headers.findIndex(h => 
    h.toLowerCase().includes('total soh') || h.toLowerCase().includes('soh')
  );
  const priceIdx = headers.findIndex(h => 
    h.toLowerCase().includes('price before discount') || 
    h.toLowerCase().includes('price')
  );

  if (productNoIdx === -1 || descriptionIdx === -1 || priceIdx === -1) {
    throw new Error('Required columns not found in CSV header');
  }

  const products: ProductRow[] = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    
    const productNo = (values[productNoIdx] || '').trim().replace(/^"|"$/g, '');
    const manufacturerProductNo = (values[manufacturerProductNoIdx] || '').trim().replace(/^"|"$/g, '');
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
      manufacturerProductNo: manufacturerProductNo || productNo,
      productDescription: description,
      totalSOH,
      priceBeforeDiscountExVat,
      rowNumber: i + 1,
    });
  }

  return products;
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
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
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2
     LIMIT 5`,
    [`%${supplierName.toLowerCase()}%`, `%sennheiser%`]
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

  // Return first match for now
  return result.rows[0].supplier_id;
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

  await client.query('BEGIN');

  try {
    for (const product of products) {
      try {
        // Check if product already exists
        const existingResult = await client.query(
          `SELECT supplier_product_id, name_from_supplier 
           FROM core.supplier_product 
           WHERE supplier_id = $1 AND supplier_sku = $2`,
          [supplierId, product.productNo]
        );

        const attrsJson = {
          manufacturer_part_number: product.manufacturerProductNo,
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
              null, // No barcode in CSV
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
        if (product.totalSOH > 0 || product.priceBeforeDiscountExVat > 0) {
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
        }
      } catch (error) {
        const errorMsg = `Row ${product.rowNumber} (${product.productNo}): ${
          error instanceof Error ? error.message : String(error)
        }`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  return { inserted, updated, errors };
}

/**
 * Main execution
 */
async function main() {
  const supplierIdArg = process.argv[2] || process.env.SUPPLIER_ID;
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

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

    // Step 1: Find supplier ID
    let supplierId: string | null = null;
    let supplierName: string = SUPPLIER_NAME;
    
    if (supplierIdArg) {
      supplierId = supplierIdArg;
      console.log(`✅ Using provided supplier ID: ${supplierId}\n`);
      
      // Get supplier name for location creation
      const supplierInfo = await client.query(
        'SELECT name, code FROM core.supplier WHERE supplier_id = $1',
        [supplierId]
      );
      if (supplierInfo.rows.length > 0) {
        supplierName = supplierInfo.rows[0].name;
        console.log(`   Supplier: ${supplierName} (${supplierInfo.rows[0].code})\n`);
      }
    } else {
      console.log(`🔍 Step 1: Finding supplier "${SUPPLIER_NAME}"...`);
      supplierId = await findSupplier(client, SUPPLIER_NAME);

      if (!supplierId) {
        console.log('\n⚠️  Supplier not found. Please provide supplier ID:');
        console.log(`   bun scripts/import-sennheiser-soh-csv.ts <supplier-id>\n`);

        // Show all suppliers
        const allSuppliers = await client.query(
          'SELECT supplier_id, name, code FROM core.supplier ORDER BY name LIMIT 20'
        );
        console.log('Available suppliers:');
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
      supplierName = supplierInfo.rows[0].name;
      console.log(
        `✅ Found supplier: ${supplierName} (${supplierInfo.rows[0].code}) - ID: ${supplierId}\n`
      );
    }

    // Step 2: Read CSV file
    console.log('📖 Step 2: Reading CSV file...');
    const products = parseCSV(CSV_FILE_PATH);
    console.log(`✅ Parsed ${products.length} products from CSV\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found in CSV file');
      process.exit(1);
    }

    // Step 3: Get or create stock location
    console.log('📍 Step 3: Getting or creating stock location...');
    const locationId = await getOrCreateStockLocation(client, supplierId, supplierName);
    console.log(`✅ Using location ID: ${locationId}\n`);

    // Step 4: Import products
    console.log('📦 Step 4: Importing products and stock on hand...');
    const result = await importProducts(client, products, supplierId, locationId);

    console.log('\n✅ Import completed!');
    console.log(`   📥 Inserted: ${result.inserted} products`);
    console.log(`   🔄 Updated: ${result.updated} products`);
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

