#!/usr/bin/env node

/**
 * SIMPLE WORKING IMPLEMENTATION
 * Process ONE file properly to get actual data in the system
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const XLSX = require('xlsx');

// Production database connection
const pool = new Pool({
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  ssl: false,
  max: 10,
});

async function processApexPro() {
  console.log('🚀 Processing ApexPro Distribution - ACTUAL IMPLEMENTATION');

  try {
    // 1. Read the Excel file
    const filePath = 'K:/00Project/MantisNXT/database/Uploads/drive-download-20250904T012253Z-1-001/ApexPro Distribution pricelist 25-04-2025 (1).xlsx';

    console.log('📄 Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} rows`);
    console.log('🔍 First row sample:', data[0]);

    // 2. Get ApexPro supplier
    const supplierResult = await pool.query(
      'SELECT id FROM suppliers WHERE supplier_name ILIKE $1',
      ['ApexPro Distribution']
    );

    if (supplierResult.rows.length === 0) {
      throw new Error('ApexPro Distribution supplier not found');
    }

    const supplierId = supplierResult.rows[0].id;
    console.log(`✅ Found supplier ID: ${supplierId}`);

    // 3. Process each product
    let processed = 0;
    let added = 0;

    await pool.query('BEGIN');

    for (const row of data) {
      if (!row.Description || !row.SKU) continue;

      processed++;

      try {
        // Insert into products first
        await pool.query(`
          INSERT INTO products (product_name, brand)
          VALUES ($1, $2)
          ON CONFLICT (product_name) DO NOTHING
        `, [row.Description, row.Brand || 'Unknown']);

        // Insert into inventory_items
        const dealerPrice = parseFloat(row['Dealer Selling Price Inc VAT']?.toString().replace(/[R,]/g, '') || '0');
        const costPrice = parseFloat(row['Dealer Cost inc VAT']?.toString().replace(/[R,]/g, '') || '0');

        await pool.query(`
          INSERT INTO inventory_items (
            product_name,
            sku,
            current_stock,
            unit_cost,
            unit_price,
            reorder_level,
            supplier_id,
            brand
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (sku) DO UPDATE SET
            product_name = EXCLUDED.product_name,
            unit_cost = EXCLUDED.unit_cost,
            unit_price = EXCLUDED.unit_price,
            updated_at = NOW()
        `, [
          row.Description,
          row.SKU,
          row['Stock Status'] === 'In Stock' ? 10 : 0,
          costPrice,
          dealerPrice,
          5, // reorder level
          supplierId,
          row.Brand || 'Unknown'
        ]);

        added++;

        if (added % 10 === 0) {
          console.log(`   ✅ Processed ${added} products...`);
        }

      } catch (error) {
        console.error(`   ❌ Error with product ${row.SKU}:`, error.message);
      }
    }

    await pool.query('COMMIT');

    console.log(`\n🎉 COMPLETE!`);
    console.log(`📊 Processed: ${processed} rows`);
    console.log(`✅ Added: ${added} products`);

    // 4. Verify the data
    const countResult = await pool.query('SELECT COUNT(*) as count FROM inventory_items WHERE supplier_id = $1', [supplierId]);
    console.log(`🔍 Verification: ${countResult.rows[0].count} products in inventory for ApexPro`);

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('💥 FAILED:', error);
  } finally {
    await pool.end();
  }
}

processApexPro().catch(console.error);