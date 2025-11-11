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

type ProviderKey = 'openai' | 'anthropic' | 'openai_compatible';

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
  model: string;
  enabled: boolean;
  connected?: boolean;
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
  
  // Form state for adding a new provider instance per service
  const [newProviderForms, setNewProviderForms] = useState<Record<string, {
    provider: ProviderKey;
    baseUrl: string;
    apiKey: string;
    model: string;
  }>>({});

  // Edit mode state
  const [editingInstance, setEditingInstance] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    provider: ProviderKey;
    baseUrl: string;
    apiKey: string;
    model: string;
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
      const res = await fetch(`/api/v1/ai/services/${serviceId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
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
    onError: (e: unknown) => toast.error(e?.message || 'Failed to save provider'),
  });

  const getForm = (serviceId: string) => {
    return newProviderForms[serviceId] || {
      provider: 'openai' as ProviderKey,
      baseUrl: '',
      apiKey: '',
      model: '',
    };
  };

  const setForm = (serviceId: string, updates: Partial<typeof newProviderForms[string]>) => {
    setNewProviderForms(prev => ({
      ...prev,
      [serviceId]: { ...getForm(serviceId), ...updates },
    }));
  };

  const addProviderInstance = (serviceId: string) => {
    const form = getForm(serviceId);
    if (!form.provider || !form.baseUrl || !form.apiKey || !form.model) {
      toast.error('Please fill in all fields');
      return;
    }

    const record = configs[serviceId];
    const cfg = record?.config || {};
    const instances: ProviderInstance[] = cfg.providerInstances || [];
    
    const newInstance: ProviderInstance = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: form.provider,
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      model: form.model,
      enabled: true,
    };

    const updatedInstances = [...instances, newInstance];
    const activeId = cfg.activeProviderInstanceId || newInstance.id;

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

    // Reset form
    setNewProviderForms(prev => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
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

  const startEditingInstance = (instance: ProviderInstance) => {
    setEditingInstance(instance.id);
    setEditForm({
      provider: instance.provider,
      baseUrl: instance.baseUrl,
      apiKey: instance.apiKey,
      model: instance.model,
    });
  };

  const saveEditedInstance = (serviceId: string, instanceId: string) => {
    if (!editForm) return;

    const record = configs[serviceId];
    const cfg = record?.config || {};
    const instances: ProviderInstance[] = cfg.providerInstances || [];
    const updatedInstances = instances.map(i => 
      i.id === instanceId 
        ? { ...i, ...editForm, connected: undefined } // Reset connected status after edit
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
      const testConfig = {
        provider: instance.provider,
        baseUrl: instance.baseUrl,
        apiKey: instance.apiKey,
        model: instance.model,
      };
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
                      onValueChange={(v) => setForm(s.id, { provider: v as ProviderKey })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      placeholder="https://api.openai.com/v1"
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
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      placeholder="gpt-4o-mini"
                      value={form.model}
                      onChange={(e) => setForm(s.id, { model: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addProviderInstance(s.id)} className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Provider
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const form = getForm(s.id);
                      if (!form.provider || !form.baseUrl || !form.apiKey || !form.model) {
                        toast.error('Please fill in all fields to test connection');
                        return;
                      }
                      try {
                        const testConfig = {
                          provider: form.provider,
                          baseUrl: form.baseUrl,
                          apiKey: form.apiKey,
                          model: form.model,
                        };
                        const res = await fetch(`/api/v1/ai/config/assistant/test`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ config: testConfig }),
                        });
                        if (!res.ok) throw new Error(await res.text());
                        toast.success('Connection test successful');
                      } catch (e: unknown) {
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
                            <div className="grid grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <Label>Provider Type</Label>
                                <Select
                                  value={editForm?.provider}
                                  onValueChange={(v) => setEditForm(prev => prev ? { ...prev, provider: v as ProviderKey } : null)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="anthropic">Anthropic</SelectItem>
                                    <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
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
                              <div className="space-y-2">
                                <Label>Model</Label>
                                <Input
                                  value={editForm?.model || ''}
                                  onChange={(e) => setEditForm(prev => prev ? { ...prev, model: e.target.value } : null)}
                                />
                              </div>
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

                              <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
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
                                  <span className="text-muted-foreground">Model:</span> {inst.model}
                                </div>
                              </div>
                              
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
