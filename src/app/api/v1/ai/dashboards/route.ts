/**
 * AI Dashboards API
 * GET  /api/v1/ai/dashboards - List dashboards
 * POST /api/v1/ai/dashboards - Create dashboard
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
} from '@/lib/ai/api-utils';
import { createDashboardSchema } from '@/lib/ai/validation-schemas';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

/**
 * GET /api/v1/ai/dashboards
 * List user's dashboards
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    const isPublic = searchParams.get('isPublic') === 'true';
    const includeWidgets = searchParams.get('includeWidgets') === 'true';

    const result = await DashboardService.listDashboards(user.id, user.org_id, {
      isPublic,
      limit,
      offset,
      includeWidgets,
    });

    return successResponse(result.dashboards, {
      page,
      limit,
      total: result.total,
      hasMore: offset + limit < result.total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * POST /api/v1/ai/dashboards
 * Create new dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = createDashboardSchema.parse(body);

    const dashboard = await DashboardService.createDashboard(
      user.id,
      user.org_id,
      validated
    );

    return createdResponse(dashboard);
  } catch (error) {
    return handleAIError(error);
  }
}
