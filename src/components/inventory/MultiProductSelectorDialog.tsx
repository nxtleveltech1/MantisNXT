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
  import { Search, RefreshCw, Columns } from 'lucide-react'
  import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu'
import { useInventoryStore } from '@/lib/stores/inventory-store'
// Use the enhanced supplier portfolio where possible; fall back to direct fetch for table view
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
  const [categoryList, setCategoryList] = useState<Array<{ id: string; name: string }>>([])
  const [brandList, setBrandList] = useState<string[]>([])
  const [brand, setBrand] = useState<string>('all_brands')
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; name: string }>>([])

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
          const opts = rows.map((s: any) => ({ id: s.id || s.supplier_id, name: s.name || s.supplier_name || 'Unknown Supplier' }))
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
        if (search) url.searchParams.set('search', search)
        
        const resp = await fetch(url.toString())
        if (cancelled) return
        
        if (!resp.ok) {
          throw new Error(`Failed to fetch products: ${resp.status} ${resp.statusText}`)
        }
        
        const json = await resp.json().catch(() => ({}))
        if (cancelled) return
        
        const data = Array.isArray(json?.products) ? json.products : []

        // Fetch categories map once (on first data load)
        if (categoryList.length === 0) {
          try {
            const catRes = await fetch('/api/catalog/categories')
            if (catRes.ok && !cancelled) {
              const catJson = await catRes.json()
              const items = Array.isArray(catJson?.data) ? catJson.data : []
              setCategoryList(items.map((c: any) => ({ id: c.category_id || c.id, name: c.name })))
            }
          } catch (e) {
            console.error('Failed to load categories:', e)
          }
        }

        if (cancelled) return
        
        const normalized: SelectorRow[] = data.map((r: any) => ({
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
  }, [open, supplierId, search, page, categoryList.length])

  const categories = useMemo(() => {
    // Prefer canonical category list when available
    if (categoryList.length > 0) return categoryList.map(c => c.name)
    return Array.from(new Set(rows.map(p => p.category_name || 'uncategorized'))).sort()
  }, [rows, categoryList])

  const filtered = useMemo(() => {
    const selectedCategoryName = category
    return rows.filter(p => {
      if (selectedCategoryName !== 'all_categories') {
        const name = p.category_name || 'uncategorized'
        if (name !== selectedCategoryName) return false
      }
      if (brand !== 'all_brands') {
        if ((p.brand || '').toLowerCase() !== brand.toLowerCase()) return false
      }
      if (supplierId !== 'all_suppliers' && p.supplier_id !== supplierId) return false
      if (search) {
        const s = search.toLowerCase()
        const match = [p.name_from_supplier, p.supplier_sku, p.supplier_name || '', p.brand || '']
          .some(v => (v || '').toLowerCase().includes(s))
        if (!match) return false
      }
      return true
    })
  }, [rows, category, brand, supplierId, search])

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
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to add products', message: e?.message || 'Unknown error' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Multiple Products</DialogTitle>
          <DialogDescription>
            Browse supplier portfolio, filter, select, and set quantities to add to NXT stock holding.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, SKUs, suppliers..." className="pl-9" />
          </div>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_suppliers">All suppliers</SelectItem>
              {(supplierOptions.length > 0 ? supplierOptions.map(s => `${s.id}|${s.name}`) : Array.from(new Set(rows.map(r => `${r.supplier_id}|${r.supplier_name || 'Unknown'}`)))).map(pair => {
                const [id, name] = pair.split('|')
                return <SelectItem key={id} value={id}>{name}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_categories">All categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{String(c).replace('_',' ').toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_brands">All brands</SelectItem>
              {brandList.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { setPage(1); /* re-fetch via effect */ }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns className="h-4 w-4 mr-2" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.keys(visibleCols).map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={(visibleCols as any)[key]}
                  onCheckedChange={() => setVisibleCols(v => ({ ...v, [key]: !(v as any)[key] }))}
                >
                  {key}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-auto max-h-[60vh] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
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
              {filtered.map(p => (
                <TableRow key={p.supplier_product_id}>
                  <TableCell>
                    <Checkbox checked={selected.has(p.supplier_product_id)} onCheckedChange={(c) => toggleSelect(p.supplier_product_id, c as any)} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.name_from_supplier}</p>
                      {p.brand && (
                        <p className="text-xs text-muted-foreground">Brand: {p.brand}</p>
                      )}
                    </div>
                  </TableCell>
                  {visibleCols.sku && (<TableCell><code className="text-xs">{p.supplier_sku || '-'}</code></TableCell>)}
                  {visibleCols.supplier && (<TableCell>{supplierNameFromRow(p)}</TableCell>)}
                  {visibleCols.brand && (<TableCell>{p.brand || '-'}</TableCell>)}
                  {visibleCols.category && (
                    <TableCell>
                      <Badge variant="outline">{String(p.category_name || 'uncategorized').toUpperCase()}</Badge>
                    </TableCell>
                  )}
                  {visibleCols.uom && (<TableCell>{p.uom || '-'}</TableCell>)}
                  {visibleCols.price && (<TableCell className="text-right">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(Number(p.current_price || 0))}</TableCell>)}
                  <TableCell className="text-right">
                    <Input type="number" min={0} value={quantities[p.supplier_product_id] ?? 0} onChange={(e) => setQty(p.supplier_product_id, Math.max(0, Number(e.target.value || 0)))} className="w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-3">
          <div className="text-sm text-muted-foreground">Selected: <span className="font-medium">{selectedCount}</span></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!canSubmit || loading} onClick={handleBulkAdd}>Add Selected</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
