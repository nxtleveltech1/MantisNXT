/**
 * Predictions by Entity API
 * GET /api/v1/ai/predictions/by-entity
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
 * GET /api/v1/ai/predictions/by-entity?entityType=product&entityId=xxx
 * Get predictions for a specific entity
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    // Validate required parameters
    requireQueryParams(searchParams, ['entityType', 'entityId']);

    const entityType = searchParams.get('entityType')! as unknown;
    const entityId = searchParams.get('entityId')!;

    // Optional filters
    const serviceType = searchParams.get('serviceType') as unknown;
    const status = searchParams.get('status') || undefined;

    const result = await predictionService.listPredictions(user.org_id, {
      entityType,
      entityId,
      serviceType,
      status,
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
