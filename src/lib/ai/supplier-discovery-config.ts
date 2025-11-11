// @ts-nocheck
/**
 * Supplier Discovery Config Helper
 * Reads API keys from AI service configuration instead of just environment variables
 */

import { getConfig } from '@/app/api/v1/ai/config/_store';

export interface SupplierDiscoveryConfig {
  // Web Search APIs
  serperApiKey?: string;
  tavilyApiKey?: string;
  googleSearchApiKey?: string;
  googleSearchEngineId?: string;

  // Custom providers - dynamic key-value pairs
  customProviders?: Record<
    string,
    {
      apiKey: string;
      apiUrl?: string;
      model?: string;
      description?: string;
      enabled?: boolean;
    }
  >;

  // AI Extraction APIs - support multiple providers
  anthropicApiKey?: string;
  anthropicBaseUrl?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;

  // Multiple AI providers support
  aiProviders?: Array<{
    provider: 'anthropic' | 'openai' | 'openai_compatible';
    apiKey: string;
    baseUrl?: string;
    model?: string;
    enabled: boolean;
  }>;
}

/**
 * Get supplier discovery configuration from database or environment variables
 */
export async function getSupplierDiscoveryConfig(orgId?: string): Promise<SupplierDiscoveryConfig> {
  const config: SupplierDiscoveryConfig = {
    // Default to environment variables
    serperApiKey: process.env.SERPER_API_KEY,
    tavilyApiKey: process.env.TAVILY_API_KEY,
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };

  // Try to get from database config if orgId is provided
  if (orgId) {
    try {
      // First, let's see ALL configs for this org
      const { listConfigs } = await import('@/app/api/v1/ai/config/_store');
      const allConfigs = await listConfigs(orgId);
      console.log(
        '🔍 All configs for org:',
        allConfigs.map(c => ({
          service_type: c.service_type,
          id: c.id,
          hasProviderInstances: !!c.config?.providerInstances,
          instancesCount: c.config?.providerInstances?.length || 0,
        }))
      );

      const dbConfig = await getConfig(orgId, 'supplier_discovery');
      console.log('🔍 Supplier Discovery Config Debug:', {
        hasConfig: !!dbConfig,
        configId: dbConfig?.id,
        serviceType: dbConfig?.service_type,
        hasProviderInstances: !!dbConfig?.config?.providerInstances,
        instancesCount: dbConfig?.config?.providerInstances?.length || 0,
        instances: dbConfig?.config?.providerInstances || [],
        activeProviderInstanceId: dbConfig?.config?.activeProviderInstanceId,
      });

      if (dbConfig?.config) {
        // NEW: Read from providerInstances array
        const providerInstances = dbConfig.config.providerInstances || [];
        const activeProviderInstanceId = dbConfig.config.activeProviderInstanceId;

        // Separate logic for web search providers vs AI extraction providers
        // Web search providers: serper, tavily, google_search
        // AI extraction providers: anthropic, openai, openai_compatible

        // Find active web search provider (or first enabled web search provider)
        const webSearchProviders = providerInstances.filter(
          (i: unknown) => i?.enabled && ['serper', 'tavily', 'google_search'].includes(i.provider)
        );
        const activeWebSearch = activeProviderInstanceId
          ? webSearchProviders.find((i: unknown) => i?.id === activeProviderInstanceId)
          : webSearchProviders[0];

        // Find active AI extraction provider (or first enabled AI extraction provider)
        const aiProviders = providerInstances.filter(
          (i: unknown) =>
            i?.enabled && ['anthropic', 'openai', 'openai_compatible'].includes(i.provider)
        );
        console.log('🔍 AI Providers found:', {
          count: aiProviders.length,
          providers: aiProviders.map((p: unknown) => ({
            id: p.id,
            provider: p.provider,
            hasApiKey: !!p.apiKey,
            apiKeyLength: p.apiKey?.length || 0,
            baseUrl: p.baseUrl,
            model: p.model,
          })),
          activeProviderInstanceId,
        });
        // Only use activeProviderInstanceId if it actually matches an AI provider
        // If it points to a web search provider, ignore it and use first enabled AI provider
        const activeAIById = activeProviderInstanceId
          ? aiProviders.find((i: unknown) => i?.id === activeProviderInstanceId)
          : null;
        const activeAI = activeAIById || aiProviders[0];
        console.log('🔍 Selected AI Provider:', {
          selected: activeAI
            ? {
                provider: activeAI.provider,
                hasApiKey: !!activeAI.apiKey,
                apiKeyLength: activeAI.apiKey?.length || 0,
                baseUrl: activeAI.baseUrl,
                model: activeAI.model,
              }
            : null,
          matchedActiveId: !!activeAIById,
        });

        // Use active web search provider
        if (activeWebSearch) {
          switch (activeWebSearch.provider) {
            case 'serper':
              if (activeWebSearch.apiKey) config.serperApiKey = activeWebSearch.apiKey;
              break;
            case 'tavily':
              if (activeWebSearch.apiKey) config.tavilyApiKey = activeWebSearch.apiKey;
              break;
            case 'google_search':
              if (activeWebSearch.apiKey) config.googleSearchApiKey = activeWebSearch.apiKey;
              if (activeWebSearch.googleSearchEngineId)
                config.googleSearchEngineId = activeWebSearch.googleSearchEngineId;
              break;
          }
        }

        // Use active AI extraction provider
        if (activeAI) {
          switch (activeAI.provider) {
            case 'anthropic':
              if (activeAI.apiKey) config.anthropicApiKey = activeAI.apiKey;
              if (activeAI.baseUrl) config.anthropicBaseUrl = activeAI.baseUrl;
              break;
            case 'openai':
            case 'openai_compatible':
              if (activeAI.apiKey) {
                config.openaiApiKey = activeAI.apiKey;
                console.log('✅ Setting OpenAI API key:', {
                  hasKey: !!config.openaiApiKey,
                  keyLength: config.openaiApiKey?.length || 0,
                  keyPrefix: config.openaiApiKey?.substring(0, 10) || 'none',
                });
              }
              if (activeAI.baseUrl) config.openaiBaseUrl = activeAI.baseUrl;
              if (activeAI.model) config.openaiModel = activeAI.model;
              break;
          }
        }
        // Note: activeAI is only for legacy single-provider config
        // The actual extraction uses config.aiProviders array (all enabled providers) for aggregation

        // Fallback: Also check for any enabled providers if active ones weren't found
        for (const instance of providerInstances) {
          if (!instance.enabled) continue;

          // Only fill in missing values
          switch (instance.provider) {
            case 'serper':
              if (instance.apiKey && !config.serperApiKey) config.serperApiKey = instance.apiKey;
              break;
            case 'tavily':
              if (instance.apiKey && !config.tavilyApiKey) config.tavilyApiKey = instance.apiKey;
              break;
            case 'google_search':
              if (instance.apiKey && !config.googleSearchApiKey)
                config.googleSearchApiKey = instance.apiKey;
              if (instance.googleSearchEngineId && !config.googleSearchEngineId)
                config.googleSearchEngineId = instance.googleSearchEngineId;
              break;
            case 'anthropic':
              if (instance.apiKey && !config.anthropicApiKey)
                config.anthropicApiKey = instance.apiKey;
              if (instance.baseUrl && !config.anthropicBaseUrl)
                config.anthropicBaseUrl = instance.baseUrl;
              break;
            case 'openai':
            case 'openai_compatible':
              if (instance.apiKey && !config.openaiApiKey) config.openaiApiKey = instance.apiKey;
              if (instance.baseUrl && !config.openaiBaseUrl)
                config.openaiBaseUrl = instance.baseUrl;
              if (instance.model && !config.openaiModel) config.openaiModel = instance.model;
              break;
          }
        }

        // Collect ALL enabled AI providers for aggregation
        config.aiProviders = aiProviders
          .map((instance: unknown) => ({
            provider:
              instance.provider === 'openai_compatible'
                ? 'openai_compatible'
                : instance.provider === 'anthropic'
                  ? 'anthropic'
                  : 'openai',
            apiKey: instance.apiKey || '',
            baseUrl: instance.baseUrl,
            model: instance.model,
            enabled: instance.enabled !== false,
          }))
          .filter((p: unknown) => p.enabled && p.apiKey);

        console.log(`✅ Found ${config.aiProviders.length} enabled AI provider(s) for aggregation`);

        // LEGACY: Fallback to old structure for backward compatibility
        const webSearch = dbConfig.config.webSearch || {};
        const providers = dbConfig.config.providers || {};

        // Override with legacy config if not found in providerInstances
        if (!config.serperApiKey && webSearch.serperApiKey)
          config.serperApiKey = webSearch.serperApiKey;
        if (!config.tavilyApiKey && webSearch.tavilyApiKey)
          config.tavilyApiKey = webSearch.tavilyApiKey;
        if (!config.googleSearchApiKey && webSearch.googleSearchApiKey)
          config.googleSearchApiKey = webSearch.googleSearchApiKey;
        if (!config.googleSearchEngineId && webSearch.googleSearchEngineId)
          config.googleSearchEngineId = webSearch.googleSearchEngineId;

        // Get custom providers (legacy)
        if (webSearch.customProviders) {
          config.customProviders = webSearch.customProviders;
        }

        // Get AI provider keys from legacy config
        if (!config.anthropicApiKey && providers.anthropic?.apiKey)
          config.anthropicApiKey = providers.anthropic.apiKey;
        if (!config.openaiApiKey && providers.openai?.apiKey)
          config.openaiApiKey = providers.openai.apiKey;

        // Fallback to root config if provider-specific not available
        if (
          !config.anthropicApiKey &&
          dbConfig.config.apiKey &&
          dbConfig.config.provider === 'anthropic'
        ) {
          config.anthropicApiKey = dbConfig.config.apiKey;
        }
        if (
          !config.openaiApiKey &&
          dbConfig.config.apiKey &&
          dbConfig.config.provider === 'openai'
        ) {
          config.openaiApiKey = dbConfig.config.apiKey;
        }
      }
    } catch (error) {
      console.warn(
        '⚠️ Failed to load supplier discovery config from database, using environment variables:',
        error
      );
    }
  }

  console.log('✅ Supplier Discovery Config Loaded:', {
    hasSerper: !!config.serperApiKey,
    hasTavily: !!config.tavilyApiKey,
    hasGoogleSearch: !!config.googleSearchApiKey,
    hasAnthropic: !!config.anthropicApiKey,
    hasOpenAI: !!config.openaiApiKey,
    openaiBaseUrl: config.openaiBaseUrl,
    openaiModel: config.openaiModel,
  });

  return config;
}

/**
 * Get supplier discovery config synchronously (for client-side usage)
 * This reads from a server-side API endpoint
 */
export async function getSupplierDiscoveryConfigFromAPI(): Promise<SupplierDiscoveryConfig> {
  try {
    const response = await fetch('/api/v1/ai/config/supplier_discovery');
    if (!response.ok) {
      throw new Error('Failed to fetch config');
    }

    const data = await response.json();
    const dbConfig = data.data;

    const config: SupplierDiscoveryConfig = {
      // Default to environment variables (these won't be available client-side)
      serperApiKey: undefined,
      tavilyApiKey: undefined,
      googleSearchApiKey: undefined,
      googleSearchEngineId: undefined,
      anthropicApiKey: undefined,
      openaiApiKey: undefined,
    };

    if (dbConfig?.config) {
      // NEW: Read from providerInstances array
      const providerInstances = dbConfig.config.providerInstances || [];
      const activeProviderInstanceId = dbConfig.config.activeProviderInstanceId;

      // Separate logic for web search providers vs AI extraction providers
      // Web search providers: serper, tavily, google_search
      // AI extraction providers: anthropic, openai, openai_compatible

      // Find active web search provider (or first enabled web search provider)
      const webSearchProviders = providerInstances.filter(
        (i: unknown) => i?.enabled && ['serper', 'tavily', 'google_search'].includes(i.provider)
      );
      const activeWebSearch = activeProviderInstanceId
        ? webSearchProviders.find((i: unknown) => i?.id === activeProviderInstanceId)
        : webSearchProviders[0];

      // Find active AI extraction provider (or first enabled AI extraction provider)
      const aiProviders = providerInstances.filter(
        (i: unknown) => i?.enabled && ['anthropic', 'openai', 'openai_compatible'].includes(i.provider)
      );
      const activeAI = activeProviderInstanceId
        ? aiProviders.find((i: unknown) => i?.id === activeProviderInstanceId)
        : aiProviders[0];

      // Use active web search provider
      if (activeWebSearch) {
        switch (activeWebSearch.provider) {
          case 'serper':
            if (activeWebSearch.apiKey) config.serperApiKey = activeWebSearch.apiKey;
            break;
          case 'tavily':
            if (activeWebSearch.apiKey) config.tavilyApiKey = activeWebSearch.apiKey;
            break;
          case 'google_search':
            if (activeWebSearch.apiKey) config.googleSearchApiKey = activeWebSearch.apiKey;
            if (activeWebSearch.googleSearchEngineId)
              config.googleSearchEngineId = activeWebSearch.googleSearchEngineId;
            break;
        }
      }

      // Use active AI extraction provider
      if (activeAI) {
        switch (activeAI.provider) {
          case 'anthropic':
            if (activeAI.apiKey) config.anthropicApiKey = activeAI.apiKey;
            if (activeAI.baseUrl) config.anthropicBaseUrl = activeAI.baseUrl;
            break;
          case 'openai':
          case 'openai_compatible':
            if (activeAI.apiKey) config.openaiApiKey = activeAI.apiKey;
            if (activeAI.baseUrl) config.openaiBaseUrl = activeAI.baseUrl;
            if (activeAI.model) config.openaiModel = activeAI.model;
            break;
        }
      }

      // Fallback: Also check for any enabled providers if active ones weren't found
      for (const instance of providerInstances) {
        if (!instance.enabled) continue;

        // Only fill in missing values
        switch (instance.provider) {
          case 'serper':
            if (instance.apiKey && !config.serperApiKey) config.serperApiKey = instance.apiKey;
            break;
          case 'tavily':
            if (instance.apiKey && !config.tavilyApiKey) config.tavilyApiKey = instance.apiKey;
            break;
          case 'google_search':
            if (instance.apiKey && !config.googleSearchApiKey)
              config.googleSearchApiKey = instance.apiKey;
            if (instance.googleSearchEngineId && !config.googleSearchEngineId)
              config.googleSearchEngineId = instance.googleSearchEngineId;
            break;
          case 'anthropic':
            if (instance.apiKey && !config.anthropicApiKey)
              config.anthropicApiKey = instance.apiKey;
            if (instance.baseUrl && !config.anthropicBaseUrl)
              config.anthropicBaseUrl = instance.baseUrl;
            break;
          case 'openai':
          case 'openai_compatible':
            if (instance.apiKey && !config.openaiApiKey) config.openaiApiKey = instance.apiKey;
            if (instance.baseUrl && !config.openaiBaseUrl) config.openaiBaseUrl = instance.baseUrl;
            if (instance.model && !config.openaiModel) config.openaiModel = instance.model;
            break;
        }
      }

      // Also check for web search providers (serper, tavily, google_search) separately
      // since they might be different from the AI extraction provider
      for (const instance of providerInstances) {
        if (!instance.enabled) continue;

        // Only process web search providers here (AI providers already handled above)
        switch (instance.provider) {
          case 'serper':
            if (instance.apiKey && !config.serperApiKey) config.serperApiKey = instance.apiKey;
            break;
          case 'tavily':
            if (instance.apiKey && !config.tavilyApiKey) config.tavilyApiKey = instance.apiKey;
            break;
          case 'google_search':
            if (instance.apiKey && !config.googleSearchApiKey)
              config.googleSearchApiKey = instance.apiKey;
            if (instance.googleSearchEngineId && !config.googleSearchEngineId)
              config.googleSearchEngineId = instance.googleSearchEngineId;
            break;
        }
      }

      // Collect ALL enabled AI providers for aggregation (API version)
      const apiAiProviders = providerInstances.filter(
        (i: unknown) => i?.enabled && ['anthropic', 'openai', 'openai_compatible'].includes(i.provider)
      );
      config.aiProviders = apiAiProviders
        .map((instance: unknown) => ({
          provider:
            instance.provider === 'openai_compatible'
              ? 'openai_compatible'
              : instance.provider === 'anthropic'
                ? 'anthropic'
                : 'openai',
          apiKey: instance.apiKey || '',
          baseUrl: instance.baseUrl,
          model: instance.model,
          enabled: instance.enabled !== false,
        }))
        .filter((p: unknown) => p.enabled && p.apiKey);

      console.log(
        `✅ Found ${config.aiProviders.length} enabled AI provider(s) for aggregation (API)`
      );

      // LEGACY: Fallback to old structure for backward compatibility
      const webSearch = dbConfig.config.webSearch || {};
      const providers = dbConfig.config.providers || {};

      if (!config.serperApiKey && webSearch.serperApiKey)
        config.serperApiKey = webSearch.serperApiKey;
      if (!config.tavilyApiKey && webSearch.tavilyApiKey)
        config.tavilyApiKey = webSearch.tavilyApiKey;
      if (!config.googleSearchApiKey && webSearch.googleSearchApiKey)
        config.googleSearchApiKey = webSearch.googleSearchApiKey;
      if (!config.googleSearchEngineId && webSearch.googleSearchEngineId)
        config.googleSearchEngineId = webSearch.googleSearchEngineId;

      if (!config.anthropicApiKey && providers.anthropic?.apiKey)
        config.anthropicApiKey = providers.anthropic.apiKey;
      if (!config.openaiApiKey && providers.openai?.apiKey)
        config.openaiApiKey = providers.openai.apiKey;
    }

    return config;
  } catch (error) {
    console.warn('⚠️ Failed to load supplier discovery config from API:', error);
    return {
      serperApiKey: undefined,
      tavilyApiKey: undefined,
      googleSearchApiKey: undefined,
      googleSearchEngineId: undefined,
      anthropicApiKey: undefined,
      openaiApiKey: undefined,
    };
  }
}
