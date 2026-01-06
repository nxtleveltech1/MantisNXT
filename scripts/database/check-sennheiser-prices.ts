#!/usr/bin/env bun
import { query } from '../../src/lib/database/unified-connection';

async function check() {
  console.log('Checking Sennheiser price data...\n');
  
  // Check sample products with price_before_discount_ex_vat
  const result = await query<{ supplier_sku: string; attrs_json: Record<string, unknown> }>(
    `SELECT supplier_sku, attrs_json 
     FROM core.supplier_product 
     WHERE supplier_id = '5d79d50f-70ba-4150-a762-8b62bb177c64' 
     AND attrs_json IS NOT NULL 
     LIMIT 10`
  );
  
  console.log('Sample Sennheiser products:');
  for (const r of result.rows) {
    const attrs = r.attrs_json || {};
    console.log('SKU:', r.supplier_sku);
    console.log('  price_before_discount_ex_vat:', attrs.price_before_discount_ex_vat ?? 'NOT SET');
    console.log('  cost_excluding:', attrs.cost_excluding ?? 'NOT SET');
    console.log('---');
  }
  
  // Check how many have the price field
  const countResult = await query<{ with_price: string; without_price: string }>(
    `SELECT 
       COUNT(*) FILTER (WHERE (attrs_json->>'price_before_discount_ex_vat') IS NOT NULL) as with_price,
       COUNT(*) FILTER (WHERE (attrs_json->>'price_before_discount_ex_vat') IS NULL) as without_price
     FROM core.supplier_product 
     WHERE supplier_id = '5d79d50f-70ba-4150-a762-8b62bb177c64'`
  );
  
  console.log('\nSennheiser price field stats:');
  console.log('  With price_before_discount_ex_vat:', countResult.rows[0].with_price);
  console.log('  Without price_before_discount_ex_vat:', countResult.rows[0].without_price);
  
  // Check price_history
  const priceHistoryResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM core.price_history ph
     JOIN core.supplier_product sp ON sp.supplier_product_id = ph.supplier_product_id
     WHERE sp.supplier_id = '5d79d50f-70ba-4150-a762-8b62bb177c64' AND ph.is_current = true`
  );
  
  console.log('  Products with current price in price_history:', priceHistoryResult.rows[0].count);
  
  process.exit(0);
}

check().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

