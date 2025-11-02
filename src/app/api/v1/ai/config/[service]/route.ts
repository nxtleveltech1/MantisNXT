/**
 * AI Service Configuration API
 * GET    /api/v1/ai/config/[service] - Get config for service type
 * PATCH  /api/v1/ai/config/[service] - Update config
 * DELETE /api/v1/ai/config/[service] - Delete config
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  noContentResponse,
  extractServiceType,
} from '@/lib/ai/api-utils';
import { updateConfigSchema } from '@/lib/ai/validation-schemas';

/**
 * GET /api/v1/ai/config/[service]
 * Get configuration for specific service type
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  try {
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType(params);

    // TODO: Call AIConfigService when available from Team C
    // const config = await AIConfigService.getConfig(user.org_id, serviceType);

    // Mock response structure
    const config = {
      id: 'config-123',
      org_id: user.org_id,
      service_type: serviceType,
      config: {},
      enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return successResponse(config);
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
  { params }: { params: { service: string } }
) {
  try {
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType(params);
    const body = await request.json();
    const validated = updateConfigSchema.parse(body);

    // TODO: Call AIConfigService when available from Team C
    // const config = await AIConfigService.updateConfig(
    //   user.org_id,
    //   serviceType,
    //   validated
    // );

    // Mock response structure
    const config = {
      id: 'config-123',
      org_id: user.org_id,
      service_type: serviceType,
      config: validated.config || {},
      enabled: validated.enabled ?? false,
      updated_at: new Date().toISOString(),
    };

    return successResponse(config);
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
  { params }: { params: { service: string } }
) {
  try {
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType(params);

    // TODO: Call AIConfigService when available from Team C
    // await AIConfigService.deleteConfig(user.org_id, serviceType);

    return noContentResponse();
  } catch (error) {
    return handleAIError(error);
  }
}
