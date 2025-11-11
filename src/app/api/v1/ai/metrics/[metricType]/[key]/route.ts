/**
 * Specific Metric API
 * GET /api/v1/ai/metrics/[metricType]/[key]
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  validateMetricType,
} from '@/lib/ai/api-utils';
import { AIMetricsService, type MetricType } from '@/lib/ai/services/metrics-service';

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

    const value = await AIMetricsService.getMetricsByKey(
      user.org_id,
      metricType as MetricType,
      key
    );

    const now = new Date();
    const cacheExpires = new Date(now.getTime() + 5 * 60 * 1000);

    const metric = {
      metricType,
      key,
      value,
      metadata: {},
      calculatedAt: now.toISOString(),
      cacheExpires: cacheExpires.toISOString(),
    };

    return successResponse(metric);
  } catch (error) {
    return handleAIError(error);
  }
}
