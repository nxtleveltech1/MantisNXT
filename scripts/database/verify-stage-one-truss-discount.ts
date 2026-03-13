#!/usr/bin/env bun
/**
 * Verify Stage One Stage/Truss discount exclusion rule
 *
 * Ensures:
 * - Stage One products in Stage/Truss categories get base_discount = 0
 * - Stage One products in other categories get base_discount = 10 (supplier default)
 *
 * Usage: bun scripts/database/verify-stage-one-truss-discount.ts
 */

import { query as dbQuery } from '../../src/lib/database/unified-connection';

const SUPPLIER_NAME = 'Stage One';

interface VerifyRow {
  supplier_product_id: string;
  supplier_sku: string;
  product_name: string;
  category_name: string | null;
  base_discount: number;
  is_stage_truss: boolean;
}

async function main() {
  console.log('Verifying Stage One Stage/Truss discount exclusion\n');

  const sql = `
    WITH stage_one_products AS (
      SELECT sp.supplier_product_id, sp.supplier_id, sp.supplier_sku, sp.name_from_supplier, sp.category_id
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      WHERE LOWER(s.name) = $1
    ),
    cat_resolved AS (
      SELECT
        sop.supplier_product_id,
        sop.supplier_sku,
        sop.name_from_supplier,
        CASE WHEN c.name IS NOT NULL AND c.name <> '' THEN c.name ELSE pr.category_raw END AS category_name
      FROM stage_one_products sop
      LEFT JOIN core.category c ON c.category_id = sop.category_id
      LEFT JOIN LATERAL (
        SELECT r.category_raw
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sop.supplier_id
        WHERE r.supplier_sku = sop.supplier_sku AND r.category_raw IS NOT NULL AND r.category_raw <> ''
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) pr ON TRUE
    ),
    supplier_discounts AS (
      SELECT
        sp.supplier_product_id,
        COALESCE(
          (SELECT dr.discount_percent FROM core.supplier_discount_rules dr
           WHERE dr.supplier_id = sp.supplier_id AND dr.scope_type = 'sku' AND dr.supplier_sku = sp.supplier_sku
             AND dr.is_active = true AND dr.valid_from <= NOW() AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
           ORDER BY dr.priority DESC LIMIT 1),
          (SELECT dr.discount_percent FROM core.supplier_discount_rules dr
           JOIN public.brand b ON b.id = dr.brand_id
           WHERE dr.supplier_id = sp.supplier_id AND dr.scope_type = 'brand'
             AND UPPER(TRIM(b.name)) = UPPER(TRIM(COALESCE(sp.attrs_json->>'brand', '')))
             AND dr.is_active = true AND dr.valid_from <= NOW() AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
           ORDER BY dr.priority DESC LIMIT 1),
          (SELECT dr.discount_percent FROM core.supplier_discount_rules dr
           WHERE dr.supplier_id = sp.supplier_id AND dr.scope_type = 'category' AND dr.category_id = sp.category_id
             AND dr.is_active = true AND dr.valid_from <= NOW() AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
           ORDER BY dr.priority DESC LIMIT 1),
          CASE
            WHEN LOWER(s.name) = 'stage one'
              AND (
                LOWER(COALESCE(c.name, cat.category_raw, '')) LIKE '%truss%'
                OR (LOWER(COALESCE(c.name, cat.category_raw, '')) LIKE '%stage%'
                    AND LOWER(COALESCE(c.name, cat.category_raw, '')) NOT LIKE '%stage piano%')
                OR LOWER(COALESCE(c.name, cat.category_raw, '')) LIKE '%staging%'
                OR LOWER(COALESCE(c.name, cat.category_raw, '')) LIKE '%rigging%'
              )
            THEN 0
            ELSE NULL
          END,
          (SELECT dr.discount_percent FROM core.supplier_discount_rules dr
           WHERE dr.supplier_id = sp.supplier_id AND dr.scope_type = 'supplier'
             AND dr.is_active = true AND dr.valid_from <= NOW() AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
           ORDER BY dr.priority DESC LIMIT 1),
          (sp.attrs_json->>'base_discount')::numeric,
          (sp.attrs_json->>'base_discount_percent')::numeric,
          s.base_discount_percent,
          0
        ) AS base_discount
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN LATERAL (
        SELECT r.category_raw FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku AND r.category_raw IS NOT NULL AND r.category_raw <> ''
        ORDER BY u.received_at DESC, r.row_num DESC LIMIT 1
      ) cat ON TRUE
      WHERE LOWER(s.name) = $1
    )
    SELECT
      sd.supplier_product_id,
      sp.supplier_sku,
      sp.name_from_supplier AS product_name,
      cr.category_name,
      COALESCE(sd.base_discount, 0)::numeric AS base_discount,
      (
        LOWER(COALESCE(cr.category_name, '')) LIKE '%truss%'
        OR (LOWER(COALESCE(cr.category_name, '')) LIKE '%stage%' AND LOWER(COALESCE(cr.category_name, '')) NOT LIKE '%stage piano%')
        OR LOWER(COALESCE(cr.category_name, '')) LIKE '%staging%'
        OR LOWER(COALESCE(cr.category_name, '')) LIKE '%rigging%'
      ) AS is_stage_truss
    FROM supplier_discounts sd
    JOIN core.supplier_product sp ON sp.supplier_product_id = sd.supplier_product_id
    JOIN cat_resolved cr ON cr.supplier_product_id = sd.supplier_product_id
    ORDER BY is_stage_truss DESC, cr.category_name NULLS LAST, sp.supplier_sku
    LIMIT 500
  `;

  const result = await dbQuery<VerifyRow>(sql, [SUPPLIER_NAME.toLowerCase()]);
  const rows = result.rows;

  if (rows.length === 0) {
    console.log('No Stage One products found. Ensure supplier exists and has products.');
    return;
  }

  const toNum = (v: unknown) => (typeof v === 'number' ? v : Number(v));
  const stageTruss = rows.filter((r) => r.is_stage_truss);
  const other = rows.filter((r) => !r.is_stage_truss);

  const stageTrussCorrect = stageTruss.filter((r) => toNum(r.base_discount) === 0);
  const stageTrussWrong = stageTruss.filter((r) => toNum(r.base_discount) !== 0);
  const otherWithTen = other.filter((r) => toNum(r.base_discount) === 10);
  const otherNotTen = other.filter((r) => toNum(r.base_discount) !== 10);

  console.log(`Stage One products sampled: ${rows.length}`);
  console.log(`  Stage/Truss categories: ${stageTruss.length} (expected base_discount = 0)`);
  console.log(`  Other categories: ${other.length} (expected base_discount = 10)\n`);

  if (stageTrussWrong.length > 0) {
    console.log('FAIL: Stage/Truss products with non-zero discount:');
    stageTrussWrong.slice(0, 10).forEach((r) => {
      console.log(`  ${r.supplier_sku} | ${r.category_name ?? '(null)'} | base_discount=${toNum(r.base_discount)}`);
    });
    if (stageTrussWrong.length > 10) console.log(`  ... and ${stageTrussWrong.length - 10} more`);
    console.log('');
  }

  if (otherNotTen.length > 0) {
    console.log('INFO: Other-category products with discount != 10 (may be SKU/brand/category rules):');
    otherNotTen.slice(0, 5).forEach((r) => {
      console.log(`  ${r.supplier_sku} | ${r.category_name ?? '(null)'} | base_discount=${toNum(r.base_discount)}`);
    });
    if (otherNotTen.length > 5) console.log(`  ... and ${otherNotTen.length - 5} more`);
    console.log('');
  }

  console.log(`Stage/Truss with 0% discount: ${stageTrussCorrect.length}/${stageTruss.length}`);
  console.log(`Other with 10% discount: ${otherWithTen.length}/${other.length}`);

  const pass = stageTrussWrong.length === 0;
  if (pass) {
    console.log('\nVerification passed: all Stage/Truss products have 0% base discount.');
  } else {
    console.log('\nVerification failed: some Stage/Truss products have non-zero discount.');
    process.exit(1);
  }

  console.log('\nFor full e2e check, call GET /api/catalog/products?supplier_id=<Stage One id> and confirm Stage/Truss rows show Base Discount 0%.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
