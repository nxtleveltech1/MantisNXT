'use client';

import { Badge } from '@/components/ui/badge';

export function WorkloadHeatmap({ rows, users }: { rows: Array<{ user_id: string; task_count: number }>; users: Record<string, string> }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-muted-foreground">No workload data yet.</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.user_id} className="flex items-center justify-between rounded border p-3">
          <div className="text-sm font-medium">{users[row.user_id] || row.user_id}</div>
          <Badge variant={row.task_count > 10 ? 'destructive' : 'secondary'}>{row.task_count} tasks</Badge>
        </div>
      ))}
    </div>
  );
}
