#!/usr/bin/env bun
/**
 * Stage One Pricing and Discount Update
 *
 * Reads ALLUSTAGE-FBT.xlsx (or provided path), matches rows to Stage One supplier
 * products by SKU, and updates:
 * - Sup Stock on hand (attrs_json.stock_quantity) from QTY
 * - Cost ex VAT (attrs_json.cost_excluding + price_history) from Price (Excl. Vat)
 * - % discount (core.supplier_discount_rules, scope_type='sku') from % Discount
 *
 * Cost after discount is computed by the catalog API from cost_excluding and discount.
 *
 * Usage:
 *   bun scripts/imports/update-stage-one-pricing-discount.ts [path]
 *   bun scripts/imports/update-stage-one-pricing-discount.ts --dry-run [path]
 *
 * Default path: e:\00Project\NXT_OCR\output\ALLUSTAGE-FBT.xlsx
 */

import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

const DEFAULT_EXCEL_PATH = 'e:\\00Project\\NXT_OCR\\output\\ALLUSTAGE-FBT.xlsx';
const SUPPLIER_NAME = 'Stage One';
const SKU_DISCOUNT_PRIORITY = 50;

function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_SPP_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    null
  );
}

interface ProductRow {
  sku: string;
  brand: string | null;
  name: string | null;
  qty: number;
  costExVat: number | null;
  discountPercent: number;
  rowNumber: number;
}

/**
 * Parse price (handles "R1,377.00" format)
 */
function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;

  const str = String(value).trim().replace(/[R\s,]/g, '');
  if (!str) return null;

  let normalized = str;
  if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = normalized.replace(',', '.');
  }
  normalized = normalized.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse discount ("0%", "10%" -> 0, 10)
 */
function parseDiscount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const str = String(value).trim().replace(/%/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
}

/**
 * Parse Excel file
 */
function readExcelFile(filePath: string): ProductRow[] {
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

  const getCell = (rowIdx: number, colIdx: number): string => {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    const cell = worksheet[cellAddress];
    return cell?.w ?? String(jsonData[rowIdx]?.[colIdx] ?? '').trim();
  };

  if (jsonData.length < 2) return [];

  const headers = (jsonData[0] || []).map(h => String(h || '').trim());
  const findCol = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase();
      if (patterns.some(p => h.includes(p.toLowerCase()))) return i;
    }
    return -1;
  };

  const colSku = findCol(['sku', 'code']);
  const colBrand = findCol(['brand']);
  const colName = findCol(['product title', 'product name', 'name', 'title']);
  const colQty = findCol(['qty', 'quantity', 'stock']);
  const colPrice = findCol(['price (excl', 'price excl', 'cost excl', 'excl. vat', 'ex vat']);
  const colDiscount = findCol(['% discount', 'discount', 'discount %']);

  if (colSku < 0 || colPrice < 0) {
    throw new Error('Required columns (SKU, Price Excl VAT) not found');
  }

  const products: ProductRow[] = [];
  for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
    const row = jsonData[rowIdx] || [];
    if (row.every(cell => !cell || String(cell).trim() === '')) continue;

    const sku = String(row[colSku] ?? '').trim();
    if (!sku) continue;

    const costExVat = normalizePrice(
      colPrice >= 0 ? getCell(rowIdx, colPrice) || row[colPrice] : ''
    );
    if (costExVat === null || costExVat < 0) continue;

    const qtyRaw = colQty >= 0 ? row[colQty] : 0;
    const qty = typeof qtyRaw === 'number' ? Math.max(0, qtyRaw) : parseInt(String(qtyRaw), 10) || 0;

    const discountPercent = parseDiscount(
      colDiscount >= 0 ? getCell(rowIdx, colDiscount) || row[colDiscount] : '0%'
    );

    products.push({
      sku,
      brand: colBrand >= 0 ? String(row[colBrand] ?? '').trim() || null : null,
      name: colName >= 0 ? String(row[colName] ?? '').trim() || null : null,
      qty,
      costExVat,
      discountPercent,
      rowNumber: rowIdx + 1,
    });
  }

  return products;
}

async function findSupplier(client: Client, name: string): Promise<string | null> {
  const r = await client.query<{ supplier_id: string }>(
    `SELECT supplier_id FROM core.supplier
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
    [name]
  );
  return r.rows[0]?.supplier_id ?? null;
}

async function updateProduct(
  client: Client,
  supplierId: string,
  product: ProductRow,
  dryRun: boolean
): Promise<{ matched: boolean; updated: boolean; error?: string }> {
  const findResult = await client.query<{
    supplier_product_id: string;
    attrs_json: Record<string, unknown>;
  }>(
    `SELECT supplier_product_id, attrs_json
     FROM core.supplier_product
     WHERE supplier_id = $1 AND supplier_sku = $2 AND is_active = true
     LIMIT 1`,
    [supplierId, product.sku]
  );

  if (findResult.rows.length === 0) {
    return { matched: false, updated: false };
  }

  const productId = findResult.rows[0].supplier_product_id;
  const existingAttrs = (findResult.rows[0].attrs_json || {}) as Record<string, unknown>;

  const updatedAttrs = {
    ...existingAttrs,
    stock_quantity: product.qty,
    cost_excluding: product.costExVat,
  };

  if (!dryRun) {
    await client.query(
      `UPDATE core.supplier_product
       SET attrs_json = $1::jsonb, updated_at = NOW()
       WHERE supplier_product_id = $2`,
      [JSON.stringify(updatedAttrs), productId]
    );

    await client.query(
      `UPDATE core.price_history SET is_current = false, valid_to = NOW()
       WHERE supplier_product_id = $1 AND is_current = true`,
      [productId]
    );

    await client.query(
      `INSERT INTO core.price_history (
         supplier_product_id, price, currency, valid_from, is_current, change_reason
       ) VALUES ($1, $2, 'ZAR', NOW(), true, $3)`,
      [productId, product.costExVat, 'Updated from Stage One Excel - ALLUSTAGE-FBT']
    );
  }

  return { matched: true, updated: true };
}

async function upsertDiscountRule(
  client: Client,
  supplierId: string,
  sku: string,
  discountPercent: number,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;

  const existing = await client.query<{ discount_rule_id: string }>(
    `SELECT discount_rule_id FROM core.supplier_discount_rules
     WHERE supplier_id = $1 AND scope_type = 'sku' AND supplier_sku = $2
     LIMIT 1`,
    [supplierId, sku]
  );

  const ruleName = `Stage One SKU discount - ${sku}`;

  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE core.supplier_discount_rules
       SET discount_percent = $1, rule_name = $2, priority = $3, is_active = true, updated_at = NOW()
       WHERE discount_rule_id = $4`,
      [discountPercent, ruleName, SKU_DISCOUNT_PRIORITY, existing.rows[0].discount_rule_id]
    );
  } else {
    await client.query(
      `INSERT INTO core.supplier_discount_rules (
         supplier_id, rule_name, discount_percent, scope_type, supplier_sku, priority, is_active
       ) VALUES ($1, $2, $3, 'sku', $4, $5, true)`,
      [supplierId, ruleName, discountPercent, sku, SKU_DISCOUNT_PRIORITY]
    );
  }
}

function parseArgs(argv: string[]): { filePath: string; dryRun: boolean } {
  let filePath = DEFAULT_EXCEL_PATH;
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg && !arg.startsWith('--')) {
      filePath = resolve(arg);
    }
  }

  return { filePath, dryRun };
}

async function main() {
  const { filePath, dryRun } = parseArgs(process.argv);

  console.log('🚀 Stage One Pricing and Discount Update\n');
  if (dryRun) console.log('⚠️  DRY RUN - no database changes\n');

  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const connectionString = getConnectionString();
  if (!connectionString && !dryRun) {
    console.error('❌ Set DATABASE_URL or NEON_SPP_DATABASE_URL');
    process.exit(1);
  }

  const products = readExcelFile(filePath);
  console.log(`📖 Parsed ${products.length} rows from ${filePath}\n`);

  if (products.length === 0) {
    console.log('⚠️  No valid products found');
    return;
  }

  if (dryRun) {
    const sample = products.slice(0, 5);
    console.log('Sample rows:');
    sample.forEach(p => {
      console.log(
        `  ${p.sku}: qty=${p.qty} costExVat=${p.costExVat} discount=${p.discountPercent}%`
      );
    });
    console.log('\n✅ Dry run complete');
    return;
  }

  const client = new Client({ connectionString: connectionString as string });

  try {
    await client.connect();

    const supplierId = await findSupplier(client, SUPPLIER_NAME);
    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found`);
    }
    console.log(`✅ Supplier: ${SUPPLIER_NAME}\n`);

    let matched = 0;
    let updated = 0;
    const unmatched: string[] = [];

    for (const product of products) {
      const result = await updateProduct(client, supplierId, product, false);
      if (!result.matched) {
        unmatched.push(product.sku);
        continue;
      }
      matched++;
      if (result.updated) {
        await upsertDiscountRule(
          client,
          supplierId,
          product.sku,
          product.discountPercent,
          false
        );
        updated++;
        console.log(
          `✅ ${product.sku}: qty=${product.qty} cost=R${product.costExVat?.toFixed(2)} discount=${product.discountPercent}%`
        );
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Matched & updated: ${updated}`);
    console.log(`   Unmatched SKUs: ${unmatched.length}`);
    if (unmatched.length > 0) {
      console.log('   Unmatched:', unmatched.slice(0, 20).join(', '));
      if (unmatched.length > 20) console.log(`   ... and ${unmatched.length - 20} more`);
    }
    console.log('\n✅ Update complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
