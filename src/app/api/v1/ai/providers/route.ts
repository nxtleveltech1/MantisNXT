/**
 * AI Provider Registry API
 * GET  /api/v1/ai/providers  - List provider registry entries
 * POST /api/v1/ai/providers  - Create a new registry entry
 */

import type { NextRequest } from 'next/server';
import { authenticateRequest, handleAIError, successResponse, createdResponse } from '@/lib/ai/api-utils';
import { createProviderRegistry, listProviderRegistry, type RegistryProviderType } from './_store';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const items = await listProviderRegistry(user.org_id);
    return successResponse(items);
  } catch (error) {
    return handleAIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();

    const name = String(body?.name ?? '').trim();
    const providerType = String(body?.provider_type ?? '').trim() as RegistryProviderType;
    const allowed: RegistryProviderType[] = ['openai', 'anthropic', 'azure_openai', 'bedrock'];
    if (!name) throw new Error('name is required');
    if (!allowed.includes(providerType)) throw new Error('invalid provider_type');

    const created = await createProviderRegistry(user.org_id, {
      name,
      provider_type: providerType,
      base_url: body?.base_url ?? null,
      default_model: body?.default_model ?? null,
      description: body?.description ?? null,
      enabled: body?.enabled !== false,
    });

    return createdResponse(created);
  } catch (error) {
    return handleAIError(error);
  }
}


