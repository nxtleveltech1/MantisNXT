"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'
import {
  Package,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  Target,
  Clock,
  DollarSign,
  Archive,
  Star,
  Activity,
  Gauge,
  AlertOctagon,
  Bell,
  Sparkles
} from 'lucide-react'

// Enhanced Types for Inventory Management
interface InventoryMetrics {
  totalValue: number
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  criticalItems: number
  stockTurnover: number
  avgDaysInStock: number
  reorderPointItems: number
  excessStockValue: number
  deadStockValue: number
  forecastAccuracy: number
  fillRate: number
}

interface InventoryItem {
  id: string
  sku: string
  name: string
  description: string
  category: string
  subcategory: string
  currentStock: number
  reorderPoint: number
  maxStock: number
  unitCost: number
  unitPrice: number
  totalValue: number
  lastMovement: string
  daysInStock: number
  velocity: 'high' | 'medium' | 'low' | 'dead'
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical'
  supplier: {
    id: string
    name: string
    leadTimeDays: number
    rating: number
  }
  location: {
    warehouse: string
    zone: string
    aisle: string
    shelf: string
  }
  alerts: Array<{
    type: 'low_stock' | 'out_of_stock' | 'excess_stock' | 'slow_moving'
    severity: 'high' | 'medium' | 'low'
    message: string
    createdAt: string
  }>
  movements: Array<{
    date: string
    type: 'inbound' | 'outbound' | 'adjustment'
    quantity: number
    reason: string
  }>
}

interface StockAlert {
  id: string
  itemId: string
  itemName: string
  sku: string
  type: 'low_stock' | 'out_of_stock' | 'excess_stock' | 'slow_moving' | 'expiring'
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  recommendation: string
  impact: string
  createdAt: string
  acknowledged: boolean
  estimatedCost: number
}

interface ChartDataPoint {
  period?: string
  category?: string
  value?: number
  turnover?: number
  aClass?: number
  bClass?: number
  cClass?: number
  fastMoving?: number
  deadStock?: number
}

interface EnhancedInventoryDashboardProps {
  refreshInterval?: number
  enableRealTime?: boolean
  showPredictiveAnalytics?: boolean
}

const EnhancedInventoryDashboard: React.FC<EnhancedInventoryDashboardProps> = ({
  refreshInterval = 30000,
  enableRealTime = true,
  showPredictiveAnalytics = true
}) => {
  // State Management
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [visibleCount, setVisibleCount] = useState<number>(200)
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; name: string }>>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<keyof InventoryItem>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [autoRefresh, setAutoRefresh] = useState(enableRealTime)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Fetch inventory data
  const fetchInventoryData = useCallback(async () => {
    try {
      setError(null)

      // Build server-side filtered inventory request
      const qs = new URLSearchParams()
      qs.set('format', 'display')
      qs.set('limit', '25000')
      if (searchTerm) qs.set('search', searchTerm)
      if (selectedCategory && selectedCategory !== 'all') qs.set('category', selectedCategory)
      // Status is filtered client-side to avoid DB dependency on reorder_point thresholds
      if (selectedSupplier && selectedSupplier !== 'all') qs.set('supplierId', selectedSupplier)

      const [inventoryResponse, itemsResponse, alertsResponse, analyticsResponse, movementsResponse] = await Promise.all([
        fetch('/api/inventory/analytics'),
        fetch(`/api/inventory?${qs.toString()}`),
        fetch('/api/inventory/alerts'),
        fetch('/api/inventory/analytics'), // Use analytics endpoint for trends data
        fetch('/api/stock-movements?limit=20')
      ])

      const inventoryData = await inventoryResponse.json()
      const itemsData = await itemsResponse.json()
      const alertsData = await alertsResponse.json()
      const analyticsData = await analyticsResponse.json()

      if (inventoryData?.success) setMetrics(inventoryData.data)

      // Handle {items: [...]} format from /api/inventory
      if (itemsData?.items && Array.isArray(itemsData.items)) {
        const mapped = itemsData.items.map((r: unknown) => ({
          id: r.id,
          sku: r.sku,
          name: r.name || r.sku,
          description: '',
          category: r.category || 'uncategorized',
          subcategory: '',
          currentStock: Number(r.stock_qty ?? r.currentStock ?? 0),
          reorderPoint: 0,
          maxStock: 0,
          unitCost: Number(r.cost_price ?? r.costPrice ?? 0),
          unitPrice: Number(r.sale_price ?? r.salePrice ?? r.cost_price ?? r.costPrice ?? 0),
          totalValue: Number(r.cost_price ?? r.costPrice ?? 0) * Number(r.stock_qty ?? r.currentStock ?? 0),
          lastMovement: '',
          daysInStock: 0,
          velocity: 'medium',
          status: (r.stock_qty ?? r.currentStock ?? 0) <= 0 ? 'out_of_stock' : ((r.stock_qty ?? r.currentStock ?? 0) <= 10 ? 'low_stock' : 'in_stock'),
          supplier: { id: r.supplier_id ?? r.supplierId ?? '', name: '', leadTimeDays: 0, rating: 0 },
          location: { warehouse: '', zone: '', aisle: '', shelf: '' },
          alerts: [],
          movements: []
        }))
        setItems(mapped)
        const cats = Array.from(new Set(mapped.map(m => m.category).filter(Boolean)))
        setCategoryOptions(cats)
      } else if (Array.isArray(itemsData)) {
        const mapped = itemsData.map((r: unknown) => ({
          id: r.id,
          sku: r.sku,
          name: r.name || r.sku,
          description: '',
          category: r.category || 'uncategorized',
          subcategory: '',
          currentStock: Number(r.currentStock ?? 0),
          reorderPoint: 0,
          maxStock: 0,
          unitCost: Number(r.costPrice ?? 0),
          unitPrice: Number(r.salePrice ?? r.costPrice ?? 0),
          totalValue: Number(r.costPrice ?? 0) * Number(r.currentStock ?? 0),
          lastMovement: '',
          daysInStock: 0,
          velocity: 'medium',
          status: r.currentStock <= 0 ? 'out_of_stock' : (r.currentStock <= 10 ? 'low_stock' : 'in_stock'),
          supplier: { id: r.supplierId ?? '', name: '', leadTimeDays: 0, rating: 0 },
          location: { warehouse: '', zone: '', aisle: '', shelf: '' },
          alerts: [],
          movements: []
        }))
        setItems(mapped)
        const cats = Array.from(new Set(mapped.map(m => m.category).filter(Boolean)))
        setCategoryOptions(cats)
      } else if (itemsData?.success) {
        const rows = itemsData.data || itemsData.data?.items || []
        const mapped = rows.map((r: unknown) => ({
          id: r.id,
          sku: r.sku,
          name: r.name || r.sku,
          description: '',
          category: r.category || 'uncategorized',
          subcategory: '',
          currentStock: Number(r.currentStock ?? 0),
          reorderPoint: 0,
          maxStock: 0,
          unitCost: Number(r.costPrice ?? 0),
          unitPrice: Number(r.salePrice ?? r.costPrice ?? 0),
          totalValue: Number(r.costPrice ?? 0) * Number(r.currentStock ?? 0),
          lastMovement: '',
          daysInStock: 0,
          velocity: 'medium',
          status: r.currentStock <= 0 ? 'out_of_stock' : (r.currentStock <= 10 ? 'low_stock' : 'in_stock'),
          supplier: { id: r.supplierId ?? '', name: '', leadTimeDays: 0, rating: 0 },
          location: { warehouse: '', zone: '', aisle: '', shelf: '' },
          alerts: [],
          movements: []
        }))
        setItems(mapped)
        const cats = Array.from(new Set(mapped.map(m => m.category).filter(Boolean)))
        setCategoryOptions(cats)
      }

      if (alertsData.success) {
        setAlerts(alertsData.data.alerts || [])
      }

      // Use analytics data for chart, handling both series and direct data formats
      if (analyticsData?.success) {
        const chartSeries = Array.isArray(analyticsData.data?.series) 
          ? analyticsData.data.series 
          : Array.isArray(analyticsData.data)
          ? analyticsData.data
          : []
        setChartData(chartSeries)
      }

      const mvData = await movementsResponse.json()
      const movementList = Array.isArray(mvData?.data) ? mvData.data : []
      ;(window as unknown).__recentMovements = movementList

      setLastUpdate(new Date())

    } catch (err) {
      console.error('Inventory fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedCategory, selectedSupplier])

  // Real-time refresh effect
  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchInventoryData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchInventoryData])

  // Fetch supplier options for filtering
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Use v3 API with correct parameter format: status as array, limit max 1000
        const res = await fetch('/api/suppliers?status=active&limit=1000')
        if (!res.ok) {
          console.warn('Failed to fetch suppliers:', res.status)
          return
        }
        const data = await res.json()
        // Handle v3 API response format with pagination
        const list = Array.isArray(data?.data) 
          ? data.data 
          : Array.isArray(data) 
          ? data 
          : (data?.data || [])
        const options = list.map((s: unknown) => ({ id: s.id, name: s.name || s.supplier_name || 'Unnamed Supplier' }))
        if (!cancelled) setSupplierOptions(options)
      } catch (err) {
        console.error('Error fetching suppliers:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus

      const matchesSupplier = selectedSupplier === 'all' || item.supplier?.id === selectedSupplier

      return matchesSearch && matchesCategory && matchesStatus && matchesSupplier
    })

    // Sort items
    filtered.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      } else {
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        return sortOrder === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      }
    })

    return filtered
  }, [items, searchTerm, selectedCategory, selectedStatus, selectedSupplier, sortBy, sortOrder])

  // Critical alerts
  const criticalAlerts = useMemo(() => {
    return alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high').slice(0, 5)
  }, [alerts])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'text-green-600 bg-green-100'
      case 'low_stock': return 'text-yellow-600 bg-yellow-100'
      case 'out_of_stock': return 'text-red-600 bg-red-100'
      case 'critical': return 'text-red-700 bg-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Get velocity color
  const getVelocityColor = (velocity: string) => {
    switch (velocity) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-blue-600'
      case 'low': return 'text-yellow-600'
      case 'dead': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="p-4 bg-blue-100 rounded-full mx-auto w-fit"
          >
            <Package className="h-8 w-8 text-blue-600" />
          </motion.div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Loading Inventory</h3>
            <p className="text-gray-600">Analyzing stock levels...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertOctagon className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="font-semibold mb-1">Inventory Error</div>
          <div>{error}</div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setError(null)
              fetchInventoryData()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 rounded-2xl p-8 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"
              >
                <Package className="h-8 w-8" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold">Smart Inventory Management</h1>
                <p className="text-blue-100 text-lg">Real-time stock tracking and optimization</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-blue-200">Last Sync</div>
              <div className="font-semibold">
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`${autoRefresh ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}`}
              >
                <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Real-time' : 'Manual'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchInventoryData}
                disabled={loading}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      {metrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
        >
          {/* Total Value */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-800">
                  ${(metrics.totalValue / 1000000).toFixed(1)}M
                </div>
                <div className="text-sm text-green-700">Total Inventory Value</div>
                <div className="flex items-center text-xs text-green-600">
                  <Archive className="h-3 w-3 mr-1" />
                  {(metrics?.totalItems ?? 0).toLocaleString()} Items
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Alerts */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-rose-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500 rounded-xl text-white">
                  <Bell className="h-6 w-6" />
                </div>
                <div className="flex gap-1">
                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Warning</Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">Info</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-red-800">
                  {criticalAlerts.length}
                </div>
                <div className="text-sm text-red-700">Stock Alerts</div>
                <div className="flex items-center text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {alerts.length} Total Alerts
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Stock Health */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500 rounded-xl text-white">
                  <Gauge className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">{(metrics.fillRate * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-blue-800">
                  {metrics?.lowStockItems ?? 0}
                </div>
                <div className="text-sm text-blue-700">Low Stock Items</div>
                <div className="flex items-center text-xs text-blue-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {metrics?.criticalItems ?? 0} Critical
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Turnover Rate */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-violet-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500 rounded-xl text-white">
                  <Activity className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {(Number(metrics?.stockTurnover ?? 0) > 6) ? 'Excellent' : (Number(metrics?.stockTurnover ?? 0) > 4) ? 'Good' : 'Poor'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-purple-800">
                  {Number.isFinite(metrics?.stockTurnover as unknown) ? (metrics!.stockTurnover as number).toFixed(1) : '0.0'}x
                </div>
                <div className="text-sm text-purple-700">Stock Turnover</div>
                <div className="flex items-center text-xs text-purple-600">
                  <Clock className="h-3 w-3 mr-1" />
                  {metrics?.avgDaysInStock ?? 0} Days Avg
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Forecast Accuracy */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-amber-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500 rounded-xl text-white">
                  <Target className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  AI-Powered
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-orange-800">
                  {Number.isFinite(metrics?.forecastAccuracy as unknown) ? ((metrics!.forecastAccuracy as number) * 100).toFixed(0) : '0'}%
                </div>
                <div className="text-sm text-orange-700">Forecast Accuracy</div>
                <div className="flex items-center text-xs text-orange-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Machine Learning
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-red-400 to-red-600 rounded-lg text-white animate-pulse">
                  <Bell className="h-5 w-5" />
                </div>
                Critical Stock Alerts
                <Badge variant="destructive" className="ml-auto animate-bounce">
                  {criticalAlerts.length} Urgent
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {criticalAlerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-xl border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-red-100 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-red-800">{alert.itemName}</h4>
                            <Badge variant="outline" className="text-xs bg-white border-red-300">
                              {alert.sku}
                            </Badge>
                            <Badge variant="destructive">
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-red-700 mb-2">{alert.message}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-white/60 rounded-lg">
                              <span className="font-medium text-red-800">Impact:</span>
                              <span className="text-red-700 ml-1">{alert.impact}</span>
                            </div>
                            <div className="p-2 bg-white/60 rounded-lg">
                              <span className="font-medium text-green-800">Action:</span>
                              <span className="text-green-700 ml-1">{alert.recommendation}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-red-600">
                          ${alert.estimatedCost.toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Stock Status Chart */}
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Stock Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={[
                          { name: 'In Stock', value: Number(metrics?.totalItems ?? 0) - Number(metrics?.lowStockItems ?? 0) - Number(metrics?.outOfStockItems ?? 0), fill: '#10B981' },
                          { name: 'Low Stock', value: metrics?.lowStockItems || 0, fill: '#F59E0B' },
                          { name: 'Out of Stock', value: metrics?.outOfStockItems || 0, fill: '#EF4444' },
                          { name: 'Critical', value: metrics?.criticalItems || 0, fill: '#DC2626' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      />
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Inventory Trends */}
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Value Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={Array.isArray(chartData) ? chartData : []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Inventory Value" />
                      <Area type="monotone" dataKey="turnover" stroke="#10B981" fill="#10B981" fillOpacity={0.2} name="Turnover Rate" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-6">
            {/* Search and Filters */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Item Management
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search items by name, SKU, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categoryOptions.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {supplierOptions.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedItems(new Set(filteredItems.map(item => item.id)))
                              } else {
                                setSelectedItems(new Set())
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Stock Level</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Velocity</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.slice(0, visibleCount).map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedItems)
                                if (checked) {
                                  newSelected.add(item.id)
                                } else {
                                  newSelected.delete(item.id)
                                }
                                setSelectedItems(newSelected)
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.sku}</div>
                              <div className="text-xs text-gray-400">{item.category}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{item.currentStock.toLocaleString()}</div>
                              <Progress
                                value={(item.currentStock / item.maxStock) * 100}
                                className="w-20 h-2"
                              />
                              <div className="text-xs text-gray-500">
                                Max: {item.maxStock.toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${item.totalValue.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">
                              ${item.unitPrice}/unit
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getVelocityColor(item.velocity)}>
                              {item.velocity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{item.supplier.name}</div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Star className="h-3 w-3 mr-1 text-yellow-400 fill-current" />
                                {item.supplier.rating.toFixed(1)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(item.status)} border-0`}>
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedItem(item)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredItems.length > visibleCount && (
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={() => setVisibleCount(c => c + 200)}>
                      Load more items
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle>ABC Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Array.isArray(chartData) ? chartData : []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="aClass" fill="#10B981" name="A Class (High Value)" />
                      <Bar dataKey="bClass" fill="#F59E0B" name="B Class (Medium Value)" />
                      <Bar dataKey="cClass" fill="#6B7280" name="C Class (Low Value)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle>Velocity Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={Array.isArray(chartData) ? chartData : []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="fastMoving" fill="#10B981" name="Fast Moving" />
                      <Line type="monotone" dataKey="deadStock" stroke="#EF4444" strokeWidth={3} name="Dead Stock %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="space-y-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Stock Movements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray((window as unknown).__recentMovements) && (window as unknown).__recentMovements.length > 0 ? (
                        (window as unknown).__recentMovements.map((m: unknown) => (
                          <TableRow key={m.id}>
                            <TableCell>{m.createdAt || m.timestamp || '-'}</TableCell>
                            <TableCell>{m.sku || '-'}</TableCell>
                            <TableCell className="capitalize">{m.type}</TableCell>
                            <TableCell>{m.quantity}</TableCell>
                            <TableCell>{m.reason || '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="text-center py-8 text-gray-500">
                              <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No recent movements</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Item Details Dialog */}
      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Package className="h-6 w-6" />
                  {selectedItem.name}
                  <Badge className={`${getStatusColor(selectedItem.status)} border-0`}>
                    {selectedItem.status.replace('_', ' ')}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Item Details */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Item Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">SKU:</span>
                          <span className="ml-2">{selectedItem.sku}</span>
                        </div>
                        <div>
                          <span className="font-medium">Category:</span>
                          <span className="ml-2">{selectedItem.category}</span>
                        </div>
                        <div>
                          <span className="font-medium">Current Stock:</span>
                          <span className="ml-2 font-semibold">{selectedItem.currentStock.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-medium">Reorder Point:</span>
                          <span className="ml-2">{selectedItem.reorderPoint.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-medium">Unit Cost:</span>
                          <span className="ml-2">${selectedItem.unitCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Unit Price:</span>
                          <span className="ml-2">${selectedItem.unitPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <span className="font-medium">Description:</span>
                        <p className="text-sm text-gray-600 mt-1">{selectedItem.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Stock Chart */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Stock Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold">{selectedItem.currentStock.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">Current Stock</div>
                        </div>
                        <Progress
                          value={(selectedItem.currentStock / selectedItem.maxStock) * 100}
                          className="h-4"
                        />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>0</span>
                          <span>Reorder: {selectedItem.reorderPoint.toLocaleString()}</span>
                          <span>Max: {selectedItem.maxStock.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnhancedInventoryDashboard
