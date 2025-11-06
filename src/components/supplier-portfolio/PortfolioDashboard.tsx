"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
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
  ShoppingCart,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import NumberTicker from '@/components/magicui/number-ticker'

interface DashboardMetrics {
  total_suppliers: number
  total_products: number
  selected_products: number
  selected_inventory_value: number
  new_products_count: number
  recent_price_changes_count: number
}

interface RecentUpload {
  upload_id: string
  supplier_name: string
  filename: string
  received_at: Date
  status: string
  row_count: number
  valid_rows?: number
}

interface PortfolioDashboardProps {
  defaultTab?: string
}

export function PortfolioDashboard({ defaultTab }: PortfolioDashboardProps) {
  // State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch metrics
      const metricsResponse = await fetch('/api/spp/dashboard/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.data || {
          total_suppliers: 0,
          total_products: 0,
          selected_products: 0,
          selected_inventory_value: 0,
          new_products_count: 0,
          recent_price_changes_count: 0,
        })
      }

      // Fetch recent uploads
      const uploadsResponse = await fetch('/api/spp/upload?limit=10')
      if (uploadsResponse.ok) {
        const uploadsData = await uploadsResponse.json()
        const uploads = uploadsData?.data?.uploads || uploadsData?.data || []
        setRecentUploads(uploads)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

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
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm shadow-blue-200 px-3 py-1 gap-1.5"
          >
            <Clock className="h-3 w-3" />
            Received
          </Badge>
        )
      case 'validating':
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-sm shadow-yellow-200 px-3 py-1 gap-1.5"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Validating
          </Badge>
        )
      case 'validated':
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm shadow-emerald-200 px-3 py-1 gap-1.5"
          >
            <CheckCircle className="h-3 w-3" />
            Validated
          </Badge>
        )
      case 'merged':
        return (
          <Badge
            variant="default"
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-md shadow-green-300 px-3 py-1 gap-1.5 font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Merged
          </Badge>
        )
      case 'failed':
        return (
          <Badge
            variant="destructive"
            className="bg-gradient-to-r from-red-600 to-rose-600 text-white border-0 shadow-md shadow-red-300 px-3 py-1 gap-1.5 font-semibold"
          >
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="px-3 py-1">
            {status}
          </Badge>
        )
    }
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const iconClass = "h-4 w-4 text-muted-foreground"

    switch (ext) {
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className={iconClass} />
      default:
        return <FileText className={iconClass} />
    }
  }

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
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics - Professional Gradient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Suppliers Card */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-transparent to-chart-1/5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chart-1/20 to-transparent rounded-full blur-2xl" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Active Suppliers</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    <NumberTicker value={metrics?.total_suppliers || 0} />
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-chart-1 to-chart-1/80 flex items-center justify-center shadow-lg shadow-chart-1/30 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-chart-1/10">
                <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-1))]" />
                <span className="text-[hsl(var(--chart-1))] font-semibold">+12%</span>
              </div>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Products in Catalog Card */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-2/10 via-transparent to-chart-2/5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chart-2/20 to-transparent rounded-full blur-2xl" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Products in Catalog</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    <NumberTicker value={metrics?.total_products || 0} />
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-chart-2 to-chart-2/80 flex items-center justify-center shadow-lg shadow-chart-2/30 group-hover:scale-110 transition-transform duration-300">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-chart-2/10">
                <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-2))]" />
                <span className="text-[hsl(var(--chart-2))] font-semibold">+24%</span>
              </div>
              <span className="text-muted-foreground">from all uploads</span>
            </div>
          </CardContent>
        </Card>

        {/* Selected Products Card */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-3/10 via-transparent to-chart-3/5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chart-3/20 to-transparent rounded-full blur-2xl" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Selected Products</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    <NumberTicker value={metrics?.selected_products || 0} />
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-chart-3 to-chart-3/80 flex items-center justify-center shadow-lg shadow-chart-3/30 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-chart-3/10">
                <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-3))]" />
                <span className="text-[hsl(var(--chart-3))] font-semibold">+8%</span>
              </div>
              <span className="text-muted-foreground">ready for stocking</span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Value Card */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-5/10 via-transparent to-chart-5/5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chart-5/20 to-transparent rounded-full blur-2xl" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {formatCurrency(metrics?.selected_inventory_value || 0, 'GBP', true)}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-chart-5 to-chart-5/80 flex items-center justify-center shadow-lg shadow-chart-5/30 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-chart-5/10">
                <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-5))]" />
                <span className="text-[hsl(var(--chart-5))] font-semibold">+15%</span>
              </div>
              <span className="text-muted-foreground">total value on hand</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Uploads - Left 2/3 */}
        <Card className="col-span-2 border-border shadow-lg">
          <CardHeader className="border-b border-border bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
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
                <div className="rounded-b-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2 border-border">
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
                          Supplier
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
                          File
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
                          Date
                        </TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wide text-foreground">
                          Rows
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUploads.map((upload, index) => (
                        <TableRow
                          key={upload.upload_id}
                          className={cn(
                            "hover:bg-accent/50 transition-colors cursor-pointer group border-b border-border/50",
                            index % 2 === 0 ? "bg-background" : "bg-muted/20"
                          )}
                        >
                          <TableCell className="font-semibold text-foreground py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {upload.supplier_name.charAt(0).toUpperCase()}
                              </div>
                              {upload.supplier_name}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2 max-w-[250px]">
                              {getFileIcon(upload.filename)}
                              <span className="truncate text-sm" title={upload.filename}>
                                {upload.filename}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
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
                          <TableCell className="text-right py-4">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-foreground">
                                {upload.row_count.toLocaleString()}
                              </span>
                              {upload.valid_rows !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {upload.valid_rows} valid
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {getStatusBadge(upload.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 flex items-center justify-center mb-4">
                    <FileUp className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No uploads yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Get started by uploading your first supplier pricelist to begin building your inventory portfolio.
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
              <Upload className="h-4 w-4 mr-2" />
              Upload Pricelist
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Manage Selections
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Stock Reports
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>

            {/* Activity Summary */}
            <div className="pt-4 border-t mt-6">
              <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">New Products</div>
                    <div className="text-muted-foreground">
                      {metrics?.new_products_count || 0} new products added
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5" />
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
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <div className="font-medium">Upload</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {recentUploads.filter(u => u.status === 'merged').length}
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
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <div className="font-medium">Stock</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(metrics?.selected_inventory_value || 0, 'GBP', true)}
              </div>
              <div className="text-xs text-muted-foreground">Inventory value</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
