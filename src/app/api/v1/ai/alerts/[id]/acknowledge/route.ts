/**
 * Acknowledge Alert API
 * POST /api/v1/ai/alerts/[id]/acknowledge
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { acknowledgeAlertSchema } from '@/lib/ai/validation-schemas';

/**
 * POST /api/v1/ai/alerts/[id]/acknowledge
 * Acknowledge an alert
 */
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = acknowledgeAlertSchema.parse(body);

    // TODO: Call AIAlertService when available from Team C
    // const alert = await AIAlertService.acknowledgeAlert(user.org_id, id, {
    //   acknowledgedBy: validated.acknowledgedBy,
    //   notes: validated.notes,
    // });

    // Mock response structure
    const alert = {
      id,
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: validated.acknowledgedBy,
      acknowledgement_notes: validated.notes,
    };

    return successResponse(alert);
  } catch (error) {
    return handleAIError(error);
  }
}
