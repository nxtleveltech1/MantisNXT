"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  Edit,
  TrendingUp,
  TrendingDown,
  Minus,
  Tag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  DollarSign,
  BarChart3,
  Columns,
  Download,
  RefreshCw,
} from 'lucide-react'
import type {
  ProductTableBySupplier,
  SupplierProductFilters,
  PaginationParams,
  SupplierProductTableProps,
} from '@/types/supplier-portfolio'
import { supplierPortfolioAPI } from '@/lib/api/supplier-portfolio-client'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

// Column visibility configuration
type ColumnId =
  | 'select'
  | 'sku'
  | 'name'
  | 'supplier'
  | 'brand'
  | 'category'
  | 'price'
  | 'price_change'
  | 'status'
  | 'stock'
  | 'first_seen'
  | 'actions'

interface ColumnConfig {
  id: ColumnId
  label: string
  visible: boolean
  sortable: boolean
  width?: string
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, sortable: false, width: 'w-12' },
  { id: 'sku', label: 'SKU', visible: true, sortable: true, width: 'w-32' },
  { id: 'name', label: 'Product Name', visible: true, sortable: true },
  { id: 'supplier', label: 'Supplier', visible: true, sortable: true, width: 'w-40' },
  { id: 'brand', label: 'Brand', visible: true, sortable: true, width: 'w-32' },
  { id: 'category', label: 'Category', visible: true, sortable: true, width: 'w-32' },
  { id: 'price', label: 'Current Price', visible: true, sortable: true, width: 'w-32' },
  { id: 'price_change', label: 'Price Change', visible: true, sortable: true, width: 'w-32' },
  { id: 'status', label: 'Status', visible: true, sortable: false, width: 'w-40' },
  { id: 'stock', label: 'Stock', visible: false, sortable: true, width: 'w-24' },
  { id: 'first_seen', label: 'First Seen', visible: false, sortable: true, width: 'w-32' },
  { id: 'actions', label: '', visible: true, sortable: false, width: 'w-16' },
]

const SupplierProductDataTable: React.FC<SupplierProductTableProps> = ({
  supplier_id,
  filters: initialFilters = {},
  selection_id,
  enable_selection = false,
  on_selection_change,
}) => {
  // State management
  const [products, setProducts] = useState<ProductTableBySupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and pagination
  const [filters, setFilters] = useState<SupplierProductFilters>({
    ...initialFilters,
    ...(supplier_id && { supplier_id }),
    ...(selection_id && { selection_id }),
  })
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    page_size: 50,
    sort_by: 'name',
    sort_direction: 'asc',
  })
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [detailsProduct, setDetailsProduct] = useState<ProductTableBySupplier | null>(null)
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<ProductTableBySupplier | null>(null)
  const [priceHistory, setPriceHistory] = useState<any[]>([])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await supplierPortfolioAPI.getSupplierProducts(filters, pagination)

      if (result.success && result.data) {
        setProducts(result.data.data)
        setTotalCount(result.data.pagination.total_count)
        setTotalPages(result.data.pagination.total_pages)
      } else {
        setError(result.error || 'Failed to load products')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }))
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(products.map(p => p.supplier_product_id)))
    } else {
      setSelectedRows(new Set())
    }
  }, [products])

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  useEffect(() => {
    if (on_selection_change) {
      on_selection_change(Array.from(selectedRows))
    }
  }, [selectedRows, on_selection_change])

  // Column visibility
  const visibleColumns = useMemo(() =>
    columns.filter(col => col.visible),
    [columns]
  )

  const toggleColumn = useCallback((columnId: ColumnId) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ))
  }, [])

  // Sorting
  const handleSort = useCallback((columnId: string) => {
    setPagination(prev => ({
      ...prev,
      sort_by: columnId,
      sort_direction: prev.sort_by === columnId && prev.sort_direction === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }, [])

  // Price history modal
  const handleViewPriceHistory = useCallback(async (product: ProductTableBySupplier) => {
    setPriceHistoryProduct(product)

    const result = await supplierPortfolioAPI.getPriceHistory(product.supplier_product_id)
    if (result.success && result.data) {
      setPriceHistory(result.data)
    }
  }, [])

  // Render loading skeleton
  if (loading && products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search products"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {/* Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {Object.keys(filters).length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {Object.keys(filters).length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Filter Products</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <div className="p-2 space-y-2">
                    {/* Status Filters */}
                    <DropdownMenuCheckboxItem
                      checked={filters.is_new}
                      onCheckedChange={(checked) =>
                        setFilters(prev => ({ ...prev, is_new: checked }))
                      }
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      New Products
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem
                      checked={filters.has_price_change}
                      onCheckedChange={(checked) =>
                        setFilters(prev => ({ ...prev, has_price_change: checked }))
                      }
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Price Changes
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem
                      checked={filters.is_mapped === false}
                      onCheckedChange={(checked) =>
                        setFilters(prev => ({ ...prev, is_mapped: checked ? false : undefined }))
                      }
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Unmapped
                    </DropdownMenuCheckboxItem>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setFilters({})}
                    className="text-destructive"
                  >
                    Clear All Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns.map(col => (
                    col.id !== 'select' && col.id !== 'actions' && (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        checked={col.visible}
                        onCheckedChange={() => toggleColumn(col.id)}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    )
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchProducts()}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>

              {/* Export */}
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Selected Items Actions */}
          <AnimatePresence>
            {selectedRows.size > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-blue-900">
                    {selectedRows.size} item{selectedRows.size !== 1 ? 's' : ''} selected
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Tag className="h-4 w-4 mr-2" />
                      Assign Category
                    </Button>
                    {enable_selection && (
                      <>
                        <Button variant="outline" size="sm">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Add to Selection
                        </Button>
                        <Button variant="outline" size="sm">
                          Remove from Selection
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <div className="relative">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  {visibleColumns.map(col => {
                    if (col.id === 'select') {
                      return (
                        <TableHead key={col.id} className={col.width}>
                          <Checkbox
                            checked={
                              products.length > 0 &&
                              selectedRows.size === products.length
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                      )
                    }

                    if (col.id === 'actions') {
                      return <TableHead key={col.id} className={col.width} />
                    }

                    return (
                      <TableHead key={col.id} className={col.width}>
                        {col.sortable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8"
                            onClick={() => handleSort(col.id)}
                          >
                            {col.label}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          col.label
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.supplier_product_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setDetailsProduct(product)}
                  >
                    {visibleColumns.map(col => {
                      if (col.id === 'select') {
                        return (
                          <TableCell key={col.id} onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(product.supplier_product_id)}
                              onCheckedChange={(checked) =>
                                handleSelectRow(product.supplier_product_id, checked as boolean)
                              }
                              aria-label={`Select ${product.name_from_supplier}`}
                            />
                          </TableCell>
                        )
                      }

                      if (col.id === 'sku') {
                        return (
                          <TableCell key={col.id} className="font-mono text-sm">
                            {product.supplier_sku}
                          </TableCell>
                        )
                      }

                      if (col.id === 'name') {
                        return (
                          <TableCell key={col.id}>
                            <div className="max-w-xs">
                              <div className="font-medium truncate">
                                {product.name_from_supplier}
                              </div>
                              {product.barcode && (
                                <div className="text-xs text-muted-foreground">
                                  {product.barcode}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )
                      }

                      if (col.id === 'supplier') {
                        return (
                          <TableCell key={col.id}>
                            <div className="text-sm">
                              {product.supplier_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {product.supplier_code}
                            </div>
                          </TableCell>
                        )
                      }

                      if (col.id === 'brand') {
                        return (
                          <TableCell key={col.id}>
                            {product.brand || '-'}
                          </TableCell>
                        )
                      }

                      if (col.id === 'category') {
                        return (
                          <TableCell key={col.id}>
                            {product.category_name ? (
                              <Badge variant="outline">
                                {product.category_name}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Unmapped
                              </Badge>
                            )}
                          </TableCell>
                        )
                      }

                      if (col.id === 'price') {
                        return (
                          <TableCell key={col.id}>
                            <div className="font-medium">
                              {formatCurrency(product.current_price || 0, product.currency)}
                            </div>
                          </TableCell>
                        )
                      }

                      if (col.id === 'price_change') {
                        return (
                          <TableCell key={col.id}>
                            {product.price_change_percent !== null && product.price_change_percent !== 0 ? (
                              <div className="flex items-center gap-1">
                                {product.price_change_direction === 'up' ? (
                                  <TrendingUp className="h-4 w-4 text-red-500" />
                                ) : product.price_change_direction === 'down' ? (
                                  <TrendingDown className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Minus className="h-4 w-4 text-gray-400" />
                                )}
                                <span className={cn(
                                  "text-sm font-medium",
                                  product.price_change_direction === 'up' && "text-red-600",
                                  product.price_change_direction === 'down' && "text-green-600"
                                )}>
                                  {product.price_change_percent > 0 ? '+' : ''}
                                  {product.price_change_percent.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        )
                      }

                      if (col.id === 'status') {
                        return (
                          <TableCell key={col.id}>
                            <div className="flex flex-wrap gap-1">
                              {product.is_new && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  New
                                </Badge>
                              )}
                              {!product.is_mapped && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Unmapped
                                </Badge>
                              )}
                              {product.is_selected && (
                                <Badge variant="default" className="bg-green-100 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )
                      }

                      if (col.id === 'stock') {
                        return (
                          <TableCell key={col.id}>
                            {product.stock_quantity !== undefined ? (
                              <div className="text-sm">{product.stock_quantity}</div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )
                      }

                      if (col.id === 'first_seen') {
                        return (
                          <TableCell key={col.id} className="text-sm text-muted-foreground">
                            {formatDate(product.first_seen_at)}
                          </TableCell>
                        )
                      }

                      if (col.id === 'actions') {
                        return (
                          <TableCell key={col.id} onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDetailsProduct(product)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewPriceHistory(product)}>
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Price History
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Mapping
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )
                      }

                      return null
                    })}
                  </TableRow>
                ))}

                {products.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="h-64 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <div className="text-lg font-medium">No products found</div>
                        <div className="text-sm text-muted-foreground">
                          Try adjusting your filters or search term
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div className="mt-2 text-sm text-muted-foreground">Loading products...</div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {products.length} of {totalCount} products
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-sm">
                Page {pagination.page} of {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: totalPages }))}
                disabled={pagination.page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Product Details Dialog */}
      <Dialog open={!!detailsProduct} onOpenChange={(open) => !open && setDetailsProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Complete information for this supplier product
            </DialogDescription>
          </DialogHeader>

          {detailsProduct && (
            <div className="space-y-6">
              {/* Product Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Supplier SKU</label>
                  <div className="mt-1 font-mono">{detailsProduct.supplier_sku}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                  <div className="mt-1">{detailsProduct.name_from_supplier}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Supplier</label>
                  <div className="mt-1">{detailsProduct.supplier_name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <div className="mt-1">{detailsProduct.brand || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <div className="mt-1">{detailsProduct.category_name || 'Unmapped'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Price</label>
                  <div className="mt-1 font-medium">
                    {formatCurrency(detailsProduct.current_price || 0, detailsProduct.currency)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">UOM / Pack Size</label>
                  <div className="mt-1">{detailsProduct.uom} {detailsProduct.pack_size && `/ ${detailsProduct.pack_size}`}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                  <div className="mt-1 font-mono">{detailsProduct.barcode || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Seen</label>
                  <div className="mt-1">{formatDate(detailsProduct.first_seen_at)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Seen</label>
                  <div className="mt-1">
                    {detailsProduct.last_seen_at ? formatDate(detailsProduct.last_seen_at) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex gap-2">
                {detailsProduct.is_new && (
                  <Badge variant="secondary">New Product</Badge>
                )}
                {detailsProduct.is_mapped ? (
                  <Badge variant="default">Mapped</Badge>
                ) : (
                  <Badge variant="destructive">Unmapped</Badge>
                )}
                {detailsProduct.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog
        open={!!priceHistoryProduct}
        onOpenChange={(open) => !open && setPriceHistoryProduct(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
            <DialogDescription>
              Historical pricing for {priceHistoryProduct?.name_from_supplier}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {priceHistory.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {priceHistory.map((record, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {formatCurrency(record.price, record.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(record.valid_from)}
                          {record.valid_to && ` - ${formatDate(record.valid_to)}`}
                        </div>
                      </div>
                      {record.is_current && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No price history available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SupplierProductDataTable
