/**
 * Test AI Service Configuration
 * POST /api/v1/ai/config/[service]/test
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractServiceType,
} from '@/lib/ai/api-utils';
import { testConfigSchema } from '@/lib/ai/validation-schemas';

/**
 * POST /api/v1/ai/config/[service]/test
 * Test AI service configuration and connectivity
 */
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await context.params;
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType({ service });
    const body = await request.json().catch(() => ({} as any));
    const validated = testConfigSchema.safeParse(body);

    // For now, do a lightweight ping to the models list if config provided
    let connectivity = 'skipped'
    try {
      if (validated.success && body?.config) {
        const provider = body.config.activeProvider || body.config.provider || 'openai'
        const section = body.config.providers?.[provider] || {}
        const apiKey = section.apiKey || body.config.apiKey
        let baseUrl: string = section.baseUrl || body.config.baseUrl
        if (!baseUrl) {
          if (provider === 'openai') baseUrl = 'https://api.openai.com'
          else if (provider === 'anthropic') baseUrl = 'https://api.anthropic.com'
        }
        if (apiKey && baseUrl) {
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), 6000)
          const root = baseUrl.replace(/\/+$/, '')
          const url = /\/v\d+$/.test(root) ? `${root}/models` : `${root}/v1/models`
          const headers: any = provider === 'anthropic'
            ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
            : { Authorization: `Bearer ${apiKey}` }
          const res = await fetch(url, { headers, signal: controller.signal })
          connectivity = res.ok ? 'ok' : `failed:${res.status}`
          clearTimeout(t)
        }
      }
    } catch (e: any) {
      connectivity = `failed:${e?.message || 'error'}`
    }

    const testResult = {
      success: true,
      serviceType,
      latency: 0,
      provider: body?.config?.activeProvider || body?.config?.provider || 'openai',
      message: connectivity === 'ok' ? 'Connectivity OK' : 'Test executed',
      details: {
        connectivity,
      },
      timestamp: new Date().toISOString(),
    };

    return successResponse(testResult);
  } catch (error) {
    return handleAIError(error);
  }
}
