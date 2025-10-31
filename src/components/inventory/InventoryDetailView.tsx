"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts'
import {
  Package,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Download,
  Share,
  MoreHorizontal,
  BarChart3,
  Activity,
  Truck,
  ShoppingCart,
  FileText,
  Star,
  Info,
  Settings,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  History,
  Users,
  Target,
  Zap,
  X,
  Maximize2,
  Minimize2,
  Copy,
  ExternalLink,
  Award,
  Shield,
  Globe,
  Mail,
  Phone,
  Layers,
  PieChart as PieChartIcon,
  Percent,
  MousePointer,
  Filter,
  Search,
  Calendar as CalendarIcon
} from 'lucide-react'
import type { Product, InventoryItem, Supplier, StockMovement } from '@/lib/types/inventory'
import { format, subDays, isAfter, isBefore } from 'date-fns'

interface DetailedInventoryItem {
  product: Product
  inventoryItem: InventoryItem
  supplier: Supplier
  movements: StockMovement[]
  analytics: {
    averageMonthlyUsage: number
    stockTurnover: number
    daysOnHand: number
    reorderFrequency: number
    costTrend: 'up' | 'down' | 'stable'
    demandTrend: 'up' | 'down' | 'stable'
    seasonalPattern: boolean
    abcClassification: 'A' | 'B' | 'C'
    velocityRating: 'fast' | 'medium' | 'slow' | 'obsolete'
  }
  forecasting: {
    predictedStockout: string | null
    recommendedReorder: number
    economicOrderQuantity: number
    safetyStockLevel: number
  }
  compliance: {
    expiryTracking: boolean
    batchTracking: boolean
    serialTracking: boolean
    regulatoryRequirements: string[]
    certifications: string[]
  }
  performance: {
    qualityScore: number
    availabilityScore: number
    costEfficiency: number
    supplierReliability: number
  }
}

interface InventoryDetailViewProps {
  itemId: string
  onClose: () => void
}

export default function InventoryDetailView({ itemId, onClose }: InventoryDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('30d')

  // Mock detailed data - in real implementation, this would come from API
  const detailedItem: DetailedInventoryItem = {
    product: {
      id: itemId,
      supplier_id: 'supplier-1',
      name: 'Premium Steel Bolts M12x50mm',
      description: 'High-grade stainless steel bolts with hex head, suitable for outdoor applications',
      category: 'components',
      sku: 'BOLT-M12-50-SS',
      unit_of_measure: 'pieces',
      unit_cost_zar: 12.50,
      lead_time_days: 14,
      minimum_order_quantity: 100,
      status: 'active',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-11-20T00:00:00Z',
      barcode: '1234567890123',
      weight_kg: 0.05,
      dimensions_cm: '1.2 x 1.2 x 5.0',
      shelf_life_days: null,
      storage_requirements: 'Dry storage, avoid corrosive environments',
      country_of_origin: 'South Africa',
      brand: 'SteelTech',
      model_number: 'ST-M12-50',
      certification_standards: ['ISO 9001', 'SABS 0395'],
      environmental_impact_score: 8.5,
      recyclable: true,
      critical_item: true,
      strategic_importance: 'high'
    } as Product,
    inventoryItem: {
      id: itemId,
      product_id: itemId,
      location: 'WAREHOUSE-A-B12',
      current_stock: 450,
      reserved_stock: 50,
      available_stock: 400,
      reorder_point: 200,
      max_stock_level: 1000,
      last_counted: '2024-11-15T00:00:00Z',
      cost_per_unit_zar: 12.50,
      total_value_zar: 5625,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-11-20T00:00:00Z',
      stock_status: 'in_stock',
      abc_classification: 'A',
      velocity_rating: 'fast'
    } as InventoryItem,
    supplier: {
      id: 'supplier-1',
      name: 'SteelTech Manufacturing',
      email: 'orders@steeltech.co.za',
      phone: '+27 11 123 4567',
      status: 'active',
      performance_tier: 'platinum',
      preferred_supplier: true,
      quality_rating: 9.2,
      delivery_performance_score: 95.5
    } as Supplier,
    movements: [
      {
        id: '1',
        inventory_item_id: itemId,
        movement_type: 'receipt',
        quantity: 500,
        unit_cost_zar: 12.50,
        total_value_zar: 6250,
        reference_document: 'PO-2024-001',
        created_at: '2024-11-01T10:00:00Z',
        notes: 'Initial stock delivery',
        created_by: 'system'
      },
      {
        id: '2',
        inventory_item_id: itemId,
        movement_type: 'issue',
        quantity: -50,
        unit_cost_zar: 12.50,
        total_value_zar: -625,
        reference_document: 'WO-2024-015',
        created_at: '2024-11-05T14:30:00Z',
        notes: 'Used in Project Alpha',
        created_by: 'john.doe'
      }
    ],
    analytics: {
      averageMonthlyUsage: 150,
      stockTurnover: 3.6,
      daysOnHand: 101,
      reorderFrequency: 4,
      costTrend: 'up',
      demandTrend: 'stable',
      seasonalPattern: false,
      abcClassification: 'A',
      velocityRating: 'fast'
    },
    forecasting: {
      predictedStockout: '2025-01-15',
      recommendedReorder: 300,
      economicOrderQuantity: 400,
      safetyStockLevel: 100
    },
    compliance: {
      expiryTracking: false,
      batchTracking: true,
      serialTracking: false,
      regulatoryRequirements: ['SABS Compliance', 'CE Marking'],
      certifications: ['ISO 9001', 'SABS 0395']
    },
    performance: {
      qualityScore: 92,
      availabilityScore: 98,
      costEfficiency: 85,
      supplierReliability: 95
    }
  }

  // Mock chart data
  const stockLevelsData = [
    { date: '2024-10-01', stock: 380 },
    { date: '2024-10-08', stock: 420 },
    { date: '2024-10-15', stock: 390 },
    { date: '2024-10-22', stock: 480 },
    { date: '2024-10-29', stock: 450 },
    { date: '2024-11-05', stock: 400 },
    { date: '2024-11-12', stock: 430 },
    { date: '2024-11-19', stock: 450 }
  ]

  const movementData = [
    { month: 'Jul', receipts: 400, issues: 150 },
    { month: 'Aug', receipts: 300, issues: 180 },
    { month: 'Sep', receipts: 500, issues: 200 },
    { month: 'Oct', receipts: 200, issues: 160 },
    { month: 'Nov', receipts: 500, issues: 140 }
  ]

  const costAnalysisData = [
    { month: 'Jul', cost: 11.80 },
    { month: 'Aug', cost: 12.00 },
    { month: 'Sep', cost: 12.20 },
    { month: 'Oct', cost: 12.35 },
    { month: 'Nov', cost: 12.50 }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'text-green-600'
      case 'low_stock': return 'text-orange-600'
      case 'out_of_stock': return 'text-red-600'
      case 'overstocked': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <div className="h-4 w-4" />
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-background rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl border-0 animate-in slide-in-from-bottom-4 duration-500">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white border-b p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-lg">
                  <Package className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2">
                  <div className={`w-6 h-6 rounded-full border-2 border-white shadow-lg ${
                    detailedItem.inventoryItem.stock_status === 'in_stock' ? 'bg-green-500' :
                    detailedItem.inventoryItem.stock_status === 'low_stock' ? 'bg-orange-500' :
                    detailedItem.inventoryItem.stock_status === 'out_of_stock' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {detailedItem.product.name}
                  </h1>
                  <p className="text-gray-600 mt-1">{detailedItem.product.description}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-700">SKU: {detailedItem.product.sku}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-700">{detailedItem.inventoryItem.location}</span>
                  </div>
                  <Badge
                    className={`px-3 py-1 font-semibold ${
                      detailedItem.inventoryItem.stock_status === 'in_stock'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : detailedItem.inventoryItem.stock_status === 'low_stock'
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : detailedItem.inventoryItem.stock_status === 'out_of_stock'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}
                  >
                    {detailedItem.inventoryItem.stock_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-300 transition-all">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-300 transition-all">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="hover:bg-purple-50 hover:border-purple-300 transition-all">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hover:bg-gray-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="hover:bg-blue-50">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Product Details
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-green-50">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Adjust Stock Level
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-purple-50">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Catalog
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="hover:bg-orange-50">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Create Purchase Order
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-indigo-50">
                    <Truck className="h-4 w-4 mr-2" />
                    Track Shipments
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="hover:bg-red-50 hover:border-red-300 transition-all"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics Dashboard */}
        <div className="bg-gradient-to-br from-gray-50 via-white to-blue-50 p-8 border-b">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-center mb-2">
                  <Package className="h-5 w-5 text-green-600 mr-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {detailedItem.inventoryItem.current_stock.toLocaleString()}
                  </div>
                </div>
                <p className="text-sm font-medium text-green-600">Current Stock</p>
                <div className="mt-2">
                  <Progress value={75} className="h-1.5 bg-green-100" />
                  <p className="text-xs text-green-500 mt-1">Healthy level</p>
                </div>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                  <div className="text-2xl font-bold text-blue-700">
                    {detailedItem.inventoryItem.available_stock.toLocaleString()}
                  </div>
                </div>
                <p className="text-sm font-medium text-blue-600">Available</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-blue-500">
                    <span>Reserved: {detailedItem.inventoryItem.reserved_stock}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
                  <div className="text-2xl font-bold text-purple-700">
                    {formatCurrency(detailedItem.inventoryItem.total_value_zar)}
                  </div>
                </div>
                <p className="text-sm font-medium text-purple-600">Total Value</p>
                <div className="mt-2">
                  <div className="flex items-center justify-center text-xs text-purple-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span>+8% from last month</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-center mb-2">
                  <CalendarIcon className="h-5 w-5 text-orange-600 mr-2" />
                  <div className="text-2xl font-bold text-orange-700">
                    {detailedItem.analytics.daysOnHand}
                  </div>
                </div>
                <p className="text-sm font-medium text-orange-600">Days on Hand</p>
                <div className="mt-2">
                  <div className="text-xs text-orange-500">
                    {detailedItem.analytics.daysOnHand > 90 ? 'Overstocked' :
                     detailedItem.analytics.daysOnHand > 30 ? 'Optimal' : 'Low'}
                  </div>
                </div>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="text-center p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="h-5 w-5 text-teal-600 mr-2" />
                  <div className="text-2xl font-bold text-teal-700">
                    {detailedItem.analytics.stockTurnover}x
                  </div>
                </div>
                <p className="text-sm font-medium text-teal-600">Turnover</p>
                <div className="mt-2">
                  <div className="text-xs text-teal-500">
                    Industry avg: 2.8x
                  </div>
                </div>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-5 w-5 text-red-600 mr-2" />
                  <div className="text-2xl font-bold text-red-700">
                    {detailedItem.inventoryItem.reorder_point.toLocaleString()}
                  </div>
                </div>
                <p className="text-sm font-medium text-red-600">Reorder Point</p>
                <div className="mt-2">
                  <div className="text-xs text-red-500">
                    {detailedItem.inventoryItem.current_stock <= detailedItem.inventoryItem.reorder_point
                      ? 'Reorder needed'
                      : 'Above threshold'
                    }
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="p-8 bg-gray-50/50 overflow-y-auto max-h-[60vh]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 p-1 bg-white shadow-sm border-0 rounded-xl">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300 rounded-lg"
              >
                <Package className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300 rounded-lg"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="movements"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white transition-all duration-300 rounded-lg"
              >
                <History className="h-4 w-4 mr-2" />
                Movements
              </TabsTrigger>
              <TabsTrigger
                value="supplier"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300 rounded-lg"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Supplier
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white transition-all duration-300 rounded-lg"
              >
                <Shield className="h-4 w-4 mr-2" />
                Compliance
              </TabsTrigger>
              <TabsTrigger
                value="forecasting"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white transition-all duration-300 rounded-lg"
              >
                <Zap className="h-4 w-4 mr-2" />
                Forecasting
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Product Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{detailedItem.product.description}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <span className="ml-2 font-medium">
                          {detailedItem.product.category.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Brand:</span>
                        <span className="ml-2 font-medium">{detailedItem.product.brand}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <span className="ml-2 font-medium">{detailedItem.product.model_number}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unit Cost:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(detailedItem.product.unit_cost_zar)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="ml-2 font-medium">{detailedItem.product.weight_kg} kg</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="ml-2 font-medium">{detailedItem.product.dimensions_cm} cm</span>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Certifications</Label>
                      <div className="flex gap-1 mt-1">
                        {detailedItem.product.certification_standards?.map((cert, index) => (
                          <Badge key={index} variant="outline" size="sm">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stock Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Stock Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current Stock</span>
                        <span className="font-medium">{detailedItem.inventoryItem.current_stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Reserved</span>
                        <span className="font-medium">{detailedItem.inventoryItem.reserved_stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Available</span>
                        <span className="font-medium text-green-600">{detailedItem.inventoryItem.available_stock}</span>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Stock Level</span>
                        <span className="text-sm font-medium">
                          {Math.round((detailedItem.inventoryItem.current_stock / detailedItem.inventoryItem.max_stock_level) * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={(detailedItem.inventoryItem.current_stock / detailedItem.inventoryItem.max_stock_level) * 100}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Reorder: {detailedItem.inventoryItem.reorder_point}</span>
                        <span>Max: {detailedItem.inventoryItem.max_stock_level}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">ABC Class:</span>
                        <Badge variant="outline" className="ml-2">
                          {detailedItem.inventoryItem.abc_classification}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Velocity:</span>
                        <Badge variant="outline" className="ml-2">
                          {detailedItem.inventoryItem.velocity_rating}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {Object.entries(detailedItem.performance).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`font-medium ${getPerformanceColor(value)}`}>
                              {value}%
                            </span>
                          </div>
                          <Progress value={value} className="h-2" />
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(Object.values(detailedItem.performance).reduce((a, b) => a + b, 0) / 4)}
                      </div>
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stock Level Trend */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Stock Level Trend (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stockLevelsData}>
                      <defs>
                        <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      />
                      <Area
                        type="monotone"
                        dataKey="stock"
                        stroke="#3B82F6"
                        fillOpacity={1}
                        fill="url(#colorStock)"
                      />
                      <Line
                        type="monotone"
                        dataKey="reorderPoint"
                        stroke="#F59E0B"
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Movement Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stock Movement Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={movementData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="receipts" fill="#10B981" name="Receipts" />
                        <Bar dataKey="issues" fill="#EF4444" name="Issues" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Cost Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Trend Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={costAnalysisData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `R${value}`} />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Unit Cost']} />
                        <Line
                          type="monotone"
                          dataKey="cost"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Analytics Summary */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Analytics Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                          {detailedItem.analytics.averageMonthlyUsage}
                          {getTrendIcon(detailedItem.analytics.demandTrend)}
                        </div>
                        <p className="text-sm text-muted-foreground">Avg Monthly Usage</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                          {detailedItem.analytics.stockTurnover}x
                          {getTrendIcon('up')}
                        </div>
                        <p className="text-sm text-muted-foreground">Stock Turnover</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {detailedItem.analytics.reorderFrequency}
                        </div>
                        <p className="text-sm text-muted-foreground">Reorders/Year</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                          {formatCurrency(detailedItem.product.unit_cost_zar)}
                          {getTrendIcon(detailedItem.analytics.costTrend)}
                        </div>
                        <p className="text-sm text-muted-foreground">Current Unit Cost</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="movements" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Stock Movement History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedItem.movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {format(new Date(movement.created_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={movement.movement_type === 'receipt' ? 'default' : 'destructive'}
                            >
                              {movement.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </TableCell>
                          <TableCell>
                            {movement.unit_cost_zar ? formatCurrency(movement.unit_cost_zar) : '-'}
                          </TableCell>
                          <TableCell className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                            {movement.total_value_zar ? formatCurrency(movement.total_value_zar) : '-'}
                          </TableCell>
                          <TableCell>
                            <code className="text-sm">{movement.reference_document}</code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.notes}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supplier" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Supplier Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-lg">{detailedItem.supplier.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {detailedItem.supplier.status.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                            {detailedItem.supplier.performance_tier.toUpperCase()}
                          </Badge>
                          {detailedItem.supplier.preferred_supplier && (
                            <Badge variant="outline" className="border-blue-500 text-blue-700">
                              <Star className="h-3 w-3 mr-1" />
                              PREFERRED
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{detailedItem.supplier.email}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium">{detailedItem.supplier.phone}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lead Time:</span>
                          <p className="font-medium">{detailedItem.product.lead_time_days} days</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min Order:</span>
                          <p className="font-medium">{detailedItem.product.minimum_order_quantity}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Performance Metrics</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Quality Rating</span>
                            <span className="font-medium text-green-600">
                              {detailedItem.supplier.quality_rating}/10
                            </span>
                          </div>
                          <Progress value={(detailedItem.supplier.quality_rating || 0) * 10} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Delivery Performance</span>
                            <span className="font-medium text-green-600">
                              {detailedItem.supplier.delivery_performance_score}%
                            </span>
                          </div>
                          <Progress value={detailedItem.supplier.delivery_performance_score || 0} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Tracking Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        {detailedItem.compliance.expiryTracking ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">Expiry Tracking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {detailedItem.compliance.batchTracking ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">Batch Tracking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {detailedItem.compliance.serialTracking ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">Serial Tracking</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Certifications & Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Certifications</Label>
                      <div className="flex gap-1 mt-1">
                        {detailedItem.compliance.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Regulatory Requirements</Label>
                      <div className="flex gap-1 mt-1">
                        {detailedItem.compliance.regulatoryRequirements.map((req, index) => (
                          <Badge key={index} variant="secondary">{req}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="forecasting" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Forecasting & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Predicted Stockout:</span>
                        <p className="font-medium text-orange-600">
                          {detailedItem.forecasting.predictedStockout ?
                            format(new Date(detailedItem.forecasting.predictedStockout), 'MMM dd, yyyy') :
                            'Not predicted'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Recommended Reorder:</span>
                        <p className="font-medium">{detailedItem.forecasting.recommendedReorder} units</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Economic Order Qty:</span>
                        <p className="font-medium">{detailedItem.forecasting.economicOrderQuantity} units</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Safety Stock Level:</span>
                        <p className="font-medium">{detailedItem.forecasting.safetyStockLevel} units</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Reorder Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-800">Reorder Recommended</span>
                      </div>
                      <p className="text-sm text-orange-700 mb-3">
                        Based on current usage patterns and lead time, recommend reordering soon.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Suggested quantity:</span>
                          <span className="font-medium">{detailedItem.forecasting.recommendedReorder} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estimated cost:</span>
                          <span className="font-medium">
                            {formatCurrency(detailedItem.forecasting.recommendedReorder * detailedItem.product.unit_cost_zar)}
                          </span>
                        </div>
                      </div>
                      <Button className="w-full mt-4" size="sm">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Create Purchase Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
    </label>
  )
}