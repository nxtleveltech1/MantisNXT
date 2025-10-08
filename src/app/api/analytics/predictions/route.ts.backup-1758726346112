// Analytics Predictions API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createAnalyticsService } from '@/lib/analytics/analytics-service';

// Database connection
const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false,
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  min: parseInt(process.env.DB_POOL_MIN || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
});

const analyticsService = createAnalyticsService(db);

// GET /api/analytics/predictions - Get predictions and forecasts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'supplier' | 'demand' | 'price' | 'all'
    const supplierId = searchParams.get('supplierId');
    const itemId = searchParams.get('itemId');
    const organizationId = searchParams.get('organizationId') || '1'; // Default org

    const startTime = Date.now();

    let results: any = {};

    switch (type) {
      case 'supplier':
        results.supplierAnalytics = await analyticsService.analyzeSupplierPerformance(
          supplierId || undefined,
          organizationId
        );
        break;

      case 'demand':
        results.demandForecasts = await analyticsService.forecastInventoryDemand(
          itemId || undefined,
          organizationId
        );
        break;

      case 'price':
        results.priceOptimizations = await analyticsService.optimizePricing(
          itemId || undefined,
          organizationId
        );
        break;

      case 'all':
      default:
        // Get comprehensive analytics
        const [supplierAnalytics, demandForecasts, priceOptimizations] = await Promise.all([
          analyticsService.analyzeSupplierPerformance(undefined, organizationId),
          analyticsService.forecastInventoryDemand(undefined, organizationId),
          analyticsService.optimizePricing(undefined, organizationId)
        ]);

        results = {
          supplierAnalytics,
          demandForecasts,
          priceOptimizations
        };
        break;
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        type,
        organizationId
      }
    });

  } catch (error) {
    console.error('Analytics predictions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate predictions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/analytics/predictions - Trigger manual prediction update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, targetId, organizationId = '1', options = {} } = body;

    const startTime = Date.now();
    let results: any = {};

    switch (type) {
      case 'supplier_performance':
        results = await analyticsService.analyzeSupplierPerformance(targetId, organizationId);
        break;

      case 'demand_forecast':
        results = await analyticsService.forecastInventoryDemand(targetId, organizationId);
        break;

      case 'price_optimization':
        results = await analyticsService.optimizePricing(targetId, organizationId);
        break;

      case 'comprehensive':
        const [supplierAnalytics, demandForecasts, priceOptimizations, anomalies] = await Promise.all([
          analyticsService.analyzeSupplierPerformance(undefined, organizationId),
          analyticsService.forecastInventoryDemand(undefined, organizationId),
          analyticsService.optimizePricing(undefined, organizationId),
          analyticsService.detectAnomalies(organizationId)
        ]);

        results = {
          supplierAnalytics,
          demandForecasts,
          priceOptimizations,
          anomalies
        };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid prediction type',
            validTypes: ['supplier_performance', 'demand_forecast', 'price_optimization', 'comprehensive']
          },
          { status: 400 }
        );
    }

    const processingTime = Date.now() - startTime;

    // Log the prediction request
    await db.query(`
      INSERT INTO analytics_requests (type, target_id, organization_id, processing_time, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [type, targetId, organizationId, processingTime]);

    return NextResponse.json({
      success: true,
      message: 'Predictions generated successfully',
      data: results,
      metadata: {
        type,
        targetId,
        organizationId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics prediction generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate predictions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}