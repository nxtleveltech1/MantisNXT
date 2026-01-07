"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Plus, Minus, MessageCircle, Phone, Eye, ArrowLeft, Settings } from "lucide-react"
import { useAuth } from '@/lib/auth/auth-context'

interface Product {
  id: number
  name: string
  price: number
  image: string
  description: string
  category: string
  features: string[]
  specifications: { [key: string]: string }
}

interface CartItem extends Product {
  quantity: number
}

// South African ZAR pricing - English
const formatZAR = (price: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(price)

const originalProducts: Product[] = [
  {
    id: 1,
    name: "Premium Bluetooth Headphones",
    price: 2999.99,
    image: "/marketing/fone-bluetooth-premium.jpg",
    description:
      "Wireless headphones with active noise cancellation and long-lasting battery. Perfect for music, calls, and work.",
    category: "Audio",
    features: ["Bluetooth 5.0", "Noise Cancellation", "30h Battery", "IPX4 Water Resistant"],
    specifications: {
      Connectivity: "Bluetooth 5.0",
      Battery: "30 hours",
      Resistance: "IPX4",
      Weight: "250g",
      Warranty: "1 year",
    },
  },
  {
    id: 2,
    name: "USB-C Fast Charger 65W",
    price: 899.99,
    image: "/marketing/carregador-usb-c.jpg",
    description:
      "Universal fast charger compatible with smartphones, tablets, and laptops. Smart charging technology.",
    category: "Chargers",
    features: ["65W Fast Charging", "USB-C PD", "Overcharge Protection", "Compact & Portable"],
    specifications: {
      Power: "65W",
      Input: "100-240V",
      Output: "USB-C PD",
      Dimensions: "6x6x3cm",
      Warranty: "2 years",
    },
  },
  {
    id: 3,
    name: "Original USB-C Cable 2m",
    price: 499.99,
    image: "/marketing/cabo-usb-c.jpg",
    description:
      "High-quality original USB-C cable for charging and data transfer. Premium and durable materials.",
    category: "Cables",
    features: ["2 Metre Length", "USB-C to USB-C", "Fast Transfer", "Durable Build"],
    specifications: {
      Length: "2 metres",
      Type: "USB-C to USB-C",
      Speed: "480 Mbps",
      Material: "Braided Nylon",
      Warranty: "1 year",
    },
  },
  {
    id: 4,
    name: "Wireless Charging Pad 15W",
    price: 1299.99,
    image: "/marketing/carregador-wireless.jpg",
    description:
      "Wireless charging base compatible with all Qi devices. Elegant design with efficient charging.",
    category: "Chargers",
    features: ["15W Charging", "Qi Compatible", "LED Indicator", "Elegant Design"],
    specifications: {
      Power: "15W maximum",
      Compatibility: "Qi universal",
      Dimensions: "10x10x1cm",
      Material: "Premium Aluminium",
      Warranty: "2 years",
    },
  },
  {
    id: 5,
    name: "RGB Gaming Headset",
    price: 1999.99,
    image: "/marketing/fone-gaming.jpg",
    description:
      "Gaming headset with RGB lighting and detachable microphone. Surround sound for the ultimate gaming experience.",
    category: "Audio",
    features: ["7.1 Surround Sound", "Detachable Mic", "RGB Lighting", "Comfortable Cushions"],
    specifications: {
      Connectivity: "USB + 3.5mm",
      Drivers: "50mm",
      Frequency: "20Hz-20kHz",
      Weight: "320g",
      Warranty: "1 year",
    },
  },
  {
    id: 6,
    name: "Power Bank 20000mAh",
    price: 1599.99,
    image: "/marketing/power-bank.jpg",
    description:
      "High-capacity power bank with fast charging and multiple ports. Perfect for travel and everyday use.",
    category: "Chargers",
    features: ["20000mAh", "Fast Charging", "3 USB Ports", "Digital Display"],
    specifications: {
      Capacity: "20000mAh",
      Ports: "2x USB-A + 1x USB-C",
      Input: "USB-C 18W",
      Output: "22.5W maximum",
      Warranty: "1 year",
    },
  },
]

export default function MarketingApp() {
  const [products, setProducts] = useState<Product[]>(originalProducts)
  const storeName = process.env.NEXT_PUBLIC_MARKETING_STORE_NAME || "Luizinho"
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productQuantity, setProductQuantity] = useState(1)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    // Could integrate with MantisNXT stats API if needed
    // For now, using static data to maintain independence
  }

  const openProductModal = (product: Product) => {
    setSelectedProduct(product)
    setProductQuantity(1)
    setIsProductModalOpen(true)
  }

  const closeProductModal = () => {
    setIsProductModalOpen(false)
    setSelectedProduct(null)
    setProductQuantity(1)
  }

  const addToCartFromModal = () => {
    if (selectedProduct) {
      setCart((prevCart) => {
        const existingItem = prevCart.find((item) => item.id === selectedProduct.id)
        if (existingItem) {
          return prevCart.map((item) =>
            item.id === selectedProduct.id ? { ...item, quantity: item.quantity + productQuantity } : item,
          )
        }
        return [...prevCart, { ...selectedProduct, quantity: productQuantity }]
      })
      closeProductModal()
    }
  }

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId)
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
      }
      return prevCart.filter((item) => item.id !== productId)
    })
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const generateWhatsAppMessage = () => {
    if (cart.length === 0) return ""

    let message = "🛒 *Hi! I'd like to place an order:*\n\n"

    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.name}*\n`
      message += `   Quantity: ${item.quantity}\n`
      message += `   Unit price: ${formatZAR(item.price)}\n`
      message += `   Subtotal: ${formatZAR(item.price * item.quantity)}\n\n`
    })

    message += `💰 *Total: ${formatZAR(getTotalPrice())}*\n\n`
    message += "Awaiting confirmation and delivery details! 😊"

    return encodeURIComponent(message)
  }

  const sendWhatsAppMessage = () => {
    const phoneNumber = process.env.NEXT_PUBLIC_MARKETING_WHATSAPP_NUMBER || "5511932162209"
    const message = generateWhatsAppMessage()
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={`${storeName} - Social Media Marketing`} subtitle="WhatsApp Sales Platform" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.push("/portal")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/marketing-app/promo")}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Promo
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/marketing-app/stories")}>
              <Eye className="h-4 w-4 mr-2" />
              Stories
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/marketing-app/download")}>
              <Settings className="h-4 w-4 mr-2" />
              Downloads
            </Button>

              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart
                    {getTotalItems() > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {getTotalItems()}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Shopping Cart</SheetTitle>
                    <SheetDescription>
                      {cart.length === 0 ? "Your cart is empty" : `${getTotalItems()} item(s) in cart`}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={60}
                          height={60}
                          className="rounded-md object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-sm text-gray-600">{formatZAR(item.price)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => addToCart(item)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {cart.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex justify-between items-center font-bold text-lg">
                            <span>Total:</span>
                            <span>{formatZAR(getTotalPrice())}</span>
                          </div>
                          <Button
                            onClick={sendWhatsAppMessage}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="lg"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Send Order via WhatsApp
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-lg text-gray-600">Find the best electronic accessories with guaranteed quality</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative group">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                />
                <Badge className="absolute top-2 left-2">{product.category}</Badge>
              </div>

              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {product.features.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {product.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{product.features.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">{formatZAR(product.price)}</span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openProductModal(product)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button onClick={() => addToCart(product)} className="bg-green-600 hover:bg-green-700" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Product Details Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProduct.name}</DialogTitle>
                <DialogDescription>{selectedProduct.description}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Product Image */}
                <div className="space-y-4">
                  <div className="relative group">
                    <img
                      src={selectedProduct.image || "/placeholder.svg"}
                      alt={selectedProduct.name}
                      width={400}
                      height={400}
                      className="w-full rounded-lg object-cover"
                    />
                  </div>
                  <Badge className="w-fit">{selectedProduct.category}</Badge>
                </div>

                {/* Product Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Features</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProduct.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="justify-start">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Specifications</h3>
                    <div className="space-y-2">
                      {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span className="text-gray-600">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Price and Quantity */}
                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-green-600">{formatZAR(selectedProduct.price)}</div>

                    <div className="flex items-center space-x-4">
                      <span className="font-medium">Quantity:</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{productQuantity}</span>
                        <Button variant="outline" size="icon" onClick={() => setProductQuantity(productQuantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">Subtotal:</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatZAR(selectedProduct.price * productQuantity)}
                      </span>
                    </div>

                    <Button onClick={addToCartFromModal} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add {productQuantity} to Cart
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

          {/* Footer */}
          <div className="bg-gray-900 text-white py-8 mt-12 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{storeName} - Your Electronics Store</h3>
              <p className="text-gray-400 mb-4">Quality products with fast delivery</p>
              <div className="flex justify-center items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                <span>Contact us via WhatsApp for inquiries</span>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
