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
import { demandForecastService, ForecastHorizon } from '@/lib/ai/services/forecast-service';

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

    const productId = searchParams.get('productId') || undefined;
    const horizon = searchParams.get('granularity') as ForecastHorizon | undefined;

    // Fetch forecasts from service
    const result = await demandForecastService.listForecasts(user.org_id, {
      productId,
      horizon,
      startDate,
      endDate,
      limit,
      offset,
    });

    return successResponse(result.forecasts, {
      page,
      limit,
      total: result.total,
      hasMore: offset + limit < result.total,
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

    // Generate forecast using AI-powered service
    const forecasts = await demandForecastService.generateForecast(user.org_id, {
      productId: validated.productId,
      horizon: validated.granularity as ForecastHorizon,
      days: validated.horizon,
      includeConfidenceIntervals: validated.includeConfidenceIntervals,
      metadata: validated.metadata,
    });

    // Return the generated forecasts
    // If multiple forecasts generated, return array; otherwise return single object
    const response = forecasts.length === 1 ? forecasts[0] : forecasts;

    return createdResponse(response);
  } catch (error) {
    return handleAIError(error);
  }
}
