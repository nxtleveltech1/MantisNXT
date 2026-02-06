'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkloadHeatmap } from '@/components/project-management/WorkloadHeatmap';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data.data as T;
}

export default function WorkloadPage() {
  const [projectId, setProjectId] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/projects'),
  });

  const { data: workload } = useQuery({
    queryKey: ['pm-workload', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/analytics/workload${projectId ? `?project_id=${projectId}` : ''}`),
  });

  const { data: users } = useQuery({
    queryKey: ['pm-users'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/users'),
  });

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    (users || []).forEach(user => {
      const name = user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      map[user.id] = name;
    });
    return map;
  }, [users]);

  return (
    <AppLayout
      title="Workload"
      breadcrumbs={[{ label: 'Project Management', href: '/project-management' }, { label: 'Workload' }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workload</CardTitle>
            <CardDescription>Understand task distribution across team members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Project filter</label>
              <select
                className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
              >
                <option value="">All Projects</option>
                {(projects || []).map(project => (
                  <option key={project.project_id} value={project.project_id}>{project.name}</option>
                ))}
              </select>
            </div>
            <WorkloadHeatmap rows={workload || []} users={userMap} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
