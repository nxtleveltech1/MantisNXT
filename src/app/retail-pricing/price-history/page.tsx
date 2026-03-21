'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

type RecentChange = {
  changed_at?: Date | string;
  product_name?: string;
  sku?: string;
  old_price?: number;
  new_price?: number;
  price_change_percent?: number;
  change_reason?: string;
};

type HistoryPoint = { date: Date; price: number; change_percent?: number; change_reason?: string };

export default function RetailPriceHistoryPage() {
  const [recent, setRecent] = useState<RecentChange[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [productId, setProductId] = useState('');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRecent();
  }, []);

  const loadRecent = async () => {
    setLoadingRecent(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/pricing/history?type=recent&limit=100');
      const data = (await res.json()) as { success?: boolean; data?: RecentChange[] };
      if (!data.success || !Array.isArray(data.data)) {
        setRecent([]);
        return;
      }
      setRecent(data.data);
    } catch {
      setError('Could not load recent price changes');
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  const loadProductHistory = async () => {
    if (!productId) return;
    setLoadingHistory(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/pricing/history?type=product&product_id=${encodeURIComponent(productId)}`
      );
      const data = (await res.json()) as {
        success?: boolean;
        data?: Array<{
          date: string;
          price: number;
          change_percent?: number;
          change_reason?: string;
        }>;
      };
      if (!data.success || !Array.isArray(data.data)) {
        setHistory([]);
        return;
      }
      setHistory(
        data.data.map(h => ({
          date: new Date(h.date),
          price: h.price,
          change_percent: h.change_percent,
          change_reason: h.change_reason,
        }))
      );
    } catch {
      setError('Could not load product price history');
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <AppLayout
      title="Price history"
      breadcrumbs={[
        { label: 'Retail Price Listing', href: '/retail-pricing/price-positioning' },
        { label: 'Price history' },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Price history</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Internal selling price audit trail. Competitor price history is available under Market
            Analysis.
          </p>
        </div>

        <Card className="rounded-[10px]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Recent changes</CardTitle>
              <CardDescription>Latest logged adjustments across the catalogue</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[10px]"
              onClick={() => void loadRecent()}
              disabled={loadingRecent}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {error ? <p className="text-destructive mb-2 text-sm">{error}</p> : null}
            {loadingRecent ? (
              <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : recent.length === 0 ? (
              <p className="text-muted-foreground py-6 text-sm">No recent price changes recorded.</p>
            ) : (
              <div className="rounded-[10px] border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>When</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Old</TableHead>
                      <TableHead className="text-right">New</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((row, i) => {
                      const when = row.changed_at
                        ? format(new Date(row.changed_at), 'yyyy-MM-dd HH:mm')
                        : '—';
                      return (
                        <TableRow key={`${when}-${i}`}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{when}</TableCell>
                          <TableCell className="font-mono text-xs">{row.sku ?? '—'}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {row.product_name ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.old_price != null ? formatCurrency(row.old_price) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.new_price != null ? formatCurrency(row.new_price) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.price_change_percent != null
                              ? `${row.price_change_percent.toFixed(1)}%`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[180px] truncate text-xs">
                            {row.change_reason ?? '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[10px]">
          <CardHeader>
            <CardTitle>Product timeline</CardTitle>
            <CardDescription>
              Enter a core product id (UUID) to load logged price points from the pricing audit
              table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[280px] flex-1 space-y-2">
                <Label htmlFor="product-id">Product id</Label>
                <Input
                  id="product-id"
                  className="rounded-[10px] font-mono text-sm"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={productId}
                  onChange={e => setProductId(e.target.value.trim())}
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="rounded-[10px]"
                disabled={!productId || loadingHistory}
                onClick={() => void loadProductHistory()}
              >
                {loadingHistory ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Load history'
                )}
              </Button>
            </div>
            {history.length === 0 && !loadingHistory && productId ? (
              <p className="text-muted-foreground text-sm">No history entries for this product.</p>
            ) : null}
            {history.length > 0 ? (
              <div className="rounded-[10px] border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change %</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h, idx) => (
                      <TableRow key={`${h.date.toISOString()}-${idx}`}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {format(h.date, 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(h.price)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {h.change_percent != null ? `${h.change_percent.toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {h.change_reason ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
