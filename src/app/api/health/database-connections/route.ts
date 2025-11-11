// Database Connection Health Check API
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { query, getPoolStatus } from '@/lib/database/unified-connection';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Test basic connection
    const basicTest = await query('SELECT NOW() as timestamp, \'database-health-check\' as test');
    const basicLatency = Date.now() - startTime;

    // Test table access
    const supplierTest = await query(
      'SELECT COUNT(*) as supplier_count FROM public.suppliers LIMIT 1'
    );

    const inventoryTest = await query(
      'SELECT COUNT(*) as inventory_count FROM public.inventory_items LIMIT 1'
    );

    const totalLatency = Date.now() - startTime;

    // Get connection status
    const connectionStatus = getPoolStatus();

    return NextResponse.json({
      success: true,
      status: 'healthy',
      checks: {
        basicConnection: {
          status: 'pass',
          latency: `${basicLatency}ms`,
          timestamp: basicTest.rows[0]?.timestamp
        },
        supplierTableAccess: {
          status: 'pass',
          count: supplierTest.rows[0]?.supplier_count || 0
        },
        inventoryTableAccess: {
          status: 'pass',
          count: inventoryTest.rows[0]?.inventory_count || 0
        }
      },
      connection: connectionStatus,
      performance: {
        totalLatency: `${totalLatency}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Database health check failed:', error);

    const errorLatency = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown database error',
        performance: {
          errorLatency: `${errorLatency}ms`,
          timestamp: new Date().toISOString()
        },
        connection: getPoolStatus()
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'reinitialize') {
      // Connection manager is lazy-initialized, no manual reinit needed
      // Just test connection to force initialization if needed
      await query('SELECT 1');

      return NextResponse.json({
        success: true,
        message: 'Database connection verified',
        connection: getPoolStatus(),
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use "reinitialize" to verify connections.'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Database verification failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify database connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
