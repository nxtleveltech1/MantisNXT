#!/usr/bin/env bun
/**
 * Investigate RubiQube/BC Electronics discount anomalies
 * 
 * Schema: supplier_product has columns:
 * supplier_product_id, supplier_id, supplier_sku, product_id, name_from_supplier,
 * uom, pack_size, barcode, first_seen_at, last_seen_at, is_active, is_new,
 * category_id, attrs_json, created_at, updated_at, stock_status, new_stock_eta
 * 
 * Prices and discounts are stored in attrs_json
 */

import { query } from '@/lib/database';

async function main() {
  console.log('🔍 Investigating RubiQube / BC Electronics discounts\n');

  const supplierId = 'fcd35140-4d43-4275-977b-56275e6daeb1'; // BC ELECTRONICS

  // 1. Sample RUBIQUBE products with full attrs_json
  const productsResult = await query(
    `SELECT 
       supplier_sku,
       name_from_supplier,
       attrs_json,
       updated_at
     FROM core.supplier_product
     WHERE supplier_id = $1
     AND supplier_sku LIKE '%RUB%'
     ORDER BY supplier_sku
     LIMIT 20`,
    [supplierId]
  );

  console.log('=== RUBIQUBE PRODUCTS ===');
  for (const row of productsResult.rows) {
    console.log(`\n  ${row.supplier_sku}: "${row.name_from_supplier}"`);
    console.log(`    attrs_json: ${JSON.stringify(row.attrs_json)}`);
    console.log(`    updated: ${row.updated_at}`);
  }

  // 2. Count products with discount keys in attrs_json
  const discountCountResult = await query(
    `SELECT 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE attrs_json ? 'base_discount') as with_base_discount,
       COUNT(*) FILTER (WHERE attrs_json ? 'base_discount_percent') as with_base_discount_pct,
       COUNT(*) FILTER (WHERE attrs_json ? 'cost_excluding') as with_cost_ex,
       COUNT(*) FILTER (WHERE attrs_json ? 'cost_inc_vat') as with_cost_inc
     FROM core.supplier_product
     WHERE supplier_id = $1`,
    [supplierId]
  );
  console.log('\n=== BC ELECTRONICS PRODUCT COUNTS ===');
  console.log(JSON.stringify(discountCountResult.rows[0], null, 2));

  // 3. Check discount rules
  const rulesResult = await query(
    `SELECT * FROM core.supplier_discount_rule WHERE supplier_id = $1`,
    [supplierId]
  );
  console.log('\n=== DISCOUNT RULES FOR BC ELECTRONICS ===');
  console.log(`Count: ${rulesResult.rows.length}`);
  if (rulesResult.rows.length > 0) {
    console.log(JSON.stringify(rulesResult.rows, null, 2));
  }

  // 4. Supplier profile
  const profileResult = await query(
    `SELECT * FROM core.supplier_profile WHERE supplier_id = $1`,
    [supplierId]
  );
  console.log('\n=== SUPPLIER PROFILE ===');
  console.log(`Count: ${profileResult.rows.length}`);
  if (profileResult.rows.length > 0) {
    for (const row of profileResult.rows) {
      console.log(JSON.stringify(row, null, 2));
    }
  }

  // 5. Now check what the catalog API endpoint actually queries
  // Read the actual API route to understand the full query
  const apiResult = await query(
    `WITH supplier_discounts AS (
       SELECT 
         sp.supplier_product_id,
         sp.supplier_sku,
         sp.name_from_supplier,
         sp.attrs_json,
         sp.attrs_json->>'base_discount' as product_attrs_discount,
         sp.attrs_json->>'cost_excluding' as cost_excluding,
         sp.attrs_json->>'cost_inc_vat' as cost_inc_vat,
         s.base_discount_percent as supplier_level_discount,
         COALESCE(
           (sp.attrs_json->>'base_discount')::numeric,
           (sp.attrs_json->>'base_discount_percent')::numeric,
           s.base_discount_percent,
           0
         ) AS calculated_discount
       FROM core.supplier_product sp
       JOIN core.supplier s ON s.supplier_id = sp.supplier_id
       WHERE sp.supplier_id = $1
       AND sp.supplier_sku LIKE '%RUB%'
     )
     SELECT *
     FROM supplier_discounts
     ORDER BY supplier_sku
     LIMIT 15`,
    [supplierId]
  );

  console.log('\n=== API SIMULATION FOR RUBIQUBE PRODUCTS ===');
  for (const row of apiResult.rows) {
    console.log(`\n  ${row.supplier_sku}: "${row.name_from_supplier}"`);
    console.log(`    cost_excluding: ${row.cost_excluding || 'null'}`);
    console.log(`    cost_inc_vat: ${row.cost_inc_vat || 'null'}`);
    console.log(`    product_attrs_discount: ${row.product_attrs_discount || 'null'}`);
    console.log(`    supplier_level_discount: ${row.supplier_level_discount}`);
    console.log(`    calculated_discount: ${row.calculated_discount}`);
  }

  // 6. Check upload history for BC Electronics
  const uploadHistory = await query(
    `SELECT 
       upload_id,
       supplier_id,
       file_name,
       status,
       row_count,
       created_at
     FROM spp.pricelist_upload
     WHERE supplier_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [supplierId]
  );

  console.log('\n=== UPLOAD HISTORY ===');
  console.log(JSON.stringify(uploadHistory.rows, null, 2));

  // 7. Check if there are pricelist_rows with discounts for any of BC ELECTRONICS uploads
  if (uploadHistory.rows.length > 0) {
    for (const upload of uploadHistory.rows) {
      const prRows = await query(
        `SELECT 
           supplier_sku,
           cost_price,
           attrs_json
         FROM spp.pricelist_row
         WHERE upload_id = $1
         AND supplier_sku LIKE '%RUB%'
         LIMIT 5`,
        [upload.upload_id]
      );
      console.log(`\n  Upload ${upload.upload_id} (${upload.file_name}, ${upload.created_at}):`);
      for (const r of prRows.rows) {
        console.log(`    ${r.supplier_sku}: cost=${r.cost_price}, attrs=${JSON.stringify(r.attrs_json)}`);
      }
    }
  }
}

main().catch(console.error);
