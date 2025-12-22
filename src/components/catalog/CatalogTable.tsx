'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Package, Building2, Tag, ShoppingBag, Settings2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ColumnManagementDialog, type ColumnDef } from './ColumnManagementDialog';
import ProductProfileDialog from '@/components/products/ProductProfileDialog';

function formatCost(value: number | undefined | null): string {
  const n = Number(value ?? 0);
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces}.${decPart}`;
}

// Default column configuration
const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'supplier', label: 'Supplier', visible: true, order: 1, align: 'left', sortable: true },
  {
    key: 'supplier_code',
    label: 'Supplier Code',
    visible: false,
    order: 2,
    align: 'left',
    sortable: false,
  },
  { key: 'sku', label: 'SKU', visible: true, order: 3, align: 'left', sortable: true },
  { key: 'name', label: 'Product Name', visible: true, order: 4, align: 'left', sortable: true },
  {
    key: 'description',
    label: 'Product Description',
    visible: true,
    order: 5,
    align: 'left',
    sortable: false,
  },
  { key: 'brand', label: 'Brand', visible: true, order: 6, align: 'left', sortable: false },
  {
    key: 'series_range',
    label: 'Series (Range)',
    visible: true,
    order: 7,
    align: 'left',
    sortable: false,
  },
  { key: 'uom', label: 'UOM', visible: false, order: 8, align: 'left', sortable: false },
  {
    key: 'pack_size',
    label: 'Pack Size',
    visible: false,
    order: 9,
    align: 'left',
    sortable: false,
  },
  { key: 'barcode', label: 'Barcode', visible: false, order: 10, align: 'left', sortable: false },
  { key: 'category', label: 'Category', visible: true, order: 11, align: 'left', sortable: true },
  { key: 'tags', label: 'Tags', visible: true, order: 12, align: 'left', sortable: false },
  { key: 'soh', label: 'Sup SOH', visible: true, order: 13, align: 'right', sortable: false },
  {
    key: 'on_order',
    label: 'Stock on Order',
    visible: true,
    order: 14,
    align: 'right',
    sortable: false,
  },
  {
    key: 'cost_ex_vat',
    label: 'Cost ExVAT',
    visible: true,
    order: 15,
    align: 'right',
    sortable: false,
  },
  { key: 'vat', label: 'VAT (15%)', visible: true, order: 16, align: 'right', sortable: false },
  {
    key: 'cost_diff',
    label: 'Cost Diff',
    visible: true,
    order: 17,
    align: 'right',
    sortable: false,
  },
  {
    key: 'previous_cost',
    label: 'Previous Cost',
    visible: true,
    order: 18,
    align: 'right',
    sortable: false,
  },
  {
    key: 'base_discount',
    label: 'Base Discount',
    visible: true,
    order: 19,
    align: 'right',
    sortable: false,
  },
  {
    key: 'cost_after_discount',
    label: 'Cost After Discount',
    visible: true,
    order: 20,
    align: 'right',
    sortable: false,
  },
  { key: 'rsp', label: 'RSP', visible: true, order: 21, align: 'right', sortable: false },
  {
    key: 'cost_inc_vat',
    label: 'Cost IncVAT',
    visible: true,
    order: 22,
    align: 'right',
    sortable: false,
  },
  {
    key: 'currency',
    label: 'Currency',
    visible: false,
    order: 23,
    align: 'right',
    sortable: false,
  },
  {
    key: 'first_seen',
    label: 'First Seen',
    visible: false,
    order: 24,
    align: 'left',
    sortable: true,
  },
  {
    key: 'last_seen',
    label: 'Last Seen',
    visible: false,
    order: 25,
    align: 'left',
    sortable: true,
  },
  { key: 'active', label: 'Active', visible: false, order: 26, align: 'left', sortable: false },
];

// Load columns from localStorage or return defaults
function loadColumnsFromStorage(): ColumnDef[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;

  try {
    const stored = localStorage.getItem('catalog_table_columns');
    if (!stored) return DEFAULT_COLUMNS;

    const parsed = JSON.parse(stored) as ColumnDef[];
    // Merge with defaults to ensure all columns exist
    const defaultMap = new Map(DEFAULT_COLUMNS.map(col => [col.key, col]));
    const storedMap = new Map(parsed.map(col => [col.key, col]));

    // Merge, keeping stored values but ensuring all defaults exist
    const merged = DEFAULT_COLUMNS.map(defaultCol => {
      const storedCol = storedMap.get(defaultCol.key);
      return storedCol
        ? { ...defaultCol, ...storedCol, order: storedCol.order ?? defaultCol.order }
        : defaultCol;
    });

    // Sort by order
    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_COLUMNS;
  }
}

// Save columns to localStorage
function saveColumnsToStorage(columns: ColumnDef[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('catalog_table_columns', JSON.stringify(columns));
  } catch (error) {
    console.error('Failed to save columns to localStorage:', error);
  }
}

type CatalogRow = {
  supplier_product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  supplier_sku: string;
  product_name: string;
  description?: string;
  uom?: string;
  pack_size?: string;
  barcode?: string;
  category_id?: string;
  category_name?: string;
  is_active: boolean;
  first_seen_at?: string;
  last_seen_at?: string;
  current_price?: number;
  cost_ex_vat?: number;
  cost_inc_vat?: number;
  base_discount?: number;
  cost_after_discount?: number;
  rsp?: number;
  qty_on_hand?: number;
  sup_soh?: number;
  currency?: string;
  series_range?: string;
  previous_cost?: number;
  cost_diff?: number;
  attrs_json?: {
    description?: string;
    cost_including?: number;
    cost_excluding?: number;
    rsp?: number;
    base_discount?: number;
    brand?: string;
    [key: string]: unknown;
  };
};

interface CatalogTableProps {
  initialParams?: URLSearchParams;
  isPopOut?: boolean;
}

export function CatalogTable(props: CatalogTableProps = {}) {
  const { initialParams, isPopOut = false } = props;
  // Initialize state from URL params if provided (for pop-out window)
  const getInitialValue = useCallback((key: string, defaultValue: string) => {
    if (initialParams?.has(key)) {
      return initialParams.get(key) || defaultValue;
    }
    return defaultValue;
  }, [initialParams]);

  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(() => getInitialValue('search', ''));
  const [page, setPage] = useState(() => parseInt(getInitialValue('page', '1'), 10));
  const [limit, setLimit] = useState(() => parseInt(getInitialValue('limit', '50'), 10));
  const [total, setTotal] = useState(0);
  const [suppliers, setSuppliers] = useState<{ supplier_id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<
    Array<{ category_id?: string; id?: string; name: string }>
  >([]);
  const [brands, setBrands] = useState<Array<{ brand: string; name: string }>>([]);
  const [supplierId, setSupplierId] = useState<string>(() => {
    const val = getInitialValue('supplier_id', 'all');
    return val || 'all';
  });
  const [categoryId, setCategoryId] = useState<string>(() => {
    const raw = getInitialValue('category_raw', '');
    if (raw) return `raw:${raw}`;
    return getInitialValue('category_id', 'all');
  });
  const [brandFilter, setBrandFilter] = useState<string>(() => {
    const val = getInitialValue('brand', 'all');
    return val || 'all';
  });
  const [isActive, setIsActive] = useState<'all' | 'active' | 'inactive'>(() => {
    const val = getInitialValue('is_active', 'all');
    if (val === 'true') return 'active';
    if (val === 'false') return 'inactive';
    return 'all';
  });
  const [priceMin, setPriceMin] = useState<string>(() => getInitialValue('price_min', ''));
  const [priceMax, setPriceMax] = useState<string>(() => getInitialValue('price_max', ''));
  const [sortBy, setSortBy] = useState<string>(() => getInitialValue('sort_by', 'supplier_name'));
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    const val = getInitialValue('sort_dir', 'asc');
    return val === 'desc' ? 'desc' : 'asc';
  });
  const [columns, setColumns] = useState<ColumnDef[]>(() => loadColumnsFromStorage());
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [metrics, setMetrics] = useState({
    totalSupplierProducts: 0,
    totalProductsAllSuppliers: 0,
    suppliers: 0,
    brands: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Function to open pop-out window with current filter state
  const handlePopOut = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (supplierId && supplierId !== 'all') params.set('supplier_id', supplierId);
    if (categoryId && categoryId !== 'all') {
      if (categoryId.startsWith('raw:')) {
        params.set('category_raw', categoryId.slice(4));
      } else {
        params.set('category_id', categoryId);
      }
    }
    if (brandFilter && brandFilter !== 'all') params.set('brand', brandFilter);
    if (isActive !== 'all') params.set('is_active', String(isActive === 'active'));
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    params.set('page', String(page));
    params.set('limit', String(limit));
    
    const url = `/nxt-spp/catalog/popout?${params.toString()}`;
    const width = Math.min(1920, window.screen.width - 100);
    const height = Math.min(1080, window.screen.height - 100);
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      url,
      'catalog-popout',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no`
    );
  }, [search, supplierId, categoryId, brandFilter, isActive, priceMin, priceMax, sortBy, sortDir, page, limit]);

  // Save columns to localStorage whenever they change
  useEffect(() => {
    saveColumnsToStorage(columns);
  }, [columns]);

  // Helper to get visible columns in order
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible).sort((a, b) => a.order - b.order);
  }, [columns]);

  // Helper to check if column is visible
  const isColumnVisible = (key: string) => {
    return columns.find(col => col.key === key)?.visible ?? false;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (supplierId && supplierId !== 'all') params.append('supplier_id', supplierId);
      if (categoryId && categoryId !== 'all') {
        if (categoryId.startsWith('raw:')) {
          params.append('category_raw', categoryId.slice(4));
        } else {
          params.append('category_id', categoryId);
        }
      }
      if (brandFilter && brandFilter !== 'all') params.append('brand', brandFilter);
      if (isActive !== 'all') params.set('is_active', String(isActive === 'active'));
      if (priceMin) params.set('price_min', priceMin);
      if (priceMax) params.set('price_max', priceMax);
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const res = await fetch(`/api/catalog/products?${params}`);
      if (!res.ok) throw new Error('Failed to load catalog');
      const data = await res.json();
      setRows(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Catalog load error:', err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, supplierId, categoryId, brandFilter, isActive, priceMin, priceMax, sortBy, sortDir, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const params = new URLSearchParams();
      if (supplierId && supplierId !== 'all') {
        params.set('supplier_id', supplierId);
      }
      const res = await fetch(`/api/catalog/metrics?${params}`);
      if (!res.ok) throw new Error('Failed to load metrics');
      const data = await res.json();
      setMetrics(
        data.data || {
          totalSupplierProducts: 0,
          totalProductsAllSuppliers: 0,
          suppliers: 0,
          brands: 0,
        }
      );
    } catch (err) {
      console.error('Metrics load error:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Load filter data
  useEffect(() => {
    (async () => {
      try {
        const [sres, cres, bres] = await Promise.all([
          fetch('/api/catalog/suppliers'),
          fetch('/api/catalog/categories'),
          fetch('/api/catalog/brands'),
        ]);
        const sjson = await sres.json();
        const cjson = await cres.json();
        const bjson = await bres.json();
        setSuppliers(sjson.data || []);
        setCategories(cjson.data || []);
        setBrands(bjson.data || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // Helper to get sort key for a column
  const getSortKey = (columnKey: string): string => {
    const sortMap: Record<string, string> = {
      supplier: 'supplier_name',
      sku: 'supplier_sku',
      name: 'product_name',
      category: 'category_name',
      first_seen: 'first_seen_at',
      last_seen: 'last_seen_at',
    };
    return sortMap[columnKey] || columnKey;
  };

  // Helper to render table header cell
  const renderHeaderCell = (column: ColumnDef) => {
    const className = cn(
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      column.sortable && 'cursor-pointer hover:bg-muted/50'
    );

    const handleSort = () => {
      if (column.sortable) {
        const sortKey = getSortKey(column.key);
        setSortBy(sortKey);
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      }
    };

    return (
      <TableHead key={column.key} className={className} onClick={handleSort}>
        {column.label}
      </TableHead>
    );
  };

  // Helper to render table body cell
  const renderBodyCell = (column: ColumnDef, row: CatalogRow) => {
    const className = cn(
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      column.key === 'description' && 'max-w-md'
    );

    switch (column.key) {
      case 'supplier':
        return (
          <TableCell key={column.key} className={className}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.supplier_name || 'Unknown Supplier'}</span>
              {!row.is_active && <Badge variant="secondary">inactive</Badge>}
            </div>
          </TableCell>
        );
      case 'supplier_code':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.supplier_code || '-'}
          </TableCell>
        );
      case 'sku':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.supplier_sku}
          </TableCell>
        );
      case 'name':
        return (
          <TableCell key={column.key} className={className}>
            {row.product_name || 'Product Details Unavailable'}
          </TableCell>
        );
      case 'description':
        return (
          <TableCell key={column.key} className={className}>
            <div className="text-muted-foreground truncate text-sm">
              {row.description || row.attrs_json?.description || '-'}
            </div>
          </TableCell>
        );
      case 'brand':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {(row as unknown).brand || row.attrs_json?.brand || '-'}
          </TableCell>
        );
      case 'series_range':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.series_range || '-'}
          </TableCell>
        );
      case 'uom':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.uom || '-'}
          </TableCell>
        );
      case 'pack_size':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.pack_size || '-'}
          </TableCell>
        );
      case 'barcode':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.barcode || '-'}
          </TableCell>
        );
      case 'category':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.category_name ? <Badge variant="outline">{row.category_name}</Badge> : '-'}
          </TableCell>
        );
      case 'tags':
        const normalizeTags = (): Array<{ name: string; tag_id?: string }> => {
          const tags = (row as any).tags;
          if (!tags) return [];
          if (Array.isArray(tags)) {
            if (tags.length === 0) return [];
            if (typeof tags[0] === 'string') {
              return (tags as string[]).map(tag => ({ name: tag, tag_id: tag }));
            }
            return tags as Array<{ name: string; tag_id?: string }>;
          }
          return [];
        };
        const tags = normalizeTags();
        return (
          <TableCell key={column.key} className={className}>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 2).map((tag, idx) => (
                  <Badge
                    key={tag.tag_id || tag.name || idx}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tag.name || tag.tag_id}
                  </Badge>
                ))}
                {tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 2}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </TableCell>
        );
      case 'soh':
        return (
          <TableCell key={column.key} className={className}>
            {row.sup_soh ?? (row as unknown).qty_on_hand ?? 0}
          </TableCell>
        );
      case 'on_order':
        return (
          <TableCell key={column.key} className={className}>
            {(row as unknown).qty_on_order ?? 0}
          </TableCell>
        );
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
        );
      case 'vat':
        return (
          <TableCell key={column.key} className={className}>
            {formatCost(
              (((row as unknown).cost_ex_vat ?? row.current_price ?? 0) as number) * 0.15
            )}
          </TableCell>
        );
      case 'cost_diff':
        return (
          <TableCell key={column.key} className={className}>
            {row.cost_diff !== undefined && row.cost_diff !== null
              ? `${row.cost_diff >= 0 ? '+' : ''}${formatCost(row.cost_diff)}`
              : '-'}
          </TableCell>
        );
      case 'previous_cost':
        return (
          <TableCell key={column.key} className={className}>
            {row.previous_cost !== undefined && row.previous_cost !== null
              ? formatCost(row.previous_cost)
              : '-'}
          </TableCell>
        );
      case 'base_discount':
        const discount = row.base_discount ?? row.attrs_json?.base_discount ?? 0;
        return (
          <TableCell key={column.key} className={className}>
            {discount !== undefined && discount !== null && discount > 0
              ? `${typeof discount === 'number' ? discount.toFixed(2) : parseFloat(String(discount)).toFixed(2)}%`
              : '0.00%'}
          </TableCell>
        );
      case 'cost_after_discount':
        const costAfterDiscount = row.cost_after_discount;
        const costExVat = row.cost_ex_vat ?? row.attrs_json?.cost_excluding ?? row.current_price;
        const rowDiscount = row.base_discount ?? row.attrs_json?.base_discount ?? 0;
        
        // Calculate if not provided
        let calculatedCost = costAfterDiscount;
        if (calculatedCost === undefined && costExVat !== undefined && costExVat !== null && rowDiscount > 0) {
          const cost = typeof costExVat === 'number' ? costExVat : parseFloat(String(costExVat)) || 0;
          calculatedCost = cost - (cost * rowDiscount / 100);
        } else if (calculatedCost === undefined) {
          calculatedCost = typeof costExVat === 'number' ? costExVat : parseFloat(String(costExVat)) || null;
        }

        return (
          <TableCell key={column.key} className={className}>
            {calculatedCost !== undefined && calculatedCost !== null
              ? formatCost(calculatedCost)
              : '-'}
          </TableCell>
        );
      case 'rsp':
        return (
          <TableCell key={column.key} className={className}>
            {row.rsp !== undefined
              ? formatCost(row.rsp)
              : row.attrs_json?.rsp !== undefined
                ? formatCost(Number(row.attrs_json.rsp))
                : '-'}
          </TableCell>
        );
      case 'cost_inc_vat':
        return (
          <TableCell key={column.key} className={className}>
            {row.cost_inc_vat !== undefined
              ? formatCost(row.cost_inc_vat)
              : row.attrs_json?.cost_including !== undefined
                ? formatCost(Number(row.attrs_json.cost_including))
                : '-'}
          </TableCell>
        );
      case 'currency':
        return (
          <TableCell key={column.key} className={className}>
            {row.currency || 'ZAR'}
          </TableCell>
        );
      case 'first_seen':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.first_seen_at ? new Date(row.first_seen_at).toLocaleDateString() : '-'}
          </TableCell>
        );
      case 'last_seen':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.last_seen_at ? new Date(row.last_seen_at).toLocaleDateString() : '-'}
          </TableCell>
        );
      case 'active':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')}>
            {row.is_active ? 'Yes' : 'No'}
          </TableCell>
        );
      default:
        return (
          <TableCell key={column.key} className={className}>
            -
          </TableCell>
        );
    }
  };

  return (
    <Card className={isPopOut ? 'h-full' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Supplier Inventory Portfolio
          {isPopOut && (
            <Badge variant="outline" className="ml-2">
              Pop-out View
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={isPopOut ? 'h-[calc(100%-5rem)] flex flex-col' : ''}>
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">TOTAL SUPPLIER PRODUCTS</p>
                  <p className="mt-1 text-2xl font-bold">
                    {metricsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      metrics.totalSupplierProducts.toLocaleString()
                    )}
                  </p>
                </div>
                <Package className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">TOTAL PRODUCTS (ALL SUPPLIERS)</p>
                  <p className="mt-1 text-2xl font-bold">
                    {metricsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      metrics.totalProductsAllSuppliers.toLocaleString()
                    )}
                  </p>
                </div>
                <ShoppingBag className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">SUPPLIERS</p>
                  <p className="mt-1 text-2xl font-bold">
                    {metricsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      metrics.suppliers.toLocaleString()
                    )}
                  </p>
                </div>
                <Building2 className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">BRANDS</p>
                  <p className="mt-1 text-2xl font-bold">
                    {metricsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      metrics.brands.toLocaleString()
                    )}
                  </p>
                </div>
                <Tag className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by name or SKU"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {suppliers
                .filter(s => s && s.supplier_id)
                .map(s => (
                  <SelectItem key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories
                .filter(c => !!c)
                .map((c: unknown) => (
                  <SelectItem
                    key={String(c.category_id ?? c.id)}
                    value={String(c.category_id ?? c.id)}
                  >
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands
                .filter(b => b && b.brand)
                .map(b => (
                  <SelectItem key={b.brand} value={b.brand}>
                    {b.name || b.brand}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={isActive} onValueChange={v => setIsActive(v as unknown)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Min price"
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            className="w-24"
          />
          <Input
            placeholder="Max price"
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            className="w-24"
          />
          <Button variant="outline" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <div className="text-muted-foreground ml-auto text-sm">
            {total.toLocaleString()} items
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setColumnDialogOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Manage Columns
            </Button>
            {!isPopOut && (
              <Button variant="outline" size="sm" onClick={handlePopOut}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Pop Out
              </Button>
            )}
          </div>
          <ColumnManagementDialog
            open={columnDialogOpen}
            onOpenChange={setColumnDialogOpen}
            columns={columns}
            onColumnsChange={setColumns}
            defaultColumns={DEFAULT_COLUMNS}
          />
        </div>

        <div className={`overflow-auto rounded-md border ${isPopOut ? 'flex-1' : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>{visibleColumns.map(column => renderHeaderCell(column))}</TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow
                  key={r.supplier_product_id}
                  className="cursor-pointer"
                  onClick={() => {
                    setDetailId(r.supplier_product_id);
                  }}
                >
                  {visibleColumns.map(column => renderBodyCell(column, r))}
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No results
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div>
            Page {page} of {pageCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Select
              value={String(limit)}
              onValueChange={v => {
                setLimit(parseInt(v, 10));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
      {/* Product Profile Dialog */}
      {detailId && (
        <ProductProfileDialog
          productId={detailId}
          open={!!detailId}
          onOpenChange={o => {
            if (!o) {
              setDetailId(null);
            }
          }}
        />
      )}
    </Card>
  );
}

function ProductDetailBody({
  id,
  detail,
  setDetail,
  history,
  setHistory,
}: {
  id: string | null;
  detail: unknown;
  setDetail: (d: unknown) => void;
  history: unknown[];
  setHistory: (h: unknown[]) => void;
}) {
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [dres, hres] = await Promise.all([
          fetch(`/api/catalog/products/${id}`),
          fetch(`/api/catalog/products/${id}/price-history?limit=50`),
        ]);
        const dj = await dres.json();
        const hj = await hres.json();
        setDetail(dj.data || null);
        setHistory(hj.data || []);
      } catch (e) {}
    })();
  }, [id, setDetail, setHistory]);

  if (!id) return null;
  return (
    <div className="space-y-4">
      {detail ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Supplier</span>
            <div className="font-medium">{detail.supplier_name}</div>
          </div>
          <div>
            <span className="text-muted-foreground">SKU</span>
            <div className="font-medium">{detail.supplier_sku}</div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Product Name</span>
            <div className="font-medium">{detail.name_from_supplier}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Category</span>
            <div className="font-medium">{detail.category_name || '-'}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Cost ExVAT</span>
            <div className="font-medium">
              {formatCost(
                (detail as any).cost_ex_vat ??
                  (detail.attrs_json as any)?.cost_excluding ??
                  detail.current_price
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">Loading details…</div>
      )}
      <div>
        <div className="mb-2 text-sm font-medium">Price History</div>
        <div className="max-h-48 overflow-auto rounded-md border">
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
                  <TableCell colSpan={3} className="text-muted-foreground py-4 text-center text-sm">
                    No history
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
