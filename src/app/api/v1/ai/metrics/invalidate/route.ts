/**
 * Metrics Invalidation API
 * POST /api/v1/ai/metrics/invalidate
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  validateMetricType,
} from '@/lib/ai/api-utils';
import { invalidateMetricsSchema } from '@/lib/ai/validation-schemas';

/**
 * POST /api/v1/ai/metrics/invalidate
 * Invalidate metrics cache
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = invalidateMetricsSchema.parse(body);

    if (validated.metricType) {
      validateMetricType(validated.metricType);
    }

    // TODO: Call MetricsCalculator when available from Team C
    // const result = await MetricsCalculator.invalidateCache(user.org_id, {
    //   metricType: validated.metricType,
    //   key: validated.key,
    // });

    // Mock response structure
    const result = {
      success: true,
      invalidated: {
        metricType: validated.metricType || 'all',
        key: validated.key,
        count: validated.metricType ? 1 : 7,
      },
      message: validated.metricType
        ? `Invalidated cache for ${validated.metricType}`
        : 'Invalidated all metrics cache',
      timestamp: new Date().toISOString(),
    };

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
