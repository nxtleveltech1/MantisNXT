/**
 * Predictions by Entity API
 * GET /api/v1/ai/predictions/by-entity
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

    const entityType = searchParams.get('entityType')!;
    const entityId = searchParams.get('entityId')!;

    // Optional filters
    const serviceType = searchParams.get('serviceType');
    const status = searchParams.get('status');

    // TODO: Call PredictionService when available from Team C
    // const result = await PredictionService.getPredictionsByEntity(user.org_id, {
    //   entityType,
    //   entityId,
    //   serviceType,
    //   status,
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
