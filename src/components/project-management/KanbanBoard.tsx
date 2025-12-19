'use client';

import React, { useMemo } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  status?: string;
  dartboard?: string;
  assignee?: string;
  assignees?: string[];
  tags?: string[];
  priority?: string;
  dueAt?: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (status: string) => void;
}

export function KanbanBoard({ tasks, onTaskClick, onCreateTask }: KanbanBoardProps) {
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      const status = task.status || 'unstarted';
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(task);
    });
    
    // Ensure common statuses exist even if empty
    const commonStatuses = ['unstarted', 'in-progress', 'in review', 'completed', 'done'];
    commonStatuses.forEach(status => {
      if (!grouped[status]) {
        grouped[status] = [];
      }
    });
    
    return grouped;
  }, [tasks]);

  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('completed') || normalized.includes('done')) {
      return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800';
    }
    if (normalized.includes('progress') || normalized.includes('working')) {
      return 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800';
    }
    if (normalized.includes('review') || normalized.includes('testing')) {
      return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800';
    }
    return 'bg-gray-100 dark:bg-gray-900/20 border-gray-300 dark:border-gray-800';
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const normalized = priority.toLowerCase();
    const variant = normalized === 'critical' || normalized === 'high' ? 'destructive' : 'secondary';
    return <Badge variant={variant} className="text-xs">{priority}</Badge>;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        <Card key={status} className="min-w-[300px] flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold capitalize flex items-center justify-between">
              <span>{status.replace(/-/g, ' ')}</span>
              <Badge variant="secondary" className="text-xs">
                {statusTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusTasks.map(task => (
              <Card
                key={task.id}
                className={`cursor-pointer transition-all hover:shadow-md ${getStatusColor(status)}`}
                onClick={() => onTaskClick?.(task)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(task.priority)}
                    {task.assignee && (
                      <Badge variant="outline" className="text-xs">
                        {task.assignee}
                      </Badge>
                    )}
                    {task.dueAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {task.tags.slice(0, 3).map((tag, idx) => (
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
              onClick={() => onCreateTask?.(status)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

