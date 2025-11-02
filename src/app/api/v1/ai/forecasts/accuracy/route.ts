/**
 * Forecast Accuracy Metrics API
 * GET /api/v1/ai/forecasts/accuracy
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractDateRange,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/forecasts/accuracy
 * Get forecast accuracy metrics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { startDate, endDate } = extractDateRange(searchParams);

    const productId = searchParams.get('productId');
    const granularity = searchParams.get('granularity');

    // TODO: Call DemandForecastingService when available from Team C
    // const metrics = await DemandForecastingService.getAccuracyMetrics(
    //   user.org_id,
    //   {
    //     productId,
    //     granularity,
    //     startDate,
    //     endDate,
    //   }
    // );

    // Mock response structure
    const metrics = {
      overall: {
        totalForecasts: 500,
        averageAccuracy: 0.87,
        mape: 12.5, // Mean Absolute Percentage Error
        rmse: 15.3, // Root Mean Square Error
      },
      byGranularity: {
        daily: {
          totalForecasts: 300,
          averageAccuracy: 0.85,
          mape: 14.2,
        },
        weekly: {
          totalForecasts: 150,
          averageAccuracy: 0.89,
          mape: 10.5,
        },
        monthly: {
          totalForecasts: 50,
          averageAccuracy: 0.91,
          mape: 8.7,
        },
      },
      byProduct: productId
        ? {
            productId,
            totalForecasts: 50,
            averageAccuracy: 0.88,
            trend: 'stable',
          }
        : undefined,
      trend: {
        direction: 'improving',
        changePercent: 2.5,
        period: '30d',
      },
      calculatedAt: new Date().toISOString(),
    };

    return successResponse(metrics);
  } catch (error) {
    return handleAIError(error);
  }
}
