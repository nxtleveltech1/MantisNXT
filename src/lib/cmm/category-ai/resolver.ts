// @ts-nocheck

import { query } from '@/lib/database';
import { resolveOrgId } from '@/lib/ai/model-utils';

export type ProviderConfig = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  enabled?: boolean;
};

export type CategoryAIResolvedConfig = {
  providers: ProviderConfig[];
  label: string;
  defaults: {
    timeoutMs?: number;
    batchSize?: number;
    batchDelayMs?: number;
    maxItems?: number;
    overallTimeoutMs?: number;
    maxBatches?: number;
    failFastOnFirstTimeout?: boolean;
  };
};

const SERVICE_LABEL = 'Product Categories';

/**
 * Load the Product Categories AI service configuration for an org from ai_service + ai_service_config.
 * Honors whatever provider/model is set there. No substitutions here.
 */
export async function loadCategoryAIConfig(
  orgId?: string | null
): Promise<CategoryAIResolvedConfig | null> {
  console.log(`[category-ai:resolver] ENTRY: Loading config for orgId: ${orgId}`);
  
  const resolvedOrg = resolveOrgId(orgId);
  console.log(`[category-ai:resolver] Resolved orgId: ${resolvedOrg}`);

  // Locate service by label
  const serviceResult = await query<{ id: string; service_key: string }>(
    `
    SELECT id, service_key
    FROM ai_service
    WHERE org_id = $1 AND service_label = $2
    LIMIT 1
  `,
    [resolvedOrg, SERVICE_LABEL]
  );

  console.log(`[category-ai:resolver] Service query result: ${serviceResult.rows.length} rows`);

  if (serviceResult.rows.length === 0) {
    console.warn('[category-ai:resolver] Service not found:', SERVICE_LABEL);
    console.warn(`[category-ai:resolver] Searched for orgId: ${resolvedOrg}, label: ${SERVICE_LABEL}`);
    return null;
  }
  
  const serviceId = serviceResult.rows[0].id;

  // Get service config
  const configResult = await query<{
    id: string;
    org_id: string;
    service_id: string;
    config: Record<string, unknown>;
    enabled: boolean;
  }>(
    `
    SELECT id, org_id, service_id, config, is_enabled as enabled
    FROM ai_service_config
    WHERE org_id = $1 AND service_id = $2
    LIMIT 1
  `,
    [resolvedOrg, serviceId]
  );

  if (configResult.rows.length === 0) {
    console.warn('[category-ai:resolver] Service config not found for:', SERVICE_LABEL);
    return null;
  }

  const row = configResult.rows[0];
  if (!row.enabled) {
    console.warn('[category-ai:resolver] Service disabled:', SERVICE_LABEL);
    return null;
  }

  const providers = extractProviders(row.config);
  console.log(`[category-ai:resolver] Extracted ${providers.length} providers from config`);
  if (providers.length === 0) {
    console.warn('[category-ai:resolver] No enabled providers in config');
    console.warn('[category-ai:resolver] Config:', JSON.stringify(row.config, null, 2));
    return null;
  }

  // Start with providers exactly as defined by platform config
  let filtered = [...providers];

  // Provider ordering and limiting from platform config
  const cfg = row.config || {};
  const activeProvider = cfg.activeProvider || cfg.primaryProvider;
  const orderFromConfig: string[] = Array.isArray(cfg.providerOrder)
    ? cfg.providerOrder.map((s: unknown) => String(s).toLowerCase())
    : [];
  const orderSet = new Set(orderFromConfig);
  if (activeProvider) {
    const ap = String(activeProvider).toLowerCase();
    if (!orderSet.has(ap)) {
      orderFromConfig.unshift(ap);
      orderSet.add(ap);
    }
  }
  if (orderFromConfig.length > 0) {
    filtered = filtered
      .map(p => ({ p, name: String(p.provider).toLowerCase() }))
      .sort((a, b) => {
        const ai = orderFromConfig.indexOf(a.name);
        const bi = orderFromConfig.indexOf(b.name);
        return (
          (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
        );
      })
      .map(x => x.p);
  }
  const maxProviders = Number(cfg.maxProviders ?? cfg.limitProviders);
  if (Number.isFinite(maxProviders) && maxProviders > 0) {
    filtered = filtered.slice(0, maxProviders);
  }
  // Otherwise use all providers - they'll be split across in parallel

  // Final normalization: trim model string if provided
  for (const p of filtered) {
    if (p.model) p.model = String(p.model).trim();
  }

  if (filtered.length === 0) {
    console.warn(
      '[category-ai:resolver] No usable providers remain after platform ordering/limits'
    );
    return null;
  }

  // Operational defaults from platform config (flexible keys)
  const toInt = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const defaults = {
    timeoutMs:
      toInt(cfg.timeoutMs) || toInt(cfg.aiTimeoutMs) || toInt(cfg.categoryTimeoutMs) || undefined,
    batchSize: toInt(cfg.batchSize) || toInt(cfg.preferredBatchSize) || undefined,
    batchDelayMs: toInt(cfg.batchDelayMs) || toInt(cfg.batchDelay) || undefined,
    maxItems: toInt(cfg.maxItems) || toInt(cfg.limit) || undefined,
    overallTimeoutMs:
      toInt(cfg.overallTimeoutMs) ||
      toInt(cfg.requestTimeoutMs) ||
      toInt(cfg.routeTimeoutMs) ||
      undefined,
    maxBatches: toInt(cfg.maxBatches) || undefined,
    failFastOnFirstTimeout:
      typeof cfg.failFastOnFirstTimeout === 'boolean' ? cfg.failFastOnFirstTimeout : undefined,
  };

  return {
    providers: filtered,
    label: SERVICE_LABEL,
    defaults,
  };
}

/**
 * Extract enabled providers from the flexible config shape used by ai_service_config.config
 */
function extractProviders(config: Record<string, unknown>): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // Priority 1: providerInstances array (used by AI Services UI)
  if (Array.isArray(config?.providerInstances)) {
    console.log(`[category-ai:resolver] Found ${config.providerInstances.length} providerInstances`);
    
    // If there's an activeProviderInstanceId, use only that one
    const activeId = config.activeProviderInstanceId;
    if (activeId) {
      const activeInst = config.providerInstances.find((inst: unknown) => inst.id === activeId);
      if (activeInst?.enabled && activeInst?.apiKey) {
        console.log(`[category-ai:resolver] Using active provider instance: ${activeInst.id} (${activeInst.model})`);
        providers.push({
          provider: activeInst.providerType || activeInst.provider || 'openai',
          apiKey: activeInst.apiKey,
          baseUrl: activeInst.baseUrl,
          model: activeInst.model ? String(activeInst.model).trim() : undefined,
          enabled: true,
        });
        return providers;
      }
    }
    
    // Otherwise, use all enabled instances
    for (const inst of config.providerInstances) {
      if (inst?.enabled && inst?.apiKey) {
        console.log(`[category-ai:resolver] Adding provider instance: ${inst.id} (${inst.model})`);
        providers.push({
          provider: inst.providerType || inst.provider || 'openai',
          apiKey: inst.apiKey,
          baseUrl: inst.baseUrl,
          model: inst.model || config.model ? String(inst.model || config.model).trim() : undefined,
          enabled: true,
        });
      }
    }
  }

  // Priority 2: providers object
  if (providers.length === 0 && config?.providers && typeof config.providers === 'object') {
    console.log(`[category-ai:resolver] Using providers object`);
    for (const [key, value] of Object.entries<unknown>(config.providers)) {
      if (value?.enabled && value?.apiKey) {
        providers.push({
          provider: key,
          apiKey: value.apiKey,
          baseUrl: value.baseUrl,
          model:
            value.model || config.model ? String(value.model || config.model).trim() : undefined,
          enabled: true,
        });
      }
    }
  }

  // Priority 3: Fallback - single provider fields
  if (providers.length === 0 && config?.apiKey) {
    console.log(`[category-ai:resolver] Using fallback single provider config`);
    const provider = config.activeProvider || config.provider || 'openai';
    providers.push({
      provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model ? String(config.model).trim() : undefined,
      enabled: true,
    });
  }

  return providers;
}
