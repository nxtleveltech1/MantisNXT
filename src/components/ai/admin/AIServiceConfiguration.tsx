'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { Settings, TestTube, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupportedModels } from '@/lib/ai/model-utils';

interface AIServiceConfig {
  id: string;
  service_type: 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant';
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
    [key: string]: any;
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

const isOpenRouterProvider = (providerId: string, section: any, rootConfig?: AIServiceConfig): boolean => {
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
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [pendingAdvanced, setPendingAdvanced] = useState<Record<string, string>>({});
  const [openRouterFilters, setOpenRouterFilters] = useState<Record<string, boolean>>({});

  // Helper: fetch models for a service/provider combination and cache locally
  async function fetchModelsFor(service: string, cfg: any) {
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

  // On initial load, try to pre-populate model lists for configured providers
  useEffect(() => {
    if (!configs?.length) return
    configs.forEach((c) => {
      const service = c.service_type
      const provider = (c.config?.activeProvider || c.config?.provider || 'openai') as string
      const dynKey = `${service}:${provider}`
      if (dynamicModels[dynKey]?.length) return
      const section = (c.config?.providers?.[provider] || {}) as any
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
    mutationFn: async ({ service, config }: { service: string; config: any }) => {
      const response = await fetch(`/api/v1/ai/config/${service}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      setTestResult({ success: true, message: data?.data?.message || 'Connection successful!' });
      setIsTestDialogOpen(true);
    },
    onError: (error: any) => {
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

      <div className="grid gap-6 grid-cols-1">
        {Object.entries(SERVICE_INFO).map(([serviceType, info]) => {
          const config = getServiceConfig(serviceType);
          const isEnabled = config?.enabled || false;
          const activeProv = config?.config?.activeProvider || config?.config?.provider || 'openai'
          const dynKey = `${serviceType}:${activeProv}`
          const supportedModels = getSupportedModels(activeProv)
          const providerSection = (config?.config?.providers?.[activeProv] || {}) as any
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
                            activeProvider: value as any,
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
                              activeProvider: value as any,
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
                      } catch (e:any) {
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
                  const section = (config?.config?.providers?.[p] || {}) as any
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
                            } catch (e: any) {
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




