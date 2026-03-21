'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { Search, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type RowItem = {
  id: string;
  sku: string;
  name: string;
  supplier_name: string;
  location: string;
  location_id: string;
  current_stock: number;
  cost_per_unit_zar: number;
  rsp: number | null;
  selling_price: number | null;
};

function effectiveSellingPrice(row: RowItem): number {
  const sp = row.selling_price;
  if (sp != null && !Number.isNaN(Number(sp)) && Number(sp) > 0) return Number(sp);
  if (row.rsp != null && !Number.isNaN(Number(row.rsp)) && Number(row.rsp) > 0) return Number(row.rsp);
  return 0;
}

export function SellingPricesTable() {
  const { items, loading, error, fetchItems, locations, fetchLocations } = useInventoryStore();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    void fetchItems();
    void fetchLocations();
  }, [fetchItems, fetchLocations]);

  const rows: RowItem[] = useMemo(() => {
    return (items as unknown[]).map((raw: unknown) => {
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? '');
      const sku = String(r.sku ?? '');
      const name = String(r.name ?? '');
      const supplier_name = String(r.supplier_name ?? '—');
      const location = String(r.location ?? '—');
      const location_id = String(r.location_id ?? location);
      const current_stock = Number(r.current_stock ?? 0);
      const cost_per_unit_zar = Number(r.cost_per_unit_zar ?? 0);
      const rspRaw = r.rsp;
      const rsp = rspRaw == null || rspRaw === '' ? null : Number(rspRaw);
      const spRaw = r.selling_price;
      const selling_price =
        spRaw == null || spRaw === '' ? null : Number(spRaw);
      return {
        id,
        sku,
        name,
        supplier_name,
        location,
        location_id,
        current_stock,
        cost_per_unit_zar,
        rsp: rsp != null && !Number.isNaN(rsp) ? rsp : null,
        selling_price: selling_price != null && !Number.isNaN(selling_price) ? selling_price : null,
      };
    });
  }, [items]);

  const filtered = useMemo(() => {
    let list = rows;
    if (locationFilter !== 'all') {
      list = list.filter(r => r.location_id === locationFilter || r.location === locationFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        r =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.supplier_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, locationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [search, locationFilter]);

  const displayPrice = useCallback(
    (row: RowItem) => {
      const d = drafts[row.id];
      if (d !== undefined) return d;
      const eff = effectiveSellingPrice(row);
      return eff > 0 ? String(eff) : '';
    },
    [drafts]
  );

  const setDraft = (id: string, value: string) => {
    setDrafts(prev => ({ ...prev, [id]: value }));
  };

  const dirtyRows = useMemo(() => {
    const out: Array<{ id: string; selling_price: number }> = [];
    for (const row of filtered) {
      const draft = drafts[row.id];
      if (draft === undefined) continue;
      const parsed = parseFloat(draft.replace(/,/g, ''));
      if (Number.isNaN(parsed) || parsed < 0) continue;
      const before = effectiveSellingPrice(row);
      if (Math.abs(parsed - before) < 0.005) continue;
      out.push({ id: row.id, selling_price: Math.round(parsed * 100) / 100 });
    }
    return out;
  }, [filtered, drafts]);

  const saveChanges = async () => {
    if (dirtyRows.length === 0) {
      toast.message('No selling price changes to save');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update',
          items: dirtyRows.map(({ id, selling_price }) => ({
            id,
            updates: { selling_price },
          })),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      toast.success(`Updated ${dirtyRows.length} selling price(s)`);
      setDrafts({});
      await fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const marginPct = (cost: number, sell: number) => {
    if (!cost || cost <= 0) return null;
    return ((sell - cost) / cost) * 100;
  };

  return (
    <Card className="border-border rounded-[10px]">
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">Retail price list</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search SKU, name, supplier…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-[10px] pl-9"
            />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[200px] rounded-[10px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            onClick={() => void fetchItems()}
            disabled={loading}
          >
            <RefreshCw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-[10px]"
            onClick={() => void saveChanges()}
            disabled={saving || dirtyRows.length === 0}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save {dirtyRows.length > 0 ? `(${dirtyRows.length})` : ''}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}
        <div className="rounded-[10px] border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Supplier</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">SOH</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">RRP</TableHead>
                <TableHead className="text-right">Selling price</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead className="text-right">Line value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground py-10 text-center text-sm">
                    Loading inventory…
                  </TableCell>
                </TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground py-10 text-center text-sm">
                    No rows match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map(row => {
                  const draftStr = displayPrice(row);
                  const sellNum = parseFloat(draftStr.replace(/,/g, ''));
                  const sell = !Number.isNaN(sellNum) && sellNum >= 0 ? sellNum : effectiveSellingPrice(row);
                  const m = marginPct(row.cost_per_unit_zar, sell);
                  const lineVal = sell * row.current_stock;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[160px] truncate font-medium">
                        {row.supplier_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[120px] truncate text-sm">
                        {row.location}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.current_stock}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.cost_per_unit_zar)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right font-mono text-sm">
                        {row.rsp != null ? formatCurrency(row.rsp) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="h-8 w-[110px] rounded-[8px] text-right font-mono text-sm"
                          inputMode="decimal"
                          value={draftStr}
                          onChange={e => setDraft(row.id, e.target.value)}
                          aria-label={`Selling price for ${row.sku}`}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right font-mono text-sm">
                        {m == null ? '—' : `${m.toFixed(1)}%`}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(lineVal)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 ? (
          <div className="text-muted-foreground mt-4 flex items-center justify-between text-sm">
            <span>
              Page {pageSafe} of {totalPages} · {filtered.length} rows
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px]"
                disabled={pageSafe <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px]"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
