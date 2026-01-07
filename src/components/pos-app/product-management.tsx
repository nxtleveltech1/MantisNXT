"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { type Product } from "@/lib/pos-app/neon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Package } from "lucide-react"
import { toast } from "sonner"

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    sku: "",
    stock: "",
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/pos-app/products")
      if (!response.ok) throw new Error("Failed to fetch products")
      const data = await response.json()
      // Convert string values to numbers for proper calculation
      const normalizedData = (data || []).map((p: any) => ({
        ...p,
        price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        stock: typeof p.stock === 'string' ? parseInt(p.stock, 10) : (p.stock || 0),
      }))
      setProducts(normalizedData)
    } catch (error: any) {
      toast.error("Failed to fetch products")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      sku: "",
      stock: "",
    })
    setEditingProduct(null)
  }

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        sku: product.sku,
        stock: product.stock?.toString() || "0",
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: Number.parseFloat(formData.price),
      sku: formData.sku,
      stock: Number.parseInt(formData.stock),
    }

    try {
      if (editingProduct) {
        const response = await fetch(`/api/pos-app/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to update product")
        }
        toast.success("Product updated successfully")
      } else {
        const response = await fetch("/api/pos-app/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to create product")
        }
        toast.success("Product created successfully")
      }

      setIsDialogOpen(false)
      resetForm()
      fetchProducts()
    } catch (error: any) {
      toast.error(`Failed to save product: ${error.message}`)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      const response = await fetch(`/api/pos-app/products/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete product")
      }
      toast.success("Product deleted successfully")
      fetchProducts()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product")
    }
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { status: "Out of Stock", variant: "destructive" as const }
    if (stock <= 10) return { status: "Low Stock", variant: "secondary" as const }
    return { status: "In Stock", variant: "default" as const }
  }

  const lowStockProducts = products.filter((p) => p.stock !== undefined && p.stock <= 10)
  const outOfStockProducts = products.filter((p) => p.stock === 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Product Management</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingProduct ? "Update" : "Create"} Product
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStockProducts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 text-sm">Out of Stock ({outOfStockProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {outOfStockProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="flex justify-between items-center text-sm">
                      <span>{product.name}</span>
                      <span className="text-red-600">0 left</span>
                    </div>
                  ))}
                  {outOfStockProducts.length > 3 && (
                    <p className="text-xs text-red-600">+{outOfStockProducts.length - 3} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockProducts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800 text-sm">Low Stock ({lowStockProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {lowStockProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="flex justify-between items-center text-sm">
                      <span>{product.name}</span>
                      <span className="text-orange-600">{product.stock} left</span>
                    </div>
                  ))}
                  {lowStockProducts.length > 3 && (
                    <p className="text-xs text-orange-600">+{lowStockProducts.length - 3} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const stockStatus = getStockStatus(product.stock || 0)
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">{product.stock || 0}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDialog(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

