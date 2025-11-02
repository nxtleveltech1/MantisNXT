/**
 * Dashboard Widgets API
 * GET /api/v1/ai/widgets/dashboard/[dashboardId]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/widgets/dashboard/[dashboardId]
 * Get all widgets for a specific dashboard
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await context.params;
    const user = await authenticateRequest(request);

    const includeData = request.nextUrl.searchParams.get('includeData') === 'true';

    // TODO: Call WidgetService when available from Team C
    // const widgets = await WidgetService.getDashboardWidgets(
    //   user.org_id,
    //   dashboardId,
    //   { includeData }
    // );

    // Mock response structure
    const widgets = [];

    return successResponse({
      dashboardId,
      widgets,
      totalWidgets: widgets.length,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
