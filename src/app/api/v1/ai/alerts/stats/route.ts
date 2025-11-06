/**
 * AI Alert Statistics API
 * GET /api/v1/ai/alerts/stats - Get alert statistics for organization
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { alertService } from '@/lib/ai/services/alert-service';

/**
 * GET /api/v1/ai/alerts/stats
 * Get comprehensive alert statistics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const stats = await alertService.getAlertStats(user.org_id);

    return successResponse(stats);
  } catch (error) {
    return handleAIError(error);
  }
}
