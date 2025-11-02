"use client"

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  SlidersHorizontal,
  X,
  Columns3,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Activity,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useInventoryStore } from '@/lib/stores/inventory-store'
import { useSupplierStore } from '@/lib/stores/supplier-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import type { InventoryItem, Product, Supplier, InventoryFilters } from '@/lib/types/inventory'
import { format } from 'date-fns'
import { deriveStockStatus } from '@/lib/utils/inventory-metrics'
import AddProductDialog from './AddProductDialog'
import AddProductsModeDialog from './AddProductsModeDialog'
import MultiProductSelectorDialog from './MultiProductSelectorDialog'
import EditProductDialog from './EditProductDialog'
import StockAdjustmentDialog from './StockAdjustmentDialog'
import ProductDetailsDialog from './ProductDetailsDialog'

// Column visibility state type
type ColumnVisibility = {
  sku: boolean
  supplier: boolean
  category: boolean
  location: boolean
  stock: boolean
  value: boolean
  status: boolean
}

export default function InventoryManagement() {
  const {
    items,
    products,
    suppliers,
    filters,
    loading,
    error,
    fetchItems,
    fetchProducts,
    fetchSuppliers,
    setFilters,
    clearFilters,
    deleteProduct,
    clearError
  } = useInventoryStore()

  const { addNotification } = useNotificationStore()

  // State
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddMode, setShowAddMode] = useState(false)
  const [showMultiSelect, setShowMultiSelect] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [adjustingStock, setAdjustingStock] = useState<InventoryItem | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)

  // New features state
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    sku: true,
    supplier: true,
    category: true,
    location: true,
    stock: true,
    value: true,
    status: true,
  })
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' })
  const [stockLevelFilter, setStockLevelFilter] = useState<string>('all')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25 })
  const [quickEditingStock, setQuickEditingStock] = useState<string | null>(null)
  const [stockMovements, setStockMovements] = useState<Record<string, any[]>>({})

  const searchInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        fetchItems(),
        fetchProducts(),
        fetchSuppliers()
      ])
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load inventory data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }, [fetchItems, fetchProducts, fetchSuppliers, addNotification])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters({ search: searchTerm })
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, setFilters])

  // Search suggestions
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const suggestions = [...products, ...items]
        .filter(item => {
          const name = 'name' in item ? item.name : (item as any).product?.name
          const sku = 'sku' in item ? item.sku : (item as any).product?.sku
          return name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 sku?.toLowerCase().includes(searchTerm.toLowerCase())
        })
        .slice(0, 5)
      setSearchSuggestions(suggestions)
      setShowSearchSuggestions(true)
    } else {
      setShowSearchSuggestions(false)
    }
  }, [searchTerm, products, items])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'k': // Ctrl+K for search
            e.preventDefault()
            searchInputRef.current?.focus()
            break
          case 'n': // Ctrl+N for new product
            e.preventDefault()
            setShowAddMode(true)
            break
          case 'e': // Ctrl+E for export
            e.preventDefault()
            handleExport()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Debug logging for investigating item count
  useEffect(() => {
    console.log('[Inventory Debug] Raw items count:', items.length)
    console.log('[Inventory Debug] Products count:', products.length)
    console.log('[Inventory Debug] Suppliers count:', suppliers.length)
    console.log('[Inventory Debug] Active filters:', filters)
    console.log('[Inventory Debug] Sample item:', items[0])
  }, [items, products, suppliers, filters])

  const formatCurrency = (amount: number | string | null | undefined) => {
    const value = Number(amount)
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number.isFinite(value) ? value : 0)
  }

  const getStockStatusColor = (status: string, currentStock: number, reorderPoint: number) => {
    if (currentStock === 0) return 'destructive'
    if (currentStock <= reorderPoint) return 'secondary'
    if (status === 'overstocked') return 'outline'
    return 'default'
  }

  const getStockStatusLabel = (item: InventoryItem) => {
    if (item.current_stock === 0) return 'Out of Stock'
    if (item.current_stock <= item.reorder_point) return 'Low Stock'
    if (item.stock_status === 'overstocked') return 'Overstocked'
    return 'In Stock'
  }

  const getStockStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100'
      case 'out_of_stock':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
      case 'overstocked':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100'
    }
  }

  // Enhanced data enrichment - FIX #1 & #2
  const enrichedItems = useMemo(() => {
    return items.map((item) => {
      const matchedProduct = products.find((p) => p.id === item.product_id)
      const baseProduct = matchedProduct || item.product || {
        id: item.product_id || item.id,
        supplier_id: item.supplier?.id ?? item.supplier_id ?? null,
        name: item.product?.name || item.name || 'Unknown Product',
        description: item.product?.description || item.description || '',
        category: item.product?.category || item.category || 'Uncategorized',
        sku: item.product?.sku || item.sku || item.supplier_sku || '-',
        unit_of_measure: item.product?.unit_of_measure || item.unit || 'each',
        status: item.status || 'active',
        unit_cost_zar: Number(item.cost_per_unit_zar ?? item.cost_price ?? 0),
        unit_price_zar: Number(item.sale_price ?? 0),
      } as Product

      const matchedSupplier = suppliers.find((s) => s.id === baseProduct.supplier_id)
      const baseSupplier = matchedSupplier || item.supplier || (item.supplier_name
        ? ({ id: item.supplier?.id ?? item.supplier_id ?? 'unknown', name: item.supplier_name, status: item.supplier_status || 'unknown' } as Supplier)
        : undefined)

      const normalizedCost = Number(item.cost_per_unit_zar ?? item.cost_price ?? baseProduct.unit_cost_zar ?? 0)
      const normalizedStock = Number(item.current_stock ?? item.currentStock ?? item.stock_qty ?? 0)
      const normalizedValue = Number(item.total_value_zar ?? item.totalValueZar ?? item.totalValue ?? (normalizedStock * normalizedCost))

      return {
        ...item,
        product: baseProduct,
        supplier: baseSupplier,
        cost_per_unit_zar: normalizedCost,
        total_value_zar: normalizedValue,
        current_stock: normalizedStock,
        supplier_name: baseSupplier?.name || item.supplier_name || 'Unknown Supplier',
        supplier_status: baseSupplier?.status || item.supplier_status || 'inactive',
        stock_status: item.stock_status || deriveStockStatus(normalizedStock, Number(item.reorder_point || 0), Number(item.max_stock_level || 0)),
        currency: item.currency || 'ZAR',
      }
    })
  }, [items, products, suppliers])

  // Apply filters - FIX #3
  const filteredItems = useMemo(() => {
    let result = enrichedItems

    // Price filter
    if (priceFilter.min || priceFilter.max) {
      result = result.filter(item => {
        const price = item.cost_per_unit_zar || 0
        const min = parseFloat(priceFilter.min) || 0
        const max = parseFloat(priceFilter.max) || Infinity
        return price >= min && price <= max
      })
    }

    // Stock level filter
    if (stockLevelFilter !== 'all') {
      result = result.filter(item => {
        switch (stockLevelFilter) {
          case 'critical':
            return item.current_stock < 10
          case 'low':
            return item.current_stock <= item.reorder_point
          case 'adequate':
            return item.current_stock > item.reorder_point && item.current_stock < item.max_stock_level
          case 'overstocked':
            return item.current_stock >= item.max_stock_level
          default:
            return true
        }
      })
    }

    console.log('[Filter Debug] Filtered items count:', result.length)
    return result
  }, [enrichedItems, priceFilter, stockLevelFilter])

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    return filteredItems.slice(start, end)
  }, [filteredItems, pagination])

  const totalPages = Math.ceil(filteredItems.length / pagination.pageSize)

  // Calculate stats
  const stats = useMemo(() => {
    const totalValue = filteredItems.reduce((sum, item) => sum + (item.total_value_zar || 0), 0)
    const lowStockCount = filteredItems.filter(item => item.current_stock <= item.reorder_point).length
    const outOfStockCount = filteredItems.filter(item => item.current_stock === 0).length
    const criticalStockCount = filteredItems.filter(item => item.current_stock < 10 && item.current_stock > 0).length

    return {
      totalValue,
      lowStockCount,
      outOfStockCount,
      criticalStockCount,
      totalItems: filteredItems.length
    }
  }, [filteredItems])

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return
    }

    try {
      await deleteProduct(productId)
      await fetchItems() // Refresh the list
      addNotification({
        type: 'success',
        title: 'Product deleted',
        message: 'Product has been successfully deleted'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} products? This action cannot be undone.`)) {
      return
    }

    try {
      await Promise.all(
        Array.from(selectedItems).map(id => deleteProduct(id))
      )

      await fetchItems() // Refresh the list

      addNotification({
        type: 'success',
        title: 'Products deleted',
        message: `Successfully deleted ${selectedItems.size} products`
      })

      setSelectedItems(new Set())
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to delete products',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  // Export functionality
  const handleExport = useCallback(() => {
    const exportData = enrichedItems.map(item => ({
      SKU: item.product?.sku || '-',
      Product: item.product?.name || 'Unknown Product',
      Supplier: item.supplier_name || 'Unknown',
      'Supplier Status': item.supplier_status || 'unknown',
      Category: item.product?.category || 'Uncategorized',
      Location: item.location || '-',
      'Current Stock': item.current_stock || 0,
      'Unit of Measure': item.product?.unit_of_measure || 'each',
      'Reorder Point': item.reorder_point || 0,
      'Unit Cost': item.cost_per_unit_zar || 0,
      'Total Value': item.total_value_zar || 0,
      Status: item.stock_status || '-',
      Currency: item.currency || 'ZAR',
    }))

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addNotification({
      type: 'success',
      title: 'Export complete',
      message: `Exported ${exportData.length} items to CSV`
    })
  }, [enrichedItems, addNotification])

  // Export selected items
  const handleExportSelected = useCallback(() => {
    const selectedItemsData = enrichedItems.filter(item => selectedItems.has(item.id))

    const exportData = selectedItemsData.map(item => ({
      SKU: item.product?.sku || '-',
      Product: item.product?.name || 'Unknown Product',
      Supplier: item.supplier_name || 'Unknown',
      Category: item.product?.category || 'Uncategorized',
      Location: item.location || '-',
      'Current Stock': item.current_stock || 0,
      'Unit Cost': item.cost_per_unit_zar || 0,
      'Total Value': item.total_value_zar || 0,
      Status: item.stock_status || '-',
    }))

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-selected-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addNotification({
      type: 'success',
      title: 'Export complete',
      message: `Exported ${exportData.length} selected items to CSV`
    })
  }, [enrichedItems, selectedItems, addNotification])

  // Quick stock update
  const handleQuickStockUpdate = async (itemId: string, newStock: string) => {
    const stockValue = parseInt(newStock, 10)
    if (isNaN(stockValue) || stockValue < 0) {
      addNotification({
        type: 'error',
        title: 'Invalid stock value',
        message: 'Please enter a valid positive number'
      })
      return
    }

    try {
      // TODO: Implement actual API call to update stock
      // await updateItemStock(itemId, stockValue)

      addNotification({
        type: 'success',
        title: 'Stock updated',
        message: `Stock level updated to ${stockValue}`
      })

      setQuickEditingStock(null)
      loadData()
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to update stock',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  const categories = [...new Set(products.map(p => p.category))].sort()
  const locations = [...new Set(items.map(i => i.location).filter(Boolean))].sort()
  const stockStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'overstocked']
  const abcClassifications = ['A', 'B', 'C']

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">
              Manage your inventory items, products, and stock levels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              title="Export all items (Ctrl+E)"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(columnVisibility).map(([key, visible]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visible}
                    onCheckedChange={(checked) =>
                      setColumnVisibility(prev => ({ ...prev, [key]: checked }))
                    }
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setShowAddMode(true)}
              size="sm"
              title="Add new product (Ctrl+N)"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.totalItems} items</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Need reordering</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{stats.outOfStockCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Urgent action needed</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Stock</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.criticalStockCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">&lt; 10 units</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedItems.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportSelected}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search products, SKUs, or suppliers... (Ctrl+K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />

                {/* Search Suggestions */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <Card className="absolute z-50 mt-1 w-full shadow-lg">
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {searchSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm"
                            onClick={() => {
                              const name = 'name' in suggestion ? suggestion.name : suggestion.product?.name
                              setSearchTerm(name || '')
                              setShowSearchSuggestions(false)
                            }}
                          >
                            <div className="font-medium">
                              {'name' in suggestion ? suggestion.name : suggestion.product?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {'sku' in suggestion ? suggestion.sku : suggestion.product?.sku}
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {Object.keys(filters).some(key =>
                  key !== 'search' && filters[key as keyof InventoryFilters]
                ) && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>
              {Object.keys(filters).some(key => filters[key as keyof InventoryFilters]) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Price Range Filter */}
                  <div>
                    <Label className="mb-2 block">Price Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceFilter.min}
                        onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceFilter.max}
                        onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                        className="w-24"
                      />
                    </div>
                  </div>

                  {/* Stock Level Filter */}
                  <div>
                    <Label className="mb-2 block">Stock Level</Label>
                    <Select value={stockLevelFilter} onValueChange={setStockLevelFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="critical">Critical (&lt; 10)</SelectItem>
                        <SelectItem value="low">Low Stock</SelectItem>
                        <SelectItem value="adequate">Adequate</SelectItem>
                        <SelectItem value="overstocked">Overstocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <Label className="mb-2 block">Category</Label>
                    <Select
                      value={filters.category?.[0] || 'all_categories'}
                      onValueChange={(value) =>
                        setFilters({ category: value && value !== 'all_categories' ? [value as any] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_categories">All categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Supplier Filter */}
                  <div>
                    <Label className="mb-2 block">Supplier</Label>
                    <Select
                      value={filters.supplier_id?.[0] || 'all_suppliers'}
                      onValueChange={(value) =>
                        setFilters({ supplier_id: value && value !== 'all_suppliers' ? [value] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All suppliers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_suppliers">All suppliers</SelectItem>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stock Status Filter */}
                  <div>
                    <Label className="mb-2 block">Stock Status</Label>
                    <Select
                      value={filters.stock_status?.[0] || 'all_statuses'}
                      onValueChange={(value) =>
                        setFilters({ stock_status: value && value !== 'all_statuses' ? [value as any] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_statuses">All statuses</SelectItem>
                        {stockStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <Label className="mb-2 block">Location</Label>
                    <Select
                      value={filters.location?.[0] || 'all_locations'}
                      onValueChange={(value) =>
                        setFilters({ location: value && value !== 'all_locations' ? [value] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_locations">All locations</SelectItem>
                        {locations.map(location => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="low-stock"
                      checked={filters.low_stock_only || false}
                      onCheckedChange={(checked) =>
                        setFilters({ low_stock_only: checked as boolean })
                      }
                    />
                    <label htmlFor="low-stock" className="text-sm cursor-pointer">
                      Low stock only
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="out-of-stock"
                      checked={filters.out_of_stock_only || false}
                      onCheckedChange={(checked) =>
                        setFilters({ out_of_stock_only: checked as boolean })
                      }
                    />
                    <label htmlFor="out-of-stock" className="text-sm cursor-pointer">
                      Out of stock only
                    </label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Items ({filteredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No inventory items found</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  {searchTerm || Object.keys(filters).some(k => filters[k as keyof InventoryFilters])
                    ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                    : 'Get started by adding your first product to begin tracking your inventory.'}
                </p>
                <Button onClick={() => setShowAddMode(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedItems.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedItems(new Set(paginatedItems.map(item => item.id)))
                              } else {
                                setSelectedItems(new Set())
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        {columnVisibility.sku && <TableHead>SKU</TableHead>}
                        {columnVisibility.supplier && <TableHead>Supplier</TableHead>}
                        {columnVisibility.category && <TableHead>Category</TableHead>}
                        {columnVisibility.location && <TableHead>Location</TableHead>}
                        {columnVisibility.stock && <TableHead className="text-right">Current Stock</TableHead>}
                        {columnVisibility.value && <TableHead className="text-right">Value</TableHead>}
                        {columnVisibility.status && <TableHead>Status</TableHead>}
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item) => {
                        const isLowStock = item.current_stock <= item.reorder_point
                        const isCritical = item.current_stock < 10 && item.current_stock > 0
                        const isOutOfStock = item.current_stock === 0

                        return (
                          <TableRow
                            key={item.id}
                            className={cn(
                              "hover:bg-muted/50 transition-colors relative",
                              isOutOfStock && "bg-red-50/50",
                              isCritical && "bg-orange-50/50",
                              isLowStock && !isCritical && !isOutOfStock && "bg-yellow-50/50"
                            )}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) => {
                                  const newSelection = new Set(selectedItems)
                                  if (checked) {
                                    newSelection.add(item.id)
                                  } else {
                                    newSelection.delete(item.id)
                                  }
                                  setSelectedItems(newSelection)
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="relative">
                                {/* Stock Alert Badge */}
                                {(isLowStock || isCritical || isOutOfStock) && (
                                  <div className="absolute -top-2 -left-2">
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge
                                          variant="destructive"
                                          className={cn(
                                            "h-5 w-5 rounded-full p-0 flex items-center justify-center",
                                            isOutOfStock && "animate-pulse bg-red-600",
                                            isCritical && !isOutOfStock && "bg-orange-600",
                                            isLowStock && !isCritical && !isOutOfStock && "bg-yellow-600"
                                          )}
                                        >
                                          !
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {isOutOfStock && "Out of stock - urgent action needed"}
                                        {isCritical && !isOutOfStock && "Critical stock level"}
                                        {isLowStock && !isCritical && !isOutOfStock && "Low stock - reorder soon"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}
                                <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                                {item.product?.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.product.description.length > 50
                                      ? `${item.product.description.substring(0, 50)}...`
                                      : item.product.description
                                    }
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            {columnVisibility.sku && (
                              <TableCell>
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {item.product?.sku || '-'}
                                </code>
                              </TableCell>
                            )}
                            {columnVisibility.supplier && (
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-sm">{item.supplier_name}</span>
                                  <Badge
                                    variant={item.supplier_status === 'active' ? 'default' : 'secondary'}
                                    className="w-fit text-xs"
                                  >
                                    {item.supplier_status}
                                  </Badge>
                                </div>
                              </TableCell>
                            )}
                            {columnVisibility.category && (
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {item.product?.category?.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                            )}
                            {columnVisibility.location && (
                              <TableCell>{item.location || '-'}</TableCell>
                            )}
                            {columnVisibility.stock && (
                              <TableCell className="text-right">
                                <div>
                                  {quickEditingStock === item.id ? (
                                    <Input
                                      type="number"
                                      className="w-20 h-8 text-right"
                                      defaultValue={item.current_stock}
                                      autoFocus
                                      onBlur={(e) => {
                                        handleQuickStockUpdate(item.id, e.target.value)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleQuickStockUpdate(item.id, e.currentTarget.value)
                                        } else if (e.key === 'Escape') {
                                          setQuickEditingStock(null)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p
                                          className="font-medium cursor-pointer hover:text-blue-600"
                                          onClick={() => setQuickEditingStock(item.id)}
                                        >
                                          {item.current_stock} {item.product?.unit_of_measure}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Click to quick edit stock level
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {item.current_stock <= item.reorder_point && (
                                    <p className="text-xs text-orange-600">
                                      Reorder at: {item.reorder_point}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {columnVisibility.value && (
                              <TableCell className="text-right">
                                <p className="font-medium">{formatCurrency(item.total_value_zar)}</p>
                                <p className="text-xs text-muted-foreground">
                                  @ {formatCurrency(item.cost_per_unit_zar)}
                                </p>
                              </TableCell>
                            )}
                            {columnVisibility.status && (
                              <TableCell>
                                <Badge
                                  className={cn(
                                    "font-semibold capitalize border",
                                    getStockStatusBadgeColor(item.stock_status)
                                  )}
                                >
                                  {getStockStatusLabel(item)}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setViewingProduct(item.product || null)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setEditingProduct(item.product || null)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Product
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setAdjustingStock(item)}
                                  >
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Adjust Stock
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteProduct(item.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Product
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, filteredItems.length)} of {filteredItems.length} items
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1
                          } else if (pagination.page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = pagination.page - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                              className="w-9"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
                        disabled={pagination.page === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddProductsModeDialog
          open={showAddMode}
          onOpenChange={setShowAddMode}
          onChoose={(mode) => {
            setShowAddMode(false)
            if (mode === 'single') setShowAddProduct(true)
            if (mode === 'multi') setShowMultiSelect(true)
          }}
        />

        <AddProductDialog
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
        />

        <MultiProductSelectorDialog
          open={showMultiSelect}
          onOpenChange={setShowMultiSelect}
        />

        {editingProduct && (
          <EditProductDialog
            product={editingProduct}
            open={!!editingProduct}
            onOpenChange={(open) => !open && setEditingProduct(null)}
          />
        )}

        {adjustingStock && (
          <StockAdjustmentDialog
            inventoryItem={adjustingStock}
            open={!!adjustingStock}
            onOpenChange={(open) => !open && setAdjustingStock(null)}
          />
        )}

        {viewingProduct && (
          <ProductDetailsDialog
            product={viewingProduct}
            open={!!viewingProduct}
            onOpenChange={(open) => !open && setViewingProduct(null)}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
