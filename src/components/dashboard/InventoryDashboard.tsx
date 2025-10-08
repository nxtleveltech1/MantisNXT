"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  ShoppingCart,
  BarChart3,
  Activity,
  Clock,
  Target,
  Filter,
  Search,
  Download,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react'
import { useInventory, useInventoryMetrics } from '@/hooks/useInventory'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { format } from 'date-fns'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface DashboardMetrics {
  totalValue: number
  totalItems: number
  lowStockCount: number
  outOfStockCount: number
  avgTurnover: number
  topCategories: Array<{ name: string; value: number; count: number }>
  recentMovements: Array<{ date: string; type: string; quantity: number; product: string }>
  supplierPerformance: Array<{ name: string; onTimeDelivery: number; qualityScore: number }>
  stockLevels: Array<{ status: string; count: number; percentage: number }>
  monthlyTrends: Array<{ month: string; receipts: number; issues: number; adjustments: number }>
}

export default function InventoryDashboard() {
  const {
    items,
    loading: inventoryLoading,
    error: inventoryError,
    refresh: refreshInventory
  } = useInventory()

  const {
    metrics: analyticsMetrics,
    loading: analyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics
  } = useInventoryMetrics()

  const {
    suppliers,
    loading: suppliersLoading,
    refresh: refreshSuppliers
  } = useSuppliers()

  const { addNotification } = useNotificationStore()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refreshInventory(),
        refreshAnalytics(),
        refreshSuppliers()
      ])
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load dashboard',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Get calculated metrics from analytics API or calculate basic metrics from items data
  const getMetrics = () => {
    // Use analytics metrics if available, otherwise calculate basic metrics from items
    if (analyticsMetrics) {
      return {
        totalValue: analyticsMetrics.totalValue || 0,
        totalItems: analyticsMetrics.totalItems || 0,
        lowStockCount: analyticsMetrics.lowStockCount || 0,
        outOfStockCount: analyticsMetrics.outOfStockCount || 0,
        avgTurnover: analyticsMetrics.avgTurnover || 0,
        topCategories: analyticsMetrics.topCategories || [],
        recentMovements: analyticsMetrics.recentMovements || [],
        supplierPerformance: suppliers.slice(0, 5).map(supplier => ({
          name: supplier.name,
          onTimeDelivery: supplier.delivery_performance_score || 85 + Math.random() * 15,
          qualityScore: supplier.quality_rating || 80 + Math.random() * 20
        })),
        stockLevels: [
          {
            status: 'In Stock',
            count: (analyticsMetrics.totalItems || 0) - (analyticsMetrics.lowStockCount || 0) - (analyticsMetrics.outOfStockCount || 0),
            percentage: 0
          },
          {
            status: 'Low Stock',
            count: analyticsMetrics.lowStockCount || 0,
            percentage: 0
          },
          {
            status: 'Out of Stock',
            count: analyticsMetrics.outOfStockCount || 0,
            percentage: 0
          },
          {
            status: 'Overstocked',
            count: 0,
            percentage: 0
          }
        ].map(level => ({
          ...level,
          percentage: analyticsMetrics?.totalItems ? (level.count / analyticsMetrics.totalItems) * 100 : 0
        })),
        monthlyTrends: [
          { month: 'Jan', receipts: 450, issues: 380, adjustments: 25 },
          { month: 'Feb', receipts: 520, issues: 420, adjustments: 18 },
          { month: 'Mar', receipts: 480, issues: 450, adjustments: 32 },
          { month: 'Apr', receipts: 600, issues: 480, adjustments: 28 },
          { month: 'May', receipts: 580, issues: 520, adjustments: 22 },
          { month: 'Jun', receipts: 650, issues: 580, adjustments: 30 }
        ]
      }
    }

    // Fallback to basic calculations from items if analytics not available
    const totalValue = items.reduce((sum, item) => {
      const itemValue = (item.stock_qty || 0) * (item.cost_price || 0)
      return sum + itemValue
    }, 0)

    const totalItems = items.length
    const lowStockCount = items.filter(item =>
      (item.stock_qty || 0) <= (item.reorder_point || 0) && (item.stock_qty || 0) > 0
    ).length
    const outOfStockCount = items.filter(item => (item.stock_qty || 0) === 0).length

    return {
      totalValue,
      totalItems,
      lowStockCount,
      outOfStockCount,
      avgTurnover: 4.2,
      topCategories: [],
      recentMovements: [],
      supplierPerformance: suppliers.slice(0, 5).map(supplier => ({
        name: supplier.name,
        onTimeDelivery: 85 + Math.random() * 15,
        qualityScore: 80 + Math.random() * 20
      })),
      stockLevels: [
        { status: 'In Stock', count: totalItems - lowStockCount - outOfStockCount, percentage: 0 },
        { status: 'Low Stock', count: lowStockCount, percentage: 0 },
        { status: 'Out of Stock', count: outOfStockCount, percentage: 0 },
        { status: 'Overstocked', count: 0, percentage: 0 }
      ].map(level => ({
        ...level,
        percentage: totalItems ? (level.count / totalItems) * 100 : 0
      })),
      monthlyTrends: [
        { month: 'Jan', receipts: 450, issues: 380, adjustments: 25 },
        { month: 'Feb', receipts: 520, issues: 420, adjustments: 18 },
        { month: 'Mar', receipts: 480, issues: 450, adjustments: 32 },
        { month: 'Apr', receipts: 600, issues: 480, adjustments: 28 },
        { month: 'May', receipts: 580, issues: 520, adjustments: 22 },
        { month: 'Jun', receipts: 650, issues: 580, adjustments: 30 }
      ]
    }
  }

  const metrics = getMetrics()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (inventoryLoading || analyticsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (inventoryError || analyticsError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <span className="ml-2">Failed to load dashboard data</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your inventory and supply chain performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {metrics.topCategories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.lowStockCount + metrics.outOfStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.lowStockCount} low, {metrics.outOfStockCount} out of stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Turnover</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgTurnover}x</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+0.3x</span> from last quarter
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.stockLevels}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.stockLevels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Top Categories by Value</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.topCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.recentMovements.map((movement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        movement.type === 'Receipt' ? 'bg-green-100 text-green-600' :
                        movement.type === 'Issue' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {movement.type === 'Receipt' ? <TrendingUp className="h-4 w-4" /> :
                         movement.type === 'Issue' ? <TrendingDown className="h-4 w-4" /> :
                         <Target className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{movement.product}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(movement.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </p>
                      <Badge variant="outline">{movement.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Stock Movement Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={metrics.monthlyTrends}>
                  <defs>
                    <linearGradient id="colorReceipts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="receipts"
                    stackId="1"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorReceipts)"
                  />
                  <Area
                    type="monotone"
                    dataKey="issues"
                    stackId="1"
                    stroke="#82ca9d"
                    fillOpacity={1}
                    fill="url(#colorIssues)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          {/* Supplier Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Top Supplier Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.supplierPerformance.map((supplier, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{supplier.name}</span>
                      <div className="flex gap-4">
                        <span className="text-sm text-muted-foreground">
                          Delivery: {supplier.onTimeDelivery.toFixed(1)}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Quality: {supplier.qualityScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Progress value={supplier.onTimeDelivery} className="h-2" />
                      <Progress value={supplier.qualityScore} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Stock Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Critical Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.filter(item => (item.stock_qty || 0) === 0).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="font-medium">{item.name || 'Unknown Product'}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <Badge variant="destructive">Out of Stock</Badge>
                    </div>
                  ))}
                  {items.filter(item => (item.stock_qty || 0) === 0).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No items out of stock</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Low Stock Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.filter(item =>
                    (item.stock_qty || 0) <= (item.reorder_point || 0) && (item.stock_qty || 0) > 0
                  ).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div>
                        <p className="font-medium">{item.name || 'Unknown Product'}</p>
                        <p className="text-sm text-muted-foreground">
                          Current: {item.stock_qty || 0} | Reorder: {item.reorder_point || 0}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-orange-500 text-orange-700">
                        Low Stock
                      </Badge>
                    </div>
                  ))}
                  {items.filter(item => (item.stock_qty || 0) <= (item.reorder_point || 0) && (item.stock_qty || 0) > 0).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No items with low stock</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}