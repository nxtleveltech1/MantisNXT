"use client"

import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  RefreshCw,
  Columns,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  AlertTriangle,
  Package,
  Activity,
  BarChart3,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useInventoryStore } from '@/lib/stores/inventory-store'
import { useNotificationStore } from '@/lib/stores/notification-store'

interface MultiProductSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type QuantityMap = Record<string, number>

export default function MultiProductSelectorDialog({ open, onOpenChange }: MultiProductSelectorDialogProps) {
  const { fetchItems } = useInventoryStore()
  const { addNotification } = useNotificationStore()

  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState<string>('all_suppliers')
  const [category, setCategory] = useState<string>('all_categories')
  
  // Reset filters when dialog closes
  useEffect(() => {
    if (!open) {
      setSupplierId('all_suppliers')
      setCategory('all_categories')
      setBrand('all_brands')
      setSearch('')
      setSelected(new Set())
      setQuantities({})
      setPage(1)
      setTotal(0)
    }
  }, [open])
  type SelectorRow = {
    supplier_product_id: string
    supplier_id: string
    supplier_sku: string
    name_from_supplier: string
    uom?: string | null
    brand?: string | null
    category_id?: string | null
    category_name?: string | null
    supplier_name?: string | null
    current_price?: number | null
  }
  const [rows, setRows] = useState<SelectorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [categoryList, setCategoryList] = useState<Array<{ id: string; name: string }>>([])
  const [brandList, setBrandList] = useState<string[]>([])
  const [brand, setBrand] = useState<string>('all_brands')
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; name: string }>>([])

  const PAGE_SIZE = 50

  // Format currency to match supplier inventory format: "9 999.00" (space-separated thousands, 2 decimals, no currency symbol)
  const formatPrice = (price: number | null | undefined): string => {
    const num = Number(price || 0)
    return num.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).replace(/,/g, ' ')
  }

  // Column visibility similar to SPP
  const [visibleCols, setVisibleCols] = useState({
    sku: true,
    supplier: true,
    brand: true,
    category: true,
    uom: true,
    price: true,
  })
  const [quantities, setQuantities] = useState<QuantityMap>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, category, brand, supplierId])

  // Load suppliers first, then auto-select one to trigger product loading
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/suppliers?limit=1000')
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
          const opts = rows.map((s: unknown) => ({ id: s.id || s.supplier_id, name: s.name || s.supplier_name || 'Unknown Supplier' }))
          if (!cancelled) {
            setSupplierOptions(opts)
            // Auto-select first supplier if none selected yet (use functional update to read current state)
            setSupplierId(current => {
              if (current === 'all_suppliers' && opts.length > 0) {
                return opts[0].id
              }
              return current
            })
          }
        }
      } catch (e) {
        console.error('Failed to load suppliers:', e)
      }
    })()
    return () => { cancelled = true }
  }, [open])

  // Load supplier portfolio products when supplier is selected
  useEffect(() => {
    if (!open) return
    // Don't load if no supplier selected
    if (supplierId === 'all_suppliers') {
      setRows([])
      setLoading(false)
      return
    }
    
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        
        // Use enriched table endpoint with current price and category join
        const url = new URL('/api/core/suppliers/products/table', window.location.origin)
        url.searchParams.set('supplier_id', supplierId)
        url.searchParams.set('limit', String(PAGE_SIZE))
        url.searchParams.set('offset', String((page - 1) * PAGE_SIZE))
        if (search) url.searchParams.set('search', search)

        const resp = await fetch(url.toString())
        if (cancelled) return

        if (!resp.ok) {
          throw new Error(`Failed to fetch products: ${resp.status} ${resp.statusText}`)
        }

        const json = await resp.json().catch(() => ({}))
        if (cancelled) return

        const data = Array.isArray(json?.products) ? json.products : []
        const totalCount = json?.total || 0

        if (!cancelled) {
          setTotal(totalCount)
        }

        // Fetch categories map once (on first data load)
        if (categoryList.length === 0) {
          try {
            const catRes = await fetch('/api/catalog/categories')
            if (catRes.ok && !cancelled) {
              const catJson = await catRes.json()
              const items = Array.isArray(catJson?.data) ? catJson.data : []
              setCategoryList(items.map((c: unknown) => ({ id: c.category_id || c.id, name: c.name })))
            }
          } catch (e) {
            console.error('Failed to load categories:', e)
          }
        }

        if (cancelled) return
        
        const normalized: SelectorRow[] = data.map((r: unknown) => ({
          supplier_product_id: r.supplier_product_id,
          supplier_id: r.supplier_id,
          supplier_sku: r.supplier_sku,
          name_from_supplier: r.name_from_supplier,
          uom: r.uom,
          brand: r.brand || null,
          category_id: r.category_id || null,
          category_name: r.category_name || null,
          supplier_name: r.supplier_name || null,
          current_price: r.current_price ?? null,
        }))
        
        // Build brand list
        const brands = Array.from(new Set(normalized.map(r => (r.brand || '').trim()).filter(Boolean))).sort()
        setBrandList(brands)

        // Attach category names if missing
        const catMap = new Map(categoryList.map(c => [c.id, c.name]))
        const withCatNames = normalized.map(r => ({
          ...r,
          category_name: r.category_name || (r.category_id ? (catMap.get(r.category_id) || null) : r.category_name)
        }))
        
        if (!cancelled) {
          setRows(withCatNames)
        }
      } catch (e) {
        console.error('Failed to load products:', e)
        if (!cancelled) {
          setRows([])
          addNotification({ 
            type: 'error', 
            title: 'Failed to load products', 
            message: e instanceof Error ? e.message : 'Unknown error' 
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const t = setTimeout(load, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [addNotification, categoryList, open, page, search, supplierId])

  const categories = useMemo(() => {
    // Prefer canonical category list when available
    if (categoryList.length > 0) return categoryList.map(c => c.name)
    return Array.from(new Set(rows.map(p => p.category_name || 'uncategorized'))).sort()
  }, [rows, categoryList])

  // Since we now use server-side pagination and search, just display the current page of rows
  // Client-side filtering would give incorrect results with paginated data
  const filtered = useMemo(() => {
    // Apply only client-side category and brand filters for the current page
    return rows.filter(p => {
      if (category !== 'all_categories') {
        const name = p.category_name || 'uncategorized'
        if (name !== category) return false
      }
      if (brand !== 'all_brands') {
        if ((p.brand || '').toLowerCase() !== brand.toLowerCase()) return false
      }
      return true
    })
  }, [rows, category, brand])

  const supplierNameFromRow = (r: SelectorRow) => r.supplier_name || 'Unknown'

  const setQty = (productId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [productId]: qty }))
    setSelected(prev => {
      const next = new Set(prev)
      if (qty > 0) next.add(productId); else next.delete(productId)
      return next
    })
  }

  const toggleSelect = (productId: string, checked: boolean | string) => {
    const isChecked = checked === true || checked === 'indeterminate'
    setSelected(prev => {
      const next = new Set(prev)
      if (isChecked) next.add(productId); else next.delete(productId)
      return next
    })
    if (!isChecked) setQuantities(prev => ({ ...prev, [productId]: 0 }))
  }

  const selectedCount = selected.size
  const canSubmit = Array.from(selected).some(id => (quantities[id] || 0) > 0)

  const handleBulkAdd = async () => {
    try {
      const items = Array.from(selected)
        .filter(id => (quantities[id] || 0) > 0)
        .map(id => {
          const p = rows.find(x => x.supplier_product_id === id)!
          const qty = Number(quantities[id] || 0)
          return {
            sku: p.supplier_sku, // use supplier sku as initial internal sku
            name: p.name_from_supplier,
            description: undefined,
            category: (p.category_name || 'uncategorized'),
            supplier_id: p.supplier_id,
            supplier_sku: p.supplier_sku,
            cost_price: Number(p.current_price || 0),
            stock_qty: qty,
            unit: p.uom || 'each',
          }
        })

      if (items.length === 0) {
        addNotification({ type: 'warning', title: 'No products selected', message: 'Select at least one product with quantity > 0' })
        return
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_create', items })
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(`Bulk add failed: ${res.status} ${msg}`)
      }

      addNotification({ type: 'success', title: 'Products added', message: `${items.length} products added to stock holding` })
      await fetchItems()
      onOpenChange(false)
      setSelected(new Set())
      setQuantities({})
    } catch (e: unknown) {
      addNotification({ type: 'error', title: 'Failed to add products', message: e?.message || 'Unknown error' })
    }
  }

  const hasActiveFilters = search || category !== 'all_categories' || brand !== 'all_brands' || supplierId !== 'all_suppliers'
  const filteredCount = filtered.length
  const totalCount = total || rows.length

  const clearFilters = () => {
    setSearch('')
    setCategory('all_categories')
    setBrand('all_brands')
    setSupplierId('all_suppliers')
    setPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Multiple Products</DialogTitle>
          <DialogDescription>
            Browse supplier portfolio, filter, select, and set quantities to add to NXT stock holding.
          </DialogDescription>
        </DialogHeader>

        {/* Enhanced Filters Section - Card-based layout matching SupplierInventoryView */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search and Quick Actions */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products, SKUs, or descriptions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-10 h-10 border-2 focus:border-primary transition-all"
                    aria-label="Search products by name, SKU, or description"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Quick Filter Badges */}
                <div className="flex gap-2">
                  {selectedCount > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            aria-label={`${selectedCount} products selected`}
                          >
                            <Package className="h-3 w-3 mr-1" />
                            {selectedCount} Selected
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{selectedCount} products selected for addition</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {/* Detailed Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="w-56" aria-label="Filter by supplier">
                    <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_suppliers">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        All suppliers
                      </div>
                    </SelectItem>
                    {(supplierOptions.length > 0 ? supplierOptions.map(s => `${s.id}|${s.name}`) : Array.from(new Set(rows.map(r => `${r.supplier_id}|${r.supplier_name || 'Unknown'}`)))).map(pair => {
                      const [id, name] = pair.split('|')
                      return (
                        <SelectItem key={id} value={id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            {name}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-56" aria-label="Filter by category">
                    <Activity className="h-4 w-4 mr-2" aria-hidden="true" />
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_categories">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        All categories
                      </div>
                    </SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          {String(c).replace('_', ' ').toUpperCase()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="w-56" aria-label="Filter by brand">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_brands">All brands</SelectItem>
                    {brandList.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setPage(1); /* re-fetch via effect */ }}
                        disabled={loading}
                        aria-label="Refresh product list"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reload products from server</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="Toggle column visibility">
                      <Columns className="h-4 w-4 mr-2" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(visibleCols).map((key) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={(visibleCols as unknown)[key]}
                        onCheckedChange={() => setVisibleCols(v => ({ ...v, [key]: !(v as unknown)[key] }))}
                      >
                        {key}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Results Summary */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>
                      Showing {filteredCount} of {totalCount} products
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    aria-label="Clear all filters"
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            {loading && rows.length === 0 ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading products...</span>
                </div>
                <div className="space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 flex-1" />
                      {visibleCols.sku && <Skeleton className="h-4 w-24" />}
                      {visibleCols.supplier && <Skeleton className="h-4 w-32" />}
                      {visibleCols.brand && <Skeleton className="h-4 w-24" />}
                      {visibleCols.category && <Skeleton className="h-4 w-28" />}
                      {visibleCols.uom && <Skeleton className="h-4 w-16" />}
                      {visibleCols.price && <Skeleton className="h-4 w-20" />}
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-auto flex-1 border rounded-md relative">
                {loading && rows.length > 0 && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <div className="mt-2 text-sm text-muted-foreground">Refreshing products...</div>
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <span className="sr-only">Select</span>
                      </TableHead>
                      <TableHead>Product</TableHead>
                      {visibleCols.sku && <TableHead>SKU</TableHead>}
                      {visibleCols.supplier && <TableHead>Supplier</TableHead>}
                      {visibleCols.brand && <TableHead>Brand</TableHead>}
                      {visibleCols.category && <TableHead>Category</TableHead>}
                      {visibleCols.uom && <TableHead>UOM</TableHead>}
                      {visibleCols.price && <TableHead className="text-right">Unit Cost</TableHead>}
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && !loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-20 animate-pulse" />
                              <Package className="h-16 w-16 mx-auto text-muted-foreground relative z-10" />
                            </div>
                            <div className="space-y-2">
                              <div className="text-lg font-semibold text-gray-900">No products found</div>
                              <div className="text-sm text-muted-foreground max-w-md">
                                {hasActiveFilters
                                  ? 'Try adjusting your filters or select a different supplier'
                                  : 'Select a supplier from the dropdown to view their product portfolio'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map(p => (
                        <TableRow
                          key={p.supplier_product_id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selected.has(p.supplier_product_id)}
                              onCheckedChange={(c) => toggleSelect(p.supplier_product_id, c as unknown)}
                              className="rounded focus:ring-2 focus:ring-primary focus:ring-offset-1"
                              aria-label={`Select product ${p.name_from_supplier}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.name_from_supplier}</p>
                              {p.brand && (
                                <p className="text-xs text-muted-foreground mt-0.5">Brand: {p.brand}</p>
                              )}
                            </div>
                          </TableCell>
                          {visibleCols.sku && (
                            <TableCell>
                              <code className="text-xs font-mono text-muted-foreground">{p.supplier_sku || '-'}</code>
                            </TableCell>
                          )}
                          {visibleCols.supplier && (
                            <TableCell>
                              <div className="text-sm">{supplierNameFromRow(p)}</div>
                            </TableCell>
                          )}
                          {visibleCols.brand && (
                            <TableCell>
                              <span className="text-sm">{p.brand || '-'}</span>
                            </TableCell>
                          )}
                          {visibleCols.category && (
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {String(p.category_name || 'uncategorized').replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                          )}
                          {visibleCols.uom && (
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{p.uom || 'each'}</span>
                            </TableCell>
                          )}
                          {visibleCols.price && (
                            <TableCell className="text-right">
                              <div className="font-medium">{formatPrice(p.current_price)}</div>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              value={quantities[p.supplier_product_id] ?? 0}
                              onChange={(e) => setQty(p.supplier_product_id, Math.max(0, Number(e.target.value || 0)))}
                              className="w-24 ml-auto h-9"
                              aria-label={`Quantity for ${p.name_from_supplier}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer with Pagination and Actions */}
        <div className="flex items-center justify-between pt-4 border-t gap-4">
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span>
              Selected: <span className="font-medium text-foreground">{selectedCount}</span>
            </span>
            {total > 0 && (
              <span>
                Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, total)} of {total} products
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground px-2 min-w-[100px] text-center">
              Page {page} of {Math.ceil(total / PAGE_SIZE) || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || loading}
              onClick={handleBulkAdd}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg transition-all"
            >
              <Package className="h-4 w-4 mr-2" />
              Add Selected {selectedCount > 0 && `(${selectedCount})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
