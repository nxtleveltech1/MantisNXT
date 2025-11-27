"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Trash2, Plus, Star, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { ModelSelector } from './ModelSelector';

type ProviderKey = 'openai' | 'anthropic' | 'openai_compatible' | 'google' | 'serper' | 'tavily' | 'google_search' | 'firecrawl' | 'brave' | 'exa' | 'openrouter' | 'kilocode';

interface AIServiceRow {
  id: string;
  service_key: string;
  service_label: string;
  is_enabled: boolean;
}

interface ServiceConfigRecord {
  id: string;
  enabled: boolean;
  config: unknown;
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

function useServices() {
  return useQuery<AIServiceRow[]>({
    queryKey: ['ai-services'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ai/services');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.data || [];
    },
  });
}

export default function CustomServicesPanel() {
  const queryClient = useQueryClient();
  const { data: services = [] } = useServices();
  const [configs, setConfigs] = useState<Record<string, ServiceConfigRecord | null>>({});
  
  // CLI availability state
  const { data: cliAvailability, refetch: refetchCLIAvailability, isFetching: isFetchingCLI } = useQuery<Record<string, { available: boolean; version?: string; installationHint?: string }>>({
    queryKey: ['ai-cli-availability'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/ai/cli/availability');
        if (!res.ok) {
          const errorText = await res.text();
          // Return empty object on error, but don't throw - let UI show "unknown" state
          return {};
        }
        const data = await res.json();
        return data.data || {};
      } catch (error) {
        console.error('[CustomServicesPanel] CLI availability check error:', error);
        return {};
      }
    },
    refetchInterval: 60000, // Check every minute
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
  
  // Form state for adding a new provider instance per service
  const [newProviderForms, setNewProviderForms] = useState<Record<string, {
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
  }>>({});

  // Edit mode state
  const [editingInstance, setEditingInstance] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
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

  useEffect(() => {
    (async () => {
      for (const s of services) {
        if (configs[s.id] !== undefined) continue;
        try {
          const res = await fetch(`/api/v1/ai/services/${s.id}/config`);
          const data = await res.json().catch(() => ({}));
          setConfigs(prev => ({ ...prev, [s.id]: data?.data || { id: '', enabled: s.is_enabled, config: {} } }));
        } catch {
          setConfigs(prev => ({ ...prev, [s.id]: { id: '', enabled: s.is_enabled, config: {} } }));
        }
      }
    })();
  }, [configs, services]);

  const updateConfig = useMutation({
    mutationFn: async ({ serviceId, payload }: { serviceId: string; payload: unknown }) => {
      try {
        const res = await fetch(`/api/v1/ai/services/${serviceId}/config`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[CustomServicesPanel] Mutation error response:', errorText);
          let errorMessage = 'Failed to save provider';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.message || errorText;
          } catch {
            errorMessage = errorText || 'Failed to save provider';
          }
          throw new Error(errorMessage);
        }
        const result = await res.json();
        return result;
      } catch (error) {
        console.error('[CustomServicesPanel] Mutation exception:', error);
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success('Provider saved');
      queryClient.invalidateQueries({ queryKey: ['ai-services'] });
      setTimeout(() => {
        void fetch(`/api/v1/ai/services/${vars.serviceId}/config`).then(r => r.json()).then(d => {
          setConfigs(prev => ({ ...prev, [vars.serviceId]: d?.data }));
        }).catch(() => {});
      }, 100);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : String(e) || 'Failed to save provider';
      console.error('Failed to save provider:', e);
      toast.error(message);
    },
  });

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

  const getForm = (serviceId: string) => {
    return newProviderForms[serviceId] || {
      provider: 'openai' as ProviderKey,
      baseUrl: '',
      apiKey: '',
      model: '',
      googleSearchEngineId: '',
      useVertexAI: false,
      googleProject: '',
      googleLocation: 'us-central1',
      googleApiVersion: 'v1' as 'v1' | 'v1alpha',
      // CLI options
      useCLI: false,
      cliCommand: '',
      cliArgs: '',
      useOAuth: false,
      useGCloudADC: false,
      cliWorkingDirectory: '',
    };
  };

  const setForm = (serviceId: string, updates: Partial<typeof newProviderForms[string]>) => {
    setNewProviderForms(prev => {
      const current = getForm(serviceId);
      const newForm = { ...current, ...updates };
      
      // Auto-fill baseUrl when provider changes if it's empty
      if (updates.provider && !newForm.baseUrl) {
        newForm.baseUrl = getDefaultBaseUrl(updates.provider);
      }
      
      return {
        ...prev,
        [serviceId]: newForm,
      };
    });
  };

  const addProviderInstance = (serviceId: string) => {
    try {
      console.log('[CustomServicesPanel] addProviderInstance called', serviceId);
      const form = getForm(serviceId);
      console.log('[CustomServicesPanel] Form state:', form);
      
      let isWebSearch = false;
      try {
        isWebSearch = isWebSearchProvider(form.provider);
        console.log('[CustomServicesPanel] isWebSearch:', isWebSearch);
      } catch (error) {
        console.error('[CustomServicesPanel] Error in isWebSearchProvider:', error);
        throw error;
      }
      
      // Validation: provider is always required
      if (!form.provider) {
        console.warn('[CustomServicesPanel] Validation failed: no provider');
        toast.error('Please select a provider type');
        return;
      }
      console.log('[CustomServicesPanel] Provider check passed:', form.provider);

      // Base URL is optional for CLI mode, but ensure it has a default for API mode
      const isCLIMode = (form.provider === 'google' || form.provider === 'openai') && form.useCLI;
      const effectiveBaseUrl = form.baseUrl || (!isCLIMode ? getDefaultBaseUrl(form.provider) : undefined);
      
      console.log('[CustomServicesPanel] Validation check:', { isCLIMode, effectiveBaseUrl, baseUrl: form.baseUrl, useCLI: form.useCLI });
      
      if (!isCLIMode && !effectiveBaseUrl) {
        console.warn('[CustomServicesPanel] Validation failed: no baseUrl and not CLI mode');
        toast.error('Please fill in endpoint URL');
        return;
      }
      console.log('[CustomServicesPanel] BaseUrl check passed');

      // Google Gemini validation
      if (form.provider === 'google') {
        console.log('[CustomServicesPanel] Google provider validation starting');
        if (form.useCLI) {
          console.log('[CustomServicesPanel] Google CLI mode detected');
          // Ensure OAuth is defaulted to true if not explicitly set
          const effectiveUseOAuth = form.useOAuth !== undefined ? form.useOAuth : true;
          console.log('[CustomServicesPanel] OAuth check:', { effectiveUseOAuth, useOAuth: form.useOAuth, useGCloudADC: form.useGCloudADC, apiKey: form.apiKey?.trim() });
          // CLI mode validation - allow OAuth or gcloud ADC without API key
          if (!effectiveUseOAuth && !form.useGCloudADC && !form.apiKey?.trim()) {
            console.warn('[CustomServicesPanel] Validation failed: CLI mode requires OAuth/gcloud ADC or API key');
            toast.error('Select OAuth/gcloud ADC or provide an API key for CLI mode');
            return;
          }
          console.log('[CustomServicesPanel] OAuth/API key check passed');
          if (form.useGCloudADC && !form.googleProject?.trim()) {
            console.warn('[CustomServicesPanel] Validation failed: GCP Project ID required for gcloud ADC');
            toast.error('GCP Project ID is required for gcloud ADC mode');
            return;
          }
          console.log('[CustomServicesPanel] GCP Project check passed');
          // Model is optional for CLI mode with OAuth - can be set later
          // Only require model if using API key mode
          if (!effectiveUseOAuth && !form.useGCloudADC && !form.model?.trim()) {
            console.warn('[CustomServicesPanel] Validation failed: Model required for API key CLI mode');
            toast.error('Model is required when using API key for CLI mode');
            return;
          }
          console.log('[CustomServicesPanel] Model check passed for CLI mode');
      } else if (form.useVertexAI) {
        if (!form.googleProject) {
          toast.error('GCP Project ID is required for Vertex AI mode');
          return;
        }
      } else {
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
      // OpenAI CLI mode validation - OAuth doesn't require API key or model
      if (!form.useOAuth && !form.apiKey) {
        toast.error('API Key or OAuth is required for CLI mode');
        return;
      }
      // Model is optional for OAuth CLI mode
    } else {
      if (!form.apiKey) {
        console.warn('[CustomServicesPanel] Validation failed: no apiKey for provider', form.provider);
        toast.error('API Key is required');
        return;
      }
      if (!isWebSearch && !form.model) {
        console.warn('[CustomServicesPanel] Validation failed: no model for provider', form.provider, 'isWebSearch:', isWebSearch);
        toast.error('Model is required for LLM providers');
        return;
      }
    }
    
    // Google Search requires engine ID
    if (form.provider === 'google_search' && !form.googleSearchEngineId) {
      console.warn('[CustomServicesPanel] Validation failed: no googleSearchEngineId');
      toast.error('Google Search Engine ID is required for Google Search provider');
      return;
    }
    
    console.log('[CustomServicesPanel] All validation passed, proceeding to create instance');

    const record = configs[serviceId];
    const cfg = record?.config || {};
    const instances: ProviderInstance[] = cfg.providerInstances || [];
    
    // For Google Gemini CLI mode, default OAuth to true if not explicitly set
    const effectiveUseOAuth = form.provider === 'google' && form.useCLI && form.useOAuth === undefined 
      ? true 
      : (form.useOAuth === true);
    
    // Set default model for Google Gemini if not provided
    let defaultModel = form.model?.trim();
    if (form.provider === 'google' && !defaultModel) {
      defaultModel = 'gemini-3-pro-preview'; // Default to latest model
    }
    
    const newInstance: ProviderInstance = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: form.provider,
      baseUrl: effectiveBaseUrl || undefined,
      apiKey: form.apiKey?.trim() || undefined, // Optional for Vertex AI mode or OAuth CLI mode
      model: defaultModel || undefined, // Optional for web search, default for Google
      enabled: true,
      ...(form.provider === 'google_search' && form.googleSearchEngineId
        ? { googleSearchEngineId: form.googleSearchEngineId.trim() }
        : {}),
      ...(form.provider === 'google' ? {
        useVertexAI: form.useVertexAI || false,
        googleProject: form.googleProject?.trim() || undefined,
        googleLocation: form.googleLocation?.trim() || 'us-central1',
        googleApiVersion: form.googleApiVersion || 'v1',
      } : {}),
      // CLI options
      ...((form.useCLI && (form.provider === 'google' || form.provider === 'openai')) ? {
        useCLI: true,
        cliCommand: form.cliCommand?.trim() || (form.provider === 'google' ? 'gemini' : 'codex'),
        cliArgs: form.cliArgs?.trim() ? form.cliArgs.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        useOAuth: effectiveUseOAuth, // Use effective OAuth value
        useGCloudADC: form.useGCloudADC === true, // Explicitly set to boolean
        cliWorkingDirectory: form.cliWorkingDirectory?.trim() || undefined,
      } : {}),
    };

    const updatedInstances = [...instances, newInstance];
    const activeId = cfg.activeProviderInstanceId || newInstance.id;

    const payload = {
      config: {
        ...cfg,
        providerInstances: updatedInstances,
        activeProviderInstanceId: activeId,
      },
      enabled: record?.enabled ?? true,
    };

    console.log('[CustomServicesPanel] Calling updateConfig.mutate', { serviceId, payload });
    updateConfig.mutate(
      {
        serviceId,
        payload,
      },
      {
        onSuccess: () => {
          console.log('[CustomServicesPanel] Mutation succeeded');
          toast.success('Provider added successfully');
        },
        onError: (error) => {
          console.error('[CustomServicesPanel] Add provider mutation error:', error);
          toast.error(`Failed to add provider: ${error instanceof Error ? error.message : String(error)}`);
        },
      }
    );

    // Reset form
    setNewProviderForms(prev => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
    } catch (error) {
      console.error('[CustomServicesPanel] addProviderInstance exception:', error);
      toast.error(`Failed to add provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const deleteProviderInstance = (serviceId: string, instanceId: string) => {
    const record = configs[serviceId];
    const cfg = record?.config || {};
    const instances: ProviderInstance[] = cfg.providerInstances || [];
    const updatedInstances = instances.filter(i => i.id !== instanceId);
    
    let activeId = cfg.activeProviderInstanceId;
    if (activeId === instanceId) {
      activeId = updatedInstances.length > 0 ? updatedInstances[0].id : null;
    }

    updateConfig.mutate({
      serviceId,
      payload: {
        config: {
          ...cfg,
          providerInstances: updatedInstances,
          activeProviderInstanceId: activeId,
        },
      },
    });
  };

  const startEditingInstance = (serviceId: string, instance: ProviderInstance) => {
    setEditingInstance(instance.id);
    setEditingServiceId(serviceId);
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

  const saveEditedInstance = (serviceId: string, instanceId: string) => {
    if (!editForm) return;

    const record = configs[serviceId];
    const cfg = record?.config || {};
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
      serviceId,
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

  const testInstanceConnection = async (serviceId: string, instance: ProviderInstance) => {
    try {
      const testConfig: unknown = {
        provider: instance.provider,
        baseUrl: instance.baseUrl || getDefaultBaseUrl(instance.provider),
        apiKey: instance.apiKey,
        model: instance.model,
      };
      
      // Include CLI configuration if CLI mode is enabled
      if (instance.useCLI) {
        testConfig.useCLI = true;
        testConfig.cliCommand = instance.cliCommand;
        testConfig.cliArgs = instance.cliArgs;
        testConfig.useOAuth = instance.useOAuth;
        testConfig.useGCloudADC = instance.useGCloudADC;
        testConfig.cliWorkingDirectory = instance.cliWorkingDirectory;
        if (instance.useGCloudADC && instance.provider === 'google') {
          testConfig.googleProject = instance.googleProject;
          testConfig.googleLocation = instance.googleLocation;
        }
      } else if (instance.provider === 'google') {
        // For non-CLI Google, ensure baseUrl is set and include Google-specific config
        if (!testConfig.baseUrl) {
          testConfig.baseUrl = getDefaultBaseUrl(instance.provider);
        }
        if (instance.useVertexAI) {
          testConfig.useVertexAI = instance.useVertexAI;
          testConfig.googleProject = instance.googleProject;
          testConfig.googleLocation = instance.googleLocation;
          testConfig.googleApiVersion = instance.googleApiVersion;
        }
      }
      
      const res = await fetch(`/api/v1/ai/config/assistant/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: testConfig }),
      });
      
      const record = configs[serviceId];
      const cfg = record?.config || {};
      const instances: ProviderInstance[] = cfg.providerInstances || [];
      const updatedInstances = instances.map(i => 
        i.id === instance.id ? { ...i, connected: res.ok } : i
      );

      // Update local state immediately
      setConfigs(prev => ({
        ...prev,
        [serviceId]: {
          ...record,
          config: {
            ...cfg,
            providerInstances: updatedInstances,
          },
        },
      }));

      if (!res.ok) throw new Error(await res.text());
      toast.success('Connection successful');
    } catch (e: unknown) {
      const record = configs[serviceId];
      const cfg = record?.config || {};
      const instances: ProviderInstance[] = cfg.providerInstances || [];
      const updatedInstances = instances.map(i => 
        i.id === instance.id ? { ...i, connected: false } : i
      );

      setConfigs(prev => ({
        ...prev,
        [serviceId]: {
          ...record,
          config: {
            ...cfg,
            providerInstances: updatedInstances,
          },
        },
      }));
      toast.error(e?.message || 'Connection failed');
    }
  };

  const toggleProviderInstance = (serviceId: string, instanceId: string, enabled: boolean) => {
    const record = configs[serviceId];
    const cfg = record?.config || {};
    const instances: ProviderInstance[] = cfg.providerInstances || [];
    const updatedInstances = instances.map(i => i.id === instanceId ? { ...i, enabled } : i);

    updateConfig.mutate({
      serviceId,
      payload: {
        config: {
          ...cfg,
          providerInstances: updatedInstances,
        },
      },
    });
  };

  const setActiveProvider = (serviceId: string, instanceId: string) => {
    const record = configs[serviceId];
    const cfg = record?.config || {};

    updateConfig.mutate({
      serviceId,
      payload: {
        config: {
          ...cfg,
          activeProviderInstanceId: instanceId,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {services.length === 0 ? null : (
        <div className="text-sm text-muted-foreground">Custom AI Services</div>
      )}
      {services.map((s) => {
        const record = configs[s.id] || { id: '', enabled: s.is_enabled, config: {} };
        const cfg = record.config || {};
        const instances: ProviderInstance[] = cfg.providerInstances || [];
        const activeId = cfg.activeProviderInstanceId;
        const form = getForm(s.id);

        return (
          <Card key={s.id} className="border border-dashed">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{s.service_label}</CardTitle>
                  <CardDescription>Add multiple AI providers to this service</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${s.id}-enabled`} className="text-sm">{record.enabled ? 'Enabled' : 'Disabled'}</Label>
                  <Switch
                    id={`${s.id}-enabled`}
                    checked={!!record.enabled}
                    onCheckedChange={(checked) => updateConfig.mutate({ serviceId: s.id, payload: { enabled: checked } })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Provider Form */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium text-sm">Add New Provider</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Provider Type</Label>
                    <Select
                      value={form.provider}
                      onValueChange={(v) => {
                        const newProvider = v as ProviderKey;
                        setForm(s.id, { 
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
                        {/* Web Search Providers */}
                        <SelectItem value="serper">Serper (Google Search API)</SelectItem>
                        <SelectItem value="tavily">Tavily (AI Search)</SelectItem>
                        <SelectItem value="google_search">Google Custom Search</SelectItem>
                        <SelectItem value="brave">Brave Search</SelectItem>
                        <SelectItem value="exa">Exa (Semantic Search)</SelectItem>
                        {/* Web Scraping */}
                        <SelectItem value="firecrawl">Firecrawl (Web Scraping)</SelectItem>
                        {/* Multi-Provider */}
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                        <SelectItem value="kilocode">KiloCode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      placeholder={getDefaultBaseUrl(form.provider) || "https://api.example.com"}
                      value={form.baseUrl}
                      onChange={(e) => setForm(s.id, { baseUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={form.apiKey}
                      onChange={(e) => setForm(s.id, { apiKey: e.target.value })}
                    />
                  </div>
                  {!isWebSearchProvider(form.provider) && form.provider !== 'google' && (
                    <div className="space-y-2">
                      <ModelSelector
                        providerId={form.provider}
                        value={form.model}
                        onChange={(model) => setForm(s.id, { model })}
                        label="Model *"
                        required
                        placeholder="Select or type a model"
                      />
                    </div>
                  )}
                  {isWebSearchProvider(form.provider) && form.provider !== 'google_search' && (
                    <div className="space-y-2">
                      <Label>Model (Optional)</Label>
                      <Input
                        placeholder="Not required for web search"
                        value={form.model}
                        onChange={(e) => setForm(s.id, { model: e.target.value })}
                      />
                    </div>
                  )}
                  {form.provider === 'google' && (
                    <div className="space-y-2">
                      <Label>Model *</Label>
                      <Select
                        value={form.model || 'gemini-3-pro-preview'}
                        onValueChange={(v) => setForm(s.id, { model: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro Preview (Latest)</SelectItem>
                          <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</SelectItem>
                          <SelectItem value="gemini-1.5-pro-latest">Gemini 1.5 Pro Latest</SelectItem>
                          <SelectItem value="gemini-1.5-flash-latest">Gemini 1.5 Flash Latest</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                          <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro (v1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {form.provider === 'google_search' && (
                    <>
                      <div className="space-y-2">
                        <Label>Model (Optional)</Label>
                        <Input
                          placeholder="Not required for Google Search"
                          value={form.model}
                          onChange={(e) => setForm(s.id, { model: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Google Search Engine ID *</Label>
                        <Input
                          placeholder="..."
                          value={form.googleSearchEngineId || ''}
                          onChange={(e) => setForm(s.id, { googleSearchEngineId: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Google Gemini Advanced Configuration */}
                {form.provider === 'google' && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${s.id}-use-vertex-ai`}
                        checked={form.useVertexAI || false}
                        onChange={(e) => setForm(s.id, { useVertexAI: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor={`${s.id}-use-vertex-ai`} className="text-sm font-normal cursor-pointer">
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
                            onChange={(e) => setForm(s.id, { googleProject: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>GCP Location</Label>
                          <Input
                            placeholder="us-central1"
                            value={form.googleLocation || 'us-central1'}
                            onChange={(e) => setForm(s.id, { googleLocation: e.target.value })}
                          />
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
                            onChange={(e) => setForm(s.id, { apiKey: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>API Version</Label>
                          <Select
                            value={form.googleApiVersion || 'v1'}
                            onValueChange={(v) => setForm(s.id, { googleApiVersion: v as 'v1' | 'v1alpha' })}
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
                        <input
                          type="checkbox"
                          id={`${s.id}-use-cli`}
                          checked={form.useCLI || false}
                        onChange={(e) => {
                          const updates: Record<string, unknown> = { useCLI: e.target.checked };
                          if (e.target.checked) {
                            updates.cliCommand = 'gemini';
                            // Default to OAuth for CLI mode (works for free/paid) unless already chosen
                            if (form.useOAuth === undefined) updates.useOAuth = true;
                            if (form.useGCloudADC === undefined) updates.useGCloudADC = false;
                          }
                          setForm(s.id, updates);
                        }}
                          className="rounded"
                        />
                        <Label htmlFor={`${s.id}-use-cli`} className="text-sm font-normal cursor-pointer">
                          Use CLI Mode (OAuth supports free & paid accounts)
                        </Label>
                        {isFetchingCLI ? (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                            Checking...
                          </span>
                        ) : cliAvailability?.google ? (
                          <span className={`text-xs px-2 py-1 rounded ${
                            cliAvailability.google.available 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cliAvailability.google.available 
                              ? `✓ CLI Available (v${cliAvailability.google.version || '?'})` 
                              : 'CLI Not Installed'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                            Unknown
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refetchCLIAvailability()}
                          className="h-6 px-2 text-xs"
                          title="Refresh CLI availability"
                        >
                          ↻
                        </Button>
                      </div>
                      {form.useCLI && (
                        <div className="space-y-4 pl-6 border-l-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>CLI Command</Label>
                              <Input
                                placeholder="gemini"
                                value={form.cliCommand || 'gemini'}
                                onChange={(e) => setForm(s.id, { cliCommand: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Working Directory (Optional)</Label>
                              <Input
                                placeholder="/path/to/project"
                                value={form.cliWorkingDirectory || ''}
                                onChange={(e) => setForm(s.id, { cliWorkingDirectory: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>CLI Arguments (Optional, comma-separated)</Label>
                            <Input
                              placeholder="--verbose, --output json"
                              value={form.cliArgs || ''}
                              onChange={(e) => setForm(s.id, { cliArgs: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Authentication Method *</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${s.id}-cli-oauth`}
                                  name={`${s.id}-cli-auth`}
                                  checked={form.useOAuth === true}
                                  onChange={() => setForm(s.id, { useOAuth: true, useGCloudADC: false })}
                                  className="w-4 h-4"
                                />
                              <Label htmlFor={`${s.id}-cli-oauth`} className="text-sm font-normal cursor-pointer">
                                OAuth (Google Account) - Works with free or paid accounts
                              </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${s.id}-cli-gcloud`}
                                  name={`${s.id}-cli-auth`}
                                  checked={form.useGCloudADC === true}
                                  onChange={() => setForm(s.id, { useGCloudADC: true, useOAuth: false })}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${s.id}-cli-gcloud`} className="text-sm font-normal cursor-pointer">
                                  gcloud ADC (GCP Project)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${s.id}-cli-apikey`}
                                  name={`${s.id}-cli-auth`}
                                  checked={!form.useOAuth && !form.useGCloudADC}
                                  onChange={() => setForm(s.id, { useOAuth: false, useGCloudADC: false })}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${s.id}-cli-apikey`} className="text-sm font-normal cursor-pointer">
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
                                  onChange={(e) => setForm(s.id, { apiKey: e.target.value })}
                                />
                              </div>
                            )}
                            {form.useGCloudADC && (
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  placeholder="GCP Project ID"
                                  value={form.googleProject || ''}
                                  onChange={(e) => setForm(s.id, { googleProject: e.target.value })}
                                />
                                <Input
                                  placeholder="Location (default: us-central1)"
                                  value={form.googleLocation || 'us-central1'}
                                  onChange={(e) => setForm(s.id, { googleLocation: e.target.value })}
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
                      <input
                        type="checkbox"
                        id={`${s.id}-openai-use-cli`}
                        checked={form.useCLI || false}
                        onChange={(e) => {
                          const updates: Record<string, unknown> = { useCLI: e.target.checked };
                          if (e.target.checked) {
                            updates.cliCommand = 'codex';
                            // Only reset OAuth if it's not already set
                            if (form.useOAuth === undefined) {
                              updates.useOAuth = false;
                            }
                          }
                          setForm(s.id, updates);
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`${s.id}-openai-use-cli`} className="text-sm font-normal cursor-pointer">
                        Use CLI Mode (Codex CLI)
                      </Label>
                      {isFetchingCLI ? (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          Checking...
                        </span>
                      ) : cliAvailability?.openai ? (
                        <span className={`text-xs px-2 py-1 rounded ${
                          cliAvailability.openai.available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {cliAvailability.openai.available 
                            ? `✓ CLI Available (v${cliAvailability.openai.version || '?'})` 
                            : 'CLI Not Installed'}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          Unknown
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchCLIAvailability()}
                        className="h-6 px-2 text-xs"
                        title="Refresh CLI availability"
                      >
                        ↻
                      </Button>
                    </div>
                    {form.useCLI && (
                      <div className="space-y-4 pl-6 border-l-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CLI Command</Label>
                            <Input
                              placeholder="codex"
                              value={form.cliCommand || 'codex'}
                              onChange={(e) => setForm(s.id, { cliCommand: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Working Directory (Optional)</Label>
                            <Input
                              placeholder="/path/to/project"
                              value={form.cliWorkingDirectory || ''}
                              onChange={(e) => setForm(s.id, { cliWorkingDirectory: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>CLI Arguments (Optional, comma-separated)</Label>
                          <Input
                            placeholder="--verbose, --output json"
                            value={form.cliArgs || ''}
                            onChange={(e) => setForm(s.id, { cliArgs: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Authentication Method *</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${s.id}-openai-cli-oauth`}
                                name={`${s.id}-openai-cli-auth`}
                                checked={form.useOAuth === true}
                                onChange={() => setForm(s.id, { useOAuth: true })}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`${s.id}-openai-cli-oauth`} className="text-sm font-normal cursor-pointer">
                                ChatGPT Account (OAuth) - Works with free, Plus, Pro, Business, or Enterprise accounts
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${s.id}-openai-cli-apikey`}
                                name={`${s.id}-openai-cli-auth`}
                                checked={form.useOAuth === false}
                                onChange={() => setForm(s.id, { useOAuth: false })}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`${s.id}-openai-cli-apikey`} className="text-sm font-normal cursor-pointer">
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
                                onChange={(e) => setForm(s.id, { apiKey: e.target.value })}
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
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[CustomServicesPanel] Add Provider button clicked', s.id);
                      try {
                        addProviderInstance(s.id);
                      } catch (error) {
                        console.error('[CustomServicesPanel] Add Provider error:', error);
                        toast.error(`Failed to add provider: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 flex-1"
                    type="button"
                    disabled={updateConfig.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {updateConfig.isPending ? 'Adding...' : 'Add Provider'}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[CustomServicesPanel] Test Connection button clicked', s.id, s.service_key);
                      const form = getForm(s.id);
                      console.log('[CustomServicesPanel] Form for test:', form);
                      const isWebSearch = isWebSearchProvider(form.provider);
                      const isCLIMode = (form.provider === 'google' || form.provider === 'openai') && form.useCLI;
                      
                      if (!form.provider) {
                        console.warn('[CustomServicesPanel] Test validation failed: no provider');
                        toast.error('Please fill in provider type');
                        return;
                      }
                      if (!isCLIMode && !form.baseUrl) {
                        toast.error('Please fill in endpoint URL');
                        return;
                      }

                      // Google Gemini validation for testing
                      if (form.provider === 'google') {
                        if (form.useVertexAI) {
                          if (!form.googleProject) {
                            toast.error('GCP Project ID is required for Vertex AI mode');
                            return;
                          }
                        } else if (form.useCLI) {
                          if (!form.useOAuth && !form.useGCloudADC && !form.apiKey) {
                            toast.error('Select OAuth/gcloud ADC or provide an API key for CLI mode');
                            return;
                          }
                          if (form.useGCloudADC && !form.googleProject) {
                            toast.error('GCP Project ID is required for gcloud ADC mode');
                            return;
                          }
                          if (!form.model) {
                            toast.error('Model is required for testing');
                            return;
                          }
                        } else {
                          if (!form.apiKey) {
                            toast.error('API Key is required for testing');
                            return;
                          }
                          if (!form.model) {
                            toast.error('Model is required for testing');
                            return;
                          }
                        }
                      } else {
                        if (!form.apiKey) {
                          toast.error('API Key is required for testing');
                          return;
                        }
                        if (!isWebSearch && !form.model) {
                          toast.error('Model is required for testing LLM providers');
                          return;
                        }
                      }

                      try {
                        const testConfig: unknown = {
                          provider: form.provider,
                          ...(isCLIMode ? {} : { baseUrl: form.baseUrl }),
                          apiKey: form.apiKey,
                          model: form.model,
                          ...(form.provider === 'google' && {
                            useVertexAI: form.useVertexAI,
                            googleProject: form.googleProject,
                            googleLocation: form.googleLocation,
                            googleApiVersion: form.googleApiVersion,
                          }),
                          ...(form.provider === 'google_search' && {
                            googleSearchEngineId: form.googleSearchEngineId,
                          }),
                        };
                        
                        // Include CLI configuration if CLI mode is enabled
                        if (isCLIMode) {
                          testConfig.useCLI = true;
                          testConfig.cliCommand = form.cliCommand;
                          testConfig.cliArgs = form.cliArgs ? form.cliArgs.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined;
                          testConfig.useOAuth = form.useOAuth;
                          testConfig.useGCloudADC = form.useGCloudADC;
                          testConfig.cliWorkingDirectory = form.cliWorkingDirectory;
                          if (form.useGCloudADC) {
                            testConfig.googleProject = form.googleProject;
                            testConfig.googleLocation = form.googleLocation;
                          }
                        }
                        const res = await fetch(`/api/v1/ai/config/${s.service_key}/test`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ config: testConfig }),
                        });
                        if (!res.ok) {
                          const errorText = await res.text();
                          throw new Error(errorText);
                        }
                        const result = await res.json();
                        toast.success(result?.data?.message || 'Connection test successful');
                      } catch (e: unknown) {
                        const errorMessage = e instanceof Error ? e.message : String(e) || 'Connection test failed';
                        toast.error(errorMessage);
                        console.error('[CustomServicesPanel] Test connection error:', e);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2"
                    type="button"
                  >
                    Test Connection
                  </button>
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
                                    {/* Web Search Providers */}
                                    <SelectItem value="serper">Serper (Google Search API)</SelectItem>
                                    <SelectItem value="tavily">Tavily (AI Search)</SelectItem>
                                    <SelectItem value="google_search">Google Custom Search</SelectItem>
                                    <SelectItem value="brave">Brave Search</SelectItem>
                                    <SelectItem value="exa">Exa (Semantic Search)</SelectItem>
                                    {/* Web Scraping */}
                                    <SelectItem value="firecrawl">Firecrawl (Web Scraping)</SelectItem>
                                    {/* Multi-Provider */}
                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                    <SelectItem value="kilocode">KiloCode</SelectItem>
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
                              {!isWebSearchProvider(editForm?.provider || 'google') && editForm?.provider !== 'google' && (
                                <div className="space-y-2">
                                  <ModelSelector
                                    providerId={editForm?.provider || 'openai'}
                                    value={editForm?.model || ''}
                                    onChange={(model) => setEditForm(prev => prev ? { ...prev, model } : null)}
                                    label="Model *"
                                    required
                                    placeholder="Select or type a model"
                                  />
                                </div>
                              )}
                              {isWebSearchProvider(editForm?.provider || '') && editForm?.provider !== 'google_search' && (
                                <div className="space-y-2">
                                  <Label>Model (Optional)</Label>
                                  <Input
                                    placeholder="Not required for web search"
                                    value={editForm?.model || ''}
                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, model: e.target.value } : null)}
                                  />
                                </div>
                              )}
                              {editForm?.provider === 'google' && (
                                <div className="space-y-2">
                                  <Label>Model *</Label>
                                  <Select
                                    value={editForm?.model || 'gemini-2.0-flash-exp'}
                                    onValueChange={(v) => setEditForm(prev => prev ? { ...prev, model: v } : null)}
                                  >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro Preview (Latest)</SelectItem>
                                      <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</SelectItem>
                                      <SelectItem value="gemini-1.5-pro-latest">Gemini 1.5 Pro Latest</SelectItem>
                                      <SelectItem value="gemini-1.5-flash-latest">Gemini 1.5 Flash Latest</SelectItem>
                                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                      <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                                      <SelectItem value="gemini-pro">Gemini Pro (v1)</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                            {/* Google Gemini Advanced Configuration in Edit Mode */}
                            {editForm?.provider === 'google' && (
                              <div className="border-t pt-4 space-y-4">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`edit-${inst.id}-use-vertex-ai`}
                                    checked={editForm.useVertexAI || false}
                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, useVertexAI: e.target.checked } : null)}
                                    className="rounded"
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
                                    <input
                                      type="checkbox"
                                      id={`edit-${inst.id}-use-cli`}
                                      checked={editForm.useCLI || false}
                                      onChange={(e) => {
                                        const updates: Record<string, unknown> = { useCLI: e.target.checked };
                                        if (e.target.checked) {
                                          updates.cliCommand = 'gemini';
                                          // Only reset OAuth/ADC if they're not already set
                                          if (editForm.useOAuth === undefined) {
                                            updates.useOAuth = false;
                                          }
                                          if (editForm.useGCloudADC === undefined) {
                                            updates.useGCloudADC = false;
                                          }
                                        }
                                        setEditForm(prev => prev ? { ...prev, ...updates } : null);
                                      }}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`edit-${inst.id}-use-cli`} className="text-sm font-normal cursor-pointer">
                                      Use CLI Mode (OAuth supports free & paid accounts)
                                    </Label>
                                    {isFetchingCLI ? (
                                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                                        Checking...
                                      </span>
                                    ) : cliAvailability?.google ? (
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        cliAvailability.google.available 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {cliAvailability.google.available 
                                          ? `✓ CLI Available (v${cliAvailability.google.version || '?'})` 
                                          : 'CLI Not Installed'}
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                                        Unknown
                                      </span>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => refetchCLIAvailability()}
                                      className="h-6 px-2 text-xs"
                                      title="Refresh CLI availability"
                                    >
                                      ↻
                                    </Button>
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
                                        {editForm.useOAuth && (
                                          <div className="mt-2 space-y-2">
                                            <p className="text-xs text-muted-foreground">
                                              <strong>To authenticate:</strong> Run <code className="bg-muted px-1 rounded">gemini</code> in terminal to log in with your Google account (free or paid).
                                            </p>
                                          </div>
                                        )}
                                        {editForm.useGCloudADC && (
                                          <p className="text-xs text-muted-foreground mt-2">
                                            Run <code className="bg-muted px-1 rounded">gcloud auth application-default login</code> in terminal to authenticate with your GCP account
                                          </p>
                                        )}
                                        {!editForm.useOAuth && !editForm.useGCloudADC && (
                                          <p className="text-xs text-muted-foreground mt-2">
                                            Enter your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
                                          </p>
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
                                  <input
                                    type="checkbox"
                                    id={`edit-${inst.id}-openai-use-cli`}
                                    checked={editForm.useCLI || false}
                                    onChange={(e) => {
                                      const updates: Record<string, unknown> = { useCLI: e.target.checked };
                                      if (e.target.checked) {
                                        updates.cliCommand = 'codex';
                                        // Only reset OAuth if it's not already set
                                        if (editForm.useOAuth === undefined) {
                                          updates.useOAuth = false;
                                        }
                                      }
                                      setEditForm(prev => prev ? { ...prev, ...updates } : null);
                                    }}
                                    className="rounded"
                                  />
                                  <Label htmlFor={`edit-${inst.id}-openai-use-cli`} className="text-sm font-normal cursor-pointer">
                                    Use CLI Mode (Codex CLI)
                                  </Label>
                                  {isFetchingCLI ? (
                                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                                      Checking...
                                    </span>
                                  ) : cliAvailability?.openai ? (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      cliAvailability.openai.available 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {cliAvailability.openai.available 
                                        ? `✓ CLI Available (v${cliAvailability.openai.version || '?'})` 
                                        : 'CLI Not Installed'}
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                                      Unknown
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => refetchCLIAvailability()}
                                    className="h-6 px-2 text-xs"
                                    title="Refresh CLI availability"
                                  >
                                    ↻
                                  </Button>
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
                                onClick={() => saveEditedInstance(s.id, inst.id)}
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
                                onClick={() => setActiveProvider(s.id, inst.id)}
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
                                    onClick={() => testInstanceConnection(s.id, inst)}
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
                              {inst.useCLI && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  CLI Mode • Command: {inst.cliCommand || (inst.provider === 'google' ? 'gemini' : 'codex')}
                                  {inst.useOAuth && ' • OAuth'}
                                  {inst.useGCloudADC && ' • gcloud ADC'}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={inst.enabled}
                                  onCheckedChange={(checked) => toggleProviderInstance(s.id, inst.id, checked)}
                                />
                                <Label className="text-xs">{inst.enabled ? 'On' : 'Off'}</Label>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingInstance(s.id, inst)}
                                title="Edit provider"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this provider?')) {
                                    deleteProviderInstance(s.id, inst.id);
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
