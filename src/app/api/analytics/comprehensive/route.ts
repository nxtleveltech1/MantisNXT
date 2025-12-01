import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAnalyticsService } from '@/lib/analytics/analytics-integration';

/**
 * Comprehensive Analytics API Endpoint
 * Provides unified access to all analytics and optimization features
 */

// Cache for analytics services (in production, use Redis or similar)
const analyticsServices = new Map<string, unknown>();

/**
 * GET /api/analytics/comprehensive
 * Get comprehensive analytics dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type') || 'dashboard';

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Get or create analytics service
    let analyticsService = analyticsServices.get(organizationId);
    if (!analyticsService) {
      analyticsService = createAnalyticsService(organizationId);
      await analyticsService.initialize();
      analyticsServices.set(organizationId, analyticsService);
    }

    let response;

    switch (type) {
      case 'dashboard':
        response = await analyticsService.getAnalyticsDashboard();
        break;

      case 'insights': {
        const limit = parseInt(searchParams.get('limit') || '20');
        response = await analyticsService.getAIInsights(limit);
        break;
      }

      case 'recommendations': {
        const recType = searchParams.get('recType');
        const recLimit = parseInt(searchParams.get('limit') || '15');
        response = await analyticsService.getRecommendations(recType, recLimit);
        break;
      }

      case 'anomalies': {
        const anomalyLimit = parseInt(searchParams.get('limit') || '10');
        response = await analyticsService.getAnomalies(anomalyLimit);
        break;
      }

      case 'predictions':
        response = await analyticsService.getPredictions();
        break;

      case 'performance':
        response = await analyticsService.getPerformanceMetrics();
        break;

      case 'status':
        response = analyticsService.getStatus();
        break;

      case 'report': {
        const startDate = searchParams.get('startDate')
          ? new Date(searchParams.get('startDate')!)
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const endDate = searchParams.get('endDate')
          ? new Date(searchParams.get('endDate')!)
          : new Date();

        response = await analyticsService.generateAnalyticsReport(startDate, endDate);
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown analytics type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      organizationId,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/comprehensive
 * Execute analytics operations (optimization, configuration updates)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, action, params = {} } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Get or create analytics service
    let analyticsService = analyticsServices.get(organizationId);
    if (!analyticsService) {
      analyticsService = createAnalyticsService(organizationId);
      await analyticsService.initialize();
      analyticsServices.set(organizationId, analyticsService);
    }

    let response;

    switch (action) {
      case 'optimize': {
        const { type: optType, ...optParams } = params;
        if (!optType) {
          return NextResponse.json({ error: 'Optimization type is required' }, { status: 400 });
        }
        response = await analyticsService.executeOptimization(optType, optParams);
        break;
      }

      case 'updateConfig': {
        const { config } = params;
        if (!config) {
          return NextResponse.json({ error: 'Configuration is required' }, { status: 400 });
        }
        await analyticsService.updateConfig(config);
        response = { success: true, message: 'Configuration updated' };
        break;
      }

      case 'initialize':
        await analyticsService.initialize();
        response = { success: true, message: 'Analytics service initialized' };
        break;

      case 'shutdown':
        await analyticsService.shutdown();
        analyticsServices.delete(organizationId);
        response = { success: true, message: 'Analytics service shutdown' };
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      organizationId,
      action,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/analytics/comprehensive
 * Update analytics configuration or thresholds
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, config } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!config) {
      return NextResponse.json({ error: 'Configuration is required' }, { status: 400 });
    }

    // Get analytics service
    const analyticsService = analyticsServices.get(organizationId);
    if (!analyticsService) {
      return NextResponse.json(
        { error: 'Analytics service not found. Initialize first.' },
        { status: 404 }
      );
    }

    await analyticsService.updateConfig(config);

    return NextResponse.json({
      success: true,
      message: 'Analytics configuration updated successfully',
      timestamp: new Date().toISOString(),
      organizationId,
    });
  } catch (error) {
    console.error('Analytics configuration update error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics/comprehensive
 * Shutdown and remove analytics service for organization
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Get and shutdown analytics service
    const analyticsService = analyticsServices.get(organizationId);
    if (analyticsService) {
      await analyticsService.shutdown();
      analyticsServices.delete(organizationId);
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics service shutdown and removed',
      timestamp: new Date().toISOString(),
      organizationId,
    });
  } catch (error) {
    console.error('Analytics service removal error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
