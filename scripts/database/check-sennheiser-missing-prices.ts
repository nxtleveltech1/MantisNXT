#!/usr/bin/env bun
import { query } from '../../src/lib/database/unified-connection';

async function check() {
  console.log('Checking Sennheiser products WITHOUT price_before_discount_ex_vat...\n');
  
  // Check products without the attrs_json price field
  const result = await query<{ 
    supplier_sku: string; 
    attrs_json: Record<string, unknown>;
    price: number | null;
  }>(
    `SELECT sp.supplier_sku, sp.attrs_json, ph.price
     FROM core.supplier_product sp
     LEFT JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id AND ph.is_current = true
     WHERE sp.supplier_id = '5d79d50f-70ba-4150-a762-8b62bb177c64' 
     AND (sp.attrs_json->>'price_before_discount_ex_vat') IS NULL
     LIMIT 10`
  );
  
  console.log('Sample products WITHOUT attrs_json price but WITH price_history:');
  for (const r of result.rows) {
    const attrs = r.attrs_json || {};
    const attrKeys = Object.keys(attrs);
    console.log('SKU:', r.supplier_sku);
    console.log('  price_history price:', r.price);
    console.log('  attrs_json keys:', attrKeys.join(', '));
    // Check for any price-related key in attrs
    for (const key of attrKeys) {
      if (key.toLowerCase().includes('price') || key.toLowerCase().includes('cost')) {
        console.log(`  ${key}:`, attrs[key]);
      }
    }
    console.log('---');
  }
  
  process.exit(0);
}

check().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

