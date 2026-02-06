'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data.data as T;
}

export default function ProjectManagementSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [statusName, setStatusName] = useState('');
  const [statusKey, setStatusKey] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#0ea5e9');
  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('task.created');
  const [icalFeed, setIcalFeed] = useState<string | null>(null);

  const { data: projects } = useQuery({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/projects'),
  });

  const { data: statuses } = useQuery({
    queryKey: ['pm-statuses', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/projects/${projectId}/statuses`),
    enabled: !!projectId,
  });

  const { data: labels } = useQuery({
    queryKey: ['pm-labels', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/projects/${projectId}/labels`),
    enabled: !!projectId,
  });

  const { data: customFields } = useQuery({
    queryKey: ['pm-custom-fields', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/custom-fields?project_id=${projectId}&entity_type=task`),
    enabled: !!projectId,
  });

  const { data: webhooks } = useQuery({
    queryKey: ['pm-webhooks'],
    queryFn: () => fetchJson('/api/v1/project-management/integrations/webhooks'),
  });

  const createStatus = useMutation({
    mutationFn: async () => {
      return fetchJson(`/api/v1/project-management/projects/${projectId}/statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: statusName,
          statusKey: statusKey || statusName.toLowerCase().replace(/\s+/g, '_'),
          statusType: 'todo',
        }),
      });
    },
    onSuccess: async () => {
      toast({ title: 'Status created' });
      setStatusName('');
      setStatusKey('');
      await queryClient.invalidateQueries({ queryKey: ['pm-statuses', projectId] });
    },
  });

  const createLabel = useMutation({
    mutationFn: async () => {
      return fetchJson(`/api/v1/project-management/projects/${projectId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: labelName, color: labelColor }),
      });
    },
    onSuccess: async () => {
      toast({ title: 'Label created' });
      setLabelName('');
      await queryClient.invalidateQueries({ queryKey: ['pm-labels', projectId] });
    },
  });

  const createField = useMutation({
    mutationFn: async () => {
      return fetchJson('/api/v1/project-management/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          entityType: 'task',
          name: fieldName,
          key: fieldKey,
          type: fieldType,
        }),
      });
    },
    onSuccess: async () => {
      toast({ title: 'Custom field created' });
      setFieldName('');
      setFieldKey('');
      await queryClient.invalidateQueries({ queryKey: ['pm-custom-fields', projectId] });
    },
  });

  const createWebhook = useMutation({
    mutationFn: async () => {
      return fetchJson('/api/v1/project-management/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webhookName,
          targetUrl: webhookUrl,
          events: webhookEvents.split(',').map(evt => evt.trim()).filter(Boolean),
        }),
      });
    },
    onSuccess: async () => {
      toast({ title: 'Webhook created' });
      setWebhookName('');
      setWebhookUrl('');
      await queryClient.invalidateQueries({ queryKey: ['pm-webhooks'] });
    },
  });

  const generateIcal = async () => {
    try {
      const data = await fetchJson<any>(`/api/v1/project-management/integrations/ical${projectId ? `?project_id=${projectId}` : ''}`);
      setIcalFeed(data.feedUrl);
    } catch (error) {
      toast({ title: 'Failed to generate feed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const projectOptions = useMemo(() => projects || [], [projects]);

  return (
    <AppLayout
      title="Project Management Settings"
      breadcrumbs={[{ label: 'Project Management', href: '/project-management' }, { label: 'Settings' }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Configuration</CardTitle>
            <CardDescription>Select a project to manage its workflow settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">Select project</option>
              {projectOptions.map((project: any) => (
                <option key={project.project_id} value={project.project_id}>{project.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statuses</CardTitle>
            <CardDescription>Define workflow stages for the selected project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Status name" value={statusName} onChange={e => setStatusName(e.target.value)} />
              <Input placeholder="status_key" value={statusKey} onChange={e => setStatusKey(e.target.value)} />
              <Button onClick={() => createStatus.mutate()} disabled={!projectId || !statusName.trim()}>Add Status</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(statuses as any[] || []).map((status: any) => (
                <Badge key={status.status_id} variant="secondary">{status.name}</Badge>
              ))}
              {(!statuses || (statuses as any[]).length === 0) && <span className="text-sm text-muted-foreground">No statuses yet.</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Labels</CardTitle>
            <CardDescription>Color-coded tags for tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Label name" value={labelName} onChange={e => setLabelName(e.target.value)} />
              <Input placeholder="#0ea5e9" value={labelColor} onChange={e => setLabelColor(e.target.value)} />
              <Button onClick={() => createLabel.mutate()} disabled={!projectId || !labelName.trim()}>Add Label</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(labels as any[] || []).map((label: any) => (
                <span key={label.label_id} className="rounded px-2 py-1 text-xs" style={{ backgroundColor: label.color || '#e2e8f0' }}>
                  {label.name}
                </span>
              ))}
              {(!labels || (labels as any[]).length === 0) && <span className="text-sm text-muted-foreground">No labels yet.</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>Extend task metadata with custom fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Field name" value={fieldName} onChange={e => setFieldName(e.target.value)} />
              <Input placeholder="field_key" value={fieldKey} onChange={e => setFieldKey(e.target.value)} />
              <Input placeholder="type" value={fieldType} onChange={e => setFieldType(e.target.value)} />
              <Button onClick={() => createField.mutate()} disabled={!projectId || !fieldName.trim() || !fieldKey.trim()}>Add Field</Button>
            </div>
            <div className="space-y-2">
              {(customFields as any[] || []).map((field: any) => (
                <div key={field.field_id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="text-sm font-medium">{field.name}</div>
                    <div className="text-xs text-muted-foreground">{field.key} {'\u00B7'} {field.type}</div>
                  </div>
                </div>
              ))}
              {(!customFields || (customFields as any[]).length === 0) && <span className="text-sm text-muted-foreground">No custom fields yet.</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>Notify external systems when PM events occur.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Webhook name" value={webhookName} onChange={e => setWebhookName(e.target.value)} />
              <Input placeholder="https://example.com/hook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
              <Input placeholder="events (comma-separated)" value={webhookEvents} onChange={e => setWebhookEvents(e.target.value)} />
              <Button onClick={() => createWebhook.mutate()} disabled={!webhookName.trim() || !webhookUrl.trim()}>Add Webhook</Button>
            </div>
            <div className="space-y-2">
              {(webhooks as any[] || []).map((hook: any) => (
                <div key={hook.webhook_id} className="rounded border p-3">
                  <div className="text-sm font-medium">{hook.name}</div>
                  <div className="text-xs text-muted-foreground">{hook.target_url}</div>
                </div>
              ))}
              {(!webhooks || (webhooks as any[]).length === 0) && <span className="text-sm text-muted-foreground">No webhooks configured.</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>iCal Feed</CardTitle>
            <CardDescription>Subscribe to tasks and milestones in your calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={generateIcal}>Generate Feed URL</Button>
            {icalFeed && (
              <Textarea value={icalFeed} readOnly rows={3} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
