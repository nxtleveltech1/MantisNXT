"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Search, Download } from "lucide-react"

interface Product {
  supplier_product_id: string
  supplier_sku: string
  name_from_supplier: string
  supplier_name: string
  category_name: string | null
  proposed_category_name?: string | null
  proposed_category_status?: string | null
  ai_categorization_status: string
  ai_confidence: number | null
  ai_provider: string | null
  ai_categorized_at: string | null
}

interface ProductsTableProps {
  refreshTrigger?: number
}

export function ProductsTable({ refreshTrigger }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit] = useState(50)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("categorized_at")
  const [sortOrder, setSortOrder] = useState("desc")

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const response = await fetch(`/api/category/ai-categorization/products?${params}`)
      const data = await response.json()

      if (data.success) {
        setProducts(data.products)
        setTotal(data.total)
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }, [limit, page, search, sortBy, sortOrder, statusFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts, refreshTrigger])

  const handleSearch = () => {
    setPage(0)
    fetchProducts()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "pending_review":
        return <Badge variant="default" className="bg-amber-500">Pending Review</Badge>
      case "processing":
        return <Badge variant="default" className="bg-blue-500">Processing</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "skipped":
        return <Badge variant="outline">Skipped</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return <span className="text-muted-foreground">-</span>

    const percentage = (confidence * 100).toFixed(0)
    if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-green-500">{percentage}%</Badge>
    }
    if (confidence >= 0.6) {
      return <Badge variant="secondary">{percentage}%</Badge>
    }
    return <Badge variant="destructive">{percentage}%</Badge>
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              {total.toLocaleString()} products • Page {page + 1} of {totalPages}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button size="icon" variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="categorized_at">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="supplier">Supplier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Proposed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.supplier_product_id}>
                    <TableCell className="font-mono text-xs">
                      {product.supplier_sku}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {product.name_from_supplier}
                    </TableCell>
                    <TableCell className="text-sm">{product.supplier_name}</TableCell>
                    <TableCell className="text-sm">
                      {product.category_name || (
                        <span className="text-muted-foreground">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {product.proposed_category_name ? (
                        <span className="italic text-amber-600 dark:text-amber-400">
                          {product.proposed_category_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(product.ai_categorization_status)}</TableCell>
                    <TableCell>{getConfidenceBadge(product.ai_confidence)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.ai_provider || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.ai_categorized_at
                        ? new Date(product.ai_categorized_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of{" "}
            {total.toLocaleString()} products
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
