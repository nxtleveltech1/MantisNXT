// @ts-nocheck

import { query } from '@/lib/database';
import { resolveOrgId } from '@/lib/ai/model-utils';

export type ProviderConfig = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  enabled?: boolean;
  // CLI configuration
  useCLI?: boolean;
  cliCommand?: string;
  cliArgs?: string[];
  useOAuth?: boolean;
  useGCloudADC?: boolean;
  cliWorkingDirectory?: string;
  useChatCompletions?: boolean;
  forceResponsesApi?: boolean;
};

export type TagAIResolvedConfig = {
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
    webResearchEnabled?: boolean;
    webResearchProvider?: string;
    webResearchApiKey?: string;
    webResearchEngineId?: string; // For Google Custom Search
  };
};

const SERVICE_LABEL = 'Inventory Tagging';

/**
 * Load the Inventory Tagging AI service configuration for an org from ai_service + ai_service_config.
 * Honors whatever provider/model is set there. No substitutions here.
 */
export async function loadTagAIConfig(
  orgId?: string | null
): Promise<TagAIResolvedConfig | null> {
  console.log(`[tag-ai:resolver] ENTRY: Loading config for orgId: ${orgId}`);
  
  const resolvedOrg = resolveOrgId(orgId);
  console.log(`[tag-ai:resolver] Resolved orgId: ${resolvedOrg}`);

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

  console.log(`[tag-ai:resolver] Service query result: ${serviceResult.rows.length} rows`);

  if (serviceResult.rows.length === 0) {
    console.warn('[tag-ai:resolver] Service not found:', SERVICE_LABEL);
    console.warn(`[tag-ai:resolver] Searched for orgId: ${resolvedOrg}, label: ${SERVICE_LABEL}`);
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
    console.warn('[tag-ai:resolver] Service config not found for:', SERVICE_LABEL);
    return null;
  }

  const row = configResult.rows[0];
  if (!row.enabled) {
    console.warn('[tag-ai:resolver] Service disabled:', SERVICE_LABEL);
    return null;
  }

  const providers = extractProviders(row.config);
  console.log(`[tag-ai:resolver] Extracted ${providers.length} providers from config`);
  if (providers.length === 0) {
    console.warn('[tag-ai:resolver] No enabled providers in config');
    console.warn('[tag-ai:resolver] Config:', JSON.stringify(row.config, null, 2));
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
      '[tag-ai:resolver] No usable providers remain after platform ordering/limits'
    );
    return null;
  }

  // Operational defaults from platform config (flexible keys)
  const toInt = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  
  // Extract web research provider and API keys from providerInstances if available
  let webResearchProvider: string | undefined = cfg.webResearchProvider 
    ? String(cfg.webResearchProvider) 
    : undefined;
  let webResearchApiKey: string | undefined = undefined;
  let webResearchEngineId: string | undefined = undefined;
  
  if (Array.isArray(cfg.providerInstances)) {
    const webSearchProviders = ['tavily', 'serper', 'brave', 'exa', 'google_search'];
    const activeProviderInstanceId = cfg.activeProviderInstanceId;
    
    // Find enabled web search providers
    const enabledWebSearch = cfg.providerInstances.filter(
      (inst: unknown) => inst?.enabled && webSearchProviders.includes(inst?.provider)
    );
    
    if (enabledWebSearch.length > 0) {
      // If there's an activeProviderInstanceId pointing to a web search provider, use that
      const activeWebSearch = activeProviderInstanceId
        ? enabledWebSearch.find((inst: unknown) => inst?.id === activeProviderInstanceId)
        : null;
      
      // Otherwise use first enabled web search provider
      const selectedWebSearch = activeWebSearch || enabledWebSearch[0];
      
      if (selectedWebSearch) {
        // Map provider names to web research provider names
        const providerMap: Record<string, string> = {
          'tavily': 'tavily',
          'serper': 'serper',
          'brave': 'brave',
          'exa': 'exa',
          'google_search': 'google_custom_search',
        };
        webResearchProvider = providerMap[selectedWebSearch.provider] || selectedWebSearch.provider;
        webResearchApiKey = selectedWebSearch.apiKey || undefined;
        webResearchEngineId = selectedWebSearch.googleSearchEngineId || undefined;
        console.log(`[tag-ai:resolver] Selected web research provider: ${webResearchProvider} from providerInstances`);
      }
    }
  }
  
  const defaults = {
    timeoutMs:
      toInt(cfg.timeoutMs) || toInt(cfg.aiTimeoutMs) || toInt(cfg.tagTimeoutMs) || undefined,
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
    webResearchEnabled:
      typeof cfg.webResearchEnabled === 'boolean' ? cfg.webResearchEnabled : false,
    webResearchProvider,
    webResearchApiKey,
    webResearchEngineId,
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

  // Web search providers should NOT be used as LLM providers
  const webSearchProviders = ['tavily', 'serper', 'brave', 'exa', 'google_search', 'firecrawl'];
  
  // Helper to clean model names (remove suffixes like "medium", "high", etc.)
  const cleanModelName = (model: string | undefined): string | undefined => {
    if (!model) return undefined;
    const cleaned = String(model).trim()
      .replace(/\s+(medium|high|low|fast|slow)$/i, '')
      .replace(/\(medium\)|\(high\)|\(low\)/gi, '')
      .trim();
    return cleaned || undefined;
  };

  // Priority 1: providerInstances array (used by AI Services UI)
  if (Array.isArray(config?.providerInstances)) {
    console.log(`[tag-ai:resolver] Found ${config.providerInstances.length} providerInstances`);
    
    // If there's an activeProviderInstanceId, use only that one
    const activeId = config.activeProviderInstanceId;
    if (activeId) {
      const activeInst = config.providerInstances.find((inst: unknown) => inst.id === activeId);
      if (!activeInst) {
        console.warn(`[tag-ai:resolver] Active provider instance ${activeId} not found`);
      } else {
        const providerType = activeInst.providerType || activeInst.provider || 'openai';
        const providerKey = String(providerType).toLowerCase();
        
        // Skip web search providers - they should only be used for web research, not LLM
        if (webSearchProviders.includes(providerKey)) {
          console.warn(`[tag-ai:resolver] Skipping web search provider ${providerKey} as LLM provider`);
        } else if (activeInst?.enabled && (activeInst?.apiKey || activeInst?.useCLI)) {
          console.log(`[tag-ai:resolver] Using active provider instance: ${activeInst.id} (${cleanModelName(activeInst.model)})`);
          providers.push({
            provider: providerType,
            apiKey: activeInst.apiKey || '', // Empty for CLI OAuth mode
            baseUrl: activeInst.baseUrl,
            model: cleanModelName(activeInst.model),
            enabled: true,
            // Include CLI config for the engine to use
            ...(activeInst.useCLI ? {
              useCLI: true,
              cliCommand: activeInst.cliCommand,
              cliArgs: activeInst.cliArgs,
              useOAuth: activeInst.useOAuth,
              useGCloudADC: activeInst.useGCloudADC,
              cliWorkingDirectory: activeInst.cliWorkingDirectory,
            } : {}),
            ...(typeof activeInst.useChatCompletions === 'boolean'
              ? { useChatCompletions: activeInst.useChatCompletions }
              : {}),
            ...(typeof activeInst.forceResponsesApi === 'boolean'
              ? { forceResponsesApi: activeInst.forceResponsesApi }
              : {}),
          });
          return providers;
        }
      }
    }
    
    // Otherwise, use all enabled instances (excluding web search providers)
    for (const inst of config.providerInstances) {
      const providerType = inst?.providerType || inst?.provider || 'openai';
      const providerKey = String(providerType).toLowerCase();
      
      // Skip web search providers - they should only be used for web research, not LLM
      if (webSearchProviders.includes(providerKey)) {
        continue; // Skip web search providers
      }
      
      // For CLI providers with OAuth, apiKey is optional
      if (inst?.enabled && (inst?.apiKey || inst?.useCLI)) {
        console.log(`[tag-ai:resolver] Adding provider instance: ${inst.id} (${cleanModelName(inst.model)})`);
        providers.push({
          provider: providerType,
          apiKey: inst.apiKey || '', // Empty for CLI OAuth mode
          baseUrl: inst.baseUrl,
          model: cleanModelName(inst.model || config.model),
          enabled: true,
          // Include CLI config for the engine to use
          ...(inst.useCLI ? {
            useCLI: true,
            cliCommand: inst.cliCommand,
            cliArgs: inst.cliArgs,
            useOAuth: inst.useOAuth,
            useGCloudADC: inst.useGCloudADC,
            cliWorkingDirectory: inst.cliWorkingDirectory,
          } : {}),
          ...(typeof inst.useChatCompletions === 'boolean'
            ? { useChatCompletions: inst.useChatCompletions }
            : {}),
          ...(typeof inst.forceResponsesApi === 'boolean'
            ? { forceResponsesApi: inst.forceResponsesApi }
            : {}),
        });
      }
    }
  }

  // Priority 2: providers object
  if (providers.length === 0 && config?.providers && typeof config.providers === 'object') {
    console.log(`[tag-ai:resolver] Using providers object`);
    for (const [key, value] of Object.entries<unknown>(config.providers)) {
      if (value?.enabled && value?.apiKey) {
        providers.push({
          provider: key,
          apiKey: value.apiKey,
          baseUrl: value.baseUrl,
          model:
            value.model || config.model ? String(value.model || config.model).trim() : undefined,
          enabled: true,
          ...(typeof value.useChatCompletions === 'boolean'
            ? { useChatCompletions: value.useChatCompletions }
            : {}),
          ...(typeof value.forceResponsesApi === 'boolean'
            ? { forceResponsesApi: value.forceResponsesApi }
            : {}),
        });
      }
    }
  }

  // Priority 3: Fallback - single provider fields
  if (providers.length === 0 && config?.apiKey) {
    console.log(`[tag-ai:resolver] Using fallback single provider config`);
    const provider = config.activeProvider || config.provider || 'openai';
    providers.push({
      provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model ? String(config.model).trim() : undefined,
      enabled: true,
      ...(typeof config.useChatCompletions === 'boolean'
        ? { useChatCompletions: config.useChatCompletions }
        : {}),
      ...(typeof config.forceResponsesApi === 'boolean'
        ? { forceResponsesApi: config.forceResponsesApi }
        : {}),
    });
  }

  return providers;
}

