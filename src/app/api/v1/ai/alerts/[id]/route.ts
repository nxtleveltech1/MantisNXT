/**
 * AI Alert Detail API
 * GET /api/v1/ai/alerts/[id]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/alerts/[id]
 * Get alert details by ID
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    // TODO: Call AIAlertService when available from Team C
    // const alert = await AIAlertService.getAlert(user.org_id, id);

    // Mock response structure
    const alert = {
      id,
      org_id: user.org_id,
      service_type: 'anomaly_detection',
      severity: 'high',
      title: 'Unusual supplier delivery delay detected',
      message: 'Supplier XYZ has shown abnormal delivery times in the last 7 days',
      entity_type: 'supplier',
      entity_id: 'sup-123',
      status: 'pending',
      metadata: {
        avgDelay: 5.2,
        threshold: 2.0,
        affectedOrders: 12,
      },
      created_at: new Date().toISOString(),
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null,
      resolved_by: null,
    };

    return successResponse(alert);
  } catch (error) {
    return handleAIError(error);
  }
}
