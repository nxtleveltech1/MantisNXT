"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  SortAsc,
  SortDesc,
  Eye,
  Building2,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Grid3X3,
  List,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface ProductCatalogItem {
  id: string
  sku: string
  name: string
  description: string
  price: number
  currency: string
  supplier: {
    id: string
    name: string
  }
  pricelist: {
    id: string
    name: string
    validFrom: string
    validTo: string | null
  }
  category?: string
  brand?: string
  inStock: boolean
  lastUpdated: string
}

interface CatalogResponse {
  products: ProductCatalogItem[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  filters: {
    priceRange: {
      min: number
      max: number
      average: number
    }
  }
  metadata: {
    lastUpdated: string
    dataSource: string
    totalValue: number
  }
}

interface CatalogFilters {
  search: string
  supplier: string
  priceRange: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const INITIAL_FILTERS: CatalogFilters = {
  search: '',
  supplier: '',
  priceRange: '',
  sortBy: 'name',
  sortOrder: 'asc'
}

const ALL_SUPPLIERS_VALUE = '__all-suppliers__'
const ANY_PRICE_VALUE = '__any-price__'

export default function RealProductCatalog() {
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductCatalogItem[]>([])
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  const [filters, setFilters] = useState<CatalogFilters>(INITIAL_FILTERS)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  })
  const [metadata, setMetadata] = useState({
    lastUpdated: '',
    dataSource: '',
    totalValue: 0,
    priceRange: { min: 0, max: 0, average: 0 }
  })
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const fetchProducts = useCallback(async (resetOffset = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const searchParams = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: resetOffset ? '0' : pagination.offset.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.supplier && { supplier: filters.supplier }),
        ...(filters.priceRange && { priceRange: filters.priceRange }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      })

      const response = await fetch(`/api/products/catalog?${searchParams}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: CatalogResponse = await response.json()
      
      if (resetOffset) {
        setProducts(data.products)
        setPagination({ ...data.pagination, offset: 0 })
      } else {
        setProducts(prev => pagination.offset === 0 ? data.products : [...prev, ...data.products])
        setPagination(data.pagination)
      }
      
      setMetadata({
        ...data.metadata,
        priceRange: data.filters.priceRange
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit, pagination.offset, toast])

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetch('/api/suppliers/real-data?limit=100')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers.map((s: unknown) => ({ id: s.id, name: s.name })))
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }, [])

  useEffect(() => {
    fetchProducts(true)
  }, [fetchProducts, filters])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleFilterChange = useCallback((key: keyof CatalogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSort = useCallback((sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const loadMoreProducts = useCallback(() => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))
      fetchProducts(false)
    }
  }, [pagination.hasMore, loading, fetchProducts])

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
  }, [])

  const priceRangeOptions = useMemo(() => {
    if (metadata.priceRange.max === 0) return []
    const { min, max } = metadata.priceRange
    const ranges = [
      { label: `Under R${Math.round(max * 0.1).toLocaleString()}`, value: `0-${max * 0.1}` },
      { label: `R${Math.round(max * 0.1).toLocaleString()} - R${Math.round(max * 0.5).toLocaleString()}`, value: `${max * 0.1}-${max * 0.5}` },
      { label: `R${Math.round(max * 0.5).toLocaleString()} - R${Math.round(max * 0.8).toLocaleString()}`, value: `${max * 0.5}-${max * 0.8}` },
      { label: `Over R${Math.round(max * 0.8).toLocaleString()}`, value: `${max * 0.8}-${max}` }
    ]
    return ranges
  }, [metadata.priceRange])

  const ProductCard = ({ product }: { product: ProductCatalogItem }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedProduct(product)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-medium truncate">{product.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{product.sku}</p>
          </div>
          <Badge variant={product.inStock ? 'default' : 'secondary'}>
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground truncate">{product.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(product.price, product.currency)}
            </span>
            <Badge variant="outline" className="text-xs">
              {product.supplier.name}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">
            {pagination.total.toLocaleString()} products • Total Value: {formatCurrency(metadata.totalValue, 'ZAR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchProducts(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem>Export as Excel</DropdownMenuItem>
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Data Quality Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Data Freshness</p>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(metadata.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active Suppliers</p>
                <p className="text-xs text-muted-foreground">
                  {suppliers.length} suppliers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Average Price</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metadata.priceRange.average, 'ZAR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Data Source</p>
                <p className="text-xs text-muted-foreground">
                  {metadata.dataSource.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            <Select
              value={filters.supplier || ALL_SUPPLIERS_VALUE}
              onValueChange={(value) =>
                handleFilterChange('supplier', value === ALL_SUPPLIERS_VALUE ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SUPPLIERS_VALUE}>All Suppliers</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priceRange || ANY_PRICE_VALUE}
              onValueChange={(value) =>
                handleFilterChange('priceRange', value === ANY_PRICE_VALUE ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_PRICE_VALUE}>Any Price</SelectItem>
                {priceRangeOptions.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="price">Sort by Price</SelectItem>
                <SelectItem value="supplier">Sort by Supplier</SelectItem>
                <SelectItem value="updated">Sort by Updated</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {(filters.search || filters.supplier || filters.priceRange) && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.search && <Badge variant="secondary">{filters.search}</Badge>}
              {filters.supplier && <Badge variant="secondary">{suppliers.find(s => s.id === filters.supplier)?.name}</Badge>}
              {filters.priceRange && <Badge variant="secondary">{priceRangeOptions.find(r => r.value === filters.priceRange)?.label}</Badge>}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Display */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && products.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  Product {filters.sortBy === 'name' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('supplier')}
                >
                  Supplier {filters.sortBy === 'supplier' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('price')}
                >
                  Price {filters.sortBy === 'price' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {product.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{product.sku}</TableCell>
                  <TableCell>{product.supplier.name}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatCurrency(product.price, product.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.inStock ? 'default' : 'secondary'}>
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Load More */}
      {pagination.hasMore && (
        <div className="flex justify-center">
          <Button onClick={loadMoreProducts} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More Products`
            )}
          </Button>
        </div>
      )}

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
                <DialogDescription>{selectedProduct.sku}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
                    <p className="text-sm">{selectedProduct.description}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Price</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedProduct.price, selectedProduct.currency)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                    <Badge variant={selectedProduct.inStock ? 'default' : 'secondary'}>
                      {selectedProduct.inStock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Supplier</h4>
                    <p className="text-sm">{selectedProduct.supplier.name}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Price List</h4>
                    <p className="text-sm">{selectedProduct.pricelist.name}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Last Updated</h4>
                    <p className="text-sm">
                      {new Date(selectedProduct.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
