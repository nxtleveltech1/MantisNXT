'use client';

import React, { useMemo } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Task {
  task_id: string;
  title: string;
  status_id?: string;
  status_name?: string;
  status_type?: string;
  assignees?: string[];
  labels?: string[];
  priority?: string;
  due_date?: string;
}

interface Status {
  status_id: string;
  name: string;
  color?: string | null;
}

interface KanbanBoardProps {
  tasks: Task[];
  statuses: Status[];
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (statusId: string) => void;
}

export function KanbanBoard({ tasks, statuses, onTaskClick, onCreateTask }: KanbanBoardProps) {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    statuses.forEach(status => {
      grouped[status.status_id] = [];
    });

    tasks.forEach(task => {
      const statusId = task.status_id || statuses[0]?.status_id || 'unassigned';
      if (!grouped[statusId]) {
        grouped[statusId] = [];
      }
      grouped[statusId].push(task);
    });

    return grouped;
  }, [tasks, statuses]);

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const normalized = priority.toLowerCase();
    const variant = normalized === 'critical' || normalized === 'high' ? 'destructive' : 'secondary';
    return <Badge variant={variant} className="text-xs">{priority}</Badge>;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map(status => {
        const statusTasks = tasksByStatus[status.status_id] || [];
        return (
        <Card key={status.status_id} className="min-w-[300px] flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold capitalize flex items-center justify-between">
              <span>{status.name}</span>
              <Badge variant="secondary" className="text-xs">
                {statusTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusTasks.map(task => (
              <Card
                key={task.task_id}
                className="cursor-pointer transition-all hover:shadow-md"
                style={{
                  borderColor: status.color || undefined,
                }}
                onClick={() => onTaskClick?.(task)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(task.priority)}
                    {task.assignees && task.assignees.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {task.assignees.slice(0, 2).join(', ')}
                      </Badge>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {task.labels && task.labels.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {task.labels.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => onCreateTask?.(status.status_id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Button>
          </CardContent>
        </Card>
      )})}
    </div>
  );
}



