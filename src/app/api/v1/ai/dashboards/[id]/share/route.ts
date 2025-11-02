/**
 * Share Dashboard API
 * POST /api/v1/ai/dashboards/[id]/share
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { shareDashboardSchema } from '@/lib/ai/validation-schemas';

/**
 * POST /api/v1/ai/dashboards/[id]/share
 * Share dashboard with users or make public
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
    // const result = await DashboardService.shareDashboard(user.id, id, {
    //   userIds: validated.userIds,
    //   makePublic: validated.makePublic,
    // });

    // Mock response structure
    const result = {
      dashboardId: id,
      isPublic: validated.makePublic || false,
      sharedWith: validated.userIds || [],
      sharedAt: new Date().toISOString(),
    };

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
