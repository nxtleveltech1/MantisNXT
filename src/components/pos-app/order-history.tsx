"use client"

import { useState, useEffect } from "react"
import { type Order, type OrderItem } from "@/lib/pos-app/neon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Receipt, Eye, Calendar } from "lucide-react"
import { toast } from "sonner"

interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/pos-app/orders?limit=50")
      if (!response.ok) throw new Error("Failed to fetch orders")
      const data = await response.json()
      setOrders(data || [])
    } catch (error: any) {
      toast.error("Failed to fetch orders")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "pending":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "refunded":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return "💵"
      case "card":
        return "💳"
      case "digital":
        return "📱"
      default:
        return "💰"
    }
  }

  const viewOrderDetails = (order: OrderWithItems) => {
    setSelectedOrder(order)
    setIsDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Receipt className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Order History</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>{order.order_items.length} items</TableCell>
                  <TableCell className="font-medium">${Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getPaymentMethodIcon(order.payment_method)}</span>
                      <span className="capitalize">{order.payment_method}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => viewOrderDetails(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>ID:</strong> {selectedOrder.id}
                    </p>
                    <p>
                      <strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}
                    </p>
                    <p>
                      <strong>Status:</strong>
                      <Badge variant={getStatusColor(selectedOrder.status)} className="ml-2">
                        {selectedOrder.status}
                      </Badge>
                    </p>
                    <p>
                      <strong>Payment:</strong> {getPaymentMethodIcon(selectedOrder.payment_method)}{" "}
                      {selectedOrder.payment_method}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Items:</strong> {selectedOrder.order_items.length}
                    </p>
                    <p>
                      <strong>Total:</strong> ${Number(selectedOrder.total_amount).toFixed(2)}
                    </p>
                    {selectedOrder.notes && (
                      <p>
                        <strong>Notes:</strong> {selectedOrder.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.order_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${Number(item.unit_price).toFixed(2)}</TableCell>
                        <TableCell>${Number(item.subtotal).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

