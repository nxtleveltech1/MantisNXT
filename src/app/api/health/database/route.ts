/**
 * Database Health Check API
 * Test live database connectivity and table status
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import dbManager from '@/lib/database/enterprise-connection-manager';
import getDatabaseMetadata from '@/lib/database-info';

export async function GET(request: NextRequest) {
  const metadata = getDatabaseMetadata();
  try {
    console.log('🔍 Testing database connection...');

    // Test basic connectivity
    const connectionTest = await pool.query(
      'SELECT NOW() as current_time, version() as pg_version'
    );

    if (!connectionTest.rows || connectionTest.rows.length === 0) {
      throw new Error('No response from database');
    }

    const dbInfo = connectionTest.rows[0];
    console.log('✅ Database connected:', dbInfo);

    // Test table existence - checking core schema for Neon database
    const tablesQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'core'
      ORDER BY table_name
    `;

    const tablesResult = await pool.query(tablesQuery);
    const tables = tablesResult.rows;

    // Check for key enterprise tables in core schema
    const requiredTables = [
      'supplier',
      'stock_on_hand',
      'supplier_product',
      'product',
      'stock_movements',
    ];

    const existingTables = tables.map(t => t.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    // Get table row counts for existing tables in core schema
    const tableCounts = {};
    for (const table of existingTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM core."${table}"`);
        tableCounts[table] = parseInt(countResult.rows[0].count);
      } catch (error) {
        tableCounts[table] = 'Error accessing table';
      }
    }

    // Test specific queries for key functionality
    const functionalityTests = [];

    // Test suppliers table
    try {
      const suppliersTest = await pool.query('SELECT COUNT(*) as count FROM core.supplier');
      functionalityTests.push({
        test: 'Suppliers Table Access (core.supplier)',
        status: 'success',
        details: `${suppliersTest.rows[0].count} suppliers found`,
      });
    } catch (error) {
      functionalityTests.push({
        test: 'Suppliers Table Access (core.supplier)',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test inventory table
    try {
      const inventoryTest = await pool.query('SELECT COUNT(*) as count FROM core.stock_on_hand');
      functionalityTests.push({
        test: 'Inventory Table Access (core.stock_on_hand)',
        status: 'success',
        details: `${inventoryTest.rows[0].count} inventory items found`,
      });
    } catch (error) {
      functionalityTests.push({
        test: 'Inventory Table Access (core.stock_on_hand)',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test stock movements table
    try {
      const stockTest = await pool.query('SELECT COUNT(*) as count FROM core.stock_movements');
      functionalityTests.push({
        test: 'Stock Movements Table Access (core.stock_movements)',
        status: 'success',
        details: `${stockTest.rows[0].count} stock movements found`,
      });
    } catch (error) {
      functionalityTests.push({
        test: 'Stock Movements Table Access (core.stock_movements)',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Calculate overall health score
    const successfulTests = functionalityTests.filter(t => t.status === 'success').length;
    const totalTests = functionalityTests.length;
    const healthScore = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

    const healthStatus =
      healthScore === 100
        ? 'excellent'
        : healthScore >= 80
          ? 'good'
          : healthScore >= 60
            ? 'fair'
            : 'poor';

    const poolStatus = dbManager.getStatus();
    const poolHealth = dbManager.getPoolHealth();

    return NextResponse.json({
      success: true,
      database: {
        status: 'connected',
        healthScore: Math.round(healthScore),
        healthStatus,
        connection: {
          timestamp: dbInfo.current_time,
          version: dbInfo.pg_version,
          host: metadata.host,
          port: metadata.port,
          database: metadata.database,
        },
        tables: {
          total: tables.length,
          existing: existingTables,
          missing: missingTables,
          counts: tableCounts,
        },
        functionality: {
          tests: functionalityTests,
          summary: `${successfulTests}/${totalTests} tests passed`,
        },
      },
      pool: {
        status: poolHealth.status,
        message: poolHealth.message,
        metrics: {
          total: poolStatus.totalConnections,
          active: poolStatus.activeConnections,
          idle: poolStatus.idleConnections,
          waiting: poolStatus.waitingConnections,
          avgResponseTime: poolStatus.avgResponseTime,
        },
      },
      recommendations: generateRecommendations(missingTables, functionalityTests),
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);

    return NextResponse.json(
      {
        success: false,
        database: {
          status: 'failed',
          healthScore: 0,
          healthStatus: 'critical',
          error: error instanceof Error ? error.message : 'Unknown database error',
          connection: {
            host: metadata.host,
            port: metadata.port,
            database: metadata.database,
          },
        },
        recommendations: [
          'Check database server availability',
          'Verify connection credentials',
          'Ensure database exists and is accessible',
          'Check network connectivity to database server',
        ],
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(missingTables: string[], functionalityTests: any[]): string[] {
  const recommendations: string[] = [];

  if (missingTables.length > 0) {
    recommendations.push(
      `Missing tables detected: ${missingTables.join(', ')}. Run database migrations.`
    );
  }

  const failedTests = functionalityTests.filter(t => t.status === 'error');
  if (failedTests.length > 0) {
    recommendations.push(
      `${failedTests.length} functionality tests failed. Check table permissions and structure.`
    );
  }

  if (missingTables.includes('supplier')) {
    recommendations.push('Supplier table is missing - supplier management will not work');
  }

  if (missingTables.includes('stock_on_hand')) {
    recommendations.push('Stock on hand table is missing - inventory management will not work');
  }

  if (missingTables.includes('stock_movements')) {
    recommendations.push('Stock movements table is missing - inventory tracking will not work');
  }

  if (recommendations.length === 0) {
    recommendations.push('Database is fully operational and ready for production use');
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
