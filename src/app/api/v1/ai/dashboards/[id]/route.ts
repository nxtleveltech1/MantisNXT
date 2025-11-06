/**
 * Dashboard Detail API
 * GET    /api/v1/ai/dashboards/[id]
 * PATCH  /api/v1/ai/dashboards/[id]
 * DELETE /api/v1/ai/dashboards/[id]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  noContentResponse,
} from '@/lib/ai/api-utils';
import { updateDashboardSchema } from '@/lib/ai/validation-schemas';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * GET /api/v1/ai/dashboards/[id]
 * Get dashboard by ID
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    const dashboard = await DashboardService.getDashboard(
      user.id,
      user.org_id,
      id,
      true // includeWidgets
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

/**
 * PATCH /api/v1/ai/dashboards/[id]
 * Update dashboard
 */
export async function PATCH(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = updateDashboardSchema.parse(body);

    const dashboard = await DashboardService.updateDashboard(
      user.id,
      user.org_id,
      id,
      validated
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

/**
 * DELETE /api/v1/ai/dashboards/[id]
 * Delete dashboard
 */
export async function DELETE(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    const deleted = await DashboardService.deleteDashboard(
      user.id,
      user.org_id,
      id
    );

    if (!deleted) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Dashboard not found',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}
