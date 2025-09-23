"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  X
} from 'lucide-react'
import { useInventoryStore } from '@/lib/stores/inventory-store'
import { useSupplierStore } from '@/lib/stores/supplier-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import type { InventoryItem, Product, Supplier, InventoryFilters } from '@/lib/types/inventory'
import { format } from 'date-fns'
import AddProductDialog from './AddProductDialog'
import EditProductDialog from './EditProductDialog'
import StockAdjustmentDialog from './StockAdjustmentDialog'
import ProductDetailsDialog from './ProductDetailsDialog'

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

  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [adjustingStock, setAdjustingStock] = useState<InventoryItem | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters({ search: searchTerm })
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

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

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return
    }

    try {
      await deleteProduct(productId)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const enrichedItems = items.map(item => {
    const product = products.find(p => p.id === item.product_id)
    const supplier = suppliers.find(s => s.id === product?.supplier_id)
    return { ...item, product, supplier }
  })

  const categories = [...new Set(products.map(p => p.category))].sort()
  const locations = [...new Set(items.map(i => i.location))].sort()
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
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => setShowAddProduct(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, SKUs, or suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select
                      value={filters.category?.[0] || ''}
                      onValueChange={(value) =>
                        setFilters({ category: value ? [value as any] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Supplier</label>
                    <Select
                      value={filters.supplier_id?.[0] || ''}
                      onValueChange={(value) =>
                        setFilters({ supplier_id: value ? [value] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All suppliers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All suppliers</SelectItem>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Stock Status</label>
                    <Select
                      value={filters.stock_status?.[0] || ''}
                      onValueChange={(value) =>
                        setFilters({ stock_status: value ? [value as any] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All statuses</SelectItem>
                        {stockStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Select
                      value={filters.location?.[0] || ''}
                      onValueChange={(value) =>
                        setFilters({ location: value ? [value] : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All locations</SelectItem>
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
                    <label htmlFor="low-stock" className="text-sm">
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
                    <label htmlFor="out-of-stock" className="text-sm">
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
              Inventory Items ({enrichedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading inventory...</span>
              </div>
            ) : enrichedItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No inventory items found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first product.
                </p>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === enrichedItems.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems(new Set(enrichedItems.map(item => item.id)))
                            } else {
                              setSelectedItems(new Set())
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedItems.map((item) => (
                      <TableRow key={item.id}>
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
                          <div>
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
                        <TableCell>
                          <code className="text-sm">{item.product?.sku || '-'}</code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.supplier?.name || 'Unknown'}</p>
                            <Badge variant="outline" size="sm">
                              {item.supplier?.status || 'unknown'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.product?.category.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-medium">{item.current_stock} {item.product?.unit_of_measure}</p>
                            {item.current_stock <= item.reorder_point && (
                              <p className="text-xs text-orange-600">
                                Reorder at: {item.reorder_point}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-medium">{formatCurrency(item.total_value_zar)}</p>
                          <p className="text-xs text-muted-foreground">
                            @ {formatCurrency(item.cost_per_unit_zar)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStockStatusColor(
                              item.stock_status,
                              item.current_stock,
                              item.reorder_point
                            )}
                          >
                            {getStockStatusLabel(item)}
                          </Badge>
                        </TableCell>
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
                              <DropdownMenuItem
                                onClick={() => item.product && handleDeleteProduct(item.product.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddProductDialog
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
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