#!/usr/bin/env bun
import { Client } from 'pg';

const client = new Client({ 
  connectionString: process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL 
});

await client.connect();

// Check Celto brand
const brandResult = await client.query(
  "SELECT id, name FROM public.brand WHERE UPPER(TRIM(name)) LIKE '%CELTO%'"
);
console.log('Celto brands:', JSON.stringify(brandResult.rows, null, 2));

// Check discount rule
const ruleResult = await client.query(
  `SELECT dr.discount_rule_id, dr.rule_name, dr.discount_percent, dr.scope_type, b.name as brand_name
   FROM core.supplier_discount_rules dr
   JOIN public.brand b ON b.id = dr.brand_id
   WHERE dr.supplier_id = 'fcd35140-4d43-4275-977b-56275e6daeb1'
     AND dr.scope_type = 'brand'`
);
console.log('\nDiscount rules:', JSON.stringify(ruleResult.rows, null, 2));

// Check a sample product brand
const productResult = await client.query(
  `SELECT supplier_sku, attrs_json->>'brand' as brand
   FROM core.supplier_product
   WHERE supplier_id = 'fcd35140-4d43-4275-977b-56275e6daeb1'
     AND supplier_sku LIKE 'SPECEL%'
   LIMIT 5`
);
console.log('\nSample products:', JSON.stringify(productResult.rows, null, 2));

await client.end();
