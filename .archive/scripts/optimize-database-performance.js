/**
 * Database Performance Optimization Script
 * Analyze and optimize query performance to prevent connection pool exhaustion
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

async function analyzePerformance() {
  console.log('🔍 Analyzing database performance...');

  try {
    // Check for missing indexes
    console.log('\n📊 Checking for missing indexes...');

    const missingIndexesQuery = `
      SELECT
        schemaname,
        tablename,
        attname as column_name,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.1
      ORDER BY n_distinct DESC
      LIMIT 20;
    `;

    const missingIndexes = await query(missingIndexesQuery);

    console.log('Potential columns needing indexes:');
    missingIndexes.rows.forEach(row => {
      console.log(`  ${row.tablename}.${row.column_name}: ${row.n_distinct} distinct values`);
    });

    // Check current indexes
    console.log('\n🗂️ Current indexes:');

    const currentIndexesQuery = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    const currentIndexes = await query(currentIndexesQuery);

    currentIndexes.rows.forEach(idx => {
      console.log(`  ${idx.tablename}: ${idx.indexname}`);
    });

    // Check table sizes
    console.log('\n📏 Table sizes:');

    const tableSizesQuery = `
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `;

    const tableSizes = await query(tableSizesQuery);

    tableSizes.rows.forEach(table => {
      console.log(`  ${table.tablename}: ${table.size}`);
    });

    // Check for long-running queries (if pg_stat_statements is available)
    console.log('\n⏱️ Checking for slow query patterns...');

    try {
      const slowQueriesQuery = `
        SELECT
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 1000
        ORDER BY mean_time DESC
        LIMIT 10;
      `;

      const slowQueries = await query(slowQueriesQuery);
      console.log('Slow queries found:');
      slowQueries.rows.forEach(q => {
        console.log(`  Mean time: ${q.mean_time}ms, Calls: ${q.calls}`);
        console.log(`  Query: ${q.query.substring(0, 100)}...`);
      });

    } catch (error) {
      console.log('  pg_stat_statements not available - cannot analyze query performance');
    }

    return {
      missingIndexes: missingIndexes.rows,
      currentIndexes: currentIndexes.rows,
      tableSizes: tableSizes.rows
    };

  } catch (error) {
    console.error('❌ Error analyzing performance:', error);
    throw error;
  }
}

async function optimizeIndexes() {
  console.log('\n🔧 Creating performance indexes...');

  try {
    const indexesToCreate = [
      // Inventory items indexes
      {
        name: 'idx_inventory_items_supplier_id',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);',
        description: 'Optimize supplier-based inventory queries'
      },
      {
        name: 'idx_inventory_items_sku',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);',
        description: 'Optimize SKU lookups'
      },
      {
        name: 'idx_inventory_items_stock_status',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_stock_status ON inventory_items(stock_qty, reorder_point);',
        description: 'Optimize stock status queries'
      },
      {
        name: 'idx_inventory_items_category_brand',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_category_brand ON inventory_items(category, brand);',
        description: 'Optimize category and brand filtering'
      },
      {
        name: 'idx_inventory_items_cost_price',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_cost_price ON inventory_items(cost_price);',
        description: 'Optimize cost-based queries and reporting'
      },

      // Stock movements indexes
      {
        name: 'idx_stock_movements_item_id',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);',
        description: 'Optimize item movement history queries'
      },
      {
        name: 'idx_stock_movements_created_at',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);',
        description: 'Optimize date-based movement queries'
      },
      {
        name: 'idx_stock_movements_type',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);',
        description: 'Optimize movement type filtering'
      },

      // Suppliers indexes
      {
        name: 'idx_suppliers_name',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_name ON suppliers(name);',
        description: 'Optimize supplier name searches'
      },
      {
        name: 'idx_suppliers_status',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_status ON suppliers(status);',
        description: 'Optimize active supplier filtering'
      },

      // Composite indexes for common query patterns
      {
        name: 'idx_inventory_items_supplier_status',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_supplier_status ON inventory_items(supplier_id, status);',
        description: 'Optimize supplier-status combined queries'
      },
      {
        name: 'idx_stock_movements_item_date',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_item_date ON stock_movements(item_id, created_at);',
        description: 'Optimize item movement timeline queries'
      }
    ];

    let indexesCreated = 0;
    let indexesSkipped = 0;

    for (const index of indexesToCreate) {
      try {
        console.log(`  Creating ${index.name}: ${index.description}`);
        await query(index.query);
        indexesCreated++;
        console.log(`    ✅ Created successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`    ✅ Already exists`);
          indexesSkipped++;
        } else {
          console.log(`    ❌ Failed: ${error.message}`);
        }
      }
    }

    return {
      indexesCreated,
      indexesSkipped,
      totalAttempted: indexesToCreate.length
    };

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function optimizeSettings() {
  console.log('\n🔧 Optimizing database settings...');

  try {
    const optimizations = [
      {
        name: 'Enable query planning statistics',
        query: 'SET track_activities = on;',
        description: 'Enable activity tracking for monitoring'
      },
      {
        name: 'Update table statistics',
        query: 'ANALYZE;',
        description: 'Update query planner statistics for all tables'
      }
    ];

    let optimizationsApplied = 0;

    for (const opt of optimizations) {
      try {
        console.log(`  ${opt.description}`);
        await query(opt.query);
        optimizationsApplied++;
        console.log(`    ✅ Applied successfully`);
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
      }
    }

    return {
      optimizationsApplied,
      totalAttempted: optimizations.length
    };

  } catch (error) {
    console.error('❌ Error optimizing settings:', error);
    throw error;
  }
}

async function createMaintenanceProcedures() {
  console.log('\n🔧 Creating maintenance procedures...');

  try {
    // Create a view for inventory status
    const createInventoryStatusView = `
      CREATE OR REPLACE VIEW inventory_status_summary AS
      SELECT
        i.id,
        i.sku,
        i.name,
        i.supplier_id,
        s.name as supplier_name,
        i.stock_qty,
        i.current_stock,
        i.reorder_point,
        i.max_stock,
        i.cost_price,
        i.sale_price,
        CASE
          WHEN i.stock_qty <= 0 THEN 'Out of Stock'
          WHEN i.stock_qty <= i.reorder_point THEN 'Low Stock'
          WHEN i.stock_qty >= i.max_stock THEN 'Overstock'
          ELSE 'In Stock'
        END as stock_status,
        i.updated_at as last_updated
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.status = 'active';
    `;

    await query(createInventoryStatusView);
    console.log('  ✅ Created inventory_status_summary view');

    // Create function for stock value calculation
    const createStockValueFunction = `
      CREATE OR REPLACE FUNCTION calculate_total_stock_value()
      RETURNS TABLE(
        total_cost_value NUMERIC,
        total_sale_value NUMERIC,
        item_count BIGINT,
        low_stock_count BIGINT,
        out_of_stock_count BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          SUM(i.stock_qty * i.cost_price) as total_cost_value,
          SUM(i.stock_qty * COALESCE(i.sale_price, i.cost_price)) as total_sale_value,
          COUNT(*)::BIGINT as item_count,
          COUNT(CASE WHEN i.stock_qty <= i.reorder_point THEN 1 END)::BIGINT as low_stock_count,
          COUNT(CASE WHEN i.stock_qty <= 0 THEN 1 END)::BIGINT as out_of_stock_count
        FROM inventory_items i
        WHERE i.status = 'active';
      END;
      $$ LANGUAGE plpgsql;
    `;

    await query(createStockValueFunction);
    console.log('  ✅ Created calculate_total_stock_value() function');

    return {
      viewsCreated: 1,
      functionsCreated: 1
    };

  } catch (error) {
    console.error('❌ Error creating maintenance procedures:', error);
    throw error;
  }
}

async function validateOptimizations() {
  console.log('\n✅ Validating optimizations...');

  try {
    // Test a complex query to see performance
    const testQuery = `
      SELECT
        i.name,
        i.sku,
        i.stock_qty,
        s.name as supplier_name,
        COUNT(sm.id) as movement_count
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN stock_movements sm ON i.id = sm.item_id
      WHERE i.stock_qty > 0
      GROUP BY i.id, i.name, i.sku, i.stock_qty, s.name
      ORDER BY i.stock_qty DESC
      LIMIT 10;
    `;

    const startTime = Date.now();
    const result = await query(testQuery);
    const endTime = Date.now();

    console.log(`  Test query executed in ${endTime - startTime}ms`);
    console.log(`  Returned ${result.rows.length} rows`);

    // Test the new view
    const viewTest = await query('SELECT COUNT(*) as active_items FROM inventory_status_summary;');
    console.log(`  Inventory status view contains ${viewTest.rows[0].active_items} active items`);

    // Test the new function
    const functionTest = await query('SELECT * FROM calculate_total_stock_value();');
    const stockValue = functionTest.rows[0];
    console.log(`  Total stock cost value: R${Number(stockValue.total_cost_value).toLocaleString()}`);
    console.log(`  Total stock sale value: R${Number(stockValue.total_sale_value).toLocaleString()}`);
    console.log(`  Low stock items: ${stockValue.low_stock_count}`);
    console.log(`  Out of stock items: ${stockValue.out_of_stock_count}`);

    return {
      queryPerformance: endTime - startTime,
      activeItems: viewTest.rows[0].active_items,
      stockValue: stockValue
    };

  } catch (error) {
    console.error('❌ Error validating optimizations:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Database Performance Optimization...\n');

    // Step 1: Analyze current performance
    const analysis = await analyzePerformance();

    // Step 2: Optimize indexes
    const indexOptimization = await optimizeIndexes();

    // Step 3: Optimize settings
    const settingsOptimization = await optimizeSettings();

    // Step 4: Create maintenance procedures
    const maintenanceProcedures = await createMaintenanceProcedures();

    // Step 5: Validate optimizations
    const validation = await validateOptimizations();

    console.log('\n📊 Optimization Summary:');
    console.log('='.repeat(50));
    console.log(`Indexes created: ${indexOptimization.indexesCreated}`);
    console.log(`Indexes already existed: ${indexOptimization.indexesSkipped}`);
    console.log(`Database settings optimized: ${settingsOptimization.optimizationsApplied}`);
    console.log(`Views created: ${maintenanceProcedures.viewsCreated}`);
    console.log(`Functions created: ${maintenanceProcedures.functionsCreated}`);
    console.log(`Test query performance: ${validation.queryPerformance}ms`);

    console.log('\n✅ Database performance optimization completed successfully!');

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
  analyzePerformance,
  optimizeIndexes,
  optimizeSettings,
  createMaintenanceProcedures,
  validateOptimizations
};