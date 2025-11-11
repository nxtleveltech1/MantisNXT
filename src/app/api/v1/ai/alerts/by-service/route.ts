/**
 * Alerts by Service API
 * GET /api/v1/ai/alerts/by-service
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/alerts/by-service?serviceType=anomaly_detection
 * Get alerts for a specific AI service type
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

    // TODO: Call AIAlertService when available from Team C
    // const result = await AIAlertService.getAlertsByService(user.org_id, {
    //   serviceType,
    //   status,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const alerts: unknown[] = [];
    const total = 0;

    return successResponse(alerts, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
