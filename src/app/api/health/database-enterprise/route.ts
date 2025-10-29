/**
 * Enterprise Database Health Monitoring API
 * Comprehensive health checks with real-time metrics and diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';
import { enterpriseDb } from '@/lib/database';
import getDatabaseMetadata from '@/lib/database-info';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const metadata = getDatabaseMetadata();

  try {
    console.log('🔍 Starting comprehensive database health check...');

    // Get connection manager status
    const connectionStatus = enterpriseDb.getStatus();

    // Test basic query execution
    const basicQueryTest = await performBasicQueryTest();

    // Test transaction capabilities
    const transactionTest = await performTransactionTest();

    // Test concurrent operations
    const concurrencyTest = await performConcurrencyTest();

    // Database server information
    const serverInfo = await getServerInformation();

    // Schema validation
    const schemaValidation = await validateDatabaseSchema();

    // Performance metrics
    const performanceMetrics = await gatherPerformanceMetrics();

    const totalTime = Date.now() - startTime;
    const overallHealth = calculateOverallHealth([
      basicQueryTest,
      transactionTest,
      concurrencyTest,
      schemaValidation
    ]);

    console.log(`✅ Health check completed in ${totalTime}ms with ${overallHealth.score}% success rate`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkDurationMs: totalTime,
      overallHealth: overallHealth,

      connectionManager: {
        state: connectionStatus.state,
        poolStatus: connectionStatus.poolStatus,
        metrics: {
          totalConnections: connectionStatus.totalConnections,
          activeConnections: connectionStatus.activeConnections,
          idleConnections: connectionStatus.idleConnections,
          waitingConnections: connectionStatus.waitingConnections,
          failedConnections: connectionStatus.failedConnections,
          avgResponseTimeMs: Math.round(connectionStatus.avgResponseTime),
          uptimeMs: connectionStatus.uptime
        }
      },

      tests: {
        basicQuery: basicQueryTest,
        transactions: transactionTest,
        concurrency: concurrencyTest,
        schema: schemaValidation
      },

      server: serverInfo,
      performance: performanceMetrics,
      recommendations: generateHealthRecommendations(overallHealth, connectionStatus)
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ Health check failed after ${errorTime}ms:`, error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      checkDurationMs: errorTime,
      error: {
        message: error instanceof Error ? error.message : 'Unknown database error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        connectionManager: enterpriseDb.getStatus()
      },
      recommendations: [
        `Check database server availability at ${metadata.host}:${metadata.port}`,
        'Verify network connectivity and firewall rules',
        'Review database server logs for errors',
        'Consider scaling database resources'
      ]
    }, { status: 500 });
  }
}

async function performBasicQueryTest(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const result = await enterpriseDb.query(
      'SELECT NOW() as current_time, version() as pg_version, current_database() as db_name'
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Basic query returned no results');
    }

    return {
      name: 'Basic Query Test',
      status: 'success',
      durationMs: Date.now() - startTime,
      details: {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].pg_version,
        database: result.rows[0].db_name
      }
    };

  } catch (error) {
    return {
      name: 'Basic Query Test',
      status: 'error',
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function performTransactionTest(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const result = await enterpriseDb.transaction(async (client) => {
      await client.query('CREATE TEMPORARY TABLE health_test_tx (id INTEGER)');
      await client.query('INSERT INTO health_test_tx VALUES (1)');
      const selectResult = await client.query('SELECT COUNT(*) as count FROM health_test_tx');
      await client.query('DROP TABLE health_test_tx');
      return selectResult.rows[0].count;
    });

    return {
      name: 'Transaction Test',
      status: 'success',
      durationMs: Date.now() - startTime,
      details: {
        operationsCompleted: 4,
        recordsProcessed: parseInt(result)
      }
    };

  } catch (error) {
    return {
      name: 'Transaction Test',
      status: 'error',
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function performConcurrencyTest(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const concurrentQueries = Array(5).fill(0).map((_, i) =>
      enterpriseDb.query('SELECT $1 as query_id, NOW() as execution_time', [i])
    );

    const results = await Promise.all(concurrentQueries);
    const successful = results.filter(r => r.rows && r.rows.length > 0).length;

    return {
      name: 'Concurrency Test',
      status: successful === 5 ? 'success' : 'warning',
      durationMs: Date.now() - startTime,
      details: {
        totalQueries: 5,
        successfulQueries: successful,
        successRate: (successful / 5) * 100
      }
    };

  } catch (error) {
    return {
      name: 'Concurrency Test',
      status: 'error',
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getServerInformation(): Promise<any> {
  try {
    const serverQuery = await enterpriseDb.query(`
      SELECT
        version() as version,
        current_setting('max_connections') as max_connections,
        current_setting('shared_buffers') as shared_buffers,
        current_setting('effective_cache_size') as effective_cache_size,
        current_setting('maintenance_work_mem') as maintenance_work_mem,
        current_setting('checkpoint_completion_target') as checkpoint_completion_target,
        current_setting('wal_buffers') as wal_buffers,
        current_setting('default_statistics_target') as default_statistics_target
    `);

    const statsQuery = await enterpriseDb.query(`
      SELECT
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE pid != pg_backend_pid()
    `);

    return {
      version: serverQuery.rows[0].version,
      configuration: {
        maxConnections: parseInt(serverQuery.rows[0].max_connections),
        sharedBuffers: serverQuery.rows[0].shared_buffers,
        effectiveCacheSize: serverQuery.rows[0].effective_cache_size,
        maintenanceWorkMem: serverQuery.rows[0].maintenance_work_mem,
        checkpointCompletionTarget: parseFloat(serverQuery.rows[0].checkpoint_completion_target),
        walBuffers: serverQuery.rows[0].wal_buffers,
        defaultStatisticsTarget: parseInt(serverQuery.rows[0].default_statistics_target)
      },
      connectionStats: {
        total: parseInt(statsQuery.rows[0].total_connections),
        active: parseInt(statsQuery.rows[0].active_connections),
        idle: parseInt(statsQuery.rows[0].idle_connections)
      }
    };

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to get server information'
    };
  }
}

async function validateDatabaseSchema(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Check for essential tables
    const tablesQuery = await enterpriseDb.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const essentialTables = [
      'organizations', 'suppliers', 'inventory_items',
      'stock_movements', 'upload_sessions'
    ];

    const existingTables = tablesQuery.rows.map(row => row.table_name);
    const missingTables = essentialTables.filter(table => !existingTables.includes(table));

    // Check table health
    const tableHealth = await Promise.all(
      existingTables.slice(0, 10).map(async (tableName) => {
        try {
          const countResult = await enterpriseDb.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          return { table: tableName, records: parseInt(countResult.rows[0].count), status: 'healthy' };
        } catch (error) {
          return { table: tableName, records: 0, status: 'error', error: error instanceof Error ? error.message : 'Unknown' };
        }
      })
    );

    const healthyTables = tableHealth.filter(t => t.status === 'healthy').length;
    const totalChecked = tableHealth.length;

    return {
      name: 'Schema Validation',
      status: missingTables.length === 0 && healthyTables === totalChecked ? 'success' : 'warning',
      durationMs: Date.now() - startTime,
      details: {
        totalTables: existingTables.length,
        essentialTables: essentialTables.length,
        missingTables: missingTables,
        tableHealth: tableHealth,
        healthScore: totalChecked > 0 ? Math.round((healthyTables / totalChecked) * 100) : 0
      }
    };

  } catch (error) {
    return {
      name: 'Schema Validation',
      status: 'error',
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function gatherPerformanceMetrics(): Promise<any> {
  try {
    const performanceQuery = await enterpriseDb.query(`
      SELECT
        schemaname,
        tablename,
        attname,
        null_frac,
        avg_width,
        n_distinct,
        most_common_vals,
        most_common_freqs,
        histogram_bounds
      FROM pg_stats
      WHERE schemaname = 'public'
      LIMIT 20
    `);

    const indexQuery = await enterpriseDb.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        tablespace,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
      LIMIT 50
    `);

    return {
      statistics: performanceQuery.rows.length,
      indexes: indexQuery.rows.length,
      indexDetails: indexQuery.rows.slice(0, 10)
    };

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to gather performance metrics'
    };
  }
}

interface TestResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  durationMs: number;
  details?: any;
  error?: string;
}

interface OverallHealth {
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  summary: string;
}

function calculateOverallHealth(tests: TestResult[]): OverallHealth {
  const totalTests = tests.length;
  const successfulTests = tests.filter(t => t.status === 'success').length;
  const warningTests = tests.filter(t => t.status === 'warning').length;

  const score = Math.round(((successfulTests + warningTests * 0.5) / totalTests) * 100);

  let status: 'healthy' | 'degraded' | 'critical';
  if (score >= 90) status = 'healthy';
  else if (score >= 70) status = 'degraded';
  else status = 'critical';

  return {
    status,
    score,
    summary: `${successfulTests}/${totalTests} tests passed successfully`
  };
}

function generateHealthRecommendations(health: OverallHealth, connectionStatus: any): string[] {
  const recommendations: string[] = [];

  if (health.score < 100) {
    recommendations.push(`Health score is ${health.score}%. Review failed tests for improvement opportunities.`);
  }

  if (connectionStatus.failedConnections > 0) {
    recommendations.push(`${connectionStatus.failedConnections} connection failures detected. Monitor connection stability.`);
  }

  if (connectionStatus.avgResponseTime > 1000) {
    recommendations.push(`Average response time is ${Math.round(connectionStatus.avgResponseTime)}ms. Consider query optimization.`);
  }

  if (connectionStatus.waitingConnections > 0) {
    recommendations.push(`${connectionStatus.waitingConnections} connections waiting. Consider increasing pool size.`);
  }

  if (connectionStatus.state !== 'healthy') {
    recommendations.push(`Connection manager state is ${connectionStatus.state}. Review connection configuration.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Database is operating at optimal performance. Continue monitoring.');
  }

  return recommendations;
}
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Deprecated. Use /api/health', deprecated: true, redirectTo: '/api/health' },
    { status: 410 }
  )
}
