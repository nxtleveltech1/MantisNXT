"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Trash2, Plus, Star, Edit2, CheckCircle2, XCircle } from 'lucide-react';

type ProviderKey = 'openai' | 'anthropic' | 'openai_compatible' | 'serper' | 'tavily' | 'google_search';
type ServiceType = 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'chatbot' | 'supplier_discovery';

interface AIServiceConfig {
  id: string;
  service_type: ServiceType;
  config: any;
  enabled: boolean;
}

interface ProviderInstance {
  id: string;
  provider: ProviderKey;
  baseUrl: string;
  apiKey: string;
  model?: string; // Optional for web search providers
  enabled: boolean;
  connected?: boolean;
  // Web search specific fields
  googleSearchEngineId?: string; // For Google Search provider
}

const SERVICE_INFO: Record<ServiceType, { name: string; description: string; icon: string }> = {
  demand_forecasting: {
    name: 'Demand Forecasting',
    description: 'Predict future product demand using historical data',
    icon: '📊',
  },
  anomaly_detection: {
    name: 'Anomaly Detection',
    description: 'Detect unusual patterns in sales and inventory',
    icon: '🔍',
  },
  supplier_scoring: {
    name: 'Supplier Scoring',
    description: 'Evaluate supplier performance and reliability',
    icon: '⭐',
  },
  chatbot: {
    name: 'AI Assistant',
    description: 'Conversational AI for business insights',
    icon: '💬',
  },
  supplier_discovery: {
    name: 'Supplier Discovery',
    description: 'Discover and analyze potential suppliers',
    icon: '🌐',
  },
};

function useConfigs() {
  return useQuery<AIServiceConfig[]>({
    queryKey: ['ai-configs'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ai/config');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.data || [];
    },
  });
}

export default function UnifiedServicePanel() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useConfigs();
  
  // Form state for adding a new provider instance per service
  const [newProviderForms, setNewProviderForms] = useState<Record<string, {
    provider: ProviderKey;
    baseUrl: string;
    apiKey: string;
    model: string;
    googleSearchEngineId?: string; // For Google Search provider
  }>>({});

  // Edit mode state
  const [editingInstance, setEditingInstance] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    provider: ProviderKey;
    baseUrl: string;
    apiKey: string;
    model: string;
    googleSearchEngineId?: string;
  } | null>(null);

  const updateConfig = useMutation({
    mutationFn: async ({ serviceType, payload }: { serviceType: ServiceType; payload: any }) => {
      const res = await fetch(`/api/v1/ai/config/${serviceType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return { serviceType, data };
    },
    onSuccess: ({ data, serviceType }) => {
      // Update cache with server response instead of refetching
      queryClient.setQueryData(['ai-configs'], (old: AIServiceConfig[] | undefined) => {
        const updatedConfig = data?.data;
        if (!updatedConfig) {
          console.warn('⚠️ No updated config in server response:', data);
          // If server response is bad, invalidate to force refetch
          queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
          return old || [];
        }
        
        if (!old) {
          return [updatedConfig];
        }
        
        // Find and replace by service_type (handles both temp IDs and real IDs)
        const existingIndex = old.findIndex(c => c.service_type === updatedConfig.service_type);
        if (existingIndex >= 0) {
          // Replace existing config with server response (server is source of truth)
          return old.map(c => {
            if (c.service_type === updatedConfig.service_type) {
              // Use server response directly - it has the saved data with real ID
              return updatedConfig;
            }
            return c;
          });
        } else {
          // Add new config
          return [...old, updatedConfig];
        }
      });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save provider'),
  });

  // Auto-migration disabled - circuit breaker protection
  // const [migrationRun, setMigrationRun] = useState(false);

  const getForm = (serviceType: ServiceType) => {
    const form = newProviderForms[serviceType];
    if (form) return form;
    
    // Default form based on provider type
    return {
      provider: 'openai' as ProviderKey,
      baseUrl: '',
      apiKey: '',
      model: '',
      googleSearchEngineId: '',
    };
  };

  const getDefaultBaseUrl = (provider: ProviderKey): string => {
    switch (provider) {
      case 'serper':
        return 'https://google.serper.dev';
      case 'tavily':
        return 'https://api.tavily.com';
      case 'google_search':
        return 'https://www.googleapis.com/customsearch/v1';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      default:
        return '';
    }
  };

  const setForm = (serviceType: ServiceType, updates: Partial<typeof newProviderForms[string]>) => {
    setNewProviderForms(prev => {
      const current = getForm(serviceType);
      const newForm = { ...current, ...updates };
      
      // Auto-fill baseUrl when provider changes if it's empty
      if (updates.provider && !newForm.baseUrl) {
        newForm.baseUrl = getDefaultBaseUrl(updates.provider);
      }
      
      return {
        ...prev,
        [serviceType]: newForm,
      };
    });
  };

  const addProviderInstance = (serviceType: ServiceType, cfg: any) => {
    const form = getForm(serviceType);
    const isWebSearchProvider = ['serper', 'tavily', 'google_search'].includes(form.provider);
    
    // Validation: model is optional for web search providers
    if (!form.provider || !form.baseUrl || !form.apiKey || (!isWebSearchProvider && !form.model)) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Google Search requires engine ID
    if (form.provider === 'google_search' && !form.googleSearchEngineId) {
      toast.error('Google Search Engine ID is required for Google Search provider');
      return;
    }

    // Get the current config from the configs array to ensure we have the full config
    const currentConfig = configs.find(c => c.service_type === serviceType);
    const fullCfg = currentConfig?.config || cfg || {};
    
    const instances: ProviderInstance[] = fullCfg.providerInstances || [];
    
    const newInstance: ProviderInstance = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: form.provider,
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      model: form.model || undefined, // Optional for web search
      enabled: true,
      ...(form.provider === 'google_search' && form.googleSearchEngineId
        ? { googleSearchEngineId: form.googleSearchEngineId }
        : {}),
    };

    const updatedInstances = [...instances, newInstance];
    const activeId = fullCfg.activeProviderInstanceId || newInstance.id;

    // Optimistically update the cache immediately
    queryClient.setQueryData(['ai-configs'], (old: AIServiceConfig[] | undefined) => {
      if (!old) {
        // If no configs exist yet, create a new one
        return [{
          id: `temp-${serviceType}`,
          service_type: serviceType,
          config: {
            ...fullCfg,
            providerInstances: updatedInstances,
            activeProviderInstanceId: activeId,
          },
          enabled: false,
        }];
      }
      
      const existingIndex = old.findIndex(c => c.service_type === serviceType);
      if (existingIndex >= 0) {
        // Update existing config
        return old.map(c => {
          if (c.service_type !== serviceType) return c;
          const existingConfig = c.config || {};
          return {
            ...c,
            config: {
              ...existingConfig,
              providerInstances: updatedInstances,
              activeProviderInstanceId: activeId,
            },
          };
        });
      } else {
        // Add new config entry
        return [...old, {
          id: `temp-${serviceType}`,
          service_type: serviceType,
          config: {
            ...fullCfg,
            providerInstances: updatedInstances,
            activeProviderInstanceId: activeId,
          },
          enabled: false,
        }];
      }
    });

    updateConfig.mutate(
      {
        serviceType,
        payload: {
          config: {
            ...fullCfg, // Preserve all existing config fields (webSearch, etc.)
            providerInstances: updatedInstances,
            activeProviderInstanceId: activeId,
          },
        },
      },
      {
        onSuccess: () => {
          // Cache is updated by mutation's onSuccess handler
          toast.success('Provider added successfully');
          // Reset form
          setNewProviderForms(prev => {
            const next = { ...prev };
            delete next[serviceType];
            return next;
          });
        },
        onError: (error: any) => {
          // Rollback optimistic update on error
          queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
          toast.error(`Failed to add provider: ${error?.message || 'Unknown error'}`);
          console.error('Failed to add provider:', error);
        },
      }
    );
  };

  const deleteProviderInstance = (serviceType: ServiceType, cfg: any, instanceId: string) => {
    const instances: ProviderInstance[] = cfg.providerInstances || [];
    const updatedInstances = instances.filter(i => i.id !== instanceId);
    
    let activeId = cfg.activeProviderInstanceId;
    if (activeId === instanceId) {
      activeId = updatedInstances.length > 0 ? updatedInstances[0].id : null;
    }

    updateConfig.mutate({
      serviceType,
      payload: {
        config: {
          ...cfg,
          providerInstances: updatedInstances,
          activeProviderInstanceId: activeId,
        },
      },
    });
  };

  const startEditingInstance = (instance: ProviderInstance) => {
    setEditingInstance(instance.id);
    setEditForm({
      provider: instance.provider,
      baseUrl: instance.baseUrl,
      apiKey: instance.apiKey,
      model: instance.model || '',
      googleSearchEngineId: instance.googleSearchEngineId || '',
    });
  };

  const saveEditedInstance = (serviceType: ServiceType, cfg: any, instanceId: string) => {
    if (!editForm) return;

    const instances: ProviderInstance[] = cfg.providerInstances || [];
    const updatedInstances = instances.map(i => 
      i.id === instanceId 
        ? { 
            ...i, 
            ...editForm, 
            connected: undefined,
            ...(editForm.provider === 'google_search' && editForm.googleSearchEngineId
              ? { googleSearchEngineId: editForm.googleSearchEngineId }
              : editForm.provider !== 'google_search'
              ? { googleSearchEngineId: undefined }
              : {}),
          }
        : i
    );

    updateConfig.mutate({
      serviceType,
      payload: {
        config: {
          ...cfg,
          providerInstances: updatedInstances,
        },
      },
    });

    setEditingInstance(null);
    setEditForm(null);
  };

  const testInstanceConnection = async (serviceType: ServiceType, instance: ProviderInstance) => {
    try {
      const testConfig = {
        provider: instance.provider,
        baseUrl: instance.baseUrl,
        apiKey: instance.apiKey,
        model: instance.model,
      };
      const res = await fetch(`/api/v1/ai/config/${serviceType}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: testConfig }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      toast.success('Connection successful');
      
      // Update connection status in cache
      queryClient.setQueryData(['ai-configs'], (old: AIServiceConfig[] | undefined) => {
        if (!old) return old;
        return old.map(c => {
          if (c.service_type !== serviceType) return c;
          const instances: ProviderInstance[] = c.config.providerInstances || [];
          return {
            ...c,
            config: {
              ...c.config,
              providerInstances: instances.map(i => 
                i.id === instance.id ? { ...i, connected: true } : i
              ),
            },
          };
        });
      });
    } catch (e: any) {
      toast.error(e?.message || 'Connection failed');
      
      // Update connection status in cache
      queryClient.setQueryData(['ai-configs'], (old: AIServiceConfig[] | undefined) => {
        if (!old) return old;
        return old.map(c => {
          if (c.service_type !== serviceType) return c;
          const instances: ProviderInstance[] = c.config.providerInstances || [];
          return {
            ...c,
            config: {
              ...c.config,
              providerInstances: instances.map(i => 
                i.id === instance.id ? { ...i, connected: false } : i
              ),
            },
          };
        });
      });
    }
  };

  const toggleProviderInstance = (serviceType: ServiceType, cfg: any, instanceId: string, enabled: boolean) => {
    const instances: ProviderInstance[] = cfg.providerInstances || [];
    const updatedInstances = instances.map(i => i.id === instanceId ? { ...i, enabled } : i);

    updateConfig.mutate({
      serviceType,
      payload: {
        config: {
          ...cfg,
          providerInstances: updatedInstances,
        },
      },
    });
  };

  const setActiveProvider = (serviceType: ServiceType, cfg: any, instanceId: string) => {
    updateConfig.mutate({
      serviceType,
      payload: {
        config: {
          ...cfg,
          activeProviderInstanceId: instanceId,
        },
      },
    });
  };

  const toggleService = (serviceType: ServiceType, enabled: boolean) => {
    updateConfig.mutate({
      serviceType,
      payload: { enabled },
    });
  };

  // Create a map of existing configs by service_type
  const configsByType = new Map(configs.map(c => [c.service_type, c]));

  return (
    <div className="space-y-4">
      {(Object.keys(SERVICE_INFO) as ServiceType[]).map((serviceType) => {
        const info = SERVICE_INFO[serviceType];
        const config = configsByType.get(serviceType);
        
        // Use existing config or create default
        const cfg = config?.config || {};
        const instances: ProviderInstance[] = cfg.providerInstances || [];
        const activeId = cfg.activeProviderInstanceId;
        const isEnabled = config?.enabled ?? false;
        const form = getForm(serviceType);

        return (
          <Card key={serviceType} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{info.name}</CardTitle>
                    <CardDescription>{info.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${serviceType}-enabled`} className="text-sm">
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id={`${serviceType}-enabled`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => toggleService(serviceType, checked)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Provider Form */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium text-sm">Add New Provider</h4>
                <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${form.provider === 'google_search' ? 'md:grid-cols-5' : ''}`}>
                  <div className="space-y-2">
                    <Label>Provider Type</Label>
                    <Select
                      value={form.provider}
                      onValueChange={(v) => {
                        const newProvider = v as ProviderKey;
                        setForm(serviceType, { 
                          provider: newProvider,
                          baseUrl: getDefaultBaseUrl(newProvider), // Auto-fill URL
                        });
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                        <SelectItem value="serper">Serper</SelectItem>
                        <SelectItem value="tavily">Tavily</SelectItem>
                        <SelectItem value="google_search">Google Search</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      placeholder={getDefaultBaseUrl(form.provider) || "https://api.example.com"}
                      value={form.baseUrl}
                      onChange={(e) => setForm(serviceType, { baseUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={form.apiKey}
                      onChange={(e) => setForm(serviceType, { apiKey: e.target.value })}
                    />
                  </div>
                  {form.provider !== 'google_search' && (
                    <div className="space-y-2">
                      <Label>Model{['serper', 'tavily'].includes(form.provider) ? ' (Optional)' : ''}</Label>
                      <Input
                        placeholder="gpt-4o-mini"
                        value={form.model}
                        onChange={(e) => setForm(serviceType, { model: e.target.value })}
                      />
                    </div>
                  )}
                  {form.provider === 'google_search' && (
                    <>
                      <div className="space-y-2">
                        <Label>Model (Optional)</Label>
                        <Input
                          placeholder="Not required for Google Search"
                          value={form.model}
                          onChange={(e) => setForm(serviceType, { model: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Google Search Engine ID *</Label>
                        <Input
                          placeholder="..."
                          value={form.googleSearchEngineId || ''}
                          onChange={(e) => setForm(serviceType, { googleSearchEngineId: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addProviderInstance(serviceType, cfg)} className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Provider
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const testForm = getForm(serviceType);
                      if (!testForm.provider || !testForm.baseUrl || !testForm.apiKey || !testForm.model) {
                        toast.error('Please fill in all fields to test connection');
                        return;
                      }
                      try {
                        const testConfig = {
                          provider: testForm.provider,
                          baseUrl: testForm.baseUrl,
                          apiKey: testForm.apiKey,
                          model: testForm.model,
                        };
                        const res = await fetch(`/api/v1/ai/config/${serviceType}/test`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ config: testConfig }),
                        });
                        if (!res.ok) throw new Error(await res.text());
                        toast.success('Connection test successful');
                      } catch (e: any) {
                        toast.error(e?.message || 'Connection test failed');
                      }
                    }}
                  >
                    Test Connection
                  </Button>
                </div>
              </div>

              {/* Provider Instances List */}
              {instances.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Active Providers ({instances.length})</h4>
                  {instances.map((inst) => {
                    const isEditing = editingInstance === inst.id;
                    return (
                      <div
                        key={inst.id}
                        className={`border rounded-lg p-4 ${
                          activeId === inst.id ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        {isEditing ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className={`grid grid-cols-4 gap-4 ${editForm?.provider === 'google_search' ? 'md:grid-cols-5' : ''}`}>
                              <div className="space-y-2">
                                <Label>Provider Type</Label>
                                <Select
                                  value={editForm?.provider}
                                  onValueChange={(v) => setEditForm(prev => prev ? { ...prev, provider: v as ProviderKey, baseUrl: getDefaultBaseUrl(v as ProviderKey) } : null)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="anthropic">Anthropic</SelectItem>
                                    <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                                    <SelectItem value="serper">Serper</SelectItem>
                                    <SelectItem value="tavily">Tavily</SelectItem>
                                    <SelectItem value="google_search">Google Search</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Endpoint URL</Label>
                                <Input
                                  value={editForm?.baseUrl || ''}
                                  onChange={(e) => setEditForm(prev => prev ? { ...prev, baseUrl: e.target.value } : null)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                  type="password"
                                  value={editForm?.apiKey || ''}
                                  onChange={(e) => setEditForm(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                                />
                              </div>
                              {editForm?.provider !== 'google_search' && (
                                <div className="space-y-2">
                                  <Label>Model{['serper', 'tavily'].includes(editForm?.provider || '') ? ' (Optional)' : ''}</Label>
                                  <Input
                                    value={editForm?.model || ''}
                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, model: e.target.value } : null)}
                                  />
                                </div>
                              )}
                              {editForm?.provider === 'google_search' && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Model (Optional)</Label>
                                    <Input
                                      value={editForm?.model || ''}
                                      onChange={(e) => setEditForm(prev => prev ? { ...prev, model: e.target.value } : null)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Google Search Engine ID *</Label>
                                    <Input
                                      value={editForm?.googleSearchEngineId || ''}
                                      onChange={(e) => setEditForm(prev => prev ? { ...prev, googleSearchEngineId: e.target.value } : null)}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingInstance(null);
                                  setEditForm(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveEditedInstance(serviceType, cfg, inst.id)}
                              >
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveProvider(serviceType, cfg, inst.id)}
                                className={activeId === inst.id ? 'text-primary' : ''}
                                title="Set as active provider"
                              >
                                <Star className={`w-4 h-4 ${activeId === inst.id ? 'fill-current' : ''}`} />
                              </Button>
                              
                              {/* Connection Status */}
                              <div className="flex items-center gap-2">
                                {inst.connected === true && (
                                  <div className="flex items-center gap-1 text-green-600" title="Connected">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-medium">Connected</span>
                                  </div>
                                )}
                                {inst.connected === false && (
                                  <div className="flex items-center gap-1 text-red-600" title="Connection failed">
                                    <XCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">Failed</span>
                                  </div>
                                )}
                                {inst.connected === undefined && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => testInstanceConnection(serviceType, inst)}
                                    className="text-xs"
                                  >
                                    Test
                                  </Button>
                                )}
                              </div>

                              <div className={`flex-1 grid gap-4 text-sm ${inst.provider === 'google_search' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                                <div>
                                  <div className="font-medium">{inst.provider.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                                </div>
                                <div className="truncate" title={inst.baseUrl}>
                                  <span className="text-muted-foreground">URL:</span> {inst.baseUrl}
                                </div>
                                <div className="truncate">
                                  <span className="text-muted-foreground">Key:</span> {inst.apiKey.substring(0, 10)}...
                                </div>
                                <div className="truncate" title={inst.model}>
                                  <span className="text-muted-foreground">Model:</span> {inst.model || 'N/A'}
                                </div>
                                {inst.provider === 'google_search' && inst.googleSearchEngineId && (
                                  <div className="truncate" title={inst.googleSearchEngineId}>
                                    <span className="text-muted-foreground">Engine ID:</span> {inst.googleSearchEngineId}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={inst.enabled}
                                  onCheckedChange={(checked) => toggleProviderInstance(serviceType, cfg, inst.id, checked)}
                                />
                                <Label className="text-xs">{inst.enabled ? 'On' : 'Off'}</Label>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingInstance(inst)}
                                title="Edit provider"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this provider?')) {
                                    deleteProviderInstance(serviceType, cfg, inst.id);
                                  }
                                }}
                                className="text-destructive hover:text-destructive"
                                title="Delete provider"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

