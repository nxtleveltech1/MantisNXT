#!/usr/bin/env bun
/**
 * Import ALL Planet World SA Products from the merged CSV file
 * 
 * Uses the ALL_PRICELISTS_MERGED.csv which has 2436 products already cleaned
 */

import { pricelistService } from '../../src/lib/services/PricelistService';
import { query } from '../../src/lib/database';
import type { PricelistRow } from '../../src/types/nxt-spp';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const MERGED_CSV = 'D:\\00Project\\NXT_OCR\\output\\merge files\\ALL_PRICELISTS_MERGED.csv';
const SUPPLIER_NAMES = ['PLANET WORLD SA', 'PLANETWORLD SA', 'Planet World SA'];

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
  [key: string]: unknown;
}

async function findSupplier(names: string[]): Promise<{ supplierId: string; name: string; orgId: string } | null> {
  for (const name of names) {
    const result = await query<{ supplier_id: string; name: string; org_id: string }>(
      `SELECT supplier_id, name, org_id FROM core.supplier WHERE name ILIKE $1 OR code ILIKE $1 LIMIT 1`,
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
}

async function findOrCreateBrand(brandName: string, orgId: string): Promise<string> {
  const normalizedName = brandName.trim();
  
  const existing = await query<{ id: string }>(
    `SELECT id FROM public.brand WHERE org_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
    [orgId, normalizedName]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await query<{ id: string }>(
    `INSERT INTO public.brand (org_id, name, is_active, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW()) RETURNING id`,
    [orgId, normalizedName]
  );

  console.log(`   ✅ Created brand: ${normalizedName}`);
  return result.rows[0].id;
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  const str = String(value).replace(/[R$€£,\s]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

function parseDate(value: unknown): Date | null {
  if (!value || value === '') return null;
  const str = String(value).trim();
  
  // Try DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

function transformRow(row: CSVRow, rowNum: number): PricelistRow | null {
  const sku = String(row.ItemCode || '').trim();
  if (!sku) return null;

  const name = String(row.ItemName || '').trim() || sku;
  const brand = String(row.Brand || '').trim();
  
  const costExVAT = parseNumber(row['Cost Price ExVAT']);
  const promoPrice = parseNumber(row['Promo Price']);
  const rsp = parseNumber(row.RSP);

  // Use cost_ex_vat as primary, fallback to promo, then RSP
  let price = costExVAT;
  if (price === undefined && promoPrice !== undefined) price = promoPrice;
  if (price === undefined && rsp !== undefined) price = rsp;

  if (price === undefined || price <= 0) return null;

  const stockStatus = String(row.StockStatus || '').trim() || undefined;
  const eta = parseDate(row.ETA);
  const category = String(row.Category || '').trim() || undefined;

  return {
    upload_id: '', // Will be set during insert
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
    attrs_json: {
      cost_excluding: costExVAT,
      promo_price: promoPrice,
      rsp: rsp,
    },
  };
}

async function main() {
  console.log('🚀 Starting Planet World SA import from merged CSV...\n');

  // Find supplier
  console.log('🔍 Looking for supplier...');
  const supplier = await findSupplier(SUPPLIER_NAMES);
  if (!supplier) {
    throw new Error('Supplier not found. Please create PLANET WORLD SA first.');
  }
  console.log(`✅ Found: ${supplier.name} (${supplier.supplierId})\n`);

  // Read merged CSV
  console.log(`📄 Reading: ${MERGED_CSV}`);
  const csvContent = fs.readFileSync(MERGED_CSV, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as CSVRow[];

  console.log(`📊 Found ${records.length} rows in CSV\n`);

  // Collect unique brands
  const brands = new Set<string>();
  for (const row of records) {
    if (row.Brand) brands.add(row.Brand.trim());
  }
  console.log(`🏷️  Found ${brands.size} unique brands`);

  // Create/verify brands
  for (const brandName of brands) {
    await findOrCreateBrand(brandName, supplier.orgId);
  }
  console.log('');

  // Transform all rows
  console.log('🔄 Transforming rows...');
  const pricelistRows: PricelistRow[] = [];
  let skipped = 0;

  for (let i = 0; i < records.length; i++) {
    const row = transformRow(records[i], i + 1);
    if (row) {
      pricelistRows.push(row);
    } else {
      skipped++;
    }
  }

  console.log(`✅ Transformed ${pricelistRows.length} valid rows (${skipped} skipped)\n`);

  if (pricelistRows.length === 0) {
    throw new Error('No valid rows to import');
  }

  // Create upload record
  console.log('📝 Creating upload record...');
  const upload = await pricelistService.createUpload({
    supplier_id: supplier.supplierId,
    filename: `planetworld-merged-${new Date().toISOString().split('T')[0]}.csv`,
    currency: 'ZAR',
    valid_from: new Date(),
  });
  console.log(`✅ Upload ID: ${upload.upload_id}\n`);

  // Insert all rows at once
  console.log(`📥 Inserting ${pricelistRows.length} rows...`);
  const inserted = await pricelistService.insertRows(upload.upload_id, pricelistRows);
  console.log(`✅ Inserted ${inserted} rows\n`);

  // Validate
  console.log('✔️  Validating...');
  const validation = await pricelistService.validateUpload(upload.upload_id);
  console.log(`   Status: ${validation.status}`);
  console.log(`   Valid: ${validation.valid_rows}/${validation.total_rows}`);
  console.log(`   New products: ${validation.summary.new_products}`);
  console.log(`   Updated prices: ${validation.summary.updated_prices}\n`);

  // Merge if valid
  if (validation.status === 'valid' || validation.status === 'validated' || validation.status === 'warning') {
    console.log('🔄 Merging into core schema...');
    const merge = await pricelistService.mergePricelist(upload.upload_id, {
      skipInvalidRows: validation.status === 'warning',
    });
    console.log(`✅ Merge complete:`);
    console.log(`   Created: ${merge.products_created}`);
    console.log(`   Updated: ${merge.products_updated}`);
    console.log(`   Prices updated: ${merge.prices_updated}`);
  } else {
    console.log('⚠️  Skipping merge due to validation errors');
  }

  console.log('\n✅ Import complete!');
  console.log(`   Total products: ${pricelistRows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

