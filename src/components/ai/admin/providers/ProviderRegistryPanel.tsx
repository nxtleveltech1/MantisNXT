'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type RegistryProviderType = 'openai' | 'anthropic' | 'azure_openai' | 'bedrock';

interface ProviderRegistryRecord {
  id: string;
  name: string;
  provider_type: RegistryProviderType;
  base_url?: string | null;
  default_model?: string | null;
  description?: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProviderRegistryPanel() {
  const queryClient = useQueryClient();
  const { data: providers = [] } = useQuery<ProviderRegistryRecord[]>({
    queryKey: ['ai-provider-registry'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ai/providers');
      if (!res.ok) throw new Error('Failed to load provider registry');
      const data = await res.json();
      return data.data || [];
    },
  });

  const [form, setForm] = useState<{
    name: string;
    provider_type: RegistryProviderType;
    base_url?: string;
    default_model?: string;
  }>({
    name: '',
    provider_type: 'openai',
    base_url: '',
    default_model: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          provider_type: form.provider_type,
          base_url: form.base_url?.trim() || null,
          default_model: form.default_model?.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success('Provider preset added');
      setForm({ name: '', provider_type: 'openai', base_url: '', default_model: '' });
      queryClient.invalidateQueries({ queryKey: ['ai-provider-registry'] });
    },
    onError: (e: unknown) => toast.error(e?.message || 'Failed to add provider'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/v1/ai/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-provider-registry'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai/providers/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: () => {
      toast.success('Provider removed');
      queryClient.invalidateQueries({ queryKey: ['ai-provider-registry'] });
    },
  });

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Provider Registry (Org-wide presets)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="OpenRouter (prod)"
            />
          </div>
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={form.provider_type}
              onValueChange={v =>
                setForm(p => ({ ...p, provider_type: v as RegistryProviderType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
                <SelectItem value="bedrock">Bedrock/Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Base URL (optional)</Label>
            <Input
              value={form.base_url}
              onChange={e => setForm(p => ({ ...p, base_url: e.target.value }))}
              placeholder="https://openrouter.ai/api/v1"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Model (optional)</Label>
            <Input
              value={form.default_model}
              onChange={e => setForm(p => ({ ...p, default_model: e.target.value }))}
              placeholder="gpt-4.1-mini"
            />
          </div>
          <div className="flex items-end">
            <Button
              disabled={!form.name || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Add Preset
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Existing presets</div>
          <div className="divide-y rounded-md border">
            {providers.length === 0 ? (
              <div className="text-muted-foreground p-4 text-sm">No presets added yet.</div>
            ) : (
              providers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-muted-foreground truncate">
                      {p.provider_type} {p.base_url ? `• ${p.base_url}` : ''}{' '}
                      {p.default_model ? `• ${p.default_model}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: p.id, enabled: !p.enabled })}
                    >
                      {p.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
