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
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  AlertTriangle,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

const ALL_SUPPLIERS_VALUE = '__all-suppliers__'
const ALL_CATEGORIES_VALUE = '__all-categories__'

// Enhanced Product Type with Complete Selection Data
interface SelectionProduct {
  supplier_product_id: string
  supplier_id: string
  supplier_name: string
  supplier_code?: string
  supplier_sku: string
  name_from_supplier: string
  brand?: string
  category_id?: string
  category_name?: string
  current_price: number
  currency: string
  barcode?: string
  uom?: string
  pack_size?: string
  qty_on_hand?: number
  is_in_stock: boolean
  selected_at: string
  first_seen_at?: string
  last_seen_at?: string
  price_change_percent?: number
  price_change_direction?: 'up' | 'down' | 'none'
  is_new?: boolean
  is_mapped?: boolean
  is_active?: boolean
  is_selected?: boolean
}

interface SupplierProductTableProps {
  supplier_id?: string
  selection_id?: string
  enable_selection?: boolean
  on_selection_change?: (selected: string[]) => void
}

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
  { id: 'price_change', label: 'Price Change', visible: false, sortable: true, width: 'w-32' },
  { id: 'status', label: 'Status', visible: true, sortable: false, width: 'w-40' },
  { id: 'stock', label: 'Stock', visible: false, sortable: true, width: 'w-24' },
  { id: 'first_seen', label: 'First Seen', visible: false, sortable: true, width: 'w-32' },
  { id: 'actions', label: '', visible: true, sortable: false, width: 'w-16' },
]

const SupplierProductDataTable: React.FC<SupplierProductTableProps> = ({
  supplier_id,
  selection_id,
  enable_selection = false,
  on_selection_change,
}) => {
  // State management
  const [products, setProducts] = useState<SelectionProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<SelectionProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSupplier, setFilterSupplier] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  // UI state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [detailsProduct, setDetailsProduct] = useState<SelectionProduct | null>(null)
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Fetch products for the selection
  const fetchProducts = useCallback(async () => {
    if (!selection_id) {
      setError('No selection ID provided')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch products IN the selection (already selected items)
      const itemsResponse = await fetch(`/api/core/selections/${selection_id}/items`)

      if (!itemsResponse.ok) {
        if (itemsResponse.status === 401) {
          throw new Error('Authentication required. Please log in.')
        }
        throw new Error(`Failed to fetch selection items: ${itemsResponse.statusText}`)
      }

      const itemsData = await itemsResponse.json()

      if (!itemsData.success) {
        throw new Error(itemsData.error || 'Failed to load selection items')
      }

      const items = itemsData.data || []

      // Fetch full product details from catalog
      const catalogResponse = await fetch('/api/core/selections/catalog')

      if (!catalogResponse.ok) {
        if (catalogResponse.status === 401) {
          // Fallback: use basic items data if catalog fails due to auth
          console.warn('Catalog API unauthorized, using basic selection items')
          setProducts(items.map((item: any) => ({
            supplier_product_id: item.supplier_product_id,
            supplier_id: item.supplier_id || '',
            supplier_name: 'Unknown Supplier',
            supplier_sku: item.supplier_product_id,
            name_from_supplier: 'Product Details Unavailable',
            current_price: 0,
            currency: 'ZAR',
            is_in_stock: false,
            selected_at: item.selected_at,
            is_selected: true,
          })))
          setLoading(false)
          return
        }
        throw new Error(`Failed to fetch catalog: ${catalogResponse.statusText}`)
      }

      const catalogData = await catalogResponse.json()

      if (!catalogData.success) {
        throw new Error(catalogData.error || 'Failed to load catalog')
      }

      const catalog = catalogData.catalog || []

      // Match selection items with catalog data
      const enrichedProducts = items.map((item: any) => {
        const catalogProduct = catalog.find((p: any) => p.supplier_product_id === item.supplier_product_id)

        return {
          supplier_product_id: item.supplier_product_id,
          supplier_id: catalogProduct?.supplier_id || item.supplier_id || '',
          supplier_name: catalogProduct?.supplier_name || 'Unknown Supplier',
          supplier_code: catalogProduct?.supplier_code,
          supplier_sku: catalogProduct?.supplier_sku || item.supplier_product_id,
          name_from_supplier: catalogProduct?.product_name || 'Product Details Unavailable',
          brand: catalogProduct?.brand,
          category_id: catalogProduct?.category_id,
          category_name: catalogProduct?.category_name,
          current_price: catalogProduct?.current_price || 0,
          currency: catalogProduct?.currency || 'ZAR',
          barcode: catalogProduct?.barcode,
          uom: catalogProduct?.uom,
          pack_size: catalogProduct?.pack_size,
          qty_on_hand: catalogProduct?.qty_on_hand,
          is_in_stock: catalogProduct?.is_in_stock || false,
          selected_at: item.selected_at || catalogProduct?.selected_at,
          is_selected: true,
        }
      })

      setProducts(enrichedProducts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products'
      console.error('Error fetching selection products:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selection_id])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.name_from_supplier.toLowerCase().includes(search) ||
        p.supplier_sku.toLowerCase().includes(search) ||
        p.supplier_name.toLowerCase().includes(search) ||
        (p.barcode && p.barcode.toLowerCase().includes(search))
      )
    }

    // Supplier filter
    if (filterSupplier) {
      filtered = filtered.filter(p => p.supplier_id === filterSupplier)
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(p => p.category_id === filterCategory)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof SelectionProduct]
      let bVal: any = b[sortColumn as keyof SelectionProduct]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, filterSupplier, filterCategory, sortColumn, sortDirection])

  // Get unique suppliers and categories for filters
  const suppliers = useMemo(() => {
    const unique = new Map()
    products.forEach(p => {
      if (p.supplier_id && !unique.has(p.supplier_id)) {
        unique.set(p.supplier_id, { id: p.supplier_id, name: p.supplier_name })
      }
    })
    return Array.from(unique.values())
  }, [products])

  const categories = useMemo(() => {
    const unique = new Map()
    products.forEach(p => {
      if (p.category_id && !unique.has(p.category_id)) {
        unique.set(p.category_id, { id: p.category_id, name: p.category_name })
      }
    })
    return Array.from(unique.values())
  }, [products])

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredProducts.map(p => p.supplier_product_id)))
    } else {
      setSelectedRows(new Set())
    }
  }, [filteredProducts])

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
    if (sortColumn === columnId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
  }, [sortColumn])

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

  // Render error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Error Loading Products</div>
              <div className="text-sm mt-1">{error}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProducts}
                className="mt-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
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
            <div className="flex gap-2 flex-wrap">
              {/* Supplier Filter */}
              {suppliers.length > 0 && (
                <Select
                  value={filterSupplier || ALL_SUPPLIERS_VALUE}
                  onValueChange={(value) =>
                    setFilterSupplier(value === ALL_SUPPLIERS_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SUPPLIERS_VALUE}>All Suppliers</SelectItem>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Category Filter */}
              {categories.length > 0 && (
                <Select
                  value={filterCategory || ALL_CATEGORIES_VALUE}
                  onValueChange={(value) =>
                    setFilterCategory(value === ALL_CATEGORIES_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

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
                onClick={fetchProducts}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
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
                              filteredProducts.length > 0 &&
                              selectedRows.size === filteredProducts.length
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
                {filteredProducts.map((product) => (
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
                              <Badge variant="secondary" className="text-xs">
                                -
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
                              <Badge variant="default" className="bg-green-100 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Selected
                              </Badge>
                              {product.is_in_stock && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  In Stock
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )
                      }

                      if (col.id === 'stock') {
                        return (
                          <TableCell key={col.id}>
                            {product.qty_on_hand !== undefined ? (
                              <div className="text-sm">{product.qty_on_hand}</div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )
                      }

                      if (col.id === 'first_seen') {
                        return (
                          <TableCell key={col.id} className="text-sm text-muted-foreground">
                            {product.first_seen_at ? formatDate(product.first_seen_at) : '-'}
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )
                      }

                      return null
                    })}
                  </TableRow>
                ))}

                {filteredProducts.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="h-64 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <div className="text-lg font-medium">No products found</div>
                        <div className="text-sm text-muted-foreground">
                          {searchTerm || filterSupplier || filterCategory
                            ? 'Try adjusting your filters'
                            : 'Add products to this selection to see them here'}
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

        {/* Pagination Info */}
        {filteredProducts.length > 0 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredProducts.length} of {products.length} products
                {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
              </div>
            </div>
          </div>
        )}
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
                  <div className="mt-1">{detailsProduct.category_name || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Price</label>
                  <div className="mt-1 font-medium">
                    {formatCurrency(detailsProduct.current_price || 0, detailsProduct.currency)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                  <div className="mt-1">{detailsProduct.qty_on_hand || 0}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                  <div className="mt-1 font-mono">{detailsProduct.barcode || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Selected At</label>
                  <div className="mt-1">{formatDate(detailsProduct.selected_at)}</div>
                </div>
              </div>

              {/* Status */}
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-100 text-green-700">Selected</Badge>
                {detailsProduct.is_in_stock && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">In Stock</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SupplierProductDataTable
