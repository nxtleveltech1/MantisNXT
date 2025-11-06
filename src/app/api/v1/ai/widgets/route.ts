/**
 * AI Widgets API
 * GET  /api/v1/ai/widgets - List widgets
 * POST /api/v1/ai/widgets - Create widget
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
  validateWidgetType,
} from '@/lib/ai/api-utils';
import { createWidgetSchema } from '@/lib/ai/validation-schemas';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * GET /api/v1/ai/widgets
 * List widgets with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    const dashboardId = searchParams.get('dashboardId') || undefined;
    const type = searchParams.get('type') || undefined;

    if (type) {
      validateWidgetType(type);
    }

    const result = await DashboardService.listWidgets(user.org_id, {
      dashboardId,
      type,
      limit,
      offset,
    });

    return successResponse(result.widgets, {
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
 * POST /api/v1/ai/widgets
 * Create new widget
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = createWidgetSchema.parse(body);

    validateWidgetType(validated.type);

    const widget = await DashboardService.addWidget(
      user.org_id,
      validated.dashboardId,
      validated
    );

    return createdResponse(widget);
  } catch (error) {
    return handleAIError(error);
  }
}
