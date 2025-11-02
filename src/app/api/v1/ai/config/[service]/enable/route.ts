/**
 * Enable AI Service Configuration
 * POST /api/v1/ai/config/[service]/enable
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractServiceType,
} from '@/lib/ai/api-utils';

/**
 * POST /api/v1/ai/config/[service]/enable
 * Enable AI service for organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  try {
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType(params);

    // TODO: Call AIConfigService when available from Team C
    // const config = await AIConfigService.enableService(user.org_id, serviceType);

    // Mock response structure
    const config = {
      id: 'config-123',
      org_id: user.org_id,
      service_type: serviceType,
      enabled: true,
      updated_at: new Date().toISOString(),
    };

    return successResponse(config);
  } catch (error) {
    return handleAIError(error);
  }
}
