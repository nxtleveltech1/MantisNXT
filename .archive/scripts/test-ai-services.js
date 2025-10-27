/**
 * AI Services Testing Script
 * Test the AI backend database integration and queries
 */

async function testAIServices() {
  console.log('🧪 Testing AI Backend Database Integration\n');

  try {
    // Test AI-specific database queries
    console.log('📊 Testing AI Database Queries');
    const testDatabaseQueries = await testDatabaseIntegration();
    console.log('✅ Database integration tests complete\n');

    console.log('🎉 AI backend database tests completed successfully!');
    console.log('📝 Note: TypeScript AI services are validated through API endpoints');

  } catch (error) {
    console.error('❌ AI backend testing failed:', error.message);
    process.exit(1);
  }
}

async function testDatabaseIntegration() {
  // Import database pool using CommonJS require
  const { Pool } = require('pg');

  // Database configuration
  const dbConfig = {
    user: "nxtdb_admin",
    password: "P@33w0rd-1",
    host: "62.169.20.53",
    port: 6600,
    database: "nxtprod-db_001",
    ssl: false,
    max: 5,
    connectionTimeoutMillis: 8000,
    application_name: "MantisNXT_AI_Test"
  };

  const pool = new Pool(dbConfig);

  try {
    console.log('  🔗 Testing database connection...');
    const client = await pool.connect();

    // Test suppliers query for AI discovery
    console.log('  📋 Testing suppliers query for AI discovery...');
    const suppliersResult = await client.query(`
      SELECT
        id,
        COALESCE(name, supplier_name, company_name) as name,
        primary_category as category,
        geographic_region as location,
        COALESCE(rating, 0) as rating,
        payment_terms_days,
        spend_last_12_months,
        status
      FROM suppliers
      WHERE status = 'active'
      LIMIT 5
    `);
    console.log(`  ✅ Found ${suppliersResult.rows.length} active suppliers`);

    // Test inventory query for analytics
    console.log('  📦 Testing inventory query for analytics...');
    const inventoryResult = await client.query(`
      SELECT
        name as product_name,
        stock_qty as current_stock,
        COALESCE(reorder_point, 0) as reorder_level
      FROM inventory_items
      WHERE stock_qty IS NOT NULL
      LIMIT 5
    `);
    console.log(`  ✅ Found ${inventoryResult.rows.length} inventory items`);

    // Test analytics query
    console.log('  📈 Testing analytics aggregation query...');
    const analyticsResult = await client.query(`
      SELECT
        COUNT(*) as total_suppliers,
        AVG(COALESCE(payment_terms_days, 30)) as avg_payment_terms,
        COUNT(CASE WHEN COALESCE(payment_terms_days, 30) > 60 THEN 1 END) as high_risk_suppliers
      FROM suppliers
      WHERE status = 'active'
    `);
    console.log(`  ✅ Analytics query completed: ${JSON.stringify(analyticsResult.rows[0])}`);

    client.release();
    await pool.end();
    return true;

  } catch (error) {
    console.error('  ❌ Database integration test failed:', error.message);
    await pool.end();
    throw error;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAIServices()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { testAIServices, testDatabaseIntegration };