/**
 * AI Service Configuration API
 * GET    /api/v1/ai/config/[service] - Get config for service type
 * PATCH  /api/v1/ai/config/[service] - Update config
 * DELETE /api/v1/ai/config/[service] - Delete config
 */

import type { NextRequest} from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  noContentResponse,
  extractServiceType,
} from '@/lib/ai/api-utils';
import { updateConfigSchema } from '@/lib/ai/validation-schemas';
import { getConfig, upsertConfig, deleteConfig } from '../_store';

/**
 * GET /api/v1/ai/config/[service]
 * Get configuration for specific service type
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await context.params;
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType({ service });

    const found = (await getConfig(user.org_id, serviceType))
      || (await upsertConfig(user.org_id, serviceType, { config: {}, enabled: false }))

    return successResponse(found);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * PATCH /api/v1/ai/config/[service]
 * Update configuration for specific service type
 */
export async function PATCH(
  request: NextRequest,

  context: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await context.params;
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType({ service });
    const body = await request.json();
    const validated = updateConfigSchema.parse(body);

    const updated = await upsertConfig(user.org_id, serviceType, {
      config: validated.config,
      enabled: validated.enabled,
    })

    return successResponse(updated);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * DELETE /api/v1/ai/config/[service]
 * Delete configuration for specific service type
 */
export async function DELETE(
  request: NextRequest,

  context: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await context.params;
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType({ service });

    await deleteConfig(user.org_id, serviceType)
    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}
