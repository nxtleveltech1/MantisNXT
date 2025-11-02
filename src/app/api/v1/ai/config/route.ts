/**
 * AI Configuration API
 * GET  /api/v1/ai/config - List all configs for organization
 * POST /api/v1/ai/config - Create new config
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
} from '@/lib/ai/api-utils';
import { createConfigSchema } from '@/lib/ai/validation-schemas';

/**
 * GET /api/v1/ai/config
 * List all AI service configurations for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset } = extractPagination(searchParams);

    // Filter by service type if provided
    const serviceType = searchParams.get('serviceType');

    // TODO: Call AIConfigService when available from Team C
    // const configs = await AIConfigService.listConfigs(user.org_id, {
    //   serviceType,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const configs = [];
    const total = 0;

    return successResponse(configs, {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * POST /api/v1/ai/config
 * Create new AI service configuration
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = createConfigSchema.parse(body);

    // TODO: Call AIConfigService when available from Team C
    // const config = await AIConfigService.createConfig(user.org_id, validated);

    // Mock response structure
    const config = {
      id: 'config-123',
      org_id: user.org_id,
      service_type: validated.serviceType,
      config: validated.config,
      enabled: validated.enabled,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return createdResponse(config);
  } catch (error) {
    return handleAIError(error);
  }
}
