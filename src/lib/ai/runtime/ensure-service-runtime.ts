import { updateAIConfig } from '@/lib/ai/config';
import type { AIProviderId } from '@/types/ai';
import { getConfig as getServiceConfig } from '@/app/api/v1/ai/config/_store';

type ServiceType = 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant' | 'supplier_discovery';

function normalizeToAIProviderId(key?: string | null): AIProviderId {
  const value = (key || 'openai').toLowerCase();
  if (value === 'openai' || value === 'anthropic') return value as AIProviderId;
  // Map azure_openai, openai_compatible, bedrock, custom → openai-compatible
  return 'openai-compatible';
}

function pickActiveInstance(config: unknown): { provider: string; model?: string; baseUrl?: string; apiKey?: string } {
  // New instances shape
  const instances = Array.isArray(config?.providerInstances) ? config.providerInstances : undefined;
  const activeId = config?.activeProviderInstanceId;
  if (instances && instances.length) {
    const target = activeId ? instances.find((i: unknown) => i?.id === activeId) : instances.find((i: unknown) => i?.enabled);
    if (target) {
      return {
        provider: target.providerType || config.activeProvider || config.provider || 'openai',
        model: target.model || config.model,
        baseUrl: target.baseUrl || config.baseUrl,
        apiKey: target.apiKey || config.apiKey,
      };
    }
  }

  // Legacy providers shape
  const prov = config?.activeProvider || config?.provider || 'openai';
  const section = (config?.providers?.[prov] || {}) as unknown;
  return {
    provider: prov,
    model: section.model || config?.model,
    baseUrl: section.baseUrl || config?.baseUrl,
    apiKey: section.apiKey || config?.apiKey,
  };
}

export async function ensureServiceRuntime(orgId: string, serviceType: ServiceType): Promise<void> {
  const record = await getServiceConfig(orgId, serviceType).catch(() => null);
  if (!record) return;

  const { provider, model, baseUrl, apiKey } = pickActiveInstance(record.config || {});
  const aiProvider = normalizeToAIProviderId(provider);

  const partial = {
    defaultProvider: aiProvider,
    providers: {
      [aiProvider]: {
        enabled: true,
        credentials: {
          ...(apiKey ? { apiKey } : {}),
          ...(baseUrl ? { baseUrl } : {}),
        },
        models: model ? { default: model, chat: model } : undefined,
      },
    },
  } as unknown;

  // Merge into runtime config (validated by AI_CONFIG_SCHEMA)
  updateAIConfig(partial);
}


