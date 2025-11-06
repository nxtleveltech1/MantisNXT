/**
 * Get available models for a configured provider
 * POST /api/v1/ai/config/[service]/models
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, extractServiceType, handleAIError, successResponse } from '@/lib/ai/api-utils'
import { getSupportedModels, normalizeModelForProvider, normalizeProviderKey } from '@/lib/ai/model-utils'

async function listOpenAIModels(baseUrl: string, apiKey: string, abort: AbortSignal) {
  const root = baseUrl.replace(/\/+$/, '')
  const url = /\/v\d+$/.test(root) ? `${root}/models` : `${root}/v1/models`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: abort,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`OpenAI models failed: ${res.status}`)
  const data = await res.json()
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : []
  return items.map((m: any) => String(m.id || m.name)).filter(Boolean)
}

async function listAnthropicModels(baseUrl: string, apiKey: string, abort: AbortSignal) {
  const root = baseUrl.replace(/\/+$/, '')
  const url = /\/v\d+$/.test(root) ? `${root}/models` : `${root}/v1/models`
  const res = await fetch(url, {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    signal: abort,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Anthropic models failed: ${res.status}`)
  const data = await res.json()
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : []
  return items.map((m: any) => String(m.id || m.name)).filter(Boolean)
}

export async function POST(request: NextRequest, context: { params: Promise<{ service: string }> }) {
  try {
    const { service } = await context.params
    await authenticateRequest(request)
    const serviceType = extractServiceType({ service })
    const body = await request.json().catch(() => ({}))
    const cfg = body?.config || {}

    const provider = cfg.activeProvider || cfg.provider || 'openai'
    const section = cfg.providers?.[provider] || {}
    const apiKey = section.apiKey || cfg.apiKey
    let baseUrl: string = section.baseUrl || cfg.baseUrl
    if (!baseUrl) {
      if (provider === 'openai') baseUrl = 'https://api.openai.com'
      else if (provider === 'anthropic') baseUrl = 'https://api.anthropic.com'
    }

    if (!apiKey || !baseUrl) {
      return NextResponse.json({ success: false, error: 'Missing baseUrl or API key for provider' }, { status: 400 })
    }

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)

    let models: string[] = []
    if (provider === 'anthropic') models = await listAnthropicModels(baseUrl, apiKey, controller.signal)
    else models = await listOpenAIModels(baseUrl, apiKey, controller.signal)

    clearTimeout(t)
    const normalizedProvider = normalizeProviderKey(provider)
    const supported = getSupportedModels(normalizedProvider)
    const filtered = supported
      ? models
          .map((model) => normalizeModelForProvider(normalizedProvider, model) ?? model)
          .filter((model) => supported.includes(model))
      : models

    return successResponse({ serviceType, provider, models: filtered })
  } catch (error) {
    return handleAIError(error)
  }
}
