#!/usr/bin/env node

const { Pool } = require('pg');

// Database connection configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(dbConfig);

async function fixColumnMappings() {
  console.log('🔧 FIXING COLUMN MAPPINGS FOR ANALYTICS');
  console.log('=======================================\n');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully\n');

    // Add missing columns that are still needed
    const fixes = [
      {
        name: 'Add supplier_name column to suppliers (derived from name)',
        query: 'ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255)'
      },
      {
        name: 'Set supplier_name from name column',
        query: 'UPDATE suppliers SET supplier_name = name WHERE supplier_name IS NULL'
      },
      {
        name: 'Add payment_terms_days to suppliers (from payment_terms)',
        query: 'ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30'
      },
      {
        name: 'Set payment_terms_days from payment_terms',
        query: `UPDATE suppliers
                SET payment_terms_days = CASE
                  WHEN payment_terms ILIKE '%90%' OR payment_terms ILIKE '%net 90%' THEN 90
                  WHEN payment_terms ILIKE '%60%' OR payment_terms ILIKE '%net 60%' THEN 60
                  WHEN payment_terms ILIKE '%45%' OR payment_terms ILIKE '%net 45%' THEN 45
                  WHEN payment_terms ILIKE '%30%' OR payment_terms ILIKE '%net 30%' THEN 30
                  WHEN payment_terms ILIKE '%15%' OR payment_terms ILIKE '%net 15%' THEN 15
                  WHEN payment_terms ILIKE '%due%' OR payment_terms ILIKE '%immediate%' THEN 0
                  ELSE 30
                END
                WHERE payment_terms_days = 30 AND payment_terms IS NOT NULL`
      },
      {
        name: 'Add reorder_level alias column to inventory_items',
        query: 'ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_level INTEGER'
      },
      {
        name: 'Set reorder_level from reorder_point',
        query: 'UPDATE inventory_items SET reorder_level = reorder_point WHERE reorder_level IS NULL AND reorder_point IS NOT NULL'
      },
      {
        name: 'Set default reorder_level for items without it',
        query: 'UPDATE inventory_items SET reorder_level = GREATEST(FLOOR(current_stock * 0.2), 5) WHERE reorder_level IS NULL AND current_stock > 0'
      }
    ];

    console.log(`🔨 Applying ${fixes.length} column mapping fixes...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < fixes.length; i++) {
      const fix = fixes[i];
      console.log(`[${i + 1}/${fixes.length}] ${fix.name}`);

      try {
        const result = await pool.query(fix.query);
        console.log(`✅ Success (${result.rowCount || 0} rows affected)`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`✅ Already exists (skipped)`);
          successCount++;
        } else {
          console.log(`❌ Error: ${error.message.split('\n')[0]}`);
          errorCount++;
        }
      }
      console.log('');
    }

    console.log('📊 TESTING FIXED QUERIES...\n');

    // Test the fixed queries
    const testQueries = [
      {
        name: 'Low Stock Items (with reorder_level)',
        query: 'SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= reorder_level'
      },
      {
        name: 'Suppliers with payment terms',
        query: 'SELECT COUNT(*) as count, AVG(payment_terms_days) as avg_days FROM suppliers WHERE payment_terms_days IS NOT NULL'
      },
      {
        name: 'Inventory with reorder recommendations',
        query: `SELECT
                  product_name,
                  current_stock,
                  reorder_level,
                  CASE
                    WHEN current_stock <= reorder_level THEN 'needs_reorder'
                    ELSE 'adequate'
                  END as status
                FROM inventory_items
                WHERE reorder_level IS NOT NULL
                LIMIT 5`
      },
      {
        name: 'Supplier risk analysis',
        query: `SELECT
                  supplier_name,
                  payment_terms_days,
                  CASE
                    WHEN payment_terms_days > 60 THEN 'high_risk'
                    WHEN payment_terms_days > 30 THEN 'medium_risk'
                    ELSE 'low_risk'
                  END as risk_level
                FROM suppliers
                WHERE supplier_name IS NOT NULL
                LIMIT 5`
      }
    ];

    for (const test of testQueries) {
      console.log(`Testing: ${test.name}`);
      try {
        const result = await pool.query(test.query);
        console.log(`✅ Success: ${result.rows.length} rows returned`);
        if (result.rows.length > 0 && result.rows.length <= 5) {
          console.log('   Sample data:', JSON.stringify(result.rows, null, 2));
        } else if (result.rows.length === 1) {
          console.log('   Result:', JSON.stringify(result.rows[0], null, 2));
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        errorCount++;
      }
      console.log('');
    }

    console.log('📈 ADDING INDEXES FOR PERFORMANCE...\n');

    const performanceIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_inventory_reorder_level ON inventory_items(reorder_level, current_stock)',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_payment_terms ON suppliers(payment_terms_days, supplier_name)',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name) WHERE supplier_name IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(current_stock, reorder_level) WHERE current_stock <= reorder_level'
    ];

    for (const index of performanceIndexes) {
      try {
        await pool.query(index);
        console.log('✅ Performance index created');
        successCount++;
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`⚠️  Index warning: ${error.message.split('\n')[0]}`);
        }
      }
    }

    console.log('\n🎉 COLUMN MAPPING FIXES COMPLETED!');
    console.log('==================================');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ ALL ANALYTICS APIS SHOULD NOW BE FULLY FUNCTIONAL!');
      console.log('🚀 Ready to test the endpoints:');
      console.log('   - GET /api/analytics/dashboard?organizationId=1');
      console.log('   - GET /api/analytics/anomalies?organizationId=1');
      console.log('   - GET /api/analytics/predictions?organizationId=1');
      console.log('   - GET /api/analytics/recommendations?organizationId=1');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fixes
fixColumnMappings().catch(console.error);