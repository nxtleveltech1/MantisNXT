/**
 * Widget Detail API
 * GET    /api/v1/ai/widgets/[id]
 * PATCH  /api/v1/ai/widgets/[id]
 * DELETE /api/v1/ai/widgets/[id]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  noContentResponse,
  validateWidgetType,
} from '@/lib/ai/api-utils';
import { updateWidgetSchema } from '@/lib/ai/validation-schemas';

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

    // TODO: Call WidgetService when available from Team C
    // const widget = await WidgetService.getWidget(user.org_id, id);

    // Mock response structure
    const widget = {
      id,
      org_id: user.org_id,
      dashboard_id: 'dash-123',
      type: 'metric_card',
      title: 'Prediction Accuracy',
      config: {
        metric: 'prediction_accuracy',
        format: 'percentage',
      },
      data_source: {
        type: 'predictions',
        params: {
          serviceType: 'demand_forecasting',
        },
      },
      refresh_interval: 300,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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

    // TODO: Call WidgetService when available from Team C
    // const widget = await WidgetService.updateWidget(user.org_id, id, validated);

    // Mock response structure
    const widget = {
      id,
      title: validated.title,
      config: validated.config,
      data_source: validated.dataSource,
      refresh_interval: validated.refreshInterval,
      metadata: validated.metadata,
      updated_at: new Date().toISOString(),
    };

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

    // TODO: Call WidgetService when available from Team C
    // await WidgetService.deleteWidget(user.org_id, id);

    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}
