/**
 * Anomalies by Entity API
 * GET /api/v1/ai/anomalies/by-entity
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
  extractDateRange,
} from '@/lib/ai/api-utils';
import { anomalyService } from '@/lib/ai/services/anomaly-service';

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

    const entityType = searchParams.get('entityType')! as unknown;
    const entityId = searchParams.get('entityId')!;

    const result = await anomalyService.listAnomalies(user.organizationId, {
      entityType,
      entityId,
      startDate,
      endDate,
      limit,
      offset,
    });

    return successResponse(result.anomalies, {
      page,
      limit,
      total: result.total,
      hasMore: offset + limit < result.total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
