/**
 * Unshare Dashboard API
 * POST /api/v1/ai/dashboards/[id]/unshare
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { shareDashboardSchema } from '@/lib/ai/validation-schemas';

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

    // TODO: Call DashboardService when available from Team C
    // const result = await DashboardService.unshareDashboard(user.id, id, {
    //   userIds: validated.userIds,
    //   makePublic: false,
    // });

    // Mock response structure
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
