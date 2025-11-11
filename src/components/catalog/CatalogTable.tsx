"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function formatCost(value: number | undefined | null): string {
  const n = Number(value ?? 0)
  const fixed = n.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${withSpaces}.${decPart}`
}

type CatalogRow = {
  supplier_product_id: string
  supplier_id: string
  supplier_name: string
  supplier_code?: string
  supplier_sku: string
  product_name: string
  uom?: string
  pack_size?: string
  barcode?: string
  category_id?: string
  category_name?: string
  is_active: boolean
  first_seen_at?: string
  last_seen_at?: string
  current_price?: number
  currency?: string
}

export function CatalogTable() {
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
  const [sortBy, setSortBy] = useState<'supplier_name' | 'supplier_sku' | 'product_name' | 'category_name' | 'current_price' | 'last_seen_at'>('supplier_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    supplier: true,
    supplier_code: false,
    sku: true,
    name: true,
    brand: false,
    uom: false,
    pack_size: false,
    barcode: false,
    category: true,
    soh: true,
    on_order: true,
    price: true,
    vat: true,
    currency: false,
    first_seen: false,
    last_seen: false,
    active: false,
  })
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<unknown>(null)
  const [history, setHistory] = useState<unknown[]>([])

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
    } finally {
      setLoading(false)
    }
  }, [search, supplierId, categoryId, isActive, priceMin, priceMax, sortBy, sortDir, page, limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Load filter data
  useEffect(() => {
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
  }, [])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Supplier Inventory Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent>
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

        <div className="flex items-center justify-between mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Columns</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: 'supplier', label: 'Supplier' },
                { key: 'supplier_code', label: 'Supplier Code' },
                { key: 'sku', label: 'SKU' },
                { key: 'name', label: 'Product Name' },
                { key: 'brand', label: 'Brand' },
                { key: 'uom', label: 'UOM' },
                { key: 'pack_size', label: 'Pack Size' },
                { key: 'barcode', label: 'Barcode' },
                { key: 'category', label: 'Category' },
                { key: 'soh', label: 'Stock on Hand' },
                { key: 'on_order', label: 'Stock on Order' },
                { key: 'price', label: 'Cost Price' },
                { key: 'vat', label: 'VAT (15%)' },
                { key: 'currency', label: 'Currency' },
                { key: 'first_seen', label: 'First Seen' },
                { key: 'last_seen', label: 'Last Seen' },
                { key: 'active', label: 'Active' },
              ].map(c => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={visibleCols[c.key]}
                  onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: !!v }))}
                >{c.label}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleCols.supplier && (
                  <TableHead className="cursor-pointer" onClick={() => { setSortBy('supplier_name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>Supplier</TableHead>
                )}
                {visibleCols.supplier_code && (
                  <TableHead className="cursor-pointer" onClick={() => { setSortBy('supplier_name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>Code</TableHead>
                )}
                {visibleCols.sku && (
                  <TableHead className="cursor-pointer" onClick={() => { setSortBy('supplier_sku'); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>SKU</TableHead>
                )}
                {visibleCols.name && (
                  <TableHead className="cursor-pointer" onClick={() => { setSortBy('product_name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>Product Name</TableHead>
                )}
                {visibleCols.brand && (
                  <TableHead>Brand</TableHead>
                )}
                {visibleCols.uom && (
                  <TableHead>UOM</TableHead>
                )}
                {visibleCols.pack_size && (
                  <TableHead>Pack Size</TableHead>
                )}
                {visibleCols.barcode && (
                  <TableHead>Barcode</TableHead>
                )}
                {visibleCols.category && (
                  <TableHead className="cursor-pointer" onClick={() => { setSortBy('category_name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>Category</TableHead>
                )}
                {visibleCols.soh && (
                  <TableHead className="text-right">Stock on Hand</TableHead>
                )}
                {visibleCols.on_order && (
                  <TableHead className="text-right">Stock on Order</TableHead>
                )}
                {visibleCols.price && (
                  <TableHead className="text-right cursor-pointer" onClick={() => { setSortBy('current_price'); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>Cost Price</TableHead>
                )}
                {visibleCols.vat && (
                  <TableHead className="text-right">VAT (15%)</TableHead>
                )}
                {visibleCols.currency && (
                  <TableHead className="text-right">Currency</TableHead>
                )}
                {visibleCols.first_seen && (
                  <TableHead className="cursor-pointer" onClick={() => { setSortBy('first_seen_at' as unknown); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>First Seen</TableHead>
                )}
                {visibleCols.last_seen && (
                  <TableHead className="cursor-pointer" onClick={() => { setSortBy('last_seen_at'); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>Last Seen</TableHead>
                )}
                {visibleCols.active && (
                  <TableHead>Active</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.supplier_product_id} className="cursor-pointer" onClick={() => { setDetailId(r.supplier_product_id) }}>
                  {visibleCols.supplier && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.supplier_name || 'Unknown Supplier'}</span>
                        {!r.is_active && <Badge variant="secondary">inactive</Badge>}
                      </div>
                    </TableCell>
                  )}
                  {visibleCols.supplier_code && (
                    <TableCell className="text-muted-foreground">{r.supplier_code || '-'}</TableCell>
                  )}
                  {visibleCols.sku && (
                    <TableCell className="text-muted-foreground">{r.supplier_sku}</TableCell>
                  )}
                  {visibleCols.name && (
                    <TableCell>{r.product_name || 'Product Details Unavailable'}</TableCell>
                  )}
                  {visibleCols.brand && (
                    <TableCell className="text-muted-foreground">{(r as unknown).brand || '-'}</TableCell>
                  )}
                  {visibleCols.uom && (
                    <TableCell className="text-muted-foreground">{r.uom || '-'}</TableCell>
                  )}
                  {visibleCols.pack_size && (
                    <TableCell className="text-muted-foreground">{r.pack_size || '-'}</TableCell>
                  )}
                  {visibleCols.barcode && (
                    <TableCell className="text-muted-foreground">{r.barcode || '-'}</TableCell>
                  )}
                  {visibleCols.category && (
                    <TableCell className="text-muted-foreground">{r.category_name || '-'}</TableCell>
                  )}
                  {visibleCols.soh && (
                    <TableCell className="text-right">{(r as unknown).qty_on_hand ?? 0}</TableCell>
                  )}
                  {visibleCols.on_order && (
                    <TableCell className="text-right">{(r as unknown).qty_on_order ?? 0}</TableCell>
                  )}
                  {visibleCols.price && (
                    <TableCell className="text-right">{formatCost(r.current_price)}</TableCell>
                  )}
                  {visibleCols.vat && (
                    <TableCell className="text-right">{formatCost(((r.current_price ?? 0) as number) * 0.15)}</TableCell>
                  )}
                  {visibleCols.currency && (
                    <TableCell className="text-right">{r.currency || 'ZAR'}</TableCell>
                  )}
                  {visibleCols.first_seen && (
                    <TableCell className="text-muted-foreground">{r.first_seen_at ? new Date(r.first_seen_at).toLocaleDateString() : '-'}</TableCell>
                  )}
                  {visibleCols.last_seen && (
                    <TableCell className="text-muted-foreground">{r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString() : '-'}</TableCell>
                  )}
                  {visibleCols.active && (
                    <TableCell className="text-muted-foreground">{r.is_active ? 'Yes' : 'No'}</TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No results
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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
      {/* Details Modal */}
      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) { setDetailId(null); setDetail(null); setHistory([]) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          <ProductDetailBody id={detailId} detail={detail} setDetail={setDetail} history={history} setHistory={setHistory} />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ProductDetailBody({ id, detail, setDetail, history, setHistory }: { id: string | null, detail: unknown, setDetail: (d: unknown) => void, history: unknown[], setHistory: (h: unknown[]) => void }) {
  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [dres, hres] = await Promise.all([
          fetch(`/api/catalog/products/${id}`),
          fetch(`/api/catalog/products/${id}/price-history?limit=50`)
        ])
        const dj = await dres.json(); const hj = await hres.json()
        setDetail(dj.data || null)
        setHistory(hj.data || [])
      } catch (e) {}
    })()
  }, [id, setDetail, setHistory])

  if (!id) return null
  return (
    <div className="space-y-4">
      {detail ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Supplier</span><div className="font-medium">{detail.supplier_name}</div></div>
          <div><span className="text-muted-foreground">SKU</span><div className="font-medium">{detail.supplier_sku}</div></div>
          <div className="col-span-2"><span className="text-muted-foreground">Product Name</span><div className="font-medium">{detail.name_from_supplier}</div></div>
          <div><span className="text-muted-foreground">Category</span><div className="font-medium">{detail.category_name || '-'}</div></div>
          <div><span className="text-muted-foreground">Cost Price</span><div className="font-medium">{formatCost(detail.current_price)}</div></div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Loading details…</div>
      )}
      <div>
        <div className="text-sm font-medium mb-2">Price History</div>
        <div className="border rounded-md max-h-48 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Valid From</TableHead>
                <TableHead>Valid To</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(h.valid_from).toLocaleString()}</TableCell>
                  <TableCell>{h.valid_to ? new Date(h.valid_to).toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-right">{formatCost(h.price)}</TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">No history</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
