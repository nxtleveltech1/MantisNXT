/**
 * Health check endpoint for Supplier Discovery System
 * Endpoint: /api/suppliers/discovery/health
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supplierDiscoveryEngine } from '@/lib/supplier-discovery/engine';

/**
 * GET /api/suppliers/discovery/health
 * Health check and system status
 */
export async function GET(request: NextRequest) {
  try {
    const healthCheck = await supplierDiscoveryEngine.healthCheck();
    const statistics = supplierDiscoveryEngine.getStatistics();

    const response = {
      status: healthCheck.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      system: healthCheck.details,
      statistics,
      version: '1.0.0',
    };

    const statusCode = healthCheck.healthy ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        version: '1.0.0',
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/suppliers/discovery/health
 * Initialize discovery engine
 */
export async function POST(request: NextRequest) {
  try {
    await supplierDiscoveryEngine.initialize();

    return NextResponse.json({
      success: true,
      message: 'Discovery engine initialized successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Engine initialization error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize discovery engine',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suppliers/discovery/health
 * Cleanup discovery engine resources
 */
export async function DELETE(request: NextRequest) {
  try {
    await supplierDiscoveryEngine.cleanup();

    return NextResponse.json({
      success: true,
      message: 'Discovery engine cleanup completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Engine cleanup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup discovery engine',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
