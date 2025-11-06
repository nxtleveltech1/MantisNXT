/**
 * Metrics Recalculation API
 * POST /api/v1/ai/metrics/recalculate
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  validateMetricType,
} from '@/lib/ai/api-utils';
import { recalculateMetricsSchema } from '@/lib/ai/validation-schemas';
import { AIMetricsService, type MetricType } from '@/lib/ai/services/metrics-service';

/**
 * POST /api/v1/ai/metrics/recalculate
 * Force recalculation of metrics
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = recalculateMetricsSchema.parse(body);

    validateMetricType(validated.metricType);

    // Recalculate the metric type(s)
    const metricTypes = validated.metricType === 'all'
      ? ['sales', 'inventory', 'supplier_performance', 'customer_behavior', 'financial', 'operational'] as MetricType[]
      : [validated.metricType as MetricType];

    const recalculatedData = await AIMetricsService.recalculateMetrics(
      user.org_id,
      metricTypes
    );

    const now = new Date();
    const cacheExpires = new Date(now.getTime() + 5 * 60 * 1000);

    const result = {
      success: true,
      metricType: validated.metricType,
      recalculated: true,
      data: validated.metricType === 'all' ? recalculatedData : recalculatedData[validated.metricType as MetricType],
      calculatedAt: now.toISOString(),
      cacheExpires: cacheExpires.toISOString(),
    };

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
