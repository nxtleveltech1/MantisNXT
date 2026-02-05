'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProjectSummaryCards({ overview }: { overview?: { projects?: { total?: number; active?: number }; tasks?: { total?: number; completed?: number; overdue?: number } } }) {
  const projectTotal = overview?.projects?.total ?? 0;
  const projectActive = overview?.projects?.active ?? 0;
  const taskTotal = overview?.tasks?.total ?? 0;
  const taskCompleted = overview?.tasks?.completed ?? 0;
  const taskOverdue = overview?.tasks?.overdue ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{projectTotal}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{projectActive}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Open Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{taskTotal}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-red-600">{taskOverdue}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Completed Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-green-600">{taskCompleted}</div>
        </CardContent>
      </Card>
    </div>
  );
}
