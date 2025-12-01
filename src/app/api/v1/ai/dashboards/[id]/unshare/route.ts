/**
 * Unshare Dashboard API
 * POST /api/v1/ai/dashboards/[id]/unshare
 */

import type { NextRequest } from 'next/server';
import { handleAIError, authenticateRequest, successResponse } from '@/lib/ai/api-utils';
import { shareDashboardSchema } from '@/lib/ai/validation-schemas';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * POST /api/v1/ai/dashboards/[id]/unshare
 * Remove dashboard sharing or make private
 */
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = shareDashboardSchema.parse(body);

    await DashboardService.unshareDashboard(user.id, user.org_id, id);

    const result = {
      dashboardId: id,
      isPublic: false,
      removedAccess: validated.userIds || [],
      updatedAt: new Date().toISOString(),
    };

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
