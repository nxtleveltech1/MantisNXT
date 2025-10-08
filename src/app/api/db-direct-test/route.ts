/**
 * EMERGENCY DATABASE CONNECTION TEST
 * Direct connection - no complex imports
 */

import { Pool } from 'pg';

export async function GET() {
  let pool: Pool | null = null;

  try {
    // Create direct pool connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'mantis_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
    });

    // Test basic connectivity
    const healthResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');

    // Test critical table access
    const tableTests = await Promise.allSettled([
      pool.query('SELECT COUNT(*) as count FROM suppliers LIMIT 1'),
      pool.query('SELECT COUNT(*) as count FROM inventory_items LIMIT 1'),
      pool.query('SELECT COUNT(*) as count FROM purchase_orders LIMIT 1')
    ]);

    return Response.json({
      success: true,
      status: 'database_operational',
      timestamp: new Date().toISOString(),
      connection: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'mantis_dev',
        connected: true
      },
      health_check: {
        current_time: healthResult.rows[0].current_time,
        postgres_version: healthResult.rows[0].pg_version
      },
      table_access: {
        suppliers: tableTests[0].status === 'fulfilled' ?
          { status: 'accessible', count: tableTests[0].value.rows[0].count } :
          { status: 'error', error: tableTests[0].reason?.message },
        inventory_items: tableTests[1].status === 'fulfilled' ?
          { status: 'accessible', count: tableTests[1].value.rows[0].count } :
          { status: 'error', error: tableTests[1].reason?.message },
        purchase_orders: tableTests[2].status === 'fulfilled' ?
          { status: 'accessible', count: tableTests[2].value.rows[0].count } :
          { status: 'error', error: tableTests[2].reason?.message }
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      status: 'database_error',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
      connection: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'mantis_dev',
        connected: false
      }
    }, { status: 503 });

  } finally {
    // Clean up connection
    if (pool) {
      try {
        await pool.end();
      } catch (error) {
        console.error('Error closing pool:', error);
      }
    }
  }
}

export async function POST() {
  return Response.json({
    message: 'Database connection test - use GET method for health check',
    endpoints: {
      health_check: 'GET /api/db-direct-test'
    }
  }, { status: 405 });
}