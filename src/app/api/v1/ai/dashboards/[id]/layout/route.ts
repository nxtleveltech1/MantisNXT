/**
 * Dashboard Layout API
 * PATCH /api/v1/ai/dashboards/[id]/layout
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { updateLayoutSchema } from '@/lib/ai/validation-schemas';

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

    // TODO: Call DashboardService when available from Team C
    // const dashboard = await DashboardService.updateLayout(
    //   user.id,
    //   id,
    //   validated.layout
    // );

    // Mock response structure
    const dashboard = {
      id,
      layout: validated.layout,
      updated_at: new Date().toISOString(),
    };

    return successResponse(dashboard);
  } catch (error) {
    return handleAIError(error);
  }
}
