'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export type PmTaskRow = {
  task_id: string;
  title: string;
  status_name?: string | null;
  status_type?: string | null;
  priority?: string | null;
  due_date?: string | null;
  assignees?: string[];
  labels?: string[];
};

export function TaskListTable({ tasks }: { tasks: PmTaskRow[] }) {
  if (!tasks || tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">No tasks yet.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assignees</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Labels</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map(task => (
          <TableRow key={task.task_id}>
            <TableCell className="font-medium">{task.title}</TableCell>
            <TableCell>
              {task.status_name ? <Badge variant="secondary">{task.status_name}</Badge> : '-'}
            </TableCell>
            <TableCell>{task.priority || '-'}</TableCell>
            <TableCell>{task.assignees?.length ? task.assignees.join(', ') : '-'}</TableCell>
            <TableCell>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {task.labels?.slice(0, 3).map(label => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
                {(!task.labels || task.labels.length === 0) && '-'}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
