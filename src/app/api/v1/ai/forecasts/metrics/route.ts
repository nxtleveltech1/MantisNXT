/**
 * Forecast Accuracy Metrics API
 * GET /api/v1/ai/forecasts/metrics - Get accuracy metrics by horizon
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
} from '@/lib/ai/api-utils';
import { demandForecastService, ForecastHorizon } from '@/lib/ai/services/forecast-service';

/**
 * GET /api/v1/ai/forecasts/metrics
 * Get accuracy metrics for forecasts
 *
 * Query parameters:
 * - horizon: optional filter by specific horizon (daily, weekly, monthly)
 *
 * Returns aggregated accuracy metrics including:
 * - Total forecasts count
 * - Forecasts with actual values
 * - Average and median accuracy
 * - Accuracy distribution (excellent, good, fair, poor)
 * - Mean absolute error (MAE)
 * - Mean absolute percentage error (MAPE)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;

    const horizon = searchParams.get('horizon') as ForecastHorizon | null;

    // Get accuracy metrics from service
    const metrics = await demandForecastService.getAccuracyMetrics(
      user.org_id,
      horizon || undefined
    );

    // Calculate overall summary if multiple horizons returned
    const summary = metrics.length > 1 ? {
      total_forecasts: metrics.reduce((sum, m) => sum + m.total_forecasts, 0),
      total_with_actuals: metrics.reduce((sum, m) => sum + m.forecasts_with_actuals, 0),
      overall_average_accuracy: metrics.reduce((sum, m) => sum + m.average_accuracy, 0) / metrics.length,
      overall_mape: metrics.reduce((sum, m) => sum + m.mean_absolute_percentage_error, 0) / metrics.length,
      horizons_analyzed: metrics.length,
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        summary,
        by_horizon: metrics,
      },
      message: horizon
        ? `Metrics for ${horizon} horizon`
        : 'Metrics for all horizons',
    });
  } catch (error) {
    return handleAIError(error);
  }
}
