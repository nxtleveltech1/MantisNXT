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

/**
 * GET /api/v1/ai/widgets
 * List widgets with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    const dashboardId = searchParams.get('dashboardId');
    const type = searchParams.get('type');

    if (type) {
      validateWidgetType(type);
    }

    // TODO: Call WidgetService when available from Team C
    // const result = await WidgetService.listWidgets(user.org_id, {
    //   dashboardId,
    //   type,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const widgets = [];
    const total = 0;

    return successResponse(widgets, {
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
 * POST /api/v1/ai/widgets
 * Create new widget
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = createWidgetSchema.parse(body);

    validateWidgetType(validated.type);

    // TODO: Call WidgetService when available from Team C
    // const widget = await WidgetService.createWidget(user.org_id, validated);

    // Mock response structure
    const widget = {
      id: 'widget-123',
      org_id: user.org_id,
      dashboard_id: validated.dashboardId,
      type: validated.type,
      title: validated.title,
      config: validated.config,
      data_source: validated.dataSource,
      refresh_interval: validated.refreshInterval,
      metadata: validated.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return createdResponse(widget);
  } catch (error) {
    return handleAIError(error);
  }
}
