/**
 * Resolve Alert API
 * POST /api/v1/ai/alerts/[id]/resolve
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { alertService } from '@/lib/ai/services/alert-service';

/**
 * POST /api/v1/ai/alerts/[id]/resolve
 * Resolve an alert
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    // Call production alert service
    const alert = await alertService.resolveAlert(id, user.org_id);

    return successResponse(alert);
  } catch (error) {
    return handleAIError(error);
  }
}
