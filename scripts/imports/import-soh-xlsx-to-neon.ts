#!/usr/bin/env bun
/**
 * SOH Excel import – generate SQL for Neon MCP execution.
 * Matches on SKU to supplier portfolio; unmatched SKUs go to supplier UNMATCHED with zero cost.
 * No core.stock_movement (not present in target DB).
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

import {
  parseStockTakeWorkbook,
  STOCK_TAKE_LOCATION_MAP,
  sqlStringLiteral,
} from '../../src/lib/inventory/stocktake-reload';

const REFERENCE_DOC = 'SOH_IMPORT_2026-03-09';
const SOURCE_LABEL = 'soh_import';

interface CliOptions {
  xlsxPath: string;
  outPath: string;
  metadataPath: string;
}

function parseArgs(argv: string[]): CliOptions {
  let xlsxPath = '';
  let outPath = '';
  let metadataPath = '';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (!arg.startsWith('--') && !xlsxPath) {
      xlsxPath = arg;
      continue;
    }

    if (arg === '--out') {
      outPath = argv[++i] ?? outPath;
      continue;
    }

    if (arg === '--meta-out') {
      metadataPath = argv[++i] ?? metadataPath;
      continue;
    }
  }

  if (!xlsxPath) {
    throw new Error(
      'Usage: bun scripts/imports/import-soh-xlsx-to-neon.ts <xlsx-path> [--out <sql-path>] [--meta-out <json-path>]'
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (!outPath) {
    outPath = resolve(
      process.cwd(),
      'scripts',
      'imports',
      'reports',
      'generated',
      `soh-import-${timestamp}.sql`
    );
  } else {
    outPath = resolve(process.cwd(), outPath);
  }

  if (!metadataPath) {
    metadataPath = outPath.replace(/\.sql$/i, '.meta.json');
  } else {
    metadataPath = resolve(process.cwd(), metadataPath);
  }

  return { xlsxPath, outPath, metadataPath };
}

function buildSql(options: CliOptions): { parsed: ReturnType<typeof parseStockTakeWorkbook>; payloadRows: number; sql: string } {
  const parsed = parseStockTakeWorkbook(options.xlsxPath);

  const payload = parsed.rows.map((row, index) => ({
    row_num: index + 1,
    sku: row.sku,
    product_name: row.productName,
    input_location: row.location,
    uom: row.uom,
    qty: row.qoh,
  }));

  const payloadLiteral = sqlStringLiteral(JSON.stringify(payload));
  const sourceLiteral = sqlStringLiteral(options.xlsxPath);
  const nowLiteral = sqlStringLiteral(new Date().toISOString());
  const referenceLiteral = sqlStringLiteral(REFERENCE_DOC);

  const expectedRows = parsed.totalAfterDedup;
  const expectedSkus = parsed.uniqueSkuCount;

  const locationValues = Object.entries(STOCK_TAKE_LOCATION_MAP)
    .map(([input, target]) => `  (${sqlStringLiteral(input)}, ${sqlStringLiteral(target)})`)
    .join(',\n');

  const sql = `-- SOH Excel import – run via Neon MCP (proud-mud-50346856). No stock_movement.
-- Generated: ${new Date().toISOString()}
-- Source: ${options.xlsxPath}
-- Rows: raw=${parsed.totalRawRows}, valid=${parsed.totalValidRows}, dedup=${parsed.totalAfterDedup}, unique_sku=${expectedSkus}

SET statement_timeout = '10min';
SET lock_timeout = '30s';

CREATE TEMP TABLE tmp_soh_location_map (
  input_location text PRIMARY KEY,
  db_location text NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_soh_location_map (input_location, db_location) VALUES
${locationValues};

INSERT INTO core.stock_location (location_id, name, type, is_active, created_at, updated_at)
SELECT gen_random_uuid(), lm.db_location, 'internal', true, NOW(), NOW()
FROM tmp_soh_location_map lm
LEFT JOIN core.stock_location sl
  ON sl.name = lm.db_location
 AND sl.is_active = true
WHERE sl.location_id IS NULL;

CREATE TEMP TABLE tmp_soh_location_ids AS
SELECT sl.location_id, sl.name
FROM core.stock_location sl
JOIN tmp_soh_location_map lm ON lm.db_location = sl.name
WHERE sl.is_active = true;

CREATE TEMP TABLE tmp_soh_input_raw (
  row_num integer,
  sku text,
  product_name text,
  input_location text,
  uom text,
  qty integer
) ON COMMIT DROP;

INSERT INTO tmp_soh_input_raw (row_num, sku, product_name, input_location, uom, qty)
SELECT row_num, sku, product_name, input_location, uom, qty
FROM jsonb_to_recordset(${payloadLiteral}::jsonb) AS x(
  row_num integer,
  sku text,
  product_name text,
  input_location text,
  uom text,
  qty integer
);

DO $$
DECLARE
  v_input_rows integer;
  v_bad_rows integer;
BEGIN
  SELECT COUNT(*) INTO v_input_rows FROM tmp_soh_input_raw;
  SELECT COUNT(*) INTO v_bad_rows
  FROM tmp_soh_input_raw
  WHERE COALESCE(NULLIF(BTRIM(sku), ''), '') = ''
     OR COALESCE(NULLIF(BTRIM(product_name), ''), '') = ''
     OR qty IS NULL
     OR qty <= 0;

  IF v_input_rows <> ${expectedRows} THEN
    RAISE EXCEPTION 'Input row count mismatch. expected=${expectedRows} actual=%', v_input_rows;
  END IF;

  IF v_bad_rows > 0 THEN
    RAISE EXCEPTION 'Input contains % invalid rows (blank SKU/name or qty<=0)', v_bad_rows;
  END IF;
END $$;

CREATE TEMP TABLE tmp_soh_input AS
SELECT
  i.row_num,
  BTRIM(i.sku) AS sku,
  BTRIM(i.product_name) AS product_name,
  BTRIM(i.input_location) AS input_location,
  BTRIM(i.uom) AS uom,
  i.qty,
  COALESCE(sl.location_id, sl_main.location_id) AS location_id
FROM tmp_soh_input_raw i
LEFT JOIN tmp_soh_location_map lm
  ON lm.input_location = i.input_location
LEFT JOIN core.stock_location sl
  ON sl.name = lm.db_location
 AND sl.is_active = true
LEFT JOIN core.stock_location sl_main
  ON sl_main.name = 'NXT Main Stock'
 AND sl_main.is_active = true;

DO $$
DECLARE
  v_null_locations integer;
  v_unique_skus integer;
BEGIN
  SELECT COUNT(*) INTO v_null_locations
  FROM tmp_soh_input
  WHERE location_id IS NULL;

  IF v_null_locations > 0 THEN
    RAISE EXCEPTION 'Resolved input has % rows with null location_id', v_null_locations;
  END IF;

  SELECT COUNT(DISTINCT sku) INTO v_unique_skus FROM tmp_soh_input;
  IF v_unique_skus <> ${expectedSkus} THEN
    RAISE EXCEPTION 'Unique SKU count mismatch. expected=${expectedSkus} actual=%', v_unique_skus;
  END IF;
END $$;

INSERT INTO core.supplier (
  supplier_id,
  name,
  code,
  active,
  default_currency,
  created_at,
  updated_at
)
SELECT gen_random_uuid(), 'UNMATCHED', 'UNMATCHED', true, 'ZAR', NOW(), NOW()
FROM (SELECT 1) AS one
WHERE NOT EXISTS (
  SELECT 1 FROM core.supplier WHERE code = 'UNMATCHED'
);

CREATE TEMP TABLE tmp_unmatched_supplier AS
SELECT supplier_id
FROM core.supplier
WHERE code = 'UNMATCHED'
ORDER BY created_at ASC
LIMIT 1;

DO $$
DECLARE
  v_unmatched_supplier integer;
BEGIN
  SELECT COUNT(*) INTO v_unmatched_supplier FROM tmp_unmatched_supplier;
  IF v_unmatched_supplier <> 1 THEN
    RAISE EXCEPTION 'Expected a single UNMATCHED supplier, found %', v_unmatched_supplier;
  END IF;
END $$;

CREATE TEMP TABLE tmp_soh_primary_match AS
SELECT
  i.row_num,
  i.sku,
  i.product_name,
  i.input_location,
  i.uom,
  i.qty,
  i.location_id,
  m.supplier_product_id,
  m.supplier_id
FROM tmp_soh_input i
LEFT JOIN LATERAL (
  SELECT sp.supplier_product_id, sp.supplier_id
  FROM core.supplier_product sp
  JOIN core.supplier s ON s.supplier_id = sp.supplier_id
  WHERE sp.supplier_sku = i.sku
    AND sp.is_active = true
    AND s.code <> 'UNMATCHED'
  ORDER BY sp.last_seen_at DESC NULLS LAST, sp.updated_at DESC NULLS LAST
  LIMIT 1
) m ON TRUE;

CREATE TEMP TABLE tmp_soh_unmatched_distinct AS
SELECT DISTINCT ON (sku)
  sku,
  product_name,
  uom
FROM tmp_soh_primary_match
WHERE supplier_product_id IS NULL
ORDER BY sku, row_num;

INSERT INTO core.supplier_product (
  supplier_product_id,
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
)
SELECT
  gen_random_uuid(),
  us.supplier_id,
  u.sku,
  COALESCE(NULLIF(BTRIM(u.product_name), ''), u.sku),
  CASE WHEN LOWER(COALESCE(u.uom, '')) = 'm' THEN 'm' ELSE 'each' END,
  jsonb_build_object(
    'source', ${sqlStringLiteral(SOURCE_LABEL)},
    'cost_excluding', 0,
    'description', COALESCE(NULLIF(BTRIM(u.product_name), ''), u.sku),
    'source_file', ${sourceLiteral},
    'source_generated_at', ${nowLiteral}
  ),
  true,
  true,
  NOW(),
  NOW(),
  NOW(),
  NOW()
FROM tmp_soh_unmatched_distinct u
CROSS JOIN tmp_unmatched_supplier us
WHERE NOT EXISTS (
  SELECT 1 FROM core.supplier_product sp
  WHERE sp.supplier_id = us.supplier_id
    AND sp.supplier_sku = u.sku
);

UPDATE core.supplier_product sp
SET
  name_from_supplier = COALESCE(NULLIF(BTRIM(sp.name_from_supplier), ''), u.product_name),
  attrs_json = jsonb_build_object(
    'source', ${sqlStringLiteral(SOURCE_LABEL)},
    'cost_excluding', 0,
    'description', COALESCE(NULLIF(BTRIM(u.product_name), ''), u.sku),
    'source_file', ${sourceLiteral},
    'source_generated_at', ${nowLiteral}
  ),
  is_active = true,
  last_seen_at = NOW(),
  updated_at = NOW()
FROM tmp_soh_unmatched_distinct u
CROSS JOIN tmp_unmatched_supplier us
WHERE sp.supplier_id = us.supplier_id
  AND sp.supplier_sku = u.sku;

CREATE TEMP TABLE tmp_soh_resolved AS
SELECT
  m.row_num,
  m.sku,
  m.product_name,
  m.input_location,
  m.location_id,
  m.qty,
  COALESCE(m.supplier_product_id, sp_u.supplier_product_id) AS supplier_product_id,
  CASE
    WHEN m.supplier_product_id IS NULL THEN 0::numeric
    ELSE ph.price
  END AS unit_cost
FROM tmp_soh_primary_match m
LEFT JOIN tmp_unmatched_supplier us ON TRUE
LEFT JOIN core.supplier_product sp_u
  ON m.supplier_product_id IS NULL
 AND sp_u.supplier_id = us.supplier_id
 AND sp_u.supplier_sku = m.sku
LEFT JOIN LATERAL (
  SELECT ph.price
  FROM core.price_history ph
  WHERE ph.supplier_product_id = m.supplier_product_id
    AND ph.is_current = true
  ORDER BY ph.valid_from DESC
  LIMIT 1
) ph ON TRUE;

DO $$
DECLARE
  v_missing_products integer;
BEGIN
  SELECT COUNT(*) INTO v_missing_products
  FROM tmp_soh_resolved
  WHERE supplier_product_id IS NULL;

  IF v_missing_products > 0 THEN
    RAISE EXCEPTION 'Resolved import has % rows with null supplier_product_id', v_missing_products;
  END IF;
END $$;

WITH preferred_name AS (
  SELECT supplier_product_id, MIN(product_name) AS product_name
  FROM tmp_soh_resolved
  GROUP BY supplier_product_id
)
UPDATE core.supplier_product sp
SET
  name_from_supplier = CASE
    WHEN COALESCE(NULLIF(BTRIM(sp.name_from_supplier), ''), '') = '' THEN pn.product_name
    ELSE sp.name_from_supplier
  END,
  attrs_json = CASE
    WHEN COALESCE(NULLIF(BTRIM(sp.attrs_json->>'description'), ''), '') = ''
      THEN jsonb_set(COALESCE(sp.attrs_json, '{}'::jsonb), '{description}', to_jsonb(pn.product_name), true)
    ELSE sp.attrs_json
  END,
  updated_at = NOW()
FROM preferred_name pn
WHERE sp.supplier_product_id = pn.supplier_product_id
  AND COALESCE(NULLIF(BTRIM(pn.product_name), ''), '') <> ''
  AND (
    COALESCE(NULLIF(BTRIM(sp.name_from_supplier), ''), '') = ''
    OR COALESCE(NULLIF(BTRIM(sp.attrs_json->>'description'), ''), '') = ''
  );

INSERT INTO core.stock_on_hand (
  soh_id,
  location_id,
  supplier_product_id,
  qty,
  unit_cost,
  as_of_ts,
  source,
  created_at
)
SELECT
  gen_random_uuid(),
  r.location_id,
  r.supplier_product_id,
  r.qty,
  r.unit_cost,
  NOW(),
  'import',
  NOW()
FROM tmp_soh_resolved r
WHERE NOT EXISTS (
  SELECT 1 FROM core.stock_on_hand soh
  WHERE soh.location_id = r.location_id
    AND soh.supplier_product_id = r.supplier_product_id
);

UPDATE core.stock_on_hand soh
SET
  qty = r.qty,
  unit_cost = COALESCE(r.unit_cost, soh.unit_cost),
  as_of_ts = NOW()
FROM tmp_soh_resolved r
WHERE soh.location_id = r.location_id
  AND soh.supplier_product_id = r.supplier_product_id;

DO $$
DECLARE
  v_expected integer;
  v_actual integer;
BEGIN
  SELECT COUNT(*) INTO v_expected FROM tmp_soh_resolved;
  SELECT COUNT(*) INTO v_actual FROM core.stock_on_hand soh
  WHERE soh.as_of_ts >= (SELECT MAX(as_of_ts) FROM core.stock_on_hand) - INTERVAL '1 minute';
  IF v_actual < v_expected THEN
    RAISE NOTICE 'SOH insert check: expected at least % rows in recent window, got %', v_expected, v_actual;
  END IF;
END $$;

SELECT
  ${referenceLiteral} AS reference_doc,
  ${expectedRows}::integer AS expected_dedup_rows,
  (SELECT COUNT(*) FROM tmp_soh_input_raw) AS input_rows,
  (SELECT COUNT(*) FROM tmp_soh_resolved) AS resolved_rows,
  (SELECT COUNT(*) FROM core.stock_on_hand) AS total_stock_on_hand;
`;

  return {
    parsed,
    payloadRows: payload.length,
    sql,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const built = buildSql(options);

  mkdirSync(dirname(options.outPath), { recursive: true });
  mkdirSync(dirname(options.metadataPath), { recursive: true });

  writeFileSync(options.outPath, built.sql);

  const meta = {
    generatedAt: new Date().toISOString(),
    sourceFile: options.xlsxPath,
    referenceDoc: REFERENCE_DOC,
    outPath: options.outPath,
    totalRawRows: built.parsed.totalRawRows,
    totalValidRows: built.parsed.totalValidRows,
    totalAfterDedup: built.parsed.totalAfterDedup,
    duplicatesResolved: built.parsed.duplicatesResolved,
    uniqueSkuCount: built.parsed.uniqueSkuCount,
    payloadRows: built.payloadRows,
    locationBreakdown: built.parsed.locationBreakdown,
    headers: built.parsed.headerMap,
  };

  writeFileSync(options.metadataPath, `${JSON.stringify(meta, null, 2)}\n`);

  console.log('Generated SOH import SQL and metadata');
  console.log(`  SQL:  ${options.outPath}`);
  console.log(`  Meta: ${options.metadataPath}`);
  console.log(
    `  Rows: raw=${meta.totalRawRows}, valid=${meta.totalValidRows}, dedup=${meta.totalAfterDedup}, unique_sku=${meta.uniqueSkuCount}`
  );
}

main();
