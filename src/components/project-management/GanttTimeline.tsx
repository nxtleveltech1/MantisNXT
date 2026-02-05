'use client';

import { useMemo } from 'react';

export type TimelineTask = {
  id: string;
  title: string;
  start?: string | null;
  end?: string | null;
};

export function GanttTimeline({ tasks }: { tasks: TimelineTask[] }) {
  const { minDate, maxDate } = useMemo(() => {
    const dates = tasks.flatMap(task => [task.start, task.end]).filter(Boolean) as string[];
    if (dates.length === 0) {
      const today = new Date();
      return { minDate: today, maxDate: new Date(today.getTime() + 7 * 86400000) };
    }
    const min = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const max = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return { minDate: min, maxDate: max };
  }, [tasks]);

  const range = Math.max(1, maxDate.getTime() - minDate.getTime());

  return (
    <div className="space-y-3">
      {tasks.map(task => {
        const start = task.start ? new Date(task.start).getTime() : minDate.getTime();
        const end = task.end ? new Date(task.end).getTime() : start + 86400000;
        const left = ((start - minDate.getTime()) / range) * 100;
        const width = Math.max(2, ((end - start) / range) * 100);

        return (
          <div key={task.id} className="flex items-center gap-3">
            <div className="w-48 truncate text-sm text-muted-foreground">{task.title}</div>
            <div className="relative h-3 flex-1 rounded bg-muted">
              <div
                className="absolute h-3 rounded bg-primary/70"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
