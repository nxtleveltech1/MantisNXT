"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Package, Building2, Tag, ShoppingBag, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ColumnManagementDialog, type ColumnDef } from '@/components/catalog/ColumnManagementDialog'
import { useInventoryStore } from '@/lib/stores/inventory-store'
import { useNotificationStore } from '@/lib/stores/notification-store'

function formatCost(value: number | undefined | null): string {
  const n = Number(value ?? 0)
  const fixed = n.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${withSpaces}.${decPart}`
}

// Default column configuration - matching CatalogTable exactly + checkbox and quantity
const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'select', label: 'Select', visible: true, order: 0, align: 'left', sortable: false },
  { key: 'supplier', label: 'Supplier', visible: true, order: 1, align: 'left', sortable: true },
  { key: 'supplier_code', label: 'Supplier Code', visible: false, order: 2, align: 'left', sortable: false },
  { key: 'sku', label: 'SKU', visible: true, order: 3, align: 'left', sortable: true },
  { key: 'name', label: 'Product Name', visible: true, order: 4, align: 'left', sortable: true },
  { key: 'description', label: 'Product Description', visible: true, order: 5, align: 'left', sortable: false },
  { key: 'brand', label: 'Brand', visible: true, order: 6, align: 'left', sortable: false },
  { key: 'series_range', label: 'Series (Range)', visible: true, order: 7, align: 'left', sortable: false },
  { key: 'uom', label: 'UOM', visible: false, order: 8, align: 'left', sortable: false },
  { key: 'pack_size', label: 'Pack Size', visible: false, order: 9, align: 'left', sortable: false },
  { key: 'barcode', label: 'Barcode', visible: false, order: 10, align: 'left', sortable: false },
  { key: 'category', label: 'Category', visible: true, order: 11, align: 'left', sortable: true },
  { key: 'soh', label: 'Stock on Hand', visible: true, order: 12, align: 'right', sortable: false },
  { key: 'on_order', label: 'Stock on Order', visible: true, order: 13, align: 'right', sortable: false },
  { key: 'cost_ex_vat', label: 'Cost ExVAT', visible: true, order: 14, align: 'right', sortable: false },
  { key: 'vat', label: 'VAT (15%)', visible: true, order: 15, align: 'right', sortable: false },
  { key: 'cost_diff', label: 'Cost Diff', visible: true, order: 16, align: 'right', sortable: false },
  { key: 'previous_cost', label: 'Previous Cost', visible: true, order: 17, align: 'right', sortable: false },
  { key: 'rsp', label: 'RSP', visible: true, order: 18, align: 'right', sortable: false },
  { key: 'cost_inc_vat', label: 'Cost IncVAT', visible: true, order: 19, align: 'right', sortable: false },
  { key: 'quantity', label: 'Quantity', visible: true, order: 20, align: 'right', sortable: false },
  { key: 'currency', label: 'Currency', visible: false, order: 21, align: 'right', sortable: false },
  { key: 'first_seen', label: 'First Seen', visible: false, order: 22, align: 'left', sortable: true },
  { key: 'last_seen', label: 'Last Seen', visible: false, order: 23, align: 'left', sortable: true },
  { key: 'active', label: 'Active', visible: false, order: 24, align: 'left', sortable: false },
]

// Load columns from localStorage or return defaults
function loadColumnsFromStorage(): ColumnDef[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS
  
  try {
    const stored = localStorage.getItem('multi_product_selector_columns')
    if (!stored) return DEFAULT_COLUMNS
    
    const parsed = JSON.parse(stored) as ColumnDef[]
    const defaultMap = new Map(DEFAULT_COLUMNS.map((col) => [col.key, col]))
    const storedMap = new Map(parsed.map((col) => [col.key, col]))
    
    const merged = DEFAULT_COLUMNS.map((defaultCol) => {
      const storedCol = storedMap.get(defaultCol.key)
      return storedCol
        ? { ...defaultCol, ...storedCol, order: storedCol.order ?? defaultCol.order }
        : defaultCol
    })
    
    return merged.sort((a, b) => a.order - b.order)
  } catch {
    return DEFAULT_COLUMNS
  }
}

// Save columns to localStorage
function saveColumnsToStorage(columns: ColumnDef[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('multi_product_selector_columns', JSON.stringify(columns))
  } catch (error) {
    console.error('Failed to save columns to localStorage:', error)
  }
}

type CatalogRow = {
  supplier_product_id: string
  supplier_id: string
  supplier_name: string
  supplier_code?: string
  supplier_sku: string
  product_name: string
  description?: string
  uom?: string
  pack_size?: string
  barcode?: string
  category_id?: string
  category_name?: string
  is_active: boolean
  first_seen_at?: string
  last_seen_at?: string
  current_price?: number
  cost_ex_vat?: number
  cost_inc_vat?: number
  rsp?: number
  currency?: string
  series_range?: string
  previous_cost?: number
  cost_diff?: number
  attrs_json?: {
    description?: string
    cost_including?: number
    cost_excluding?: number
    rsp?: number
    brand?: string
    [key: string]: unknown
  }
}

interface MultiProductSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type QuantityMap = Record<string, number>

export default function MultiProductSelectorDialog({ open, onOpenChange }: MultiProductSelectorDialogProps) {
  const { fetchItems } = useInventoryStore()
  const { addNotification } = useNotificationStore()

  const [rows, setRows] = useState<CatalogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [suppliers, setSuppliers] = useState<{ supplier_id: string; name: string }[]>([])
  const [categories, setCategories] = useState<Array<{ category_id?: string; id?: string; name: string }>>([])
  const [supplierId, setSupplierId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [isActive, setIsActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('supplier_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [columns, setColumns] = useState<ColumnDef[]>(() => loadColumnsFromStorage())
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [quantities, setQuantities] = useState<QuantityMap>({})
  const [metrics, setMetrics] = useState({
    totalSupplierProducts: 0,
    totalProductsAllSuppliers: 0,
    suppliers: 0,
    brands: 0,
  })
  const [metricsLoading, setMetricsLoading] = useState(false)

  // Reset filters when dialog closes
  useEffect(() => {
    if (!open) {
      setSupplierId('all')
      setCategoryId('all')
      setIsActive('all')
      setPriceMin('')
      setPriceMax('')
      setSearch('')
      setSelected(new Set())
      setQuantities({})
      setPage(1)
      setTotal(0)
    }
  }, [open])

  // Save columns to localStorage whenever they change
  useEffect(() => {
    saveColumnsToStorage(columns)
  }, [columns])

  // Helper to get visible columns in order
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.visible).sort((a, b) => a.order - b.order)
  }, [columns])

  // Helper to check if column is visible
  const isColumnVisible = (key: string) => {
    return columns.find((col) => col.key === key)?.visible ?? false
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (supplierId && supplierId !== 'all') params.append('supplier_id', supplierId)
      if (categoryId && categoryId !== 'all') {
        if (categoryId.startsWith('raw:')) {
          params.append('category_raw', categoryId.slice(4))
        } else {
          params.append('category_id', categoryId)
        }
      }
      if (isActive !== 'all') params.set('is_active', String(isActive === 'active'))
      if (priceMin) params.set('price_min', priceMin)
      if (priceMax) params.set('price_max', priceMax)
      params.set('sort_by', sortBy)
      params.set('sort_dir', sortDir)
      params.set('page', String(page))
      params.set('limit', String(limit))
      const res = await fetch(`/api/catalog/products?${params}`)
      if (!res.ok) throw new Error('Failed to load catalog')
      const data = await res.json()
      setRows(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      console.error('Catalog load error:', err)
      setRows([])
      setTotal(0)
      addNotification({
        type: 'error',
        title: 'Failed to load products',
        message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }, [search, supplierId, categoryId, isActive, priceMin, priceMax, sortBy, sortDir, page, limit, addNotification])

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, fetchData])

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      const params = new URLSearchParams()
      if (supplierId && supplierId !== 'all') {
        params.set('supplier_id', supplierId)
      }
      const res = await fetch(`/api/catalog/metrics?${params}`)
      if (!res.ok) throw new Error('Failed to load metrics')
      const data = await res.json()
      setMetrics(data.data || {
        totalSupplierProducts: 0,
        totalProductsAllSuppliers: 0,
        suppliers: 0,
        brands: 0,
      })
    } catch (err) {
      console.error('Metrics load error:', err)
    } finally {
      setMetricsLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    if (open) {
      fetchMetrics()
    }
  }, [open, fetchMetrics])

  // Load filter data
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const [sres, cres] = await Promise.all([
          fetch('/api/catalog/suppliers'),
          fetch('/api/catalog/categories'),
        ])
        const sjson = await sres.json()
        const cjson = await cres.json()
        setSuppliers(sjson.data || [])
        setCategories(cjson.data || [])
      } catch (e) {
        // ignore
      }
    })()
  }, [open])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  // Helper to get sort key for a column
  const getSortKey = (columnKey: string): string => {
    const sortMap: Record<string, string> = {
      supplier: 'supplier_name',
      sku: 'supplier_sku',
      name: 'product_name',
      category: 'category_name',
      first_seen: 'first_seen_at',
      last_seen: 'last_seen_at',
    }
    return sortMap[columnKey] || columnKey
  }

  // Helper to render table header cell
  const renderHeaderCell = (column: ColumnDef) => {
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

    if (column.key === 'select') {
      return (
        <TableHead key={column.key} className="w-12">
          <Checkbox
            checked={rows.length > 0 && selected.size === rows.length}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelected(new Set(rows.map(r => r.supplier_product_id)))
              } else {
                setSelected(new Set())
                setQuantities({})
              }
            }}
            aria-label="Select all"
          />
        </TableHead>
      )
    }

    return (
      <TableHead key={column.key} className={className} onClick={handleSort}>
        {column.label}
      </TableHead>
    )
  }

  // Helper to render table body cell
  const renderBodyCell = (column: ColumnDef, row: CatalogRow) => {
    const className = cn(
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      column.key === 'description' && 'max-w-md'
    )

    switch (column.key) {
      case 'select':
        return (
          <TableCell key={column.key} className="w-12">
            <Checkbox
              checked={selected.has(row.supplier_product_id)}
              onCheckedChange={(checked) => {
                const newSelected = new Set(selected)
                if (checked) {
                  newSelected.add(row.supplier_product_id)
                } else {
                  newSelected.delete(row.supplier_product_id)
                  setQuantities(prev => {
                    const next = { ...prev }
                    delete next[row.supplier_product_id]
                    return next
                  })
                }
                setSelected(newSelected)
              }}
              aria-label={`Select ${row.product_name}`}
            />
          </TableCell>
        )
      case 'supplier':
        return (
          <TableCell key={column.key} className={className}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.supplier_name || 'Unknown Supplier'}</span>
              {!row.is_active && <Badge variant="secondary">inactive</Badge>}
            </div>
          </TableCell>
        )
      case 'supplier_code':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.supplier_code || '-'}
          </TableCell>
        )
      case 'sku':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.supplier_sku}
          </TableCell>
        )
      case 'name':
        return (
          <TableCell key={column.key} className={className}>
            {row.product_name || 'Product Details Unavailable'}
          </TableCell>
        )
      case 'description':
        return (
          <TableCell key={column.key} className={className}>
            <div className="text-sm text-muted-foreground truncate">
              {row.description || row.attrs_json?.description || '-'}
            </div>
          </TableCell>
        )
      case 'brand':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {(row as unknown).brand || row.attrs_json?.brand || '-'}
          </TableCell>
        )
      case 'series_range':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.series_range || '-'}
          </TableCell>
        )
      case 'uom':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.uom || '-'}
          </TableCell>
        )
      case 'pack_size':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.pack_size || '-'}
          </TableCell>
        )
      case 'barcode':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.barcode || '-'}
          </TableCell>
        )
      case 'category':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.category_name || '-'}
          </TableCell>
        )
      case 'soh':
        return (
          <TableCell key={column.key} className={className}>
            {(row as unknown).qty_on_hand ?? 0}
          </TableCell>
        )
      case 'on_order':
        return (
          <TableCell key={column.key} className={className}>
            {(row as unknown).qty_on_order ?? 0}
          </TableCell>
        )
      case 'cost_ex_vat':
        return (
          <TableCell key={column.key} className={className}>
            {(row as unknown).cost_ex_vat !== undefined
              ? formatCost((row as unknown).cost_ex_vat as number)
              : row.attrs_json?.cost_excluding !== undefined
                ? formatCost(Number(row.attrs_json.cost_excluding))
                : row.current_price !== undefined
                  ? formatCost(row.current_price)
                  : '-'}
          </TableCell>
        )
      case 'vat':
        return (
          <TableCell key={column.key} className={className}>
            {formatCost(
              ((row as unknown).cost_ex_vat ?? row.current_price ?? 0) as number * 0.15
            )}
          </TableCell>
        )
      case 'cost_diff':
        return (
          <TableCell key={column.key} className={className}>
            {row.cost_diff !== undefined && row.cost_diff !== null
              ? `${row.cost_diff >= 0 ? '+' : ''}${formatCost(row.cost_diff)}`
              : '-'}
          </TableCell>
        )
      case 'previous_cost':
        return (
          <TableCell key={column.key} className={className}>
            {row.previous_cost !== undefined && row.previous_cost !== null
              ? formatCost(row.previous_cost)
              : '-'}
          </TableCell>
        )
      case 'rsp':
        return (
          <TableCell key={column.key} className={className}>
            {row.rsp !== undefined
              ? formatCost(row.rsp)
              : row.attrs_json?.rsp !== undefined
                ? formatCost(Number(row.attrs_json.rsp))
                : '-'}
          </TableCell>
        )
      case 'cost_inc_vat':
        return (
          <TableCell key={column.key} className={className}>
            {row.cost_inc_vat !== undefined
              ? formatCost(row.cost_inc_vat)
              : row.attrs_json?.cost_including !== undefined
                ? formatCost(Number(row.attrs_json.cost_including))
                : '-'}
          </TableCell>
        )
      case 'quantity':
        return (
          <TableCell key={column.key} className={className}>
            <Input
              type="number"
              min={0}
              value={quantities[row.supplier_product_id] ?? 0}
              onChange={(e) => {
                const qty = Math.max(0, Number(e.target.value || 0))
                setQuantities(prev => ({ ...prev, [row.supplier_product_id]: qty }))
                if (qty > 0 && !selected.has(row.supplier_product_id)) {
                  setSelected(prev => new Set(prev).add(row.supplier_product_id))
                } else if (qty === 0 && selected.has(row.supplier_product_id)) {
                  setSelected(prev => {
                    const next = new Set(prev)
                    next.delete(row.supplier_product_id)
                    return next
                  })
                }
              }}
              className="w-24 ml-auto"
              aria-label={`Quantity for ${row.product_name}`}
            />
          </TableCell>
        )
      case 'currency':
        return (
          <TableCell key={column.key} className={className}>
            {row.currency || 'ZAR'}
          </TableCell>
        )
      case 'first_seen':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.first_seen_at ? new Date(row.first_seen_at).toLocaleDateString() : '-'}
          </TableCell>
        )
      case 'last_seen':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.last_seen_at ? new Date(row.last_seen_at).toLocaleDateString() : '-'}
          </TableCell>
        )
      case 'active':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.is_active ? 'Yes' : 'No'}
          </TableCell>
        )
      default:
        return <TableCell key={column.key} className={className}>-</TableCell>
    }
  }

  const selectedCount = selected.size
  const canSubmit = Array.from(selected).some(id => (quantities[id] || 0) > 0)

  const handleBulkAdd = async () => {
    try {
      console.log('[MultiProductSelector] handleBulkAdd called', { selected: Array.from(selected), quantities })
      
      const items = Array.from(selected)
        .filter(id => (quantities[id] || 0) > 0)
        .map(id => {
          const p = rows.find(x => x.supplier_product_id === id)!
          const qty = Number(quantities[id] || 0)
          const costPrice = Number((p as unknown).cost_ex_vat ?? p.attrs_json?.cost_excluding ?? p.current_price ?? 0)
          if (isNaN(costPrice) || costPrice < 0) {
            throw new Error(`Invalid cost price for product ${p.supplier_sku || p.supplier_product_id}`)
          }
          
          const item = {
            sku: p.supplier_sku || String(p.supplier_product_id), // fallback to ID if SKU missing
            name: p.product_name || p.name_from_supplier || 'Unknown Product',
            description: p.description || p.attrs_json?.description || undefined,
            category: (p.category_name || 'uncategorized'),
            supplier_id: p.supplier_id,
            supplier_sku: p.supplier_sku || String(p.supplier_product_id),
            cost_price: costPrice,
            stock_qty: qty,
            unit: p.uom || 'each',
          }
          
          // Validate required fields
          if (!item.supplier_id) {
            throw new Error(`Missing supplier_id for product ${p.supplier_product_id}`)
          }
          if (!item.supplier_sku) {
            throw new Error(`Missing supplier_sku for product ${p.supplier_product_id}`)
          }
          if (!item.sku) {
            throw new Error(`Missing sku for product ${p.supplier_product_id}`)
          }
          if (!item.name || item.name.trim().length === 0) {
            throw new Error(`Missing name for product ${p.supplier_product_id}`)
          }
          console.log('[MultiProductSelector] Prepared item:', item)
          return item
        })

      if (items.length === 0) {
        console.warn('[MultiProductSelector] No items to add')
        addNotification({ type: 'warning', title: 'No products selected', message: 'Select at least one product with quantity > 0' })
        return
      }

      console.log('[MultiProductSelector] Sending bulk create request:', { action: 'bulk_create', itemsCount: items.length })
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_create', items })
      })

      const responseText = await res.text()
      console.log('[MultiProductSelector] Response:', { status: res.status, ok: res.ok, text: responseText })

      if (!res.ok) {
        throw new Error(`Bulk add failed: ${res.status} ${responseText}`)
      }

      const result = JSON.parse(responseText)
      console.log('[MultiProductSelector] Success:', result)

      addNotification({ type: 'success', title: 'Products added', message: `${items.length} products added to stock holding` })
      await fetchItems()
      onOpenChange(false)
      setSelected(new Set())
      setQuantities({})
    } catch (e: unknown) {
      console.error('[MultiProductSelector] Error in handleBulkAdd:', e)
      addNotification({ type: 'error', title: 'Failed to add products', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Add Multiple Products</DialogTitle>
          <DialogDescription>
            Browse supplier portfolio, filter, select, and set quantities to add to NXT stock holding.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Supplier Inventory Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Summary Cards - Matching CatalogTable exactly */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">TOTAL SUPPLIER PRODUCTS</p>
                        <p className="text-2xl font-bold mt-1">
                          {metricsLoading ? (
                            <span className="inline-block h-8 w-20 bg-muted animate-pulse rounded" />
                          ) : (
                            metrics.totalSupplierProducts.toLocaleString()
                          )}
                        </p>
                      </div>
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">TOTAL PRODUCTS (ALL SUPPLIERS)</p>
                        <p className="text-2xl font-bold mt-1">
                          {metricsLoading ? (
                            <span className="inline-block h-8 w-20 bg-muted animate-pulse rounded" />
                          ) : (
                            metrics.totalProductsAllSuppliers.toLocaleString()
                          )}
                        </p>
                      </div>
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">SUPPLIERS</p>
                        <p className="text-2xl font-bold mt-1">
                          {metricsLoading ? (
                            <span className="inline-block h-8 w-20 bg-muted animate-pulse rounded" />
                          ) : (
                            metrics.suppliers.toLocaleString()
                          )}
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">BRANDS</p>
                        <p className="text-2xl font-bold mt-1">
                          {metricsLoading ? (
                            <span className="inline-block h-8 w-20 bg-muted animate-pulse rounded" />
                          ) : (
                            metrics.brands.toLocaleString()
                          )}
                        </p>
                      </div>
                      <Tag className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Bar - Matching CatalogTable exactly */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Input
                  placeholder="Search by name or SKU"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suppliers</SelectItem>
                    {suppliers.filter(s => s && s.supplier_id).map(s => (
                      <SelectItem key={s.supplier_id} value={s.supplier_id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.filter(c => !!c).map((c: unknown) => (
                      <SelectItem key={String(c.category_id ?? c.id)} value={String(c.category_id ?? c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={isActive} onValueChange={v => setIsActive(v as unknown)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Min price" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="w-24" />
                <Input placeholder="Max price" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="w-24" />
                <Button variant="outline" onClick={() => fetchData()} disabled={loading}>
                  <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                  Refresh
                </Button>
                <div className="ml-auto text-sm text-muted-foreground">
                  {total.toLocaleString()} items
                </div>
              </div>

              {/* Manage Columns Button - Matching CatalogTable exactly */}
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

              {/* Table - Matching CatalogTable exactly */}
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((column) => renderHeaderCell(column))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow
                        key={r.supplier_product_id}
                      >
                        {visibleColumns.map((column) => renderBodyCell(column, r))}
                      </TableRow>
                    ))}
                    {rows.length === 0 && !loading && (
                      <TableRow>
                        <TableCell
                          colSpan={visibleColumns.length}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No results
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination - Matching CatalogTable exactly */}
              <div className="flex items-center justify-between mt-3 text-sm">
                <div>
                  Page {page} of {pageCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Select value={String(limit)} onValueChange={(v) => { setLimit(parseInt(v, 10)); setPage(1) }}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[25, 50, 100, 200].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t gap-4">
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedCount}</span>
            {selectedCount > 0 && (
              <span className="ml-2">
                ({Array.from(selected).filter(id => (quantities[id] || 0) > 0).length} with quantity)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || loading}
              onClick={() => {
                console.log('[MultiProductSelector] Button clicked', { canSubmit, loading, selectedCount, quantities: Object.fromEntries(Array.from(selected).map(id => [id, quantities[id]])) })
                handleBulkAdd()
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
              title={!canSubmit ? 'Select products and enter quantities > 0' : loading ? 'Processing...' : 'Import selected products to inventory'}
            >
              <Package className="h-4 w-4 mr-2" />
              {loading ? 'Importing...' : `Add Selected ${selectedCount > 0 ? `(${selectedCount})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
