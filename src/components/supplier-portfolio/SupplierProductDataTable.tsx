'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Package,
  Columns,
  RefreshCw,
  Brain,
  Check,
  X,
  Tag,
} from 'lucide-react';
import { cn, formatDate, formatCostAmount } from '@/lib/utils';
import ProductProfileDialog from '@/components/products/ProductProfileDialog';

const ALL_SUPPLIERS_VALUE = '__all-suppliers__';
const ALL_CATEGORIES_VALUE = '__all-categories__';
const ALL_BRANDS_VALUE = '__all-brands__';

// Enhanced Product Type with Complete Selection Data
interface SelectionProduct {
  supplier_product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  supplier_sku: string;
  name_from_supplier: string;
  brand?: string;
  attrs_json?: {
    description?: string;
    cost_including?: number;
    cost_excluding?: number;
    rsp?: number;
    base_discount?: number;
    [key: string]: unknown;
  };
  base_discount?: number;
  cost_after_discount?: number;
  category_id?: string;
  category_name?: string;
  tags?: Array<{ tag_id: string; name: string; type?: string }> | string[];
  current_price: number;
  currency: string;
  barcode?: string;
  uom?: string;
  pack_size?: string;
  qty_on_hand?: number;
  sup_soh?: number;
  is_in_stock: boolean;
  selected_at: string;
  first_seen_at?: string;
  last_seen_at?: string;
  price_change_percent?: number;
  price_change_direction?: 'up' | 'down' | 'none';
  is_new?: boolean;
  is_mapped?: boolean;
  is_active?: boolean;
  is_selected?: boolean;
}

interface SupplierProductTableProps {
  supplier_id?: string;
  selection_id?: string;
  enable_selection?: boolean;
  on_selection_change?: (selected: string[]) => void;
}

// Column visibility configuration
type ColumnId =
  | 'select'
  | 'sku'
  | 'name'
  | 'description'
  | 'supplier'
  | 'brand'
  | 'category'
  | 'cost_ex_vat'
  | 'base_discount'
  | 'cost_after_discount'
  | 'rsp'
  | 'price_change'
  | 'status'
  | 'stock'
  | 'first_seen'
  | 'cost_inc_vat'
  | 'actions';

interface ColumnConfig {
  id: ColumnId;
  label: string;
  visible: boolean;
  sortable: boolean;
  width?: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, sortable: false, width: 'w-12' },
  { id: 'sku', label: 'SKU', visible: true, sortable: true, width: 'w-32' },
  { id: 'name', label: 'Product Name', visible: true, sortable: true },
  {
    id: 'description',
    label: 'Product Description',
    visible: true,
    sortable: false,
    width: 'w-64',
  },
  { id: 'supplier', label: 'Supplier', visible: true, sortable: true, width: 'w-40' },
  { id: 'brand', label: 'Brand', visible: true, sortable: true, width: 'w-32' },
  { id: 'category', label: 'Category', visible: true, sortable: true, width: 'w-32' },
  { id: 'tags', label: 'Tags', visible: true, sortable: false, width: 'w-48' },
  { id: 'cost_ex_vat', label: 'Cost ExVAT', visible: true, sortable: true, width: 'w-32' },
  { id: 'base_discount', label: 'Base Discount', visible: true, sortable: true, width: 'w-32' },
  { id: 'cost_after_discount', label: 'Cost After Discount', visible: true, sortable: true, width: 'w-40' },
  { id: 'rsp', label: 'RSP', visible: true, sortable: true, width: 'w-32' },
  { id: 'price_change', label: 'Price Change', visible: false, sortable: true, width: 'w-32' },
  { id: 'status', label: 'Status', visible: true, sortable: false, width: 'w-40' },
  { id: 'stock', label: 'Sup SOH', visible: false, sortable: true, width: 'w-24' },
  { id: 'first_seen', label: 'First Seen', visible: false, sortable: true, width: 'w-32' },
  { id: 'cost_inc_vat', label: 'Cost IncVAT', visible: true, sortable: true, width: 'w-32' },
  { id: 'actions', label: '', visible: true, sortable: false, width: 'w-16' },
];

const SupplierProductDataTable: React.FC<SupplierProductTableProps> = ({
  supplier_id,
  selection_id,
  enable_selection = false,
  on_selection_change,
}) => {
  // State management
  const [products, setProducts] = useState<SelectionProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<SelectionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');

  // UI state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [detailsProduct, setDetailsProduct] = useState<SelectionProduct | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // AI categorization state
  const [aiSuggestions, setAiSuggestions] = useState<
    Map<
      string,
      {
        category_id: string;
        category_name: string;
        confidence: number;
        reasoning?: string;
      }
    >
  >(new Map());
  const [loadingSuggestions, setLoadingSuggestions] = useState<Set<string>>(new Set());

  // Fetch products for the selection
  const fetchProducts = useCallback(async () => {
    if (!selection_id) {
      setError('No selection ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Direct enriched endpoint for the specific selection
      const response = await fetch(`/api/core/selections/${selection_id}/products`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        throw new Error(`Failed to fetch selection products: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load selection products');
      }

      const rows = data.data || [];
      const mapped = rows.map((p: any) => ({
        supplier_product_id: p.supplier_product_id,
        supplier_id: p.supplier_id,
        supplier_name: p.supplier_name || 'Unknown Supplier',
        supplier_code: p.supplier_code,
        supplier_sku: p.supplier_sku,
        name_from_supplier: p.name_from_supplier || p.product_name || 'Product Details Unavailable',
        brand: p.brand,
        category_id: p.category_id,
        category_name: p.category_name,
        tags: p.tags || [],
        current_price: p.current_price || 0,
        currency: p.currency || 'ZAR',
        barcode: p.barcode,
        uom: p.uom,
        pack_size: p.pack_size,
        qty_on_hand: p.qty_on_hand,
        sup_soh: p.sup_soh ?? p.qty_on_hand ?? null,
        is_in_stock: !!p.is_in_stock,
        selected_at: p.selected_at,
        is_selected: true,
        attrs_json: p.attrs_json || {},
        base_discount: p.base_discount,
        cost_after_discount: p.cost_after_discount,
      }));

      setProducts(mapped);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      console.error('Error fetching selection products:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selection_id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // AI categorization handlers
  const handleGetSuggestion = async (supplierProductId: string) => {
    setLoadingSuggestions(prev => new Set(prev).add(supplierProductId));
    try {
      const res = await fetch('/api/category/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: [supplierProductId] }),
      });
      const result = await res.json();

      if (result.success && result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        if (suggestion.suggestion) {
          setAiSuggestions(prev => {
            const next = new Map(prev);
            next.set(supplierProductId, suggestion.suggestion);
            return next;
          });
        }
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    } finally {
      setLoadingSuggestions(prev => {
        const next = new Set(prev);
        next.delete(supplierProductId);
        return next;
      });
    }
  };

  const handleAcceptSuggestion = async (supplierProductId: string, categoryId: string) => {
    try {
      const res = await fetch('/api/category/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierProductId,
          categoryId,
          method: 'ai_manual_accept',
        }),
      });
      const result = await res.json();

      if (result.success) {
        setAiSuggestions(prev => {
          const next = new Map(prev);
          next.delete(supplierProductId);
          return next;
        });
        // Refresh products to show updated category
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to assign category:', error);
    }
  };

  // Bulk AI categorization for selected products
  const handleBulkCategorize = async () => {
    if (selectedRows.size === 0) return;

    const uncategorizedSelected = filteredProducts.filter(
      p => selectedRows.has(p.supplier_product_id) && !p.category_id
    );

    if (uncategorizedSelected.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const productIds = uncategorizedSelected.map(p => p.supplier_product_id);
      const res = await fetch('/api/category/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: productIds,
          batch_size: 50, // Use batch processing with dynamic sizing
          batch_delay: 2000, // 2 second delay between batches
        }),
      });
      const result = await res.json();

      if (result.success) {
        const suggestionsMap = new Map<string, unknown>();
        result.suggestions.forEach((s: unknown) => {
          if (s.suggestion) {
            suggestionsMap.set(s.supplier_product_id, s.suggestion);
          }
        });
        setAiSuggestions(prev => {
          const merged = new Map(prev);
          suggestionsMap.forEach((v, k) => merged.set(k, v));
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to get bulk suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name_from_supplier.toLowerCase().includes(search) ||
          p.supplier_sku.toLowerCase().includes(search) ||
          p.supplier_name.toLowerCase().includes(search) ||
          (p.barcode && p.barcode.toLowerCase().includes(search))
      );
    }

    // Supplier filter
    if (filterSupplier) {
      filtered = filtered.filter(p => p.supplier_id === filterSupplier);
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(p => p.category_id === filterCategory);
    }

    // Brand filter
    if (filterBrand) {
      filtered = filtered.filter(p => p.brand === filterBrand);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal: unknown = a[sortColumn as keyof SelectionProduct];
      const bVal: unknown = b[sortColumn as keyof SelectionProduct];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, filterSupplier, filterCategory, filterBrand, sortColumn, sortDirection]);

  // Get unique suppliers, categories, and brands for filters
  const suppliers = useMemo(() => {
    const unique = new Map();
    products.forEach(p => {
      if (p.supplier_id && !unique.has(p.supplier_id)) {
        unique.set(p.supplier_id, { id: p.supplier_id, name: p.supplier_name });
      }
    });
    return Array.from(unique.values());
  }, [products]);

  const categories = useMemo(() => {
    const unique = new Map();
    products.forEach(p => {
      if (p.category_id && !unique.has(p.category_id)) {
        unique.set(p.category_id, { id: p.category_id, name: p.category_name });
      }
    });
    return Array.from(unique.values());
  }, [products]);

  const brandsList = useMemo(() => {
    const unique = new Set<string>();
    products.forEach(p => {
      if (p.brand) {
        unique.add(p.brand);
      }
    });
    return Array.from(unique).sort();
  }, [products]);

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRows(new Set(filteredProducts.map(p => p.supplier_product_id)));
      } else {
        setSelectedRows(new Set());
      }
    },
    [filteredProducts]
  );

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (on_selection_change) {
      on_selection_change(Array.from(selectedRows));
    }
  }, [selectedRows, on_selection_change]);

  // Column visibility
  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);

  const toggleColumn = useCallback((columnId: ColumnId) => {
    setColumns(prev =>
      prev.map(col => (col.id === columnId ? { ...col, visible: !col.visible } : col))
    );
  }, []);

  // Sorting
  const handleSort = useCallback(
    (columnId: string) => {
      if (sortColumn === columnId) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(columnId);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  // Render loading skeleton
  if (loading && products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Error Loading Products</div>
              <div className="mt-1 text-sm">{error}</div>
              <Button variant="outline" size="sm" onClick={fetchProducts} className="mt-3">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative max-w-md flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search products"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Supplier Filter */}
              {suppliers.length > 0 && (
                <Select
                  value={filterSupplier || ALL_SUPPLIERS_VALUE}
                  onValueChange={value =>
                    setFilterSupplier(value === ALL_SUPPLIERS_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SUPPLIERS_VALUE}>All Suppliers</SelectItem>
                    {suppliers.map((s: unknown) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Category Filter */}
              {categories.length > 0 && (
                <Select
                  value={filterCategory || ALL_CATEGORIES_VALUE}
                  onValueChange={value =>
                    setFilterCategory(value === ALL_CATEGORIES_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                    {categories.map((c: unknown) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Brand Filter */}
              {brandsList.length > 0 && (
                <Select
                  value={filterBrand || ALL_BRANDS_VALUE}
                  onValueChange={value =>
                    setFilterBrand(value === ALL_BRANDS_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_BRANDS_VALUE}>All Brands</SelectItem>
                    {brandsList.map((brand: string) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns.map(
                    col =>
                      col.id !== 'select' &&
                      col.id !== 'actions' && (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          checked={col.visible}
                          onCheckedChange={() => toggleColumn(col.id)}
                        >
                          {col.label}
                        </DropdownMenuCheckboxItem>
                      )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Bulk AI Categorize */}
              {selectedRows.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkCategorize}
                  disabled={loading}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  AI Categorize ({selectedRows.size})
                </Button>
              )}

              {/* Refresh */}
              <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <div className="relative">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                  {visibleColumns.map(col => {
                    if (col.id === 'select') {
                      return (
                        <TableHead key={col.id} className={col.width}>
                          <Checkbox
                            checked={
                              filteredProducts.length > 0 &&
                              selectedRows.size === filteredProducts.length
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                      );
                    }

                    if (col.id === 'actions') {
                      return <TableHead key={col.id} className={col.width} />;
                    }

                    return (
                      <TableHead key={col.id} className={col.width}>
                        {col.sortable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8"
                            onClick={() => handleSort(col.id)}
                          >
                            {col.label}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          col.label
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow
                    key={product.supplier_product_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setDetailsProduct(product)}
                  >
                    {visibleColumns.map(col => {
                      if (col.id === 'select') {
                        return (
                          <TableCell key={col.id} onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(product.supplier_product_id)}
                              onCheckedChange={checked =>
                                handleSelectRow(product.supplier_product_id, checked as boolean)
                              }
                              aria-label={`Select ${product.name_from_supplier}`}
                            />
                          </TableCell>
                        );
                      }

                      if (col.id === 'sku') {
                        return (
                          <TableCell key={col.id} className="font-mono text-sm">
                            {product.supplier_sku}
                          </TableCell>
                        );
                      }

                      if (col.id === 'name') {
                        return (
                          <TableCell key={col.id}>
                            <div className="max-w-xs">
                              <div className="truncate font-medium">
                                {product.name_from_supplier}
                              </div>
                              {product.barcode && (
                                <div className="text-muted-foreground text-xs">
                                  {product.barcode}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        );
                      }

                      if (col.id === 'description') {
                        const description = product.attrs_json?.description;
                        return (
                          <TableCell key={col.id}>
                            {description ? (
                              <div className="text-muted-foreground max-w-md text-sm">
                                {String(description).length > 100
                                  ? `${String(description).substring(0, 100)}...`
                                  : String(description)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'supplier') {
                        return (
                          <TableCell key={col.id}>
                            <div className="text-sm">{product.supplier_name || 'Unknown'}</div>
                          </TableCell>
                        );
                      }

                      if (col.id === 'brand') {
                        return <TableCell key={col.id}>{product.brand || '-'}</TableCell>;
                      }

                      if (col.id === 'category') {
                        const suggestion = aiSuggestions.get(product.supplier_product_id);
                        return (
                          <TableCell key={col.id}>
                            {product.category_name ? (
                              <Badge variant="outline">{product.category_name}</Badge>
                            ) : suggestion ? (
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-blue-300 bg-blue-50 text-blue-700"
                                >
                                  <Brain className="mr-1 h-3 w-3" />
                                  {suggestion.category_name}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(suggestion.confidence * 100)}%
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={async e => {
                                    e.stopPropagation();
                                    await handleAcceptSuggestion(
                                      product.supplier_product_id,
                                      suggestion.category_id
                                    );
                                  }}
                                  title="Accept suggestion"
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setAiSuggestions(prev => {
                                      const next = new Map(prev);
                                      next.delete(product.supplier_product_id);
                                      return next;
                                    });
                                  }}
                                  title="Dismiss suggestion"
                                >
                                  <X className="h-3 w-3 text-gray-400" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  -
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={async e => {
                                    e.stopPropagation();
                                    await handleGetSuggestion(product.supplier_product_id);
                                  }}
                                  disabled={loadingSuggestions.has(product.supplier_product_id)}
                                  title="Get AI suggestion"
                                >
                                  {loadingSuggestions.has(product.supplier_product_id) ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Brain className="mr-1 h-3 w-3" />
                                      AI
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'tags') {
                        const normalizeTags = (): Array<{ name: string; tag_id?: string }> => {
                          if (!product.tags) return [];
                          if (Array.isArray(product.tags)) {
                            if (product.tags.length === 0) return [];
                            if (typeof product.tags[0] === 'string') {
                              return (product.tags as string[]).map(tag => ({
                                name: tag,
                                tag_id: tag,
                              }));
                            }
                            return product.tags as Array<{ name: string; tag_id?: string }>;
                          }
                          return [];
                        };
                        const tags = normalizeTags();
                        return (
                          <TableCell key={col.id} onClick={e => e.stopPropagation()}>
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tags.slice(0, 3).map((tag, idx) => (
                                  <Badge
                                    key={tag.tag_id || tag.name || idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Tag className="mr-1 h-2.5 w-2.5" />
                                    {tag.name || tag.tag_id}
                                  </Badge>
                                ))}
                                {tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'cost_ex_vat') {
                        const costExVat =
                          product.attrs_json?.cost_excluding ?? product.current_price;
                        return (
                          <TableCell key={col.id}>
                            {costExVat !== undefined && costExVat !== null ? (
                              <div className="font-medium">
                                {formatCostAmount(
                                  typeof costExVat === 'number'
                                    ? costExVat
                                    : parseFloat(String(costExVat)) || 0
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'base_discount') {
                        const discount = product.base_discount ?? product.attrs_json?.base_discount ?? 0;
                        return (
                          <TableCell key={col.id}>
                            {discount !== undefined && discount !== null && discount > 0 ? (
                              <div className="font-medium">
                                {typeof discount === 'number'
                                  ? `${discount.toFixed(2)}%`
                                  : `${parseFloat(String(discount)).toFixed(2)}%`}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">0.00%</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'cost_after_discount') {
                        const costAfterDiscount = product.cost_after_discount;
                        const costExVat = product.attrs_json?.cost_excluding ?? product.current_price;
                        const discount = product.base_discount ?? product.attrs_json?.base_discount ?? 0;
                        
                        // Calculate if not provided
                        let calculatedCost = costAfterDiscount;
                        if (calculatedCost === undefined && costExVat !== undefined && costExVat !== null && discount > 0) {
                          const cost = typeof costExVat === 'number' ? costExVat : parseFloat(String(costExVat)) || 0;
                          calculatedCost = cost - (cost * discount / 100);
                        } else if (calculatedCost === undefined) {
                          calculatedCost = typeof costExVat === 'number' ? costExVat : parseFloat(String(costExVat)) || null;
                        }

                        return (
                          <TableCell key={col.id}>
                            {calculatedCost !== undefined && calculatedCost !== null ? (
                              <div className="font-medium">
                                {formatCostAmount(
                                  typeof calculatedCost === 'number'
                                    ? calculatedCost
                                    : parseFloat(String(calculatedCost)) || 0
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'rsp') {
                        const rsp = product.attrs_json?.rsp;
                        return (
                          <TableCell key={col.id}>
                            {rsp !== undefined && rsp !== null ? (
                              <div className="font-medium">
                                {formatCostAmount(
                                  typeof rsp === 'number' ? rsp : parseFloat(String(rsp)) || 0
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'price_change') {
                        return (
                          <TableCell key={col.id}>
                            {product.price_change_percent !== null &&
                            product.price_change_percent !== 0 ? (
                              <div className="flex items-center gap-1">
                                {product.price_change_direction === 'up' ? (
                                  <TrendingUp className="h-4 w-4 text-red-500" />
                                ) : product.price_change_direction === 'down' ? (
                                  <TrendingDown className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Minus className="h-4 w-4 text-gray-400" />
                                )}
                                <span
                                  className={cn(
                                    'text-sm font-medium',
                                    product.price_change_direction === 'up' && 'text-red-600',
                                    product.price_change_direction === 'down' && 'text-green-600'
                                  )}
                                >
                                  {product.price_change_percent > 0 ? '+' : ''}
                                  {product.price_change_percent.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'status') {
                        return (
                          <TableCell key={col.id}>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="default" className="bg-green-100 text-green-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Selected
                              </Badge>
                              {product.is_in_stock && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  In Stock
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        );
                      }

                      if (col.id === 'stock') {
                        return (
                          <TableCell key={col.id}>
                            {product.sup_soh !== undefined && product.sup_soh !== null ? (
                              <div className="text-sm">{product.sup_soh}</div>
                            ) : product.qty_on_hand !== undefined &&
                              product.qty_on_hand !== null ? (
                              <div className="text-sm">{product.qty_on_hand}</div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'first_seen') {
                        return (
                          <TableCell key={col.id} className="text-muted-foreground text-sm">
                            {product.first_seen_at ? formatDate(product.first_seen_at) : '-'}
                          </TableCell>
                        );
                      }

                      if (col.id === 'cost_inc_vat') {
                        const costIncVat = product.attrs_json?.cost_including;
                        return (
                          <TableCell key={col.id}>
                            {costIncVat !== undefined && costIncVat !== null ? (
                              <div className="font-medium">
                                {formatCostAmount(
                                  typeof costIncVat === 'number'
                                    ? costIncVat
                                    : parseFloat(String(costIncVat)) || 0
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      }

                      if (col.id === 'actions') {
                        return (
                          <TableCell key={col.id} onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDetailsProduct(product)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {!product.category_id && (
                                  <DropdownMenuItem
                                    onClick={async e => {
                                      e.stopPropagation();
                                      await handleGetSuggestion(product.supplier_product_id);
                                    }}
                                    disabled={loadingSuggestions.has(product.supplier_product_id)}
                                  >
                                    <Brain className="mr-2 h-4 w-4" />
                                    Get AI Category Suggestion
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        );
                      }

                      return null;
                    })}
                  </TableRow>
                ))}

                {filteredProducts.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="text-muted-foreground h-12 w-12" />
                        <div className="text-lg font-medium">No products found</div>
                        <div className="text-muted-foreground text-sm">
                          {searchTerm || filterSupplier || filterCategory
                            ? 'Try adjusting your filters'
                            : 'Add products to this selection to see them here'}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {loading && (
            <div className="bg-background/50 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <RefreshCw className="text-primary mx-auto h-8 w-8 animate-spin" />
                <div className="text-muted-foreground mt-2 text-sm">Loading products...</div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Info */}
        {filteredProducts.length > 0 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Showing {filteredProducts.length} of {products.length} products
                {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Product Profile Dialog */}
      {detailsProduct && (
        <ProductProfileDialog
          productId={detailsProduct.supplier_product_id}
          open={!!detailsProduct}
          onOpenChange={open => !open && setDetailsProduct(null)}
        />
      )}
    </div>
  );
};

export default SupplierProductDataTable;
