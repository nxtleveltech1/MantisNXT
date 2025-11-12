'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Settings, TestTube, Save, CheckCircle, XCircle, Loader2, Globe, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupportedModels } from '@/lib/ai/model-utils';
import ProviderRegistryPanel from '@/components/ai/admin/providers/ProviderRegistryPanel';
import CustomServicesPanel from '@/components/ai/admin/providers/CustomServicesPanel';
import UnifiedServicePanel from '@/components/ai/admin/UnifiedServicePanel';

interface AIServiceConfig {
  id: string;
  service_type: 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant' | 'supplier_discovery' | 'pricing_recommendation';
  config: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    rateLimit?: number;
    activeProvider?: 'openai' | 'anthropic' | 'openai_compatible';
    enableMultipleProviders?: boolean;
    providers?: {
      openai?: { enabled?: boolean; apiKey?: string; baseUrl?: string; model?: string };
      anthropic?: { enabled?: boolean; apiKey?: string; baseUrl?: string; model?: string };
      openai_compatible?: { enabled?: boolean; apiKey?: string; baseUrl?: string; model?: string };
    };
    // Web Search API Keys
    webSearch?: {
      serperApiKey?: string;
      tavilyApiKey?: string;
      googleSearchApiKey?: string;
      googleSearchEngineId?: string;
      // Custom providers - dynamic key-value pairs
      customProviders?: Record<string, {
        apiKey: string;
        apiUrl?: string;
        model?: string;
        description?: string;
        enabled?: boolean;
      }>;
    };
    [key: string]: unknown;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const SERVICE_INFO = {
  demand_forecasting: {
    name: 'Demand Forecasting',
    description: 'Predict future product demand using historical data',
    icon: '📊',
    providers: ['openai', 'anthropic', 'custom'],
    defaultModel: 'gpt-4.1-mini',
  },
  anomaly_detection: {
    name: 'Anomaly Detection',
    description: 'Detect unusual patterns in sales and inventory',
    icon: '🔍',
    providers: ['openai', 'anthropic', 'custom'],
    defaultModel: 'claude-3-haiku',
  },
  supplier_scoring: {
    name: 'Supplier Scoring',
    description: 'Evaluate supplier performance and reliability',
    icon: '⭐',
    providers: ['openai', 'anthropic', 'custom'],
    defaultModel: 'gpt-4.1',
  },
  assistant: {
    name: 'AI Assistant',
    description: 'Conversational AI for business insights',
    icon: '💬',
    providers: ['openai', 'anthropic'],
    defaultModel: 'claude-3-5-sonnet',
  },
  supplier_discovery: {
    name: 'Supplier Discovery',
    description: 'AI-powered web search and data extraction for supplier information',
    icon: '🌐',
    providers: ['openai', 'anthropic', 'openai_compatible'],
    defaultModel: 'claude-3-5-sonnet',
  },
  pricing_recommendation: {
    name: 'Pricing Recommendation',
    description: 'AI-powered pricing optimization with impact analysis and risk assessment',
    icon: '💰',
    providers: ['openai', 'anthropic'],
    defaultModel: 'claude-3-5-sonnet',
  },
};

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4.1', 'gpt-4.1-preview', 'gpt-4.1-mini', 'o1-preview', 'o1-mini', 'o3-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
  openai_compatible: ['gpt-4.1', 'gpt-4.1-mini', 'o1-preview', 'o1-mini', 'llama-3.1-70b-instruct', 'mistral-large-latest'],
};

const dedupeModels = (list: string[] = []): string[] => Array.from(new Set(list.filter(Boolean)));

const OPENROUTER_FREE_MODELS = [
  'deepseek/deepseek-chat',
  'gryphe/mythomax-l2-13b',
  'meta-llama/llama-3.1-8b-instruct',
  'meta-llama/llama-3-8b-instruct',
  'meta-llama/llama-3.1-70b-instruct',
  'mistralai/mistral-7b-instruct',
  'mistralai/mixtral-8x7b-instruct',
  'nousresearch/hermes-3-llama-3.1-8b',
  'openrouter/auto',
  'qwen/qwen2.5-7b-instruct',
  'qwen/qwen2.5-14b-instruct',
  'qwen/qwen2-72b-instruct',
  'google/gemma-2-9b-it',
  'google/gemma-2-27b-it',
]

const OPENROUTER_FREE_MODEL_SET = new Set(OPENROUTER_FREE_MODELS.map((item) => item.toLowerCase()))

const getOpenRouterFilterKey = (serviceType: string, providerId: string) => `${serviceType}:${providerId}:openrouterFreeOnly`

const isOpenRouterProvider = (providerId: string, section: unknown, rootConfig?: AIServiceConfig): boolean => {
  const normalized = (providerId || '').toLowerCase()
  if (normalized === 'openrouter') return true
  if (normalized !== 'openai_compatible' && !normalized.includes('openrouter')) return false
  const candidates = [
    section?.baseUrl,
    rootConfig?.config?.baseUrl,
    rootConfig?.config?.providers?.[providerId]?.baseUrl,
  ]
  return candidates.some((value) => typeof value === 'string' && value.toLowerCase().includes('openrouter'))
}

const filterOpenRouterModels = (models: string[], enabled: boolean): string[] => {
  if (!enabled) return models
  return models.filter((model) => {
    const lower = model.toLowerCase()
    if (lower.includes('free')) return true
    return OPENROUTER_FREE_MODEL_SET.has(lower)
  })
}

export default function AIServiceConfiguration() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ displayName: string; provider: 'openai' | 'anthropic' | 'openai_compatible'; baseUrl: string; apiKey: string; model: string }>({
    displayName: '',
    provider: 'openai',
    baseUrl: '',
    apiKey: '',
    model: '',
  });
  // Org-wide provider presets
  const { data: providerPresets = [] } = useQuery<{ id: string; name: string; provider_type: string; base_url?: string; default_model?: string }[]>({
    queryKey: ['ai-provider-registry'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/ai/providers');
        const data = await res.json().catch(() => ({}));
        return data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.displayName?.trim()) {
        throw new Error('Service Label is required');
      }
      console.log('[Create Service] Starting with:', { label: createForm.displayName, provider: createForm.provider });
      
      // 1) Create a custom service with label
      const serviceRes = await fetch('/api/v1/ai/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: createForm.displayName.trim() }),
      });
      
      if (!serviceRes.ok) {
        const errorText = await serviceRes.text();
        console.error('[Create Service] Failed to create service:', errorText);
        throw new Error(`Failed to create service: ${errorText}`);
      }
      
      const serviceData = await serviceRes.json();
      console.log('[Create Service] Service created:', serviceData);
      const serviceId = serviceData?.data?.id;
      if (!serviceId) {
        console.error('[Create Service] No service ID returned:', serviceData);
        throw new Error('Service created without id');
      }

      // 2) Attach initial provider config
      const prov = createForm.provider;
      const config: unknown = {
        provider: prov,
        activeProvider: prov,
        ...(createForm.baseUrl ? { baseUrl: createForm.baseUrl } : {}),
        ...(createForm.apiKey ? { apiKey: createForm.apiKey } : {}),
        ...(createForm.model ? { model: createForm.model } : {}),
        providers: { [prov]: { enabled: true, ...(createForm.baseUrl ? { baseUrl: createForm.baseUrl } : {}), ...(createForm.apiKey ? { apiKey: createForm.apiKey } : {}), ...(createForm.model ? { model: createForm.model } : {}) } },
      };
      
      console.log('[Create Service] Saving config for service:', serviceId, config);
      const cfgRes = await fetch(`/api/v1/ai/services/${serviceId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, enabled: true }),
      });
      
      if (!cfgRes.ok) {
        const errorText = await cfgRes.text();
        console.error('[Create Service] Failed to save config:', errorText);
        throw new Error(`Failed to save configuration: ${errorText}`);
      }
      
      const cfgData = await cfgRes.json();
      console.log('[Create Service] Config saved:', cfgData);
      return cfgData;
    },
    onSuccess: () => {
      console.log('[Create Service] Success - refreshing queries');
      toast.success('AI service created');
      setIsCreateOpen(false);
      setCreateForm({ displayName: '', provider: 'openai', baseUrl: '', apiKey: '', model: '' });
      // Refresh any service/config queries the page might use
      queryClient.invalidateQueries({ queryKey: ['ai-provider-registry'] });
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-services'] });
    },
    onError: (e: unknown) => {
      console.error('[Create Service] Error:', e);
      toast.error(e?.message || 'Failed to create service');
    },
  });
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [pendingAdvanced, setPendingAdvanced] = useState<Record<string, string>>({});
  const [openRouterFilters, setOpenRouterFilters] = useState<Record<string, boolean>>({});
  // Local state for custom providers to enable immediate UI updates
  const [customProvidersLocal, setCustomProvidersLocal] = useState<Record<string, Record<string, unknown>>>({});
  // Local state for web search API keys to enable immediate UI updates
  const [webSearchKeysLocal, setWebSearchKeysLocal] = useState<Record<string, {
    serperApiKey?: string;
    tavilyApiKey?: string;
    googleSearchApiKey?: string;
    googleSearchEngineId?: string;
  }>>({});
  // Refs to track debounce timeouts for each input field
  const debounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Helper: fetch models for a service/provider combination and cache locally
  async function fetchModelsFor(service: string, cfg: unknown) {
    try {
      const res = await fetch(`/api/v1/ai/config/${service}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg || {} })
      })
      const data = await res.json().catch(() => ({}))
      const list: string[] = data?.data?.models || []
      const prov: string = cfg?.activeProvider || cfg?.provider || 'openai'
      const uniqueModels = dedupeModels(Array.isArray(list) ? list : [])
      if (uniqueModels.length) {
        const dynKey = `${service}:${prov}`
        setDynamicModels(prev => ({ ...prev, [dynKey]: uniqueModels }))
        // maintain fallback options too
        MODEL_OPTIONS[prov] = uniqueModels
        try { queryClient.invalidateQueries({ queryKey: ['ai-configs'] }) } catch {}
      }
    } catch {}
  }

  // Fetch all configurations
  const { data: configs = [], isLoading } = useQuery<AIServiceConfig[]>({
    queryKey: ['ai-configs'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/config');
      if (!response.ok) throw new Error('Failed to fetch configurations');
      const data = await response.json();
      return data.data || [];
    },
  });

  // Sync local web search keys state with server data (only on initial load)
  useEffect(() => {
    // Only initialize if we don't have local state yet
    if (Object.keys(webSearchKeysLocal).length > 0) return;
    
    const newLocalState: Record<string, {
      serperApiKey?: string;
      tavilyApiKey?: string;
      googleSearchApiKey?: string;
      googleSearchEngineId?: string;
    }> = {};
    configs.forEach((c) => {
      if (c.service_type === 'supplier_discovery' && c.config?.webSearch) {
        newLocalState[c.service_type] = {
          serperApiKey: c.config.webSearch.serperApiKey || '',
          tavilyApiKey: c.config.webSearch.tavilyApiKey || '',
          googleSearchApiKey: c.config.webSearch.googleSearchApiKey || '',
          googleSearchEngineId: c.config.webSearch.googleSearchEngineId || '',
        };
      }
    });
    if (Object.keys(newLocalState).length > 0) {
      setWebSearchKeysLocal(newLocalState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs.length]); // Only run when configs first loads

  // Sync local custom providers state with server data (only on initial load)
  useEffect(() => {
    // Only initialize if we don't have local state yet
    if (Object.keys(customProvidersLocal).length > 0) return;
    
    const newLocalState: Record<string, Record<string, unknown>> = {};
    configs.forEach((c) => {
      if (c.config?.webSearch?.customProviders) {
        newLocalState[c.service_type] = c.config.webSearch.customProviders;
      }
    });
    if (Object.keys(newLocalState).length > 0) {
      setCustomProvidersLocal(newLocalState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs.length]); // Only run when configs first loads

  // On initial load, try to pre-populate model lists for configured providers
  useEffect(() => {
    if (!configs?.length) return
    configs.forEach((c) => {
      const service = c.service_type
      const provider = (c.config?.activeProvider || c.config?.provider || 'openai') as string
      const dynKey = `${service}:${provider}`
      if (dynamicModels[dynKey]?.length) return
      const section = (c.config?.providers?.[provider] || {}) as unknown
      const baseUrl = section.baseUrl || c.config?.baseUrl
      const apiKey = section.apiKey || c.config?.apiKey
      if (baseUrl && apiKey) {
        void fetchModelsFor(service, { ...c.config, provider, activeProvider: provider, baseUrl, apiKey })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs])

  // Update configuration
  const updateConfigMutation = useMutation({
    mutationFn: async ({
      service,
      updates,
    }: {
      service: string;
      updates: Partial<AIServiceConfig>;
    }) => {
      const response = await fetch(`/api/v1/ai/config/${service}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
      toast.success('Configuration updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: async ({ service, config }: { service: string; config: unknown }) => {
      const response = await fetch(`/api/v1/ai/config/${service}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: unknown) => {
      setTestResult({ success: true, message: data?.data?.message || 'Connection successful!' });
      setIsTestDialogOpen(true);
    },
    onError: (error: unknown) => {
      setTestResult({ success: false, message: error?.message || 'Connection test failed' });
      setIsTestDialogOpen(true);
    },
  });

  // Toggle service enabled/disabled
  const handleToggleService = (service: string, enabled: boolean) => {
    updateConfigMutation.mutate({
      service,
      updates: { enabled },
    });
  };

  // Get config for specific service
  const getServiceConfig = (serviceType: string): AIServiceConfig | undefined => {
    return configs.find((c) => c.service_type === serviceType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section heading removed to avoid duplication with page title */}

      {/* Add New AI Service */}
      <div className="flex items-center justify-between">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New AI Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add AI Service</DialogTitle>
              <DialogDescription>Create and configure a new AI service with provider, endpoint, API key, and model.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Service Label <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Demand Forecasting"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, displayName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={createForm.provider} onValueChange={(v) => setCreateForm((p) => ({ ...p, provider: v as unknown }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['openai','anthropic','openai_compatible'].map((p) => (
                      <SelectItem key={p} value={p}>{p.replace('_',' ').replace(/\b\w/g,(c)=>c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Import from Preset</Label>
                <Select onValueChange={(presetId) => {
                  const preset: unknown = providerPresets.find((x:unknown) => x.id === presetId);
                  if (!preset) return;
                  const prov = preset.provider_type === 'openai' || preset.provider_type === 'anthropic' ? preset.provider_type : 'openai_compatible';
                  setCreateForm((p) => ({
                    ...p,
                    provider: prov,
                    baseUrl: preset.base_url || p.baseUrl,
                    model: preset.default_model || p.model,
                  }));
                  toast.success(`Imported preset "${preset.name}"`);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={providerPresets.length ? 'Choose preset…' : 'No presets available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {providerPresets.map((p:unknown) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input
                  placeholder={createForm.provider === 'openai' ? 'https://api.openai.com/v1' : createForm.provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://your-compatible-base/v1'}
                  value={createForm.baseUrl}
                  onChange={(e) => setCreateForm((p) => ({ ...p, baseUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder={`Enter ${createForm.provider.replace('_',' ')} API key`}
                  value={createForm.apiKey}
                  onChange={(e) => setCreateForm((p) => ({ ...p, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Model</Label>
                <div className="flex items-center gap-2">
                  <Select value={createForm.model} onValueChange={(v) => setCreateForm((p) => ({ ...p, model: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-auto">
                      {(dynamicModels[`assistant:${createForm.provider}`] || MODEL_OPTIONS[createForm.provider] || []).map((m: unknown) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const cfg = { provider: createForm.provider, activeProvider: createForm.provider, baseUrl: createForm.baseUrl, apiKey: createForm.apiKey } as unknown;
                      await fetchModelsFor('assistant', cfg);
                      toast.success('Loaded models');
                    }}
                  >
                    Load models
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button disabled={createConfigMutation.isPending || !createForm.displayName.trim() || !createForm.provider} onClick={() => createConfigMutation.mutate()}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Org-wide Provider Registry */}
      <ProviderRegistryPanel />

      <Separator />

      {/* Built-in AI Services */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Built-in AI Services</h2>
        <UnifiedServicePanel />
      </div>

      <Separator />

      {/* Custom Services (named) */}
      <CustomServicesPanel />

      <div className="grid gap-6 grid-cols-1" style={{ display: 'none' }}>
        {Object.entries(SERVICE_INFO).map(([serviceType, info]) => {
          const config = getServiceConfig(serviceType);
          const isEnabled = config?.enabled || false;
          const activeProv = config?.config?.activeProvider || config?.config?.provider || 'openai'
          const dynKey = `${serviceType}:${activeProv}`
          const supportedModels = getSupportedModels(activeProv)
          const providerSection = (config?.config?.providers?.[activeProv] || {}) as unknown
          const openRouterFilterKey = getOpenRouterFilterKey(serviceType, activeProv)
          const isActiveOpenRouter = isOpenRouterProvider(activeProv, providerSection, config)
          const showOpenRouterFreeOnly = isActiveOpenRouter ? !!openRouterFilters[openRouterFilterKey] : false
          const rawModels = dynamicModels[dynKey] || MODEL_OPTIONS[activeProv] || []
          const uniqueRaw = dedupeModels(Array.isArray(rawModels) ? rawModels : [])
          const filteredByProvider = supportedModels && supportedModels.length > 0
            ? uniqueRaw.filter((model) => supportedModels.includes(model))
            : uniqueRaw
          const availableModels = isActiveOpenRouter
            ? filterOpenRouterModels(filteredByProvider, showOpenRouterFreeOnly)
            : filteredByProvider

          return (
            <Card key={serviceType} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{info.icon}</span>
                    <div>
                      <CardTitle className="text-xl">{info.name}</CardTitle>
                      <CardDescription className="mt-1">{info.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${serviceType}-enabled`} className="text-sm">
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                      id={`${serviceType}-enabled`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleService(serviceType, checked)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${serviceType}-provider`}>Provider</Label>
                  <Select
                    value={config?.config?.provider || info.providers[0]}
                    onValueChange={async (value) => {
                      updateConfigMutation.mutate({
                        service: serviceType,
                        updates: {
                          config: {
                            ...config?.config,
                            provider: value,
                            activeProvider: value as unknown,
                          },
                        },
                      });
                      const nextCfg = { ...(config?.config || {}), provider: value, activeProvider: value }
                      await fetchModelsFor(serviceType, nextCfg)
                    }}
                  >
                    <SelectTrigger id={`${serviceType}-provider`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {info.providers.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Active provider + multi-provider toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${serviceType}-active-provider`}>Active Provider</Label>
                    <Select
                      value={config?.config?.activeProvider || config?.config?.provider || ''}
                      onValueChange={async (value) => {
                        updateConfigMutation.mutate({
                          service: serviceType,
                          updates: {
                            config: {
                              ...config?.config,
                              activeProvider: value as unknown,
                              provider: value,
                            },
                          },
                        });
                        const nextCfg = { ...(config?.config || {}), provider: value, activeProvider: value }
                        await fetchModelsFor(serviceType, nextCfg)
                      }}
                    >
                      <SelectTrigger id={`${serviceType}-active-provider`}>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {['openai', 'anthropic', 'openai_compatible'].map((p) => (
                          <SelectItem key={p} value={p}>{p.replace('_',' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Import defaults from Registry preset */}
                  <div className="space-y-2">
                    <Label>Import from Preset</Label>
                    <Select onValueChange={async (presetId) => {
                      const preset = providerPresets.find((p:unknown) => p.id === presetId);
                      if (!preset) return;
                      const prov = preset.provider_type === 'openai' || preset.provider_type === 'anthropic' ? preset.provider_type : 'openai_compatible';
                      const nextCfg: unknown = {
                        ...config?.config,
                        provider: prov,
                        activeProvider: prov,
                        baseUrl: preset.base_url || config?.config?.baseUrl,
                        model: preset.default_model || config?.config?.model,
                      };
                      updateConfigMutation.mutate({ service: serviceType, updates: { config: nextCfg } });
                      try { await fetchModelsFor(serviceType, nextCfg) } catch {}
                      toast.success(`Imported preset "${preset.name}"`);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder={providerPresets.length ? 'Choose preset…' : 'No presets available'} />
                      </SelectTrigger>
                      <SelectContent>
                        {providerPresets.map((p:unknown) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      id={`${serviceType}-multi`}
                      checked={!!config?.config?.enableMultipleProviders}
                      onCheckedChange={(checked) =>
                        updateConfigMutation.mutate({
                          service: serviceType,
                          updates: { config: { ...config?.config, enableMultipleProviders: checked } },
                        })
                      }
                    />
                    <Label htmlFor={`${serviceType}-multi`}>Enable multiple providers</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${serviceType}-model`}>Model</Label>
                  <div className="flex items-center gap-2">
                  <Select
                    value={config?.config?.model || ''}
                    onValueChange={(value) =>
                      updateConfigMutation.mutate({
                        service: serviceType,
                        updates: { config: { ...config?.config, model: value } },
                      })
                    }
                  >
                    <SelectTrigger id={`${serviceType}-model`}>
                      <SelectValue placeholder={info.defaultModel} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-auto">
                      {availableModels.length > 0 ? (
                        availableModels.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No supported models detected for this provider.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/v1/ai/config/${serviceType}/models`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ config: config?.config || {} })
                        })
                        const data = await res.json().catch(() => ({}))
                        const list: string[] = data?.data?.models || []
                        const uniqueModels = dedupeModels(Array.isArray(list) ? list : [])
                        if (uniqueModels.length) {
                          const prov = config?.config?.activeProvider || config?.config?.provider || 'openai'
                          MODEL_OPTIONS[prov] = uniqueModels
                          const dynKey = `${serviceType}:${prov}`
                          setDynamicModels(prev => ({ ...prev, [dynKey]: uniqueModels }))
                          toast.success(`Loaded ${uniqueModels.length} models`)
                          try { queryClient.invalidateQueries({ queryKey: ['ai-configs'] }) } catch {}
                        } else {
                          toast.error('No models returned from provider')
                        }
                      } catch (e:unknown) {
                        toast.error(e?.message || 'Failed to load models')
                      }
                    }}
                  >
                    Load models
                  </Button>
                  </div>
                </div>

                {/* Provider-specific configuration cards */}
                {(['openai', 'anthropic', 'openai_compatible'] as const).map((p) => {
                  const section = (config?.config?.providers?.[p] || {}) as unknown
                  const providerModels = dedupeModels(dynamicModels[`${serviceType}:${p}`] || MODEL_OPTIONS[p] || [])
                  const openRouterKey = getOpenRouterFilterKey(serviceType, p)
                  const isSectionOpenRouter = isOpenRouterProvider(p, section, config)
                  const showFreeOnly = isSectionOpenRouter ? !!openRouterFilters[openRouterKey] : false
                  const models = isSectionOpenRouter
                    ? filterOpenRouterModels(providerModels, showFreeOnly)
                    : providerModels
                  return (
                    <Card key={`${serviceType}-${p}`} className="border border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base">{p.replace('_',' ').replace(/\b\w/g, (c) => c.toUpperCase())}</CardTitle>
                        <CardDescription>Endpoint, API key and model</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Switch
                            id={`${serviceType}-${p}-enabled`}
                            checked={!!section.enabled}
                            onCheckedChange={(checked) =>
                              updateConfigMutation.mutate({
                                service: serviceType,
                                updates: { config: { ...config?.config, providers: { ...(config?.config?.providers||{}), [p]: { ...section, enabled: checked } } } },
                              })
                            }
                          />
                          <Label htmlFor={`${serviceType}-${p}-enabled`}>Enabled</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${serviceType}-${p}-endpoint`}>Endpoint URL</Label>
                            <Input
                              id={`${serviceType}-${p}-endpoint`}
                              placeholder={p === 'openai' ? 'https://api.openai.com/v1' : p === 'anthropic' ? 'https://api.anthropic.com' : 'https://your-compatible-base/v1'}
                              value={section.baseUrl || ''}
                              onChange={async (e) => {
                                const baseUrl = e.target.value
                                const nextProviders = { ...(config?.config?.providers||{}), [p]: { ...section, baseUrl } }
                                const nextCfg = { ...(config?.config||{}), providers: nextProviders }
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: { config: nextCfg },
                                })
                                const key = nextProviders?.[p]?.apiKey
                                if (baseUrl && key) {
                                  await fetchModelsFor(serviceType, { ...nextCfg, activeProvider: p, provider: p })
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${serviceType}-${p}-key`}>API Key</Label>
                            <Input
                              id={`${serviceType}-${p}-key`}
                              type="password"
                              placeholder={`Enter ${p} API key`}
                              value={section.apiKey || ''}
                              onChange={async (e) => {
                                const apiKey = e.target.value
                                const nextProviders = { ...(config?.config?.providers||{}), [p]: { ...section, apiKey } }
                                const nextCfg = { ...(config?.config||{}), providers: nextProviders }
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: { config: nextCfg },
                                })
                                const baseUrl = nextProviders?.[p]?.baseUrl
                                if (baseUrl && apiKey) {
                                  await fetchModelsFor(serviceType, { ...nextCfg, activeProvider: p, provider: p })
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-between">
                              <Label htmlFor={`${serviceType}-${p}-model`}>Model</Label>
                              {isSectionOpenRouter && (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`${serviceType}-${p}-free-only`}
                                    checked={showFreeOnly}
                                    onCheckedChange={(value) =>
                                      setOpenRouterFilters((prev) => ({
                                        ...prev,
                                        [openRouterKey]: value === true,
                                      }))
                                    }
                                  />
                                  <Label htmlFor={`${serviceType}-${p}-free-only`} className="text-xs font-normal">
                                    Show only free models
                                  </Label>
                                </div>
                              )}
                            </div>
                            <Select
                              value={section.model || ''}
                              onValueChange={(value) =>
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: { config: { ...config?.config, providers: { ...(config?.config?.providers||{}), [p]: { ...section, model: value } } } },
                                })
                              }
                            >
                              <SelectTrigger id={`${serviceType}-${p}-model`}>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent className="max-h-64 overflow-auto">
                                {models.length > 0 ? (
                                  models.map((m) => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No models match the current filters. Try disabling the free-model filter or load models again.
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Web Search API Configuration - Only for Supplier Discovery */}
                {serviceType === 'supplier_discovery' && (
                  <>
                    {/* Model Selection for Supplier Discovery */}
                    <Card className="border-2 border-purple-200 bg-purple-50/50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          AI Model Configuration
                        </CardTitle>
                        <CardDescription>
                          Configure the AI model used for data extraction and analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${serviceType}-ai-model`}>AI Model</Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={config?.config?.model || ''}
                                onValueChange={(value) =>
                                  updateConfigMutation.mutate({
                                    service: serviceType,
                                    updates: { config: { ...config?.config, model: value } },
                                  })
                                }
                              >
                                <SelectTrigger id={`${serviceType}-ai-model`}>
                                  <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64 overflow-auto">
                                  {availableModels.length > 0 ? (
                                    availableModels.map((m) => (
                                      <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">
                                      No models available. Configure provider first.
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${serviceType}-ai-model-manual`}>Or Enter Model Name</Label>
                            <Input
                              id={`${serviceType}-ai-model-manual`}
                              type="text"
                              placeholder="e.g., gpt-4, claude-3-5-sonnet"
                              value={config?.config?.model || ''}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: { config: { ...config?.config, model: newValue } },
                                });
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select a model from the dropdown or manually enter a model name. The model will be used for extracting supplier information from web content.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Web Search APIs Card */}
                    <Card className="border-2 border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Web Search APIs
                      </CardTitle>
                      <CardDescription>
                        Configure web search providers for supplier discovery. At least one API key is recommended.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Serper API */}
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceType}-serper-key`}>
                            Serper API Key
                            <span className="text-xs text-muted-foreground ml-2">(Recommended)</span>
                          </Label>
                          <Input
                            id={`${serviceType}-serper-key`}
                            type="password"
                            placeholder="sk_xxxxxxxxxxxxxxxxxxxxx"
                            value={webSearchKeysLocal[serviceType]?.serperApiKey ?? config?.config?.webSearch?.serperApiKey ?? ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              
                              // Update local state immediately for instant UI feedback
                              setWebSearchKeysLocal(prev => ({
                                ...prev,
                                [serviceType]: {
                                  ...(prev[serviceType] || {}),
                                  serperApiKey: newValue,
                                },
                              }));
                              
                              // Debounce the mutation
                              const timeoutKey = `${serviceType}-serper-key`;
                              if (debounceTimeouts.current[timeoutKey]) {
                                clearTimeout(debounceTimeouts.current[timeoutKey]);
                              }
                              debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                const webSearch = {
                                  ...(config?.config?.webSearch || {}),
                                  serperApiKey: newValue,
                                };
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: {
                                    config: {
                                      ...config?.config,
                                      webSearch,
                                    },
                                  },
                                });
                                delete debounceTimeouts.current[timeoutKey];
                              }, 500);
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Get API key from{' '}
                            <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="underline">
                              serper.dev
                            </a>
                          </p>
                        </div>

                        {/* Tavily API */}
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceType}-tavily-key`}>Tavily API Key</Label>
                          <Input
                            id={`${serviceType}-tavily-key`}
                            type="password"
                            placeholder="tvly-xxxxxxxxxxxxxxxxxxxxx"
                            value={webSearchKeysLocal[serviceType]?.tavilyApiKey ?? config?.config?.webSearch?.tavilyApiKey ?? ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              
                              // Update local state immediately
                              setWebSearchKeysLocal(prev => ({
                                ...prev,
                                [serviceType]: {
                                  ...(prev[serviceType] || {}),
                                  tavilyApiKey: newValue,
                                },
                              }));
                              
                              // Debounce the mutation
                              const timeoutKey = `${serviceType}-tavily-key`;
                              if (debounceTimeouts.current[timeoutKey]) {
                                clearTimeout(debounceTimeouts.current[timeoutKey]);
                              }
                              debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                const webSearch = {
                                  ...(config?.config?.webSearch || {}),
                                  tavilyApiKey: newValue,
                                };
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: {
                                    config: {
                                      ...config?.config,
                                      webSearch,
                                    },
                                  },
                                });
                                delete debounceTimeouts.current[timeoutKey];
                              }, 500);
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Get API key from{' '}
                            <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="underline">
                              tavily.com
                            </a>
                          </p>
                        </div>

                        {/* Google Search API Key */}
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceType}-google-key`}>Google Search API Key</Label>
                          <Input
                            id={`${serviceType}-google-key`}
                            type="password"
                            placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxx"
                            value={webSearchKeysLocal[serviceType]?.googleSearchApiKey ?? config?.config?.webSearch?.googleSearchApiKey ?? ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              
                              // Update local state immediately
                              setWebSearchKeysLocal(prev => ({
                                ...prev,
                                [serviceType]: {
                                  ...(prev[serviceType] || {}),
                                  googleSearchApiKey: newValue,
                                },
                              }));
                              
                              // Debounce the mutation
                              const timeoutKey = `${serviceType}-google-key`;
                              if (debounceTimeouts.current[timeoutKey]) {
                                clearTimeout(debounceTimeouts.current[timeoutKey]);
                              }
                              debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                const webSearch = {
                                  ...(config?.config?.webSearch || {}),
                                  googleSearchApiKey: newValue,
                                };
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: {
                                    config: {
                                      ...config?.config,
                                      webSearch,
                                    },
                                  },
                                });
                                delete debounceTimeouts.current[timeoutKey];
                              }, 500);
                            }}
                          />
                        </div>

                        {/* Google Search Engine ID */}
                        <div className="space-y-2">
                          <Label htmlFor={`${serviceType}-google-cx`}>Google Search Engine ID</Label>
                          <Input
                            id={`${serviceType}-google-cx`}
                            type="text"
                            placeholder="xxxxxxxxxxxxxxxxxxxxx"
                            value={webSearchKeysLocal[serviceType]?.googleSearchEngineId ?? config?.config?.webSearch?.googleSearchEngineId ?? ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              
                              // Update local state immediately
                              setWebSearchKeysLocal(prev => ({
                                ...prev,
                                [serviceType]: {
                                  ...(prev[serviceType] || {}),
                                  googleSearchEngineId: newValue,
                                },
                              }));
                              
                              // Debounce the mutation
                              const timeoutKey = `${serviceType}-google-cx`;
                              if (debounceTimeouts.current[timeoutKey]) {
                                clearTimeout(debounceTimeouts.current[timeoutKey]);
                              }
                              debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                const webSearch = {
                                  ...(config?.config?.webSearch || {}),
                                  googleSearchEngineId: newValue,
                                };
                                updateConfigMutation.mutate({
                                  service: serviceType,
                                  updates: {
                                    config: {
                                      ...config?.config,
                                      webSearch,
                                    },
                                  },
                                });
                                delete debounceTimeouts.current[timeoutKey];
                              }, 500);
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Required if using Google Search API
                          </p>
                        </div>
                      </div>
                      <div className="rounded-md bg-blue-100 p-3 text-sm text-blue-800">
                        <strong>Note:</strong> If no API keys are configured, the system will use DuckDuckGo (free, no API key required) as a fallback.
                      </div>

                      {/* Custom Providers Section */}
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold">Custom Service Providers</h4>
                            <p className="text-xs text-muted-foreground">
                              Add any service provider with custom API keys
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                              const newProviderName = `provider_${Date.now()}`;
                              const newProvider = {
                                apiKey: '',
                                apiUrl: '',
                                model: '',
                                description: '',
                                enabled: true,
                              };
                              
                              // Update local state immediately
                              setCustomProvidersLocal(prev => ({
                                ...prev,
                                [serviceType]: {
                                  ...currentProviders,
                                  [newProviderName]: newProvider,
                                },
                              }));
                              
                              // Then sync with server
                              const webSearch = {
                                ...(config?.config?.webSearch || {}),
                                customProviders: {
                                  ...currentProviders,
                                  [newProviderName]: newProvider,
                                },
                              };
                              updateConfigMutation.mutate({
                                service: serviceType,
                                updates: {
                                  config: {
                                    ...config?.config,
                                    webSearch,
                                  },
                                },
                              });
                            }}
                            disabled={updateConfigMutation.isPending}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Provider
                          </Button>
                        </div>

                        {/* List of custom providers */}
                        {Object.entries(customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {}).map(([providerName, provider]: [string, unknown]) => {
                          // Use local state if available, otherwise fall back to server data
                          const localProvider = customProvidersLocal[serviceType]?.[providerName];
                          const displayProvider = localProvider || provider;
                          
                          return (
                            <Card key={providerName} className="border border-dashed">
                              <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      placeholder="Provider Name (e.g., CustomSearchAPI)"
                                      value={providerName}
                                      onChange={(e) => {
                                        const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                                        const newName = e.target.value.trim() || providerName;
                                        if (newName !== providerName && newName) {
                                          const { [providerName]: oldProvider, ...rest } = currentProviders;
                                          
                                          // Update local state immediately
                                          setCustomProvidersLocal(prev => ({
                                            ...prev,
                                            [serviceType]: {
                                              ...rest,
                                              [newName]: oldProvider,
                                            },
                                          }));
                                          
                                          // Then sync with server
                                          const webSearch = {
                                            ...(config?.config?.webSearch || {}),
                                            customProviders: {
                                              ...rest,
                                              [newName]: oldProvider,
                                            },
                                          };
                                          updateConfigMutation.mutate({
                                            service: serviceType,
                                            updates: {
                                              config: {
                                                ...config?.config,
                                                webSearch,
                                              },
                                            },
                                          });
                                        }
                                      }}
                                      className="font-semibold"
                                    />
                                    <Switch
                                      checked={displayProvider.enabled !== false}
                                      onCheckedChange={(enabled) => {
                                        const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                                        
                                        // Update local state immediately
                                        setCustomProvidersLocal(prev => ({
                                          ...prev,
                                          [serviceType]: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              enabled,
                                            },
                                          },
                                        }));
                                        
                                        // Then sync with server
                                        const webSearch = {
                                          ...(config?.config?.webSearch || {}),
                                          customProviders: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              enabled,
                                            },
                                          },
                                        };
                                        updateConfigMutation.mutate({
                                          service: serviceType,
                                          updates: {
                                            config: {
                                              ...config?.config,
                                              webSearch,
                                            },
                                          },
                                        });
                                      }}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                                      const updatedProviders = { ...currentProviders };
                                      delete updatedProviders[providerName];
                                      
                                      // Update local state immediately
                                      setCustomProvidersLocal(prev => ({
                                        ...prev,
                                        [serviceType]: updatedProviders,
                                      }));
                                      
                                      // Then sync with server
                                      const webSearch = {
                                        ...(config?.config?.webSearch || {}),
                                        customProviders: updatedProviders,
                                      };
                                      updateConfigMutation.mutate({
                                        service: serviceType,
                                        updates: {
                                          config: {
                                            ...config?.config,
                                            webSearch,
                                          },
                                        },
                                      });
                                    }}
                                    disabled={updateConfigMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label htmlFor={`${serviceType}-custom-${providerName}-key`}>API Key</Label>
                                    <Input
                                      id={`${serviceType}-custom-${providerName}-key`}
                                      type="password"
                                      placeholder="Enter API key"
                                      value={displayProvider.apiKey || ''}
                                      onChange={(e) => {
                                        const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                                        const newValue = e.target.value;
                                        
                                        // Update local state immediately for instant UI feedback
                                        setCustomProvidersLocal(prev => ({
                                          ...prev,
                                          [serviceType]: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              apiKey: newValue,
                                            },
                                          },
                                        }));
                                        
                                      // Debounce server sync (update after user stops typing)
                                      const timeoutKey = `${serviceType}-${providerName}-apiKey`;
                                      if (debounceTimeouts.current[timeoutKey]) {
                                        clearTimeout(debounceTimeouts.current[timeoutKey]);
                                      }
                                      debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                        const webSearch = {
                                          ...(config?.config?.webSearch || {}),
                                          customProviders: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              apiKey: newValue,
                                            },
                                          },
                                        };
                                        updateConfigMutation.mutate({
                                          service: serviceType,
                                          updates: {
                                            config: {
                                              ...config?.config,
                                              webSearch,
                                            },
                                          },
                                        });
                                        delete debounceTimeouts.current[timeoutKey];
                                      }, 500);
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`${serviceType}-custom-${providerName}-url`}>API URL</Label>
                                    <Input
                                      id={`${serviceType}-custom-${providerName}-url`}
                                      type="text"
                                      placeholder="https://api.example.com/v1"
                                      value={displayProvider.apiUrl || ''}
                                      onChange={(e) => {
                                        const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                                        const newValue = e.target.value;
                                        
                                        // Update local state immediately
                                        setCustomProvidersLocal(prev => ({
                                          ...prev,
                                          [serviceType]: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              apiUrl: newValue,
                                            },
                                          },
                                        }));
                                        
                                      // Debounce server sync
                                      const timeoutKey = `${serviceType}-${providerName}-apiUrl`;
                                      if (debounceTimeouts.current[timeoutKey]) {
                                        clearTimeout(debounceTimeouts.current[timeoutKey]);
                                      }
                                      debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                        const webSearch = {
                                          ...(config?.config?.webSearch || {}),
                                          customProviders: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              apiUrl: newValue,
                                            },
                                          },
                                        };
                                        updateConfigMutation.mutate({
                                          service: serviceType,
                                          updates: {
                                            config: {
                                              ...config?.config,
                                              webSearch,
                                            },
                                          },
                                        });
                                        delete debounceTimeouts.current[timeoutKey];
                                      }, 500);
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`${serviceType}-custom-${providerName}-model`}>Model</Label>
                                  <Input
                                    id={`${serviceType}-custom-${providerName}-model`}
                                    type="text"
                                    placeholder="e.g., gpt-4, claude-3-5-sonnet, llama-3.1-70b"
                                    value={displayProvider.model || ''}
                                    onChange={(e) => {
                                      const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                                      const newValue = e.target.value;
                                      
                                      // Update local state immediately
                                      setCustomProvidersLocal(prev => ({
                                        ...prev,
                                        [serviceType]: {
                                          ...currentProviders,
                                          [providerName]: {
                                            ...displayProvider,
                                            model: newValue,
                                          },
                                        },
                                      }));
                                      
                                      // Debounce server sync
                                      const timeoutKey = `${serviceType}-${providerName}-model`;
                                      if (debounceTimeouts.current[timeoutKey]) {
                                        clearTimeout(debounceTimeouts.current[timeoutKey]);
                                      }
                                      debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                        const webSearch = {
                                          ...(config?.config?.webSearch || {}),
                                          customProviders: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              model: newValue,
                                            },
                                          },
                                        };
                                        updateConfigMutation.mutate({
                                          service: serviceType,
                                          updates: {
                                            config: {
                                              ...config?.config,
                                              webSearch,
                                            },
                                          },
                                        });
                                        delete debounceTimeouts.current[timeoutKey];
                                      }, 500);
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`${serviceType}-custom-${providerName}-desc`}>Description (Optional)</Label>
                                  <Input
                                    id={`${serviceType}-custom-${providerName}-desc`}
                                    type="text"
                                    placeholder="Brief description of this provider"
                                    value={displayProvider.description || ''}
                                    onChange={(e) => {
                                      const currentProviders = customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {};
                                      const newValue = e.target.value;
                                      
                                      // Update local state immediately
                                      setCustomProvidersLocal(prev => ({
                                        ...prev,
                                        [serviceType]: {
                                          ...currentProviders,
                                          [providerName]: {
                                            ...displayProvider,
                                            description: newValue,
                                          },
                                        },
                                      }));
                                      
                                      // Debounce server sync
                                      const timeoutKey = `${serviceType}-${providerName}-description`;
                                      if (debounceTimeouts.current[timeoutKey]) {
                                        clearTimeout(debounceTimeouts.current[timeoutKey]);
                                      }
                                      debounceTimeouts.current[timeoutKey] = setTimeout(() => {
                                        const webSearch = {
                                          ...(config?.config?.webSearch || {}),
                                          customProviders: {
                                            ...currentProviders,
                                            [providerName]: {
                                              ...displayProvider,
                                              description: newValue,
                                            },
                                          },
                                        };
                                        updateConfigMutation.mutate({
                                          service: serviceType,
                                          updates: {
                                            config: {
                                              ...config?.config,
                                              webSearch,
                                            },
                                          },
                                        });
                                        delete debounceTimeouts.current[timeoutKey];
                                      }, 500);
                                    }}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}

                        {Object.keys(customProvidersLocal[serviceType] || config?.config?.webSearch?.customProviders || {}).length === 0 && (
                          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                            No custom providers added yet. Click &ldquo;Add Provider&rdquo; to add one.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor={`${serviceType}-rate-limit`}>Rate Limit (requests/min)</Label>
                  <Input
                    id={`${serviceType}-rate-limit`}
                    type="number"
                    placeholder="60"
                    value={config?.config?.rateLimit || ''}
                    onChange={(e) => {
                      updateConfigMutation.mutate({
                        service: serviceType,
                        updates: {
                          config: {
                            ...config?.config,
                            rateLimit: parseInt(e.target.value) || 60,
                          },
                        },
                      });
                    }}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateConfigMutation.mutate({
                        service: serviceType,
                        updates: { config: config?.config || {}, enabled: isEnabled },
                      })
                    }}
                    disabled={updateConfigMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedService(serviceType)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Advanced
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{info.name} - Advanced Configuration</DialogTitle>
                        <DialogDescription>
                          Edit the JSON configuration for advanced settings
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          className="font-mono text-sm"
                          rows={12}
                          value={pendingAdvanced[serviceType] ?? JSON.stringify(config?.config || {}, null, 2)}
                          onChange={(e) => setPendingAdvanced((prev) => ({ ...prev, [serviceType]: e.target.value }))}
                          placeholder="{}"
                        />
                        <Button
                          onClick={() => {
                            try {
                              const raw = pendingAdvanced[serviceType] ?? JSON.stringify(config?.config || {}, null, 2)
                              const parsed = JSON.parse(raw)
                              updateConfigMutation.mutate({
                                service: serviceType,
                                updates: { config: parsed },
                              })
                              toast.success('Advanced configuration saved')
                            } catch (e: unknown) {
                              toast.error(`Invalid JSON: ${e?.message || ''}`)
                            }
                          }}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Configuration
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnectionMutation.mutate({ service: serviceType, config: config?.config || {} })}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Test Result Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Connection Successful
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Connection Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>{testResult?.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setIsTestDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





