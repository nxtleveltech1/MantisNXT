'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data.data as T;
}

export default function AutomationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [eventName, setEventName] = useState('task.updated');

  const { data: rules } = useQuery({
    queryKey: ['pm-automation-rules'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/automation/rules'),
  });

  const createRule = useMutation({
    mutationFn: async () => {
      return fetchJson('/api/v1/project-management/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          triggerType: 'event',
          triggerConfig: { event: eventName },
          conditions: [],
          actions: [],
        }),
      });
    },
    onSuccess: async () => {
      toast({ title: 'Automation created' });
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['pm-automation-rules'] });
    },
    onError: error => {
      toast({ title: 'Failed to create automation', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
  });

  return (
    <AppLayout
      title="Automations"
      breadcrumbs={[{ label: 'Project Management', href: '/project-management' }, { label: 'Automations' }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Automation Rules</CardTitle>
            <CardDescription>Create and manage workflow automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Rule name" />
              </div>
              <div className="space-y-2">
                <Label>Event</Label>
                <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="task.updated" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => createRule.mutate()} disabled={!name.trim()}>Create</Button>
              </div>
            </div>
            <div className="space-y-2">
              {(rules || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No automation rules yet.</div>
              ) : (
                rules.map(rule => (
                  <div key={rule.rule_id} className="rounded border p-3">
                    <div className="text-sm font-medium">{rule.name}</div>
                    <div className="text-xs text-muted-foreground">{rule.trigger_type} {'\u00B7'} {rule.status}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
