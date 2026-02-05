#!/usr/bin/env bun
/**
 * Verify Base Discounts in Database
 */

import { query } from '@/lib/database';

async function main() {
  console.log('🔍 Verifying Base Discounts in Database\n');

  // Check Marshall Music Distributors products
  const result = await query<{
    supplier_sku: string;
    name: string;
    attrs_json: Record<string, unknown>;
    base_discount: string | null;
  }>(
    `SELECT 
      sp.supplier_sku,
      sp.name_from_supplier as name,
      sp.attrs_json,
      sp.attrs_json->>'base_discount' as base_discount
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    WHERE s.name = $1
    ORDER BY sp.supplier_sku
    LIMIT 20`,
    ['Marshall Music Distributors']
  );

  console.log(`Found ${result.rows.length} products:\n`);

  let discountCount = 0;
  result.rows.forEach((row, idx) => {
    const discount = row.attrs_json?.base_discount || row.attrs_json?.base_discount_percent;
    if (discount) {
      discountCount++;
      console.log(`${idx + 1}. ${row.supplier_sku}: ${row.name}`);
      console.log(`   base_discount: ${row.attrs_json?.base_discount}`);
      console.log(`   base_discount_percent: ${row.attrs_json?.base_discount_percent}`);
      console.log(`   attrs_json keys: ${Object.keys(row.attrs_json || {}).join(', ')}\n`);
    }
  });

  console.log(`\n✅ Products with discounts: ${discountCount}/${result.rows.length}`);

  // Check total count
  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    WHERE s.name = $1
      AND (sp.attrs_json->>'base_discount' IS NOT NULL 
           OR sp.attrs_json->>'base_discount_percent' IS NOT NULL)`,
    ['Marshall Music Distributors']
  );

  console.log(`\n📊 Total products with discounts: ${totalResult.rows[0]?.count || 0}`);
}

if (import.meta.main) {
  main().catch(console.error);
}
