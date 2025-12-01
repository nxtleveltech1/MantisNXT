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
import { FileUp, RefreshCw } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface PricelistUploadWithSupplier extends PricelistUpload {
  supplier_name?: string;
}
import { useDashboardMetrics, usePricelistUploads } from '@/hooks/useNeonSpp';
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
    data: uploadsData,
    isLoading: uploadsLoading,
    error: uploadsError,
    refetch: refetchUploads,
  } = usePricelistUploads({ limit: 10 });

  // Ensure uploads is always an array and properly typed
  const uploads: PricelistUploadWithSupplier[] = Array.isArray(uploadsData) ? uploadsData : [];

  const loading = metricsLoading || uploadsLoading;

  const handleRefresh = () => {
    refetchMetrics();
    refetchUploads();
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
            className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700"
          >
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
            Received
          </Badge>
        );
      case 'validating':
        return (
          <Badge
            variant="outline"
            className="rounded-full border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-yellow-700"
          >
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            Validating
          </Badge>
        );
      case 'validated':
        return (
          <Badge
            variant="outline"
            className="rounded-full border-green-200 bg-green-50 px-2.5 py-0.5 text-green-700"
          >
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-600" />
            Validated
          </Badge>
        );
      case 'merged':
        return (
          <Badge className="rounded-full bg-green-600 px-2.5 py-0.5 text-white">
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
            Merged
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="rounded-full px-2.5 py-0.5">
            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
            Failed
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

  // Loading state
  if (loading && !metrics) {
    return <SkeletonDashboard />;
  }

  // Error state
  if (metricsError || uploadsError) {
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

      {/* Recent Uploads - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Recent Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <EmptyState
              icon={FileUp}
              title="No Uploads Yet"
              message="Start by uploading your first supplier pricelist to build your product catalog."
              action={() => handleNavigate('upload')}
              actionLabel="Upload Pricelist"
            />
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map(upload => (
                    <TableRow key={upload.upload_id}>
                      <TableCell className="font-medium">
                        {upload.supplier_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{upload.filename}</TableCell>
                      <TableCell className="text-sm">{formatDate(upload.received_at)}</TableCell>
                      <TableCell className="text-right">
                        {upload.row_count.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(upload.status)}</TableCell>
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
                {uploads.filter(u => u.status === 'merged').length}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">Merged uploads</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
