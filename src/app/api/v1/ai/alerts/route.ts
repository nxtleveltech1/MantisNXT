/**
 * AI Alerts API
 * GET  /api/v1/ai/alerts - List alerts with filters
 * POST /api/v1/ai/alerts - Create alert
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
  extractDateRange,
  extractSeverity,
  extractStatus,
} from '@/lib/ai/api-utils';
import { createAlertSchema } from '@/lib/ai/validation-schemas';
import { alertService } from '@/lib/ai/services/alert-service';
import type { AIServiceType, AlertSeverity, AlertStatus } from '@/lib/ai/services/alert-service';

/**
 * GET /api/v1/ai/alerts
 * List AI alerts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);
    const { startDate, endDate } = extractDateRange(searchParams);

    const severity = extractSeverity(searchParams) as AlertSeverity | null;
    const status = extractStatus(searchParams) as AlertStatus | null;
    const serviceType = searchParams.get('serviceType') as AIServiceType | null;

    // Call production alert service
    const result = await alertService.listAlerts(user.org_id, {
      severity: severity ?? undefined,
      status: status ?? undefined,
      serviceType: serviceType ?? undefined,
      startDate,
      endDate,
      limit,
      offset,
    });

    return successResponse(result.alerts, {
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
 * POST /api/v1/ai/alerts
 * Create new AI alert
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = createAlertSchema.parse(body);

    // Call production alert service
    const alert = await alertService.createAlert(user.org_id, {
      serviceType: validated.serviceType as AIServiceType,
      severity: validated.severity as AlertSeverity,
      title: validated.title,
      message: validated.message,
      entityType: validated.entityType,
      entityId: validated.entityId,
      metadata: validated.metadata,
    });

    return createdResponse(alert);
  } catch (error) {
    return handleAIError(error);
  }
}
