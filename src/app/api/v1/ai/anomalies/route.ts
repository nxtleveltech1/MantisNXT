/**
 * Anomaly Detection API
 * GET  /api/v1/ai/anomalies - List detected anomalies
 * POST /api/v1/ai/anomalies/detect - Run anomaly detection
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
  extractDateRange,
  extractEntityFilters,
  extractSeverity,
} from '@/lib/ai/api-utils';
import { detectAnomaliesSchema } from '@/lib/ai/validation-schemas';
import { anomalyService } from '@/lib/ai/services/anomaly-service';

/**
 * GET /api/v1/ai/anomalies
 * List detected anomalies
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);
    const { startDate, endDate } = extractDateRange(searchParams);
    const { entityType, entityId } = extractEntityFilters(searchParams);

    const severity = extractSeverity(searchParams);
    const status = searchParams.get('status') as any;

    // TEMP FIX: Convert UUID org_id to integer for analytics_anomalies table
    // TODO: Run migration 0017_fix_analytics_anomalies_org_id.sql to fix schema
    const orgId = user.org_id === '00000000-0000-0000-0000-000000000000' ? 0 : parseInt(user.org_id) || 0;

    const result = await anomalyService.listAnomalies(orgId, {
      entityType: entityType as any,
      entityId,
      severity: severity as any,
      status,
      startDate,
      endDate,
      limit,
      offset,
    });

    return successResponse(result.anomalies, {
      page,
      limit,
      total: result.total,
      hasMore: offset + limit < result.total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * POST /api/v1/ai/anomalies/detect
 * Run anomaly detection on specified entity/metric
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = detectAnomaliesSchema.parse(body);

    const result = await anomalyService.detectAnomalies({
      organizationId: user.org_id,
      entityType: validated.entityType as any,
      entityId: validated.entityId,
      checkTypes: validated.checkTypes as any[],
      sensitivity: validated.sensitivity,
    });

    return createdResponse({
      jobId: `anomaly-${Date.now()}`,
      status: 'completed',
      entityType: validated.entityType,
      entityId: validated.entityId,
      detectedAnomalies: result.anomalies,
      summary: {
        total: result.anomaliesDetected,
        bySeverity: result.anomalies.reduce((acc, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      overallHealthScore: result.overallHealthScore,
      recommendations: result.recommendations,
      detectionTime: result.detectionTime,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleAIError(error);
  }
}
