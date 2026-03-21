'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchableSupplierSelect } from '@/components/shared/SearchableSupplierSelect';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { deriveStockStatus } from '@/lib/utils/inventory-metrics';
import type { Supplier } from '@/lib/types/inventory';
import {
  applyRounding,
  computeSuggestedPrice,
  marginPercentOnCostNormalized,
  DEFAULT_VAT_RATE,
  type CostBasis,
  type MarginBasis,
  type PricingMode,
  type RoundingMode,
} from '@/lib/retail-pricing/price-rules';
import {
  ChevronRight,
  Download,
  Loader2,
  Package,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PriceRow = {
  id: string;
  sku: string;
  name: string;
  supplier_name: string;
  supplier_id: string | null;
  category: string;
  brand: string;
  cost_per_unit_zar: number;
  last_purchase_ex_vat: number | null;
  current_stock: number;
  rsp: number | null;
  selling_price: number | null;
  stock_status: string;
  supplier_product_id: string | null;
};

function effectiveSellingPrice(row: PriceRow): number {
  const sp = row.selling_price;
  if (sp != null && !Number.isNaN(Number(sp)) && Number(sp) > 0) return Number(sp);
  if (row.rsp != null && !Number.isNaN(Number(row.rsp)) && Number(row.rsp) > 0) return Number(row.rsp);
  return 0;
}

const DRAFT_KEY = 'price_list_workspace_draft_v1';
const PAGE_SIZE = 50;

export function PriceListWorkspace() {
  const { items, loading, error, fetchItems, fetchSuppliers, suppliers, clearError } =
    useInventoryStore();

  const [supplierId, setSupplierId] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [costMin, setCostMin] = useState('');
  const [costMax, setCostMax] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [scopeFiltered, setScopeFiltered] = useState(true);

  const [pricingTab, setPricingTab] = useState<PricingMode>('margin_pct');
  const [marginPercent, setMarginPercent] = useState(30);
  const [markupPercent, setMarkupPercent] = useState(30);
  const [fixedPrice, setFixedPrice] = useState(99);
  const [valueAdd, setValueAdd] = useState(10);
  const [marginBasis, setMarginBasis] = useState<MarginBasis>('on_sell');
  const [costBasis, setCostBasis] = useState<CostBasis>('unit_cost');
  const [rounding, setRounding] = useState<RoundingMode>('cents_95');
  const [priceIncVat, setPriceIncVat] = useState(false);

  const [rulePreview, setRulePreview] = useState<Record<string, number>>({});
  const [ruleLoading, setRuleLoading] = useState(false);

  const [page, setPage] = useState(1);
  /** Only the PUT / bulk-apply request — do not tie to fetchItems() or the button feels "stuck" */
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    void fetchItems();
    void fetchSuppliers();
  }, [fetchItems, fetchSuppliers]);

  const rows: PriceRow[] = useMemo(() => {
    return (items as unknown[]).map((raw: unknown) => {
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? '');
      const sku = String(r.sku ?? '');
      const name = String(r.name ?? '');
      const supplier_name = String(r.supplier_name ?? '—');
      const supplier_id =
        r.supplier_id != null && String(r.supplier_id).length > 0 ? String(r.supplier_id) : null;
      const category = String(r.category ?? 'uncategorized');
      const brand = String(r.brand ?? '—');
      const current_stock = Number(r.current_stock ?? 0);
      const reorder_point = Number(r.reorder_point ?? 0);
      const max_stock_level = Number(r.max_stock_level ?? 0);
      const cost_per_unit_zar = Number(r.cost_per_unit_zar ?? 0);
      const rspRaw = r.rsp;
      const rsp = rspRaw == null || rspRaw === '' ? null : Number(rspRaw);
      const spRaw = r.selling_price;
      const selling_price = spRaw == null || spRaw === '' ? null : Number(spRaw);
      let stock_status = String(r.stock_status ?? '');
      if (!stock_status) {
        stock_status = deriveStockStatus(current_stock, reorder_point, max_stock_level);
      }
      const supplier_product_id =
        r.supplier_product_id != null && String(r.supplier_product_id).length > 0
          ? String(r.supplier_product_id)
          : null;
      const lastPurchase =
        r.last_purchase_price != null && r.last_purchase_price !== ''
          ? Number(r.last_purchase_price)
          : null;
      return {
        id,
        sku,
        name,
        supplier_name,
        supplier_id,
        category,
        brand,
        cost_per_unit_zar,
        last_purchase_ex_vat:
          lastPurchase != null && !Number.isNaN(lastPurchase) && lastPurchase > 0
            ? lastPurchase
            : null,
        current_stock,
        rsp: rsp != null && !Number.isNaN(rsp) ? rsp : null,
        selling_price: selling_price != null && !Number.isNaN(selling_price) ? selling_price : null,
        stock_status,
        supplier_product_id,
      };
    });
  }, [items]);

  const categories = useMemo(
    () => [...new Set(rows.map(r => r.category).filter(Boolean))].sort() as string[],
    [rows],
  );
  const brands = useMemo(
    () => [...new Set(rows.map(r => r.brand).filter(b => b && b !== '—'))].sort() as string[],
    [rows],
  );

  const supplierOptions = useMemo(
    () =>
      (suppliers as Supplier[])
        .filter(s => s && s.id)
        .map(s => ({ id: s.id, supplier_id: s.id, name: s.name })),
    [suppliers],
  );

  const baseFiltered = useMemo(() => {
    let list = rows;
    if (supplierId !== 'all') {
      list = list.filter(r => r.supplier_id === supplierId);
    }
    if (!scopeFiltered) return list;

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        r =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.supplier_name.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter(r => r.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    if (brandFilter !== 'all') {
      list = list.filter(r => r.brand === brandFilter);
    }
    if (costMin) {
      const min = parseFloat(costMin);
      if (Number.isFinite(min)) list = list.filter(r => r.cost_per_unit_zar >= min);
    }
    if (costMax) {
      const max = parseFloat(costMax);
      if (Number.isFinite(max)) list = list.filter(r => r.cost_per_unit_zar <= max);
    }
    if (inStockOnly) {
      list = list.filter(r => r.current_stock > 0);
    }
    return list;
  }, [
    rows,
    supplierId,
    scopeFiltered,
    search,
    categoryFilter,
    brandFilter,
    costMin,
    costMax,
    inStockOnly,
  ]);

  const rulesInput = useMemo(
    () => ({
      mode:
        pricingTab === 'rule_based'
          ? ('markup_pct' as const)
          : (pricingTab as 'margin_pct' | 'markup_pct' | 'fixed_price' | 'cost_plus_value'),
      marginPercent,
      markupPercent,
      fixedPrice,
      valueAdd,
      marginBasis,
      rounding,
      priceIncVat,
    }),
    [
      pricingTab,
      marginPercent,
      markupPercent,
      fixedPrice,
      valueAdd,
      marginBasis,
      rounding,
      priceIncVat,
    ],
  );

  const previewForRow = useCallback(
    (row: PriceRow): number | null => {
      if (pricingTab === 'rule_based') {
        const v = rulePreview[row.id];
        return v != null && Number.isFinite(v) ? v : null;
      }
      return computeSuggestedPrice({
        unitCostExVat: row.cost_per_unit_zar,
        lastPurchaseExVat: row.last_purchase_ex_vat,
        costBasis,
        rules: { ...rulesInput, mode: rulesInput.mode },
      });
    },
    [pricingTab, rulePreview, costBasis, rulesInput],
  );

  useEffect(() => {
    if (pricingTab !== 'rule_based') {
      setRulePreview({});
      setRuleLoading(false);
      return;
    }

    const needPreview = baseFiltered.filter(
      r => r.supplier_product_id && r.cost_per_unit_zar > 0,
    );
    if (needPreview.length === 0) {
      setRulePreview({});
      setRuleLoading(false);
      return;
    }

    let cancelled = false;
    setRuleLoading(true);

    const chunks: (typeof needPreview)[] = [];
    for (let i = 0; i < needPreview.length; i += 40) {
      chunks.push(needPreview.slice(i, i + 40));
    }

    (async () => {
      const merged: Record<string, number> = {};
      try {
        for (const chunk of chunks) {
          const res = await fetch('/api/retail-pricing/preview-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: chunk.map(r => ({
                soh_id: r.id,
                supplier_product_id: r.supplier_product_id,
                unit_cost: r.cost_per_unit_zar,
              })),
            }),
          });
          const data = (await res.json()) as {
            success?: boolean;
            results?: Array<{ soh_id: string; selling_price: number }>;
            error?: string;
          };
          if (!res.ok || !data.success) {
            throw new Error(data.error || `Preview failed (${res.status})`);
          }
          for (const row of data.results ?? []) {
            const exRounded = applyRounding(row.selling_price, rounding);
            const final = priceIncVat
              ? Math.round(exRounded * (1 + DEFAULT_VAT_RATE) * 100) / 100
              : exRounded;
            merged[row.soh_id] = final;
          }
        }
        if (!cancelled) {
          setRulePreview(merged);
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Rule preview failed');
          setRulePreview({});
        }
      } finally {
        if (!cancelled) setRuleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pricingTab, baseFiltered, rounding, priceIncVat]);

  const totalPages = Math.max(1, Math.ceil(baseFiltered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return baseFiltered.slice(start, start + PAGE_SIZE);
  }, [baseFiltered, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [
    supplierId,
    scopeFiltered,
    search,
    categoryFilter,
    brandFilter,
    costMin,
    costMax,
    inStockOnly,
  ]);

  const resetWorkspace = () => {
    setMarginPercent(30);
    setMarkupPercent(30);
    setFixedPrice(99);
    setValueAdd(10);
    setMarginBasis('on_sell');
    setCostBasis('unit_cost');
    setRounding('cents_95');
    setPriceIncVat(false);
    setPricingTab('margin_pct');
    setRulePreview({});
    toast.message('Pricing rules reset');
  };

  const saveDraft = () => {
    try {
      const payload = {
        supplierId,
        scopeFiltered,
        search,
        categoryFilter,
        brandFilter,
        costMin,
        costMax,
        inStockOnly,
        pricingTab,
        marginPercent,
        markupPercent,
        fixedPrice,
        valueAdd,
        marginBasis,
        costBasis,
        rounding,
        priceIncVat,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      toast.success('Draft saved in this browser');
    } catch {
      toast.error('Could not save draft');
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.supplierId === 'string') setSupplierId(d.supplierId);
      if (typeof d.scopeFiltered === 'boolean') setScopeFiltered(d.scopeFiltered);
      if (typeof d.search === 'string') setSearch(d.search);
      if (typeof d.categoryFilter === 'string') setCategoryFilter(d.categoryFilter);
      if (typeof d.brandFilter === 'string') setBrandFilter(d.brandFilter);
      if (typeof d.costMin === 'string') setCostMin(d.costMin);
      if (typeof d.costMax === 'string') setCostMax(d.costMax);
      if (typeof d.inStockOnly === 'boolean') setInStockOnly(d.inStockOnly);
      if (typeof d.pricingTab === 'string') setPricingTab(d.pricingTab as PricingMode);
      if (typeof d.marginPercent === 'number') setMarginPercent(d.marginPercent);
      if (typeof d.markupPercent === 'number') setMarkupPercent(d.markupPercent);
      if (typeof d.fixedPrice === 'number') setFixedPrice(d.fixedPrice);
      if (typeof d.valueAdd === 'number') setValueAdd(d.valueAdd);
      if (d.marginBasis === 'on_cost' || d.marginBasis === 'on_sell') setMarginBasis(d.marginBasis);
      if (d.costBasis === 'unit_cost' || d.costBasis === 'last_purchase') setCostBasis(d.costBasis);
      if (
        d.rounding === 'none' ||
        d.rounding === 'cents_99' ||
        d.rounding === 'cents_95' ||
        d.rounding === 'whole'
      )
        setRounding(d.rounding);
      if (typeof d.priceIncVat === 'boolean') setPriceIncVat(d.priceIncVat);
    } catch {
      /* ignore */
    }
  }, []);

  const exportCsv = (kind: 'preview' | 'current') => {
    const header = [
      'SKU',
      'Name',
      'Supplier',
      'Cost',
      'Current price',
      'New price',
      'Change',
    ].join(',');
    const lines = baseFiltered.map(row => {
      const cur = effectiveSellingPrice(row);
      const neu =
        kind === 'preview'
          ? (previewForRow(row) ?? '')
          : cur;
      const ch =
        kind === 'preview' && neu !== '' && typeof neu === 'number'
          ? neu - cur
          : '';
      return [
        JSON.stringify(row.sku),
        JSON.stringify(row.name),
        JSON.stringify(row.supplier_name),
        row.cost_per_unit_zar,
        cur,
        neu,
        ch,
      ].join(',');
    });
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-list-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.message('Export started');
  };

  const applyPricing = async () => {
    const updates: Array<{ id: string; selling_price: number }> = [];
    for (const row of baseFiltered) {
      const neu = previewForRow(row);
      if (neu == null || !Number.isFinite(neu)) continue;
      const cur = effectiveSellingPrice(row);
      if (Math.abs(neu - cur) < 0.005) continue;
      updates.push({ id: row.id, selling_price: Math.round(neu * 100) / 100 });
    }
    if (updates.length === 0) {
      toast.message(
        'No price changes to apply — new prices match current prices for this view, or costs are missing.',
      );
      return;
    }
    setApplying(true);
    const ac = new AbortController();
    const t = window.setTimeout(() => ac.abort(), 120_000);
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          action: 'bulk_update',
          items: updates.map(({ id, selling_price }) => ({
            id,
            updates: { selling_price },
          })),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Apply failed (${res.status})`);
      }
      toast.success(`Applied pricing to ${updates.length} line(s)`);
      setApplying(false);
      void fetchItems().catch(() => {
        toast.message('Prices saved; list refresh failed — use refresh or reload the page.');
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        toast.error('Apply timed out — try fewer rows or check the network.');
      } else {
        toast.error(e instanceof Error ? e.message : 'Apply failed');
      }
      setApplying(false);
    } finally {
      window.clearTimeout(t);
    }
  };

  const linesToChange = useMemo(() => {
    let n = 0;
    for (const row of baseFiltered) {
      const neu = previewForRow(row);
      if (neu == null || !Number.isFinite(neu)) continue;
      const cur = effectiveSellingPrice(row);
      if (Math.abs(neu - cur) >= 0.005) n++;
    }
    return n;
  }, [baseFiltered, previewForRow]);

  const filterChips = useMemo(() => {
    const chips: { label: string }[] = [];
    if (supplierId !== 'all') {
      const s = supplierOptions.find(o => o.id === supplierId);
      chips.push({ label: `Supplier: ${s?.name ?? supplierId}` });
    }
    if (scopeFiltered) {
      if (categoryFilter !== 'all') chips.push({ label: `Category: ${categoryFilter}` });
      if (brandFilter !== 'all') chips.push({ label: `Brand: ${brandFilter}` });
      if (costMin || costMax) {
        chips.push({
          label: `Cost: ${costMin || '0'} – ${costMax || '∞'}`,
        });
      }
      if (inStockOnly) chips.push({ label: 'In stock only' });
    }
    return chips;
  }, [
    supplierId,
    supplierOptions,
    scopeFiltered,
    categoryFilter,
    brandFilter,
    costMin,
    costMax,
    inStockOnly,
  ]);

  const supplierLabel =
    supplierId === 'all'
      ? 'All suppliers'
      : supplierOptions.find(o => o.id === supplierId)?.name ?? supplierId;

  return (
    <Card className="border-border bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <CardContent className="space-y-6 p-6 sm:p-8">
        {error ? (
          <div className="text-destructive flex items-center gap-2 text-sm">
            {error}
            <Button type="button" variant="outline" size="sm" onClick={() => clearError()}>
              Dismiss
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border-border bg-muted/30 flex items-start gap-3 rounded-[10px] border p-4">
            <Package className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="text-muted-foreground text-xs font-medium">Rows in view</p>
              <p className="text-foreground text-2xl font-semibold tabular-nums">
                {baseFiltered.length}
              </p>
            </div>
          </div>
          <div className="border-border bg-muted/30 flex items-start gap-3 rounded-[10px] border p-4">
            <SlidersHorizontal className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="text-muted-foreground text-xs font-medium">Ready to apply</p>
              <p className="text-foreground text-2xl font-semibold tabular-nums">{linesToChange}</p>
            </div>
          </div>
          <div className="border-border bg-muted/30 flex items-start gap-3 rounded-[10px] border p-4">
            <Table2 className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium">Supplier scope</p>
              <p className="text-foreground truncate text-sm font-semibold">{supplierLabel}</p>
            </div>
          </div>
        </div>

        <div className="border-border space-y-4 rounded-[10px] border bg-background p-4 sm:p-5">
          <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Package className="h-4 w-4 text-primary" aria-hidden />
            Scope and filters
          </h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 min-w-[220px]">
            <Label htmlFor="pl-supplier">Supplier</Label>
            <SearchableSupplierSelect
              value={supplierId}
              onValueChange={setSupplierId}
              suppliers={supplierOptions}
              placeholder="All suppliers"
              showAllOption
              allOptionValue="all"
              className="w-[min(100%,280px)]"
            />
          </div>
          <div className="space-y-2 flex-1 max-w-xl">
            <Label>Product scope</Label>
            <RadioGroup
              className="flex flex-wrap gap-4"
              value={scopeFiltered ? 'filtered' : 'all'}
              onValueChange={v => setScopeFiltered(v === 'filtered')}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="pl-all" />
                <Label htmlFor="pl-all" className="font-normal cursor-pointer">
                  All products
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="filtered" id="pl-filt" />
                <Label htmlFor="pl-filt" className="font-normal cursor-pointer">
                  Filtered products
                </Label>
              </div>
              <div className="flex items-center gap-2 opacity-50 pointer-events-none">
                <Checkbox id="pl-redos" disabled checked={false} />
                <Label htmlFor="pl-redos" className="font-normal">
                  Redos
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {scopeFiltered ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
            <div className="space-y-1">
              <Label>Search</Label>
              <div className="relative">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="SKU, name, supplier…"
                  className="rounded-[10px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map(b => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cost range (ZAR)</Label>
              <div className="flex gap-2">
                <Input
                  className="rounded-[10px]"
                  placeholder="Min"
                  value={costMin}
                  onChange={e => setCostMin(e.target.value)}
                />
                <Input
                  className="rounded-[10px]"
                  placeholder="Max"
                  value={costMax}
                  onChange={e => setCostMax(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="pl-instock"
                checked={inStockOnly}
                onCheckedChange={v => setInStockOnly(v === true)}
              />
              <Label htmlFor="pl-instock" className="font-normal cursor-pointer">
                In stock only
              </Label>
            </div>
          </div>
        ) : null}

        {filterChips.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {filterChips.map(c => (
              <span
                key={c.label}
                className="border-border bg-muted/40 text-foreground inline-flex items-center rounded-[8px] border px-2 py-1 text-xs font-medium"
              >
                {c.label}
              </span>
            ))}
          </div>
        ) : null}
        </div>

        <div className="border-border space-y-4 rounded-[10px] border bg-background p-4 sm:p-5">
          <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight">
            <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden />
            Pricing rules
          </h2>
        <Tabs
          value={pricingTab}
          onValueChange={v => setPricingTab(v as PricingMode)}
          className="w-full"
        >
          <TabsList className="bg-muted/50 flex h-auto min-h-[2.75rem] flex-wrap justify-start gap-1 rounded-[10px] p-1.5">
            <TabsTrigger
              value="margin_pct"
              className="data-[state=active]:bg-card rounded-[8px] px-4 py-2 text-sm font-semibold"
            >
              Margin %
            </TabsTrigger>
            <TabsTrigger
              value="markup_pct"
              className="data-[state=active]:bg-card rounded-[8px] px-4 py-2 text-sm font-semibold"
            >
              Markup %
            </TabsTrigger>
            <TabsTrigger
              value="fixed_price"
              className="data-[state=active]:bg-card rounded-[8px] px-4 py-2 text-sm font-semibold"
            >
              Fixed price
            </TabsTrigger>
            <TabsTrigger
              value="cost_plus_value"
              className="data-[state=active]:bg-card rounded-[8px] px-4 py-2 text-sm font-semibold"
            >
              Cost + value
            </TabsTrigger>
            <TabsTrigger
              value="rule_based"
              className="data-[state=active]:bg-card rounded-[8px] px-4 py-2 text-sm font-semibold"
            >
              Rule-based
            </TabsTrigger>
          </TabsList>

          <TabsContent value="margin_pct" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label>Margin %</Label>
                <Input
                  type="number"
                  className="w-[120px] rounded-[10px]"
                  value={marginPercent}
                  onChange={e => setMarginPercent(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Margin basis</Label>
                <RadioGroup
                  className="flex gap-4"
                  value={marginBasis}
                  onValueChange={v => setMarginBasis(v as MarginBasis)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="on_cost" id="mb-cost" />
                    <Label htmlFor="mb-cost" className="font-normal cursor-pointer">
                      On cost (markup-style)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="on_sell" id="mb-sell" />
                    <Label htmlFor="mb-sell" className="font-normal cursor-pointer">
                      On sell (retail margin)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="markup_pct" className="mt-4">
            <div className="space-y-1 max-w-xs">
              <Label>Markup %</Label>
              <Input
                type="number"
                className="rounded-[10px]"
                value={markupPercent}
                onChange={e => setMarkupPercent(Number(e.target.value))}
              />
            </div>
          </TabsContent>

          <TabsContent value="fixed_price" className="mt-4">
            <div className="space-y-1 max-w-xs">
              <Label>Fixed selling price (ex VAT before VAT toggle)</Label>
              <Input
                type="number"
                className="rounded-[10px]"
                value={fixedPrice}
                onChange={e => setFixedPrice(Number(e.target.value))}
              />
            </div>
          </TabsContent>

          <TabsContent value="cost_plus_value" className="mt-4">
            <div className="space-y-1 max-w-xs">
              <Label>Value added to cost (ZAR)</Label>
              <Input
                type="number"
                className="rounded-[10px]"
                value={valueAdd}
                onChange={e => setValueAdd(Number(e.target.value))}
              />
            </div>
          </TabsContent>

          <TabsContent value="rule_based" className="mt-4">
            <p className="text-muted-foreground text-sm">
              Uses active pricing rules from the database (same engine as automated SOH pricing).
              {ruleLoading ? ' Loading preview…' : ''}
            </p>
          </TabsContent>
        </Tabs>

        <div className="border-border mt-4 flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Cost basis</Label>
            <RadioGroup
              className="flex gap-4"
              value={costBasis}
              onValueChange={v => setCostBasis(v as CostBasis)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="unit_cost" id="cb-unit" />
                <Label htmlFor="cb-unit" className="font-normal cursor-pointer">
                  Unit cost
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="last_purchase" id="cb-last" />
                <Label htmlFor="cb-last" className="font-normal cursor-pointer">
                  Last purchase (when known)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Rounding</Label>
            <RadioGroup
              className="flex flex-wrap gap-3"
              value={rounding}
              onValueChange={v => setRounding(v as RoundingMode)}
            >
              {(
                [
                  ['none', 'None'],
                  ['cents_99', '.99'],
                  ['cents_95', '.95'],
                  ['whole', 'Whole'],
                ] as const
              ).map(([val, label]) => (
                <div key={val} className="flex items-center gap-2">
                  <RadioGroupItem value={val} id={`rd-${val}`} />
                  <Label htmlFor={`rd-${val}`} className="font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">VAT on selling price</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vat-ex"
                  checked={!priceIncVat}
                  onCheckedChange={() => setPriceIncVat(false)}
                />
                <Label htmlFor="vat-ex" className="font-normal cursor-pointer">
                  Exclude VAT
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vat-inc"
                  checked={priceIncVat}
                  onCheckedChange={() => setPriceIncVat(true)}
                />
                <Label htmlFor="vat-inc" className="font-normal cursor-pointer">
                  Include VAT
                </Label>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="border-border space-y-3 rounded-[10px] border bg-background p-4 sm:p-5">
          <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Table2 className="h-4 w-4 text-primary" aria-hidden />
            Preview
          </h2>
        <div className="border-border overflow-x-auto rounded-[10px] border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    Loading inventory…
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    No rows match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(row => {
                  const cur = effectiveSellingPrice(row);
                  const neu = previewForRow(row);
                  const delta =
                    neu != null && Number.isFinite(neu) ? Math.round((neu - cur) * 100) / 100 : null;
                  const marginNew =
                    neu != null
                      ? marginPercentOnCostNormalized(
                          row.cost_per_unit_zar,
                          neu,
                          priceIncVat,
                        )
                      : null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.supplier_name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.cost_per_unit_zar)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {cur > 0 ? formatCurrency(cur) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {neu != null ? (
                          <span
                            className={cn(
                              'inline-flex min-w-[4.5rem] justify-end rounded-[8px] border px-2 py-0.5 tabular-nums text-sm',
                              delta != null && delta > 0
                                ? 'border-success/30 bg-success/10 text-success'
                                : delta != null && delta < 0
                                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                  : 'border-border bg-muted/30 text-foreground',
                            )}
                          >
                            {formatCurrency(neu)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {marginNew != null ? `${marginNew.toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right text-sm tabular-nums',
                          delta != null && delta > 0 && 'text-success',
                          delta != null && delta < 0 && 'text-destructive',
                        )}
                      >
                        {delta != null && Math.abs(delta) > 0.004
                          ? `${delta > 0 ? '+' : '−'}${formatCurrency(Math.abs(delta))}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span>
            Showing {(pageSafe - 1) * PAGE_SIZE + 1}–
            {Math.min(pageSafe * PAGE_SIZE, baseFiltered.length)} of {baseFiltered.length} rows
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[8px] font-medium"
              disabled={pageSafe <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[8px] font-medium"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
        </div>

        <div className="border-border bg-muted/20 flex flex-wrap items-center justify-end gap-3 rounded-[10px] border p-4 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 min-w-[7rem] rounded-[10px] border-2 font-semibold"
            onClick={resetWorkspace}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 min-w-[7rem] rounded-[10px] border-2 font-semibold"
            onClick={saveDraft}
          >
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 min-w-[8rem] rounded-[10px] border-2 font-semibold"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-[10px]">
              <DropdownMenuItem onClick={() => exportCsv('preview')}>
                Preview (current vs new)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv('current')}>
                Current prices only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            size="lg"
            className="h-12 min-w-[12rem] rounded-[10px] px-8 text-base font-semibold transition-opacity duration-150 hover:opacity-95 disabled:opacity-60"
            disabled={applying}
            onClick={() => void applyPricing()}
          >
            {applying ? (
              <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
            ) : null}
            Apply pricing
            <ChevronRight className="ml-1 h-5 w-5 shrink-0" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
