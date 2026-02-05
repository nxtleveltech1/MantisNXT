#!/usr/bin/env bun
/**
 * Test the discount query directly
 */

import { query } from '@/lib/database';

async function main() {
  console.log('🔍 Testing Discount Query\n');

  const sql = `
    WITH supplier_discounts AS (
      SELECT 
        sp.supplier_product_id,
        sp.supplier_sku,
        sp.attrs_json->>'base_discount' as attrs_base_discount,
        s.base_discount_percent as supplier_base_discount,
        COALESCE(
          (sp.attrs_json->>'base_discount')::numeric,
          (sp.attrs_json->>'base_discount_percent')::numeric,
          s.base_discount_percent,
          0
        ) AS calculated_discount
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      WHERE s.name = 'Marshall Music Distributors'
    )
    SELECT 
      supplier_sku,
      attrs_base_discount,
      supplier_base_discount,
      calculated_discount
    FROM supplier_discounts
    WHERE calculated_discount > 0
    ORDER BY supplier_sku
    LIMIT 10
  `;

  const result = await query(sql);
  
  console.log('Products with discounts:');
  console.log(JSON.stringify(result.rows, null, 2));
  
  // Also check what the supplier has set
  const supplierResult = await query(
    `SELECT name, base_discount_percent FROM core.supplier WHERE name = $1`,
    ['Marshall Music Distributors']
  );
  
  console.log('\nSupplier settings:');
  console.log(JSON.stringify(supplierResult.rows, null, 2));
}

if (import.meta.main) {
  main().catch(console.error);
}
