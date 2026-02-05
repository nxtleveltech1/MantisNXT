#!/usr/bin/env bun
/**
 * Fix BC Electronics attrs_json: rename misnamed "base_discount" to "dealer_price"
 * 
 * The original BC Electronics upload stored a PRICE value in attrs_json->base_discount
 * (not a percentage). After the COALESCE reorder for Marshall Music discounts,
 * these price values are being interpreted as discount percentages, causing
 * insane values like 520% in the UI.
 * 
 * Fix: rename base_discount → dealer_price for BC Electronics products only.
 */

import { query } from '@/lib/database';

async function main() {
  const supplierId = 'fcd35140-4d43-4275-977b-56275e6daeb1'; // BC ELECTRONICS

  console.log('🔍 Checking BC Electronics products with base_discount in attrs_json...\n');

  // Count affected products
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM core.supplier_product
     WHERE supplier_id = $1
     AND attrs_json ? 'base_discount'`,
    [supplierId]
  );
  console.log(`Affected products: ${countResult.rows[0].total}`);

  // Show a sample before fix
  const sampleBefore = await query(
    `SELECT supplier_sku, attrs_json->>'base_discount' as base_discount_val, attrs_json->>'cost_excluding' as cost_ex
     FROM core.supplier_product
     WHERE supplier_id = $1
     AND attrs_json ? 'base_discount'
     LIMIT 5`,
    [supplierId]
  );
  console.log('\nBefore fix (sample):');
  for (const row of sampleBefore.rows) {
    console.log(`  ${row.supplier_sku}: base_discount=${row.base_discount_val} (cost_ex=${row.cost_ex}) ← this is a price, NOT a percentage`);
  }

  // Rename base_discount → dealer_price
  // This uses jsonb operators to:
  // 1. Add a new key "dealer_price" with the old value
  // 2. Remove the "base_discount" key
  console.log('\n📝 Renaming base_discount → dealer_price for all BC Electronics products...');
  
  const updateResult = await query(
    `UPDATE core.supplier_product
     SET attrs_json = (attrs_json - 'base_discount') || jsonb_build_object('dealer_price', attrs_json->'base_discount'),
         updated_at = NOW()
     WHERE supplier_id = $1
     AND attrs_json ? 'base_discount'
     RETURNING supplier_sku`,
    [supplierId]
  );
  console.log(`✅ Updated ${updateResult.rowCount} products`);

  // Verify after fix
  const sampleAfter = await query(
    `SELECT 
       supplier_sku, 
       attrs_json->>'dealer_price' as dealer_price,
       attrs_json->>'base_discount' as base_discount,
       attrs_json->>'cost_excluding' as cost_ex
     FROM core.supplier_product
     WHERE supplier_id = $1
     LIMIT 5`,
    [supplierId]
  );
  console.log('\nAfter fix (sample):');
  for (const row of sampleAfter.rows) {
    console.log(`  ${row.supplier_sku}: dealer_price=${row.dealer_price}, base_discount=${row.base_discount || 'null'}, cost_ex=${row.cost_ex}`);
  }

  // Verify COALESCE now returns 0 for BC Electronics
  const coalesceCheck = await query(
    `SELECT 
       sp.supplier_sku,
       sp.attrs_json->>'base_discount' as attrs_bd,
       sp.attrs_json->>'dealer_price' as dealer_price,
       s.base_discount_percent,
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
     LIMIT 5`,
    [supplierId]
  );
  console.log('\nCOALESCE verification:');
  for (const row of coalesceCheck.rows) {
    console.log(`  ${row.supplier_sku}: attrs_bd=${row.attrs_bd || 'null'}, dealer_price=${row.dealer_price}, supplier_discount=${row.base_discount_percent}, calculated=${row.calculated_discount}`);
  }

  console.log('\n✅ Done. BC Electronics discounts should now show 0% (no discount) in the UI.');
}

main().catch(console.error);
