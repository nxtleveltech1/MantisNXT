/**
 * Predictions by Service API
 * GET /api/v1/ai/predictions/by-service
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
} from '@/lib/ai/api-utils';
import { predictionService } from '@/lib/ai/services/prediction-service';

/**
 * GET /api/v1/ai/predictions/by-service?serviceType=demand_forecasting
 * Get predictions for a specific AI service type
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    // Validate required parameters
    requireQueryParams(searchParams, ['serviceType']);

    const serviceType = searchParams.get('serviceType')! as unknown;
    const status = searchParams.get('status') || undefined;
    const minConfidence = searchParams.get('minConfidence')
      ? parseFloat(searchParams.get('minConfidence')!)
      : undefined;

    const result = await predictionService.listPredictions(user.org_id, {
      serviceType,
      status,
      minConfidence,
      limit,
      offset,
    });

    return successResponse(result.predictions, {
      page,
      limit,
      total: result.total,
      hasMore: offset + limit < result.total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
