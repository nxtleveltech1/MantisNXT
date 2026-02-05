#!/usr/bin/env bun
/**
 * Update Audiosure products with 34% base discount
 */

import { query } from '@/lib/database';

async function main() {
  console.log('🔍 Finding Audiosure supplier...\n');

  // Find Audiosure supplier
  const supplierResult = await query<{ supplier_id: string; name: string; base_discount_percent: number }>(
    `SELECT supplier_id, name, base_discount_percent 
     FROM core.supplier 
     WHERE LOWER(name) LIKE '%audiosure%'`
  );

  if (supplierResult.rows.length === 0) {
    console.log('❌ Audiosure supplier not found');
    return;
  }

  const supplier = supplierResult.rows[0];
  console.log(`✅ Found: ${supplier.name} (ID: ${supplier.supplier_id})`);
  console.log(`   Current base_discount_percent: ${supplier.base_discount_percent || 0}%`);

  // Count products
  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) as total FROM core.supplier_product WHERE supplier_id = $1`,
    [supplier.supplier_id]
  );
  const productCount = parseInt(countResult.rows[0].total);
  console.log(`   Products: ${productCount}\n`);

  if (productCount === 0) {
    console.log('❌ No products to update');
    return;
  }

  // Update all Audiosure products with 34% base discount in attrs_json
  console.log('📝 Updating all products with 34% base discount...\n');

  const updateResult = await query(
    `UPDATE core.supplier_product
     SET attrs_json = COALESCE(attrs_json, '{}'::jsonb) || '{"base_discount": 34, "base_discount_percent": 34}'::jsonb,
         updated_at = NOW()
     WHERE supplier_id = $1
     RETURNING supplier_sku`,
    [supplier.supplier_id]
  );

  console.log(`✅ Updated ${updateResult.rowCount} products with 34% base discount`);

  // Verify a sample
  const sampleResult = await query<{ supplier_sku: string; attrs_json: Record<string, unknown> }>(
    `SELECT supplier_sku, attrs_json 
     FROM core.supplier_product 
     WHERE supplier_id = $1 
     LIMIT 5`,
    [supplier.supplier_id]
  );

  console.log('\n📊 Sample products after update:');
  for (const row of sampleResult.rows) {
    console.log(`   ${row.supplier_sku}: base_discount = ${row.attrs_json?.base_discount}%`);
  }

  console.log('\n✅ Done! Refresh the Supplier Inventory Portfolio page to see the discounts.');
}

main().catch(console.error);
