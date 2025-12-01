/**
 * AI Configuration API
 * GET  /api/v1/ai/config - List all configs for organization
 * POST /api/v1/ai/config - Create new config
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
} from '@/lib/ai/api-utils';
import { createConfigSchema } from '@/lib/ai/validation-schemas';
import { listConfigs, upsertConfig } from './_store';

// Force Node.js runtime for database access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const configs = await listConfigs(user.org_id);
    const filtered = serviceType
      ? configs.filter(config => config.service_type === serviceType)
      : configs;
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return successResponse(paginated, {
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

    const created = await upsertConfig(user.org_id, validated.serviceType, {
      config: validated.config,
      enabled: validated.enabled,
    });

    return createdResponse(created);
  } catch (error) {
    return handleAIError(error);
  }
}
