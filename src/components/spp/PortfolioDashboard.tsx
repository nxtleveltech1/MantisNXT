'use client';

/**
 * Enhanced Portfolio Dashboard with React Query integration
 * Real-time metrics and upload history from Neon database
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileUp, RefreshCw, Activity } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useDashboardMetrics, usePricelistUploads, useRecentActivity } from '@/hooks/useNeonSpp';
import { MetricsDashboard } from './MetricsDashboard';
import { SkeletonDashboard } from './LoadingStates';
import { ConnectionError, EmptyState } from './ErrorStates';

interface PortfolioDashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export function PortfolioDashboard({ onNavigateToTab }: PortfolioDashboardProps) {
  const router = useRouter();

  // React Query hooks
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useDashboardMetrics();
  const {
    isLoading: uploadsLoading,
    error: uploadsError,
    refetch: refetchUploads,
  } = usePricelistUploads({ limit: 10 });
  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useRecentActivity(25);

  const activities = Array.isArray(activityData) ? activityData : [];

  const loading = metricsLoading || uploadsLoading || activityLoading;

  const handleRefresh = () => {
    refetchMetrics();
    refetchUploads();
    refetchActivity();
  };

  const handleNavigate = (tab: string) => {
    if (onNavigateToTab) {
      onNavigateToTab(tab);
    } else {
      router.push(`/nxt-spp?tab=${tab}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return (
          <Badge
            variant="outline"
            className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
          >
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
            Received
          </Badge>
        );
      case 'validating':
        return (
          <Badge
            variant="outline"
            className="rounded-full border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
          >
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            Validating
          </Badge>
        );
      case 'validated':
        return (
          <Badge
            variant="outline"
            className="rounded-full border-green-200 bg-green-50 px-2.5 py-0.5 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
          >
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-600" />
            Validated
          </Badge>
        );
      case 'merged':
      case 'completed':
        return (
          <Badge className="rounded-full bg-green-600 px-2.5 py-0.5 text-white dark:bg-green-700">
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
            {status === 'completed' ? 'Completed' : 'Merged'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="rounded-full px-2.5 py-0.5">
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
            Failed
          </Badge>
        );
      case 'started':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
            {status}
          </Badge>
        );
    }
  };

  const getTypeLabel = (type: string, source: string) => {
    if (type === 'upload') return 'Upload';
    if (source === 'JSON Feed Sync') return 'JSON Sync';
    if (source === 'PlusPortal Sync') return 'PlusPortal';
    return source || type;
  };

  // Loading state
  if (loading && !metrics) {
    return <SkeletonDashboard />;
  }

  // Error state
  if (metricsError || uploadsError || activityError) {
    return <ConnectionError onRetry={handleRefresh} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor your supplier portfolio and catalog updates
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <MetricsDashboard metrics={metrics || null} loading={loading} />

      {/* Recent Activity - uploads + syncs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            File uploads and JSON/PlusPortal syncs. Updates every 30s.
          </p>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Activity Yet"
              message="Upload a pricelist or run a sync from a supplier profile to see activity here."
              action={() => handleNavigate('upload')}
              actionLabel="Upload Pricelist"
            />
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>File / Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map(item => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell className="font-medium">
                        {getTypeLabel(item.type, item.source)}
                      </TableCell>
                      <TableCell className="font-medium">{item.supplier_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.source}</TableCell>
                      <TableCell className="text-sm">{formatDate(item.timestamp)}</TableCell>
                      <TableCell className="text-right">
                        {item.row_count.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            <div className="flex-1 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <FileUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="mb-1 text-lg font-semibold">Upload</div>
              <div className="text-3xl font-bold">
                {activities.filter(a => a.type === 'upload' && a.status === 'merged').length}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">Merged uploads</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
