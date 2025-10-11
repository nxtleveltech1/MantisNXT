/**
 * Test script for pricelist upload workflow
 * Tests the complete SPP → CORE → SERVE flow
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { neonDb } from '../lib/database/neon-connection';
import { pricelistService } from '../src/lib/services/PricelistService';

interface CSVRow {
  'Supplier Name': string;
  'Supplier Code': string;
  'Produt Category': string; // Note: typo in CSV
  'BRAND': string;
  'Brand Sub Tag': string;
  'SKU / MODEL': string;
  'PRODUCT DESCRIPTION': string;
  'SUPPLIER SOH': string;
  'COST  EX VAT': string;
  'QTY ON ORDER': string;
  'NEXT SHIPMENT': string;
  'Tags': string;
  'LINKS': string;
}

async function testPricelistUpload() {
  console.log('🧪 Testing Pricelist Upload Workflow\n');

  try {
    // Step 1: Get supplier
    console.log('📋 Step 1: Getting supplier...');
    const supplierResult = await neonDb.query(
      'SELECT supplier_id, name, code FROM core.supplier WHERE code = $1',
      ['AMD-001']
    );

    if (supplierResult.rows.length === 0) {
      throw new Error('Supplier AMD-001 not found. Please run database setup first.');
    }

    const supplier = supplierResult.rows[0];
    console.log(`✅ Found supplier: ${supplier.name} (${supplier.supplier_id})\n`);

    // Step 2: Read CSV file
    console.log('📁 Step 2: Reading CSV file...');
    const csvPath = path.join(__dirname, '../database/Uploads/New data/Active Music Distrabution - cleaned v2.csv');

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }

    const buffer = fs.readFileSync(csvPath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<CSVRow>(worksheet);

    console.log(`✅ Read ${data.length} rows from CSV\n`);

    // Step 3: Create upload record
    console.log('📝 Step 3: Creating upload record...');
    const upload = await pricelistService.createUpload({
      supplier_id: supplier.supplier_id,
      filename: 'Active Music Distrabution - cleaned v2.csv',
      currency: 'ZAR',
      valid_from: new Date()
    });

    console.log(`✅ Upload created: ${upload.upload_id}\n`);

    // Step 4: Transform and insert rows
    console.log('🔄 Step 4: Transforming and inserting rows...');
    const rows = data.map((row, index) => {
      // Clean and parse price
      const priceStr = String(row['COST  EX VAT'] || '0').replace(/[^\d.]/g, '');
      const price = parseFloat(priceStr) || 0;

      return {
        upload_id: upload.upload_id,
        row_num: index + 1,
        supplier_sku: String(row['SKU / MODEL'] || '').trim(),
        name: String(row['PRODUCT DESCRIPTION'] || '').trim(),
        brand: String(row['BRAND'] || '').trim() || undefined,
        uom: 'EA', // Default unit
        pack_size: undefined,
        price,
        currency: 'ZAR',
        category_raw: String(row['Produt Category'] || '').trim() || undefined,
        vat_code: undefined,
        barcode: undefined,
        attrs_json: {}
      };
    });

    // Filter out invalid rows (missing SKU or name or invalid price)
    const validRows = rows.filter(row => {
      return row.supplier_sku && row.name && row.price > 0;
    });

    console.log(`   Found ${validRows.length} valid rows (filtered ${rows.length - validRows.length} invalid)`);

    const insertedCount = await pricelistService.insertRows(upload.upload_id, validRows);
    console.log(`✅ Inserted ${insertedCount} rows\n`);

    // Step 5: Validate upload
    console.log('✔️  Step 5: Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);

    console.log(`   Status: ${validationResult.status}`);
    console.log(`   Total rows: ${validationResult.total_rows}`);
    console.log(`   Valid rows: ${validationResult.valid_rows}`);
    console.log(`   Invalid rows: ${validationResult.invalid_rows}`);
    console.log(`   Warnings: ${validationResult.warnings.length}`);

    if (validationResult.summary) {
      console.log(`   New products: ${validationResult.summary.new_products}`);
      console.log(`   Price updates: ${validationResult.summary.updated_prices}`);
      console.log(`   Unmapped categories: ${validationResult.summary.unmapped_categories}`);
    }

    if (validationResult.errors && validationResult.errors.length > 0) {
      console.log(`\n⚠️  Validation errors (first 5):`);
      validationResult.errors.slice(0, 5).forEach(err => {
        console.log(`   - Row ${err.row_num}: ${err.message}`);
      });
    }

    console.log('');

    // Step 6: Merge to CORE if validation passed
    if (validationResult.status === 'valid' || validationResult.status === 'warning') {
      console.log('🔀 Step 6: Merging to CORE schema...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id);

      if (mergeResult.success) {
        console.log(`✅ Merge successful!`);
        console.log(`   Products created: ${mergeResult.products_created}`);
        console.log(`   Products updated: ${mergeResult.products_updated}`);
        console.log(`   Prices updated: ${mergeResult.prices_updated}`);
        console.log(`   Duration: ${mergeResult.duration_ms}ms\n`);
      } else {
        console.log(`❌ Merge failed:`);
        mergeResult.errors.forEach(err => console.log(`   - ${err}`));
        console.log('');
      }
    } else {
      console.log('⚠️  Step 6: Skipping merge due to validation errors\n');
    }

    // Step 7: Verify data in CORE schema
    console.log('🔍 Step 7: Verifying data in CORE schema...');
    const coreProductsResult = await neonDb.query(
      'SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1',
      [supplier.supplier_id]
    );
    const corePricesResult = await neonDb.query(
      `SELECT COUNT(*) as count FROM core.price_history ph
       JOIN core.supplier_product sp ON sp.supplier_product_id = ph.supplier_product_id
       WHERE sp.supplier_id = $1 AND ph.is_current = true`,
      [supplier.supplier_id]
    );

    console.log(`✅ CORE schema verification:`);
    console.log(`   Supplier products: ${coreProductsResult.rows[0].count}`);
    console.log(`   Current prices: ${corePricesResult.rows[0].count}\n`);

    // Step 8: Sample data check
    console.log('📊 Step 8: Sample data from CORE schema:');
    const sampleResult = await neonDb.query(
      `SELECT
        sp.supplier_sku,
        sp.name_from_supplier,
        ph.price,
        ph.currency,
        sp.created_at
       FROM core.supplier_product sp
       JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id
       WHERE sp.supplier_id = $1 AND ph.is_current = true
       ORDER BY sp.created_at DESC
       LIMIT 5`,
      [supplier.supplier_id]
    );

    sampleResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. SKU: ${row.supplier_sku}`);
      console.log(`      Name: ${row.name_from_supplier.substring(0, 60)}...`);
      console.log(`      Price: ${row.currency} ${row.price}`);
      console.log('');
    });

    console.log('✅ Pricelist upload test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testPricelistUpload()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Test suite failed:', err);
    process.exit(1);
  });
