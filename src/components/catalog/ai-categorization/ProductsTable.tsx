"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Settings2 } from "lucide-react"
import { ColumnManagementDialog, type ColumnDef } from "@/components/catalog/ColumnManagementDialog"
import { useColumnManagement } from "@/hooks/useColumnManagement"
import { StandardFiltersBar } from "@/components/shared/StandardFiltersBar"
import { StandardPagination } from "@/components/shared/StandardPagination"
import { cn } from "@/lib/utils"
import { buildApiUrl } from "@/lib/utils/api-url"

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

// Default column configuration
const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'sku', label: 'SKU', visible: true, order: 1, align: 'left', sortable: false },
  { key: 'name', label: 'Product Name', visible: true, order: 2, align: 'left', sortable: true },
  { key: 'supplier', label: 'Supplier', visible: true, order: 3, align: 'left', sortable: true },
  { key: 'category', label: 'Category', visible: true, order: 4, align: 'left', sortable: false },
  { key: 'proposed', label: 'Proposed', visible: true, order: 5, align: 'left', sortable: false },
  { key: 'status', label: 'Status', visible: true, order: 6, align: 'left', sortable: false },
  { key: 'confidence', label: 'Confidence', visible: true, order: 7, align: 'left', sortable: true },
  { key: 'provider', label: 'Provider', visible: true, order: 8, align: 'left', sortable: false },
  { key: 'date', label: 'Date', visible: true, order: 9, align: 'left', sortable: true },
]

export const ProductsTable = memo(function ProductsTable({ refreshTrigger }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("categorized_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)

  // Column management
  const { columns, setColumns, visibleColumns } = useColumnManagement(
    'ai_categorization_products_table_columns',
    DEFAULT_COLUMNS
  )

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        sort_by: sortBy,
        sort_order: sortDir,
      })

      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const response = await fetch(buildApiUrl(`/api/category/ai-categorization/products?${params}`))
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
  }, [limit, page, search, sortBy, sortDir, statusFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts, refreshTrigger])

  const getStatusBadge = useCallback((status: string) => {
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
  }, [])

  const getConfidenceBadge = useCallback((confidence: number | null) => {
    if (!confidence) return <span className="text-muted-foreground">-</span>

    const percentage = (confidence * 100).toFixed(0)
    if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-green-500">{percentage}%</Badge>
    }
    if (confidence >= 0.6) {
      return <Badge variant="secondary">{percentage}%</Badge>
    }
    return <Badge variant="destructive">{percentage}%</Badge>
  }, [])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  // Helper to get sort key for a column
  const getSortKey = (columnKey: string): string => {
    const sortMap: Record<string, string> = {
      name: 'name',
      supplier: 'supplier',
      confidence: 'confidence',
      date: 'categorized_at',
    }
    return sortMap[columnKey] || columnKey
  }

  // Helper to render table header cell
  const renderHeaderCell = useCallback((column: ColumnDef) => {
    const className = cn(
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      column.sortable && 'cursor-pointer hover:bg-muted/50'
    )

    const handleSort = () => {
      if (column.sortable) {
        const sortKey = getSortKey(column.key)
        setSortBy(sortKey)
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      }
    }

    return (
      <TableHead key={column.key} className={className} onClick={handleSort}>
        {column.label}
      </TableHead>
    )
  }, [])

  // Helper to render table body cell
  const renderBodyCell = useCallback((column: ColumnDef, product: Product) => {
    const className = cn(
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center'
    )

    switch (column.key) {
      case 'sku':
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono text-xs')}>
            {product.supplier_sku}
          </TableCell>
        )
      case 'name':
        return (
          <TableCell key={column.key} className={cn(className, 'max-w-xs truncate')}>
            {product.name_from_supplier}
          </TableCell>
        )
      case 'supplier':
        return (
          <TableCell key={column.key} className={cn(className, 'text-sm')}>
            {product.supplier_name}
          </TableCell>
        )
      case 'category':
        return (
          <TableCell key={column.key} className={cn(className, 'text-sm')}>
            {product.category_name || (
              <span className="text-muted-foreground">Uncategorized</span>
            )}
          </TableCell>
        )
      case 'proposed':
        return (
          <TableCell key={column.key} className={cn(className, 'text-sm')}>
            {product.proposed_category_name ? (
              <span className="italic text-amber-600 dark:text-amber-400">
                {product.proposed_category_name}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        )
      case 'status':
        return (
          <TableCell key={column.key} className={className}>
            {getStatusBadge(product.ai_categorization_status)}
          </TableCell>
        )
      case 'confidence':
        return (
          <TableCell key={column.key} className={className}>
            {getConfidenceBadge(product.ai_confidence)}
          </TableCell>
        )
      case 'provider':
        return (
          <TableCell key={column.key} className={cn(className, 'text-xs text-muted-foreground')}>
            {product.ai_provider || "-"}
          </TableCell>
        )
      case 'date':
        return (
          <TableCell key={column.key} className={cn(className, 'text-xs text-muted-foreground')}>
            {product.ai_categorized_at
              ? new Date(product.ai_categorized_at).toLocaleDateString()
              : "-"}
          </TableCell>
        )
      default:
        return <TableCell key={column.key} className={className}>-</TableCell>
    }
  }, [getStatusBadge, getConfidenceBadge])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Products</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters Bar */}
        <StandardFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or SKU..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'pending_review', label: 'Pending Review' },
                { value: 'failed', label: 'Failed' },
                { value: 'skipped', label: 'Skipped' },
              ],
              onValueChange: setStatusFilter,
              className: 'w-[150px]',
            },
            {
              key: 'sort',
              label: 'Sort By',
              value: sortBy,
              options: [
                { value: 'categorized_at', label: 'Date' },
                { value: 'name', label: 'Name' },
                { value: 'confidence', label: 'Confidence' },
                { value: 'supplier', label: 'Supplier' },
              ],
              onValueChange: setSortBy,
              className: 'w-[150px]',
            },
          ]}
          onRefresh={fetchProducts}
          loading={loading}
          totalItems={total}
        />

        {/* Column Management */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnDialogOpen(true)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Columns
          </Button>
          <ColumnManagementDialog
            open={columnDialogOpen}
            onOpenChange={setColumnDialogOpen}
            columns={columns}
            onColumnsChange={setColumns}
            defaultColumns={DEFAULT_COLUMNS}
          />
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => renderHeaderCell(column))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.supplier_product_id}>
                    {visibleColumns.map((column) => renderBodyCell(column, product))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <StandardPagination
          page={page}
          pageCount={pageCount}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </CardContent>
    </Card>
  )
})
