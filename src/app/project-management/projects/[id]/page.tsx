'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { TaskListTable } from '@/components/project-management/TaskListTable';
import { KanbanBoard } from '@/components/project-management/KanbanBoard';
import { GanttTimeline } from '@/components/project-management/GanttTimeline';
import { RoadmapTimeline } from '@/components/project-management/RoadmapTimeline';
import { CommentThread } from '@/components/project-management/CommentThread';
import { DocPanel } from '@/components/project-management/DocPanel';
import { ActivityFeed } from '@/components/project-management/ActivityFeed';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data.data as T;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id as string;
  const { isAuthenticated } = useSecureAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const { data: project } = useQuery({
    queryKey: ['pm-project', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/projects/${projectId}`),
    enabled: !!projectId && isAuthenticated,
  });

  const { data: statuses } = useQuery({
    queryKey: ['pm-statuses', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/projects/${projectId}/statuses`),
    enabled: !!projectId && isAuthenticated,
  });

  const { data: tasks } = useQuery({
    queryKey: ['pm-tasks', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/tasks?project_id=${projectId}`),
    enabled: !!projectId && isAuthenticated,
  });

  const { data: milestones } = useQuery({
    queryKey: ['pm-milestones', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/projects/${projectId}/milestones`),
    enabled: !!projectId && isAuthenticated,
  });

  const { data: docs, refetch: refreshDocs } = useQuery({
    queryKey: ['pm-docs', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/docs?entity_type=project&entity_id=${projectId}`),
    enabled: !!projectId && isAuthenticated,
  });

  const { data: comments, refetch: refreshComments } = useQuery({
    queryKey: ['pm-comments', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/comments?entity_type=project&entity_id=${projectId}`),
    enabled: !!projectId && isAuthenticated,
  });

  const { data: activity } = useQuery({
    queryKey: ['pm-activity', projectId],
    queryFn: () => fetchJson(`/api/v1/project-management/activity?entity_type=project&entity_id=${projectId}`),
    enabled: !!projectId && isAuthenticated,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      return fetchJson('/api/v1/project-management/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: taskTitle,
          description: taskDescription,
        }),
      });
    },
    onSuccess: async () => {
      toast({ title: 'Task created', description: 'Your task has been added.' });
      setDialogOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      await queryClient.invalidateQueries({ queryKey: ['pm-tasks', projectId] });
    },
    onError: error => {
      toast({ title: 'Failed to create task', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
  });

  const ganttTasks = useMemo(() =>
    (tasks || []).map((task: any) => ({
      id: task.task_id,
      title: task.title,
      start: task.start_date,
      end: task.due_date,
    })),
  [tasks]);

  const roadmapItems = useMemo(() => {
    const taskItems = (tasks || []).map((task: any) => ({
      id: task.task_id,
      title: task.title,
      date: task.due_date || task.start_date,
      status: task.status_name,
      type: 'task' as const,
    }));
    const milestoneItems = (milestones || []).map((milestone: any) => ({
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
  }, [tasks, milestones]);

  if (!isAuthenticated) {
    return (
      <AppLayout
        title="Project"
        breadcrumbs={[{ label: 'Project Management', href: '/project-management' }, { label: 'Project' }]}
      >
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Please sign in to access projects.</CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={project?.name || 'Project'}
      breadcrumbs={[
        { label: 'Project Management', href: '/project-management' },
        { label: project?.name || 'Project' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{project?.name || 'Project'}</h2>
            <p className="text-muted-foreground">{project?.description || 'Project workspace'}</p>
          </div>
          <div className="flex gap-2">
            {project?.status && <Badge variant="secondary">{project.status}</Badge>}
            <Button onClick={() => setDialogOpen(true)}>New Task</Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
                <CardDescription>Key milestones and task status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Start</div>
                    <div className="font-medium">{project?.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Target</div>
                    <div className="font-medium">{project?.target_date ? new Date(project.target_date).toLocaleDateString() : '-'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Milestones</div>
                  <div className="mt-2 space-y-2">
                    {(milestones || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No milestones yet.</div>
                    ) : (
                      milestones.map((milestone: any) => (
                        <div key={milestone.milestone_id} className="flex items-center justify-between rounded border p-3">
                          <div>
                            <div className="text-sm font-medium">{milestone.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Due {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'TBD'}
                            </div>
                          </div>
                          <Badge variant="secondary">{milestone.status}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Track tasks and assignments.</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskListTable tasks={tasks || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kanban">
            <Card>
              <CardHeader>
                <CardTitle>Kanban</CardTitle>
                <CardDescription>Move tasks across workflow stages.</CardDescription>
              </CardHeader>
              <CardContent>
                <KanbanBoard tasks={tasks || []} statuses={statuses || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gantt">
            <Card>
              <CardHeader>
                <CardTitle>Gantt</CardTitle>
                <CardDescription>Timeline for task delivery.</CardDescription>
              </CardHeader>
              <CardContent>
                <GanttTimeline tasks={ganttTasks} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roadmap">
            <Card>
              <CardHeader>
                <CardTitle>Roadmap</CardTitle>
                <CardDescription>Milestones and critical tasks.</CardDescription>
              </CardHeader>
              <CardContent>
                <RoadmapTimeline items={roadmapItems} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle>Docs & Attachments</CardTitle>
                <CardDescription>Link DocuStore documents to this project.</CardDescription>
              </CardHeader>
              <CardContent>
                <DocPanel entityType="project" entityId={projectId} docs={(docs as any)?.documents || []} onRefresh={refreshDocs} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Latest project actions.</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={activity || []} />
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <CommentThread entityType="project" entityId={projectId} comments={comments || []} onRefresh={refreshComments} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea id="task-desc" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createTask.mutate()} disabled={!taskTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
