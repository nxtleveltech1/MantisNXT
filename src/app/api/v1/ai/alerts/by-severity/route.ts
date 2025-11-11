/**
 * Alerts by Severity API
 * GET /api/v1/ai/alerts/by-severity
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
  extractSeverity,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/alerts/by-severity?severity=critical
 * Get alerts filtered by severity level
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    // Validate required parameters
    requireQueryParams(searchParams, ['severity']);
    const severity = extractSeverity(searchParams)!;

    const status = searchParams.get('status');
    const serviceType = searchParams.get('serviceType');

    // TODO: Call AIAlertService when available from Team C
    // const result = await AIAlertService.getAlertsBySeverity(user.org_id, {
    //   severity,
    //   status,
    //   serviceType,
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
