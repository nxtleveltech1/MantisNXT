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
import { AIMetricsService, type MetricType } from '@/lib/ai/services/metrics-service';

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

    const count = await AIMetricsService.invalidateMetricCache(
      user.org_id,
      validated.metricType as MetricType | undefined
    );

    const result = {
      success: true,
      invalidated: {
        metricType: validated.metricType || 'all',
        key: validated.key,
        count,
      },
      message: validated.metricType
        ? `Invalidated cache for ${validated.metricType} (${count} entries)`
        : `Invalidated all metrics cache (${count} entries)`,
      timestamp: new Date().toISOString(),
    };

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
