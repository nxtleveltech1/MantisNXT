#!/usr/bin/env bun
/**
 * Generate Active Music Distribution test case with full diagnosis
 */

import { query } from '../../src/lib/database/unified-connection';
import * as fs from 'fs';

const SUPPLIER_ID = '146836e6-706a-4cda-b415-8da00b138c96';

async function generateTestCase() {
  console.log('='.repeat(70));
  console.log('ACTIVE MUSIC DISTRIBUTION - FULL TEST CASE');
  console.log('='.repeat(70));

  // Get all products with all available data sources
  const products = await query<{
    supplier_sku: string;
    name_from_supplier: string;
    attrs_json: Record<string, unknown>;
    current_price: number | null;
    stock_qty: number | null;
  }>(`
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        price
      FROM core.price_history
      WHERE is_current = true
      ORDER BY supplier_product_id, valid_from DESC
    ),
    latest_stock AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        qty
      FROM core.stock_on_hand
      ORDER BY supplier_product_id, as_of_ts DESC
    )
    SELECT 
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.attrs_json,
      cp.price as current_price,
      ls.qty as stock_qty
    FROM core.supplier_product sp
    LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
    WHERE sp.supplier_id = $1 AND sp.is_active = true
    ORDER BY sp.supplier_sku
  `, [SUPPLIER_ID]);

  console.log(`\nTotal products: ${products.rows.length}`);

  // Generate CSV with all data sources
  const headers = ['SKU', 'Product Name', 'SUP SOH', 'Online Sync Price', 'NXT SOH', 'NXT PRICE', 'DATA_SOURCE'];
  const rows: string[] = [headers.join(',')];

  let withSupSoh = 0;
  let withSyncPrice = 0;
  let withNxtSoh = 0;
  let withNxtPrice = 0;

  for (const p of products.rows) {
    const attrs = p.attrs_json || {};
    
    // Try to get SUP SOH from multiple sources
    const supSoh = attrs.stock_quantity ?? attrs.stock_on_hand ?? attrs.stock ?? attrs['Total SOH'] ?? p.stock_qty ?? null;
    
    // Try to get price from multiple sources
    const syncPrice = attrs.cost_excluding ?? attrs.price_before_discount_ex_vat ?? attrs['Price Before Discount Ex Vat'] ?? p.current_price ?? null;
    
    // NXT values (what platform shows)
    const nxtSoh = supSoh;
    const nxtPrice = p.current_price ?? syncPrice ?? null;
    
    // Track which data source provided the data
    const dataSources: string[] = [];
    if (attrs.stock_quantity) dataSources.push('attrs.stock_quantity');
    if (attrs.stock_on_hand) dataSources.push('attrs.stock_on_hand');
    if (p.stock_qty) dataSources.push('stock_on_hand_table');
    if (attrs.cost_excluding) dataSources.push('attrs.cost_excluding');
    if (p.current_price) dataSources.push('price_history');
    
    // Count stats
    if (supSoh !== null) withSupSoh++;
    if (syncPrice !== null) withSyncPrice++;
    if (nxtSoh !== null) withNxtSoh++;
    if (nxtPrice !== null) withNxtPrice++;
    
    const sku = `"${(p.supplier_sku || '').replace(/"/g, '""')}"`;
    const name = `"${(p.name_from_supplier || '').replace(/"/g, '""')}"`;
    const supSohStr = supSoh !== null && !isNaN(Number(supSoh)) ? String(supSoh) : '';
    const syncPriceStr = syncPrice !== null && !isNaN(Number(syncPrice)) ? Number(syncPrice).toFixed(2) : '';
    const nxtSohStr = nxtSoh !== null && !isNaN(Number(nxtSoh)) ? String(nxtSoh) : '';
    const nxtPriceStr = nxtPrice !== null && !isNaN(Number(nxtPrice)) ? Number(nxtPrice).toFixed(2) : '';
    const dataSource = dataSources.join(';') || 'NO_DATA';
    
    rows.push([sku, name, supSohStr, syncPriceStr, nxtSohStr, nxtPriceStr, `"${dataSource}"`].join(','));
  }

  // Write CSV
  const csvContent = rows.join('\n');
  const outputPath = 'active-music-distribution-test-case-2026-01-07-FIXED.csv';
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  
  console.log(`\n✅ CSV saved to: ${outputPath}`);
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('DATA SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Products: ${products.rows.length}`);
  console.log(`With SUP SOH: ${withSupSoh} (${((withSupSoh / products.rows.length) * 100).toFixed(1)}%)`);
  console.log(`With Online Sync Price: ${withSyncPrice} (${((withSyncPrice / products.rows.length) * 100).toFixed(1)}%)`);
  console.log(`With NXT SOH: ${withNxtSoh} (${((withNxtSoh / products.rows.length) * 100).toFixed(1)}%)`);
  console.log(`With NXT Price: ${withNxtPrice} (${((withNxtPrice / products.rows.length) * 100).toFixed(1)}%)`);
  
  console.log('\n' + '='.repeat(70));
  console.log('DIAGNOSIS');
  console.log('='.repeat(70));
  
  const missingPct = ((products.rows.length - withSupSoh) / products.rows.length) * 100;
  if (missingPct > 50) {
    console.log('❌ CRITICAL: Over 50% of products have NO stock/price data');
    console.log('   CAUSE: PlusPortal syncs have been FAILING');
    console.log('   ERROR: "CSV button not found on the page"');
    console.log('   FIX: Need to run successful PlusPortal sync to import data');
  }
  
  console.log('\n' + '='.repeat(70));
}

generateTestCase()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });




