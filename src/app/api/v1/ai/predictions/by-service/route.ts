/**
 * Predictions by Service API
 * GET /api/v1/ai/predictions/by-service
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
} from '@/lib/ai/api-utils';

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

    const serviceType = searchParams.get('serviceType')!;
    const status = searchParams.get('status');
    const minConfidence = searchParams.get('minConfidence')
      ? parseFloat(searchParams.get('minConfidence')!)
      : undefined;

    // TODO: Call PredictionService when available from Team C
    // const result = await PredictionService.getPredictionsByService(user.org_id, {
    //   serviceType,
    //   status,
    //   minConfidence,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const predictions = [];
    const total = 0;

    return successResponse(predictions, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
