/**
 * Widget Refresh API
 * POST /api/v1/ai/widgets/[id]/refresh
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * POST /api/v1/ai/widgets/[id]/refresh
 * Manually trigger widget data refresh
 */
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    const result = await DashboardService.refreshWidgetData(user.org_id, id);

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
