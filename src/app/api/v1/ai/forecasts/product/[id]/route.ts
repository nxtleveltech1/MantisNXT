/**
 * Product Forecast API
 * GET /api/v1/ai/forecasts/product/[id]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractDateRange,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/forecasts/product/[id]
 * Get all forecasts for a specific product
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { startDate, endDate } = extractDateRange(searchParams);

    const granularity = searchParams.get('granularity');
    const includeHistorical = searchParams.get('includeHistorical') === 'true';

    // TODO: Call DemandForecastingService when available from Team C
    // const forecasts = await DemandForecastingService.getProductForecasts(
    //   user.org_id,
    //   productId: id,
    //   {
    //     granularity,
    //     startDate,
    //     endDate,
    //     includeHistorical,
    //   }
    // );

    // Mock response structure
    const forecasts = {
      productId: id,
      currentForecast: {
        id: 'forecast-123',
        horizon: 30,
        granularity: 'daily',
        predictions: [],
        createdAt: new Date().toISOString(),
      },
      historicalForecasts: includeHistorical ? [] : undefined,
      accuracy: {
        overall: 0.87,
        recent: 0.89,
        trend: 'improving',
      },
    };

    return successResponse(forecasts);
  } catch (error) {
    return handleAIError(error);
  }
}
