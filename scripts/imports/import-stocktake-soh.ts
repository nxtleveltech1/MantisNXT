#!/usr/bin/env bun
/**
 * NXT Stock Take SOH Import
 *
 * Processes the physical stock take XLSX, matches SKUs against all suppliers
 * in core.supplier_product, creates internal stock locations, updates SOH,
 * and handles unmatched SKUs under an "UNMATCHED" supplier with cost=0.
 *
 * Usage:
 *   bun scripts/imports/import-stocktake-soh.ts <xlsx-path> [--dry-run]
 *
 * Example:
 *   bun scripts/imports/import-stocktake-soh.ts "C:\Users\garet\Downloads\STOCK TAKE.xlsx"
 *   bun scripts/imports/import-stocktake-soh.ts "C:\Users\garet\Downloads\STOCK TAKE.xlsx" --dry-run
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { Client } from 'pg';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StockTakeRow {
  sku: string;
  productName: string;
  location: string;
  uom: string;
  qoh: number;
}

interface DeduplicatedRow {
  sku: string;
  productName: string;
  location: string;
  uom: string;
  qoh: number;
  sourceRows: number;
}

interface MatchedProduct {
  row: DeduplicatedRow;
  supplierProductId: string;
  supplierId: string;
  unitCost: number | null;
}

interface UnmatchedProduct {
  row: DeduplicatedRow;
}

interface ImportReport {
  timestamp: string;
  sourceFile: string;
  dryRun: boolean;
  parsing: {
    totalRawRows: number;
    totalAfterDedup: number;
    duplicatesResolved: number;
    locationBreakdown: Record<string, number>;
  };
  matching: {
    matched: number;
    unmatched: number;
    matchRate: string;
  };
  locations: Record<string, string>;
  unmatchedSupplier: { id: string; name: string } | null;
  import: {
    sohCreated: number;
    sohUpdated: number;
    unmatchedProductsCreated: number;
    stockMovementsCreated: number;
    errors: string[];
  };
  inventoryValue: {
    matchedValue: number;
    totalQty: number;
  };
  unmatchedSkus: Array<{ sku: string; name: string; location: string; qoh: number }>;
}

// ---------------------------------------------------------------------------
// Location mapping
// ---------------------------------------------------------------------------

const LOCATION_MAP: Record<string, string> = {
  'NXT/NXT STOCK': 'NXT Main Stock',
  'NXT/NXT STOCK/Rental': 'NXT Rental',
  'NXT/NXT STOCK/Repairs': 'NXT Repairs',
  'NXT/NXT STOCK/Secondhand': 'NXT Secondhand',
  'NXT/NXT STOCK/Studio Rentals': 'NXT Studio Rentals',
};

const REFERENCE_DOC = 'STOCK_TAKE_2026-02-26';

// ---------------------------------------------------------------------------
// Step 1: Parse XLSX
// ---------------------------------------------------------------------------

function parseXlsx(filePath: string): StockTakeRow[] {
  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found in workbook');

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });

  if (rawRows.length === 0) throw new Error('No data rows in sheet');

  const headers = Object.keys(rawRows[0]);
  console.log(`   Sheet: ${sheetName}`);
  console.log(`   Headers: ${headers.join(', ')}`);
  console.log(`   Raw rows: ${rawRows.length}`);

  const findHeader = (patterns: string[]): string | undefined =>
    headers.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())));

  const skuHeader = findHeader(['SKU']);
  const nameHeader = findHeader(['Product Name', 'Description', 'Descirption']);
  const locationHeader = findHeader(['Location']);
  const uomHeader = findHeader(['UOM']);
  const qohHeader = findHeader(['QOH', 'Qty', 'Quantity']);

  if (!skuHeader || !nameHeader || !qohHeader) {
    throw new Error(
      `Required columns missing. Found: ${headers.join(', ')}. ` +
        `Need: SKU (${skuHeader ?? 'MISSING'}), Name (${nameHeader ?? 'MISSING'}), QOH (${qohHeader ?? 'MISSING'})`
    );
  }

  const rows: StockTakeRow[] = [];

  for (const raw of rawRows) {
    const sku = String(raw[skuHeader] ?? '').trim();
    const productName = String(raw[nameHeader] ?? '').trim();
    const location = locationHeader ? String(raw[locationHeader] ?? '').trim() : 'NXT/NXT STOCK';
    const uom = uomHeader ? String(raw[uomHeader] ?? 'Unit').trim() : 'Unit';
    const qohRaw = raw[qohHeader];
    const qoh = typeof qohRaw === 'number' ? qohRaw : parseInt(String(qohRaw ?? '0'), 10) || 0;

    if (!sku || !productName || qoh <= 0) continue;

    rows.push({ sku, productName, location, uom, qoh });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Step 1b: Deduplicate by SKU + Location (sum QOH)
// ---------------------------------------------------------------------------

function deduplicateRows(rows: StockTakeRow[]): DeduplicatedRow[] {
  const map = new Map<string, DeduplicatedRow>();

  for (const row of rows) {
    const key = `${row.sku}|||${row.location}`;
    const existing = map.get(key);
    if (existing) {
      existing.qoh += row.qoh;
      existing.sourceRows++;
    } else {
      map.set(key, { ...row, sourceRows: 1 });
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Step 2: Create/find internal stock locations
// ---------------------------------------------------------------------------

async function ensureLocations(
  client: Client,
  dryRun: boolean
): Promise<Record<string, string>> {
  const locationIds: Record<string, string> = {};

  for (const [spreadsheetName, dbName] of Object.entries(LOCATION_MAP)) {
    const existing = await client.query(
      `SELECT location_id FROM core.stock_location WHERE name = $1 AND is_active = true LIMIT 1`,
      [dbName]
    );

    if (existing.rows.length > 0) {
      locationIds[spreadsheetName] = existing.rows[0].location_id;
      console.log(`   Found: ${dbName} -> ${locationIds[spreadsheetName]}`);
    } else if (dryRun) {
      const fakeId = randomUUID();
      locationIds[spreadsheetName] = fakeId;
      console.log(`   [DRY-RUN] Would create: ${dbName} -> ${fakeId}`);
    } else {
      const locId = randomUUID();
      await client.query(
        `INSERT INTO core.stock_location (location_id, name, type, is_active, created_at, updated_at)
         VALUES ($1, $2, 'internal', true, NOW(), NOW())`,
        [locId, dbName]
      );
      locationIds[spreadsheetName] = locId;
      console.log(`   Created: ${dbName} -> ${locId}`);
    }
  }

  return locationIds;
}

// ---------------------------------------------------------------------------
// Step 3: Match SKUs across all suppliers
// ---------------------------------------------------------------------------

async function matchSkus(
  client: Client,
  skus: string[]
): Promise<Map<string, { supplier_product_id: string; supplier_id: string }>> {
  const result = await client.query(
    `SELECT supplier_product_id, supplier_id, supplier_sku, last_seen_at
     FROM core.supplier_product
     WHERE supplier_sku = ANY($1::text[])
       AND is_active = true
     ORDER BY last_seen_at DESC NULLS LAST`,
    [skus]
  );

  const map = new Map<string, { supplier_product_id: string; supplier_id: string }>();

  for (const row of result.rows) {
    if (!map.has(row.supplier_sku)) {
      map.set(row.supplier_sku, {
        supplier_product_id: row.supplier_product_id,
        supplier_id: row.supplier_id,
      });
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Step 3b: Fetch current cost for matched products
// ---------------------------------------------------------------------------

async function fetchCurrentCosts(
  client: Client,
  supplierProductIds: string[]
): Promise<Map<string, number>> {
  if (supplierProductIds.length === 0) return new Map();

  const result = await client.query(
    `SELECT supplier_product_id, price
     FROM core.price_history
     WHERE supplier_product_id = ANY($1::uuid[])
       AND is_current = true`,
    [supplierProductIds]
  );

  const map = new Map<string, number>();
  for (const row of result.rows) {
    map.set(row.supplier_product_id, Number(row.price));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Step 4: Handle unmatched — create UNMATCHED supplier + supplier_products
// ---------------------------------------------------------------------------

async function getOrCreateUnmatchedSupplier(
  client: Client,
  dryRun: boolean
): Promise<{ id: string; name: string }> {
  const existing = await client.query(
    `SELECT supplier_id, name FROM core.supplier WHERE code = 'UNMATCHED' LIMIT 1`
  );

  if (existing.rows.length > 0) {
    return { id: existing.rows[0].supplier_id, name: existing.rows[0].name };
  }

  if (dryRun) {
    const fakeId = randomUUID();
    return { id: fakeId, name: 'UNMATCHED' };
  }

  const supplierId = randomUUID();
  await client.query(
    `INSERT INTO core.supplier (supplier_id, name, code, active, default_currency, created_at, updated_at)
     VALUES ($1, 'UNMATCHED', 'UNMATCHED', true, 'ZAR', NOW(), NOW())`,
    [supplierId]
  );
  return { id: supplierId, name: 'UNMATCHED' };
}

async function createUnmatchedProducts(
  client: Client,
  unmatchedRows: UnmatchedProduct[],
  unmatchedSupplierId: string,
  dryRun: boolean
): Promise<Map<string, string>> {
  const skuToSpId = new Map<string, string>();
  if (unmatchedRows.length === 0) return skuToSpId;

  if (dryRun) {
    for (const u of unmatchedRows) {
      skuToSpId.set(u.row.sku, randomUUID());
    }
    return skuToSpId;
  }

  const batchSize = 100;
  for (let i = 0; i < unmatchedRows.length; i += batchSize) {
    const batch = unmatchedRows.slice(i, i + batchSize);

    await client.query('BEGIN');
    try {
      for (const u of batch) {
        const existCheck = await client.query(
          `SELECT supplier_product_id FROM core.supplier_product
           WHERE supplier_id = $1 AND supplier_sku = $2 LIMIT 1`,
          [unmatchedSupplierId, u.row.sku]
        );

        let spId: string;
        if (existCheck.rows.length > 0) {
          spId = existCheck.rows[0].supplier_product_id;
        } else {
          spId = randomUUID();
          const uomNormalized = u.row.uom.toLowerCase() === 'm' ? 'm' : 'each';
          await client.query(
            `INSERT INTO core.supplier_product (
               supplier_product_id, supplier_id, supplier_sku, name_from_supplier,
               uom, is_active, is_new, first_seen_at, last_seen_at,
               attrs_json, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW(), $6::jsonb, NOW(), NOW())`,
            [
              spId,
              unmatchedSupplierId,
              u.row.sku,
              u.row.productName,
              uomNormalized,
              JSON.stringify({ source: 'stock_take', cost_excluding: 0 }),
            ]
          );
        }
        skuToSpId.set(u.row.sku, spId);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  return skuToSpId;
}

// ---------------------------------------------------------------------------
// Step 5+6: Upsert SOH + create stock movements (batch SQL)
// ---------------------------------------------------------------------------

async function importSohAndMovements(
  client: Client,
  items: Array<{
    supplierProductId: string;
    locationId: string;
    qty: number;
    unitCost: number | null;
    sku: string;
  }>,
  dryRun: boolean
): Promise<{ sohUpserted: number; movementsCreated: number; errors: string[] }> {
  let sohUpserted = 0;
  let movementsCreated = 0;
  const errors: string[] = [];

  if (dryRun) {
    return { sohUpserted: items.length, movementsCreated: items.length, errors };
  }

  const batchSize = 50;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    try {
      await client.query('BEGIN');

      // Batch upsert SOH
      const sohValues: unknown[] = [];
      const sohPlaceholders: string[] = [];
      let p = 1;
      for (const item of batch) {
        sohPlaceholders.push(
          `($${p++}::uuid, $${p++}::uuid, $${p++}::uuid, $${p++}::integer, $${p++}::numeric, NOW(), 'import'::varchar, NOW())`
        );
        sohValues.push(randomUUID(), item.locationId, item.supplierProductId, item.qty, item.unitCost);
      }

      const sohResult = await client.query(
        `INSERT INTO core.stock_on_hand
           (soh_id, location_id, supplier_product_id, qty, unit_cost, as_of_ts, source, created_at)
         VALUES ${sohPlaceholders.join(', ')}
         ON CONFLICT (location_id, supplier_product_id) DO UPDATE SET
           qty = EXCLUDED.qty,
           unit_cost = COALESCE(EXCLUDED.unit_cost, core.stock_on_hand.unit_cost),
           as_of_ts = NOW()`,
        sohValues
      );
      sohUpserted += sohResult.rowCount ?? 0;

      // Batch insert stock movements
      const mvValues: unknown[] = [];
      const mvPlaceholders: string[] = [];
      p = 1;
      for (const item of batch) {
        mvPlaceholders.push(
          `($${p++}::uuid, 'ADJUSTMENT', $${p++}::uuid, $${p++}::uuid, $${p++}::integer, $${p++}::varchar, 'Physical stock take count', NOW(), NOW())`
        );
        mvValues.push(randomUUID(), item.supplierProductId, item.locationId, item.qty, REFERENCE_DOC);
      }

      const mvResult = await client.query(
        `INSERT INTO core.stock_movement
           (movement_id, movement_type, supplier_product_id, location_id,
            qty, reference_doc, notes, movement_ts, created_at)
         VALUES ${mvPlaceholders.join(', ')}`,
        mvValues
      );
      movementsCreated += mvResult.rowCount ?? 0;

      await client.query('COMMIT');

      if (batchNum % 5 === 0 || batchNum === totalBatches) {
        console.log(`   Batch ${batchNum}/${totalBatches} done (${sohUpserted} SOH, ${movementsCreated} movements)`);
      }
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
      const msg = `Batch ${batchNum} failed: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`   ERROR: ${msg}`);
    }
  }

  return { sohUpserted, movementsCreated, errors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const xlsxPath = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  if (!xlsxPath) {
    console.error('Usage: bun scripts/imports/import-stocktake-soh.ts <xlsx-path> [--dry-run]');
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('DATABASE_URL or NEON_SPP_DATABASE_URL environment variable not set');
    process.exit(1);
  }

  if (dryRun) console.log('=== DRY RUN MODE — no writes will be performed ===\n');

    const client = new Client({
      connectionString: databaseUrl,
      keepAlive: true,
      connectionTimeoutMillis: 30000,
      query_timeout: 60000,
    } as Record<string, unknown>);
  const report: Partial<ImportReport> = {
    timestamp: new Date().toISOString(),
    sourceFile: xlsxPath,
    dryRun,
  };

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected.\n');

    // ── Step 1: Parse & deduplicate ─────────────────────────────────────
    console.log('Step 1: Parsing XLSX...');
    const rawRows = parseXlsx(xlsxPath);
    console.log(`   Parsed ${rawRows.length} valid rows\n`);

    console.log('Step 1b: Deduplicating by SKU + Location...');
    const dedupRows = deduplicateRows(rawRows);
    const dupsResolved = rawRows.length - dedupRows.length;
    if (dupsResolved > 0) console.log(`   Resolved ${dupsResolved} duplicate(s) by summing QOH`);
    console.log(`   ${dedupRows.length} unique SKU/Location combinations\n`);

    const locationBreakdown: Record<string, number> = {};
    for (const r of dedupRows) {
      locationBreakdown[r.location] = (locationBreakdown[r.location] ?? 0) + 1;
    }
    console.log('   Location breakdown:');
    for (const [loc, count] of Object.entries(locationBreakdown)) {
      console.log(`     ${loc}: ${count} items`);
    }
    console.log();

    report.parsing = {
      totalRawRows: rawRows.length,
      totalAfterDedup: dedupRows.length,
      duplicatesResolved: dupsResolved,
      locationBreakdown,
    };

    // ── Step 2: Create/find stock locations ──────────────────────────────
    console.log('Step 2: Ensuring stock locations...');
    const locationIds = await ensureLocations(client, dryRun);

    const unknownLocations = new Set<string>();
    for (const r of dedupRows) {
      if (!locationIds[r.location]) unknownLocations.add(r.location);
    }
    if (unknownLocations.size > 0) {
      console.warn(`   WARNING: ${unknownLocations.size} unknown location(s) — mapping to NXT Main Stock`);
      for (const ul of unknownLocations) {
        locationIds[ul] = locationIds['NXT/NXT STOCK'];
        console.warn(`     "${ul}" -> NXT Main Stock`);
      }
    }
    console.log();
    report.locations = { ...locationIds };

    // ── Step 3: Match SKUs ──────────────────────────────────────────────
    console.log('Step 3: Matching SKUs against supplier products...');
    const allSkus = [...new Set(dedupRows.map(r => r.sku))];
    console.log(`   Unique SKUs to match: ${allSkus.length}`);

    const skuMatches = await matchSkus(client, allSkus);
    console.log(`   Matched: ${skuMatches.size}`);
    console.log(`   Unmatched: ${allSkus.length - skuMatches.size}`);
    console.log();

    const matchedProducts: MatchedProduct[] = [];
    const unmatchedProducts: UnmatchedProduct[] = [];

    for (const row of dedupRows) {
      const match = skuMatches.get(row.sku);
      if (match) {
        matchedProducts.push({
          row,
          supplierProductId: match.supplier_product_id,
          supplierId: match.supplier_id,
          unitCost: null,
        });
      } else {
        unmatchedProducts.push({ row });
      }
    }

    const matchedSpIds = [...new Set(matchedProducts.map(m => m.supplierProductId))];
    const costMap = await fetchCurrentCosts(client, matchedSpIds);

    for (const mp of matchedProducts) {
      mp.unitCost = costMap.get(mp.supplierProductId) ?? null;
    }

    const matchRate =
      allSkus.length > 0
        ? ((skuMatches.size / allSkus.length) * 100).toFixed(1)
        : '0.0';

    report.matching = {
      matched: skuMatches.size,
      unmatched: allSkus.length - skuMatches.size,
      matchRate: `${matchRate}%`,
    };

    // ── Step 4: Handle unmatched ────────────────────────────────────────
    let unmatchedSupplier: { id: string; name: string } | null = null;
    const unmatchedSpIdMap = new Map<string, string>();

    if (unmatchedProducts.length > 0) {
      console.log('Step 4: Handling unmatched SKUs...');
      unmatchedSupplier = await getOrCreateUnmatchedSupplier(client, dryRun);
      console.log(`   UNMATCHED supplier: ${unmatchedSupplier.name} (${unmatchedSupplier.id})`);

      const spMap = await createUnmatchedProducts(
        client,
        unmatchedProducts,
        unmatchedSupplier.id,
        dryRun
      );
      for (const [sku, spId] of spMap) {
        unmatchedSpIdMap.set(sku, spId);
      }
      console.log(`   Created/found ${spMap.size} unmatched supplier products`);
      console.log();
    }
    report.unmatchedSupplier = unmatchedSupplier;

    // ── Step 5+6: Upsert SOH + stock movements ─────────────────────────
    console.log('Step 5: Upserting stock on hand + creating movements...');

    const importItems: Array<{
      supplierProductId: string;
      locationId: string;
      qty: number;
      unitCost: number | null;
      sku: string;
    }> = [];

    for (const mp of matchedProducts) {
      importItems.push({
        supplierProductId: mp.supplierProductId,
        locationId: locationIds[mp.row.location],
        qty: mp.row.qoh,
        unitCost: mp.unitCost,
        sku: mp.row.sku,
      });
    }

    for (const up of unmatchedProducts) {
      const spId = unmatchedSpIdMap.get(up.row.sku);
      if (!spId) continue;
      importItems.push({
        supplierProductId: spId,
        locationId: locationIds[up.row.location],
        qty: up.row.qoh,
        unitCost: 0,
        sku: up.row.sku,
      });
    }

    const importResult = await importSohAndMovements(client, importItems, dryRun);
    console.log(`   SOH upserted: ${importResult.sohUpserted}`);
    console.log(`   Stock movements: ${importResult.movementsCreated}`);
    if (importResult.errors.length > 0) {
      console.log(`   Errors: ${importResult.errors.length}`);
    }
    console.log();

    report.import = {
      sohCreated: importResult.sohUpserted,
      sohUpdated: 0,
      unmatchedProductsCreated: unmatchedProducts.length,
      stockMovementsCreated: importResult.movementsCreated,
      errors: importResult.errors,
    };

    // ── Step 7: Report ──────────────────────────────────────────────────
    let matchedValue = 0;
    let totalQty = 0;
    for (const mp of matchedProducts) {
      totalQty += mp.row.qoh;
      if (mp.unitCost && mp.unitCost > 0) {
        matchedValue += mp.row.qoh * mp.unitCost;
      }
    }
    for (const up of unmatchedProducts) {
      totalQty += up.row.qoh;
    }

    report.inventoryValue = { matchedValue, totalQty };
    report.unmatchedSkus = unmatchedProducts.map(u => ({
      sku: u.row.sku,
      name: u.row.productName,
      location: u.row.location,
      qoh: u.row.qoh,
    }));

    console.log('=== SUMMARY ===');
    console.log(`  Source:              ${xlsxPath}`);
    console.log(`  Dry run:             ${dryRun}`);
    console.log(`  Raw rows parsed:     ${report.parsing!.totalRawRows}`);
    console.log(`  After dedup:         ${report.parsing!.totalAfterDedup}`);
    console.log(`  Matched SKUs:        ${report.matching!.matched}`);
    console.log(`  Unmatched SKUs:      ${report.matching!.unmatched}`);
    console.log(`  Match rate:          ${report.matching!.matchRate}`);
    console.log(`  SOH upserted:        ${importResult.sohUpserted}`);
    console.log(`  Stock movements:     ${importResult.movementsCreated}`);
    console.log(`  Total qty counted:   ${totalQty}`);
    console.log(`  Matched inv value:   R ${matchedValue.toFixed(2)}`);
    console.log(`  Errors:              ${importResult.errors.length}`);
    console.log();

    if (unmatchedProducts.length > 0 && unmatchedProducts.length <= 50) {
      console.log('--- Unmatched SKUs ---');
      for (const u of unmatchedProducts) {
        console.log(`  ${u.row.sku.padEnd(25)} ${u.row.productName.substring(0, 60).padEnd(62)} QOH: ${u.row.qoh}`);
      }
      console.log();
    } else if (unmatchedProducts.length > 50) {
      console.log(`--- ${unmatchedProducts.length} unmatched SKUs (see report JSON for full list) ---`);
      for (const u of unmatchedProducts.slice(0, 20)) {
        console.log(`  ${u.row.sku.padEnd(25)} ${u.row.productName.substring(0, 60).padEnd(62)} QOH: ${u.row.qoh}`);
      }
      console.log(`  ... and ${unmatchedProducts.length - 20} more`);
      console.log();
    }

    if (importResult.errors.length > 0) {
      console.log('--- Errors ---');
      for (const e of importResult.errors.slice(0, 20)) {
        console.log(`  ${e}`);
      }
      if (importResult.errors.length > 20) {
        console.log(`  ... and ${importResult.errors.length - 20} more`);
      }
      console.log();
    }

    // Save report JSON
    const reportPath = resolve(
      dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')),
      'reports',
      'stocktake-2026-02-26-report.json'
    );
    try {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`Report saved: ${reportPath}`);
    } catch {
      const fallbackPath = resolve(process.cwd(), 'scripts', 'imports', 'reports', 'stocktake-2026-02-26-report.json');
      mkdirSync(resolve(process.cwd(), 'scripts', 'imports', 'reports'), { recursive: true });
      writeFileSync(fallbackPath, JSON.stringify(report, null, 2));
      console.log(`Report saved: ${fallbackPath}`);
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('\nFATAL:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main();
}
