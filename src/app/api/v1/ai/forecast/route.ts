import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DemandForecastingService } from '@/lib/ai/services/DemandForecastingService';
import { z } from 'zod';

const forecastRequestSchema = z.object({
  productId: z.string().uuid(),
  horizon: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  historicalDays: z.number().int().min(7).max(365).optional(),
  includeSeasonality: z.boolean().optional(),
});

const batchForecastSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(50),
  horizon: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  historicalDays: z.number().int().min(7).max(365).optional(),
});

/**
 * POST /api/v1/ai/forecast - Generate demand forecast
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Check if batch or single forecast
    if (body.productIds && Array.isArray(body.productIds)) {
      // Batch forecast
      const validated = batchForecastSchema.parse(body);
      const service = new DemandForecastingService();

      const result = await service.generateBatchForecast(
        session.user.orgId,
        validated,
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Forecast generation failed' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: {
          provider: result.provider,
          durationMs: result.durationMs,
          usage: result.usage,
        },
      });
    } else {
      // Single forecast
      const validated = forecastRequestSchema.parse(body);
      const service = new DemandForecastingService();

      const result = await service.generateForecast(
        session.user.orgId,
        validated,
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Forecast generation failed' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: {
          provider: result.provider,
          model: result.model,
          durationMs: result.durationMs,
          usage: result.usage,
        },
      });
    }
  } catch (error) {
    console.error('Forecast API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/v1/ai/forecast?productId=xxx - Get existing forecasts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 },
      );
    }

    // Fetch forecasts from database
    const { db } = await import('@/lib/database');
    const result = await db.query(
      `
      SELECT
        id,
        product_id,
        forecast_date,
        forecast_horizon,
        predicted_quantity,
        lower_bound,
        upper_bound,
        confidence_interval,
        algorithm_used,
        accuracy_score,
        actual_quantity,
        metadata,
        created_at
      FROM demand_forecast
      WHERE org_id = $1
        AND product_id = $2
        AND forecast_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY forecast_date DESC, created_at DESC
      LIMIT 50
      `,
      [session.user.orgId, productId],
    );

    const forecasts = result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      forecastDate: row.forecast_date,
      horizon: row.forecast_horizon,
      predictedQuantity: parseFloat(row.predicted_quantity),
      lowerBound: parseFloat(row.lower_bound),
      upperBound: parseFloat(row.upper_bound),
      confidenceInterval: parseFloat(row.confidence_interval),
      algorithm: row.algorithm_used,
      accuracyScore: row.accuracy_score ? parseFloat(row.accuracy_score) : null,
      actualQuantity: row.actual_quantity ? parseFloat(row.actual_quantity) : null,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: forecasts,
      count: forecasts.length,
    });
  } catch (error) {
    console.error('Get forecasts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
