"use client"

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
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileUp,
  ArrowRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useDashboardMetrics, usePricelistUploads, useActiveSelection } from '@/hooks/useNeonSpp';
import { MetricsDashboard } from './MetricsDashboard';
import { SkeletonDashboard } from './LoadingStates';
import { ConnectionError, EmptyState } from './ErrorStates';

interface PortfolioDashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export function PortfolioDashboard({ onNavigateToTab }: PortfolioDashboardProps) {
  const router = useRouter();

  // React Query hooks
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useDashboardMetrics();
  const { data: uploads, isLoading: uploadsLoading, error: uploadsError, refetch: refetchUploads } = usePricelistUploads({ limit: 10 });
  const { data: activeSelection, isLoading: selectionLoading } = useActiveSelection();

  const loading = metricsLoading || uploadsLoading || selectionLoading;

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
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Received
          </Badge>
        );
      case 'validating':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Validating
          </Badge>
        );
      case 'validated':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Validated
          </Badge>
        );
      case 'merged':
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Merged
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <p className="text-muted-foreground mt-1">
            Monitor your supplier portfolio and inventory selections
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Active Selection Alert */}
      {activeSelection && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-purple-100">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 mb-1">Active Selection</h3>
                <p className="text-sm text-purple-700">
                  <strong>{activeSelection.selection_name}</strong> is currently active.
                  {activeSelection.description && ` ${activeSelection.description}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('stock-reports')}
                className="flex-shrink-0"
              >
                View Reports
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <MetricsDashboard metrics={metrics || null} loading={loading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads - Left 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!uploads || uploads.length === 0 ? (
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
                    {uploads.map((upload) => (
                      <TableRow key={upload.upload_id}>
                        <TableCell className="font-medium">
                          {/* @ts-ignore - supplier_name added by view */}
                          {upload.supplier_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {upload.filename}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(upload.received_at)}
                        </TableCell>
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

        {/* Quick Actions - Right 1/3 */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="default"
              onClick={() => handleNavigate('upload')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Pricelist
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleNavigate('selections')}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Manage Selections
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleNavigate('stock-reports')}
              disabled={!activeSelection}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Stock Reports
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>

            {/* Activity Summary */}
            <div className="pt-4 border-t mt-6">
              <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {metrics && metrics.new_products_count > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">New Products</div>
                      <div className="text-muted-foreground">
                        {metrics.new_products_count} new products added
                      </div>
                    </div>
                  </div>
                )}

                {metrics && metrics.recent_price_changes_count > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">Price Changes</div>
                      <div className="text-muted-foreground">
                        {metrics.recent_price_changes_count} products updated
                      </div>
                    </div>
                  </div>
                )}

                {uploads && uploads.filter(u => u.status === 'merged').length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">Recent Merges</div>
                      <div className="text-muted-foreground">
                        {uploads.filter(u => u.status === 'merged').length} successful uploads
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Progress Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <div className="font-medium">Upload</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {uploads?.filter(u => u.status === 'merged').length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>

            <ArrowRight className="h-8 w-8 text-muted-foreground" />

            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="font-medium">Select</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {metrics?.selected_products.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">Products selected</div>
            </div>

            <ArrowRight className="h-8 w-8 text-muted-foreground" />

            <div className="flex-1 text-center">
              <div className={cn(
                'w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2',
                activeSelection ? 'bg-orange-100' : 'bg-gray-100'
              )}>
                <BarChart3 className={cn(
                  'h-8 w-8',
                  activeSelection ? 'text-orange-600' : 'text-gray-400'
                )} />
              </div>
              <div className="font-medium">Stock</div>
              <div className={cn(
                'text-2xl font-bold mt-1',
                activeSelection ? 'text-orange-600' : 'text-gray-400'
              )}>
                {activeSelection ? (metrics?.selected_products || 0) : '-'}
              </div>
              <div className="text-xs text-muted-foreground">
                {activeSelection ? 'Active' : 'No selection'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
