'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDownUp,
  BarChart3,
  Filter,
  Loader2,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { SupplierComparisonCard } from './SupplierComparisonCard';
import type {
  SupplierOffer,
  SKUComparison,
  ComparisonSortConfig,
  ComparisonFilterConfig,
} from '@/types/supplier-comparison';
import { cn } from '@/lib/utils';

interface SKUComparisonPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onSelect?: (offer: SupplierOffer) => void;
  selectedOfferId?: string;
}

/**
 * Dialog panel that displays all suppliers for a given SKU,
 * enabling price comparison and supplier selection.
 */
export function SKUComparisonPanel({
  open,
  onOpenChange,
  initialQuery = '',
  onSelect,
  selectedOfferId,
}: SKUComparisonPanelProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<SKUComparison[]>([]);
  const [totalOffers, setTotalOffers] = useState(0);

  const [sort, setSort] = useState<ComparisonSortConfig>({
    field: 'price',
    direction: 'asc',
  });

  const [filters, setFilters] = useState<ComparisonFilterConfig>({
    in_stock_only: false,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update query when initialQuery changes
  useEffect(() => {
    if (initialQuery && initialQuery !== searchQuery) {
      setSearchQuery(initialQuery);
      setDebouncedQuery(initialQuery);
    }
  }, [initialQuery]);

  // Fetch comparison data
  const fetchComparisons = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setComparisons([]);
      setTotalOffers(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: debouncedQuery,
        include_out_of_stock: String(!filters.in_stock_only),
        sort_by: sort.field,
        sort_dir: sort.direction,
        limit: '50',
      });

      if (filters.min_price !== undefined) {
        params.set('min_price', String(filters.min_price));
      }
      if (filters.max_price !== undefined) {
        params.set('max_price', String(filters.max_price));
      }
      if (filters.selected_suppliers && filters.selected_suppliers.length > 0) {
        params.set('supplier_ids', filters.selected_suppliers.join(','));
      }

      const response = await fetch(`/api/products/compare-suppliers?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch comparisons');
      }

      setComparisons(data.data.comparisons);
      setTotalOffers(data.data.total_offers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setComparisons([]);
      setTotalOffers(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, sort]);

  useEffect(() => {
    if (open) {
      fetchComparisons();
    }
  }, [open, fetchComparisons]);

  // Sort offers within comparisons
  const sortedComparisons = useMemo(() => {
    return comparisons.map(comp => {
      const sortedOffers = [...comp.offers].sort((a, b) => {
        let aVal: number | string | null = null;
        let bVal: number | string | null = null;

        switch (sort.field) {
          case 'price':
            aVal = a.cost_after_discount ?? a.current_price ?? Infinity;
            bVal = b.cost_after_discount ?? b.current_price ?? Infinity;
            break;
          case 'supplier_name':
            aVal = a.supplier_name.toLowerCase();
            bVal = b.supplier_name.toLowerCase();
            break;
          case 'lead_time':
            aVal = a.lead_time_days ?? Infinity;
            bVal = b.lead_time_days ?? Infinity;
            break;
          case 'stock':
            aVal = a.stock_on_hand ?? -1;
            bVal = b.stock_on_hand ?? -1;
            break;
          case 'discount':
            aVal = a.base_discount ?? 0;
            bVal = b.base_discount ?? 0;
            break;
        }

        if (aVal === null || bVal === null) return 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sort.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sort.direction === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });

      return { ...comp, offers: sortedOffers };
    });
  }, [comparisons, sort]);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSelectOffer = (offer: SupplierOffer) => {
    onSelect?.(offer);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.in_stock_only) count++;
    if (filters.min_price !== undefined) count++;
    if (filters.max_price !== undefined) count++;
    if (filters.selected_suppliers && filters.selected_suppliers.length > 0) count++;
    if (filters.supplier_tiers && filters.supplier_tiers.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Compare Supplier Prices
          </DialogTitle>
          <DialogDescription>
            Search for a product to compare prices across all suppliers
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          {/* Search and Controls */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU or product name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && 'bg-muted')}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge
                    className="absolute -right-1 -top-1 h-4 w-4 p-0 text-[10px]"
                    variant="default"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <Select
                value={`${sort.field}-${sort.direction}`}
                onValueChange={value => {
                  const [field, direction] = value.split('-') as [
                    ComparisonSortConfig['field'],
                    ComparisonSortConfig['direction'],
                  ];
                  setSort({ field, direction });
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="supplier_name-asc">Supplier: A-Z</SelectItem>
                  <SelectItem value="supplier_name-desc">Supplier: Z-A</SelectItem>
                  <SelectItem value="stock-desc">Stock: High to Low</SelectItem>
                  <SelectItem value="lead_time-asc">Lead Time: Fastest</SelectItem>
                  <SelectItem value="discount-desc">Discount: Highest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="in-stock"
                      checked={filters.in_stock_only}
                      onCheckedChange={checked =>
                        setFilters(prev => ({ ...prev, in_stock_only: checked }))
                      }
                    />
                    <Label htmlFor="in-stock" className="text-sm">
                      In stock only
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Min Price:</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="h-8 w-24"
                      value={filters.min_price ?? ''}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          min_price: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Max Price:</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      className="h-8 w-24"
                      value={filters.max_price ?? ''}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          max_price: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                    />
                  </div>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFilters({ in_stock_only: false })
                      }
                    >
                      <X className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="h-[60vh]">
            <div className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-destructive/10 p-3">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="mb-2 font-semibold">Error Loading Results</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => fetchComparisons()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : sortedComparisons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-muted p-3">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 font-semibold">No Results Found</h3>
                  <p className="text-sm text-muted-foreground">
                    {debouncedQuery
                      ? `No suppliers found for "${debouncedQuery}"`
                      : 'Enter a SKU or product name to search'}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Summary Stats */}
                  <div className="flex flex-wrap gap-4">
                    <Badge variant="secondary" className="h-7 gap-1.5 px-3">
                      <Package className="h-3.5 w-3.5" />
                      {sortedComparisons.length} SKU{sortedComparisons.length !== 1 && 's'}
                    </Badge>
                    <Badge variant="secondary" className="h-7 gap-1.5 px-3">
                      {totalOffers} supplier offer{totalOffers !== 1 && 's'}
                    </Badge>
                  </div>

                  {/* Comparison Groups by SKU */}
                  {sortedComparisons.map(comparison => (
                    <div key={comparison.sku} className="space-y-4">
                      {/* SKU Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="flex items-center gap-2 font-semibold">
                            <Badge variant="outline" className="font-mono">
                              {comparison.sku}
                            </Badge>
                            {comparison.product_name}
                          </h3>
                          {comparison.brand && (
                            <p className="text-sm text-muted-foreground">
                              Brand: {comparison.brand}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">
                            {comparison.total_suppliers} supplier
                            {comparison.total_suppliers !== 1 && 's'}
                          </span>
                          {comparison.lowest_price !== null && (
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-4 w-4 text-emerald-600" />
                              <span className="font-medium text-emerald-600">
                                {formatCurrency(comparison.lowest_price)}
                              </span>
                            </div>
                          )}
                          {comparison.price_range_percent !== null &&
                            comparison.price_range_percent > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {comparison.price_range_percent}% range
                              </Badge>
                            )}
                        </div>
                      </div>

                      <Separator />

                      {/* Supplier Cards Grid */}
                      {viewMode === 'cards' ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {comparison.offers.map(offer => (
                            <SupplierComparisonCard
                              key={offer.supplier_product_id}
                              offer={offer}
                              isSelected={selectedOfferId === offer.supplier_product_id}
                              onSelect={handleSelectOffer}
                              showSelectButton={!!onSelect}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {comparison.offers.map(offer => (
                            <SupplierComparisonCard
                              key={offer.supplier_product_id}
                              offer={offer}
                              isSelected={selectedOfferId === offer.supplier_product_id}
                              onSelect={handleSelectOffer}
                              showSelectButton={!!onSelect}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

