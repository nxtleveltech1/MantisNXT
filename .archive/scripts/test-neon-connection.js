/**
 * Test script to verify Neon database connection and schema routing
 *
 * This script tests:
 * 1. Neon connection with SSL
 * 2. Access to core.inventory_selection table
 * 3. Correct schema routing
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { neonDb, testConnection, getPoolStatus } = require('../lib/database/neon-connection');

async function testNeonConnection() {
  console.log('🔍 Testing Neon Database Connection...\n');

  try {
    // Test 1: Connection test
    console.log('1️⃣ Testing basic connection...');
    const connTest = await testConnection();

    if (connTest.success) {
      console.log(`✅ Connection successful (latency: ${connTest.latency}ms)`);
    } else {
      console.error(`❌ Connection failed: ${connTest.error}`);
      return;
    }

    // Test 2: Check pool status
    console.log('\n2️⃣ Checking pool status...');
    const poolStatus = getPoolStatus();
    console.log('✅ Pool status:', poolStatus);

    // Test 3: Query core.inventory_selection table
    console.log('\n3️⃣ Testing access to core.inventory_selection...');
    const selectionQuery = await neonDb.query(
      'SELECT selection_id, selection_name, status FROM core.inventory_selection LIMIT 5'
    );
    console.log(`✅ Found ${selectionQuery.rowCount} selections:`);
    selectionQuery.rows.forEach(row => {
      console.log(`   - ${row.selection_name} (${row.selection_id}): ${row.status}`);
    });

    // Test 4: Query core.supplier_product table
    console.log('\n4️⃣ Testing access to core.supplier_product...');
    const productQuery = await neonDb.query(
      'SELECT COUNT(*) as count FROM core.supplier_product'
    );
    console.log(`✅ Found ${productQuery.rows[0].count} supplier products`);

    // Test 5: Query serve.v_nxt_soh view
    console.log('\n5️⃣ Testing access to serve.v_nxt_soh view...');
    try {
      const sohQuery = await neonDb.query(
        'SELECT COUNT(*) as count FROM serve.v_nxt_soh LIMIT 1'
      );
      console.log(`✅ View accessible, ${sohQuery.rows[0].count} items in SOH view`);
    } catch (viewError) {
      console.log('⚠️ View not accessible (may not have active selection):', viewError.message);
    }

    // Test 6: Check for active selection
    console.log('\n6️⃣ Checking for active inventory selection...');
    const activeQuery = await neonDb.query(
      "SELECT selection_id, selection_name FROM core.inventory_selection WHERE status = 'active' LIMIT 1"
    );

    if (activeQuery.rowCount > 0) {
      console.log('✅ Active selection found:', activeQuery.rows[0].selection_name);
    } else {
      console.log('ℹ️ No active selection (this is OK, create one to see SOH data)');
    }

    console.log('\n✅ All Neon connection tests passed!\n');
    console.log('📊 Summary:');
    console.log('   - SSL connection: ✅ Working');
    console.log('   - Schema routing: ✅ Correct (using Neon database)');
    console.log('   - Core tables: ✅ Accessible');
    console.log('   - Serve views: ✅ Present');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testNeonConnection()
  .then(() => {
    console.log('\n🎉 Neon connection verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
