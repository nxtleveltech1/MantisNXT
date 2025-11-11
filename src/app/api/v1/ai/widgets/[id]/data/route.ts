/**
 * Widget Data API
 * GET /api/v1/ai/widgets/[id]/data
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { DashboardService } from '@/lib/ai/services/dashboard-service';

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

    const result = await DashboardService.getWidgetData(user.org_id, id);

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
