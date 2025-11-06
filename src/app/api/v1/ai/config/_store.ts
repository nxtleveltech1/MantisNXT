import { query } from '@/lib/database'
import {
  getSupportedModels,
  normalizeModelForProvider,
  normalizeProviderKey,
  resolveOrgId
} from '@/lib/ai/model-utils'

export type AIServiceType = 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant'

export interface AIConfigRecord {
  id: string
  org_id: string
  service_type: AIServiceType
  config: Record<string, any>
  enabled: boolean
  created_at: string
  updated_at: string
}

type DbServiceType =
  | 'demand_forecasting'
  | 'supplier_scoring'
  | 'anomaly_detection'
  | 'sentiment_analysis'
  | 'recommendation_engine'
  | 'chatbot'
  | 'document_analysis'

type DbProvider = 'openai' | 'anthropic' | 'azure_openai' | 'bedrock'

interface DbConfigRow {
  id: string
  org_id: string
  service_type: DbServiceType
  is_enabled: boolean
  provider: DbProvider
  model_name: string
  api_endpoint: string | null
  config: any
  rate_limit_per_hour: number
  created_at: Date | string
  updated_at: Date | string
}

const SERVICE_TYPE_TO_DB: Record<AIServiceType, DbServiceType> = {
  demand_forecasting: 'demand_forecasting',
  anomaly_detection: 'anomaly_detection',
  supplier_scoring: 'supplier_scoring',
  assistant: 'chatbot',
}

const SERVICE_TYPE_FROM_DB: Record<DbServiceType, AIServiceType> = {
  demand_forecasting: 'demand_forecasting',
  anomaly_detection: 'anomaly_detection',
  supplier_scoring: 'supplier_scoring',
  sentiment_analysis: 'assistant',
  recommendation_engine: 'assistant',
  chatbot: 'assistant',
  document_analysis: 'assistant',
}

const PROVIDER_TO_DB: Record<string, DbProvider> = {
  openai: 'openai',
  openai_compatible: 'openai',
  custom: 'openai',
  anthropic: 'anthropic',
  azure_openai: 'azure_openai',
  bedrock: 'bedrock',
}

const PROVIDER_FROM_DB: Record<DbProvider, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  azure_openai: 'openai_compatible',
  bedrock: 'custom',
}

const LEGACY_MODEL_MAP: Record<string, string> = {
  'gpt-4o-mini-2024-07-18': 'gpt-4.1-mini',
  'gpt-4o-mini-2024-08-06': 'gpt-4.1-mini',
  'gpt-4o-mini': 'gpt-4.1-mini',
  'gpt-4o': 'gpt-4.1',
  'gpt-4-turbo': 'gpt-4.1',
  'gpt-4': 'gpt-4.1',
  'gpt-3.5-turbo': 'gpt-4.1-mini'
}

function normalizeModelName(provider: string, model?: string | null): string | undefined {
  if (!model) return undefined
  const mapped = LEGACY_MODEL_MAP[model] ?? model
  return normalizeModelForProvider(provider, mapped) ?? mapped
}
function parseConfig(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, any>
  try {
    return JSON.parse(String(value))
  } catch (error) {
    console.warn('Failed to parse AI config JSON, returning empty object', error)
    return {}
  }
}

function toISOString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function mapRow(row: DbConfigRow): AIConfigRecord {
  const config = parseConfig(row.config)
  const providerFromDb = PROVIDER_FROM_DB[row.provider] ?? 'openai'
  if (!config.provider) config.provider = providerFromDb
  if (!config.activeProvider) config.activeProvider = providerFromDb
  if (!config.model) config.model = normalizeModelName(providerFromDb, row.model_name) ?? row.model_name
  else config.model = normalizeModelName(providerFromDb, config.model) ?? config.model
  if (!config.baseUrl && row.api_endpoint) config.baseUrl = row.api_endpoint
  if (config.rateLimit === undefined && config.rateLimitPerHour === undefined) {
    config.rateLimit = row.rate_limit_per_hour
  }
  if (config.providers) {
    Object.entries(config.providers).forEach(([key, section]: any) => {
      if (!section) return
      section.model = normalizeModelName(key, section.model) ?? section.model
    })
  }

  return {
    id: row.id,
    org_id: row.org_id,
    service_type: SERVICE_TYPE_FROM_DB[row.service_type] ?? 'assistant',
    config,
    enabled: row.is_enabled,
    created_at: toISOString(row.created_at),
    updated_at: toISOString(row.updated_at),
  }
}

function resolveProvider(config: Record<string, any>): DbProvider {
  const active = config.activeProvider || config.provider
  const mapped = PROVIDER_TO_DB[active || '']
  if (mapped) return mapped
  return 'openai'
}

function resolveModel(config: Record<string, any>, provider: string): string {
  const preferred = normalizeModelName(provider, config.model || config.model_name)
  if (preferred) return preferred
  const normalizedKey = normalizeProviderKey(provider)
  const activeNormalized = normalizeProviderKey(config.activeProvider)
  const providerConfig =
    config.providers?.[provider]
    ?? config.providers?.[normalizedKey]
    ?? config.providers?.[config.activeProvider]
    ?? config.providers?.[activeNormalized]
    ?? {}
  if (providerConfig?.model) {
    const normalized = normalizeModelName(provider, providerConfig.model)
    if (normalized) return normalized
  }
  const supported = getSupportedModels(provider)
  if (supported && supported.length > 0) {
    return supported[0]
  }
  return 'gpt-4.1-mini'
}

function resolveApiEndpoint(config: Record<string, any>, provider: string): string | null {
  const base = config.baseUrl || config.apiEndpoint
  if (base) return String(base)
  const normalizedKey = normalizeProviderKey(provider)
  const activeNormalized = normalizeProviderKey(config.activeProvider)
  const providerSection =
    config.providers?.[provider]
    ?? config.providers?.[normalizedKey]
    ?? config.providers?.[config.activeProvider]
    ?? config.providers?.[activeNormalized]
  if (providerSection?.baseUrl) return String(providerSection.baseUrl)
  return null
}

function resolveRateLimit(config: Record<string, any>): number {
  const candidate = config.rateLimit ?? config.rateLimitPerHour ?? config.rate_limit
  const parsed = Number(candidate)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000
}

function toDbServiceType(service: string): DbServiceType {
  const mapped = SERVICE_TYPE_TO_DB[service as AIServiceType]
  if (mapped) return mapped
  return 'chatbot'
}

export async function listConfigs(orgId?: string | null): Promise<AIConfigRecord[]> {
  const resolvedOrg = resolveOrgId(orgId)
  const { rows } = await query<DbConfigRow>(
    `SELECT * FROM ai_service_config WHERE org_id = $1 ORDER BY service_type`,
    [resolvedOrg]
  )
  return rows.map(mapRow)
}

export async function getConfig(orgId: string, service: string): Promise<AIConfigRecord | null> {
  const resolvedOrg = resolveOrgId(orgId)
  const dbService = toDbServiceType(service)
  const { rows } = await query<DbConfigRow>(
    `SELECT * FROM ai_service_config WHERE org_id = $1 AND service_type = $2 LIMIT 1`,
    [resolvedOrg, dbService]
  )
  if (rows.length === 0) return null
  return mapRow(rows[0])
}

export async function upsertConfig(
  orgId: string,
  service: string,
  updates: { config?: Record<string, any>; enabled?: boolean }
): Promise<AIConfigRecord> {
  const resolvedOrg = resolveOrgId(orgId)
  const dbService = toDbServiceType(service)
  const configObject = updates.config ? { ...updates.config } : {}
  const existingRecord = await getConfig(resolvedOrg, service).catch(() => null)
  const providerKey = configObject.activeProvider || configObject.provider || 'openai'
  const dbProvider = resolveProvider(configObject)
  const modelName = resolveModel(configObject, providerKey)
  const apiEndpoint = resolveApiEndpoint(configObject, providerKey)
  const rateLimit = resolveRateLimit(configObject)
  const enabled = updates.enabled ?? existingRecord?.enabled ?? false

  const { rows } = await query<DbConfigRow>(
    `
    INSERT INTO ai_service_config (
      org_id,
      service_type,
      is_enabled,
      provider,
      model_name,
      api_endpoint,
      config,
      rate_limit_per_hour
    ) VALUES ($1, $2::ai_service_type, $3, $4::ai_provider, $5, $6, $7::jsonb, $8)
    ON CONFLICT (org_id, service_type)
    DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      provider = EXCLUDED.provider,
      model_name = EXCLUDED.model_name,
      api_endpoint = EXCLUDED.api_endpoint,
      config = EXCLUDED.config,
      rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
      updated_at = NOW()
    RETURNING *
    `,
    [
      resolvedOrg,
      dbService,
      enabled,
      dbProvider,
      modelName,
      apiEndpoint,
      JSON.stringify(configObject ?? {}),
      rateLimit,
    ]
  )

  return mapRow(rows[0])
}

export async function deleteConfig(orgId: string, service: string): Promise<void> {
  const resolvedOrg = resolveOrgId(orgId)
  const dbService = toDbServiceType(service)
  await query(
    `DELETE FROM ai_service_config WHERE org_id = $1 AND service_type = $2`,
    [resolvedOrg, dbService]
  )
}
