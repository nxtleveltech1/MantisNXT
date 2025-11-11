/**
 * Metric Type API
 * GET /api/v1/ai/metrics/[metricType]
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  validateMetricType,
  extractDateRange,
} from '@/lib/ai/api-utils';
import { AIMetricsService, type MetricType } from '@/lib/ai/services/metrics-service';

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
    const period = (searchParams.get('period') as unknown) || 'daily';

    const data = await AIMetricsService.getMetrics(
      user.org_id,
      metricType as MetricType,
      { period, fresh }
    );

    const now = new Date();
    const cacheExpires = new Date(now.getTime() + 5 * 60 * 1000);

    const metrics = {
      metricType,
      data,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      calculatedAt: now.toISOString(),
      cacheExpires: cacheExpires.toISOString(),
    };

    return successResponse(metrics);
  } catch (error) {
    return handleAIError(error);
  }
}
