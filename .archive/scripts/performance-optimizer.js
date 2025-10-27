/**
 * DATABASE PERFORMANCE OPTIMIZER FOR MANTISNXT
 *
 * Advanced performance analysis and optimization:
 * - Query performance analysis
 * - Index optimization recommendations
 * - Table statistics and maintenance
 * - Connection pool optimization
 * - Slow query identification
 * - Memory usage analysis
 */

const { Pool } = require('pg');
const { performance } = require('perf_hooks');

class DatabasePerformanceOptimizer {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || '62.169.20.53',
      port: parseInt(process.env.DB_PORT || '6600'),
      database: process.env.DB_NAME || 'nxtprod-db_001',
      user: process.env.DB_USER || 'nxtdb_admin',
      password: process.env.DB_PASSWORD || 'P@33w0rd-1',
      ssl: false,
      max: 50,
      min: 10
    });

    this.performanceReport = {
      queryAnalysis: {},
      indexOptimization: {},
      tableStatistics: {},
      connectionPool: {},
      slowQueries: {},
      memoryUsage: {},
      recommendations: []
    };
  }

  /**
   * Run complete performance optimization analysis
   */
  async runPerformanceAnalysis() {
    console.log('🚀 Starting MantisNXT Performance Optimization Analysis...\n');

    try {
      await this.analyzeQueryPerformance();
      await this.analyzeIndexUsage();
      await this.analyzeTableStatistics();
      await this.analyzeConnectionPool();
      await this.identifySlowQueries();
      await this.analyzeMemoryUsage();
      await this.generateOptimizationScript();

      this.generatePerformanceReport();

    } catch (error) {
      console.error('❌ Performance analysis failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Analyze query performance for common operations
   */
  async analyzeQueryPerformance() {
    console.log('📊 Analyzing Query Performance...');

    const queries = [
      {
        name: 'Inventory Search by SKU',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT i.*, s.company_name as supplier_name
          FROM inventory_items i
          LEFT JOIN suppliers s ON i.supplier_id = s.id
          WHERE i.sku ILIKE '%LAPTOP%'
          LIMIT 20
        `
      },
      {
        name: 'Supplier Performance Report',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT
            s.company_name,
            COUNT(i.id) as item_count,
            AVG(i.unit_price) as avg_price,
            SUM(sm.quantity) as total_stock_movements
          FROM suppliers s
          LEFT JOIN inventory_items i ON i.supplier_id = s.id
          LEFT JOIN stock_movements sm ON sm.inventory_item_id = i.id
          WHERE s.status = 'active'
          GROUP BY s.id, s.company_name
          ORDER BY item_count DESC
        `
      },
      {
        name: 'Recent Stock Movements',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT
            sm.*,
            i.sku,
            i.product_name,
            u.first_name || ' ' || u.last_name as performed_by_name
          FROM stock_movements sm
          JOIN inventory_items i ON sm.inventory_item_id = i.id
          LEFT JOIN users u ON sm.performed_by = u.id
          WHERE sm.created_at >= NOW() - INTERVAL '7 days'
          ORDER BY sm.created_at DESC
          LIMIT 50
        `
      },
      {
        name: 'Dashboard Analytics Query',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT
            COUNT(DISTINCT i.id) as total_items,
            COUNT(DISTINCT s.id) as total_suppliers,
            SUM(i.stock_quantity * i.unit_price) as total_inventory_value,
            COUNT(DISTINCT sm.id) as total_movements_today
          FROM inventory_items i
          LEFT JOIN suppliers s ON i.supplier_id = s.id
          LEFT JOIN stock_movements sm ON sm.inventory_item_id = i.id
            AND sm.created_at >= CURRENT_DATE
          WHERE i.status = 'active'
        `
      }
    ];

    for (const query of queries) {
      try {
        const startTime = performance.now();
        const result = await this.pool.query(query.sql);
        const executionTime = performance.now() - startTime;

        const plan = result.rows[0]['QUERY PLAN'][0];

        this.performanceReport.queryAnalysis[query.name] = {
          executionTime: `${executionTime.toFixed(2)}ms`,
          planningTime: `${plan['Planning Time']}ms`,
          executionTimeDB: `${plan['Execution Time']}ms`,
          totalCost: plan['Plan']['Total Cost'],
          actualRows: plan['Plan']['Actual Rows'],
          nodeType: plan['Plan']['Node Type'],
          performance: this.categorizePerformance(executionTime),
          buffers: plan['Plan']['Buffers'] || 'No buffer information'
        };

        console.log(`✅ ${query.name}: ${executionTime.toFixed(2)}ms (${this.categorizePerformance(executionTime)})`);

      } catch (error) {
        this.performanceReport.queryAnalysis[query.name] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${query.name}: FAILED`);
      }
    }
  }

  /**
   * Analyze index usage and effectiveness
   */
  async analyzeIndexUsage() {
    console.log('\n🔍 Analyzing Index Usage...');

    try {
      // Get index usage statistics
      const indexUsageQuery = `
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan,
          CASE
            WHEN idx_scan = 0 THEN 'UNUSED'
            WHEN idx_scan < 100 THEN 'LOW_USAGE'
            WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
            ELSE 'HIGH_USAGE'
          END as usage_level
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `;

      const indexUsageResult = await this.pool.query(indexUsageQuery);

      // Get index sizes
      const indexSizeQuery = `
        SELECT
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          pg_relation_size(indexrelid) as size_bytes
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY pg_relation_size(indexrelid) DESC
      `;

      const indexSizeResult = await this.pool.query(indexSizeQuery);

      // Identify missing indexes
      const missingIndexQuery = `
        SELECT
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          CASE
            WHEN seq_scan > 1000 AND idx_scan < seq_scan * 0.1 THEN 'NEEDS_INDEX'
            ELSE 'OK'
          END as index_recommendation
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY seq_scan DESC
      `;

      const missingIndexResult = await this.pool.query(missingIndexQuery);

      this.performanceReport.indexOptimization = {
        totalIndexes: indexUsageResult.rowCount,
        unusedIndexes: indexUsageResult.rows.filter(row => row.usage_level === 'UNUSED'),
        lowUsageIndexes: indexUsageResult.rows.filter(row => row.usage_level === 'LOW_USAGE'),
        highUsageIndexes: indexUsageResult.rows.filter(row => row.usage_level === 'HIGH_USAGE'),
        indexSizes: indexSizeResult.rows,
        tablesNeedingIndexes: missingIndexResult.rows.filter(row => row.index_recommendation === 'NEEDS_INDEX')
      };

      console.log(`✅ Index analysis complete:`);
      console.log(`   Total indexes: ${indexUsageResult.rowCount}`);
      console.log(`   Unused indexes: ${this.performanceReport.indexOptimization.unusedIndexes.length}`);
      console.log(`   Tables needing indexes: ${this.performanceReport.indexOptimization.tablesNeedingIndexes.length}`);

    } catch (error) {
      this.performanceReport.indexOptimization = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Index analysis: FAILED');
    }
  }

  /**
   * Analyze table statistics and maintenance needs
   */
  async analyzeTableStatistics() {
    console.log('\n📈 Analyzing Table Statistics...');

    try {
      const tableStatsQuery = `
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          CASE
            WHEN n_live_tup > 0 THEN (n_dead_tup::float / n_live_tup::float) * 100
            ELSE 0
          END as dead_tuple_percentage,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
      `;

      const result = await this.pool.query(tableStatsQuery);

      const tablesNeedingMaintenance = result.rows.filter(row =>
        row.dead_tuple_percentage > 20 ||
        !row.last_analyze ||
        new Date(row.last_analyze) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      this.performanceReport.tableStatistics = {
        totalTables: result.rowCount,
        allTables: result.rows,
        tablesNeedingMaintenance: tablesNeedingMaintenance,
        largestTables: result.rows.slice(0, 5),
        maintenanceRecommendations: this.generateMaintenanceRecommendations(tablesNeedingMaintenance)
      };

      console.log(`✅ Table statistics analysis complete:`);
      console.log(`   Total tables: ${result.rowCount}`);
      console.log(`   Tables needing maintenance: ${tablesNeedingMaintenance.length}`);

    } catch (error) {
      this.performanceReport.tableStatistics = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Table statistics analysis: FAILED');
    }
  }

  /**
   * Analyze connection pool performance
   */
  async analyzeConnectionPool() {
    console.log('\n🔗 Analyzing Connection Pool...');

    try {
      const connectionStatsQuery = `
        SELECT
          state,
          COUNT(*) as connection_count,
          MAX(state_change) as last_state_change
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
        ORDER BY connection_count DESC
      `;

      const result = await this.pool.query(connectionStatsQuery);

      const poolStatus = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      this.performanceReport.connectionPool = {
        poolStatus: poolStatus,
        activeConnections: result.rows,
        poolEfficiency: this.calculatePoolEfficiency(poolStatus),
        recommendations: this.generatePoolRecommendations(poolStatus, result.rows)
      };

      console.log(`✅ Connection pool analysis complete:`);
      console.log(`   Pool efficiency: ${this.performanceReport.connectionPool.poolEfficiency}%`);
      console.log(`   Active connections: ${poolStatus.totalCount}`);

    } catch (error) {
      this.performanceReport.connectionPool = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Connection pool analysis: FAILED');
    }
  }

  /**
   * Identify slow queries from pg_stat_statements if available
   */
  async identifySlowQueries() {
    console.log('\n🐌 Identifying Slow Queries...');

    try {
      // Check if pg_stat_statements is available
      const extensionCheck = await this.pool.query(`
        SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')
      `);

      if (!extensionCheck.rows[0].exists) {
        this.performanceReport.slowQueries = {
          status: 'unavailable',
          message: 'pg_stat_statements extension not installed'
        };
        console.log('⚠️  pg_stat_statements extension not available');
        return;
      }

      const slowQueriesQuery = `
        SELECT
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE mean_time > 100  -- Queries taking more than 100ms on average
        ORDER BY mean_time DESC
        LIMIT 10
      `;

      const result = await this.pool.query(slowQueriesQuery);

      this.performanceReport.slowQueries = {
        status: 'success',
        count: result.rowCount,
        queries: result.rows.map(row => ({
          query: row.query.substring(0, 200) + '...',
          calls: row.calls,
          totalTime: `${row.total_time}ms`,
          meanTime: `${row.mean_time}ms`,
          hitPercent: row.hit_percent ? `${row.hit_percent.toFixed(2)}%` : 'N/A'
        }))
      };

      console.log(`✅ Slow query analysis complete: ${result.rowCount} slow queries found`);

    } catch (error) {
      this.performanceReport.slowQueries = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Slow query analysis: FAILED');
    }
  }

  /**
   * Analyze memory usage and cache performance
   */
  async analyzeMemoryUsage() {
    console.log('\n🧠 Analyzing Memory Usage...');

    try {
      const memoryStatsQuery = `
        SELECT
          'shared_buffers' as setting_name,
          setting as value,
          unit
        FROM pg_settings
        WHERE name = 'shared_buffers'
        UNION ALL
        SELECT
          'effective_cache_size' as setting_name,
          setting as value,
          unit
        FROM pg_settings
        WHERE name = 'effective_cache_size'
        UNION ALL
        SELECT
          'work_mem' as setting_name,
          setting as value,
          unit
        FROM pg_settings
        WHERE name = 'work_mem'
      `;

      const memoryResult = await this.pool.query(memoryStatsQuery);

      // Buffer cache hit ratio
      const bufferHitQuery = `
        SELECT
          ROUND(
            100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2
          ) AS buffer_hit_ratio
        FROM pg_stat_database
      `;

      const bufferResult = await this.pool.query(bufferHitQuery);

      this.performanceReport.memoryUsage = {
        settings: memoryResult.rows,
        bufferHitRatio: `${bufferResult.rows[0].buffer_hit_ratio}%`,
        recommendations: this.generateMemoryRecommendations(
          bufferResult.rows[0].buffer_hit_ratio,
          memoryResult.rows
        )
      };

      console.log(`✅ Memory analysis complete:`);
      console.log(`   Buffer hit ratio: ${bufferResult.rows[0].buffer_hit_ratio}%`);

    } catch (error) {
      this.performanceReport.memoryUsage = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Memory analysis: FAILED');
    }
  }

  /**
   * Generate optimization SQL script
   */
  async generateOptimizationScript() {
    console.log('\n⚡ Generating Optimization Script...');

    const optimizations = [];

    // Missing indexes
    if (this.performanceReport.indexOptimization.tablesNeedingIndexes) {
      this.performanceReport.indexOptimization.tablesNeedingIndexes.forEach(table => {
        optimizations.push(`-- Create index for frequently scanned table: ${table.tablename}`);
        optimizations.push(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${table.tablename}_performance ON ${table.tablename} (created_at);`);
        optimizations.push('');
      });
    }

    // Maintenance commands
    if (this.performanceReport.tableStatistics.tablesNeedingMaintenance) {
      optimizations.push('-- Table maintenance commands');
      this.performanceReport.tableStatistics.tablesNeedingMaintenance.forEach(table => {
        optimizations.push(`VACUUM ANALYZE ${table.tablename};`);
      });
      optimizations.push('');
    }

    // Standard performance indexes for MantisNXT
    const standardIndexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_sku_active ON inventory_items (sku) WHERE status = \'active\';',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_code_active ON suppliers (supplier_code) WHERE status = \'active\';',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_item_date ON stock_movements (inventory_item_id, created_at);',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_active ON users (organization_id) WHERE is_active = true;',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_orders_customer_date ON sales_orders (customer_id, order_date);'
    ];

    optimizations.push('-- Standard performance indexes for MantisNXT');
    optimizations.push(...standardIndexes);
    optimizations.push('');

    const scriptContent = optimizations.join('\n');

    // Write optimization script
    const fs = require('fs');
    fs.writeFileSync('K:/00Project/MantisNXT/scripts/performance-optimization.sql', scriptContent);

    console.log('✅ Optimization script generated: scripts/performance-optimization.sql');
  }

  /**
   * Helper methods
   */
  categorizePerformance(timeMs) {
    if (timeMs < 50) return 'excellent';
    if (timeMs < 200) return 'good';
    if (timeMs < 1000) return 'fair';
    return 'poor';
  }

  calculatePoolEfficiency(poolStatus) {
    const utilizationRate = (poolStatus.totalCount - poolStatus.idleCount) / poolStatus.totalCount;
    return Math.round(utilizationRate * 100);
  }

  generateMaintenanceRecommendations(tables) {
    return tables.map(table => ({
      table: table.tablename,
      reason: table.dead_tuple_percentage > 20 ? 'High dead tuple percentage' : 'Outdated statistics',
      action: table.dead_tuple_percentage > 20 ? 'VACUUM ANALYZE' : 'ANALYZE',
      priority: table.dead_tuple_percentage > 50 ? 'HIGH' : 'MEDIUM'
    }));
  }

  generatePoolRecommendations(poolStatus, connections) {
    const recommendations = [];

    if (poolStatus.waitingCount > 5) {
      recommendations.push('Consider increasing pool max size');
    }

    if (poolStatus.idleCount > poolStatus.totalCount * 0.8) {
      recommendations.push('Consider decreasing pool min size');
    }

    const activeConnections = connections.find(c => c.state === 'active');
    if (activeConnections && activeConnections.connection_count > 40) {
      recommendations.push('High number of active connections - check for connection leaks');
    }

    return recommendations;
  }

  generateMemoryRecommendations(hitRatio, settings) {
    const recommendations = [];

    if (hitRatio < 95) {
      recommendations.push('Buffer hit ratio is low - consider increasing shared_buffers');
    }

    const workMem = settings.find(s => s.setting_name === 'work_mem');
    if (workMem && parseInt(workMem.value) < 4096) {
      recommendations.push('work_mem is low - consider increasing for complex queries');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    console.log('\n📋 MANTISNXT PERFORMANCE OPTIMIZATION REPORT');
    console.log('=' .repeat(55));

    // Query Performance Summary
    console.log('\n🚀 QUERY PERFORMANCE SUMMARY:');
    console.log('─'.repeat(35));
    Object.entries(this.performanceReport.queryAnalysis).forEach(([name, result]) => {
      if (result.executionTime) {
        console.log(`  ${name}: ${result.executionTime} (${result.performance})`);
      }
    });

    // Index Optimization Summary
    console.log('\n🔍 INDEX OPTIMIZATION SUMMARY:');
    console.log('─'.repeat(35));
    const indexOpt = this.performanceReport.indexOptimization;
    if (indexOpt.totalIndexes) {
      console.log(`  Total indexes: ${indexOpt.totalIndexes}`);
      console.log(`  Unused indexes: ${indexOpt.unusedIndexes.length}`);
      console.log(`  Tables needing indexes: ${indexOpt.tablesNeedingIndexes.length}`);
    }

    // Memory Usage Summary
    console.log('\n🧠 MEMORY USAGE SUMMARY:');
    console.log('─'.repeat(35));
    if (this.performanceReport.memoryUsage.bufferHitRatio) {
      console.log(`  Buffer hit ratio: ${this.performanceReport.memoryUsage.bufferHitRatio}`);
    }

    // Connection Pool Summary
    console.log('\n🔗 CONNECTION POOL SUMMARY:');
    console.log('─'.repeat(35));
    const poolOpt = this.performanceReport.connectionPool;
    if (poolOpt.poolEfficiency) {
      console.log(`  Pool efficiency: ${poolOpt.poolEfficiency}%`);
      console.log(`  Active connections: ${poolOpt.poolStatus.totalCount}`);
    }

    // Critical Recommendations
    console.log('\n💡 CRITICAL RECOMMENDATIONS:');
    console.log('─'.repeat(35));

    // Compile all recommendations
    const allRecommendations = [
      ...(this.performanceReport.memoryUsage.recommendations || []),
      ...(this.performanceReport.connectionPool.recommendations || []),
      ...(this.performanceReport.tableStatistics.maintenanceRecommendations?.map(r => `${r.action} ${r.table} (${r.reason})`) || [])
    ];

    if (allRecommendations.length > 0) {
      allRecommendations.forEach(rec => console.log(`  • ${rec}`));
    } else {
      console.log('  ✅ No critical issues found');
    }

    console.log('\n🛠️  NEXT STEPS:');
    console.log('─'.repeat(35));
    console.log('  1. Review generated optimization script: scripts/performance-optimization.sql');
    console.log('  2. Execute maintenance commands during low-traffic periods');
    console.log('  3. Monitor query performance after optimizations');
    console.log('  4. Set up regular maintenance schedules');

    console.log('\n✅ Performance analysis completed successfully!');
  }
}

// Export for use in other scripts
module.exports = DatabasePerformanceOptimizer;

// Run if called directly
if (require.main === module) {
  const optimizer = new DatabasePerformanceOptimizer();
  optimizer.runPerformanceAnalysis().catch(console.error);
}