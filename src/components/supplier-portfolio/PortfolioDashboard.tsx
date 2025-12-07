'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  DollarSign,
  TrendingUp,
  Upload,
  CheckCircle2,
  BarChart3,
  FileUp,
  ArrowRight,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Users,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import NumberTicker from '@/components/magicui/number-ticker';

interface DashboardMetrics {
  total_suppliers: number;
  total_products: number;
  selected_products: number;
  selected_inventory_value: number;
  new_products_count: number;
  recent_price_changes_count: number;
}

interface RecentUpload {
  upload_id: string;
  supplier_name: string;
  filename: string;
  received_at: Date;
  status: string;
  row_count: number;
  valid_rows?: number;
}

interface PortfolioDashboardProps {
  defaultTab?: string;
}

export function PortfolioDashboard({ defaultTab }: PortfolioDashboardProps) {
  // State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch metrics
      const metricsResponse = await fetch('/api/spp/dashboard/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(
          metricsData.data || {
            total_suppliers: 0,
            total_products: 0,
            selected_products: 0,
            selected_inventory_value: 0,
            new_products_count: 0,
            recent_price_changes_count: 0,
          }
        );
      }

      // Fetch recent uploads
      const uploadsResponse = await fetch('/api/spp/upload?limit=10');
      if (uploadsResponse.ok) {
        const uploadsData = await uploadsResponse.json();
        const uploads = uploadsData?.data?.uploads || uploadsData?.data || [];
        setRecentUploads(uploads);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton
  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return (
          <Badge
            variant="outline"
            className="gap-1.5 border-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1 text-white shadow-sm shadow-blue-200"
          >
            <Clock className="h-3 w-3" />
            Received
          </Badge>
        );
      case 'validating':
        return (
          <Badge
            variant="outline"
            className="gap-1.5 border-0 bg-gradient-to-r from-yellow-500 to-amber-500 px-3 py-1 text-white shadow-sm shadow-yellow-200"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Validating
          </Badge>
        );
      case 'validated':
        return (
          <Badge
            variant="outline"
            className="gap-1.5 border-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-white shadow-sm shadow-emerald-200"
          >
            <CheckCircle className="h-3 w-3" />
            Validated
          </Badge>
        );
      case 'merged':
        return (
          <Badge
            variant="default"
            className="gap-1.5 border-0 bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1 font-semibold text-white shadow-md shadow-green-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Merged
          </Badge>
        );
      case 'failed':
        return (
          <Badge
            variant="destructive"
            className="gap-1.5 border-0 bg-gradient-to-r from-red-600 to-rose-600 px-3 py-1 font-semibold text-white shadow-md shadow-red-300"
          >
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="px-3 py-1">
            {status}
          </Badge>
        );
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconClass = 'h-4 w-4 text-muted-foreground';

    switch (ext) {
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NXT-SPP Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Supplier Inventory Portfolio: Upload → Select → Stock
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics - Professional Gradient Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Suppliers Card */}
        <Card className="group relative overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-lg">
          <div className="from-chart-1/10 to-chart-1/5 absolute inset-0 bg-gradient-to-br via-transparent" />
          <div className="from-chart-1/20 absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
          <CardContent className="relative p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Active Suppliers</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    <NumberTicker value={metrics?.total_suppliers || 0} />
                  </span>
                </div>
              </div>
              <div className="from-chart-1 to-chart-1/80 shadow-chart-1/30 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="bg-chart-1/10 flex items-center gap-1 rounded-md px-2 py-1">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--chart-1)]" />
                <span className="font-semibold text-[var(--chart-1)]">+12%</span>
              </div>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Products in Catalog Card */}
        <Card className="group relative overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-lg">
          <div className="from-chart-2/10 to-chart-2/5 absolute inset-0 bg-gradient-to-br via-transparent" />
          <div className="from-chart-2/20 absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
          <CardContent className="relative p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Products in Catalog</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    <NumberTicker value={metrics?.total_products || 0} />
                  </span>
                </div>
              </div>
              <div className="from-chart-2 to-chart-2/80 shadow-chart-2/30 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="bg-chart-2/10 flex items-center gap-1 rounded-md px-2 py-1">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--chart-2)]" />
                <span className="font-semibold text-[var(--chart-2)]">+24%</span>
              </div>
              <span className="text-muted-foreground">from all uploads</span>
            </div>
          </CardContent>
        </Card>

        {/* Selected Products Card */}
        <Card className="group relative overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-lg">
          <div className="from-chart-3/10 to-chart-3/5 absolute inset-0 bg-gradient-to-br via-transparent" />
          <div className="from-chart-3/20 absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
          <CardContent className="relative p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Selected Products</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    <NumberTicker value={metrics?.selected_products || 0} />
                  </span>
                </div>
              </div>
              <div className="from-chart-3 to-chart-3/80 shadow-chart-3/30 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="bg-chart-3/10 flex items-center gap-1 rounded-md px-2 py-1">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--chart-3)]" />
                <span className="font-semibold text-[var(--chart-3)]">+8%</span>
              </div>
              <span className="text-muted-foreground">ready for stocking</span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Value Card */}
        <Card className="group relative overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-lg">
          <div className="from-chart-5/10 to-chart-5/5 absolute inset-0 bg-gradient-to-br via-transparent" />
          <div className="from-chart-5/20 absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
          <CardContent className="relative p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Inventory Value</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {formatCurrency(metrics?.selected_inventory_value || 0, 'GBP', true)}
                  </span>
                </div>
              </div>
              <div className="from-chart-5 to-chart-5/80 shadow-chart-5/30 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="bg-chart-5/10 flex items-center gap-1 rounded-md px-2 py-1">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--chart-5)]" />
                <span className="font-semibold text-[var(--chart-5)]">+15%</span>
              </div>
              <span className="text-muted-foreground">total value on hand</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Uploads - Left 2/3 */}
        <Card className="border-border col-span-2 shadow-lg">
          <CardHeader className="border-border border-b bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
                  <FileUp className="h-5 w-5 text-white" />
                </div>
                Recent Uploads
              </CardTitle>
              <Badge variant="secondary" className="px-3 py-1 font-semibold">
                {recentUploads.length} uploads
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {recentUploads.length > 0 ? (
                <div className="overflow-hidden rounded-b-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 border-border border-b-2">
                        <TableHead className="text-foreground text-xs font-semibold tracking-wide uppercase">
                          Supplier
                        </TableHead>
                        <TableHead className="text-foreground text-xs font-semibold tracking-wide uppercase">
                          File
                        </TableHead>
                        <TableHead className="text-foreground text-xs font-semibold tracking-wide uppercase">
                          Date
                        </TableHead>
                        <TableHead className="text-foreground text-right text-xs font-semibold tracking-wide uppercase">
                          Rows
                        </TableHead>
                        <TableHead className="text-foreground text-xs font-semibold tracking-wide uppercase">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUploads.map((upload, index) => (
                        <TableRow
                          key={upload.upload_id}
                          className={cn(
                            'hover:bg-accent/50 group border-border/50 cursor-pointer border-b transition-colors',
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                          )}
                        >
                          <TableCell className="text-foreground py-4 font-semibold">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white shadow-sm">
                                {upload.supplier_name.charAt(0).toUpperCase()}
                              </div>
                              {upload.supplier_name}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex max-w-[250px] items-center gap-2">
                              {getFileIcon(upload.filename)}
                              <span className="truncate text-sm" title={upload.filename}>
                                {upload.filename}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground py-4 text-sm">
                            <div className="flex flex-col">
                              <span className="text-foreground font-medium">
                                {new Date(upload.received_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-xs">
                                {new Date(upload.received_at).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-foreground font-bold">
                                {upload.row_count.toLocaleString()}
                              </span>
                              {upload.valid_rows !== undefined && (
                                <span className="text-muted-foreground text-xs">
                                  {upload.valid_rows} valid
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">{getStatusBadge(upload.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900">
                    <FileUp className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-foreground mb-2 text-lg font-semibold">No uploads yet</h3>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    Get started by uploading your first supplier pricelist to begin building your
                    inventory portfolio.
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions - Right 1/3 */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="default">
              <Upload className="mr-2 h-4 w-4" />
              Upload Pricelist
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Manage Selections
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Stock Reports
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>

            {/* Activity Summary */}
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-3 text-sm font-medium">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">New Products</div>
                    <div className="text-muted-foreground">
                      {metrics?.new_products_count || 0} new products added
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-yellow-600" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">Price Changes</div>
                    <div className="text-muted-foreground">
                      {metrics?.recent_price_changes_count || 0} products with price updates
                    </div>
                  </div>
                </div>
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
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <div className="font-medium">Upload</div>
              <div className="mt-1 text-2xl font-bold text-green-600">
                {recentUploads.filter(u => u.status === 'merged').length}
              </div>
              <div className="text-muted-foreground text-xs">Complete</div>
            </div>

            <ArrowRight className="text-muted-foreground h-8 w-8" />

            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle2 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="font-medium">Select</div>
              <div className="mt-1 text-2xl font-bold text-purple-600">
                {metrics?.selected_products.toLocaleString() || 0}
              </div>
              <div className="text-muted-foreground text-xs">Products selected</div>
            </div>

            <ArrowRight className="text-muted-foreground h-8 w-8" />

            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <div className="font-medium">Stock</div>
              <div className="mt-1 text-2xl font-bold text-orange-600">
                {formatCurrency(metrics?.selected_inventory_value || 0, 'GBP', true)}
              </div>
              <div className="text-muted-foreground text-xs">Inventory value</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
