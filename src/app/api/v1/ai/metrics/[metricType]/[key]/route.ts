/**
 * Specific Metric API
 * GET /api/v1/ai/metrics/[metricType]/[key]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  validateMetricType,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/metrics/[metricType]/[key]
 * Get cached metric for a specific type and key
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ metricType: string; key: string }> }
) {
  try {
    const { metricType, key } = await context.params;
    const user = await authenticateRequest(request);

    validateMetricType(metricType);

    const fresh = request.nextUrl.searchParams.get('fresh') === 'true';

    // TODO: Call MetricsCalculator when available from Team C
    // const metric = await MetricsCalculator.getMetric(user.org_id, {
    //   metricType,
    //   key,
    //   fresh,
    // });

    // Mock response structure
    const metric = {
      metricType,
      key,
      value: null,
      metadata: {},
      calculatedAt: new Date().toISOString(),
      cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    return successResponse(metric);
  } catch (error) {
    return handleAIError(error);
  }
}
