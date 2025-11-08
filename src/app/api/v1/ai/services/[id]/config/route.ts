/**
 * AI Service Config by Service ID
 * GET    /api/v1/ai/services/[id]/config
 * PATCH  /api/v1/ai/services/[id]/config
 * DELETE /api/v1/ai/services/[id]/config
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, handleAIError, successResponse, noContentResponse } from '@/lib/ai/api-utils';
import { updateConfigSchema } from '@/lib/ai/validation-schemas';
import { getConfigByServiceId, upsertConfigByServiceId, deleteConfigByServiceId } from '../../../config/_store';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const cfg = await getConfigByServiceId(user.org_id, id);
    return successResponse(cfg);
  } catch (error) {
    return handleAIError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = updateConfigSchema.parse(body);
    const updated = await upsertConfigByServiceId(user.org_id, id, { config: validated.config, enabled: validated.enabled });
    return successResponse(updated);
  } catch (error) {
    return handleAIError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    await deleteConfigByServiceId(user.org_id, id);
    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}


