/**
 * Individual Anomaly API
 * GET    /api/v1/ai/anomalies/[id] - Get anomaly details
 * PATCH  /api/v1/ai/anomalies/[id] - Update anomaly (acknowledge/resolve)
 * DELETE /api/v1/ai/anomalies/[id] - Mark as false positive
 */

import type { NextRequest } from 'next/server';
import { handleAIError, authenticateRequest, successResponse } from '@/lib/ai/api-utils';
import { anomalyService } from '@/lib/ai/services/anomaly-service';

/**
 * GET /api/v1/ai/anomalies/[id]
 * Get anomaly details by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    const anomaly = await anomalyService.getAnomalyById(id, user.organizationId);

    if (!anomaly) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Anomaly not found',
        }),
        { status: 404 }
      );
    }

    return successResponse(anomaly);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * PATCH /api/v1/ai/anomalies/[id]
 * Update anomaly status (acknowledge or resolve)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    const body = await request.json();
    const { action, resolutionNotes } = body;

    let result;

    switch (action) {
      case 'acknowledge':
        result = await anomalyService.acknowledgeAnomaly(id, user.id, user.organizationId);
        break;

      case 'resolve':
        result = await anomalyService.markResolved(
          id,
          user.id,
          resolutionNotes,
          user.organizationId
        );
        break;

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid action. Use "acknowledge" or "resolve"',
          }),
          { status: 400 }
        );
    }

    return successResponse({
      ...result,
      message: `Anomaly ${action}d successfully`,
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * DELETE /api/v1/ai/anomalies/[id]
 * Mark anomaly as false positive
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    const result = await anomalyService.markFalsePositive(id, user.id, notes, user.organizationId);

    return successResponse({
      ...result,
      message: 'Anomaly marked as false positive',
    });
  } catch (error) {
    return handleAIError(error);
  }
}
