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

    // TODO: Call DashboardService when available from Team C
    // const result = await DashboardService.listDashboards(user.id, user.org_id, {
    //   isPublic,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const dashboards = [];
    const total = 0;

    return successResponse(dashboards, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
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

    // TODO: Call DashboardService when available from Team C
    // const dashboard = await DashboardService.createDashboard(
    //   user.id,
    //   user.org_id,
    //   validated
    // );

    // Mock response structure
    const dashboard = {
      id: 'dash-123',
      org_id: user.org_id,
      user_id: user.id,
      name: validated.name,
      description: validated.description,
      layout: validated.layout,
      is_public: validated.isPublic,
      metadata: validated.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return createdResponse(dashboard);
  } catch (error) {
    return handleAIError(error);
  }
}
