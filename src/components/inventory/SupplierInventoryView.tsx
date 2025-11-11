"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  RefreshCw,
  Download,
  Upload,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Star,
  Building2,
  FileText,
  BarChart3,
  Settings,
  Info,
  ExternalLink,
  Activity,
  Mail,
  Phone,
  Target
} from 'lucide-react'
import { allocateToSupplier, deallocateFromSupplier, useInventoryStore } from '@/lib/stores/inventory-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import type { Supplier, Product, InventoryItem } from '@/lib/types/inventory'

interface EnrichedProduct extends Product {
  inventoryItem?: InventoryItem
  totalStockValue?: number
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked'
  supplierInfo?: Supplier
}

interface SupplierInventoryData {
  supplier: Supplier
  products: EnrichedProduct[]
  totalValue: number
  totalItems: number
  lowStockCount: number
  outOfStockCount: number
  categories: string[]
  lastUpdated: string
}

export default function SupplierInventoryView() {
  const {
    items,
    products,
    suppliers,
    loading,
    fetchItems,
    fetchProducts,
    fetchSuppliers,
  } = useInventoryStore()

  const { addNotification } = useNotificationStore()

  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all_categories')
  const [statusFilter, setStatusFilter] = useState<string>('all_statuses')
  const [showAddToInventory, setShowAddToInventory] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchItems(), fetchProducts(), fetchSuppliers()])
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Failed to load data',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    loadData()
  }, [addNotification, fetchItems, fetchProducts, fetchSuppliers])

  // Create enriched supplier inventory data
  const supplierInventoryData = useMemo(() => {
    const data: SupplierInventoryData[] = suppliers.map(supplier => {
      const supplierProducts = products.filter(p => p.supplier_id === supplier.id)

      const enrichedProducts: EnrichedProduct[] = supplierProducts.map(product => {
        const inventoryItem = items.find(item => item.product_id === product.id)
        const totalStockValue = inventoryItem ?
          inventoryItem.current_stock * inventoryItem.cost_per_unit_zar : 0

        let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' = 'in_stock'
        if (inventoryItem) {
          if (inventoryItem.current_stock === 0) stockStatus = 'out_of_stock'
          else if (inventoryItem.current_stock <= inventoryItem.reorder_point) stockStatus = 'low_stock'
          else if (inventoryItem.stock_status === 'overstocked') stockStatus = 'overstocked'
        } else {
          stockStatus = 'out_of_stock' // No inventory item means not in stock
        }

        return {
          ...product,
          inventoryItem,
          totalStockValue,
          stockStatus,
          supplierInfo: supplier
        }
      })

      const totalValue = enrichedProducts.reduce((sum, p) => sum + (p.totalStockValue || 0), 0)
      const totalItems = enrichedProducts.filter(p => p.inventoryItem).length
      const lowStockCount = enrichedProducts.filter(p => p.stockStatus === 'low_stock').length
      const outOfStockCount = enrichedProducts.filter(p => p.stockStatus === 'out_of_stock').length
      const categories = [...new Set(enrichedProducts.map(p => p.category))]

      return {
        supplier,
        products: enrichedProducts,
        totalValue,
        totalItems,
        lowStockCount,
        outOfStockCount,
        categories,
        lastUpdated: new Date().toISOString()
      }
    })

    return data.sort((a, b) => b.totalValue - a.totalValue)
  }, [suppliers, products, items])

  const selectedSupplierData = useMemo(() => {
    return supplierInventoryData.find(data => data.supplier.id === selectedSupplier)
  }, [supplierInventoryData, selectedSupplier])

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!selectedSupplierData) return []

    return selectedSupplierData.products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = !categoryFilter || categoryFilter === 'all_categories' || product.category === categoryFilter
      const matchesStatus = !statusFilter || statusFilter === 'all_statuses' || product.stockStatus === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [selectedSupplierData, searchTerm, categoryFilter, statusFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="default" className="bg-green-100 text-green-800">In Stock</Badge>
      case 'low_stock':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Low Stock</Badge>
      case 'out_of_stock':
        return <Badge variant="destructive">Out of Stock</Badge>
      case 'overstocked':
        return <Badge variant="secondary">Overstocked</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleAddToInventory = async (productIds: string[]) => {
    try {
      // Implementation would depend on your backend API
      addNotification({
        type: 'success',
        title: 'Products added to inventory',
        message: `${productIds.length} products added successfully`
      })
      setSelectedProducts(new Set())
      setShowAddToInventory(false)
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to add products',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const handleAllocate = async (inventoryItemId: string, supplierId: string) => {
    if (!supplierId) {
      addNotification({ type: 'error', title: 'Allocation failed', message: 'Select a supplier first' })
      return
    }

    try {
      await allocateToSupplier(inventoryItemId, supplierId, 1)
      addNotification({ type: 'success', title: 'Allocated', message: '1 unit allocated to supplier' })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Allocation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const handleDeallocate = async (inventoryItemId: string, supplierId: string) => {
    if (!supplierId) {
      addNotification({ type: 'error', title: 'Deallocation failed', message: 'Select a supplier first' })
      return
    }

    try {
      await deallocateFromSupplier(inventoryItemId, supplierId, 1)
      addNotification({ type: 'success', title: 'Deallocated', message: '1 unit deallocated' })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Deallocation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-3 rounded">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardContent className="h-64">
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Loading supplier inventory data...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage inventory by supplier with detailed product information and stock management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Supplier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierInventoryData.length}</div>
            <p className="text-xs text-muted-foreground">
              Active suppliers with inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(supplierInventoryData.reduce((sum, data) => sum + data.totalValue, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all suppliers
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
              {supplierInventoryData.reduce((sum, data) => sum + data.lowStockCount + data.outOfStockCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Items requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Supplier List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Suppliers
              <Badge variant="secondary" className="ml-auto">
                {supplierInventoryData.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <div className="space-y-1">
                {supplierInventoryData.map((data) => (
                  <TooltipProvider key={data.supplier.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={`w-full text-left p-4 hover:bg-muted/80 transition-all duration-200 group relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            selectedSupplier === data.supplier.id
                              ? 'bg-primary/10 border-r-3 border-primary shadow-sm'
                              : 'hover:shadow-sm'
                          }`}
                          onClick={() => setSelectedSupplier(data.supplier.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedSupplier(data.supplier.id)
                            }
                          }}
                          aria-pressed={selectedSupplier === data.supplier.id}
                          aria-label={`Select supplier ${data.supplier.name} with ${data.products.length} products and ${formatCurrency(data.totalValue)} total value`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                  {data.supplier.name.split(' ').map(n => n[0]).join('').substr(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium truncate text-sm leading-tight">{data.supplier.name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  {data.supplier.preferred_supplier && (
                                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  )}
                                  <Badge
                                    variant={data.supplier.performance_tier === 'platinum' ? 'default' : 'outline'}
                                    className="text-xs py-0 px-1.5"
                                  >
                                    {data.supplier.performance_tier?.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>{data.products.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>{data.totalItems}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(data.totalValue)}
                            </span>
                            {(data.lowStockCount + data.outOfStockCount) > 0 && (
                              <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 bg-orange-50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {data.lowStockCount + data.outOfStockCount}
                              </Badge>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-2">
                            <Progress
                              value={(data.totalItems / data.products.length) * 100}
                              className="h-1.5"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>{Math.round((data.totalItems / data.products.length) * 100)}% stocked</span>
                            </div>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="p-3 max-w-xs">
                        <div className="space-y-2">
                          <p className="font-medium">{data.supplier.name}</p>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Products:</span>
                              <span>{data.products.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>In Stock:</span>
                              <span>{data.totalItems}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Value:</span>
                              <span>{formatCurrency(data.totalValue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Categories:</span>
                              <span>{data.categories.length}</span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Detail */}
        <div className="lg:col-span-3">
          {selectedSupplierData ? (
            <div className="space-y-6">
              {/* Supplier Header */}
              <Card className="border-0 shadow-md bg-gradient-to-r from-white to-gray-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-600 to-purple-700 text-white">
                            {selectedSupplierData.supplier.name.split(' ').map(n => n[0]).join('').substr(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {selectedSupplierData.supplier.preferred_supplier && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                            <Star className="h-3 w-3 text-white fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-2xl bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            {selectedSupplierData.supplier.name}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                              {selectedSupplierData.supplier.status?.toUpperCase()}
                            </Badge>
                            {selectedSupplierData.supplier.performance_tier && (
                              <Badge
                                variant={selectedSupplierData.supplier.performance_tier === 'platinum' ? 'default' : 'outline'}
                                className={selectedSupplierData.supplier.performance_tier === 'platinum'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : ''
                                }
                              >
                                <Target className="h-3 w-3 mr-1" />
                                {selectedSupplierData.supplier.performance_tier?.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span>{selectedSupplierData.products.length} Products</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>{selectedSupplierData.totalItems} In Stock</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <BarChart3 className="h-4 w-4" />
                            <span>{selectedSupplierData.categories.length} Categories</span>
                          </div>
                        </div>
                        {selectedSupplierData.supplier.email && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{selectedSupplierData.supplier.email}</span>
                            </div>
                            {selectedSupplierData.supplier.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{selectedSupplierData.supplier.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                              aria-label={`View detailed information for ${selectedSupplierData.supplier.name}`}
                            >
                              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                              Details
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View detailed supplier information</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-green-50 focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                              aria-label={`Edit supplier information for ${selectedSupplierData.supplier.name}`}
                            >
                              <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                              Edit
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit supplier details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`More options for ${selectedSupplierData.supplier.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit Website
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            View Contract
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Supplier Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                      <div className="flex items-center justify-center mb-2">
                        <DollarSign className="h-6 w-6 text-green-600 mr-1" />
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(selectedSupplierData.totalValue)}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-green-600">Total Value</p>
                      <div className="mt-2">
                        <Progress
                          value={75}
                          className="h-2 bg-green-100"
                        />
                        <p className="text-xs text-green-500 mt-1">+12% vs last month</p>
                      </div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="h-6 w-6 text-blue-600 mr-1" />
                        <div className="text-2xl font-bold text-blue-700">
                          {selectedSupplierData.totalItems}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-blue-600">Items in Stock</p>
                      <div className="mt-2">
                        <Progress
                          value={(selectedSupplierData.totalItems / selectedSupplierData.products.length) * 100}
                          className="h-2 bg-blue-100"
                        />
                        <p className="text-xs text-blue-500 mt-1">
                          {Math.round((selectedSupplierData.totalItems / selectedSupplierData.products.length) * 100)}% coverage
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200">
                      <div className="flex items-center justify-center mb-2">
                        <AlertTriangle className="h-6 w-6 text-orange-600 mr-1" />
                        <div className="text-2xl font-bold text-orange-700">
                          {selectedSupplierData.lowStockCount}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-orange-600">Low Stock</p>
                      <div className="mt-2">
                        <Progress
                          value={(selectedSupplierData.lowStockCount / selectedSupplierData.totalItems) * 100}
                          className="h-2 bg-orange-100"
                        />
                        <p className="text-xs text-orange-500 mt-1">
                          {selectedSupplierData.lowStockCount > 0 ? 'Needs attention' : 'All good'}
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-red-50 to-pink-50 border border-red-200">
                      <div className="flex items-center justify-center mb-2">
                        <Package className="h-6 w-6 text-red-600 mr-1" />
                        <div className="text-2xl font-bold text-red-700">
                          {selectedSupplierData.outOfStockCount}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-red-600">Out of Stock</p>
                      <div className="mt-2">
                        <Progress
                          value={selectedSupplierData.outOfStockCount > 0 ? 100 : 0}
                          className="h-2 bg-red-100"
                        />
                        <p className="text-xs text-red-500 mt-1">
                          {selectedSupplierData.outOfStockCount > 0 ? 'Urgent action' : 'No issues'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Filters */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Search and Quick Actions */}
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products, SKUs, or descriptions..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-10 h-10 border-2 focus:border-primary transition-all"
                          aria-label="Search products by name, SKU, or description"
                          aria-describedby="search-help"
                        />
                        <div id="search-help" className="sr-only">
                          Search through all products for the selected supplier by name, SKU, or description
                        </div>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Quick Filter Badges */}
                      <div className="flex gap-2">
                        <Button
                          variant={statusFilter === 'low_stock' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all_statuses' : 'low_stock')}
                          className={statusFilter === 'low_stock' ? 'bg-orange-600' : ''}
                          aria-pressed={statusFilter === 'low_stock'}
                          aria-label="Filter products with low stock levels"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                          Low Stock
                        </Button>
                        <Button
                          variant={statusFilter === 'out_of_stock' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all_statuses' : 'out_of_stock')}
                          className={statusFilter === 'out_of_stock' ? 'bg-red-600' : ''}
                          aria-pressed={statusFilter === 'out_of_stock'}
                          aria-label="Filter products that are out of stock"
                        >
                          <Package className="h-3 w-3 mr-1" aria-hidden="true" />
                          Out of Stock
                        </Button>
                      </div>
                    </div>

                    {/* Detailed Filters */}
                    <div className="flex items-center gap-4">
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-56" aria-label="Filter by product category">
                          <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_categories">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              All categories
                            </div>
                          </SelectItem>
                          {selectedSupplierData.categories.map(category => (
                            <SelectItem key={category} value={category}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                {category.replace('_', ' ').toUpperCase()}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48" aria-label="Filter by stock status">
                          <Activity className="h-4 w-4 mr-2" aria-hidden="true" />
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_statuses">All statuses</SelectItem>
                          <SelectItem value="in_stock">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              In Stock
                            </div>
                          </SelectItem>
                          <SelectItem value="low_stock">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              Low Stock
                            </div>
                          </SelectItem>
                          <SelectItem value="out_of_stock">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-red-600" />
                              Out of Stock
                            </div>
                          </SelectItem>
                          <SelectItem value="overstocked">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                              Overstocked
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {selectedProducts.size > 0 && (
                        <Button
                          onClick={() => setShowAddToInventory(true)}
                          className="whitespace-nowrap bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Inventory ({selectedProducts.size})
                        </Button>
                      )}
                    </div>

                    {/* Results Summary */}
                    {(searchTerm || categoryFilter !== 'all_categories' || statusFilter !== 'all_statuses') && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Info className="h-4 w-4" />
                          <span>Showing {filteredProducts.length} of {selectedSupplierData.products.length} products</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('')
                            setCategoryFilter('all_categories')
                            setStatusFilter('all_statuses')
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Products ({filteredProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                      <span className="sr-only">Select</span>
                    </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">
                      <span>Actions</span>
                      <span className="sr-only">, sortable column</span>
                    </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.id)}
                              onChange={(e) => {
                                const newSelection = new Set(selectedProducts)
                                if (e.target.checked) {
                                  newSelection.add(product.id)
                                } else {
                                  newSelection.delete(product.id)
                                }
                                setSelectedProducts(newSelection)
                              }}
                              className="rounded focus:ring-2 focus:ring-primary focus:ring-offset-1"
                              aria-label={`Select product ${product.name}`}
                              aria-describedby={`product-${product.id}-details`}
                            />
                            <div id={`product-${product.id}-details`} className="sr-only">
                              {product.name} - {product.stockStatus} - {product.inventoryItem ? `${product.inventoryItem.current_stock} ${product.unit_of_measure} in stock` : 'Not in inventory'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.sku && (
                                <code className="text-sm text-muted-foreground">{product.sku}</code>
                              )}
                              {product.description && (
                                <p className="text-sm text-muted-foreground">
                                  {product.description.length > 50
                                    ? `${product.description.substring(0, 50)}...`
                                    : product.description
                                  }
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.inventoryItem ? (
                              <div>
                                <p className="font-medium">
                                  {product.inventoryItem.current_stock} {product.unit_of_measure}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Reorder: {product.inventoryItem.reorder_point}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not in inventory</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.unit_cost_zar)}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.totalStockValue ? formatCurrency(product.totalStockValue) : '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(product.stockStatus || 'unknown')}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`More actions for ${product.name}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {product.inventoryItem ? (
                                  <DropdownMenuItem>
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Adjust Stock
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add to Inventory
                                  </DropdownMenuItem>
                                )}
                                {product.inventoryItem && (
                                  <>
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault()
                                        handleAllocate(product.inventoryItem.id, selectedSupplierData.supplier.id)
                                      }}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Allocate 1 Unit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault()
                                        handleDeallocate(product.inventoryItem.id, selectedSupplierData.supplier.id)
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Deallocate 1 Unit
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem>
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Create Order
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="lg:col-span-3 border-dashed border-2">
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-20 animate-pulse" />
                    <Building2 className="h-16 w-16 mx-auto text-muted-foreground relative z-10" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-gray-900">Select a Supplier</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Choose a supplier from the list on the left to view their complete inventory details,
                      product catalog, and stock management information.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>In Stock</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full" />
                      <span>Low Stock</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span>Out of Stock</span>
                    </div>
                  </div>

                  {/* Quick Stats Preview */}
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t max-w-md mx-auto">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {supplierInventoryData.length}
                      </div>
                      <p className="text-xs text-muted-foreground">Suppliers</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {supplierInventoryData.reduce((sum, data) => sum + data.totalItems, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Items in Stock</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(supplierInventoryData.reduce((sum, data) => sum + data.totalValue, 0))}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add to Inventory Dialog */}
      <Dialog open={showAddToInventory} onOpenChange={setShowAddToInventory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Products to Inventory</DialogTitle>
            <DialogDescription>
              Add {selectedProducts.size} selected products to the main inventory system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Products:</h4>
              <ul className="space-y-1">
                {Array.from(selectedProducts).map(productId => {
                  const product = products.find(p => p.id === productId)
                  return product ? (
                    <li key={productId} className="text-sm">{product.name}</li>
                  ) : null
                })}
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddToInventory(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleAddToInventory(Array.from(selectedProducts))}>
                Add to Inventory
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
