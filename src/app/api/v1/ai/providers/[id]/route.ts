/**
 * AI Provider Registry API (by id)
 * PATCH /api/v1/ai/providers/[id] - Update a registry entry
 * DELETE /api/v1/ai/providers/[id] - Delete a registry entry
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, handleAIError, successResponse, noContentResponse } from '@/lib/ai/api-utils';
import { deleteProviderRegistry, updateProviderRegistry } from '../_store';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));

    const updated = await updateProviderRegistry(user.org_id, id, {
      name: typeof body.name === 'string' ? String(body.name) : undefined,
      base_url: body.base_url === undefined ? undefined : (body.base_url ?? null),
      default_model: body.default_model === undefined ? undefined : (body.default_model ?? null),
      description: body.description === undefined ? undefined : (body.description ?? null),
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    });

    if (!updated) {
      throw new Error('Provider not found');
    }

    return successResponse(updated);
  } catch (error) {
    return handleAIError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    await deleteProviderRegistry(user.org_id, id);
    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}


