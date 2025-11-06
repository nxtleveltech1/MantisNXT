/**
 * AI Metrics Cache API
 * GET /api/v1/ai/metrics
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractDateRange,
} from '@/lib/ai/api-utils';
import { AIMetricsService } from '@/lib/ai/services/metrics-service';

/**
 * GET /api/v1/ai/metrics
 * Get cached AI metrics summary
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { startDate, endDate } = extractDateRange(searchParams);

    const timeRange = startDate && endDate
      ? { startDate, endDate }
      : undefined;

    const metrics = await AIMetricsService.getMetricsSummary(
      user.org_id,
      timeRange
    );

    return successResponse(metrics);
  } catch (error) {
    return handleAIError(error);
  }
}
