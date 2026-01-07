#!/usr/bin/env bun
/**
 * Diagnose Active Music Distribution data issues
 */

import { query } from '../../src/lib/database/unified-connection';

const SUPPLIER_ID = '146836e6-706a-4cda-b415-8da00b138c96';

async function diagnose() {
  console.log('='.repeat(70));
  console.log('ACTIVE MUSIC DISTRIBUTION - DATA DIAGNOSIS');
  console.log('='.repeat(70));

  // 1. Check supplier config
  console.log('\n1. SUPPLIER CONFIGURATION');
  const supplierResult = await query<{
    name: string;
    plusportal_enabled: boolean;
    plusportal_username: string | null;
    plusportal_last_sync: Date | null;
  }>(
    `SELECT name, 
            COALESCE(plusportal_enabled, false) as plusportal_enabled,
            plusportal_username,
            plusportal_last_sync
     FROM core.supplier 
     WHERE supplier_id = $1`,
    [SUPPLIER_ID]
  );
  
  if (supplierResult.rows.length > 0) {
    const s = supplierResult.rows[0];
    console.log(`   Name: ${s.name}`);
    console.log(`   PlusPortal Enabled: ${s.plusportal_enabled}`);
    console.log(`   PlusPortal Username: ${s.plusportal_username || 'NOT SET'}`);
    console.log(`   Last Sync: ${s.plusportal_last_sync || 'NEVER'}`);
  }

  // 2. Check sync logs
  console.log('\n2. RECENT SYNC LOGS');
  const syncLogs = await query<{
    log_id: string;
    status: string;
    sync_started_at: Date;
    sync_completed_at: Date | null;
    products_processed: number;
    products_created: number;
    products_updated: number;
    errors: unknown;
  }>(
    `SELECT log_id, status, sync_started_at, sync_completed_at, 
            products_processed, products_created, products_updated, errors
     FROM core.plusportal_sync_log
     WHERE supplier_id = $1
     ORDER BY sync_started_at DESC
     LIMIT 5`,
    [SUPPLIER_ID]
  );
  
  if (syncLogs.rows.length === 0) {
    console.log('   ❌ NO SYNC LOGS FOUND - sync has never run');
  } else {
    for (const log of syncLogs.rows) {
      const status = log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '⏳';
      console.log(`   ${status} ${log.sync_started_at} - ${log.status}`);
      console.log(`      Processed: ${log.products_processed}, Created: ${log.products_created}, Updated: ${log.products_updated}`);
      if (log.errors) {
        console.log(`      Errors: ${JSON.stringify(log.errors).substring(0, 100)}...`);
      }
    }
  }

  // 3. Check product data
  console.log('\n3. PRODUCT DATA ANALYSIS');
  const productStats = await query<{
    total: string;
    with_attrs: string;
    with_stock_quantity: string;
    with_cost_excluding: string;
    with_price_history: string;
    with_stock_on_hand: string;
  }>(
    `SELECT 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE attrs_json IS NOT NULL AND attrs_json != '{}'::jsonb) as with_attrs,
       COUNT(*) FILTER (WHERE (attrs_json->>'stock_quantity') IS NOT NULL) as with_stock_quantity,
       COUNT(*) FILTER (WHERE (attrs_json->>'cost_excluding') IS NOT NULL) as with_cost_excluding,
       (SELECT COUNT(DISTINCT sp.supplier_product_id) 
        FROM core.supplier_product sp
        JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id
        WHERE sp.supplier_id = $1 AND ph.is_current = true) as with_price_history,
       (SELECT COUNT(DISTINCT sp.supplier_product_id) 
        FROM core.supplier_product sp
        JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
        WHERE sp.supplier_id = $1) as with_stock_on_hand
     FROM core.supplier_product
     WHERE supplier_id = $1`,
    [SUPPLIER_ID]
  );
  
  const stats = productStats.rows[0];
  console.log(`   Total products: ${stats.total}`);
  console.log(`   With attrs_json data: ${stats.with_attrs}`);
  console.log(`   With stock_quantity in attrs: ${stats.with_stock_quantity}`);
  console.log(`   With cost_excluding in attrs: ${stats.with_cost_excluding}`);
  console.log(`   With price_history records: ${stats.with_price_history}`);
  console.log(`   With stock_on_hand records: ${stats.with_stock_on_hand}`);

  // 4. Sample attrs_json
  console.log('\n4. SAMPLE ATTRS_JSON CONTENT');
  const sampleProducts = await query<{
    supplier_sku: string;
    name_from_supplier: string;
    attrs_json: Record<string, unknown>;
  }>(
    `SELECT supplier_sku, name_from_supplier, attrs_json
     FROM core.supplier_product
     WHERE supplier_id = $1 AND attrs_json IS NOT NULL
     ORDER BY RANDOM()
     LIMIT 5`,
    [SUPPLIER_ID]
  );
  
  for (const p of sampleProducts.rows) {
    console.log(`   SKU: ${p.supplier_sku}`);
    console.log(`   Name: ${p.name_from_supplier}`);
    const keys = Object.keys(p.attrs_json || {});
    console.log(`   attrs_json keys: ${keys.join(', ') || 'EMPTY'}`);
    if (p.attrs_json) {
      console.log(`   stock_quantity: ${p.attrs_json.stock_quantity ?? 'NOT SET'}`);
      console.log(`   cost_excluding: ${p.attrs_json.cost_excluding ?? 'NOT SET'}`);
    }
    console.log('   ---');
  }

  // 5. Check if there's data in the original downloaded CSV location
  console.log('\n5. DIAGNOSIS SUMMARY');
  const issues: string[] = [];
  
  if (!supplierResult.rows[0]?.plusportal_username) {
    issues.push('PlusPortal username not configured');
  }
  if (syncLogs.rows.length === 0) {
    issues.push('No sync has ever been run');
  } else if (syncLogs.rows[0].status === 'failed') {
    issues.push('Last sync failed');
  }
  if (parseInt(stats.with_stock_quantity) === 0) {
    issues.push('No products have stock_quantity in attrs_json');
  }
  if (parseInt(stats.with_cost_excluding) === 0) {
    issues.push('No products have cost_excluding in attrs_json');
  }
  if (parseInt(stats.with_price_history) === 0) {
    issues.push('No products have price_history records');
  }
  
  if (issues.length === 0) {
    console.log('   ✅ No major issues found');
  } else {
    console.log('   ❌ ISSUES FOUND:');
    for (const issue of issues) {
      console.log(`      - ${issue}`);
    }
  }

  console.log('\n' + '='.repeat(70));
}

diagnose()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });



