'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data.data as T;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [reportType, setReportType] = useState<'project' | 'milestone'>('project');

  const { data: projects } = useQuery({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/projects'),
  });

  const { data: milestones } = useQuery({
    queryKey: ['pm-milestones', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/projects/${projectId}/milestones`),
    enabled: !!projectId,
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      const id = reportType === 'project' ? projectId : milestoneId;
      return fetchJson(`/api/v1/docustore/projects/${id}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reportType }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Report generated', description: 'The PDF is stored in DocuStore.' });
    },
    onError: error => {
      toast({ title: 'Failed to generate report', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
  });

  const milestoneOptions = useMemo(() => milestones || [], [milestones]);

  return (
    <AppLayout
      title="Reports"
      breadcrumbs={[{ label: 'Project Management', href: '/project-management' }, { label: 'Reports' }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Reports</CardTitle>
            <CardDescription>Generate PDF reports for projects and milestones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Project</label>
              <select
                className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
                value={projectId}
                onChange={e => {
                  setProjectId(e.target.value);
                  setMilestoneId('');
                }}
              >
                <option value="">Select project</option>
                {(projects || []).map(project => (
                  <option key={project.project_id} value={project.project_id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Report Type</label>
              <select
                className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
                value={reportType}
                onChange={e => setReportType(e.target.value as 'project' | 'milestone')}
              >
                <option value="project">Project Report</option>
                <option value="milestone">Milestone Report</option>
              </select>
            </div>
            {reportType === 'milestone' && (
              <div>
                <label className="text-sm text-muted-foreground">Milestone</label>
                <select
                  className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
                  value={milestoneId}
                  onChange={e => setMilestoneId(e.target.value)}
                >
                  <option value="">Select milestone</option>
                  {milestoneOptions.map((milestone: any) => (
                    <option key={milestone.milestone_id} value={milestone.milestone_id}>{milestone.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button
              onClick={() => generateReport.mutate()}
              disabled={reportType === 'project' ? !projectId : !milestoneId}
            >
              Generate PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
