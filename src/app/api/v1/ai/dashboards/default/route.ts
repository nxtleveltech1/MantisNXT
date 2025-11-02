/**
 * Default Dashboard API
 * GET /api/v1/ai/dashboards/default
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/dashboards/default
 * Get or create default dashboard for user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    // TODO: Call DashboardService when available from Team C
    // const dashboard = await DashboardService.getDefaultDashboard(
    //   user.id,
    //   user.org_id
    // );

    // Mock response structure
    const dashboard = {
      id: 'dash-default-123',
      org_id: user.org_id,
      user_id: user.id,
      name: 'AI Analytics Overview',
      description: 'Default dashboard with key AI metrics',
      is_default: true,
      layout: [
        { i: 'widget-1', x: 0, y: 0, w: 6, h: 4 },
        { i: 'widget-2', x: 6, y: 0, w: 6, h: 4 },
        { i: 'widget-3', x: 0, y: 4, w: 12, h: 6 },
      ],
      widgets: [
        {
          id: 'widget-1',
          type: 'metric_card',
          title: 'Prediction Accuracy',
          config: {},
        },
        {
          id: 'widget-2',
          type: 'metric_card',
          title: 'Active Alerts',
          config: {},
        },
        {
          id: 'widget-3',
          type: 'line_chart',
          title: 'Demand Forecast Trend',
          config: {},
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return successResponse(dashboard);
  } catch (error) {
    return handleAIError(error);
  }
}
