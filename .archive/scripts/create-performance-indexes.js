/**
 * Create Critical Performance Indexes
 * Focus on the most important indexes to prevent connection pool exhaustion
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  ssl: false
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function createCriticalIndexes() {
  console.log('🔧 Creating critical performance indexes...');

  try {
    const criticalIndexes = [
      // Inventory items - most frequently queried table
      {
        name: 'idx_inventory_items_supplier_id_status',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_supplier_id_status ON inventory_items(supplier_id, status);',
        description: 'Optimize supplier + status queries (most common pattern)'
      },
      {
        name: 'idx_inventory_items_sku_lookup',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_sku_lookup ON inventory_items(sku) WHERE status = \'active\';',
        description: 'Optimize active SKU lookups (partial index)'
      },
      {
        name: 'idx_inventory_items_stock_alerts',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_stock_alerts ON inventory_items(stock_qty, reorder_point) WHERE status = \'active\';',
        description: 'Optimize stock alert queries'
      },
      {
        name: 'idx_inventory_items_category_search',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_category_search ON inventory_items(category, brand, status);',
        description: 'Optimize category and brand filtering'
      },

      // Stock movements - heavy write table
      {
        name: 'idx_stock_movements_item_date',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_item_date ON stock_movements(item_id, created_at DESC);',
        description: 'Optimize item movement history (recent first)'
      },
      {
        name: 'idx_stock_movements_type_date',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(movement_type, created_at DESC);',
        description: 'Optimize movement type analysis'
      },

      // Suppliers - frequently joined table
      {
        name: 'idx_suppliers_active_lookup',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_active_lookup ON suppliers(name, status) WHERE status = \'active\';',
        description: 'Optimize active supplier lookups'
      },

      // AI and analytics tables - can be heavy
      {
        name: 'idx_analytics_anomalies_recent',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_recent ON analytics_anomalies(detected_at DESC, status);',
        description: 'Optimize recent anomaly queries'
      },
      {
        name: 'idx_ai_conversation_user_recent',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversation_user_recent ON ai_conversation(user_id, updated_at DESC);',
        description: 'Optimize user conversation history'
      },

      // Activity logs - high volume table
      {
        name: 'idx_activity_logs_recent',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_recent ON activity_logs(created_at DESC) WHERE created_at > NOW() - INTERVAL \'30 days\';',
        description: 'Optimize recent activity queries (partial index)'
      }
    ];

    let indexesCreated = 0;
    let indexesSkipped = 0;
    let indexesFailed = 0;

    for (const index of criticalIndexes) {
      try {
        console.log(`  Creating ${index.name}...`);
        console.log(`    Purpose: ${index.description}`);

        const startTime = Date.now();
        await query(index.query);
        const endTime = Date.now();

        indexesCreated++;
        console.log(`    ✅ Created in ${endTime - startTime}ms`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`    ✅ Already exists`);
          indexesSkipped++;
        } else {
          console.log(`    ❌ Failed: ${error.message}`);
          indexesFailed++;
        }
      }
    }

    return {
      indexesCreated,
      indexesSkipped,
      indexesFailed,
      totalAttempted: criticalIndexes.length
    };

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function optimizeTableStatistics() {
  console.log('\n🔧 Updating table statistics...');

  try {
    // Update statistics for key tables
    const keyTables = [
      'inventory_items',
      'stock_movements',
      'suppliers',
      'analytics_anomalies',
      'ai_conversation',
      'activity_logs'
    ];

    let tablesAnalyzed = 0;

    for (const table of keyTables) {
      try {
        console.log(`  Analyzing ${table}...`);
        const startTime = Date.now();
        await query(`ANALYZE ${table};`);
        const endTime = Date.now();
        tablesAnalyzed++;
        console.log(`    ✅ Completed in ${endTime - startTime}ms`);
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
      }
    }

    return {
      tablesAnalyzed,
      totalAttempted: keyTables.length
    };

  } catch (error) {
    console.error('❌ Error updating statistics:', error);
    throw error;
  }
}

async function createPerformanceViews() {
  console.log('\n🔧 Creating performance monitoring views...');

  try {
    // Create a view for monitoring slow operations
    const createPerformanceMonitorView = `
      CREATE OR REPLACE VIEW database_performance_monitor AS
      SELECT
        'inventory_status' as metric_name,
        COUNT(*) as total_count,
        COUNT(CASE WHEN stock_qty <= 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN stock_qty <= reorder_point THEN 1 END) as low_stock_count,
        AVG(stock_qty) as avg_stock_qty
      FROM inventory_items
      WHERE status = 'active'

      UNION ALL

      SELECT
        'supplier_status' as metric_name,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
        0 as avg_stock_qty
      FROM suppliers

      UNION ALL

      SELECT
        'recent_movements' as metric_name,
        COUNT(*) as total_count,
        COUNT(CASE WHEN movement_type = 'IN' THEN 1 END) as stock_in_count,
        COUNT(CASE WHEN movement_type = 'OUT' THEN 1 END) as stock_out_count,
        0 as avg_stock_qty
      FROM stock_movements
      WHERE created_at > NOW() - INTERVAL '24 hours';
    `;

    await query(createPerformanceMonitorView);
    console.log('  ✅ Created database_performance_monitor view');

    // Create connection pool monitoring function
    const createPoolMonitorFunction = `
      CREATE OR REPLACE FUNCTION get_connection_pool_stats()
      RETURNS TABLE(
        metric_name TEXT,
        metric_value NUMERIC
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          'active_connections'::TEXT,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::NUMERIC
        UNION ALL
        SELECT
          'idle_connections'::TEXT,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle')::NUMERIC
        UNION ALL
        SELECT
          'total_connections'::TEXT,
          (SELECT count(*) FROM pg_stat_activity)::NUMERIC
        UNION ALL
        SELECT
          'max_connections'::TEXT,
          (SELECT setting::NUMERIC FROM pg_settings WHERE name = 'max_connections');
      END;
      $$ LANGUAGE plpgsql;
    `;

    await query(createPoolMonitorFunction);
    console.log('  ✅ Created get_connection_pool_stats() function');

    return {
      viewsCreated: 1,
      functionsCreated: 1
    };

  } catch (error) {
    console.error('❌ Error creating performance views:', error);
    throw error;
  }
}

async function testPerformance() {
  console.log('\n✅ Testing performance improvements...');

  try {
    // Test 1: Complex inventory query
    console.log('  Testing inventory query performance...');
    const startTime1 = Date.now();
    const inventoryTest = await query(`
      SELECT
        i.name,
        i.sku,
        i.stock_qty,
        s.name as supplier_name,
        COUNT(sm.id) as movement_count
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN stock_movements sm ON i.id = sm.item_id
      WHERE i.status = 'active' AND i.stock_qty > 0
      GROUP BY i.id, i.name, i.sku, i.stock_qty, s.name
      ORDER BY i.stock_qty DESC
      LIMIT 20;
    `);
    const endTime1 = Date.now();
    console.log(`    ✅ Inventory query: ${endTime1 - startTime1}ms (${inventoryTest.rows.length} rows)`);

    // Test 2: Stock movement analysis
    console.log('  Testing stock movement query performance...');
    const startTime2 = Date.now();
    const movementTest = await query(`
      SELECT
        movement_type,
        COUNT(*) as movement_count,
        SUM(quantity) as total_quantity
      FROM stock_movements
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY movement_type
      ORDER BY movement_count DESC;
    `);
    const endTime2 = Date.now();
    console.log(`    ✅ Movement query: ${endTime2 - startTime2}ms (${movementTest.rows.length} rows)`);

    // Test 3: Performance monitoring view
    console.log('  Testing performance monitoring view...');
    const startTime3 = Date.now();
    const monitorTest = await query('SELECT * FROM database_performance_monitor;');
    const endTime3 = Date.now();
    console.log(`    ✅ Monitor view: ${endTime3 - startTime3}ms (${monitorTest.rows.length} metrics)`);

    // Test 4: Connection pool stats
    console.log('  Testing connection pool monitoring...');
    const startTime4 = Date.now();
    const poolTest = await query('SELECT * FROM get_connection_pool_stats();');
    const endTime4 = Date.now();
    console.log(`    ✅ Pool stats: ${endTime4 - startTime4}ms`);

    console.log('\n📊 Connection Pool Status:');
    poolTest.rows.forEach(stat => {
      console.log(`    ${stat.metric_name}: ${stat.metric_value}`);
    });

    return {
      inventoryQueryTime: endTime1 - startTime1,
      movementQueryTime: endTime2 - startTime2,
      monitorViewTime: endTime3 - startTime3,
      poolStatsTime: endTime4 - startTime4,
      connectionStats: poolTest.rows
    };

  } catch (error) {
    console.error('❌ Error testing performance:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Critical Database Performance Optimization...\n');

    // Step 1: Create critical indexes
    const indexResults = await createCriticalIndexes();

    // Step 2: Update table statistics
    const statsResults = await optimizeTableStatistics();

    // Step 3: Create performance monitoring tools
    const viewResults = await createPerformanceViews();

    // Step 4: Test performance
    const testResults = await testPerformance();

    console.log('\n📊 Optimization Summary:');
    console.log('='.repeat(50));
    console.log(`Critical indexes created: ${indexResults.indexesCreated}`);
    console.log(`Indexes already existed: ${indexResults.indexesSkipped}`);
    console.log(`Index creation failures: ${indexResults.indexesFailed}`);
    console.log(`Tables analyzed: ${statsResults.tablesAnalyzed}`);
    console.log(`Performance views created: ${viewResults.viewsCreated}`);
    console.log(`Monitoring functions created: ${viewResults.functionsCreated}`);

    console.log('\n⚡ Performance Test Results:');
    console.log(`  Inventory query: ${testResults.inventoryQueryTime}ms`);
    console.log(`  Movement query: ${testResults.movementQueryTime}ms`);
    console.log(`  Monitor view: ${testResults.monitorViewTime}ms`);
    console.log(`  Pool stats: ${testResults.poolStatsTime}ms`);

    console.log('\n✅ Critical database performance optimization completed!');
    console.log('💡 These optimizations should significantly reduce connection pool exhaustion.');

  } catch (error) {
    console.error('❌ Fatal error in performance optimization:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createCriticalIndexes,
  optimizeTableStatistics,
  createPerformanceViews,
  testPerformance
};