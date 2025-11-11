/**
 * Dashboard Layout API
 * PATCH /api/v1/ai/dashboards/[id]/layout
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { updateLayoutSchema } from '@/lib/ai/validation-schemas';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * PATCH /api/v1/ai/dashboards/[id]/layout
 * Update dashboard layout (widget positions)
 */
export async function PATCH(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = updateLayoutSchema.parse(body);

    const dashboard = await DashboardService.updateLayout(
      user.id,
      user.org_id,
      id,
      validated.layout
    );

    if (!dashboard) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Dashboard not found',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(dashboard);
  } catch (error) {
    return handleAIError(error);
  }
}
