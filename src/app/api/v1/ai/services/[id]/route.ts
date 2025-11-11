/**
 * AI Services (by id)
 * PATCH /api/v1/ai/services/[id] - update label/key/enabled
 * DELETE /api/v1/ai/services/[id] - delete service
 */

import type { NextRequest } from 'next/server';
import { authenticateRequest, handleAIError, successResponse, noContentResponse } from '@/lib/ai/api-utils';
import { deleteService, updateService } from '../_store';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    const updated = await updateService(user.org_id, id, {
      label: typeof body.label === 'string' ? body.label : undefined,
      key: typeof body.key === 'string' ? body.key : undefined,
      is_enabled: typeof body.is_enabled === 'boolean' ? body.is_enabled : undefined,
    });
    if (!updated) throw new Error('Service not found');
    return successResponse(updated);
  } catch (error) {
    return handleAIError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    await deleteService(user.org_id, id);
    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}


