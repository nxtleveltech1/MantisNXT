"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Download,
  RefreshCw,
  Filter,
  Info,
  Loader2,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { NxtSoh, InventorySelection } from '@/types/nxt-spp'

interface ISSohReportsProps {
  onExport?: (data: NxtSoh[], format: 'csv' | 'excel') => void
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const ALL_SUPPLIERS_VALUE = '__all-suppliers__'
const ALL_LOCATIONS_VALUE = '__all-locations__'

export function ISSohReports({ onExport }: ISSohReportsProps) {
  // State
  const [sohData, setSohData] = useState<NxtSoh[]>([])
  const [activeSelection, setActiveSelection] = useState<InventorySelection | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filters
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Metrics
  const [metrics, setMetrics] = useState({
    totalValue: 0,
    totalItems: 0,
    supplierCount: 0,
    locationCount: 0,
    lowStockCount: 0,
  })

  // Auto-refresh timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchData(true) // Silent refresh
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [loading, refreshing])

  // Fetch active selection
  const fetchActiveSelection = useCallback(async () => {
    try {
      const response = await fetch('/api/core/selections/active')
      if (!response.ok) throw new Error('Failed to fetch active selection')

      const result = await response.json()
      setActiveSelection(result.data)
      return result.data
    } catch (err) {
      console.error('Failed to fetch active selection:', err)
      return null
    }
  }, [])

  // Fetch NXT SOH data
  const fetchSohData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (supplierFilter) params.append('supplier_ids', supplierFilter)
      if (locationFilter) params.append('location_ids', locationFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/serve/nxt-soh?${params}`)
      if (!response.ok) throw new Error('Failed to fetch NXT SOH data')

      const result = await response.json()

      // Handle warning if no active selection
      if (result.warning) {
        setError(result.warning)
        setSohData([])
        setMetrics({
          totalValue: 0,
          totalItems: 0,
          supplierCount: 0,
          locationCount: 0,
          lowStockCount: 0,
        })
        return
      }

      const data: NxtSoh[] = result.data || []
      setSohData(data)
      setLastUpdated(new Date())

      // Calculate metrics
      const totalValue = data.reduce((sum, item) => sum + item.total_value, 0)
      const totalItems = data.reduce((sum, item) => sum + item.qty_on_hand, 0)
      const supplierCount = new Set(data.map(item => item.supplier_id)).size
      const locationCount = new Set(data.map(item => item.location_id)).size
      const lowStockCount = data.filter(item => item.qty_on_hand < 10).length

      setMetrics({ totalValue, totalItems, supplierCount, locationCount, lowStockCount })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supplierFilter, locationFilter, searchTerm])

  // Initial data fetch
  const fetchData = useCallback(async (silent = false) => {
    const selection = await fetchActiveSelection()
    await fetchSohData(silent)
  }, [fetchActiveSelection, fetchSohData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get unique suppliers and locations for filters
  const uniqueSuppliers = React.useMemo(() => {
    const suppliers = new Map<string, string>()
    sohData.forEach(item => suppliers.set(item.supplier_id, item.supplier_name))
    return Array.from(suppliers.entries()).map(([id, name]) => ({ id, name }))
  }, [sohData])

  const uniqueLocations = React.useMemo(() => {
    const locations = new Map<string, string>()
    sohData.forEach(item => locations.set(item.location_id, item.location_name))
    return Array.from(locations.entries()).map(([id, name]) => ({ id, name }))
  }, [sohData])

  // Chart data transformations
  const supplierChartData = React.useMemo(() => {
    const grouped = sohData.reduce((acc, item) => {
      const existing = acc.find(g => g.supplier_name === item.supplier_name)
      if (existing) {
        existing.quantity += item.qty_on_hand
        existing.value += item.total_value
      } else {
        acc.push({
          supplier_name: item.supplier_name,
          quantity: item.qty_on_hand,
          value: item.total_value,
        })
      }
      return acc
    }, [] as Array<{ supplier_name: string; quantity: number; value: number }>)

    return grouped.sort((a, b) => b.value - a.value).slice(0, 10)
  }, [sohData])

  const valueDistributionData = React.useMemo(() => {
    return supplierChartData.map(item => ({
      name: item.supplier_name,
      value: item.value,
    }))
  }, [supplierChartData])

  // Export handlers
  const handleExport = (format: 'csv' | 'excel') => {
    if (onExport) {
      onExport(sohData, format)
    } else {
      // Default CSV export
      const headers = ['Supplier', 'Product', 'SKU', 'Location', 'Quantity', 'Unit Cost', 'Total Value', 'Currency', 'As of Date']
      const rows = sohData.map(item => [
        item.supplier_name,
        item.product_name,
        item.supplier_sku,
        item.location_name,
        item.qty_on_hand.toString(),
        item.unit_cost.toString(),
        item.total_value.toString(),
        item.currency,
        formatDate(item.as_of_ts)
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nxt-soh-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Loading skeleton
  if (loading && sohData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Selection Banner */}
      {activeSelection ? (
        <Alert className="bg-blue-50 border-blue-200">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong className="text-blue-900">Active Selection:</strong>{' '}
              <span className="text-blue-700">{activeSelection.selection_name}</span>
              {activeSelection.metrics && (
                <span className="text-blue-600 ml-2">
                  ({activeSelection.metrics.item_count} products from {activeSelection.metrics.supplier_count} suppliers)
                </span>
              )}
            </div>
            {lastUpdated && (
              <div className="text-xs text-blue-600">
                Last updated: {formatDate(lastUpdated)}
              </div>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>No Active Selection:</strong> Create and activate an inventory selection to view stock data.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Selected inventory</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.totalItems.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Units on hand</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.supplierCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active suppliers</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.locationCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Stock locations</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.lowStockCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Below threshold</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Filters Row */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search" className="text-sm">Search Product / SKU</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search product name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-[200px] space-y-2">
                <Label htmlFor="supplier-filter" className="text-sm">Supplier</Label>
                <Select
                  value={supplierFilter || ALL_SUPPLIERS_VALUE}
                  onValueChange={(value) =>
                    setSupplierFilter(value === ALL_SUPPLIERS_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger id="supplier-filter">
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SUPPLIERS_VALUE}>All suppliers</SelectItem>
                    {uniqueSuppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[200px] space-y-2">
                <Label htmlFor="location-filter" className="text-sm">Location</Label>
                <Select
                  value={locationFilter || ALL_LOCATIONS_VALUE}
                  onValueChange={(value) =>
                    setLocationFilter(value === ALL_LOCATIONS_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger id="location-filter">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LOCATIONS_VALUE}>All locations</SelectItem>
                    {uniqueLocations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSohData()}
                disabled={loading || refreshing}
                className="self-end"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchSohData()} disabled={loading || refreshing}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={sohData.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={sohData.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>

              {(supplierFilter || locationFilter || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSupplierFilter('')
                    setLocationFilter('')
                    setSearchTerm('')
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && sohData.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Stock Data</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {activeSelection
                ? 'No stock records found for selected products. Try adjusting filters or add stock data.'
                : 'Create and activate an inventory selection to view stock data.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts and Table */}
      {sohData.length > 0 && (
        <Tabs defaultValue="bar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bar">Stock by Supplier</TabsTrigger>
            <TabsTrigger value="pie">Value Distribution</TabsTrigger>
            <TabsTrigger value="table">Detailed Table</TabsTrigger>
          </TabsList>

          {/* Bar Chart */}
          <TabsContent value="bar">
            <Card>
              <CardHeader>
                <CardTitle>Stock Quantity by Supplier (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={supplierChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="supplier_name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <div className="font-medium mb-1">{data.supplier_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {data.quantity.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Value: {formatCurrency(data.value)}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="quantity" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pie Chart */}
          <TabsContent value="pie">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value Distribution (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={valueDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {valueDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0]
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <div className="font-medium mb-1">{data.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(data.value as number)}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Table */}
          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Stock Report ({sohData.length} items)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sohData.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="font-medium">{item.supplier_name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">{item.product_name}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.supplier_sku}
                          </TableCell>
                          <TableCell>{item.location_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {item.qty_on_hand.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_cost, item.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_value, item.currency)}
                          </TableCell>
                          <TableCell>
                            {item.qty_on_hand < 10 ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : item.qty_on_hand < 50 ? (
                              <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                                Moderate
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                In Stock
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
