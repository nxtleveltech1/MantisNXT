#!/usr/bin/env bun
/**
 * Test the product API query for a specific product ID
 */

import { query } from '../../src/lib/database/unified-connection';

const productId = process.argv[2] || 'b2f72543-27a0-4411-ac19-76729e07236e';

async function testProductQuery() {
  console.log(`Testing product query for: ${productId}\n`);

  // First, check if product exists
  const existsResult = await query<{ supplier_product_id: string; supplier_sku: string; name_from_supplier: string }>(
    `SELECT supplier_product_id, supplier_sku, name_from_supplier 
     FROM core.supplier_product 
     WHERE supplier_product_id = $1`,
    [productId]
  );

  if (existsResult.rows.length === 0) {
    console.log('❌ Product NOT FOUND');
    
    // Check if it's a valid UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(productId)) {
      console.log('   Invalid UUID format');
    }
    
    // Search for similar products
    const similar = await query<{ supplier_product_id: string; supplier_sku: string }>(
      `SELECT supplier_product_id, supplier_sku 
       FROM core.supplier_product 
       LIMIT 5`
    );
    console.log('\nSample valid product IDs:');
    for (const p of similar.rows) {
      console.log(`  ${p.supplier_product_id} - ${p.supplier_sku}`);
    }
    
    process.exit(1);
  }

  console.log('✅ Product found:');
  console.log(`  SKU: ${existsResult.rows[0].supplier_sku}`);
  console.log(`  Name: ${existsResult.rows[0].name_from_supplier}`);

  // Now test the full API query
  console.log('\nTesting full API query...');
  
  try {
    const sql = `
      WITH current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency,
          valid_from
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      ),
      latest_stock AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          qty AS qty_on_hand,
          as_of_ts
        FROM core.stock_on_hand
        ORDER BY supplier_product_id, as_of_ts DESC
      )
      SELECT
        sp.supplier_product_id,
        sp.supplier_sku,
        sp.name_from_supplier,
        s.name AS supplier_name,
        cp.price AS current_price,
        ls.qty_on_hand
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
      WHERE sp.supplier_product_id = $1
      LIMIT 1
    `;
    
    const result = await query<unknown>(sql, [productId]);
    console.log('✅ Query succeeded');
    console.log('Result:', JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.log('❌ Query failed:', error);
  }

  process.exit(0);
}

testProductQuery().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

