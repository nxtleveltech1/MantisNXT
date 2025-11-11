/**
 * Dashboard Widgets API
 * GET /api/v1/ai/widgets/dashboard/[dashboardId]
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

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

    const result = await DashboardService.listWidgets(user.org_id, {
      dashboardId,
      limit: 1000, // Get all widgets for the dashboard
      offset: 0,
    });

    return successResponse({
      dashboardId,
      widgets: result.widgets,
      totalWidgets: result.total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
