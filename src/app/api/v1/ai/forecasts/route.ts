/**
 * Demand Forecasting API
 * GET  /api/v1/ai/forecasts - List forecasts
 * POST /api/v1/ai/forecasts - Generate forecast
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
  extractDateRange,
} from '@/lib/ai/api-utils';
import { generateForecastSchema } from '@/lib/ai/validation-schemas';

/**
 * GET /api/v1/ai/forecasts
 * List demand forecasts
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);
    const { startDate, endDate } = extractDateRange(searchParams);

    const productId = searchParams.get('productId');
    const granularity = searchParams.get('granularity');

    // TODO: Call DemandForecastingService when available from Team C
    // const result = await DemandForecastingService.listForecasts(user.org_id, {
    //   productId,
    //   granularity,
    //   startDate,
    //   endDate,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const forecasts = [];
    const total = 0;

    return successResponse(forecasts, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * POST /api/v1/ai/forecasts
 * Generate demand forecast for a product
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = generateForecastSchema.parse(body);

    // TODO: Call DemandForecastingService when available from Team C
    // const forecast = await DemandForecastingService.generateForecast(
    //   user.org_id,
    //   validated
    // );

    // Mock response structure
    const forecast = {
      id: 'forecast-123',
      org_id: user.org_id,
      product_id: validated.productId,
      forecast_data: {
        horizon: validated.horizon,
        granularity: validated.granularity,
        predictions: [
          { date: '2025-12-01', value: 150, confidence: 0.87 },
          { date: '2025-12-02', value: 155, confidence: 0.86 },
        ],
        confidenceIntervals: validated.includeConfidenceIntervals
          ? {
              lower: [140, 145],
              upper: [160, 165],
            }
          : undefined,
      },
      accuracy_score: null,
      metadata: validated.metadata,
      created_at: new Date().toISOString(),
    };

    return createdResponse(forecast);
  } catch (error) {
    return handleAIError(error);
  }
}
