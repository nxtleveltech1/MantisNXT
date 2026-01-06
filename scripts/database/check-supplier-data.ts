#!/usr/bin/env bun
/**
 * Check what data exists for each supplier
 */

import { query } from '../../src/lib/database/unified-connection';

const suppliers = [
  { name: 'Stage Audio Works', id: 'f56fb431-a128-4152-b164-7996baa0c8d5' },
  { name: 'Sennheiser', id: '5d79d50f-70ba-4150-a762-8b62bb177c64' },
  { name: 'AV Distribution', id: '63a205bd-2890-458b-b19e-6ef836f011e7' },
  { name: 'Active Music Distribution', id: '8e912e1e-2456-41ce-ab6d-1c60e51f82d0' },
];

async function checkSupplierData() {
  console.log('='.repeat(70));
  console.log('SUPPLIER DATA CHECK');
  console.log('='.repeat(70));
  
  for (const s of suppliers) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`SUPPLIER: ${s.name}`);
    console.log(`ID: ${s.id}`);
    console.log('='.repeat(50));
    
    // Count products
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1`,
      [s.id]
    );
    console.log(`Total products: ${countResult.rows[0].count}`);
    
    // Check sample attrs_json
    const sampleResult = await query<{
      supplier_sku: string;
      name_from_supplier: string;
      attrs_json: Record<string, unknown>;
    }>(
      `SELECT supplier_sku, name_from_supplier, attrs_json
       FROM core.supplier_product 
       WHERE supplier_id = $1 AND attrs_json IS NOT NULL AND attrs_json != '{}'::jsonb
       LIMIT 3`,
      [s.id]
    );
    
    console.log(`\nSample products with attrs_json (${sampleResult.rows.length} found):`);
    for (const row of sampleResult.rows) {
      console.log(`  SKU: ${row.supplier_sku}`);
      const keys = Object.keys(row.attrs_json || {});
      console.log(`  attrs_json keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
      console.log(`  stock_quantity: ${row.attrs_json?.stock_quantity ?? 'NOT SET'}`);
      console.log(`  stock_on_hand: ${row.attrs_json?.stock_on_hand ?? 'NOT SET'}`);
      console.log(`  stock: ${row.attrs_json?.stock ?? 'NOT SET'}`);
      console.log(`  cost_excluding: ${row.attrs_json?.cost_excluding ?? 'NOT SET'}`);
      console.log(`  cost_ex_vat: ${row.attrs_json?.cost_ex_vat ?? 'NOT SET'}`);
      console.log('  ---');
    }
    
    // Check price_history
    const priceResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM core.price_history ph
       JOIN core.supplier_product sp ON sp.supplier_product_id = ph.supplier_product_id
       WHERE sp.supplier_id = $1 AND ph.is_current = true`,
      [s.id]
    );
    console.log(`\nProducts with current price: ${priceResult.rows[0].count}`);
    
    // Check stock_on_hand table
    const stockResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM core.stock_on_hand soh
       JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
       WHERE sp.supplier_id = $1`,
      [s.id]
    );
    console.log(`Products with stock_on_hand records: ${stockResult.rows[0].count}`);
    
    // Check plusportal sync logs
    const syncResult = await query<{
      status: string;
      products_processed: number;
      products_created: number;
      products_updated: number;
      sync_started_at: Date;
    }>(
      `SELECT status, products_processed, products_created, products_updated, sync_started_at
       FROM core.plusportal_sync_log
       WHERE supplier_id = $1
       ORDER BY sync_started_at DESC
       LIMIT 3`,
      [s.id]
    );
    
    console.log(`\nRecent sync logs (${syncResult.rows.length}):`);
    for (const log of syncResult.rows) {
      console.log(`  ${log.sync_started_at}: ${log.status} - processed: ${log.products_processed}, created: ${log.products_created}, updated: ${log.products_updated}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('CHECK COMPLETE');
  console.log('='.repeat(70));
}

checkSupplierData()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });

