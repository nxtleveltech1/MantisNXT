/**
 * Default Dashboard API
 * GET /api/v1/ai/dashboards/default
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * GET /api/v1/ai/dashboards/default
 * Get or create default dashboard for user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const dashboard = await DashboardService.getDefaultDashboard(
      user.id,
      user.org_id
    );

    if (!dashboard) {
      // No default dashboard exists, return null or create one
      return successResponse({
        dashboard: null,
        message: 'No default dashboard configured'
      });
    }

    return successResponse(dashboard);
  } catch (error) {
    return handleAIError(error);
  }
}
