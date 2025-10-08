/**
 * Simple Database Connection Test & Performance Validation
 */

const { Pool } = require('pg');

// Database configuration
const config = {
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  ssl: false,
  // Optimized pool settings
  max: 15,
  min: 2,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 300000,
  acquireTimeoutMillis: 45000,
  keepAlive: true
};

let pool = null;

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');

  try {
    pool = new Pool(config);

    // Test basic connectivity
    const result = await pool.query('SELECT NOW() as current_time, version() as version');

    console.log('✅ Database connected successfully');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🗄️ PostgreSQL version:', result.rows[0].version.split(',')[0]);

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function verifyDataCounts() {
  console.log('🔍 Verifying data counts...');

  try {
    // Check suppliers
    const suppliers = await pool.query('SELECT COUNT(*) as total FROM suppliers');
    console.log(`📊 Suppliers: ${suppliers.rows[0].total}`);

    // Check products
    const products = await pool.query('SELECT COUNT(*) as total FROM products');
    console.log(`📊 Products: ${products.rows[0].total}`);

    // Check inventory
    const inventory = await pool.query('SELECT COUNT(*) as total FROM inventory_items');
    console.log(`📊 Inventory Items: ${inventory.rows[0].total}`);

    // Check pool status
    const poolStatus = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      active: pool.totalCount - pool.idleCount
    };
    console.log('🏊 Pool Status:', poolStatus);

    return {
      suppliers: parseInt(suppliers.rows[0].total),
      products: parseInt(products.rows[0].total),
      inventory: parseInt(inventory.rows[0].total),
      poolStatus
    };

  } catch (error) {
    console.error('❌ Data verification failed:', error.message);
    return null;
  }
}

async function testQueryPerformance() {
  console.log('⚡ Testing query performance...');

  const tests = [];

  try {
    // Test 1: Simple supplier query
    const start1 = Date.now();
    await pool.query('SELECT id, name, status FROM suppliers LIMIT 10');
    const duration1 = Date.now() - start1;
    tests.push({ query: 'Simple supplier select', duration: duration1 });

    // Test 2: Join query
    const start2 = Date.now();
    await pool.query(`
      SELECT p.name, s.name as supplier_name
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      LIMIT 20
    `);
    const duration2 = Date.now() - start2;
    tests.push({ query: 'Products with supplier join', duration: duration2 });

    // Test 3: Count query
    const start3 = Date.now();
    await pool.query('SELECT COUNT(*) FROM inventory_items WHERE current_stock > 0');
    const duration3 = Date.now() - start3;
    tests.push({ query: 'Inventory count with filter', duration: duration3 });

    console.log('📊 Performance Results:');
    tests.forEach(test => {
      const status = test.duration < 50 ? '🟢' : test.duration < 200 ? '🟡' : '🔴';
      console.log(`  ${test.query}: ${test.duration}ms ${status}`);
    });

    const avgDuration = tests.reduce((sum, test) => sum + test.duration, 0) / tests.length;
    console.log(`📊 Average Query Time: ${avgDuration.toFixed(2)}ms`);

    return tests;

  } catch (error) {
    console.error('❌ Performance testing failed:', error.message);
    return [];
  }
}

async function checkIndexes() {
  console.log('🔍 Checking database indexes...');

  try {
    const indexes = await pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log(`📊 Custom Indexes Found: ${indexes.rows.length}`);

    // Group by table
    const indexesByTable = {};
    indexes.rows.forEach(row => {
      if (!indexesByTable[row.tablename]) {
        indexesByTable[row.tablename] = [];
      }
      indexesByTable[row.tablename].push(row.indexname);
    });

    Object.entries(indexesByTable).forEach(([table, tableIndexes]) => {
      console.log(`  ${table}: ${tableIndexes.length} indexes`);
    });

    return indexes.rows;

  } catch (error) {
    console.error('❌ Index check failed:', error.message);
    return [];
  }
}

async function monitorConnectionHealth() {
  console.log('🏥 Monitoring connection health...');

  for (let i = 0; i < 5; i++) {
    try {
      const start = Date.now();
      await pool.query('SELECT 1');
      const duration = Date.now() - start;

      const poolStatus = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        active: pool.totalCount - pool.idleCount
      };

      console.log(`🔄 Health check ${i + 1}: ${duration}ms, Pool: ${poolStatus.active}/${poolStatus.total} active`);

      if (poolStatus.waiting > 0) {
        console.warn(`⚠️ Warning: ${poolStatus.waiting} connections waiting`);
      }

      // Wait 2 seconds between checks
      if (i < 4) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Health check ${i + 1} failed:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 MantisNXT Database Optimization Test');
  console.log('========================================');

  try {
    // Test 1: Basic connection
    const connected = await testDatabaseConnection();
    if (!connected) {
      console.error('❌ Cannot proceed without database connection');
      return;
    }

    // Test 2: Data verification
    const dataCounts = await verifyDataCounts();
    if (!dataCounts) {
      console.error('❌ Data verification failed');
      return;
    }

    // Test 3: Index verification
    const indexes = await checkIndexes();

    // Test 4: Performance testing
    const performanceResults = await testQueryPerformance();

    // Test 5: Connection health monitoring
    await monitorConnectionHealth();

    // Final summary
    console.log('\n🎉 Database Test Summary:');
    console.log('=========================');
    console.log(`✅ Connection: Working`);
    console.log(`✅ Data: ${dataCounts.suppliers} suppliers, ${dataCounts.products} products, ${dataCounts.inventory} inventory items`);
    console.log(`✅ Indexes: ${indexes.length} custom indexes found`);
    console.log(`✅ Performance: ${performanceResults.length} tests completed`);
    console.log(`✅ Pool: ${dataCounts.poolStatus.active}/${dataCounts.poolStatus.total} active connections`);

    // Health assessment
    const avgPerformance = performanceResults.reduce((sum, test) => sum + test.duration, 0) / performanceResults.length;

    if (avgPerformance < 100 && dataCounts.poolStatus.waiting === 0) {
      console.log('🚀 Database is OPTIMIZED for production use');
    } else if (avgPerformance < 200) {
      console.log('🟡 Database performance is acceptable');
    } else {
      console.log('🔴 Database may need additional optimization');
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔄 Database connection closed');
    }
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  testDatabaseConnection,
  verifyDataCounts,
  testQueryPerformance,
  checkIndexes,
  monitorConnectionHealth
};