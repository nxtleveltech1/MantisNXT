import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function runDiagnostics() {
  console.log('🔍 Running database diagnostics...\n');

  try {
    // Check core tables
    const tables = [
      'core.supplier',
      'core.supplier_product',
      'core.stock_on_hand',
      'core.product',
      'core.price_history',
    ];

    console.log('📊 Table Row Counts:');
    console.log('─'.repeat(50));

    for (const table of tables) {
      const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0].count;
      const status = count === '0' ? '❌' : '✅';
      console.log(`${status} ${table.padEnd(30)} ${count} rows`);
    }

    console.log('\n📋 Supplier Details:');
    console.log('─'.repeat(50));
    const suppliers = await query(`
      SELECT supplier_id, name, code, active
      FROM core.supplier
      ORDER BY name
    `);

    for (const supplier of suppliers.rows) {
      console.log(
        `  ${supplier.active ? '✅' : '❌'} ${supplier.name} (${supplier.code || 'no code'}) - ID: ${supplier.supplier_id}`
      );
    }

    console.log('\n🔗 Supplier Products:');
    console.log('─'.repeat(50));
    const supplierProducts = await query(`
      SELECT sp.supplier_product_id, sp.supplier_sku, sp.name_from_supplier, s.name as supplier_name
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LIMIT 10
    `);

    if (supplierProducts.rows.length === 0) {
      console.log('  ❌ NO SUPPLIER PRODUCTS FOUND - This explains why inventory is empty!');
    } else {
      for (const product of supplierProducts.rows) {
        console.log(
          `  ✅ ${product.supplier_name}: ${product.supplier_sku} - ${product.name_from_supplier}`
        );
      }
    }

    console.log('\n📦 Stock On Hand:');
    console.log('─'.repeat(50));
    const stock = await query(`
      SELECT soh.soh_id, soh.qty, sp.supplier_sku, s.name as supplier_name
      FROM core.stock_on_hand soh
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LIMIT 10
    `);

    if (stock.rows.length === 0) {
      console.log('  ❌ NO STOCK ON HAND RECORDS - This explains why inventory shows zero!');
    } else {
      for (const item of stock.rows) {
        console.log(`  ✅ ${item.supplier_name}: ${item.supplier_sku} - Qty: ${item.qty}`);
      }
    }

    console.log('\n✅ Diagnostics complete!');
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    process.exit(1);
  }

  process.exit(0);
}

runDiagnostics();
