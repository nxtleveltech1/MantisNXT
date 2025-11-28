"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, Plus, Star, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { ModelSelector } from './providers/ModelSelector';

type ProviderKey = 'openai' | 'anthropic' | 'openai_compatible' | 'google' | 'serper' | 'tavily' | 'google_search' | 'firecrawl' | 'brave' | 'exa' | 'openrouter' | 'kilocode';
type ServiceType = 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'chatbot' | 'supplier_discovery';

interface AIServiceConfig {
  id: string;
  service_type: ServiceType;
  config: unknown;
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
  // Google Gemini specific fields
  useVertexAI?: boolean;
  googleProject?: string;
  googleLocation?: string;
  googleApiVersion?: 'v1' | 'v1alpha';
  // CLI-based execution options
  useCLI?: boolean;
  cliCommand?: string;
  cliArgs?: string[];
  useOAuth?: boolean;
  useGCloudADC?: boolean;
  cliWorkingDirectory?: string;
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
  
  // CLI availability state
  const { data: cliAvailability } = useQuery<Record<string, { available: boolean; version?: string; installationHint?: string }>>({
    queryKey: ['ai-cli-availability'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ai/cli/availability');
      if (!res.ok) return {};
      const data = await res.json();
      return data.data || {};
    },
    refetchInterval: 60000, // Check every minute
  });
  
  // Form state for adding a new provider instance per service
  const [newProviderForms, setNewProviderForms] = useState<Record<string, {
    provider: ProviderKey;
    baseUrl: string;
    apiKey: string;
    model: string;
    googleSearchEngineId?: string; // For Google Search provider
    // Google Gemini specific
    useVertexAI?: boolean;
    googleProject?: string;
    googleLocation?: string;
    googleApiVersion?: 'v1' | 'v1alpha';
    // CLI-based execution options
    useCLI?: boolean;
    cliCommand?: string;
    cliArgs?: string;
    useOAuth?: boolean;
    useGCloudADC?: boolean;
    cliWorkingDirectory?: string;
  }>>({});

  // Edit mode state
  const [editingInstance, setEditingInstance] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    provider: ProviderKey;
    baseUrl: string;
    apiKey: string;
    model: string;
    googleSearchEngineId?: string;
    // Google Gemini specific fields
    useVertexAI?: boolean;
    googleProject?: string;
    googleLocation?: string;
    googleApiVersion?: 'v1' | 'v1alpha';
    // CLI-based execution options
    useCLI?: boolean;
    cliCommand?: string;
    cliArgs?: string;
    useOAuth?: boolean;
    useGCloudADC?: boolean;
    cliWorkingDirectory?: string;
  } | null>(null);

  const updateConfig = useMutation({
    mutationFn: async ({ serviceType, payload }: { serviceType: ServiceType; payload: unknown }) => {
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
    onError: (e: unknown) => toast.error(e?.message || 'Failed to save provider'),
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
      useVertexAI: false,
      googleProject: '',
      googleLocation: 'us-central1',
      googleApiVersion: 'v1' as 'v1' | 'v1alpha',
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
      case 'google':
        return 'https://generativelanguage.googleapis.com';
      case 'firecrawl':
        return 'https://api.firecrawl.dev';
      case 'brave':
        return 'https://api.search.brave.com';
      case 'exa':
        return 'https://api.exa.ai';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'openai_compatible':
        return '';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'kilocode':
        return 'https://api.kilocode.com/v1';
      default:
        return '';
    }
  };

  const isWebSearchProvider = (provider: ProviderKey): boolean => {
    return ['serper', 'tavily', 'google_search', 'firecrawl', 'brave', 'exa'].includes(provider);
  };

  const isLLMProvider = (provider: ProviderKey): boolean => {
    return ['openai', 'anthropic', 'openai_compatible', 'google'].includes(provider);
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

  const addProviderInstance = async (serviceType: ServiceType, cfg: unknown) => {
    try {
      console.log('[addProviderInstance] Starting...', { serviceType, cfg });
      const form = getForm(serviceType);
      console.log('[addProviderInstance] Form state:', form);
      const isWebSearch = isWebSearchProvider(form.provider);
      
      // Validation: provider is always required
      if (!form.provider) {
        console.error('[addProviderInstance] Validation failed: No provider selected');
        toast.error('Please select a provider type');
        return;
      }

    // Base URL is optional for CLI mode, but ensure it has a default for API mode
    const isCLIMode = (form.provider === 'google' || form.provider === 'openai') && form.useCLI;
    const effectiveBaseUrl = form.baseUrl || (!isCLIMode ? getDefaultBaseUrl(form.provider) : undefined);
    
    if (!isCLIMode && !effectiveBaseUrl) {
      toast.error('Please fill in endpoint URL');
      return;
    }

    // Google Gemini validation
    if (form.provider === 'google') {
      if (form.useCLI) {
        // CLI mode validation - OAuth doesn't require API key or baseUrl
        if (!form.useOAuth && !form.useGCloudADC) {
          // Only require API key if neither OAuth nor gcloud ADC is enabled
          if (!form.apiKey) {
            toast.error('API Key, OAuth, or gcloud ADC is required for CLI mode');
            return;
          }
        }
        if (form.useGCloudADC && !form.googleProject) {
          toast.error('GCP Project ID is required for gcloud ADC mode');
          return;
        }
        if (!form.model) {
          toast.error('Model is required for Google Gemini');
          return;
        }
      } else if (form.useVertexAI) {
        // Vertex AI mode: requires project
        if (!form.googleProject) {
          toast.error('GCP Project ID is required for Vertex AI mode');
          return;
        }
      } else {
        // Developer API mode: requires API key
        if (!form.apiKey) {
          toast.error('API Key is required for Google Gemini Developer API mode');
          return;
        }
        if (!form.model) {
          toast.error('Model is required for Google Gemini');
          return;
        }
      }
    } else if (form.provider === 'openai' && form.useCLI) {
      // OpenAI CLI mode validation
      if (!form.useOAuth && !form.apiKey) {
        toast.error('API Key or OAuth is required for CLI mode');
        return;
      }
      if (!form.model) {
        toast.error('Model is required for OpenAI');
        return;
      }
    } else {
      // Other providers: standard validation
      if (!form.apiKey) {
        toast.error('API Key is required');
        return;
      }
      if (!isWebSearch && !form.model) {
        toast.error('Model is required for LLM providers');
        return;
      }
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
      baseUrl: effectiveBaseUrl || undefined,
      apiKey: form.apiKey || undefined, // Optional for Vertex AI mode or OAuth
      model: form.model || undefined, // Optional for web search
      enabled: true,
      ...(form.provider === 'google_search' && form.googleSearchEngineId
        ? { googleSearchEngineId: form.googleSearchEngineId }
        : {}),
      ...(form.provider === 'google' ? {
        useVertexAI: form.useVertexAI || false,
        googleProject: form.googleProject || undefined,
        googleLocation: form.googleLocation || 'us-central1',
        googleApiVersion: form.googleApiVersion || 'v1',
      } : {}),
      // CLI options - include for both Google and OpenAI
      ...((form.useCLI && (form.provider === 'google' || form.provider === 'openai')) ? {
        useCLI: true,
        cliCommand: form.cliCommand || (form.provider === 'google' ? 'gemini' : 'codex'),
        cliArgs: form.cliArgs ? form.cliArgs.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
        useOAuth: form.useOAuth || false,
        useGCloudADC: form.useGCloudADC || false,
        cliWorkingDirectory: form.cliWorkingDirectory || undefined,
      } : {}),
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

    console.log('Saving provider instance:', { serviceType, newInstance, updatedInstances, activeId });
    
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
        onSuccess: (data) => {
          console.log('Provider added successfully:', data);
          // Cache is updated by mutation's onSuccess handler
          toast.success('Provider added successfully');
          // Reset form
          setNewProviderForms(prev => {
            const next = { ...prev };
            delete next[serviceType];
            return next;
          });
        },
        onError: (error: unknown) => {
          console.error('Failed to add provider:', error);
          // Rollback optimistic update on error
          queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast.error(`Failed to add provider: ${errorMessage}`);
        },
      }
    );
    } catch (error: unknown) {
      console.error('[addProviderInstance] Unexpected error:', error);
      toast.error(`Failed to add provider: ${error?.message || 'Unknown error'}`);
    }
  };

  const deleteProviderInstance = (serviceType: ServiceType, cfg: unknown, instanceId: string) => {
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
      apiKey: instance.apiKey || '',
      model: instance.model || '',
      googleSearchEngineId: instance.googleSearchEngineId || '',
      useVertexAI: instance.useVertexAI || false,
      googleProject: instance.googleProject || '',
      googleLocation: instance.googleLocation || 'us-central1',
      googleApiVersion: instance.googleApiVersion || 'v1',
      // CLI options
      useCLI: instance.useCLI || false,
      cliCommand: instance.cliCommand || (instance.provider === 'google' ? 'gemini' : instance.provider === 'openai' ? 'codex' : ''),
      cliArgs: instance.cliArgs?.join(', ') || '',
      useOAuth: instance.useOAuth || false,
      useGCloudADC: instance.useGCloudADC || false,
      cliWorkingDirectory: instance.cliWorkingDirectory || '',
    });
  };

  const saveEditedInstance = (serviceType: ServiceType, cfg: unknown, instanceId: string) => {
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
            ...(editForm.provider === 'google' ? {
              useVertexAI: editForm.useVertexAI || false,
              googleProject: editForm.googleProject || undefined,
              googleLocation: editForm.googleLocation || 'us-central1',
              googleApiVersion: editForm.googleApiVersion || 'v1',
            } : {
              useVertexAI: undefined,
              googleProject: undefined,
              googleLocation: undefined,
              googleApiVersion: undefined,
            }),
            // CLI options
            ...((editForm.useCLI && (editForm.provider === 'google' || editForm.provider === 'openai')) ? {
              useCLI: true,
              cliCommand: editForm.cliCommand || (editForm.provider === 'google' ? 'gemini' : 'codex'),
              cliArgs: editForm.cliArgs ? editForm.cliArgs.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
              useOAuth: editForm.useOAuth || false,
              useGCloudADC: editForm.useGCloudADC || false,
              cliWorkingDirectory: editForm.cliWorkingDirectory || undefined,
            } : {
              useCLI: false,
              cliCommand: undefined,
              cliArgs: undefined,
              useOAuth: false,
              useGCloudADC: false,
              cliWorkingDirectory: undefined,
            }),
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
    console.log('[testInstanceConnection] Starting test for:', { serviceType, instance });
    try {
      toast.loading('Testing connection...', { id: 'test-connection' });
      
      const testConfig: unknown = {
        provider: instance.provider,
        baseUrl: instance.baseUrl,
        apiKey: instance.apiKey,
        model: instance.model,
      };
      
      // Include CLI configuration if CLI mode is enabled
      if (instance.useCLI) {
        console.log('[testInstanceConnection] CLI mode enabled, adding CLI config');
        testConfig.useCLI = true;
        testConfig.cliCommand = instance.cliCommand || (instance.provider === 'google' ? 'gemini' : 'codex');
        testConfig.cliArgs = instance.cliArgs;
        testConfig.useOAuth = instance.useOAuth;
        testConfig.useGCloudADC = instance.useGCloudADC;
        testConfig.cliWorkingDirectory = instance.cliWorkingDirectory;
        if (instance.useGCloudADC) {
          testConfig.googleProject = instance.googleProject;
          testConfig.googleLocation = instance.googleLocation;
        }
        // For CLI mode with OAuth, baseUrl and apiKey are optional
        if (!testConfig.baseUrl && instance.provider === 'google') {
          testConfig.baseUrl = getDefaultBaseUrl(instance.provider);
        }
      } else if (instance.provider === 'google') {
        // For non-CLI Google, ensure baseUrl is set
        if (!testConfig.baseUrl) {
          testConfig.baseUrl = getDefaultBaseUrl(instance.provider);
        }
        // Include Google-specific config
        if (instance.useVertexAI) {
          testConfig.useVertexAI = instance.useVertexAI;
          testConfig.googleProject = instance.googleProject;
          testConfig.googleLocation = instance.googleLocation;
          testConfig.googleApiVersion = instance.googleApiVersion;
        }
      }
      
      console.log('[testInstanceConnection] Sending test config:', testConfig);
      
      const res = await fetch(`/api/v1/ai/config/${serviceType}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: testConfig }),
      });
      
      console.log('[testInstanceConnection] Response status:', res.status);
      const responseData = await res.json().catch(() => ({}));
      console.log('[testInstanceConnection] Response data:', responseData);
      
      if (!res.ok) {
        const errorText = responseData.error || responseData.message || await res.text();
        console.error('[testInstanceConnection] Test failed:', errorText);
        toast.error(`Connection test failed: ${errorText}`, { id: 'test-connection' });
        throw new Error(errorText);
      }
      
      toast.success('Connection successful', { id: 'test-connection' });
      
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
    } catch (error) {
      console.error('[testInstanceConnection] Connection test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      toast.error(errorMessage, { id: 'test-connection' });
    }
  };

  const toggleProviderInstance = (serviceType: ServiceType, cfg: unknown, instanceId: string, enabled: boolean) => {
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

  const setActiveProvider = (serviceType: ServiceType, cfg: unknown, instanceId: string) => {
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
                <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${['google_search', 'google'].includes(form.provider) ? 'md:grid-cols-5' : ''}`}>
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
                        {/* LLM Providers */}
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                        <SelectItem value="google">Google Gemini</SelectItem>
                        <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                        <SelectItem value="kilocode">KiloCode</SelectItem>
                        {/* Web Search Providers */}
                        <SelectItem value="serper">Serper (Google Search API)</SelectItem>
                        <SelectItem value="tavily">Tavily (AI Search)</SelectItem>
                        <SelectItem value="google_search">Google Custom Search</SelectItem>
                        <SelectItem value="brave">Brave Search</SelectItem>
                        <SelectItem value="exa">Exa (Semantic Search)</SelectItem>
                        {/* Web Scraping */}
                        <SelectItem value="firecrawl">Firecrawl (Web Scraping)</SelectItem>
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
                  {!isWebSearchProvider(form.provider) && (
                    <ModelSelector
                      providerId={form.provider}
                      value={form.model}
                      onChange={(model) => setForm(serviceType, { model })}
                      label="Model"
                      required={!isWebSearchProvider(form.provider)}
                      placeholder="Select or type a model"
                    />
                  )}
                  {isWebSearchProvider(form.provider) && form.provider !== 'google_search' && (
                    <ModelSelector
                      providerId={form.provider}
                      value={form.model}
                      onChange={(model) => setForm(serviceType, { model })}
                      label="Model (Optional)"
                      required={false}
                      placeholder="Not required for web search"
                    />
                  )}
                </div>
                {/* Google Gemini Advanced Configuration */}
                {form.provider === 'google' && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${serviceType}-use-vertex-ai`}
                        checked={form.useVertexAI || false}
                        onCheckedChange={(checked) => setForm(serviceType, { useVertexAI: checked as boolean })}
                      />
                      <Label htmlFor={`${serviceType}-use-vertex-ai`} className="text-sm font-normal cursor-pointer">
                        Use Vertex AI (GCP) instead of Developer API
                      </Label>
                    </div>
                    {form.useVertexAI ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>GCP Project ID *</Label>
                          <Input
                            placeholder="my-gcp-project"
                            value={form.googleProject || ''}
                            onChange={(e) => setForm(serviceType, { googleProject: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Your Google Cloud Project ID
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>GCP Location</Label>
                          <Input
                            placeholder="us-central1"
                            value={form.googleLocation || 'us-central1'}
                            onChange={(e) => setForm(serviceType, { googleLocation: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Default: us-central1
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            API Key
                            {!(form.useCLI && (form.useOAuth || form.useGCloudADC)) && ' *'}
                          </Label>
                          <Input
                            type="password"
                            placeholder={form.useCLI && form.useOAuth ? "Optional - not needed for OAuth" : "GEMINI_API_KEY or GOOGLE_API_KEY"}
                            value={form.apiKey}
                            onChange={(e) => setForm(serviceType, { apiKey: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Get from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>API Version</Label>
                          <Select
                            value={form.googleApiVersion || 'v1'}
                            onValueChange={(v) => setForm(serviceType, { googleApiVersion: v as 'v1' | 'v1alpha' })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="v1">v1 (Stable)</SelectItem>
                              <SelectItem value="v1alpha">v1alpha (Preview)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {/* CLI Mode Configuration */}
                    <div className="border-t pt-4 mt-4 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${serviceType}-use-cli`}
                          checked={form.useCLI || false}
                          onCheckedChange={(checked) => {
                            const updates: Partial<typeof form> = { useCLI: checked as boolean };
                            if (checked) {
                              // Set defaults when enabling CLI, but don't reset OAuth/ADC if already set
                              updates.cliCommand = 'gemini';
                              // Only reset OAuth/ADC if they're not already set
                              if (form.useOAuth === undefined) {
                                updates.useOAuth = false;
                              }
                              if (form.useGCloudADC === undefined) {
                                updates.useGCloudADC = false;
                              }
                            }
                            setForm(serviceType, updates);
                          }}
                        />
                      <Label htmlFor={`${serviceType}-use-cli`} className="text-sm font-normal cursor-pointer">
                        Use CLI Mode (OAuth supports free & paid accounts)
                      </Label>
                        {cliAvailability?.google && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            cliAvailability.google.available 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cliAvailability.google.available 
                              ? `✓ CLI Available (v${cliAvailability.google.version || '?'})` 
                              : 'CLI Not Installed'}
                          </span>
                        )}
                      </div>
                      {form.useCLI && (
                        <div className="space-y-4 pl-6 border-l-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>CLI Command</Label>
                              <Input
                                placeholder="gemini"
                                value={form.cliCommand || 'gemini'}
                                onChange={(e) => setForm(serviceType, { cliCommand: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Working Directory (Optional)</Label>
                              <Input
                                placeholder="/path/to/project"
                                value={form.cliWorkingDirectory || ''}
                                onChange={(e) => setForm(serviceType, { cliWorkingDirectory: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>CLI Arguments (Optional, comma-separated)</Label>
                            <Input
                              placeholder="--verbose, --output json"
                              value={form.cliArgs || ''}
                              onChange={(e) => setForm(serviceType, { cliArgs: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Authentication Method *</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${serviceType}-cli-oauth`}
                                  name={`${serviceType}-cli-auth`}
                                  checked={form.useOAuth === true}
                                  onChange={() => setForm(serviceType, { useOAuth: true, useGCloudADC: false })}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${serviceType}-cli-oauth`} className="text-sm font-normal cursor-pointer">
                                  OAuth (Google Account) - Works with free or paid accounts
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${serviceType}-cli-gcloud`}
                                  name={`${serviceType}-cli-auth`}
                                  checked={form.useGCloudADC === true}
                                  onChange={() => setForm(serviceType, { useGCloudADC: true, useOAuth: false })}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${serviceType}-cli-gcloud`} className="text-sm font-normal cursor-pointer">
                                  gcloud ADC (GCP Project)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${serviceType}-cli-apikey`}
                                  name={`${serviceType}-cli-auth`}
                                  checked={!form.useOAuth && !form.useGCloudADC}
                                  onChange={() => setForm(serviceType, { useOAuth: false, useGCloudADC: false })}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${serviceType}-cli-apikey`} className="text-sm font-normal cursor-pointer">
                                  API Key
                                </Label>
                              </div>
                            </div>
                            {!form.useOAuth && !form.useGCloudADC && (
                              <div className="mt-2">
                                <Input
                                  type="password"
                                  placeholder="GEMINI_API_KEY or GOOGLE_API_KEY"
                                  value={form.apiKey}
                                  onChange={(e) => setForm(serviceType, { apiKey: e.target.value })}
                                />
                              </div>
                            )}
                            {form.useGCloudADC && (
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  placeholder="GCP Project ID"
                                  value={form.googleProject || ''}
                                  onChange={(e) => setForm(serviceType, { googleProject: e.target.value })}
                                />
                                <Input
                                  placeholder="Location (default: us-central1)"
                                  value={form.googleLocation || 'us-central1'}
                                  onChange={(e) => setForm(serviceType, { googleLocation: e.target.value })}
                                />
                              </div>
                            )}
                            {form.useOAuth && (
                              <div className="mt-2 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  <strong>Step 1:</strong> Run this command in your terminal to log in:
                                </p>
                                <div className="bg-muted p-2 rounded text-xs font-mono">
                                  gemini
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  This will open a browser where you can log in with your Google account (free or paid). 
                                  After authentication, return here and click "Test Connection" to verify.
                                </p>
                              </div>
                            )}
                            {form.useGCloudADC && (
                              <p className="text-xs text-muted-foreground">
                                Run <code className="bg-muted px-1 rounded">gcloud auth application-default login</code> in terminal to authenticate with your GCP account
                              </p>
                            )}
                            {!form.useOAuth && !form.useGCloudADC && (
                              <p className="text-xs text-muted-foreground">
                                Enter your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* OpenAI Codex CLI Configuration */}
                {form.provider === 'openai' && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${serviceType}-openai-use-cli`}
                        checked={form.useCLI || false}
                        onCheckedChange={(checked) => {
                          const updates: Partial<typeof form> = { useCLI: checked as boolean };
                          if (checked) {
                            updates.cliCommand = 'codex';
                            // Only reset OAuth if it's not already set
                            if (form.useOAuth === undefined) {
                              updates.useOAuth = false;
                            }
                          }
                          setForm(serviceType, updates);
                        }}
                      />
                      <Label htmlFor={`${serviceType}-openai-use-cli`} className="text-sm font-normal cursor-pointer">
                        Use CLI Mode (Codex CLI)
                      </Label>
                      {cliAvailability?.openai && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          cliAvailability.openai.available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {cliAvailability.openai.available 
                            ? `✓ CLI Available (v${cliAvailability.openai.version || '?'})` 
                            : 'CLI Not Installed'}
                        </span>
                      )}
                    </div>
                    {form.useCLI && (
                      <div className="space-y-4 pl-6 border-l-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CLI Command</Label>
                            <Input
                              placeholder="codex"
                              value={form.cliCommand || 'codex'}
                              onChange={(e) => setForm(serviceType, { cliCommand: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Working Directory (Optional)</Label>
                            <Input
                              placeholder="/path/to/project"
                              value={form.cliWorkingDirectory || ''}
                              onChange={(e) => setForm(serviceType, { cliWorkingDirectory: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>CLI Arguments (Optional, comma-separated)</Label>
                          <Input
                            placeholder="--verbose, --output json"
                            value={form.cliArgs || ''}
                            onChange={(e) => setForm(serviceType, { cliArgs: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Authentication Method *</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${serviceType}-openai-cli-oauth`}
                                name={`${serviceType}-openai-cli-auth`}
                                checked={form.useOAuth === true}
                                onChange={() => setForm(serviceType, { useOAuth: true })}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`${serviceType}-openai-cli-oauth`} className="text-sm font-normal cursor-pointer">
                                ChatGPT Account (OAuth) - Works with free, Plus, Pro, Business, or Enterprise accounts
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${serviceType}-openai-cli-apikey`}
                                name={`${serviceType}-openai-cli-auth`}
                                checked={form.useOAuth === false}
                                onChange={() => setForm(serviceType, { useOAuth: false })}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`${serviceType}-openai-cli-apikey`} className="text-sm font-normal cursor-pointer">
                                API Key
                              </Label>
                            </div>
                          </div>
                          {!form.useOAuth && (
                            <div className="mt-2">
                              <Input
                                type="password"
                                placeholder="OPENAI_API_KEY"
                                value={form.apiKey}
                                onChange={(e) => setForm(serviceType, { apiKey: e.target.value })}
                              />
                            </div>
                          )}
                          {form.useOAuth && (
                            <div className="mt-2 space-y-2">
                              <p className="text-xs text-muted-foreground">
                                <strong>Step 1:</strong> Run this command in your terminal to log in:
                              </p>
                              <div className="bg-muted p-2 rounded text-xs font-mono">
                                codex
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This will open a browser where you can select "Sign in with ChatGPT" and log in with your OpenAI account 
                                (free, Plus, Pro, Business, or Enterprise). After authentication, return here and click "Test Connection" to verify.
                              </p>
                            </div>
                          )}
                          {!form.useOAuth && (
                            <p className="text-xs text-muted-foreground">
                              Enter your OpenAI API key or run <code className="bg-muted px-1 rounded">codex login --with-api-key</code> in terminal
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {form.provider === 'google_search' && (
                  <>
                    <ModelSelector
                      providerId={form.provider}
                      value={form.model}
                      onChange={(model) => setForm(serviceType, { model })}
                      label="Model (Optional)"
                      required={false}
                      placeholder="Not required for Google Search"
                    />
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
                <div className="flex gap-2">
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[Button] Add Provider clicked', { serviceType, cfg });
                      addProviderInstance(serviceType, cfg).catch((error) => {
                        console.error('[Button] Add Provider error:', error);
                        toast.error(`Failed: ${error?.message || 'Unknown error'}`);
                      });
                    }} 
                    className="flex-1"
                    type="button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Provider
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const testForm = getForm(serviceType);
                        console.log('[TestConnection] Form state:', testForm);
                        
                        // Validation: provider is always required
                        if (!testForm.provider) {
                          toast.error('Please select a provider type');
                          return;
                        }
                        
                        // Base URL is optional for CLI mode
                        const isCLIMode = (testForm.provider === 'google' || testForm.provider === 'openai') && testForm.useCLI;
                        const effectiveBaseUrl = testForm.baseUrl || (!isCLIMode ? getDefaultBaseUrl(testForm.provider) : undefined);
                        
                        if (!isCLIMode && !effectiveBaseUrl) {
                          toast.error('Please fill in endpoint URL');
                          return;
                        }
                        
                        // For CLI mode with OAuth, API key is not required
                        if (testForm.useCLI && (testForm.useOAuth || testForm.useGCloudADC)) {
                          // OAuth mode - no API key needed, but model is required for LLM providers
                          if (!testForm.model && testForm.provider !== 'google_search' && !isWebSearchProvider(testForm.provider)) {
                            toast.error('Model is required');
                            return;
                          }
                        } else if (testForm.provider === 'google' && testForm.useVertexAI) {
                          // Vertex AI mode - no API key needed
                          if (!testForm.googleProject) {
                            toast.error('GCP Project ID is required for Vertex AI mode');
                            return;
                          }
                        } else if (testForm.provider === 'google' && testForm.useCLI) {
                          // CLI mode without OAuth - API key required
                          if (!testForm.apiKey) {
                            toast.error('API Key is required for CLI mode without OAuth');
                            return;
                          }
                          if (!testForm.model) {
                            toast.error('Model is required');
                            return;
                          }
                        } else {
                          // Standard API mode - API key required
                          if (!testForm.apiKey) {
                            toast.error('API Key is required for API mode');
                            return;
                          }
                          if (!testForm.model && testForm.provider !== 'google_search' && !isWebSearchProvider(testForm.provider)) {
                            toast.error('Model is required');
                            return;
                          }
                        }
                        const testConfig: unknown = {
                          provider: testForm.provider,
                          baseUrl: effectiveBaseUrl || undefined,
                          apiKey: testForm.apiKey || undefined,
                          model: testForm.model || undefined,
                        };
                        
                        console.log('[TestConnection] Test config:', testConfig);
                        
                        // Include CLI configuration if CLI mode is enabled
                        if (testForm.useCLI) {
                          testConfig.useCLI = true;
                          testConfig.cliCommand = testForm.cliCommand || (testForm.provider === 'google' ? 'gemini' : testForm.provider === 'openai' ? 'codex' : '');
                          testConfig.cliArgs = testForm.cliArgs ? testForm.cliArgs.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined;
                          testConfig.useOAuth = testForm.useOAuth || false;
                          testConfig.useGCloudADC = testForm.useGCloudADC || false;
                          testConfig.cliWorkingDirectory = testForm.cliWorkingDirectory || undefined;
                          if (testForm.useGCloudADC && testForm.provider === 'google') {
                            testConfig.googleProject = testForm.googleProject;
                            testConfig.googleLocation = testForm.googleLocation;
                          }
                        }
                        
                        // Include Google-specific config
                        if (testForm.provider === 'google') {
                          testConfig.useVertexAI = testForm.useVertexAI || false;
                          testConfig.googleProject = testForm.googleProject || undefined;
                          testConfig.googleLocation = testForm.googleLocation || undefined;
                          testConfig.googleApiVersion = testForm.googleApiVersion || undefined;
                        }
                        
                        // Include Google Search config
                        if (testForm.provider === 'google_search') {
                          testConfig.googleSearchEngineId = testForm.googleSearchEngineId;
                        }
                        
                        console.log('[TestConnection] Sending request to:', `/api/v1/ai/config/${serviceType}/test`);
                        const res = await fetch(`/api/v1/ai/config/${serviceType}/test`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ config: testConfig }),
                        });
                        
                        console.log('[TestConnection] Response status:', res.status);
                        // Robust JSON parsing that handles empty responses
                        const text = await res.text();
                        let responseData: any = {};
                        try {
                          responseData = text ? JSON.parse(text) : {};
                        } catch (parseError) {
                          console.error('[TestConnection] JSON parse error:', parseError);
                          responseData = { success: false, error: 'Invalid response from server' };
                        }

                        const responseData = await res.json().catch((err) => {
                          console.error('[TestConnection] JSON parse error:', err);
                          return { success: false, error: 'Invalid response from server' };
                        });
                        console.log('[TestConnection] Response data:', responseData);
                        
                        if (!res.ok || !responseData.success) {
                          const errorText = responseData.error || responseData.message || responseData.details?.connectivity || 'Connection test failed';
                          console.error('[TestConnection] Test failed:', errorText);
                          toast.error(`Connection test failed: ${errorText}`);
                          return;
                        }
                        
                        const message = responseData.data?.message || responseData.message || 'Connection test successful';
                        console.log('[TestConnection] Test successful:', message);
                        toast.success(message);
                      } catch (e: unknown) {
                        console.error('[TestConnection] Unexpected error:', e);
                        const errorMsg = e instanceof Error ? e.message : 'Connection test failed';
                        toast.error(`Connection test error: ${errorMsg}`);
                      }
                    }}
                    type="button"
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
                            <div className={`grid grid-cols-4 gap-4 ${['google_search', 'google'].includes(editForm?.provider || '') ? 'md:grid-cols-5' : ''}`}>
                              <div className="space-y-2">
                                <Label>Provider Type</Label>
                                <Select
                                  value={editForm?.provider}
                                  onValueChange={(v) => setEditForm(prev => prev ? { ...prev, provider: v as ProviderKey, baseUrl: getDefaultBaseUrl(v as ProviderKey) } : null)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {/* LLM Providers */}
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                    <SelectItem value="google">Google Gemini</SelectItem>
                                    <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                    <SelectItem value="kilocode">KiloCode</SelectItem>
                                    {/* Web Search Providers */}
                                    <SelectItem value="serper">Serper (Google Search API)</SelectItem>
                                    <SelectItem value="tavily">Tavily (AI Search)</SelectItem>
                                    <SelectItem value="google_search">Google Custom Search</SelectItem>
                                    <SelectItem value="brave">Brave Search</SelectItem>
                                    <SelectItem value="exa">Exa (Semantic Search)</SelectItem>
                                    {/* Web Scraping */}
                                    <SelectItem value="firecrawl">Firecrawl (Web Scraping)</SelectItem>
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
                              {!isWebSearchProvider(editForm?.provider || 'openai') && (
                                <ModelSelector
                                  providerId={editForm?.provider || 'openai'}
                                  value={editForm?.model || ''}
                                  onChange={(model) => setEditForm(prev => prev ? { ...prev, model } : null)}
                                  label="Model"
                                  required={!isWebSearchProvider(editForm?.provider || '')}
                                  placeholder="Select or type a model"
                                />
                              )}
                              {isWebSearchProvider(editForm?.provider || '') && editForm?.provider !== 'google_search' && (
                                <ModelSelector
                                  providerId={editForm?.provider || ''}
                                  value={editForm?.model || ''}
                                  onChange={(model) => setEditForm(prev => prev ? { ...prev, model } : null)}
                                  label="Model (Optional)"
                                  required={false}
                                  placeholder="Not required for web search"
                                />
                              )}
                              {editForm?.provider === 'google_search' && (
                                <>
                                  <ModelSelector
                                    providerId={editForm?.provider}
                                    value={editForm?.model || ''}
                                    onChange={(model) => setEditForm(prev => prev ? { ...prev, model } : null)}
                                    label="Model (Optional)"
                                    required={false}
                                    placeholder="Not required for Google Search"
                                  />
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
                            {/* Google Gemini Advanced Configuration in Edit Mode */}
                            {editForm?.provider === 'google' && (
                              <div className="border-t pt-4 space-y-4">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-${inst.id}-use-vertex-ai`}
                                    checked={editForm.useVertexAI || false}
                                    onCheckedChange={(checked) => setEditForm(prev => prev ? { ...prev, useVertexAI: checked as boolean } : null)}
                                  />
                                  <Label htmlFor={`edit-${inst.id}-use-vertex-ai`} className="text-sm font-normal cursor-pointer">
                                    Use Vertex AI (GCP) instead of Developer API
                                  </Label>
                                </div>
                                {editForm.useVertexAI ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>GCP Project ID *</Label>
                                      <Input
                                        placeholder="my-gcp-project"
                                        value={editForm.googleProject || ''}
                                        onChange={(e) => setEditForm(prev => prev ? { ...prev, googleProject: e.target.value } : null)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>GCP Location</Label>
                                      <Input
                                        placeholder="us-central1"
                                        value={editForm.googleLocation || 'us-central1'}
                                        onChange={(e) => setEditForm(prev => prev ? { ...prev, googleLocation: e.target.value } : null)}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>
                                        API Key
                                        {!(editForm.useCLI && (editForm.useOAuth || editForm.useGCloudADC)) && ' *'}
                                      </Label>
                                      <Input
                                        type="password"
                                        placeholder={editForm.useCLI && editForm.useOAuth ? "Optional - not needed for OAuth" : "GEMINI_API_KEY or GOOGLE_API_KEY"}
                                        value={editForm.apiKey || ''}
                                        onChange={(e) => setEditForm(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>API Version</Label>
                                      <Select
                                        value={editForm.googleApiVersion || 'v1'}
                                        onValueChange={(v) => setEditForm(prev => prev ? { ...prev, googleApiVersion: v as 'v1' | 'v1alpha' } : null)}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="v1">v1 (Stable)</SelectItem>
                                          <SelectItem value="v1alpha">v1alpha (Preview)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                                {/* CLI Mode Configuration in Edit Mode */}
                                <div className="border-t pt-4 mt-4 space-y-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-${inst.id}-use-cli`}
                                      checked={editForm.useCLI || false}
                                      onCheckedChange={(checked) => {
                                        const updates: unknown = { useCLI: checked as boolean };
                                        if (checked) {
                                          updates.cliCommand = 'gemini';
                                          updates.useOAuth = false;
                                          updates.useGCloudADC = false;
                                        }
                                        setEditForm(prev => prev ? { ...prev, ...updates } : null);
                                      }}
                                    />
                                    <Label htmlFor={`edit-${inst.id}-use-cli`} className="text-sm font-normal cursor-pointer">
                                      Use CLI Mode (OAuth supports free & paid accounts)
                                    </Label>
                                    {cliAvailability?.google && (
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        cliAvailability.google.available 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {cliAvailability.google.available 
                                          ? `✓ CLI Available (v${cliAvailability.google.version || '?'})` 
                                          : 'CLI Not Installed'}
                                      </span>
                                    )}
                                  </div>
                                  {editForm.useCLI && (
                                    <div className="space-y-4 pl-6 border-l-2">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>CLI Command</Label>
                                          <Input
                                            placeholder="gemini"
                                            value={editForm.cliCommand || 'gemini'}
                                            onChange={(e) => setEditForm(prev => prev ? { ...prev, cliCommand: e.target.value } : null)}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Working Directory (Optional)</Label>
                                          <Input
                                            placeholder="/path/to/project"
                                            value={editForm.cliWorkingDirectory || ''}
                                            onChange={(e) => setEditForm(prev => prev ? { ...prev, cliWorkingDirectory: e.target.value } : null)}
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>CLI Arguments (Optional, comma-separated)</Label>
                                        <Input
                                          placeholder="--verbose, --output json"
                                          value={editForm.cliArgs || ''}
                                          onChange={(e) => setEditForm(prev => prev ? { ...prev, cliArgs: e.target.value } : null)}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">Authentication Method *</Label>
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="radio"
                                              id={`edit-${inst.id}-cli-oauth`}
                                              name={`edit-${inst.id}-cli-auth`}
                                              checked={editForm.useOAuth === true}
                                              onChange={() => setEditForm(prev => prev ? { ...prev, useOAuth: true, useGCloudADC: false } : null)}
                                              className="w-4 h-4"
                                            />
                                            <Label htmlFor={`edit-${inst.id}-cli-oauth`} className="text-sm font-normal cursor-pointer">
                                              OAuth (Google Account) - Works with free or paid accounts
                                            </Label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="radio"
                                              id={`edit-${inst.id}-cli-gcloud`}
                                              name={`edit-${inst.id}-cli-auth`}
                                              checked={editForm.useGCloudADC === true}
                                              onChange={() => setEditForm(prev => prev ? { ...prev, useGCloudADC: true, useOAuth: false } : null)}
                                              className="w-4 h-4"
                                            />
                                            <Label htmlFor={`edit-${inst.id}-cli-gcloud`} className="text-sm font-normal cursor-pointer">
                                              gcloud ADC (GCP Project)
                                            </Label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="radio"
                                              id={`edit-${inst.id}-cli-apikey`}
                                              name={`edit-${inst.id}-cli-auth`}
                                              checked={!editForm.useOAuth && !editForm.useGCloudADC}
                                              onChange={() => setEditForm(prev => prev ? { ...prev, useOAuth: false, useGCloudADC: false } : null)}
                                              className="w-4 h-4"
                                            />
                                            <Label htmlFor={`edit-${inst.id}-cli-apikey`} className="text-sm font-normal cursor-pointer">
                                              API Key
                                            </Label>
                                          </div>
                                        </div>
                                        {!editForm.useOAuth && !editForm.useGCloudADC && (
                                          <div className="mt-2">
                                            <Input
                                              type="password"
                                              placeholder="GEMINI_API_KEY or GOOGLE_API_KEY"
                                              value={editForm.apiKey || ''}
                                              onChange={(e) => setEditForm(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                                            />
                                          </div>
                                        )}
                                        {editForm.useGCloudADC && (
                                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                              placeholder="GCP Project ID"
                                              value={editForm.googleProject || ''}
                                              onChange={(e) => setEditForm(prev => prev ? { ...prev, googleProject: e.target.value } : null)}
                                            />
                                            <Input
                                              placeholder="Location (default: us-central1)"
                                              value={editForm.googleLocation || 'us-central1'}
                                              onChange={(e) => setEditForm(prev => prev ? { ...prev, googleLocation: e.target.value } : null)}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* OpenAI Codex CLI Configuration in Edit Mode */}
                            {editForm?.provider === 'openai' && (
                              <div className="border-t pt-4 space-y-4">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-${inst.id}-openai-use-cli`}
                                    checked={editForm.useCLI || false}
                                    onCheckedChange={(checked) => {
                                      const updates: unknown = { useCLI: checked as boolean };
                                      if (checked) {
                                        updates.cliCommand = 'codex';
                                        updates.useOAuth = false;
                                      }
                                      setEditForm(prev => prev ? { ...prev, ...updates } : null);
                                    }}
                                  />
                                  <Label htmlFor={`edit-${inst.id}-openai-use-cli`} className="text-sm font-normal cursor-pointer">
                                    Use CLI Mode (Codex CLI)
                                  </Label>
                                  {cliAvailability?.openai && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      cliAvailability.openai.available 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {cliAvailability.openai.available 
                                        ? `✓ CLI Available (v${cliAvailability.openai.version || '?'})` 
                                        : 'CLI Not Installed'}
                                    </span>
                                  )}
                                </div>
                                {editForm.useCLI && (
                                  <div className="space-y-4 pl-6 border-l-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>CLI Command</Label>
                                        <Input
                                          placeholder="codex"
                                          value={editForm.cliCommand || 'codex'}
                                          onChange={(e) => setEditForm(prev => prev ? { ...prev, cliCommand: e.target.value } : null)}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Working Directory (Optional)</Label>
                                        <Input
                                          placeholder="/path/to/project"
                                          value={editForm.cliWorkingDirectory || ''}
                                          onChange={(e) => setEditForm(prev => prev ? { ...prev, cliWorkingDirectory: e.target.value } : null)}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>CLI Arguments (Optional, comma-separated)</Label>
                                      <Input
                                        placeholder="--verbose, --output json"
                                        value={editForm.cliArgs || ''}
                                        onChange={(e) => setEditForm(prev => prev ? { ...prev, cliArgs: e.target.value } : null)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Authentication Method *</Label>
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="radio"
                                            id={`edit-${inst.id}-openai-cli-oauth`}
                                            name={`edit-${inst.id}-openai-cli-auth`}
                                            checked={editForm.useOAuth === true}
                                            onChange={() => setEditForm(prev => prev ? { ...prev, useOAuth: true } : null)}
                                            className="w-4 h-4"
                                          />
                                            <Label htmlFor={`edit-${inst.id}-openai-cli-oauth`} className="text-sm font-normal cursor-pointer">
                                              ChatGPT Account (OAuth) - Works with free, Plus, Pro, Business, or Enterprise accounts
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="radio"
                                            id={`edit-${inst.id}-openai-cli-apikey`}
                                            name={`edit-${inst.id}-openai-cli-auth`}
                                            checked={editForm.useOAuth === false}
                                            onChange={() => setEditForm(prev => prev ? { ...prev, useOAuth: false } : null)}
                                            className="w-4 h-4"
                                          />
                                          <Label htmlFor={`edit-${inst.id}-openai-cli-apikey`} className="text-sm font-normal cursor-pointer">
                                            API Key
                                          </Label>
                                        </div>
                                      </div>
                                      {!editForm.useOAuth && (
                                        <div className="mt-2">
                                          <Input
                                            type="password"
                                            placeholder="OPENAI_API_KEY"
                                            value={editForm.apiKey || ''}
                                            onChange={(e) => setEditForm(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                                          />
                                        </div>
                                      )}
                                      {editForm.useOAuth && (
                                        <div className="mt-2 space-y-2">
                                          <p className="text-xs text-muted-foreground">
                                            <strong>To authenticate:</strong> Run <code className="bg-muted px-1 rounded">codex</code> in terminal and select "Sign in with ChatGPT" to log in with your OpenAI account (free, Plus, Pro, Business, or Enterprise).
                                          </p>
                                        </div>
                                      )}
                                      {!editForm.useOAuth && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Enter your OpenAI API key or run <code className="bg-muted px-1 rounded">codex login --with-api-key</code> in terminal
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
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

                              <div className={`flex-1 grid gap-4 text-sm ${['google_search', 'google'].includes(inst.provider) ? 'grid-cols-5' : 'grid-cols-4'}`}>
                                <div>
                                  <div className="font-medium">{inst.provider.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                                </div>
                                <div className="truncate" title={inst.baseUrl}>
                                  <span className="text-muted-foreground">URL:</span> {inst.baseUrl}
                                </div>
                                <div className="truncate">
                                  <span className="text-muted-foreground">Key:</span> {inst.apiKey ? `${inst.apiKey.substring(0, 10)}...` : 'N/A'}
                                </div>
                                {inst.useCLI && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                      ⚡ CLI Mode
                                      {inst.useOAuth && ' (OAuth)'}
                                      {inst.useGCloudADC && ' (gcloud ADC)'}
                                    </span>
                                    {cliAvailability && (
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        (inst.provider === 'google' && cliAvailability.google?.available) ||
                                        (inst.provider === 'openai' && cliAvailability.openai?.available)
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {(inst.provider === 'google' && cliAvailability.google?.available) ||
                                        (inst.provider === 'openai' && cliAvailability.openai?.available)
                                          ? '✓ CLI Installed' 
                                          : 'CLI Not Installed'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="truncate" title={inst.model}>
                                  <span className="text-muted-foreground">Model:</span> {inst.model || 'N/A'}
                                </div>
                                {inst.provider === 'google_search' && inst.googleSearchEngineId && (
                                  <div className="truncate" title={inst.googleSearchEngineId}>
                                    <span className="text-muted-foreground">Engine ID:</span> {inst.googleSearchEngineId}
                                  </div>
                                )}
                                {inst.provider === 'google' && inst.useVertexAI && (
                                  <div className="truncate" title={inst.googleProject}>
                                    <span className="text-muted-foreground">Project:</span> {inst.googleProject || 'N/A'}
                                  </div>
                                )}
                              </div>
                              {inst.provider === 'google' && inst.useVertexAI && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Vertex AI Mode • Location: {inst.googleLocation || 'us-central1'}
                                </div>
                              )}
                              
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

