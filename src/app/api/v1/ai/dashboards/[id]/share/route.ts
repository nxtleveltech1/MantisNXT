/**
 * Share Dashboard API
 * POST /api/v1/ai/dashboards/[id]/share
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { shareDashboardSchema } from '@/lib/ai/validation-schemas';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

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

    const result = await DashboardService.shareDashboard(
      user.id,
      user.org_id,
      id,
      {
        userIds: validated.userIds,
        makePublic: validated.makePublic,
      }
    );

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
