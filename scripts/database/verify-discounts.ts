#!/usr/bin/env bun
import { query } from '@/lib/database';

async function main() {
  const result = await query<{
    supplier_sku: string;
    name_from_supplier: string;
    base_discount: string;
    base_discount_percent: string;
  }>(
    `SELECT 
      supplier_sku, 
      name_from_supplier, 
      attrs_json->>'base_discount' as base_discount,
      attrs_json->>'base_discount_percent' as base_discount_percent
    FROM core.supplier_product 
    WHERE supplier_id = (
      SELECT supplier_id FROM core.supplier WHERE name = $1 LIMIT 1
    ) 
    AND attrs_json->>'base_discount' IS NOT NULL 
    LIMIT 20`,
    ['Marshall Music Distributors']
  );

  console.log(`Found ${result.rows.length} products with base discounts:\n`);
  result.rows.forEach(row => {
    console.log(`SKU: ${row.supplier_sku}`);
    console.log(`  Name: ${row.name_from_supplier}`);
    console.log(`  Base Discount: ${row.base_discount}%`);
    console.log('');
  });
}

if (import.meta.main) {
  main().catch(console.error);
}
