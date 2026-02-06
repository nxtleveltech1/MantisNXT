'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoadmapTimeline } from '@/components/project-management/RoadmapTimeline';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data.data as T;
}

export default function RoadmapPage() {
  const [projectId, setProjectId] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/projects'),
  });

  const { data: roadmap } = useQuery({
    queryKey: ['pm-roadmap', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/analytics/roadmap${projectId ? `?project_id=${projectId}` : ''}`),
  });

  const items = useMemo(() => {
    const taskItems = (roadmap?.tasks || []).map((task: any) => ({
      id: task.task_id,
      title: task.title,
      date: task.due_date || task.start_date,
      status: task.completed_at ? 'completed' : 'open',
      type: 'task' as const,
    }));
    const milestoneItems = (roadmap?.milestones || []).map((milestone: any) => ({
      id: milestone.milestone_id,
      title: milestone.name,
      date: milestone.due_date,
      status: milestone.status,
      type: 'milestone' as const,
    }));
    return [...taskItems, ...milestoneItems].sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return aDate - bDate;
    });
  }, [roadmap]);

  return (
    <AppLayout
      title="Roadmap"
      breadcrumbs={[{ label: 'Project Management', href: '/project-management' }, { label: 'Roadmap' }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Roadmap</CardTitle>
            <CardDescription>Track milestones and high-level tasks over time.</CardDescription>
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
            <RoadmapTimeline items={items} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
