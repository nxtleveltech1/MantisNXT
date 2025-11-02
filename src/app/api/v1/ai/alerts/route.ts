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

    const severity = extractSeverity(searchParams);
    const status = extractStatus(searchParams);
    const serviceType = searchParams.get('serviceType');

    // TODO: Call AIAlertService when available from Team C
    // const result = await AIAlertService.listAlerts(user.org_id, {
    //   severity,
    //   status,
    //   serviceType,
    //   startDate,
    //   endDate,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const alerts = [];
    const total = 0;

    return successResponse(alerts, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
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

    // TODO: Call AIAlertService when available from Team C
    // const alert = await AIAlertService.createAlert(user.org_id, validated);

    // Mock response structure
    const alert = {
      id: 'alert-123',
      org_id: user.org_id,
      service_type: validated.serviceType,
      severity: validated.severity,
      title: validated.title,
      message: validated.message,
      entity_type: validated.entityType,
      entity_id: validated.entityId,
      status: 'pending',
      metadata: validated.metadata,
      created_at: new Date().toISOString(),
    };

    return createdResponse(alert);
  } catch (error) {
    return handleAIError(error);
  }
}
