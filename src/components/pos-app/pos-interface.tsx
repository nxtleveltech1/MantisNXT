"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  Plus, Minus, ShoppingCart, CreditCard, DollarSign, Smartphone, 
  Search, X, Loader2, Package, AlertCircle, RefreshCw, Wallet
} from "lucide-react"
import { toast } from "sonner"
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
}

interface CartItem {
  product: POSProduct
  quantity: number
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

  // Transaction result state
  const [completedTransaction, setCompletedTransaction] = useState<POSTransactionResult | null>(null)

  // Fetch products from platform API
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true)
    setProductsError(null)

    try {
      const response = await fetch("/api/v1/products/pos?limit=200")
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

  // Filter products based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.barcode && product.barcode.toLowerCase().includes(term)) ||
        (product.category && product.category.toLowerCase().includes(term))
    )
    setFilteredProducts(filtered)
  }, [products, searchTerm])

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

    toast.success(`${product.name} added`)
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
      // Prepare sale items
      const items = cart.map((item) => ({
        product_id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        cost_price: item.product.base_cost,
        sale_price: item.product.sale_price,
        markup_percent: item.product.markup_percent,
      }))

      // Create POS sale via platform API
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
        // Handle both wrapped and unwrapped response formats
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
    fetchProducts() // Refresh product stock
  }

  // Stock badge color
  const getStockBadgeColor = (stock: number) => {
    if (stock === 0) return "destructive"
    if (stock <= 10) return "secondary"
    return "default"
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search Bar */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products ({filteredProducts.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchProducts}
                disabled={isLoadingProducts}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingProducts ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500">Loading products...</span>
              </div>
            ) : productsError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600 mb-2">{productsError}</p>
                <Button variant="outline" onClick={fetchProducts}>
                  Try Again
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-blue-200 ${
                      product.available_quantity === 0 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => product.available_quantity > 0 && addToCart(product)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-medium text-sm leading-tight line-clamp-2">
                            {product.name}
                          </h3>
                          <Badge
                            variant={getStockBadgeColor(product.available_quantity)}
                            className="text-xs shrink-0"
                          >
                            {product.available_quantity}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-blue-600">
                            R{product.sale_price.toFixed(2)}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {product.sku}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              +{product.markup_percent}%
                            </span>
                          </div>
                        </div>
                        {product.available_quantity === 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            Out of Stock
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Customer, Cart & Checkout */}
      <div className="space-y-4">
        {/* Customer Selector */}
        <CustomerSelector
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          disabled={isProcessing}
        />

        {/* Cart */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cart.length})
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          R{item.product.sale_price.toFixed(2)} each
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
                        <span className="w-6 text-center text-sm font-medium">
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
                        <div className="font-medium text-sm">
                          R{(item.product.sale_price * item.quantity).toFixed(2)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-red-500"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>R{getSubtotal().toFixed(2)}</span>
                  </div>
                  {getTaxAmount() > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">VAT (15%):</span>
                      <span>R{getTaxAmount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-blue-600">R{getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Checkout */}
        {cart.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: "cash" | "card" | "digital" | "account") =>
                    setPaymentMethod(value)
                  }
                >
                  <SelectTrigger className="h-11">
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
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
