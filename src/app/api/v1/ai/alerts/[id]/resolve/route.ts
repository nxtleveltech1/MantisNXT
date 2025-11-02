/**
 * Resolve Alert API
 * POST /api/v1/ai/alerts/[id]/resolve
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { resolveAlertSchema } from '@/lib/ai/validation-schemas';

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
    const body = await request.json();
    const validated = resolveAlertSchema.parse(body);

    // TODO: Call AIAlertService when available from Team C
    // const alert = await AIAlertService.resolveAlert(user.org_id, id, {
    //   resolvedBy: validated.resolvedBy,
    //   resolution: validated.resolution,
    //   notes: validated.notes,
    // });

    // Mock response structure
    const alert = {
      id,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: validated.resolvedBy,
      resolution: validated.resolution,
      resolution_notes: validated.notes,
    };

    return successResponse(alert);
  } catch (error) {
    return handleAIError(error);
  }
}
