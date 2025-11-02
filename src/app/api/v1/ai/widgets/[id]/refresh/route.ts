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

    // TODO: Call WidgetDataProvider when available from Team C
    // const result = await WidgetDataProvider.refreshWidget(user.org_id, id);

    // Mock response structure
    const result = {
      widgetId: id,
      status: 'refreshed',
      data: {
        value: 0.88,
        label: 'Prediction Accuracy',
      },
      refreshedAt: new Date().toISOString(),
      nextScheduledRefresh: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
