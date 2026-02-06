/**
 * Rolling Thunder January 2026 Pricelist Import
 *
 * Imports 180 products from Rolling Thunder's January 2026 pricelist CSV
 * into the SPP staging tables and core product/pricing tables.
 *
 * Brands: Hercules DJ, Ortofon, UDG, Odyssey
 *
 * Run: bun run scripts/import-rolling-thunder-jan2026.ts
 */

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Run with: DATABASE_URL=... bun run scripts/import-rolling-thunder-jan2026.ts');
  process.exit(1);
}

const SUPPLIER_ID = '99123c0b-90ca-4112-a0e4-a8ae42de2aa9';
const SUPPLIER_NAME = 'ROLLING THUNDER';
const CSV_PATH = 'E:/00Project/NXT_OCR/output/January_2026_Pricelist_Combined.csv';
const UPLOAD_ID = 'b7e2a1c3-4d5f-6789-abcd-ef1234560001';
const VALID_FROM = '2026-01-01';
const CURRENCY = 'ZAR';

// ─── CSV Parser ──────────────────────────────────────────────────────────────

interface CsvRow {
  brand: string;
  category: string;
  sku: string;
  description: string;
  sup_soh: number;
  dealer_excl: number;
  rsp: number;
  row_num: number;
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('CSV has no data rows');

  // Skip header
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
          current += '"';
          j++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ';' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    if (values.length < 7) continue;

    const sku = values[2]?.trim();
    if (!sku) continue;

    rows.push({
      brand: values[0]?.trim() || '',
      category: values[1]?.trim() || '',
      sku,
      description: values[3]?.trim() || '',
      sup_soh: parseInt(values[4]) || 0,
      dealer_excl: parseFloat(values[5]) || 0,
      rsp: parseFloat(values[6]) || 0,
      row_num: i,
    });
  }

  return rows;
}

// ─── Deduplication ───────────────────────────────────────────────────────────

function deduplicateBySku(rows: CsvRow[]): CsvRow[] {
  const map = new Map<string, CsvRow>();
  let dupeCount = 0;
  for (const row of rows) {
    if (map.has(row.sku)) {
      dupeCount++;
      console.log(`  ⚠ Duplicate SKU "${row.sku}" at row ${row.row_num} (overwriting row ${map.get(row.sku)!.row_num})`);
    }
    map.set(row.sku, row);
  }
  if (dupeCount > 0) console.log(`  → ${dupeCount} duplicate SKU(s) resolved (last occurrence wins)\n`);
  return Array.from(map.values());
}

// ─── Main Import ─────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' Rolling Thunder — January 2026 Pricelist Import');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Read and parse CSV
  console.log('1. Reading CSV...');
  const file = Bun.file(CSV_PATH);
  const text = await file.text();
  const allRows = parseCSV(text);
  console.log(`   Parsed ${allRows.length} rows from CSV`);

  // 2. Deduplicate
  console.log('\n2. Deduplicating by SKU...');
  const rows = deduplicateBySku(allRows);
  console.log(`   ${rows.length} unique products to import`);

  // Brand breakdown
  const brandCounts = new Map<string, number>();
  for (const r of rows) {
    brandCounts.set(r.brand, (brandCounts.get(r.brand) || 0) + 1);
  }
  for (const [brand, count] of brandCounts) {
    console.log(`   • ${brand}: ${count} products`);
  }

  // 3. Connect to database
  console.log('\n3. Connecting to database...');
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });

  const client = await pool.connect();
  console.log('   Connected ✓');

  try {
    await client.query('BEGIN');
    console.log('   Transaction started');

    // 4. Create stock location (if not exists)
    console.log('\n4. Creating stock location...');
    const locResult = await client.query(
      `INSERT INTO core.stock_location (location_id, name, type, supplier_id, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'supplier', $2, true, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING location_id`,
      [`${SUPPLIER_NAME} - Main Warehouse`, SUPPLIER_ID]
    );
    let locationId: string;
    if (locResult.rows.length > 0) {
      locationId = locResult.rows[0].location_id;
      console.log(`   Created: ${locationId}`);
    } else {
      const existing = await client.query(
        `SELECT location_id FROM core.stock_location WHERE supplier_id = $1 LIMIT 1`,
        [SUPPLIER_ID]
      );
      locationId = existing.rows[0]?.location_id;
      console.log(`   Already exists: ${locationId}`);
    }

    // 5. Create pricelist upload record
    console.log('\n5. Creating upload tracking record...');
    await client.query(
      `INSERT INTO spp.pricelist_upload
        (upload_id, supplier_id, received_at, filename, currency, valid_from, row_count, status, created_at, updated_at)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, 'received', NOW(), NOW())`,
      [UPLOAD_ID, SUPPLIER_ID, 'January_2026_Pricelist_Combined.csv', CURRENCY, VALID_FROM, rows.length]
    );
    console.log(`   Upload ID: ${UPLOAD_ID}`);

    // 6. Insert staging rows (spp.pricelist_row)
    console.log('\n6. Inserting staging rows into spp.pricelist_row...');
    let stagingInserted = 0;
    for (const row of rows) {
      await client.query(
        `INSERT INTO spp.pricelist_row
          (upload_id, row_num, supplier_sku, name, brand, uom, price, cost_price_ex_vat, currency, category_raw, attrs_json)
         VALUES ($1, $2, $3, $4, $5, 'EA', $6, $7, $8, $9, $10)`,
        [
          UPLOAD_ID,
          row.row_num,
          row.sku,
          row.description,
          row.brand,
          row.dealer_excl,
          row.dealer_excl,
          CURRENCY,
          row.category || null,
          JSON.stringify({
            rsp: row.rsp,
            sup_soh: row.sup_soh,
            brand: row.brand,
            category_raw: row.category || null,
          }),
        ]
      );
      stagingInserted++;
    }
    console.log(`   Inserted ${stagingInserted} staging rows ✓`);

    // 7. Insert supplier products + price history + stock on hand
    console.log('\n7. Inserting into core tables...');
    let productsCreated = 0;
    let pricesCreated = 0;
    let sohCreated = 0;

    for (const row of rows) {
      // Insert supplier_product
      const spResult = await client.query(
        `INSERT INTO core.supplier_product
          (supplier_product_id, supplier_id, supplier_sku, name_from_supplier, uom,
           first_seen_at, last_seen_at, is_active, is_new, attrs_json, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'EA',
                 NOW(), NOW(), true, true, $4::jsonb, NOW(), NOW())
         RETURNING supplier_product_id`,
        [
          SUPPLIER_ID,
          row.sku,
          row.description,
          JSON.stringify({
            brand: row.brand,
            category_raw: row.category || null,
            rsp: row.rsp,
            sup_soh: row.sup_soh,
          }),
        ]
      );
      const supplierProductId = spResult.rows[0].supplier_product_id;
      productsCreated++;

      // Insert price history
      await client.query(
        `INSERT INTO core.price_history
          (price_history_id, supplier_product_id, price, currency, valid_from, is_current, change_reason, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, 'initial_import', NOW())`,
        [supplierProductId, row.dealer_excl, CURRENCY, VALID_FROM]
      );
      pricesCreated++;

      // Insert stock on hand (only if SOH > 0 and we have a location)
      if (row.sup_soh > 0 && locationId) {
        await client.query(
          `INSERT INTO core.stock_on_hand
            (soh_id, location_id, supplier_product_id, qty, unit_cost, as_of_ts, source, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), 'import', NOW())`,
          [locationId, supplierProductId, row.sup_soh, row.dealer_excl]
        );
        sohCreated++;
      }
    }
    console.log(`   Products created: ${productsCreated}`);
    console.log(`   Price records created: ${pricesCreated}`);
    console.log(`   SOH records created: ${sohCreated}`);

    // 8. Update upload status to merged
    console.log('\n8. Updating upload status to merged...');
    await client.query(
      `UPDATE spp.pricelist_upload SET status = 'merged', processed_at = NOW(), updated_at = NOW() WHERE upload_id = $1`,
      [UPLOAD_ID]
    );
    console.log('   Status: merged ✓');

    // COMMIT
    await client.query('COMMIT');
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(' IMPORT COMPLETE — ALL COMMITTED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n Summary:`);
    console.log(`   Supplier:         ${SUPPLIER_NAME}`);
    console.log(`   Products:         ${productsCreated}`);
    console.log(`   Price records:    ${pricesCreated}`);
    console.log(`   SOH records:      ${sohCreated}`);
    console.log(`   Upload ID:        ${UPLOAD_ID}`);
    console.log(`   Stock Location:   ${locationId}`);
    console.log(`   Valid From:       ${VALID_FROM}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ IMPORT FAILED — ROLLED BACK');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
