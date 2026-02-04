#!/usr/bin/env bun
/**
 * Complete BC Electronics Celto Pricing Update
 *
 * 1. Reads updated Excel file
 * 2. Calculates Cost Ex VAT from Cost Inc VAT (15% VAT reduction)
 * 3. Updates Cost Ex VAT in database
 * 4. Updates Brand information
 * 5. Creates 10% discount rule for Celto brand (not RubiCube)
 * 6. Ensures all columns display correctly
 *
 * Usage:
 *   bun scripts/database/update-bce-celto-pricing-complete.ts
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

const EXCEL_FILE_PATH = 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\BCE_Celto_Pricelist_Feb2026 - XX FIXED.xlsx';
const SUPPLIER_NAME = 'BC ELECTRONICS';
const VAT_RATE = 0.15; // 15% VAT
const CELTO_DISCOUNT_PERCENT = 10;

interface ProductRow {
  sku: string;
  brand: string | null;
  name: string | null;
  description: string | null;
  costIncVat: number | null;
  costExVat: number | null;
  baseDiscount: number | null;
  rowNumber: number;
}

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 OR LOWER(name) LIKE $3
     LIMIT 5`,
    [
      `%${supplierName.toLowerCase()}%`,
      `%bce brands%`,
      `%bc electronics%`,
    ]
  );

  if (result.rows.length === 0) {
    console.error(`❌ Supplier "${supplierName}" not found`);
    return null;
  }

  const supplier = result.rows[0];
  console.log(
    `✅ Found supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`
  );
  return supplier.supplier_id;
}

/**
 * Normalize price value (handles various formats)
 */
function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Remove currency symbols and spaces
  let normalized = str.replace(/[R\s,]/g, '');
  
  // Handle European format "23.234,00" or "23 234,00"
  if (normalized.includes(',') && normalized.includes('.')) {
    // Format: "23.234,00" - dot is thousands, comma is decimal
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    // Could be "23,00" or "23 234,00"
    if (normalized.match(/\d+\s+\d+,\d+/)) {
      // Format: "23 234,00" - space is thousands, comma is decimal
      normalized = normalized.replace(/\s+/g, '').replace(',', '.');
    } else {
      // Format: "23,00" - comma is decimal
      normalized = normalized.replace(',', '.');
    }
  }

  // Remove any remaining non-numeric characters except decimal point
  normalized = normalized.replace(/[^\d.-]/g, '');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
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
  
  // Read data
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  }) as unknown[][];
  
  // Helper to get formatted cell text
  const getFormattedCellValue = (rowIdx: number, colIdx: number): string => {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    const cell = worksheet[cellAddress];
    if (!cell) return '';
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
      (rowText.includes('sku') || rowText.includes('code')) &&
      (rowText.includes('cost') || rowText.includes('price'))
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

  const colSku = findCol(['sku', 'code', 'part number', 'item code']);
  const colBrand = findCol(['brand', 'manufacturer', 'make']);
  const colName = findCol(['product name', 'name', 'description', 'product']);
  const colDescription = findCol(['description', 'desc', 'product description']);
  const colCostIncVat = findCol(['cost inc vat', 'cost incvat', 'cost including', 'cost incl', 'inc vat', 'incvat', 'cost inc']);
  // Don't use Cost Ex VAT column - we'll calculate it from Cost Inc VAT
  const colBaseDiscount = findCol(['base discount', 'discount', 'discount %', 'discount percent', 'disc', '10%']);

  console.log('\n📊 Column mappings:');
  console.log(`   SKU: ${colSku >= 0 ? headers[colSku] : 'NOT FOUND'}`);
  console.log(`   Brand: ${colBrand >= 0 ? headers[colBrand] : 'NOT FOUND'}`);
  console.log(`   Name: ${colName >= 0 ? headers[colName] : 'NOT FOUND'}`);
  console.log(`   Description: ${colDescription >= 0 ? headers[colDescription] : 'NOT FOUND'}`);
  console.log(`   Cost Inc VAT: ${colCostIncVat >= 0 ? headers[colCostIncVat] : 'NOT FOUND'}`);
  console.log(`   Cost Ex VAT: (calculated from Cost Inc VAT)`);
  console.log(`   Base Discount: ${colBaseDiscount >= 0 ? headers[colBaseDiscount] : 'NOT FOUND'}`);

  if (colSku < 0) {
    console.error('❌ SKU column not found - cannot proceed');
    return products;
  }

  if (colCostIncVat < 0) {
    console.error('❌ Cost Inc VAT column not found - cannot proceed');
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
      continue;
    }

    const brand = colBrand >= 0 
      ? String(row[colBrand] || '').trim() || null
      : null;

    const name = colName >= 0
      ? String(row[colName] || '').trim() || null
      : null;

    const description = colDescription >= 0
      ? String(row[colDescription] || '').trim() || null
      : null;

    // Get Cost Inc VAT - this is the primary source
    const costIncVatValue = colCostIncVat >= 0
      ? (getFormattedCellValue(rowIdx, colCostIncVat) || String(row[colCostIncVat] || ''))
      : '';
    const costIncVat = normalizePrice(costIncVatValue);

    if (!costIncVat || costIncVat <= 0) {
      console.log(`⚠️  Skipping ${sku}: No valid Cost Inc VAT found`);
      continue;
    }

    // Calculate Cost Ex VAT from Cost Inc VAT (remove 15% VAT)
    // Formula: Cost Ex VAT = Cost Inc VAT / (1 + VAT_RATE)
    const costExVat = costIncVat / (1 + VAT_RATE);

    // Get Base Discount if available
    const baseDiscountValue = colBaseDiscount >= 0
      ? (getFormattedCellValue(rowIdx, colBaseDiscount) || String(row[colBaseDiscount] || ''))
      : '';
    const baseDiscount = normalizePrice(baseDiscountValue);

    const product: ProductRow = {
      sku,
      brand: brand ? brand.toUpperCase() : null,
      name: name || sku, // Use SKU as name if no name provided
      description: description || null,
      costIncVat,
      costExVat,
      baseDiscount: baseDiscount ? Number(baseDiscount.toFixed(2)) : null,
      rowNumber: rowIdx + 1,
    };
    
    products.push(product);
  }

  console.log(`\n✅ Parsed ${products.length} products from Excel`);
  return products;
}

/**
 * Update or create product pricing and brand in database
 */
async function updateOrCreateProduct(
  client: Client,
  supplierId: string,
  product: ProductRow
): Promise<{ updated: boolean; created: boolean; error?: string }> {
  try {
    // Find product by supplier SKU
    const findResult = await client.query(
      `SELECT supplier_product_id, attrs_json, supplier_sku, name_from_supplier
       FROM core.supplier_product
       WHERE supplier_id = $1 AND supplier_sku = $2
       LIMIT 1`,
      [supplierId, product.sku]
    );

    let productId: string;
    let wasCreated = false;

    if (findResult.rows.length === 0) {
      // CREATE new product
      const insertResult = await client.query<{ supplier_product_id: string }>(
        `INSERT INTO core.supplier_product (
           supplier_id,
           supplier_sku,
           name_from_supplier,
           uom,
           attrs_json,
           is_active,
           is_new,
           first_seen_at,
           last_seen_at,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, 'EA', $4, true, true, NOW(), NOW(), NOW(), NOW())
         RETURNING supplier_product_id`,
        [
          supplierId,
          product.sku,
          product.name || product.sku, // Use provided name or SKU as fallback
          JSON.stringify({
            cost_excluding: product.costExVat,
            cost_including: product.costIncVat,
            brand: product.brand,
            description: product.description,
            ...(product.baseDiscount !== null && { base_discount: product.baseDiscount }),
          }),
        ]
      );

      productId = insertResult.rows[0].supplier_product_id;
      wasCreated = true;
    } else {
      // UPDATE existing product
      productId = findResult.rows[0].supplier_product_id;
      const existingAttrs = findResult.rows[0].attrs_json || {};

      // Update attrs_json
      const updatedAttrs = {
        ...existingAttrs,
        cost_excluding: product.costExVat,
        cost_including: product.costIncVat,
        brand: product.brand,
        description: product.description || existingAttrs.description,
        // Store base discount if provided
        ...(product.baseDiscount !== null && { base_discount: product.baseDiscount }),
      };

      // Update supplier_product
      await client.query(
        `UPDATE core.supplier_product
         SET name_from_supplier = COALESCE($3, name_from_supplier),
             attrs_json = $1::jsonb,
             updated_at = NOW()
         WHERE supplier_product_id = $2`,
        [JSON.stringify(updatedAttrs), productId, product.name]
      );
    }

    // Update price_history (close old, create new)
    await client.query(
      `UPDATE core.price_history
       SET is_current = false, valid_to = NOW()
       WHERE supplier_product_id = $1 AND is_current = true`,
      [productId]
    );

    await client.query(
      `INSERT INTO core.price_history (
         supplier_product_id,
         price,
         currency,
         valid_from,
         is_current,
         change_reason
       )
       VALUES ($1, $2, 'ZAR', NOW(), true, $3)`,
      [
        productId,
        product.costExVat,
        wasCreated 
          ? 'Created from Excel - Cost Ex VAT calculated from Cost Inc VAT'
          : 'Updated from Excel - Cost Ex VAT calculated from Cost Inc VAT',
      ]
    );

    return { updated: !wasCreated, created: wasCreated };
  } catch (error) {
    return {
      updated: false,
      created: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find or create brand
 */
async function findOrCreateBrand(client: Client, brandName: string): Promise<string | null> {
  const normalizedName = brandName.trim().toUpperCase();

  // Try to find brand in public.brand
  const findResult = await client.query<{ id: string }>(
    `SELECT id FROM public.brand 
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
    [normalizedName]
  );

  if (findResult.rows.length > 0) {
    return findResult.rows[0].id;
  }

  // Try to create brand - handle both with and without org_id
  try {
    // First try without org_id
    const insertResult = await client.query<{ id: string }>(
      `INSERT INTO public.brand (name, is_active, created_at, updated_at)
       VALUES ($1, true, NOW(), NOW())
       RETURNING id`,
      [normalizedName]
    );

    if (insertResult.rows.length > 0) {
      return insertResult.rows[0].id;
    }
  } catch (error: any) {
    // If that fails, try with org_id
    if (error?.message?.includes('org_id') || error?.code === '23502') {
      const orgResult = await client.query<{ id: string }>(
        `SELECT id FROM public.organization ORDER BY created_at LIMIT 1`
      );

      if (orgResult.rows.length > 0) {
        const orgId = orgResult.rows[0].id;
        const insertResult = await client.query<{ id: string }>(
          `INSERT INTO public.brand (org_id, name, is_active, created_at, updated_at)
           VALUES ($1, $2, true, NOW(), NOW())
           RETURNING id`,
          [orgId, normalizedName]
        );

        if (insertResult.rows.length > 0) {
          return insertResult.rows[0].id;
        }
      }
    }
    throw error;
  }

  return null;
}

/**
 * Create or update discount rule for Celto brand
 */
async function createCeltoDiscountRule(
  client: Client,
  supplierId: string,
  celtoBrandId: string
): Promise<boolean> {
  // Check if rule exists first
  const existing = await client.query(
    `SELECT discount_rule_id 
     FROM core.supplier_discount_rules
     WHERE supplier_id = $1 
       AND scope_type = 'brand'
       AND brand_id = $2`,
    [supplierId, celtoBrandId]
  );

  if (existing.rows.length > 0) {
    // Update existing rule
    const updateResult = await client.query(
      `UPDATE core.supplier_discount_rules
       SET discount_percent = $1,
           rule_name = $2,
           priority = $3,
           is_active = $4,
           updated_at = NOW()
       WHERE discount_rule_id = $5
       RETURNING discount_rule_id`,
      [CELTO_DISCOUNT_PERCENT, 'Celto Brand 10% Discount', 10, true, existing.rows[0].discount_rule_id]
    );

    if (updateResult.rows.length > 0) {
      console.log(`✅ Updated Celto discount rule (ID: ${updateResult.rows[0].discount_rule_id})`);
      return true;
    }
  } else {
    // Create new rule
    const insertResult = await client.query(
      `INSERT INTO core.supplier_discount_rules (
         supplier_id, rule_name, discount_percent, scope_type,
         brand_id, priority, is_active, valid_from
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING discount_rule_id`,
      [
        supplierId,
        'Celto Brand 10% Discount',
        CELTO_DISCOUNT_PERCENT,
        'brand',
        celtoBrandId,
        10,
        true,
      ]
    );

    if (insertResult.rows.length > 0) {
      console.log(`✅ Created Celto discount rule (ID: ${insertResult.rows[0].discount_rule_id})`);
      return true;
    }
  }

  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Complete BC Electronics Celto Pricing Update\n');

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('❌ Database connection string not found');
    console.error('   Please set DATABASE_URL or NEON_SPP_DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find supplier
    const supplierId = await findSupplier(client, SUPPLIER_NAME);
    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found`);
    }

    // Read Excel file
    const products = readExcelFile(EXCEL_FILE_PATH);
    if (products.length === 0) {
      console.log('⚠️  No products found in Excel file');
      return;
    }

    console.log(`\n📦 Processing ${products.length} products...\n`);

    // Update each product
    let updated = 0;
    let errors = 0;
    const errorDetails: Array<{ sku: string; error: string }> = [];
    const brandsFound = new Set<string>();

    for (const product of products) {
      if (product.brand) {
        brandsFound.add(product.brand);
      }

      const result = await updateOrCreateProduct(client, supplierId, product);
      
      if (result.updated || result.created) {
        const action = result.created ? 'CREATED' : 'UPDATED';
        console.log(
          `✅ ${product.sku}: ${action} - Cost Ex VAT = R ${product.costExVat.toFixed(2)} (from R ${product.costIncVat.toFixed(2)} Inc VAT)${product.brand ? `, Brand = ${product.brand}` : ''}`
        );
        if (result.created) {
          updated++;
        } else {
          updated++;
        }
      } else {
        console.log(`❌ ${product.sku}: ${result.error || 'Update/Create failed'}`);
        errors++;
        errorDetails.push({ sku: product.sku, error: result.error || 'Update/Create failed' });
      }
    }

    // Find Celto brand and create discount rule
    const celtoBrandId = await findOrCreateBrand(client, 'CELTO');
    if (celtoBrandId) {
      console.log(`\n📋 Creating discount rule for Celto brand...`);
      await createCeltoDiscountRule(client, supplierId, celtoBrandId);
    } else {
      console.log(`\n⚠️  Could not find or create Celto brand for discount rule`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Brands found: ${Array.from(brandsFound).join(', ')}`);

    if (errorDetails.length > 0) {
      console.log(`\n⚠️  Error details:`);
      errorDetails.forEach(({ sku, error }) => {
        console.log(`   - ${sku}: ${error}`);
      });
    }

    console.log('\n✅ Pricing update completed');
    console.log('📋 All columns should now display correctly in supplier portfolio view');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
