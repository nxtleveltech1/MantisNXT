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
  FileUp,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
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
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useDashboardMetrics();
  const { data: uploadsData, isLoading: uploadsLoading, error: uploadsError, refetch: refetchUploads } = usePricelistUploads({ limit: 10 });

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
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-full px-2.5 py-0.5">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-1.5" />
            Received
          </Badge>
        );
      case 'validating':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-full px-2.5 py-0.5">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Validating
          </Badge>
        );
      case 'validated':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-full px-2.5 py-0.5">
            <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5" />
            Validated
          </Badge>
        );
      case 'merged':
        return (
          <Badge className="bg-green-600 text-white rounded-full px-2.5 py-0.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1.5" />
            Merged
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="rounded-full px-2.5 py-0.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1.5" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline" className="rounded-full px-2.5 py-0.5">{status}</Badge>;
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm">Monitor your supplier portfolio and catalog updates</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm" 
          disabled={loading}
          className="border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <MetricsDashboard metrics={metrics || null} loading={loading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads - Left 2/3 */}
        <Card className="lg:col-span-2 bg-white border border-gray-200 shadow-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FileUp className="h-5 w-5 text-gray-600" />
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
                    <TableRow className="border-b border-gray-200 hover:bg-transparent">
                      <TableHead className="font-semibold text-gray-900">Supplier</TableHead>
                      <TableHead className="font-semibold text-gray-900">File</TableHead>
                      <TableHead className="font-semibold text-gray-900">Date</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Rows</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map((upload) => (
                      <TableRow 
                        key={upload.upload_id}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        <TableCell className="font-medium text-gray-900">
                          {upload.supplier_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-gray-700">
                          {upload.filename}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(upload.received_at)}
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
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

        {/* Right Column - Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-between bg-gray-900 hover:bg-gray-800 text-white shadow-md"
                onClick={() => handleNavigate('upload')}
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload Pricelist</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploads.filter(u => u.status === 'merged').length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-gray-900">Recent Merges</div>
                      <div className="text-gray-600">
                        {uploads.filter(u => u.status === 'merged').length} successful uploads
                      </div>
                    </div>
                  </div>
                )}

                {metrics && metrics.new_products_count > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-gray-900">New Products</div>
                      <div className="text-gray-600">
                        {metrics.new_products_count} new products added
                      </div>
                    </div>
                  </div>
                )}

                {metrics && metrics.recent_price_changes_count > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-gray-900">Price Changes</div>
                      <div className="text-gray-600">
                        {metrics.recent_price_changes_count} products updated
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workflow */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Upload</div>
              <div className="text-3xl font-bold text-gray-900">
                {uploads.filter(u => u.status === 'merged').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Merged uploads</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
