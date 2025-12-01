/**
 * Widget Detail API
 * GET    /api/v1/ai/widgets/[id]
 * PATCH  /api/v1/ai/widgets/[id]
 * DELETE /api/v1/ai/widgets/[id]
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  noContentResponse,
} from '@/lib/ai/api-utils';
import { updateWidgetSchema } from '@/lib/ai/validation-schemas';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * GET /api/v1/ai/widgets/[id]
 * Get widget by ID
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    const widget = await DashboardService.getWidget(user.org_id, id);

    if (!widget) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Widget not found',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(widget);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * PATCH /api/v1/ai/widgets/[id]
 * Update widget
 */
export async function PATCH(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = updateWidgetSchema.parse(body);

    const widget = await DashboardService.updateWidget(user.org_id, id, validated);

    if (!widget) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Widget not found',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(widget);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * DELETE /api/v1/ai/widgets/[id]
 * Delete widget
 */
export async function DELETE(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    const deleted = await DashboardService.deleteWidget(user.org_id, id);

    if (!deleted) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Widget not found',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}
