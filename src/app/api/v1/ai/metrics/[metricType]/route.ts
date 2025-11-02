/**
 * Metric Type API
 * GET /api/v1/ai/metrics/[metricType]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  validateMetricType,
  extractDateRange,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/metrics/[metricType]
 * Get cached metrics for a specific type
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ metricType: string }> }
) {
  try {
    const { metricType } = await context.params;
    const user = await authenticateRequest(request);

    validateMetricType(metricType);

    const searchParams = request.nextUrl.searchParams;
    const { startDate, endDate } = extractDateRange(searchParams);
    const fresh = searchParams.get('fresh') === 'true';

    // TODO: Call MetricsCalculator when available from Team C
    // const metrics = await MetricsCalculator.getMetricsByType(user.org_id, {
    //   metricType,
    //   startDate,
    //   endDate,
    //   fresh,
    // });

    // Mock response structure
    const metrics = {
      metricType,
      data: {},
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      calculatedAt: new Date().toISOString(),
      cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    return successResponse(metrics);
  } catch (error) {
    return handleAIError(error);
  }
}
