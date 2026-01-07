#!/usr/bin/env bun
import 'dotenv/config';
import { query } from '../src/lib/database/unified-connection';

async function analyze() {
  // Find the Sennheiser supplier
  const supplier = await query<{ supplier_id: string; name: string; code: string }>(
    `SELECT supplier_id, name, code FROM core.supplier WHERE LOWER(name) LIKE $1`,
    ['%sennheiser%']
  );
  
  console.log('Sennheiser Supplier:', JSON.stringify(supplier.rows, null, 2));
  
  if (supplier.rows.length > 0) {
    const supplierId = supplier.rows[0].supplier_id;
    
    // Count products by SKU prefix for this supplier
    const prefixCounts = await query<{ sku_prefix: string; count: string }>(
      `SELECT 
        SPLIT_PART(supplier_sku, '-', 1) AS sku_prefix,
        COUNT(*) as count
      FROM core.supplier_product
      WHERE supplier_id = $1 AND is_active = true
      GROUP BY SPLIT_PART(supplier_sku, '-', 1)
      ORDER BY count DESC
      LIMIT 30`,
      [supplierId]
    );
    
    console.log('\nProducts by SKU prefix for Sennheiser supplier:');
    console.log(JSON.stringify(prefixCounts.rows, null, 2));
    
    // Total count
    const total = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM core.supplier_product WHERE supplier_id = $1 AND is_active = true`,
      [supplierId]
    );
    
    console.log('\nTotal active products:', total.rows[0].total);
    
    // Sample products with non-SEN/NEM prefixes
    const nonSennheiser = await query<{ sku: string; name: string }>(
      `SELECT supplier_sku as sku, name_from_supplier as name
       FROM core.supplier_product
       WHERE supplier_id = $1 
         AND is_active = true
         AND supplier_sku NOT LIKE 'SEN-%'
         AND supplier_sku NOT LIKE 'NEM-%'
         AND supplier_sku NOT LIKE 'SON-%'
         AND supplier_sku NOT LIKE 'VAR-%'
         AND supplier_sku NOT LIKE 'NIC-%'
         AND supplier_sku NOT LIKE 'AVA-%'
         AND supplier_sku NOT LIKE 'SP-%'
         AND supplier_sku NOT LIKE 'ADP-%'
       ORDER BY supplier_sku
       LIMIT 20`,
      [supplierId]
    );
    
    console.log('\nSample UNRELATED products linked to Sennheiser:');
    console.log(JSON.stringify(nonSennheiser.rows, null, 2));
    console.log('Count of unrelated:', nonSennheiser.rows.length);
  }
}

analyze().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

