'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  GripVertical,
  FolderKanban,
  Filter,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { DartAiChat } from '@/components/project-management/DartAiChat';

interface Task {
  id: string;
  title: string;
  status?: string;
  dartboard?: string;
  dartboardId?: string;
  description?: string;
  assignee?: string;
  assignees?: string[];
  tags?: string[];
  priority?: string;
  startAt?: string;
  dueAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

type DartboardTitle = string;

interface TaskCreatePayload {
  item: {
    title: string;
    dartboard?: string;
    status?: string;
    description?: string;
    assignee?: string;
    tags?: string[];
    priority?: string;
    dueAt?: string;
  };
}

export default function ProjectManagementPage() {
  const { isAuthenticated, isLoading: authLoading } = useSecureAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [dartboards, setDartboards] = useState<DartboardTitle[]>([]);
  const [dartboardsLoading, setDartboardsLoading] = useState(false);
  const [selectedDartboard, setSelectedDartboard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'backlog'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskCreatePayload['item']>({
    title: '',
    dartboard: '',
    status: '',
    description: '',
    assignee: '',
    tags: [],
    priority: '',
    dueAt: '',
  });

  useEffect(() => {
    if (authLoading) return;
    checkConnection();
  }, [authLoading]);

  useEffect(() => {
    if (connected) {
      loadTasks();
      loadDartboards();
    }
  }, [connected]);

  useEffect(() => {
    if (connected) {
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDartboard]);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/v1/project-management/dartai/connect');
      const data = await res.json();
      setConnected(data.data?.connected === true);
    } catch (error) {
      console.error('Failed to check connection:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    setTasksLoading(true);
    try {
      const url = selectedDartboard
        ? `/api/v1/project-management/dartai/tasks?dartboard=${encodeURIComponent(selectedDartboard)}`
        : '/api/v1/project-management/dartai/tasks';
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to load tasks');
      }
      // The API route now normalizes the response to always return an array
      const taskList: Task[] = Array.isArray(data.data) ? data.data : [];
      console.log('[PM] Loaded tasks:', { count: taskList.length, selectedDartboard });
      setTasks(taskList);
    } catch (error: unknown) {
      console.error('[PM] Failed to load tasks:', error);
      toast({
        title: 'Failed to load tasks',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setTasksLoading(false);
    }
  };

  // Filter tasks for backlog view (tasks that are not completed)
  const filteredTasks = React.useMemo(() => {
    if (viewMode === 'backlog') {
      return tasks.filter(
        task =>
          !task.status ||
          (task.status.toLowerCase() !== 'completed' &&
            task.status.toLowerCase() !== 'done' &&
            task.status.toLowerCase() !== 'closed')
      );
    }
    return tasks;
  }, [tasks, viewMode]);

  const loadDartboards = async () => {
    setDartboardsLoading(true);
    try {
      const res = await fetch('/api/v1/project-management/dartai/dartboards');
      const data = await res.json();
      if (data.error) {
        console.warn('[PM] Failed to load dartboards:', data.error);
        // Don't show error toast - dartboards are optional
        setDartboards([]);
        return;
      }
      const dartboardList: DartboardTitle[] = Array.isArray(data.data) ? data.data : [];
      console.log('[PM] Loaded dartboards:', { count: dartboardList.length });
      setDartboards(dartboardList);
    } catch (error: unknown) {
      console.error('[PM] Failed to load dartboards:', error);
      // Don't show error toast - dartboards are optional
      setDartboards([]);
    } finally {
      setDartboardsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Task title is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        const payload = {
          item: {
            id: editingTask.id,
            title: formData.title,
            ...(formData.dartboard && { dartboard: formData.dartboard }),
            ...(formData.status && { status: formData.status }),
            ...(formData.description && { description: formData.description }),
            ...(formData.assignee && { assignee: formData.assignee }),
            ...(formData.tags && formData.tags.length > 0 && { tags: formData.tags }),
            ...(formData.priority && { priority: formData.priority }),
            ...(formData.dueAt && { dueAt: formData.dueAt }),
          },
        };

        const res = await fetch(`/api/v1/project-management/dartai/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error.message || 'Failed to update task');
        }

        toast({
          title: 'Task Updated',
          description: 'Task has been updated successfully',
        });
      } else {
        // Create new task
        const payload: TaskCreatePayload = {
          item: {
            title: formData.title,
            ...(formData.dartboard && { dartboard: formData.dartboard }),
            ...(formData.status && { status: formData.status }),
            ...(formData.description && { description: formData.description }),
            ...(formData.assignee && { assignee: formData.assignee }),
            ...(formData.tags && formData.tags.length > 0 && { tags: formData.tags }),
            ...(formData.priority && { priority: formData.priority }),
            ...(formData.dueAt && { dueAt: formData.dueAt }),
          },
        };

        const res = await fetch('/api/v1/project-management/dartai/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error.message || 'Failed to create task');
        }

        toast({
          title: 'Task Created',
          description: 'Task has been created successfully',
        });
      }

      setCreateDialogOpen(false);
      setEditingTask(null);
      setFormData({
        title: '',
        dartboard: '',
        status: '',
        description: '',
        assignee: '',
        tags: [],
        priority: '',
        dueAt: '',
      });
      await loadTasks();
    } catch (error: unknown) {
      toast({
        title: editingTask ? 'Failed to update task' : 'Failed to create task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/v1/project-management/dartai/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to delete task');
      }

      toast({
        title: 'Task Deleted',
        description: 'Task has been deleted successfully',
      });

      await loadTasks();
    } catch (error: unknown) {
      toast({
        title: 'Failed to delete task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleMoveTask = async (taskId: string, direction: 'up' | 'down') => {
    const currentIndex = tasks.findIndex(t => t.id === taskId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    const targetTask = tasks[targetIndex];
    const beforeTaskId = direction === 'up' ? targetTask.id : null;
    const afterTaskId = direction === 'down' ? targetTask.id : null;

    try {
      const res = await fetch(`/api/v1/project-management/dartai/tasks/${taskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeTaskId,
          afterTaskId,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to move task');
      }

      await loadTasks();
    } catch (error: unknown) {
      toast({
        title: 'Failed to move task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Project Management" breadcrumbs={[{ label: 'Project Management' }]}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="Project Management" breadcrumbs={[{ label: 'Project Management' }]}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold">Authentication Required</h3>
            <p className="text-muted-foreground text-center">Please sign in to access Project Management</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (!connected) {
    return (
      <AppLayout title="Project Management" breadcrumbs={[{ label: 'Project Management' }]}>
        <Card>
          <CardHeader>
            <CardTitle>Connect Dart-AI</CardTitle>
            <CardDescription>Connect your Dart-AI account to start managing tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to connect your Dart-AI API token to use Project Management. Visit the{' '}
              <a href="/project-management/settings" className="text-primary underline">
                settings page
              </a>{' '}
              to connect.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Project Management" breadcrumbs={[{ label: 'Project Management' }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Project Management</h2>
            <p className="text-muted-foreground">Manage your Dart-AI projects, backlogs, and tasks</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTasks} disabled={tasksLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${tasksLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/project-management/settings'}>
              Settings
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Dartboards/Projects Section */}
        {dartboards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Projects / Dartboards
              </CardTitle>
              <CardDescription>Select a project to filter tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedDartboard || 'all'}
                  onValueChange={value => setSelectedDartboard(value === 'all' ? null : value)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {dartboards.map(dartboardTitle => (
                      <SelectItem key={dartboardTitle} value={dartboardTitle}>
                        {dartboardTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDartboard && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const dartboardTitle = dartboards.find(d => d === selectedDartboard);
                      if (dartboardTitle) {
                        setFormData(prev => ({ ...prev, dartboard: dartboardTitle }));
                        setCreateDialogOpen(true);
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task to {selectedDartboard}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {viewMode === 'backlog' ? 'Backlog' : 'Tasks'}
                  {selectedDartboard && (
                    <Badge variant="secondary">
                      {selectedDartboard}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {viewMode === 'backlog'
                    ? 'Tasks that need to be started'
                    : selectedDartboard
                      ? `Tasks in ${selectedDartboard}`
                      : 'All your tasks across all projects'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('all')}
                >
                  All Tasks
                </Button>
                <Button
                  variant={viewMode === 'backlog' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('backlog')}
                >
                  Backlog
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  {viewMode === 'backlog' ? 'No backlog tasks found' : 'No tasks found'}
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first task
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dartboard</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task, index) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleMoveTask(task.id, 'up')}
                            >
                              <GripVertical className="h-3 w-3" />
                            </Button>
                          )}
                          {index < filteredTasks.length - 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleMoveTask(task.id, 'down')}
                            >
                              <GripVertical className="h-3 w-3 rotate-180" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        {task.status && (
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{task.dartboard || '-'}</TableCell>
                      <TableCell>{task.assignee || (task.assignees && task.assignees.join(', ')) || '-'}</TableCell>
                      <TableCell>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTask(task);
                              setFormData({
                                title: task.title,
                                dartboard: task.dartboard || '',
                                status: task.status || '',
                                description: task.description || '',
                                assignee: task.assignee || '',
                                tags: task.tags || [],
                                priority: task.priority || '',
                                dueAt: task.dueAt || '',
                              });
                              setCreateDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DartAiChat
          connected={connected === true}
          onTaskAction={(action, data) => {
            console.log('Task action:', action, data);
            // Handle task actions from chat (e.g., create task, update status)
            if (action === 'create_task' && typeof data === 'object' && data !== null) {
              const taskData = data as Partial<TaskCreatePayload['item']>;
              setFormData({
                title: taskData.title || '',
                dartboard: taskData.dartboard || '',
                status: taskData.status || '',
                description: taskData.description || '',
                assignee: taskData.assignee || '',
                tags: taskData.tags || [],
                priority: taskData.priority || '',
                dueAt: taskData.dueAt || '',
              });
              setCreateDialogOpen(true);
            } else if (action === 'refresh_tasks') {
              loadTasks();
            }
          }}
        />

        <Dialog
          open={createDialogOpen}
          onOpenChange={open => {
            setCreateDialogOpen(open);
            if (!open) {
              setEditingTask(null);
              setFormData({
                title: '',
                dartboard: '',
                status: '',
                description: '',
                assignee: '',
                tags: [],
                priority: '',
                dueAt: '',
              });
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details' : 'Create a new task in Dart-AI'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Task title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dartboard">Dartboard</Label>
                  <Input
                    id="dartboard"
                    value={formData.dartboard}
                    onChange={e => setFormData(prev => ({ ...prev, dartboard: e.target.value }))}
                    placeholder="Project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    placeholder="e.g., unstarted, in-progress"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Task description (markdown supported)"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Input
                    id="assignee"
                    value={formData.assignee}
                    onChange={e => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                    placeholder="User email or name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueAt">Due Date</Label>
                  <Input
                    id="dueAt"
                    type="date"
                    value={formData.dueAt}
                    onChange={e => setFormData(prev => ({ ...prev, dueAt: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

