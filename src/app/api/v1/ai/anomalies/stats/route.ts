/**
 * Anomaly Statistics API
 * GET /api/v1/ai/anomalies/stats
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractDateRange,
} from '@/lib/ai/api-utils';
import { anomalyService } from '@/lib/ai/services/anomaly-service';

/**
 * GET /api/v1/ai/anomalies/stats
 * Get anomaly detection statistics and trends
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { startDate, endDate } = extractDateRange(searchParams);

    const entityType = searchParams.get('entityType') as unknown;

    const stats = await anomalyService.getAnomalyStats(user.organizationId, {
      entityType,
      startDate,
      endDate,
    });

    return successResponse({
      summary: {
        total: stats.total,
        bySeverity: stats.bySeverity,
        byStatus: stats.byStatus,
      },
      byType: stats.byType,
      byEntity: stats.byEntity,
      trends: stats.trends,
      topAnomalies: stats.topAnomalies,
      calculatedAt: stats.calculatedAt.toISOString(),
    });
  } catch (error) {
    return handleAIError(error);
  }
}
