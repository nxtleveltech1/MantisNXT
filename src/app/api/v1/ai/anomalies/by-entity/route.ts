/**
 * Anomalies by Entity API
 * GET /api/v1/ai/anomalies/by-entity
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
  extractDateRange,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/anomalies/by-entity?entityType=supplier&entityId=xxx
 * Get anomalies for a specific entity
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);
    const { startDate, endDate } = extractDateRange(searchParams);

    // Validate required parameters
    requireQueryParams(searchParams, ['entityType', 'entityId']);

    const entityType = searchParams.get('entityType')!;
    const entityId = searchParams.get('entityId')!;
    const metricType = searchParams.get('metricType');

    // TODO: Call AnomalyDetectionService when available from Team C
    // const result = await AnomalyDetectionService.getAnomaliesByEntity(
    //   user.org_id,
    //   {
    //     entityType,
    //     entityId,
    //     metricType,
    //     startDate,
    //     endDate,
    //     limit,
    //     offset,
    //   }
    // );

    // Mock response structure
    const anomalies = [];
    const total = 0;

    return successResponse(anomalies, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
