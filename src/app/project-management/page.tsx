'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { ProjectSummaryCards } from '@/components/project-management/ProjectSummaryCards';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'Request failed');
  }
  return data.data as T;
}

export default function ProjectManagementOverview() {
  const { isAuthenticated, isLoading: authLoading } = useSecureAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'org' | 'private'>('org');

  const { data: overview } = useQuery({
    queryKey: ['pm-overview'],
    queryFn: () => fetchJson('/api/v1/project-management/analytics/overview'),
    enabled: isAuthenticated,
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/projects'),
    enabled: isAuthenticated,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      return fetchJson('/api/v1/project-management/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, projectKey: key, description, visibility }),
      });
    },
    onSuccess: async () => {
      toast({ title: 'Project created', description: 'Your project is ready.' });
      setDialogOpen(false);
      setName('');
      setKey('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
      await queryClient.invalidateQueries({ queryKey: ['pm-overview'] });
    },
    onError: error => {
      toast({ title: 'Failed to create project', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
  });

  const projectRows = useMemo(() => projects || [], [projects]);

  if (authLoading) {
    return (
      <AppLayout title="Project Management" breadcrumbs={[{ label: 'Project Management' }]}>
        <div className="flex h-64 items-center justify-center">Loading...</div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="Project Management" breadcrumbs={[{ label: 'Project Management' }]}>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Please sign in to access Project Management.</CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Project Management" breadcrumbs={[{ label: 'Project Management' }]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Project Management</h2>
            <p className="text-muted-foreground">Plan, track, and deliver work across your teams.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
            <Button variant="outline" asChild>
              <Link href="/project-management/portfolio">Portfolio</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/project-management/reports">Reports</Link>
            </Button>
          </div>
        </div>

        <ProjectSummaryCards overview={overview} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FolderKanban className="h-5 w-5" /> Projects</CardTitle>
            <CardDescription>Jump back into active work streams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading projects...</div>
            ) : projectRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No projects yet. Create your first project.</div>
            ) : (
              projectRows.map((project: any) => (
                <div key={project.project_id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="text-sm font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{project.project_key} · {project.visibility}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{project.status}</Badge>
                    <Button size="sm" asChild>
                      <Link href={`/project-management/projects/${project.project_id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Start a new project workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input id="project-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-key">Project Key</Label>
              <Input id="project-key" value={key} onChange={e => setKey(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea id="project-description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-visibility">Visibility</Label>
              <select
                id="project-visibility"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
                value={visibility}
                onChange={e => setVisibility(e.target.value as 'org' | 'private')}
              >
                <option value="org">Organization</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createProject.mutate()} disabled={!name.trim() || !key.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
