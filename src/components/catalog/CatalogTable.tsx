'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { RefreshCw, Package, Building2, Tag, ShoppingBag, Settings2, ExternalLink, BarChart3, Rows3, Rows2, AlignJustify } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSupplierSelect } from '@/components/shared/SearchableSupplierSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ColumnManagementDialog, type ColumnDef, type TableDensity } from './ColumnManagementDialog';
import ProductProfileDialog from '@/components/products/ProductProfileDialog';
import { SKUComparisonPanel } from '@/components/products/SKUComparisonPanel';

function formatCost(value: number | undefined | null | string): string {
  // Handle null, undefined, empty string, or invalid values
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  const n = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle NaN or Infinity
  if (!Number.isFinite(n)) {
    return '-';
  }
  
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces}.${decPart}`;
}

// Default column configuration with widths, sticky positioning, and groups
const DEFAULT_COLUMNS: ColumnDef[] = [
  // Identity columns - STICKY LEFT
  { key: 'supplier', label: 'Supplier', visible: true, order: 1, align: 'left', sortable: true, width: 160, minWidth: 100, maxWidth: 200, sticky: 'left', group: 'identity' },
  { key: 'supplier_code', label: 'Supplier Code', visible: false, order: 2, align: 'left', sortable: false, width: 100, minWidth: 80, group: 'identity' },
  { key: 'sku', label: 'SKU', visible: true, order: 3, align: 'left', sortable: true, width: 120, minWidth: 80, maxWidth: 150, sticky: 'left', group: 'identity' },
  { key: 'name', label: 'Product Name', visible: true, order: 4, align: 'left', sortable: true, width: 220, minWidth: 150, maxWidth: 300, sticky: 'left', group: 'identity' },
  { key: 'description', label: 'Product Description', visible: false, order: 5, align: 'left', sortable: false, width: 200, minWidth: 100, group: 'identity' },
  // Classification columns
  { key: 'brand', label: 'Brand', visible: true, order: 6, align: 'left', sortable: false, width: 100, minWidth: 70, group: 'classification' },
  { key: 'series_range', label: 'Series (Range)', visible: true, order: 7, align: 'left', sortable: false, width: 110, minWidth: 80, group: 'classification' },
  { key: 'uom', label: 'UOM', visible: false, order: 8, align: 'left', sortable: false, width: 60, minWidth: 40, group: 'classification' },
  { key: 'pack_size', label: 'Pack Size', visible: false, order: 9, align: 'left', sortable: false, width: 80, minWidth: 60, group: 'classification' },
  { key: 'barcode', label: 'Barcode', visible: false, order: 10, align: 'left', sortable: false, width: 110, minWidth: 80, group: 'classification' },
  { key: 'category', label: 'Category', visible: true, order: 11, align: 'left', sortable: true, width: 110, minWidth: 80, group: 'classification' },
  { key: 'tags', label: 'Tags', visible: true, order: 12, align: 'left', sortable: false, width: 140, minWidth: 100, group: 'classification' },
  // Stock columns
  { key: 'soh', label: 'Sup SOH', visible: true, order: 13, align: 'right', sortable: false, width: 70, minWidth: 50, group: 'stock' },
  { key: 'stock_status', label: 'Stock Status', visible: true, order: 14, align: 'left', sortable: true, width: 100, minWidth: 80, group: 'stock' },
  { key: 'new_stock_eta', label: 'New Stock ETA', visible: true, order: 15, align: 'left', sortable: true, width: 100, minWidth: 80, group: 'stock' },
  { key: 'on_order', label: 'Stock on Order', visible: true, order: 16, align: 'right', sortable: false, width: 90, minWidth: 60, group: 'stock' },
  // Pricing columns
  { key: 'cost_ex_vat', label: 'Cost ExVAT', visible: true, order: 17, align: 'right', sortable: false, width: 90, minWidth: 70, group: 'pricing' },
  { key: 'vat', label: 'VAT (15%)', visible: true, order: 18, align: 'right', sortable: false, width: 80, minWidth: 60, group: 'pricing' },
  { key: 'cost_diff', label: 'Cost Diff', visible: true, order: 19, align: 'right', sortable: false, width: 80, minWidth: 60, group: 'pricing' },
  { key: 'previous_cost', label: 'Previous Cost', visible: true, order: 20, align: 'right', sortable: false, width: 95, minWidth: 70, group: 'pricing' },
  { key: 'base_discount', label: 'Base Discount', visible: true, order: 21, align: 'right', sortable: false, width: 95, minWidth: 70, group: 'pricing' },
  { key: 'cost_after_discount', label: 'Cost After Discount', visible: true, order: 22, align: 'right', sortable: false, width: 115, minWidth: 90, group: 'pricing' },
  { key: 'rsp', label: 'RSP', visible: true, order: 23, align: 'right', sortable: false, width: 80, minWidth: 60, group: 'pricing' },
  { key: 'cost_inc_vat', label: 'Cost IncVAT', visible: true, order: 24, align: 'right', sortable: false, width: 90, minWidth: 70, group: 'pricing' },
  { key: 'currency', label: 'Currency', visible: false, order: 25, align: 'right', sortable: false, width: 70, minWidth: 50, group: 'pricing' },
  // Meta columns
  { key: 'first_seen', label: 'First Seen', visible: false, order: 26, align: 'left', sortable: true, width: 90, minWidth: 70, group: 'meta' },
  { key: 'last_seen', label: 'Last Seen', visible: false, order: 27, align: 'left', sortable: true, width: 90, minWidth: 70, group: 'meta' },
  { key: 'active', label: 'Active', visible: false, order: 28, align: 'left', sortable: false, width: 60, minWidth: 50, group: 'meta' },
  // Actions - STICKY RIGHT
  { key: 'actions', label: 'Actions', visible: true, order: 29, align: 'center', sortable: false, width: 60, minWidth: 50, sticky: 'right' },
];

// Density configuration
const DENSITY_CONFIG = {
  normal: { cellPadding: 'px-3 py-3', fontSize: 'text-sm', rowHeight: 'h-12' },
  compact: { cellPadding: 'px-2 py-1.5', fontSize: 'text-xs', rowHeight: 'h-9' },
  dense: { cellPadding: 'px-1.5 py-1', fontSize: 'text-xs', rowHeight: 'h-7' },
} as const;

// Load density from localStorage
function loadDensityFromStorage(): TableDensity {
  if (typeof window === 'undefined') return 'compact';
  try {
    const stored = localStorage.getItem('catalog_table_density');
    if (stored && ['normal', 'compact', 'dense'].includes(stored)) {
      return stored as TableDensity;
    }
  } catch {}
  return 'compact';
}

// Save density to localStorage
function saveDensityToStorage(density: TableDensity): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('catalog_table_density', density);
  } catch {}
}

// Load column widths from localStorage
function loadColumnWidthsFromStorage(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('catalog_table_column_widths');
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

// Save column widths to localStorage
function saveColumnWidthsToStorage(widths: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('catalog_table_column_widths', JSON.stringify(widths));
  } catch {}
}

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
  stock_status?: string;
  new_stock_eta?: string;
  attrs_json?: {
    description?: string;
    cost_including?: number;
    cost_excluding?: number;
    rsp?: number;
    base_discount?: number;
    brand?: string;
    stock_status?: string;
    new_stock_eta?: string;
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
  
  // Table display settings
  const [density, setDensity] = useState<TableDensity>(() => loadDensityFromStorage());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => loadColumnWidthsFromStorage());
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState({ left: 0, right: 0 });
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Supplier comparison panel state
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonSku, setComparisonSku] = useState('');
  const [history, setHistory] = useState<unknown[]>([]);
  const [metrics, setMetrics] = useState({
    totalSupplierProducts: 0,
    totalProductsAllSuppliers: 0,
    suppliers: 0,
    brands: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(false);
  const prevSupplierIdRef = useRef<string>(supplierId);

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

  // Save density to localStorage whenever it changes
  useEffect(() => {
    saveDensityToStorage(density);
  }, [density]);

  // Save column widths to localStorage whenever they change
  useEffect(() => {
    saveColumnWidthsToStorage(columnWidths);
  }, [columnWidths]);

  // Handle scroll position for shadow indicators
  const handleScroll = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setScrollPosition({
        left: scrollLeft,
        right: scrollWidth - clientWidth - scrollLeft,
      });
    }
  }, []);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Column resize handlers
  const handleResizeStart = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    
    const startX = e.clientX;
    const column = columns.find(c => c.key === columnKey);
    const startWidth = columnWidths[columnKey] || column?.width || 100;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(column?.minWidth || 50, startWidth + delta);
      const maxWidth = column?.maxWidth || 500;
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: Math.min(newWidth, maxWidth),
      }));
    };
    
    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columns, columnWidths]);

  // Reset column widths
  const handleResetColumnWidths = useCallback(() => {
    setColumnWidths({});
  }, []);

  // Helper to get visible columns in order with sticky positions
  const visibleColumns = useMemo(() => {
    const sorted = columns.filter(col => col.visible).sort((a, b) => a.order - b.order);
    
    // Calculate cumulative left positions for left-sticky columns
    let leftOffset = 0;
    const withPositions = sorted.map(col => {
      const width = columnWidths[col.key] || col.width || 100;
      const result = { ...col, _stickyLeft: col.sticky === 'left' ? leftOffset : undefined };
      if (col.sticky === 'left') {
        leftOffset += width;
      }
      return result;
    });
    
    return withPositions;
  }, [columns, columnWidths]);

  // Get column width (user-set or default)
  const getColumnWidth = useCallback((col: ColumnDef) => {
    return columnWidths[col.key] || col.width || 100;
  }, [columnWidths]);

  // Density styles
  const densityStyles = DENSITY_CONFIG[density];

  // Calculate column group spans for the group header row
  const columnGroups = useMemo(() => {
    const groups: { group: string; label: string; colSpan: number; startIdx: number }[] = [];
    const groupLabels: Record<string, string> = {
      identity: 'Identity',
      classification: 'Classification',
      stock: 'Stock',
      pricing: 'Pricing',
      meta: 'Meta',
    };
    
    let currentGroup: string | undefined;
    let currentSpan = 0;
    let startIdx = 0;
    
    visibleColumns.forEach((col, idx) => {
      const colGroup = col.group || 'other';
      if (colGroup !== currentGroup) {
        if (currentGroup && currentSpan > 0) {
          groups.push({
            group: currentGroup,
            label: groupLabels[currentGroup] || currentGroup,
            colSpan: currentSpan,
            startIdx,
          });
        }
        currentGroup = colGroup;
        currentSpan = 1;
        startIdx = idx;
      } else {
        currentSpan++;
      }
    });
    
    // Push the last group
    if (currentGroup && currentSpan > 0) {
      groups.push({
        group: currentGroup,
        label: groupLabels[currentGroup] || currentGroup,
        colSpan: currentSpan,
        startIdx,
      });
    }
    
    return groups;
  }, [visibleColumns]);

  // State for showing/hiding group headers
  const [showGroupHeaders, setShowGroupHeaders] = useState(false);

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
        const [sres, cres] = await Promise.all([
          fetch('/api/catalog/suppliers'),
          fetch('/api/catalog/categories'),
        ]);
        const sjson = await sres.json();
        const cjson = await cres.json();
        setSuppliers(sjson.data || []);
        setCategories(cjson.data || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Load brands filtered by selected supplier
  useEffect(() => {
    (async () => {
      try {
        const url =
          supplierId && supplierId !== 'all'
            ? `/api/catalog/brands?supplier_id=${supplierId}`
            : '/api/catalog/brands';
        const bres = await fetch(url);
        const bjson = await bres.json();
        const availableBrands = (bjson.data || []).map((b: { brand: string }) => b.brand);
        setBrands(bjson.data || []);
        // Reset brand filter if supplier changed and current brand is not available for new supplier
        const supplierChanged = prevSupplierIdRef.current !== supplierId;
        if (supplierChanged && brandFilter !== 'all' && !availableBrands.includes(brandFilter)) {
          setBrandFilter('all');
        }
        prevSupplierIdRef.current = supplierId;
      } catch (e) {
        // ignore
      }
    })();
  }, [supplierId, brandFilter]);

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
      stock_status: 'stock_status',
      new_stock_eta: 'new_stock_eta',
    };
    return sortMap[columnKey] || columnKey;
  };

  // Helper to render table header cell
  const renderHeaderCell = (column: ColumnDef & { _stickyLeft?: number }, index: number) => {
    const width = getColumnWidth(column);
    const isSticky = column.sticky === 'left' || column.sticky === 'right';
    const isResizing = resizingColumn === column.key;
    
    const className = cn(
      densityStyles.cellPadding,
      densityStyles.fontSize,
      'relative select-none whitespace-nowrap font-medium',
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      column.sortable && 'cursor-pointer hover:bg-muted/50',
      // Sticky positioning
      isSticky && 'sticky z-20 bg-background',
      column.sticky === 'right' && 'right-0',
      // Shadow for sticky columns
      column.sticky === 'left' && scrollPosition.left > 0 && index === visibleColumns.filter(c => c.sticky === 'left').length - 1 && 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
      column.sticky === 'right' && scrollPosition.right > 0 && 'shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]'
    );

    const handleSort = () => {
      if (column.sortable) {
        const sortKey = getSortKey(column.key);
        setSortBy(sortKey);
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      }
    };

    const style: React.CSSProperties = {
      width: `${width}px`,
      minWidth: `${column.minWidth || 50}px`,
      maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
    };
    
    if (column.sticky === 'left' && column._stickyLeft !== undefined) {
      style.left = `${column._stickyLeft}px`;
    }

    return (
      <TableHead 
        key={column.key} 
        className={className} 
        onClick={handleSort}
        style={style}
      >
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="truncate">{column.label}</span>
          {column.sortable && sortBy === getSortKey(column.key) && (
            <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
        {/* Resize handle */}
        {column.key !== 'actions' && (
          <div
            className={cn(
              'absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50',
              isResizing && 'bg-primary'
            )}
            onMouseDown={(e) => handleResizeStart(column.key, e)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </TableHead>
    );
  };

  // Helper to render table body cell
  const renderBodyCell = (column: ColumnDef & { _stickyLeft?: number }, row: CatalogRow, colIndex: number) => {
    const width = getColumnWidth(column);
    const isSticky = column.sticky === 'left' || column.sticky === 'right';
    
    const baseClassName = cn(
      densityStyles.cellPadding,
      densityStyles.fontSize,
      'whitespace-nowrap',
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      // Sticky positioning
      isSticky && 'sticky z-10 bg-background group-hover:bg-muted/50',
      column.sticky === 'right' && 'right-0',
      // Shadow for sticky columns
      column.sticky === 'left' && scrollPosition.left > 0 && colIndex === visibleColumns.filter(c => c.sticky === 'left').length - 1 && 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
      column.sticky === 'right' && scrollPosition.right > 0 && 'shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]'
    );

    const cellStyle: React.CSSProperties = {
      width: `${width}px`,
      minWidth: `${column.minWidth || 50}px`,
      maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
    };
    
    if (column.sticky === 'left' && column._stickyLeft !== undefined) {
      cellStyle.left = `${column._stickyLeft}px`;
    }

    const className = baseClassName;

    switch (column.key) {
      case 'supplier':
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 overflow-hidden">
                  <span className="truncate font-medium">{row.supplier_name || 'Unknown Supplier'}</span>
                  {!row.is_active && <Badge variant="secondary" className="text-[10px] px-1">inactive</Badge>}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{row.supplier_name || 'Unknown Supplier'}</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'supplier_code':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            <span className="truncate">{row.supplier_code || '-'}</span>
          </TableCell>
        );
      case 'sku':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground font-mono')} style={cellStyle}>
            <span className="truncate">{row.supplier_sku}</span>
          </TableCell>
        );
      case 'name':
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block truncate">{row.product_name || 'Product Details Unavailable'}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <p>{row.product_name || 'Product Details Unavailable'}</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'description':
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground block truncate">
                  {row.description || row.attrs_json?.description || '-'}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <p>{row.description || row.attrs_json?.description || '-'}</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'brand':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            <span className="truncate">{(row as unknown as { brand?: string }).brand || row.attrs_json?.brand || '-'}</span>
          </TableCell>
        );
      case 'series_range':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            <span className="truncate">{row.series_range || '-'}</span>
          </TableCell>
        );
      case 'uom':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {row.uom || '-'}
          </TableCell>
        );
      case 'pack_size':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {row.pack_size || '-'}
          </TableCell>
        );
      case 'barcode':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            <span className="truncate">{row.barcode || '-'}</span>
          </TableCell>
        );
      case 'category':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {row.category_name ? <Badge variant="outline" className="text-[10px] px-1.5 py-0">{row.category_name}</Badge> : '-'}
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
          <TableCell key={column.key} className={className} style={cellStyle}>
            {tags.length > 0 ? (
              <div className="flex flex-nowrap gap-0.5 overflow-hidden">
                {tags.slice(0, 2).map((tag, idx) => (
                  <Badge
                    key={tag.tag_id || tag.name || idx}
                    variant="secondary"
                    className="text-[10px] px-1 py-0 truncate max-w-[60px]"
                  >
                    {tag.name || tag.tag_id}
                  </Badge>
                ))}
                {tags.length > 2 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    +{tags.length - 2}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );
      case 'soh':
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
            {row.sup_soh ?? (row as unknown as { qty_on_hand?: number }).qty_on_hand ?? 0}
          </TableCell>
        );
      case 'stock_status': {
        const stockStatus = row.stock_status || row.attrs_json?.stock_status;
        const getStockStatusVariant = (status: string | undefined): 'default' | 'secondary' | 'destructive' | 'outline' => {
          if (!status) return 'outline';
          const lower = status.toLowerCase();
          if (lower.includes('in stock') || lower === 'in stock') return 'default';
          if (lower.includes('low') || lower === 'low stock') return 'secondary';
          if (lower.includes('out') || lower === 'out of stock') return 'destructive';
          return 'outline';
        };
        const getStockStatusColor = (status: string | undefined): string => {
          if (!status) return '';
          const lower = status.toLowerCase();
          if (lower.includes('in stock') || lower === 'in stock') return 'bg-green-500/10 text-green-700 border-green-500/20';
          if (lower.includes('low') || lower === 'low stock') return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
          if (lower.includes('out') || lower === 'out of stock') return 'bg-red-500/10 text-red-700 border-red-500/20';
          return '';
        };
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
            {stockStatus ? (
              <Badge variant={getStockStatusVariant(stockStatus)} className={cn(getStockStatusColor(stockStatus), 'text-[10px] px-1.5 py-0')}>
                {stockStatus}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );
      }
      case 'new_stock_eta': {
        const etaDate = row.new_stock_eta || row.attrs_json?.new_stock_eta;
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {etaDate ? new Date(etaDate).toLocaleDateString() : '-'}
          </TableCell>
        );
      }
      case 'on_order':
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
            {(row as unknown as { qty_on_order?: number }).qty_on_order ?? 0}
          </TableCell>
        );
      case 'cost_ex_vat':
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono')} style={cellStyle}>
            {(row as unknown as { cost_ex_vat?: number }).cost_ex_vat !== undefined
              ? formatCost((row as unknown as { cost_ex_vat?: number }).cost_ex_vat as number)
              : row.attrs_json?.cost_excluding !== undefined
                ? formatCost(Number(row.attrs_json.cost_excluding))
                : row.current_price !== undefined
                  ? formatCost(row.current_price)
                  : '-'}
          </TableCell>
        );
      case 'vat':
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono text-muted-foreground')} style={cellStyle}>
            {formatCost(
              (((row as unknown as { cost_ex_vat?: number }).cost_ex_vat ?? row.current_price ?? 0) as number) * 0.15
            )}
          </TableCell>
        );
      case 'cost_diff':
        const costDiffValue = row.cost_diff;
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono', costDiffValue && costDiffValue > 0 ? 'text-red-600' : costDiffValue && costDiffValue < 0 ? 'text-green-600' : '')} style={cellStyle}>
            {costDiffValue !== undefined && costDiffValue !== null
              ? `${costDiffValue >= 0 ? '+' : ''}${formatCost(costDiffValue)}`
              : '-'}
          </TableCell>
        );
      case 'previous_cost':
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono text-muted-foreground')} style={cellStyle}>
            {row.previous_cost !== undefined && row.previous_cost !== null
              ? formatCost(row.previous_cost)
              : '-'}
          </TableCell>
        );
      case 'base_discount':
        const discount = row.base_discount ?? row.attrs_json?.base_discount ?? 0;
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono')} style={cellStyle}>
            {discount !== undefined && discount !== null && discount > 0
              ? `${typeof discount === 'number' ? discount.toFixed(1) : parseFloat(String(discount)).toFixed(1)}%`
              : '-'}
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
          <TableCell key={column.key} className={cn(className, 'font-mono')} style={cellStyle}>
            {calculatedCost !== undefined && calculatedCost !== null
              ? formatCost(calculatedCost)
              : '-'}
          </TableCell>
        );
      case 'rsp':
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono')} style={cellStyle}>
            {row.rsp !== undefined
              ? formatCost(row.rsp)
              : row.attrs_json?.rsp !== undefined
                ? formatCost(Number(row.attrs_json.rsp))
                : '-'}
          </TableCell>
        );
      case 'cost_inc_vat':
        return (
          <TableCell key={column.key} className={cn(className, 'font-mono')} style={cellStyle}>
            {row.cost_inc_vat !== undefined
              ? formatCost(row.cost_inc_vat)
              : row.attrs_json?.cost_including !== undefined
                ? formatCost(Number(row.attrs_json.cost_including))
                : '-'}
          </TableCell>
        );
      case 'currency':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {row.currency || 'ZAR'}
          </TableCell>
        );
      case 'first_seen':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {row.first_seen_at ? new Date(row.first_seen_at).toLocaleDateString() : '-'}
          </TableCell>
        );
      case 'last_seen':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {row.last_seen_at ? new Date(row.last_seen_at).toLocaleDateString() : '-'}
          </TableCell>
        );
      case 'active':
        return (
          <TableCell key={column.key} className={cn(className, 'text-muted-foreground')} style={cellStyle}>
            {row.is_active ? 'Yes' : 'No'}
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={density === 'dense' ? 'h-6 w-6' : 'h-7 w-7'}
                  onClick={e => {
                    e.stopPropagation();
                    setComparisonSku(row.supplier_sku);
                    setComparisonOpen(true);
                  }}
                >
                  <BarChart3 className={density === 'dense' ? 'h-3 w-3' : 'h-4 w-4'} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compare prices across suppliers</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      default:
        return (
          <TableCell key={column.key} className={className} style={cellStyle}>
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
          <SearchableSupplierSelect
            suppliers={suppliers.filter(s => s && s.supplier_id).map(s => ({
              id: s.supplier_id!,
              supplier_id: s.supplier_id,
              name: s.name,
            }))}
            value={supplierId}
            onValueChange={setSupplierId}
            placeholder="All suppliers"
            showAllOption={true}
            allOptionValue="all"
            className="w-[220px]"
          />
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
            {/* Group headers toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGroupHeaders ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowGroupHeaders(!showGroupHeaders)}
                  className="h-8"
                >
                  Group Headers
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle column group headers</TooltipContent>
            </Tooltip>
            {/* Reset column widths */}
            {Object.keys(columnWidths).length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleResetColumnWidths} className="text-muted-foreground">
                Reset widths
              </Button>
            )}
          </div>
          
          {/* Density toggle */}
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={density === 'normal' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setDensity('normal')}
                >
                  <Rows3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Normal density</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={density === 'compact' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setDensity('compact')}
                >
                  <Rows2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Compact density</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={density === 'dense' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setDensity('dense')}
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dense (maximum data)</TooltipContent>
            </Tooltip>
          </div>
          
          <ColumnManagementDialog
            open={columnDialogOpen}
            onOpenChange={setColumnDialogOpen}
            columns={columns}
            onColumnsChange={setColumns}
            defaultColumns={DEFAULT_COLUMNS}
          />
        </div>

        <div 
          ref={tableContainerRef}
          className={cn(
            'overflow-auto rounded-md border relative',
            isPopOut ? 'flex-1' : 'max-h-[70vh]',
            // Cursor while resizing
            resizingColumn && 'cursor-col-resize select-none'
          )}
        >
          <TooltipProvider delayDuration={300}>
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 z-30 bg-background">
                {/* Optional group header row */}
                {showGroupHeaders && (
                  <TableRow className="h-6 border-b-0">
                    {columnGroups.map((group, idx) => {
                      // Calculate sticky position for group headers
                      const firstColInGroup = visibleColumns[group.startIdx];
                      const isSticky = firstColInGroup?.sticky === 'left';
                      const lastColInGroup = visibleColumns[group.startIdx + group.colSpan - 1];
                      const isRightSticky = lastColInGroup?.sticky === 'right';
                      
                      const groupColors: Record<string, string> = {
                        identity: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
                        classification: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
                        stock: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
                        pricing: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        meta: 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400',
                      };
                      
                      return (
                        <TableHead
                          key={`group-${group.group}-${idx}`}
                          colSpan={group.colSpan}
                          className={cn(
                            'text-center text-[10px] font-semibold uppercase tracking-wider py-1 px-1',
                            groupColors[group.group] || 'bg-muted',
                            isSticky && 'sticky left-0 z-20',
                            isRightSticky && 'sticky right-0 z-20'
                          )}
                        >
                          {group.label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                )}
                <TableRow className={densityStyles.rowHeight}>
                  {visibleColumns.map((column, index) => renderHeaderCell(column, index))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow
                    key={r.supplier_product_id}
                    className={cn('cursor-pointer group', densityStyles.rowHeight, 'hover:bg-muted/50')}
                    onClick={() => {
                      setDetailId(r.supplier_product_id);
                    }}
                  >
                    {visibleColumns.map((column, colIndex) => renderBodyCell(column, r, colIndex))}
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
          </TooltipProvider>
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

      {/* Supplier Comparison Panel */}
      <SKUComparisonPanel
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        initialQuery={comparisonSku}
      />
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
