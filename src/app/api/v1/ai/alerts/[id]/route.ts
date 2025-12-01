/**
 * AI Alert Detail API
 * GET    /api/v1/ai/alerts/[id] - Get alert by ID
 * PATCH  /api/v1/ai/alerts/[id] - Update alert (acknowledge/resolve)
 * DELETE /api/v1/ai/alerts/[id] - Delete alert (admin only)
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  noContentResponse,
} from '@/lib/ai/api-utils';
import { alertService } from '@/lib/ai/services/alert-service';

/**
 * GET /api/v1/ai/alerts/[id]
 * Get alert by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request);
    const { id: alertId } = await params;

    const alert = await alertService.getAlertById(alertId, user.org_id);

    return successResponse(alert);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * PATCH /api/v1/ai/alerts/[id]
 * Update alert (acknowledge or resolve)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request);
    const { id: alertId } = await params;
    const body = await request.json();

    // Support both acknowledge and resolve operations
    if (body.action === 'acknowledge') {
      const alert = await alertService.acknowledgeAlert(alertId, user.id, user.org_id);
      return successResponse(alert);
    } else if (body.action === 'resolve') {
      const alert = await alertService.resolveAlert(alertId, user.org_id);
      return successResponse(alert);
    } else {
      throw new Error('Invalid action. Use "acknowledge" or "resolve".');
    }
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * DELETE /api/v1/ai/alerts/[id]
 * Delete alert (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id: alertId } = await params;

    await alertService.deleteAlert(alertId, user.org_id);

    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}
