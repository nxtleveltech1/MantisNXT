/**
 * Simple CSV parsing test to validate Active Music Distribution file structure
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface CSVRow {
  'Supplier Name': string;
  'Supplier Code': string;
  'Produt Category': string; // Note: typo in CSV
  BRAND: string;
  'Brand Sub Tag': string;
  'SKU / MODEL': string;
  'PRODUCT DESCRIPTION': string;
  'SUPPLIER SOH': string;
  'COST  EX VAT': string;
  'QTY ON ORDER': string;
  'NEXT SHIPMENT': string;
  Tags: string;
  LINKS: string;
}

async function testCSVParsing() {
  console.log('🧪 Testing CSV File Parsing\n');

  try {
    // Read CSV file
    console.log('📁 Reading CSV file...');
    const csvPath = path.join(
      __dirname,
      '../database/Uploads/New data/Active Music Distrabution - cleaned v2.csv'
    );

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }

    const buffer = fs.readFileSync(csvPath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<CSVRow>(worksheet);

    console.log(`✅ Read ${data.length} rows from CSV\n`);

    // Analyze data
    console.log('📊 Analyzing data structure:\n');

    if (data.length > 0) {
      const firstRow = data[0];
      console.log('Sample row (first):', JSON.stringify(firstRow, null, 2));
      console.log('');
    }

    // Transform to pricelist format
    let validCount = 0;
    let invalidCount = 0;
    const errors: string[] = [];

    const transformedRows = data.map((row, index) => {
      const rowNum = index + 1;

      // Clean and parse price
      const priceStr = String(row['COST  EX VAT'] || '0').replace(/[^\d.]/g, '');
      const price = parseFloat(priceStr) || 0;

      const sku = String(row['SKU / MODEL'] || '').trim();
      const name = String(row['PRODUCT DESCRIPTION'] || '').trim();

      // Validation
      const isValid = sku && name && price > 0;

      if (!isValid) {
        invalidCount++;
        if (!sku) errors.push(`Row ${rowNum}: Missing SKU`);
        if (!name) errors.push(`Row ${rowNum}: Missing product name`);
        if (price <= 0) errors.push(`Row ${rowNum}: Invalid price (${priceStr})`);
      } else {
        validCount++;
      }

      return {
        row_num: rowNum,
        supplier_sku: sku,
        name: name,
        brand: String(row['BRAND'] || '').trim() || null,
        uom: 'EA',
        pack_size: null,
        price,
        currency: 'ZAR',
        category_raw: String(row['Produt Category'] || '').trim() || null,
        vat_code: null,
        barcode: null,
        valid: isValid,
      };
    });

    console.log('🔍 Validation Results:');
    console.log(`   Total rows: ${data.length}`);
    console.log(`   Valid rows: ${validCount}`);
    console.log(`   Invalid rows: ${invalidCount}\n`);

    if (errors.length > 0) {
      console.log(`⚠️  Validation errors (first 10):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err}`);
      });
      console.log('');
    }

    // Show sample valid rows
    const validRows = transformedRows.filter(r => r.valid);
    console.log('📝 Sample valid rows (first 3):');
    validRows.slice(0, 3).forEach((row, idx) => {
      console.log(`   ${idx + 1}. SKU: ${row.supplier_sku}`);
      console.log(`      Name: ${row.name.substring(0, 60)}${row.name.length > 60 ? '...' : ''}`);
      console.log(`      Brand: ${row.brand || 'N/A'}`);
      console.log(`      Category: ${row.category_raw || 'N/A'}`);
      console.log(`      Price: ${row.currency} ${row.price.toFixed(2)}`);
      console.log('');
    });

    // Category analysis
    const categories = new Set<string>();
    const brands = new Set<string>();
    validRows.forEach(row => {
      if (row.category_raw) categories.add(row.category_raw);
      if (row.brand) brands.add(row.brand);
    });

    console.log('📈 Data Summary:');
    console.log(`   Unique categories: ${categories.size}`);
    console.log(`   Unique brands: ${brands.size}`);
    console.log(
      `   Price range: ${Math.min(...validRows.map(r => r.price)).toFixed(2)} - ${Math.max(...validRows.map(r => r.price)).toFixed(2)} ZAR\n`
    );

    console.log('✅ CSV parsing test completed successfully!');

    return {
      totalRows: data.length,
      validRows: validCount,
      invalidRows: invalidCount,
      transformedRows,
      categories: Array.from(categories),
      brands: Array.from(brands),
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
    }
    throw error;
  }
}

// Run the test
testCSVParsing()
  .then(result => {
    console.log('\n🎉 CSV parsing test passed!');
    console.log(`\nReady to upload ${result.validRows} products to database.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Test failed:', err);
    process.exit(1);
  });
