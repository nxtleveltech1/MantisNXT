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
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileUp,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
        setRecentUploads(uploadsData.data || [])
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
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Received</Badge>
      case 'validating':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Validating</Badge>
      case 'validated':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Validated</Badge>
      case 'merged':
        return <Badge variant="default" className="bg-green-100 text-green-800">Merged</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.total_suppliers || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active with uploads</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products in Catalog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.total_products.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">From all uploads</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Selected Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics?.selected_products.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Ready for stocking</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Selected Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(metrics?.selected_inventory_value || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total value on hand</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Uploads - Left 2/3 */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {recentUploads.length > 0 ? (
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
                    {recentUploads.map(upload => (
                      <TableRow key={upload.upload_id}>
                        <TableCell className="font-medium">
                          {upload.supplier_name}
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
                        <TableCell>
                          {getStatusBadge(upload.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileUp className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No uploads yet. Get started by uploading your first pricelist.
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
