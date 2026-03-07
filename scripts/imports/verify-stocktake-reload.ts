#!/usr/bin/env bun
import { Client } from 'pg';

import {
  parseStockTakeWorkbook,
  STOCK_TAKE_LOCATION_MAP,
} from '../../src/lib/inventory/stocktake-reload';

interface CliOptions {
  xlsxPath: string;
  referenceDoc: string;
}

function parseArgs(argv: string[]): CliOptions {
  let xlsxPath = '';
  let referenceDoc = 'STOCK_TAKE_2026-02-26';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (!arg.startsWith('--') && !xlsxPath) {
      xlsxPath = arg;
      continue;
    }

    if (arg === '--reference-doc') {
      referenceDoc = argv[++i] ?? referenceDoc;
      continue;
    }
  }

  if (!xlsxPath) {
    throw new Error(
      'Usage: bun scripts/imports/verify-stocktake-reload.ts <xlsx-path> [--reference-doc STOCK_TAKE_2026-02-26]'
    );
  }

  return { xlsxPath, referenceDoc };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const parsed = parseStockTakeWorkbook(options.xlsxPath);
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL or NEON_SPP_DATABASE_URL is required');
  }

  const payload = parsed.rows.map((row, index) => ({
    row_num: index + 1,
    sku: row.sku,
    product_name: row.productName,
    input_location: row.location,
    db_location: STOCK_TAKE_LOCATION_MAP[row.location] ?? 'NXT Main Stock',
    qty: row.qoh,
  }));

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const movementCounts = await client.query<{
      movement_count: number;
      distinct_products: number;
    }>(
      `SELECT
         COUNT(*)::int AS movement_count,
         COUNT(DISTINCT supplier_product_id)::int AS distinct_products
       FROM core.stock_movement
       WHERE reference_doc = $1`,
      [options.referenceDoc]
    );

    const parity = await client.query<{
      total_rows: number;
      exact: number;
      mismatch: number;
      missing_product: number;
      missing_location: number;
      missing_soh: number;
    }>(
      `WITH incoming AS (
         SELECT *
         FROM jsonb_to_recordset($1::jsonb) AS x(
           row_num integer,
           sku text,
           product_name text,
           input_location text,
           db_location text,
           qty integer
         )
       ), resolved AS (
         SELECT
           i.*,
           loc.location_id,
           COALESCE(non_unmatched.supplier_product_id, unmatched.supplier_product_id) AS supplier_product_id
         FROM incoming i
         LEFT JOIN core.stock_location loc
           ON loc.name = i.db_location
          AND loc.is_active = true
         LEFT JOIN LATERAL (
           SELECT sp.supplier_product_id
           FROM core.supplier_product sp
           JOIN core.supplier s ON s.supplier_id = sp.supplier_id
           WHERE sp.supplier_sku = i.sku
             AND sp.is_active = true
             AND s.code <> 'UNMATCHED'
           ORDER BY sp.last_seen_at DESC NULLS LAST, sp.updated_at DESC NULLS LAST
           LIMIT 1
         ) non_unmatched ON TRUE
         LEFT JOIN LATERAL (
           SELECT sp.supplier_product_id
           FROM core.supplier_product sp
           JOIN core.supplier s ON s.supplier_id = sp.supplier_id
           WHERE sp.supplier_sku = i.sku
             AND sp.is_active = true
             AND s.code = 'UNMATCHED'
           ORDER BY sp.last_seen_at DESC NULLS LAST, sp.updated_at DESC NULLS LAST
           LIMIT 1
         ) unmatched ON TRUE
       ), joined AS (
         SELECT
           r.*,
           soh.qty AS actual_qty
         FROM resolved r
         LEFT JOIN core.stock_on_hand soh
           ON soh.supplier_product_id = r.supplier_product_id
          AND soh.location_id = r.location_id
       )
       SELECT
         COUNT(*)::int AS total_rows,
         COUNT(*) FILTER (WHERE actual_qty = qty)::int AS exact,
         COUNT(*) FILTER (WHERE actual_qty IS NOT NULL AND actual_qty <> qty)::int AS mismatch,
         COUNT(*) FILTER (WHERE supplier_product_id IS NULL)::int AS missing_product,
         COUNT(*) FILTER (WHERE location_id IS NULL)::int AS missing_location,
         COUNT(*) FILTER (WHERE supplier_product_id IS NOT NULL AND location_id IS NOT NULL AND actual_qty IS NULL)::int AS missing_soh
       FROM joined`,
      [JSON.stringify(payload)]
    );

    const quality = await client.query<{
      blank_names: number;
      blank_stocktake_descriptions: number;
    }>(
      `WITH impacted AS (
         SELECT DISTINCT supplier_product_id
         FROM core.stock_movement
         WHERE reference_doc = $1
       )
       SELECT
         (SELECT COUNT(*)::int
          FROM public.inventory_items iv
          WHERE COALESCE(NULLIF(BTRIM(iv.name), ''), '') = '') AS blank_names,
         (SELECT COUNT(*)::int
          FROM impacted i
          JOIN core.supplier_product sp ON sp.supplier_product_id = i.supplier_product_id
          JOIN public.inventory_items iv
            ON iv.sku = sp.supplier_sku
           AND iv.supplier_id::text = sp.supplier_id::text
          WHERE COALESCE(NULLIF(BTRIM(iv.description), ''), '') = '') AS blank_stocktake_descriptions`,
      [options.referenceDoc]
    );

    const unmatchedCount = await client.query<{ total_unmatched: number }>(
      `SELECT COUNT(*)::int AS total_unmatched
       FROM core.supplier_product sp
       JOIN core.supplier s ON s.supplier_id = sp.supplier_id
       WHERE s.code = 'UNMATCHED'
         AND COALESCE(NULLIF(BTRIM(sp.attrs_json->>'source'), ''), '') = 'stock_take'`
    );

    const movement = movementCounts.rows[0];
    const parityRow = parity.rows[0];
    const qualityRow = quality.rows[0];
    const unmatched = unmatchedCount.rows[0]?.total_unmatched ?? 0;

    const expectedRows = parsed.totalAfterDedup;
    const failReasons: string[] = [];

    if (movement.movement_count !== expectedRows) {
      failReasons.push(
        `movement_count mismatch expected=${expectedRows} actual=${movement.movement_count}`
      );
    }
    if (parityRow.exact !== expectedRows) {
      failReasons.push(`qty parity mismatch exact=${parityRow.exact} expected=${expectedRows}`);
    }
    if (parityRow.mismatch > 0 || parityRow.missing_product > 0 || parityRow.missing_location > 0 || parityRow.missing_soh > 0) {
      failReasons.push(
        `parity detail mismatch mismatch=${parityRow.mismatch} missing_product=${parityRow.missing_product} missing_location=${parityRow.missing_location} missing_soh=${parityRow.missing_soh}`
      );
    }
    if (qualityRow.blank_names > 0 || qualityRow.blank_stocktake_descriptions > 0) {
      failReasons.push(
        `quality gate failed blank_names=${qualityRow.blank_names} blank_stocktake_descriptions=${qualityRow.blank_stocktake_descriptions}`
      );
    }

    console.log('Stock-take reload verification summary');
    console.log(`  Reference doc: ${options.referenceDoc}`);
    console.log(`  Spreadsheet dedup rows: ${expectedRows}`);
    console.log(`  Movements: ${movement.movement_count}`);
    console.log(`  Distinct movement products: ${movement.distinct_products}`);
    console.log(`  Qty parity exact rows: ${parityRow.exact}`);
    console.log(`  UNMATCHED stock_take products: ${unmatched}`);
    console.log(`  Blank inventory names: ${qualityRow.blank_names}`);
    console.log(`  Blank stock-take descriptions: ${qualityRow.blank_stocktake_descriptions}`);

    if (failReasons.length > 0) {
      console.error('Verification FAILED');
      for (const reason of failReasons) console.error(`  - ${reason}`);
      process.exit(1);
    }

    console.log('Verification PASSED');
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error('verify-stocktake-reload failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
