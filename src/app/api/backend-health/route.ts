/**
 * EMERGENCY BACKEND HEALTH CHECK API
 * Independent of frontend compilation - direct API access
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Test basic database connectivity
    console.log('🔍 Testing backend database connection...');
    const basicTest = await db.query('SELECT NOW() as timestamp, \'backend-health-check\' as test');
    const basicLatency = Date.now() - startTime;

    console.log('✅ Basic connectivity verified');

    // Test critical table access with fallbacks
    const checks = await Promise.allSettled([
      db.query('SELECT COUNT(*) as count FROM public.suppliers LIMIT 1'),
      db.query('SELECT COUNT(*) as count FROM public.inventory_items LIMIT 1'),
      db.query('SELECT COUNT(*) as count FROM purchase_orders LIMIT 1')
    ]);

    const totalLatency = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      status: 'backend_healthy',
      timestamp: new Date().toISOString(),
      checks: {
        basicConnection: {
          status: 'pass',
          latency: `${basicLatency}ms`,
          result: basicTest.rows[0]
        },
        supplierTable: {
          status: checks[0].status === 'fulfilled' ? 'pass' : 'fail',
          count: checks[0].status === 'fulfilled' ? checks[0].value.rows[0]?.count : 'unavailable',
          error: checks[0].status === 'rejected' ? checks[0].reason.message : null
        },
        inventoryTable: {
          status: checks[1].status === 'fulfilled' ? 'pass' : 'fail',
          count: checks[1].status === 'fulfilled' ? checks[1].value.rows[0]?.count : 'unavailable',
          error: checks[1].status === 'rejected' ? checks[1].reason.message : null
        },
        purchaseOrderTable: {
          status: checks[2].status === 'fulfilled' ? 'pass' : 'fail',
          count: checks[2].status === 'fulfilled' ? checks[2].value.rows[0]?.count : 'unavailable',
          error: checks[2].status === 'rejected' ? checks[2].reason.message : null
        }
      },
      performance: {
        totalLatency: `${totalLatency}ms`,
        connectionStatus: db.getStatus()
      }
    });

  } catch (error) {
    console.error('❌ Backend health check failed:', error);

    const errorLatency = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        status: 'backend_unhealthy',
        error: error instanceof Error ? error.message : 'Unknown backend error',
        timestamp: new Date().toISOString(),
        performance: {
          errorLatency: `${errorLatency}ms`
        }
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test-connection') {
      await db.testConnection();

      return NextResponse.json({
        success: true,
        message: 'Backend database connection test successful',
        timestamp: new Date().toISOString(),
        connectionStatus: db.getStatus()
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use "test-connection" to verify backend connectivity.'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Backend connection test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Backend connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}