/**
 * API Route: /api/extraction/monitor
 *
 * Real-time extraction pipeline monitoring endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractionMonitor } from '@/lib/services/ExtractionMonitor';

/**
 * GET /api/extraction/monitor
 * Get comprehensive monitoring dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'dashboard';

    switch (view) {
      case 'dashboard':
        const dashboard = await extractionMonitor.getDashboard();
        return NextResponse.json({
          success: true,
          data: dashboard,
        });

      case 'health':
        const health = await extractionMonitor.performHealthCheck();
        return NextResponse.json({
          success: true,
          data: health,
        });

      case 'queue':
        const queue = extractionMonitor.getQueueMetrics();
        return NextResponse.json({
          success: true,
          data: queue,
        });

      case 'performance':
        const performance = await extractionMonitor.getPerformanceMetrics();
        return NextResponse.json({
          success: true,
          data: performance,
        });

      case 'errors':
        const errors = await extractionMonitor.getErrorMetrics();
        return NextResponse.json({
          success: true,
          data: errors,
        });

      case 'dlq':
        const dlq = await extractionMonitor.getDLQMetrics();
        return NextResponse.json({
          success: true,
          data: dlq,
        });

      case 'recent-jobs':
        const limit = parseInt(searchParams.get('limit') || '20');
        const jobs = await extractionMonitor.getRecentJobs(limit);
        return NextResponse.json({
          success: true,
          data: jobs,
        });

      case 'hourly-stats':
        const stats = await extractionMonitor.getHourlyStats();
        return NextResponse.json({
          success: true,
          data: stats,
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_VIEW',
              message: `Invalid view: ${view}`,
            },
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Extraction monitor API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
