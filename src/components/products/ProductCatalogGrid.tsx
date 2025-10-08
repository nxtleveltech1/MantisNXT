"use client"

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Grid3x3,
  List,
  SlidersHorizontal,
  Star,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Clock,
  DollarSign,
  Eye,
  ShoppingCart,
  Heart,
  Share2,
  MoreHorizontal,
  Filter,
  ArrowUpDown,
  Calendar,
  Box,
  Building2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap,
  Sparkles,
  Target,
  Activity,
  BarChart3,
  Tag,
  Bookmark,
  ExternalLink,
  Info,
  RefreshCw,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Enhanced Product Interface
interface Product {
  id: string
  sku: string
  name: string
  description: string
  category: string
  subcategory?: string
  brand: string
  unitPrice: number
  currency: string
  stockQuantity: number
  reorderPoint: number
  unitOfMeasure: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
    unit: string
  }
  images: Array<{
    url: string
    alt: string
    isPrimary: boolean
  }>
  supplier: {
    id: string
    name: string
    code: string
    rating: number
    deliveryTime: number
    reliability: number
  }
  metadata: {
    createdAt: Date
    updatedAt: Date
    lastOrderDate?: Date
    totalOrders: number
    averageOrderQuantity: number
    popularity: number
    seasonality?: 'high' | 'medium' | 'low'
    trends: {
      priceChange: number
      demandChange: number
      stockMovement: number
    }
  }
  compliance: {
    certifications: string[]
    hazardous: boolean
    restricted: boolean
    documentation: Array<{
      type: string
      url: string
      expiryDate?: Date
    }>
  }
  tags: string[]
  isActive: boolean
  isFavorite?: boolean
  isNew?: boolean
  isOnSale?: boolean
}

interface ProductCatalogGridProps {
  products: Product[]
  loading?: boolean
  onProductSelect?: (product: Product) => void
  onAddToCart?: (product: Product, quantity: number) => void
  onToggleFavorite?: (productId: string) => void
  enableBulkActions?: boolean
  showSupplierInfo?: boolean
  showStockLevels?: boolean
  showPriceHistory?: boolean
  viewMode?: 'grid' | 'list'
  itemsPerPage?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const ProductCatalogGrid: React.FC<ProductCatalogGridProps> = ({
  products = [],
  loading = false,
  onProductSelect,
  onAddToCart,
  onToggleFavorite,
  enableBulkActions = false,
  showSupplierInfo = true,
  showStockLevels = true,
  showPriceHistory = false,
  viewMode: initialViewMode = 'grid',
  itemsPerPage = 24,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  // State Management
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'popularity' | 'updated'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Auto-refresh functionality
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setLastRefresh(new Date())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Computed Values
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)))
    return cats.sort()
  }, [products])

  const brands = useMemo(() => {
    const brandsSet = Array.from(new Set(products.map(p => p.brand)))
    return brandsSet.sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    let filtered = products

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => selectedCategories.includes(p.category))
    }

    // Brand filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(p => selectedBrands.includes(p.brand))
    }

    // Price range filter
    filtered = filtered.filter(p =>
      p.unitPrice >= priceRange[0] && p.unitPrice <= priceRange[1]
    )

    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(p => {
        switch (stockFilter) {
          case 'in_stock':
            return p.stockQuantity > p.reorderPoint
          case 'low_stock':
            return p.stockQuantity > 0 && p.stockQuantity <= p.reorderPoint
          case 'out_of_stock':
            return p.stockQuantity === 0
          default:
            return true
        }
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = a.unitPrice - b.unitPrice
          break
        case 'stock':
          comparison = a.stockQuantity - b.stockQuantity
          break
        case 'popularity':
          comparison = a.metadata.popularity - b.metadata.popularity
          break
        case 'updated':
          comparison = a.metadata.updatedAt.getTime() - b.metadata.updatedAt.getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [products, searchTerm, selectedCategories, selectedBrands, priceRange, stockFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Helper Functions
  const getStockStatus = (product: Product) => {
    if (product.stockQuantity === 0) return { label: 'Out of Stock', color: 'error', icon: XCircle }
    if (product.stockQuantity <= product.reorderPoint) return { label: 'Low Stock', color: 'warning', icon: AlertTriangle }
    return { label: 'In Stock', color: 'success', icon: CheckCircle }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  // Event Handlers
  const handleProductSelect = useCallback((product: Product) => {
    onProductSelect?.(product)
  }, [onProductSelect])

  const handleAddToCart = useCallback((product: Product, quantity: number = 1) => {
    onAddToCart?.(product, quantity)
  }, [onAddToCart])

  const handleToggleFavorite = useCallback((productId: string) => {
    onToggleFavorite?.(productId)
  }, [onToggleFavorite])

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategories([])
    setSelectedBrands([])
    setPriceRange([0, 10000])
    setStockFilter('all')
    setSortBy('name')
    setSortOrder('asc')
    setCurrentPage(1)
  }

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="p-4 bg-primary-100 rounded-full"
          >
            <RefreshCw className="h-8 w-8 text-primary-600" />
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search products by name, SKU, brand, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base bg-white border-2 border-neutral-200 focus:border-primary-400 rounded-xl shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-neutral-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 px-4"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {(selectedCategories.length + selectedBrands.length > 0 || stockFilter !== 'all') && (
              <Badge variant="secondary" className="ml-2">
                {selectedCategories.length + selectedBrands.length + (stockFilter !== 'all' ? 1 : 0)}
              </Badge>
            )}
          </Button>

          {/* Sort Controls */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-32 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="popularity">Popular</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-10 px-3"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Categories</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {categories.map(category => (
                        <label key={category} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, category])
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== category))
                              }
                            }}
                            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Brand Filter */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Brands</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {brands.map(brand => (
                        <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBrands([...selectedBrands, brand])
                              } else {
                                setSelectedBrands(selectedBrands.filter(b => b !== brand))
                              }
                            }}
                            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{brand}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Stock Filter */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Stock Status</label>
                    <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="low_stock">Low Stock</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="justify-start"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Results
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Showing {paginatedProducts.length} of {filteredProducts.length} products
          </span>
          {autoRefresh && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              Last updated: {formatDate(lastRefresh)}
            </div>
          )}
        </div>

        {enableBulkActions && selectedProducts.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedProducts.size} selected
            </span>
            <Button variant="outline" size="sm">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Add to Favorites
            </Button>
          </div>
        )}
      </div>

      {/* Products Display */}
      {paginatedProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your filters or search terms
          </p>
          <Button onClick={clearFilters} variant="outline">
            Clear All Filters
          </Button>
        </motion.div>
      ) : (
        <div className={cn(
          "grid gap-6 transition-all duration-300",
          viewMode === 'grid'
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        )}>
          <AnimatePresence mode="popLayout">
            {paginatedProducts.map((product) => {
              const stockStatus = getStockStatus(product)
              const StockIcon = stockStatus.icon

              return viewMode === 'grid' ? (
                // Grid View Card
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="group"
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  <Card className={cn(
                    "h-full transition-all duration-300 cursor-pointer border-2",
                    "hover:shadow-2xl hover:scale-[1.02] hover:border-primary-300",
                    "group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-primary-50"
                  )}>
                    {/* Product Image & Status Badges */}
                    <div className="relative p-4 pb-2">
                      <div className="aspect-square bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl overflow-hidden mb-4 relative">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].alt}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-16 w-16 text-neutral-300" />
                          </div>
                        )}

                        {/* Status Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {product.isNew && (
                            <Badge className="bg-primary-500 text-white shadow-lg">
                              <Sparkles className="h-3 w-3 mr-1" />
                              New
                            </Badge>
                          )}
                          {product.isOnSale && (
                            <Badge className="bg-error-500 text-white shadow-lg">
                              <Tag className="h-3 w-3 mr-1" />
                              Sale
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className={cn(
                          "absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-300",
                          hoveredProduct === product.id ? "opacity-100" : "opacity-0"
                        )}>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleFavorite(product.id)
                            }}
                          >
                            <Heart className={cn(
                              "h-4 w-4",
                              product.isFavorite ? "fill-current text-red-500" : ""
                            )} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleProductSelect(product)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Stock Status */}
                      <div className="flex items-center gap-2 mb-3">
                        <StockIcon className={cn("h-4 w-4", {
                          "text-success-600": stockStatus.color === 'success',
                          "text-warning-600": stockStatus.color === 'warning',
                          "text-error-600": stockStatus.color === 'error'
                        })} />
                        <Badge
                          variant="outline"
                          className={cn("text-xs", {
                            "border-success-300 text-success-700 bg-success-50": stockStatus.color === 'success',
                            "border-warning-300 text-warning-700 bg-warning-50": stockStatus.color === 'warning',
                            "border-error-300 text-error-700 bg-error-50": stockStatus.color === 'error'
                          })}
                        >
                          {stockStatus.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {product.stockQuantity} {product.unitOfMeasure}
                        </span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="space-y-3">
                        {/* Title & SKU */}
                        <div>
                          <h3 className="font-semibold text-gray-900 leading-tight mb-1 line-clamp-2 group-hover:text-primary-700 transition-colors">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-neutral-100 px-2 py-1 rounded font-mono">
                              {product.sku}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Price & Brand */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCurrency(product.unitPrice, product.currency)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              per {product.unitOfMeasure}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-700">
                              {product.brand}
                            </div>
                            {showSupplierInfo && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {product.supplier.name}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Performance Indicators */}
                        {product.metadata.trends && (
                          <div className="flex items-center gap-4 text-xs">
                            {product.metadata.trends.priceChange !== 0 && (
                              <div className={cn("flex items-center gap-1", {
                                "text-success-600": product.metadata.trends.priceChange < 0,
                                "text-error-600": product.metadata.trends.priceChange > 0
                              })}>
                                {product.metadata.trends.priceChange > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {Math.abs(product.metadata.trends.priceChange)}%
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <BarChart3 className="h-3 w-3" />
                              {product.metadata.popularity}% popular
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <Button
                          className="w-full group-hover:bg-primary-600 group-hover:text-white transition-colors"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddToCart(product)
                          }}
                          disabled={product.stockQuantity === 0}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                // List View Row
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary-500">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl overflow-hidden flex-shrink-0">
                          {product.images.length > 0 ? (
                            <img
                              src={product.images[0].url}
                              alt={product.images[0].alt}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Package className="h-8 w-8 text-neutral-300" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-4">
                              <h3 className="font-semibold text-lg text-gray-900 mb-1 truncate">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                <code className="bg-neutral-100 px-2 py-1 rounded font-mono">
                                  {product.sku}
                                </code>
                                <span>{product.brand}</span>
                                <Badge variant="outline" className="text-xs">
                                  {product.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {product.description}
                              </p>
                            </div>

                            {/* Price & Stock */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl font-bold text-gray-900 mb-1">
                                {formatCurrency(product.unitPrice, product.currency)}
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <StockIcon className={cn("h-4 w-4", {
                                  "text-success-600": stockStatus.color === 'success',
                                  "text-warning-600": stockStatus.color === 'warning',
                                  "text-error-600": stockStatus.color === 'error'
                                })} />
                                <span className="text-sm font-medium">
                                  {product.stockQuantity} {product.unitOfMeasure}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Supplier & Actions */}
                          <div className="flex items-center justify-between">
                            {showSupplierInfo && (
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span>{product.supplier.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span>{product.supplier.rating}/5</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>{product.supplier.deliveryTime} days</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleFavorite(product.id)
                                }}
                              >
                                <Heart className={cn(
                                  "h-4 w-4",
                                  product.isFavorite ? "fill-current text-red-500" : ""
                                )} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleProductSelect(product)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddToCart(product)
                                }}
                                disabled={product.stockQuantity === 0}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10 h-10 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductCatalogGrid