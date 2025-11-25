import { query } from '@/lib/database';
import {
  getSupportedModels,
  normalizeModelForProvider,
  normalizeProviderKey,
  resolveOrgId,
} from '@/lib/ai/model-utils';

export type AIServiceType =
  | 'demand_forecasting'
  | 'anomaly_detection'
  | 'supplier_scoring'
  | 'assistant'
  | 'supplier_discovery';

export interface AIConfigRecord {
  id: string;
  org_id: string;
  service_type: AIServiceType;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

type DbServiceType =
  | 'demand_forecasting'
  | 'supplier_scoring'
  | 'anomaly_detection'
  | 'sentiment_analysis'
  | 'recommendation_engine'
  | 'chatbot'
  | 'document_analysis'
  | 'supplier_discovery';

type DbProvider = 'openai' | 'anthropic' | 'azure_openai' | 'bedrock';

interface DbConfigRow {
  id: string;
  org_id: string;
  service_type: DbServiceType;
  is_enabled: boolean;
  provider: DbProvider;
  model_name: string;
  api_endpoint: string | null;
  config: unknown;
  rate_limit_per_hour: number;
  created_at: Date | string;
  updated_at: Date | string;
}

const SERVICE_TYPE_TO_DB: Record<AIServiceType, DbServiceType> = {
  demand_forecasting: 'demand_forecasting',
  anomaly_detection: 'anomaly_detection',
  supplier_scoring: 'supplier_scoring',
  assistant: 'chatbot',
  supplier_discovery: 'supplier_discovery',
};

const SERVICE_TYPE_FROM_DB: Record<DbServiceType, AIServiceType> = {
  demand_forecasting: 'demand_forecasting',
  anomaly_detection: 'anomaly_detection',
  supplier_scoring: 'supplier_scoring',
  sentiment_analysis: 'assistant',
  recommendation_engine: 'assistant',
  chatbot: 'assistant',
  document_analysis: 'assistant',
  supplier_discovery: 'supplier_discovery',
};

const PROVIDER_TO_DB: Record<string, DbProvider> = {
  openai: 'openai',
  openai_compatible: 'openai',
  custom: 'openai',
  anthropic: 'anthropic',
  azure_openai: 'azure_openai',
  bedrock: 'bedrock',
};

const PROVIDER_FROM_DB: Record<DbProvider, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  azure_openai: 'openai_compatible',
  bedrock: 'custom',
};

const LEGACY_MODEL_MAP: Record<string, string> = {
  'gpt-4o-mini-2024-07-18': 'gpt-4.1-mini',
  'gpt-4o-mini-2024-08-06': 'gpt-4.1-mini',
  'gpt-4o-mini': 'gpt-4.1-mini',
  'gpt-4o': 'gpt-4.1',
  'gpt-4-turbo': 'gpt-4.1',
  'gpt-4': 'gpt-4.1',
  'gpt-3.5-turbo': 'gpt-4.1-mini',
};

function normalizeModelName(provider: string, model?: string | null): string | undefined {
  if (!model) return undefined;
  const mapped = LEGACY_MODEL_MAP[model] ?? model;
  return normalizeModelForProvider(provider, mapped) ?? mapped;
}
function parseConfig(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value));
  } catch (error) {
    console.warn('Failed to parse AI config JSON, returning empty object', error);
    return {};
  }
}

function toISOString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapRow(row: DbConfigRow): AIConfigRecord {
  const config = parseConfig(row.config);
  const providerFromDb = PROVIDER_FROM_DB[row.provider] ?? 'openai';
  if (!config.provider) config.provider = providerFromDb;
  if (!config.activeProvider) config.activeProvider = providerFromDb;
  if (!config.model)
    config.model = normalizeModelName(providerFromDb, row.model_name) ?? row.model_name;
  else config.model = normalizeModelName(providerFromDb, config.model) ?? config.model;
  if (!config.baseUrl && row.api_endpoint) config.baseUrl = row.api_endpoint;
  if (config.rateLimit === undefined && config.rateLimitPerHour === undefined) {
    config.rateLimit = row.rate_limit_per_hour;
  }
  if (config.providers) {
    Object.entries(config.providers).forEach(([key, section]: unknown) => {
      if (!section) return;
      section.model = normalizeModelName(key, section.model) ?? section.model;
    });
  }

  // Backward compatibility: Check if this is supplier_discovery stored as chatbot (old records)
  let serviceType: AIServiceType = SERVICE_TYPE_FROM_DB[row.service_type] ?? 'assistant';
  if (row.service_type === 'chatbot' && config._originalServiceType === 'supplier_discovery') {
    serviceType = 'supplier_discovery';
  }

  return {
    id: row.id,
    org_id: row.org_id,
    service_type: serviceType,
    config,
    enabled: row.is_enabled,
    created_at: toISOString(row.created_at),
    updated_at: toISOString(row.updated_at),
  };
}

function pickActiveInstance(
  config: Record<string, unknown>
): { provider?: string; model?: string; baseUrl?: string; apiKey?: string } | null {
  const instances = Array.isArray(config?.providerInstances) ? config.providerInstances : undefined;
  const activeId = config?.activeProviderInstanceId;
  if (instances && instances.length) {
    const target = activeId
      ? instances.find((i: unknown) => i?.id === activeId)
      : instances.find((i: unknown) => i?.enabled);
    if (target) {
      return {
        provider: target.providerType || config.activeProvider || config.provider,
        model: target.model || config.model,
        baseUrl: target.baseUrl || config.baseUrl,
        apiKey: target.apiKey || config.apiKey,
      };
    }
  }
  return null;
}

function resolveProvider(config: Record<string, unknown>): DbProvider {
  const fromInstance = pickActiveInstance(config);
  const active = fromInstance?.provider || config.activeProvider || config.provider;
  const mapped = PROVIDER_TO_DB[active || ''];
  if (mapped) return mapped;
  return 'openai';
}

function resolveModel(config: Record<string, unknown>, provider: string): string {
  const fromInstance = pickActiveInstance(config);
  const preferred = normalizeModelName(
    provider,
    fromInstance?.model || config.model || config.model_name
  );
  if (preferred) return preferred;
  const normalizedKey = normalizeProviderKey(provider);
  const activeNormalized = normalizeProviderKey(config.activeProvider);
  const providerConfig =
    config.providers?.[provider] ??
    config.providers?.[normalizedKey] ??
    config.providers?.[config.activeProvider] ??
    config.providers?.[activeNormalized] ??
    {};
  if (providerConfig?.model) {
    const normalized = normalizeModelName(provider, providerConfig.model);
    if (normalized) return normalized;
  }
  const supported = getSupportedModels(provider);
  if (supported && supported.length > 0) {
    return supported[0];
  }
  // For CLI providers, use appropriate CLI models
  if (fromInstance?.useCLI || config.useCLI) {
    // Codex CLI uses gpt-5.1-codex-max as default medium model
    if (provider === 'openai' || provider === 'openai_compatible') {
      return 'gpt-5.1-codex-max';
    }
    // Gemini CLI would use appropriate model
    if (provider === 'google') {
      return 'gemini-2.0-flash-exp';
    }
  }
  return 'gpt-4o-mini'; // Updated to actual model name
}

function resolveApiEndpoint(config: Record<string, unknown>, provider: string): string | null {
  const fromInstance = pickActiveInstance(config);
  const base = fromInstance?.baseUrl || config.baseUrl || config.apiEndpoint;
  if (base) return String(base);
  const normalizedKey = normalizeProviderKey(provider);
  const activeNormalized = normalizeProviderKey(config.activeProvider);
  const providerSection =
    config.providers?.[provider] ??
    config.providers?.[normalizedKey] ??
    config.providers?.[config.activeProvider] ??
    config.providers?.[activeNormalized];
  if (providerSection?.baseUrl) return String(providerSection.baseUrl);
  return null;
}

function resolveRateLimit(config: Record<string, unknown>): number {
  const candidate = config.rateLimit ?? config.rateLimitPerHour ?? config.rate_limit;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
}

function toDbServiceType(service: string): DbServiceType {
  const mapped = SERVICE_TYPE_TO_DB[service as AIServiceType];
  if (mapped) return mapped;
  return 'chatbot';
}

export async function listConfigs(orgId?: string | null): Promise<AIConfigRecord[]> {
  const resolvedOrg = resolveOrgId(orgId);
  const { rows } = await query<DbConfigRow>(
    `SELECT * FROM ai_service_config WHERE org_id = $1 ORDER BY service_type`,
    [resolvedOrg]
  );
  return rows.map(mapRow);
}

export async function getConfig(orgId: string, service: string): Promise<AIConfigRecord | null> {
  const resolvedOrg = resolveOrgId(orgId);
  const dbService = toDbServiceType(service);
  console.log(`🔍 getConfig: orgId=${resolvedOrg}, service=${service}, dbService=${dbService}`);
  const { rows } = await query<DbConfigRow>(
    `SELECT * FROM ai_service_config WHERE org_id = $1 AND service_type = $2 LIMIT 1`,
    [resolvedOrg, dbService]
  );
  console.log(`🔍 getConfig result: ${rows.length} rows found`);

  // Fallback: If supplier_discovery not found, check for chatbot (old records)
  if (rows.length === 0 && service === 'supplier_discovery') {
    console.log(`🔍 Checking fallback: looking for chatbot records...`);
    const { rows: fallbackRows } = await query<DbConfigRow>(
      `SELECT * FROM ai_service_config WHERE org_id = $1 AND service_type = $2 LIMIT 1`,
      [resolvedOrg, 'chatbot']
    );
    console.log(`🔍 Fallback result: ${fallbackRows.length} chatbot rows found`);
    if (fallbackRows.length > 0) {
      const config = parseConfig(fallbackRows[0].config);
      // Only return if it has the _originalServiceType flag or providerInstances
      if (config._originalServiceType === 'supplier_discovery' || config.providerInstances) {
        console.log(`✅ Found supplier_discovery config in chatbot record`);
        return mapRow(fallbackRows[0]);
      }
    }
  }

  if (rows.length === 0) return null;
  return mapRow(rows[0]);
}

export async function upsertConfig(
  orgId: string,
  service: string,
  updates: { config?: Record<string, unknown>; enabled?: boolean }
): Promise<AIConfigRecord> {
  const resolvedOrg = resolveOrgId(orgId);
  const dbService = toDbServiceType(service);
  const existingRecord = await getConfig(resolvedOrg, service).catch(() => null);

  // Merge existing config with new updates
  const existingConfig = existingRecord?.config || {};
  const configObject = updates.config
    ? { ...existingConfig, ...updates.config } // Merge: existing first, then updates
    : existingConfig;

  const instance = pickActiveInstance(configObject);
  const providerKey =
    instance?.provider || configObject.activeProvider || configObject.provider || 'openai';
  const dbProvider = resolveProvider(configObject);
  const modelName = resolveModel(configObject, providerKey);
  const apiEndpoint = resolveApiEndpoint(configObject, providerKey);
  const rateLimit = resolveRateLimit(configObject);
  const enabled = updates.enabled ?? existingRecord?.enabled ?? false;

  const { rows } = await query<DbConfigRow>(
    `
    INSERT INTO ai_service_config (
      org_id,
      service_type,
      service_id,
      is_enabled,
      provider,
      model_name,
      api_endpoint,
      config,
      rate_limit_per_hour
    ) VALUES ($1, $2::ai_service_type, NULL, $3, $4::ai_provider, $5, $6, $7::jsonb, $8)
    ON CONFLICT (org_id, service_type) WHERE service_id IS NULL
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
  );

  return mapRow(rows[0]);
}

export async function deleteConfig(orgId: string, service: string): Promise<void> {
  const resolvedOrg = resolveOrgId(orgId);
  const dbService = toDbServiceType(service);
  await query(`DELETE FROM ai_service_config WHERE org_id = $1 AND service_type = $2`, [
    resolvedOrg,
    dbService,
  ]);
}

// ========= Service-ID variants (custom services) =========

export async function getConfigByServiceId(
  orgId: string,
  serviceId: string
): Promise<AIConfigRecord | null> {
  const resolvedOrg = resolveOrgId(orgId);
  const { rows } = await query<DbConfigRow>(
    `SELECT * FROM ai_service_config WHERE org_id = $1 AND service_id = $2 LIMIT 1`,
    [resolvedOrg, serviceId]
  );
  if (rows.length === 0) return null;
  return mapRow(rows[0]);
}

export async function upsertConfigByServiceId(
  orgId: string,
  serviceId: string,
  updates: { config?: Record<string, unknown>; enabled?: boolean }
): Promise<AIConfigRecord> {
  const resolvedOrg = resolveOrgId(orgId);
  const existingRecord = await getConfigByServiceId(resolvedOrg, serviceId).catch(() => null);
  const existingConfig = existingRecord?.config || {};
  const configObject = updates.config
    ? { ...existingConfig, ...updates.config } // merge to avoid wiping when only toggling enabled
    : existingConfig;
  const instance = pickActiveInstance(configObject);
  const providerKey =
    instance?.provider || configObject.activeProvider || configObject.provider || 'openai';
  const dbProvider = resolveProvider(configObject);
  const modelName = resolveModel(configObject, providerKey);
  const apiEndpoint = resolveApiEndpoint(configObject, providerKey);
  const rateLimit = resolveRateLimit(configObject);
  const enabled = updates.enabled ?? existingRecord?.enabled ?? false;

  const { rows } = await query<DbConfigRow>(
    `
    INSERT INTO ai_service_config (
      org_id,
      service_id,
      is_enabled,
      provider,
      model_name,
      api_endpoint,
      config,
      rate_limit_per_hour
    ) VALUES ($1, $2, $3, $4::ai_provider, $5, $6, $7::jsonb, $8)
    ON CONFLICT (org_id, service_id)
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
      serviceId,
      enabled,
      dbProvider,
      modelName,
      apiEndpoint,
      JSON.stringify(configObject ?? {}),
      rateLimit,
    ]
  );

  return mapRow(rows[0]);
}

export async function deleteConfigByServiceId(orgId: string, serviceId: string): Promise<void> {
  const resolvedOrg = resolveOrgId(orgId);
  await query(`DELETE FROM ai_service_config WHERE org_id = $1 AND service_id = $2`, [
    resolvedOrg,
    serviceId,
  ]);
}
