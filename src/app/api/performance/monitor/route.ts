import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/middleware/auth';
import { getPerformanceStats, getEndpointMetrics } from '@/lib/performance/api-monitor';
import { PerformanceOptimizer } from '@/lib/performance/optimizer';
import { pool } from '@/lib/database';

// GET /api/performance/monitor - Get performance metrics
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check if user has permission to view performance metrics
    if (
      !context.user.permissions.includes('admin') &&
      !context.user.permissions.includes('performance.read')
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions to view performance metrics',
          error: 'INSUFFICIENT_PERMISSION',
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const timeWindow = parseInt(url.searchParams.get('timeWindow') || '60'); // minutes
    const endpoint = url.searchParams.get('endpoint');
    const method = url.searchParams.get('method');

    // Get API performance statistics
    const apiStats = getPerformanceStats(timeWindow);

    // Get database performance metrics
    let dbMetrics = null;
    try {
      const optimizer = new PerformanceOptimizer(pool as any);
      dbMetrics = await optimizer.analyzeDatabasePerformance();
    } catch (error) {
      console.warn('Failed to get database metrics:', error);
    }

    // Get specific endpoint metrics if requested
    let endpointMetrics = null;
    if (endpoint && method) {
      endpointMetrics = getEndpointMetrics(endpoint, method, timeWindow);
    }

    return NextResponse.json({
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: {
        api: apiStats,
        database: dbMetrics,
        endpoint: endpointMetrics,
        timeWindow,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Performance monitoring error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve performance metrics',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
});

// POST /api/performance/monitor - Run performance optimization
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check if user has permission to run performance optimization
    if (
      !context.user.permissions.includes('admin') &&
      !context.user.permissions.includes('performance.write')
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions to run performance optimization',
          error: 'INSUFFICIENT_PERMISSION',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, options = {} } = body;

    const optimizer = new PerformanceOptimizer(pool as any);
    let result;

    switch (action) {
      case 'optimize':
        result = await optimizer.optimize();
        break;
      case 'optimizeIndexes':
        result = await optimizer.optimizeIndexes();
        break;
      case 'optimizeQueries':
        result = await optimizer.optimizeQueries();
        break;
      case 'optimizeConnections':
        result = await optimizer.optimizeConnections();
        break;
      case 'getRecommendations': {
        const recommendations = await optimizer.getRecommendations();
        result = {
          success: true,
          message: 'Performance recommendations retrieved',
          recommendations,
        };
        break;
      }
      default:
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid optimization action',
            error: 'INVALID_ACTION',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        result,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Performance optimization error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Performance optimization failed',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
});

