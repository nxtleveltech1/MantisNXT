"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, Minus, ShoppingCart, CreditCard, DollarSign, Smartphone, 
  Search, X, Loader2, Package, AlertCircle, RefreshCw, Wallet,
  ArrowUpDown, Columns, ShoppingBag
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import CustomerSelector, { type POSCustomer } from "./customer-selector"
import TransactionComplete, { type POSTransactionResult } from "./transaction-complete"

// Product type from the platform API
interface POSProduct {
  id: string
  sku: string
  name: string
  description: string | null
  category: string | null
  brand: string | null
  base_cost: number
  sale_price: number
  markup_percent: number
  available_quantity: number
  image_url: string | null
  barcode: string | null
  is_active: boolean
  supplier_name?: string | null
}

interface CartItem {
  product: POSProduct
  quantity: number
}

// Column configuration
type ColumnId = 'sku' | 'name' | 'supplier' | 'category' | 'cost' | 'price' | 'markup' | 'stock' | 'action'

interface ColumnConfig {
  id: ColumnId
  label: string
  visible: boolean
  sortable: boolean
  width?: string
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'sku', label: 'SKU', visible: true, sortable: true, width: 'w-28' },
  { id: 'name', label: 'Product Name', visible: true, sortable: true },
  { id: 'supplier', label: 'Supplier', visible: true, sortable: true, width: 'w-36' },
  { id: 'category', label: 'Category', visible: false, sortable: true, width: 'w-28' },
  { id: 'cost', label: 'Cost', visible: true, sortable: true, width: 'w-24' },
  { id: 'price', label: 'Sale Price', visible: true, sortable: true, width: 'w-28' },
  { id: 'markup', label: 'Markup', visible: false, sortable: true, width: 'w-20' },
  { id: 'stock', label: 'Stock', visible: true, sortable: true, width: 'w-24' },
  { id: 'action', label: '', visible: true, sortable: false, width: 'w-20' },
]

/**
 * Get stock status styling
 */
function getStockStatus(qty: number): {
  status: 'out_of_stock' | 'low_stock' | 'in_stock'
  label: string
  colorClass: string
  variant: 'default' | 'secondary' | 'destructive'
} {
  if (qty === 0) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      colorClass: 'bg-red-500/10 text-red-700 border-red-500/20',
      variant: 'destructive',
    }
  }
  if (qty <= 10) {
    return {
      status: 'low_stock',
      label: `Low (${qty})`,
      colorClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
      variant: 'secondary',
    }
  }
  return {
    status: 'in_stock',
    label: `${qty} avail`,
    colorClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    variant: 'default',
  }
}

export default function POSInterface() {
  // Product state
  const [products, setProducts] = useState<POSProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<POSProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  // Customer state  
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])

  // Checkout state
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "digital" | "account">("cash")
  const [paymentReference, setPaymentReference] = useState("")
  const [notes, setNotes] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Table state
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Transaction result state
  const [completedTransaction, setCompletedTransaction] = useState<POSTransactionResult | null>(null)

  // Fetch products from platform API
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true)
    setProductsError(null)

    try {
      const response = await fetch("/api/v1/products/pos?limit=500")
      const data = await response.json()

      if (data.success && data.data) {
        setProducts(data.data)
        setFilteredProducts(data.data)
      } else {
        throw new Error(data.error || "Failed to fetch products")
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
      setProductsError(error instanceof Error ? error.message : "Failed to load products")
      toast.error("Failed to load products from platform")
    } finally {
      setIsLoadingProducts(false)
    }
  }, [])

  // Load products on mount
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          (product.barcode && product.barcode.toLowerCase().includes(term)) ||
          (product.category && product.category.toLowerCase().includes(term)) ||
          (product.supplier_name && product.supplier_name.toLowerCase().includes(term))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortColumn as keyof POSProduct]
      const bVal = b[sortColumn as keyof POSProduct]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, sortColumn, sortDirection])

  // Column visibility
  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns])

  const toggleColumn = useCallback((columnId: ColumnId) => {
    setColumns(prev =>
      prev.map(col => (col.id === columnId ? { ...col, visible: !col.visible } : col))
    )
  }, [])

  // Sorting
  const handleSort = useCallback(
    (columnId: string) => {
      if (sortColumn === columnId) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortColumn(columnId)
        setSortDirection('asc')
      }
    },
    [sortColumn]
  )

  // Add product to cart
  const addToCart = (product: POSProduct) => {
    if (product.available_quantity <= 0) {
      toast.error(`${product.name} is currently out of stock`)
      return
    }

    setCart((prev) => {
      const existingItem = prev.find((item) => item.product.id === product.id)
      if (existingItem) {
        if (existingItem.quantity >= product.available_quantity) {
          toast.error(`Only ${product.available_quantity} units available`)
          return prev
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })

    toast.success(`${product.name} added`, { duration: 1500 })
  }

  // Add selected products to cart
  const addSelectedToCart = () => {
    const selectedProducts = filteredProducts.filter(p => selectedRows.has(p.id) && p.available_quantity > 0)
    if (selectedProducts.length === 0) {
      toast.error("No in-stock products selected")
      return
    }

    selectedProducts.forEach(product => {
      setCart((prev) => {
        const existingItem = prev.find((item) => item.product.id === product.id)
        if (existingItem) {
          return prev
        }
        return [...prev, { product, quantity: 1 }]
      })
    })

    toast.success(`Added ${selectedProducts.length} products to cart`)
    setSelectedRows(new Set())
  }

  // Update cart item quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId))
    } else {
      const product = products.find((p) => p.id === productId)
      if (product && newQuantity > product.available_quantity) {
        toast.error(`Only ${product.available_quantity} units available`)
        return
      }
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: newQuantity } : item
        )
      )
    }
  }

  // Remove item from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  // Calculate cart totals
  const getSubtotal = () => {
    return cart.reduce((total, item) => total + item.product.sale_price * item.quantity, 0)
  }

  const getTaxAmount = () => {
    return 0 // VAT included in price for now
  }

  const getTotal = () => {
    return getSubtotal() + getTaxAmount()
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setNotes("")
    setPaymentReference("")
  }

  // Process order via platform API
  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    if (!selectedCustomer) {
      toast.error("Please select a customer or use Walk-in")
      return
    }

    setIsProcessing(true)
    try {
      const items = cart.map((item) => ({
        product_id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        cost_price: item.product.base_cost,
        sale_price: item.product.sale_price,
        markup_percent: item.product.markup_percent,
      }))

      const response = await fetch("/api/v1/sales/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: process.env.NEXT_PUBLIC_ORG_ID || "00000000-0000-0000-0000-000000000001",
          customer_id: selectedCustomer.id,
          payment_method: paymentMethod,
          payment_reference: paymentReference || undefined,
          items,
          notes: notes || undefined,
        }),
      })

      const data = await response.json()

      if (data.success || data.transaction_id) {
        const transaction: POSTransactionResult = data.data || data
        setCompletedTransaction(transaction)
        toast.success(`Sale Complete! Invoice: ${transaction.invoice_number}`)
      } else {
        throw new Error(data.error || "Failed to process sale")
      }
    } catch (error) {
      console.error("Order processing error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process order")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle transaction complete - start new sale
  const handleNewSale = () => {
    setCompletedTransaction(null)
    clearCart()
    setSelectedCustomer(null)
    fetchProducts()
  }

  // Payment method icon
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <DollarSign className="h-4 w-4" />
      case "card":
        return <CreditCard className="h-4 w-4" />
      case "digital":
        return <Smartphone className="h-4 w-4" />
      case "account":
        return <Wallet className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRows(new Set(filteredProducts.map(p => p.id)))
      } else {
        setSelectedRows(new Set())
      }
    },
    [filteredProducts]
  )

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

  // Show transaction complete screen
  if (completedTransaction) {
    return (
      <TransactionComplete
        transaction={completedTransaction}
        onNewSale={handleNewSale}
      />
    )
  }

  return (
    <div className="flex gap-6 p-6 h-[calc(100vh-4rem)] max-w-[1920px] mx-auto">
      {/* Products Section - Data Table */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <Card className="mb-4 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, SKU, barcode, supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Add selected to cart */}
                {selectedRows.size > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={addSelectedToCart}
                    className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add {selectedRows.size} to Cart
                  </Button>
                )}

                {/* Column Visibility */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Columns className="h-4 w-4" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {columns.map(
                      col =>
                        col.id !== 'action' && (
                          <DropdownMenuCheckboxItem
                            key={col.id}
                            checked={col.visible}
                            onCheckedChange={() => toggleColumn(col.id)}
                          >
                            {col.label}
                          </DropdownMenuCheckboxItem>
                        )
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProducts}
                  disabled={isLoadingProducts}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingProducts && "animate-spin")} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="flex-1 border-0 shadow-lg overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
                  <Package className="h-5 w-5 text-white" />
                </div>
                Products Catalog
              </CardTitle>
              <Badge variant="secondary" className="px-3 py-1 font-semibold">
                {filteredProducts.length} products
              </Badge>
            </div>
          </CardHeader>

          <div className="flex-1 overflow-hidden relative">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading products...</span>
              </div>
            ) : productsError ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600 mb-4">{productsError}</p>
                <Button variant="outline" onClick={fetchProducts}>
                  Try Again
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">No products found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm ? 'Try adjusting your search' : 'No products available'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="hover:bg-transparent border-b-2">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredProducts.length > 0 &&
                            selectedRows.size === filteredProducts.length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      {visibleColumns.map(col => {
                        if (col.id === 'action') {
                          return <TableHead key={col.id} className={col.width} />
                        }

                        return (
                          <TableHead key={col.id} className={col.width}>
                            {col.sortable ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8 gap-1 font-semibold"
                                onClick={() => handleSort(col.id)}
                              >
                                {col.label}
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            ) : (
                              <span className="font-semibold">{col.label}</span>
                            )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredProducts.map((product, index) => {
                      const stockInfo = getStockStatus(product.available_quantity)
                      const isInCart = cart.some(item => item.product.id === product.id)

                      return (
                        <TableRow
                          key={product.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                            isInCart && 'bg-emerald-50 dark:bg-emerald-950/20',
                            product.available_quantity === 0 && 'opacity-60'
                          )}
                          onClick={() => product.available_quantity > 0 && addToCart(product)}
                        >
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(product.id)}
                              onCheckedChange={checked =>
                                handleSelectRow(product.id, checked as boolean)
                              }
                              aria-label={`Select ${product.name}`}
                            />
                          </TableCell>

                          {visibleColumns.map(col => {
                            if (col.id === 'sku') {
                              return (
                                <TableCell key={col.id} className="font-mono text-sm">
                                  <Badge variant="outline" className="font-mono">
                                    {product.sku}
                                  </Badge>
                                </TableCell>
                              )
                            }

                            if (col.id === 'name') {
                              return (
                                <TableCell key={col.id}>
                                  <div className="max-w-sm">
                                    <div className="font-medium truncate">
                                      {product.name}
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
                                <TableCell key={col.id} className="text-sm">
                                  {product.supplier_name || '-'}
                                </TableCell>
                              )
                            }

                            if (col.id === 'category') {
                              return (
                                <TableCell key={col.id}>
                                  {product.category ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {product.category}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )
                            }

                            if (col.id === 'cost') {
                              return (
                                <TableCell key={col.id} className="font-medium text-muted-foreground">
                                  R{product.base_cost.toFixed(2)}
                                </TableCell>
                              )
                            }

                            if (col.id === 'price') {
                              return (
                                <TableCell key={col.id}>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    R{product.sale_price.toFixed(2)}
                                  </span>
                                </TableCell>
                              )
                            }

                            if (col.id === 'markup') {
                              return (
                                <TableCell key={col.id} className="text-sm text-muted-foreground">
                                  +{product.markup_percent}%
                                </TableCell>
                              )
                            }

                            if (col.id === 'stock') {
                              return (
                                <TableCell key={col.id}>
                                  <Badge
                                    variant={stockInfo.variant}
                                    className={cn('text-xs font-medium', stockInfo.colorClass)}
                                  >
                                    {stockInfo.label}
                                  </Badge>
                                </TableCell>
                              )
                            }

                            if (col.id === 'action') {
                              return (
                                <TableCell key={col.id} onClick={e => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant={isInCart ? "secondary" : "default"}
                                    className={cn(
                                      "h-8 px-3",
                                      !isInCart && "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                    )}
                                    disabled={product.available_quantity === 0}
                                    onClick={() => addToCart(product)}
                                  >
                                    {isInCart ? (
                                      <Plus className="h-4 w-4" />
                                    ) : (
                                      <ShoppingCart className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                              )
                            }

                            return null
                          })}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          {filteredProducts.length > 0 && (
            <div className="border-t p-3 bg-muted/30">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {filteredProducts.length} of {products.length} products
                  {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
                </span>
                <span>
                  Click row to add to cart
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Sidebar - Customer, Cart & Checkout */}
      <div className="w-96 flex-shrink-0 flex flex-col gap-4">
        {/* Customer Selector */}
        <CustomerSelector
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          disabled={isProcessing}
        />

        {/* Cart */}
        <Card className="border-0 shadow-lg flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                Cart ({cart.length})
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-600">
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">Cart is empty</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Click products to add them</p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            R{item.product.sale_price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right w-20">
                          <div className="font-semibold text-sm text-emerald-600">
                            R{(item.product.sale_price * item.quantity).toFixed(2)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="border-t p-4 space-y-4 bg-background">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>R{getSubtotal().toFixed(2)}</span>
                    </div>
                    {getTaxAmount() > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT (15%):</span>
                        <span>R{getTaxAmount().toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-emerald-600">R{getTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Method</label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(value: "cash" | "card" | "digital" | "account") =>
                        setPaymentMethod(value)
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Cash
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Card
                          </div>
                        </SelectItem>
                        <SelectItem value="digital">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Digital / EFT
                          </div>
                        </SelectItem>
                        <SelectItem value="account">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            On Account
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(paymentMethod === "card" || paymentMethod === "digital") && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reference Number</label>
                      <Input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Transaction reference..."
                        className="h-10"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Order notes..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    onClick={processOrder}
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
                    disabled={isProcessing || !selectedCustomer}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {getPaymentIcon(paymentMethod)}
                        Complete Sale - R{getTotal().toFixed(2)}
                      </div>
                    )}
                  </Button>

                  {!selectedCustomer && (
                    <p className="text-xs text-center text-amber-600">
                      Select a customer to complete the sale
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
