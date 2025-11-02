/**
 * Widget Data API
 * GET /api/v1/ai/widgets/[id]/data
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/widgets/[id]/data
 * Fetch data for widget based on its configuration
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;

    // Optional refresh parameter to bypass cache
    const forceRefresh = searchParams.get('refresh') === 'true';

    // TODO: Call WidgetDataProvider when available from Team C
    // const data = await WidgetDataProvider.getWidgetData(user.org_id, id, {
    //   forceRefresh,
    // });

    // Mock response structure based on widget type
    const data = {
      widgetId: id,
      type: 'metric_card',
      data: {
        value: 0.87,
        label: 'Prediction Accuracy',
        trend: {
          direction: 'up',
          change: 0.02,
          period: '7d',
        },
        comparison: {
          previous: 0.85,
          target: 0.90,
        },
      },
      lastUpdated: new Date().toISOString(),
      nextRefresh: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    return successResponse(data);
  } catch (error) {
    return handleAIError(error);
  }
}
