#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false
};

async function applyEnhancedSchema() {
  const pool = new Pool(dbConfig);
  let client;

  try {
    client = await pool.connect();
    console.log('✅ Connected to database');

    // Read the enhanced schema SQL file
    const schemaPath = path.join(__dirname, '..', 'database', 'enhanced-schema-design.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📊 Applying enhanced schema for price list integration...');

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
        await client.query(statement + ';');
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists') ||
            error.message.includes('already has a column') ||
            error.message.includes('already defined')) {
          console.log(`⚠️ Skipping existing: ${error.message.split('\n')[0]}`);
          skipCount++;
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errors.push(`Statement ${i + 1}: ${error.message}`);

          // Continue with non-critical errors
          if (!error.message.includes('does not exist')) {
            continue;
          }
        }
      }
    }

    console.log('\n📊 Schema Application Summary:');
    console.log(`✅ Successfully applied: ${successCount} statements`);
    console.log(`⚠️ Skipped (already exists): ${skipCount} statements`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`   ${error}`));
    }

    // Verify key tables exist
    console.log('\n🔍 Verifying enhanced schema...');
    await verifyEnhancedSchema(client);

    console.log('\n✅ Enhanced schema application completed!');
    console.log('🚀 Database is now ready for price list data processing');

  } catch (error) {
    console.error('❌ Fatal error applying schema:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function verifyEnhancedSchema(client) {
  const verificationQueries = [
    {
      name: 'Enhanced suppliers table',
      query: `SELECT column_name FROM information_schema.columns
              WHERE table_name = 'suppliers'
              AND column_name IN ('pricelist_format', 'last_pricelist_update', 'total_products')`
    },
    {
      name: 'Products table',
      query: `SELECT COUNT(*) as count FROM information_schema.tables
              WHERE table_name = 'products'`
    },
    {
      name: 'Price history table',
      query: `SELECT COUNT(*) as count FROM information_schema.tables
              WHERE table_name = 'price_history'`
    },
    {
      name: 'Import batches table',
      query: `SELECT COUNT(*) as count FROM information_schema.tables
              WHERE table_name = 'import_batches'`
    },
    {
      name: 'Product catalog view',
      query: `SELECT COUNT(*) as count FROM information_schema.views
              WHERE table_name = 'product_catalog'`
    },
    {
      name: 'Product indexes',
      query: `SELECT COUNT(*) as count FROM pg_indexes
              WHERE tablename = 'products'`
    }
  ];

  for (const check of verificationQueries) {
    try {
      const result = await client.query(check.query);

      if (check.name === 'Enhanced suppliers table') {
        const columns = result.rows.map(r => r.column_name);
        console.log(`✅ ${check.name}: ${columns.length} enhanced columns found`);
      } else {
        const count = result.rows[0]?.count || 0;
        console.log(`✅ ${check.name}: ${count > 0 ? 'Present' : 'Missing'} (${count})`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Verification failed - ${error.message}`);
    }
  }
}

// Auto-detect columns in Alpha Technologies price list for testing
async function detectAlphaColumns() {
  console.log('\n🔍 Detecting columns in Alpha Technologies price list...');

  const xlsx = require('xlsx');
  const filePath = path.join(__dirname, '..', 'database', 'Uploads', 'drive-download-20250904T012253Z-1-001', 'Alpha-Technologies-Pricelist-August-2025- (2).xlsx');

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = 'Alfatron Audio'; // Known to have good data structure
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`📋 Sheet: ${sheetName}`);
    console.log(`📊 Rows: ${jsonData.length}`);
    console.log(`🗂️ Headers:`, jsonData[0]);
    console.log(`📝 Sample data:`, jsonData.slice(1, 3));

    // Suggest column mappings
    const headers = jsonData[0] || [];
    const mappings = {
      sku: findColumnIndex(headers, ['sku', 'code', 'product code', 'item code', 'part']),
      name: findColumnIndex(headers, ['name', 'description', 'product', 'item', 'title']),
      price: findColumnIndex(headers, ['price', 'cost', 'retail', 'wholesale', 'amount'])
    };

    console.log('🎯 Suggested mappings:', mappings);

  } catch (error) {
    console.log('❌ Could not analyze Alpha price list:', error.message);
  }
}

function findColumnIndex(headers, searchTerms) {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase();
    for (const term of searchTerms) {
      if (header.includes(term.toLowerCase())) {
        return { index: i, header: headers[i] };
      }
    }
  }
  return null;
}

// Run if called directly
if (require.main === module) {
  applyEnhancedSchema()
    .then(() => detectAlphaColumns())
    .catch(console.error);
}

module.exports = { applyEnhancedSchema };