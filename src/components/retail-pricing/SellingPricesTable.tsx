'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ColumnManagementDialog,
  type ColumnDef,
  type TableDensity,
} from '@/components/catalog/ColumnManagementDialog';
import { SearchableSupplierSelect } from '@/components/shared/SearchableSupplierSelect';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { deriveStockStatus } from '@/lib/utils/inventory-metrics';
import type { Supplier } from '@/lib/types/inventory';
import {
  Search,
  RefreshCw,
  Save,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Activity,
  Package,
  BarChart3,
  Download,
  Settings2,
  ExternalLink,
  Rows3,
  Rows2,
  AlignJustify,
  ListOrdered,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Row model — aligned with inventory store normalization
// ---------------------------------------------------------------------------
type PricingRow = {
  id: string;
  sku: string;
  name: string;
  supplier_name: string;
  supplier_id: string | null;
  category: string;
  location: string;
  location_id: string;
  current_stock: number;
  reorder_point: number;
  max_stock_level: number;
  cost_per_unit_zar: number;
  total_value_zar: number;
  rsp: number | null;
  selling_price: number | null;
  stock_status: string;
};

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'supplier', label: 'Supplier', visible: true, order: 1, align: 'left', sortable: true, width: 160, minWidth: 100, maxWidth: 220, sticky: 'left', group: 'identity' },
  { key: 'sku', label: 'SKU', visible: true, order: 2, align: 'left', sortable: true, width: 120, minWidth: 80, maxWidth: 160, sticky: 'left', group: 'identity' },
  { key: 'name', label: 'Product', visible: true, order: 3, align: 'left', sortable: true, width: 220, minWidth: 150, maxWidth: 320, sticky: 'left', group: 'identity' },
  { key: 'category', label: 'Category', visible: true, order: 4, align: 'left', sortable: true, width: 120, minWidth: 80, group: 'classification' },
  { key: 'location', label: 'Location', visible: true, order: 5, align: 'left', sortable: true, width: 140, minWidth: 80, group: 'classification' },
  { key: 'current_stock', label: 'SOH', visible: true, order: 6, align: 'right', sortable: true, width: 80, minWidth: 60, group: 'stock' },
  { key: 'stock_status', label: 'Status', visible: false, order: 7, align: 'left', sortable: true, width: 110, minWidth: 80, group: 'stock' },
  { key: 'cost_per_unit_zar', label: 'Unit cost', visible: true, order: 8, align: 'right', sortable: true, width: 100, minWidth: 70, group: 'pricing' },
  { key: 'rsp', label: 'RRP', visible: true, order: 9, align: 'right', sortable: true, width: 90, minWidth: 60, group: 'pricing' },
  { key: 'selling_price', label: 'Selling price', visible: true, order: 10, align: 'right', sortable: true, width: 110, minWidth: 80, group: 'pricing' },
  { key: 'margin_pct', label: 'Margin %', visible: true, order: 11, align: 'right', sortable: true, width: 90, minWidth: 60, group: 'pricing' },
  { key: 'line_value', label: 'Line value', visible: true, order: 12, align: 'right', sortable: true, width: 100, minWidth: 70, group: 'pricing' },
];

const DENSITY_CONFIG = {
  normal: { cellPadding: 'px-3 py-3', fontSize: 'text-sm', rowHeight: 'h-12' },
  compact: { cellPadding: 'px-2 py-1.5', fontSize: 'text-xs', rowHeight: 'h-9' },
  dense: { cellPadding: 'px-1.5 py-1', fontSize: 'text-xs', rowHeight: 'h-7' },
} as const;

const STORAGE_KEY_COLUMNS = 'retail_pricing_table_columns';
const STORAGE_KEY_DENSITY = 'retail_pricing_table_density';
const STORAGE_KEY_WIDTHS = 'retail_pricing_table_column_widths';

function loadDensity(): TableDensity {
  if (typeof window === 'undefined') return 'compact';
  try {
    const s = localStorage.getItem(STORAGE_KEY_DENSITY);
    if (s && ['normal', 'compact', 'dense'].includes(s)) return s as TableDensity;
  } catch {
    /* noop */
  }
  return 'compact';
}
function saveDensity(d: TableDensity) {
  try {
    localStorage.setItem(STORAGE_KEY_DENSITY, d);
  } catch {
    /* noop */
  }
}

function loadWidths(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const s = localStorage.getItem(STORAGE_KEY_WIDTHS);
    return s ? (JSON.parse(s) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
function saveWidths(w: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(w));
  } catch {
    /* noop */
  }
}

function loadColumns(): ColumnDef[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  try {
    const s = localStorage.getItem(STORAGE_KEY_COLUMNS);
    if (!s) return DEFAULT_COLUMNS;
    const parsed = JSON.parse(s) as ColumnDef[];
    const storedMap = new Map(parsed.map(c => [c.key, c]));
    return DEFAULT_COLUMNS.map(d => {
      const stored = storedMap.get(d.key);
      return stored ? { ...d, ...stored, order: stored.order ?? d.order } : d;
    }).sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_COLUMNS;
  }
}
function saveColumns(cols: ColumnDef[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(cols));
  } catch {
    /* noop */
  }
}

function effectiveSellingPrice(row: PricingRow): number {
  const sp = row.selling_price;
  if (sp != null && !Number.isNaN(Number(sp)) && Number(sp) > 0) return Number(sp);
  if (row.rsp != null && !Number.isNaN(Number(row.rsp)) && Number(row.rsp) > 0) return Number(row.rsp);
  return 0;
}

function marginPct(cost: number, sell: number): number | null {
  if (!cost || cost <= 0) return null;
  return ((sell - cost) / cost) * 100;
}

const stockStatusLabels: Record<string, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  overstocked: 'Overstocked',
};

function statusBadgeClass(s: string) {
  if (s === 'in_stock') return 'bg-success/10 text-success border-success/20';
  if (s === 'low_stock') return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400';
  if (s === 'out_of_stock') return 'bg-destructive/10 text-destructive border-destructive/20';
  if (s === 'overstocked') return 'bg-muted text-muted-foreground border-border';
  return '';
}

export interface SellingPricesTableProps {
  isPopOut?: boolean;
  initialParams?: URLSearchParams;
}

export function SellingPricesTable({ isPopOut = false, initialParams }: SellingPricesTableProps) {
  const getInitial = useCallback(
    (key: string, fallback: string) => initialParams?.get(key) ?? fallback,
    [initialParams],
  );

  const {
    items,
    loading,
    error,
    fetchItems,
    fetchSuppliers,
    suppliers,
    locations: locationOptions,
    fetchLocations,
    clearError,
  } = useInventoryStore();

  const [search, setSearch] = useState(() => getInitial('search', ''));
  const [supplierId, setSupplierId] = useState(() => getInitial('supplier_id', 'all'));
  const [categoryFilter, setCategoryFilter] = useState(() => getInitial('category', 'all'));
  const [statusFilter, setStatusFilter] = useState(() => getInitial('status', 'all'));
  const [locationFilter, setLocationFilter] = useState(() => getInitial('location_id', 'all'));
  const [priceMin, setPriceMin] = useState(() => getInitial('price_min', ''));
  const [priceMax, setPriceMax] = useState(() => getInitial('price_max', ''));

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [columns, setColumns] = useState<ColumnDef[]>(() => loadColumns());
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [density, setDensity] = useState<TableDensity>(() => loadDensity());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => loadWidths());
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState({ left: 0, right: 0 });
  const [showGroupHeaders, setShowGroupHeaders] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [sortBy, setSortBy] = useState('supplier_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveColumns(columns);
  }, [columns]);
  useEffect(() => {
    saveDensity(density);
  }, [density]);
  useEffect(() => {
    saveWidths(columnWidths);
  }, [columnWidths]);

  useEffect(() => {
    void fetchItems();
    void fetchLocations();
    void fetchSuppliers();
  }, [fetchItems, fetchLocations, fetchSuppliers]);

  const rows: PricingRow[] = useMemo(() => {
    return (items as unknown[]).map((raw: unknown) => {
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? '');
      const sku = String(r.sku ?? '');
      const name = String(r.name ?? '');
      const supplier_name = String(r.supplier_name ?? '—');
      const supplier_id =
        r.supplier_id != null && String(r.supplier_id).length > 0 ? String(r.supplier_id) : null;
      const category = String(r.category ?? 'uncategorized');
      const location = String(r.location ?? '—');
      const location_id = String(r.location_id ?? location);
      const current_stock = Number(r.current_stock ?? 0);
      const reorder_point = Number(r.reorder_point ?? 0);
      const max_stock_level = Number(r.max_stock_level ?? 0);
      const cost_per_unit_zar = Number(r.cost_per_unit_zar ?? 0);
      const total_value_zar = Number(r.total_value_zar ?? current_stock * cost_per_unit_zar);
      const rspRaw = r.rsp;
      const rsp = rspRaw == null || rspRaw === '' ? null : Number(rspRaw);
      const spRaw = r.selling_price;
      const selling_price = spRaw == null || spRaw === '' ? null : Number(spRaw);
      let stock_status = String(r.stock_status ?? '');
      if (!stock_status) {
        stock_status = deriveStockStatus(current_stock, reorder_point, max_stock_level);
      }
      return {
        id,
        sku,
        name,
        supplier_name,
        supplier_id,
        category,
        location,
        location_id,
        current_stock,
        reorder_point,
        max_stock_level,
        cost_per_unit_zar,
        total_value_zar,
        rsp: rsp != null && !Number.isNaN(rsp) ? rsp : null,
        selling_price: selling_price != null && !Number.isNaN(selling_price) ? selling_price : null,
        stock_status,
      };
    });
  }, [items]);

  const categories = useMemo(
    () => [...new Set(rows.map(r => r.category).filter(Boolean))].sort() as string[],
    [rows],
  );
  const stockStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'overstocked'];

  const supplierOptions = useMemo(
    () =>
      (suppliers as Supplier[])
        .filter(s => s && s.id)
        .map(s => ({ id: s.id, supplier_id: s.id, name: s.name })),
    [suppliers],
  );

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        r =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.supplier_name.toLowerCase().includes(q),
      );
    }
    if (supplierId !== 'all') {
      list = list.filter(r => r.supplier_id === supplierId);
    }
    if (categoryFilter !== 'all') {
      list = list.filter(r => r.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    if (statusFilter !== 'all') {
      list = list.filter(r => r.stock_status === statusFilter);
    }
    if (locationFilter !== 'all') {
      list = list.filter(
        r => r.location_id === locationFilter || r.location === locationFilter,
      );
    }
    if (priceMin) {
      const min = parseFloat(priceMin);
      if (Number.isFinite(min)) list = list.filter(r => r.cost_per_unit_zar >= min);
    }
    if (priceMax) {
      const max = parseFloat(priceMax);
      if (Number.isFinite(max)) list = list.filter(r => r.cost_per_unit_zar <= max);
    }
    return list;
  }, [rows, search, supplierId, categoryFilter, statusFilter, locationFilter, priceMin, priceMax]);

  const getSortValue = useCallback((row: PricingRow, key: string): string | number => {
    const sell = effectiveSellingPrice(row);
    const m = marginPct(row.cost_per_unit_zar, sell);
    const line = sell * row.current_stock;
    switch (key) {
      case 'supplier_name':
        return row.supplier_name ?? '';
      case 'sku':
        return row.sku;
      case 'name':
        return row.name;
      case 'category':
        return row.category;
      case 'location':
        return row.location;
      case 'current_stock':
        return row.current_stock;
      case 'stock_status':
        return row.stock_status;
      case 'cost_per_unit_zar':
        return row.cost_per_unit_zar;
      case 'rsp':
        return row.rsp ?? 0;
      case 'selling_price':
        return sell;
      case 'margin_pct':
        return m ?? -1e9;
      case 'line_value':
        return line;
      default:
        return '';
    }
  }, []);

  const sortedItems = useMemo(() => {
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aVal = getSortValue(a, sortBy);
      const bVal = getSortValue(b, sortBy);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [filtered, sortBy, sortDir, getSortValue]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [search, supplierId, categoryFilter, statusFilter, locationFilter, priceMin, priceMax]);

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((s, r) => s + (r.total_value_zar || 0), 0);
    const lowStockCount = filtered.filter(
      r => r.current_stock <= r.reorder_point && r.current_stock > 0,
    ).length;
    const outOfStockCount = filtered.filter(r => r.current_stock === 0).length;
    const criticalStockCount = filtered.filter(
      r => r.current_stock < 10 && r.current_stock > 0,
    ).length;
    const totalProducts = new Set(filtered.map(r => r.id)).size;
    const totalSkus = new Set(filtered.map(r => r.sku).filter(Boolean)).size;
    return {
      totalValue,
      lowStockCount,
      outOfStockCount,
      criticalStockCount,
      totalItems: filtered.length,
      totalProducts,
      totalSkus,
    };
  }, [filtered]);

  const displayPrice = useCallback(
    (row: PricingRow) => {
      const d = drafts[row.id];
      if (d !== undefined) return d;
      const eff = effectiveSellingPrice(row);
      return eff > 0 ? String(eff) : '';
    },
    [drafts],
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

  const visibleColumns = useMemo(() => {
    const sorted = columns.filter(c => c.visible).sort((a, b) => a.order - b.order);
    let leftOffset = 0;
    return sorted.map(col => {
      const width = columnWidths[col.key] || col.width || 100;
      const result = { ...col, _stickyLeft: col.sticky === 'left' ? leftOffset : undefined };
      if (col.sticky === 'left') leftOffset += width;
      return result;
    });
  }, [columns, columnWidths]);

  const getColumnWidth = useCallback(
    (col: ColumnDef) => columnWidths[col.key] || col.width || 100,
    [columnWidths],
  );
  const densityStyles = DENSITY_CONFIG[density];

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
    let span = 0;
    let startIdx = 0;

    visibleColumns.forEach((col, idx) => {
      const g = col.group || 'other';
      if (g !== currentGroup) {
        if (currentGroup && span > 0) {
          groups.push({
            group: currentGroup,
            label: groupLabels[currentGroup] || currentGroup,
            colSpan: span,
            startIdx,
          });
        }
        currentGroup = g;
        span = 1;
        startIdx = idx;
      } else {
        span++;
      }
    });
    if (currentGroup && span > 0) {
      groups.push({
        group: currentGroup,
        label: groupLabels[currentGroup] || currentGroup,
        colSpan: span,
        startIdx,
      });
    }
    return groups;
  }, [visibleColumns]);

  const handleScroll = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setScrollPosition({ left: scrollLeft, right: scrollWidth - clientWidth - scrollLeft });
    }
  }, []);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return undefined;
    container.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleResizeStart = useCallback(
    (columnKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(columnKey);
      const startX = e.clientX;
      const column = columns.find(c => c.key === columnKey);
      const startWidth = columnWidths[columnKey] || column?.width || 100;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(column?.minWidth || 50, startWidth + delta);
        setColumnWidths(prev => ({
          ...prev,
          [columnKey]: Math.min(newWidth, column?.maxWidth || 500),
        }));
      };
      const onUp = () => {
        setResizingColumn(null);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [columns, columnWidths],
  );

  const getSortKeyFromColumn = (columnKey: string): string => {
    const map: Record<string, string> = {
      supplier: 'supplier_name',
      sku: 'sku',
      name: 'name',
      category: 'category',
      location: 'location',
      current_stock: 'current_stock',
      stock_status: 'stock_status',
      cost_per_unit_zar: 'cost_per_unit_zar',
      rsp: 'rsp',
      selling_price: 'selling_price',
      margin_pct: 'margin_pct',
      line_value: 'line_value',
    };
    return map[columnKey] || 'supplier_name';
  };

  const handlePopOut = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (supplierId !== 'all') params.set('supplier_id', supplierId);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (locationFilter !== 'all') params.set('location_id', locationFilter);
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    const url = `/retail-pricing/price-positioning/popout?${params.toString()}`;
    const w = Math.min(1920, window.screen.width - 100);
    const h = Math.min(1080, window.screen.height - 100);
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    window.open(
      url,
      'retail-pricing-popout',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no`,
    );
  }, [search, supplierId, categoryFilter, statusFilter, locationFilter, priceMin, priceMax]);

  const handleExportCSV = useCallback(() => {
    if (sortedItems.length === 0) return;
    const exportData = sortedItems.map(row => {
      const sell = effectiveSellingPrice(row);
      const m = marginPct(row.cost_per_unit_zar, sell);
      const lineVal = sell * row.current_stock;
      return {
        Supplier: row.supplier_name,
        SKU: row.sku,
        Product: row.name,
        Category: row.category,
        Location: row.location,
        SOH: row.current_stock,
        Status: stockStatusLabels[row.stock_status] || row.stock_status,
        'Unit cost': row.cost_per_unit_zar,
        RRP: row.rsp ?? '',
        'Selling price': sell,
        'Margin %': m == null ? '' : m.toFixed(1),
        'Line value': lineVal,
      };
    });
    const headers = Object.keys(exportData[0]);
    const csv = [
      headers.join(','),
      ...exportData.map(row =>
        headers
          .map(h => {
            const v = (row as Record<string, unknown>)[h];
            return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v);
          })
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-pricing-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportData.length} rows`);
  }, [sortedItems]);

  const renderHeaderCell = (column: ColumnDef & { _stickyLeft?: number }, index: number) => {
    const width = getColumnWidth(column);
    const isSticky = column.sticky === 'left' || column.sticky === 'right';
    const isResizing = resizingColumn === column.key;
    const sortKey = getSortKeyFromColumn(column.key);
    const className = cn(
      densityStyles.cellPadding,
      densityStyles.fontSize,
      'relative select-none whitespace-nowrap font-medium',
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      column.sortable && 'hover:bg-muted/50 cursor-pointer',
      isSticky && 'bg-background sticky z-20',
      column.sticky === 'right' && 'right-0',
      column.sticky === 'left' &&
        scrollPosition.left > 0 &&
        index === visibleColumns.filter(c => c.sticky === 'left').length - 1 &&
        'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
      column.sticky === 'right' && scrollPosition.right > 0 && 'shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]',
    );
    const handleSort = () => {
      if (!column.sortable) return;
      if (sortBy === sortKey) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(sortKey);
        setSortDir('asc');
      }
    };
    const style: React.CSSProperties = {
      width: `${width}px`,
      minWidth: `${column.minWidth || 50}px`,
      maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
    };
    if (column.sticky === 'left' && column._stickyLeft !== undefined)
      style.left = `${column._stickyLeft}px`;

    return (
      <TableHead key={column.key} className={className} onClick={handleSort} style={style}>
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="truncate">{column.label}</span>
          {column.sortable && sortBy === sortKey && (
            <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
        <div
          className={cn(
            'absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/50',
            isResizing && 'bg-primary',
          )}
          onMouseDown={e => handleResizeStart(column.key, e)}
          onClick={e => e.stopPropagation()}
        />
      </TableHead>
    );
  };

  const renderBodyCell = (
    column: ColumnDef & { _stickyLeft?: number },
    row: PricingRow,
    colIndex: number,
  ) => {
    const width = getColumnWidth(column);
    const isSticky = column.sticky === 'left' || column.sticky === 'right';
    const baseClassName = cn(
      densityStyles.cellPadding,
      densityStyles.fontSize,
      'whitespace-nowrap',
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      isSticky && 'bg-background group-hover:bg-muted/50 sticky z-10',
      column.sticky === 'right' && 'right-0',
      column.sticky === 'left' &&
        scrollPosition.left > 0 &&
        colIndex === visibleColumns.filter(c => c.sticky === 'left').length - 1 &&
        'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
      column.sticky === 'right' && scrollPosition.right > 0 && 'shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]',
    );
    const cellStyle: React.CSSProperties = {
      width: `${width}px`,
      minWidth: `${column.minWidth || 50}px`,
      maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
    };
    if (column.sticky === 'left' && column._stickyLeft !== undefined)
      cellStyle.left = `${column._stickyLeft}px`;

    const draftStr = displayPrice(row);
    const sellNum = parseFloat(draftStr.replace(/,/g, ''));
    const sell =
      !Number.isNaN(sellNum) && sellNum >= 0 ? sellNum : effectiveSellingPrice(row);
    const m = marginPct(row.cost_per_unit_zar, sell);
    const lineVal = sell * row.current_stock;

    switch (column.key) {
      case 'supplier':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block truncate font-medium">{row.supplier_name}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{row.supplier_name}</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'sku':
        return (
          <TableCell
            key={column.key}
            className={cn(baseClassName, 'text-muted-foreground font-mono')}
            style={cellStyle}
          >
            {row.sku}
          </TableCell>
        );
      case 'name':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block truncate">{row.name}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <p>{row.name}</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'category':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground')} style={cellStyle}>
            {row.category ? (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize">
                {row.category.replace('_', ' ')}
              </Badge>
            ) : (
              '—'
            )}
          </TableCell>
        );
      case 'location':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground')} style={cellStyle}>
            <span className="truncate">{row.location}</span>
          </TableCell>
        );
      case 'current_stock':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <span
              className={cn(
                row.current_stock === 0 && 'text-destructive font-semibold',
                row.current_stock > 0 &&
                  row.current_stock <= row.reorder_point &&
                  'text-amber-600 font-semibold dark:text-amber-400',
              )}
            >
              {row.current_stock}
            </span>
          </TableCell>
        );
      case 'stock_status':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <Badge variant="outline" className={cn(statusBadgeClass(row.stock_status), 'text-[10px] px-1.5 py-0')}>
              {stockStatusLabels[row.stock_status] || row.stock_status || '—'}
            </Badge>
          </TableCell>
        );
      case 'cost_per_unit_zar':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'font-mono')} style={cellStyle}>
            {formatCurrency(row.cost_per_unit_zar)}
          </TableCell>
        );
      case 'rsp':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground font-mono')} style={cellStyle}>
            {row.rsp != null ? formatCurrency(row.rsp) : '—'}
          </TableCell>
        );
      case 'selling_price':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <Input
              className="h-8 w-full min-w-[96px] rounded-[8px] text-right font-mono text-sm"
              inputMode="decimal"
              value={draftStr}
              onChange={e => setDraft(row.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              aria-label={`Selling price for ${row.sku}`}
            />
          </TableCell>
        );
      case 'margin_pct':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground font-mono')} style={cellStyle}>
            {m == null ? '—' : `${m.toFixed(1)}%`}
          </TableCell>
        );
      case 'line_value':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'font-mono')} style={cellStyle}>
            {formatCurrency(lineVal)}
          </TableCell>
        );
      default:
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            —
          </TableCell>
        );
    }
  };

  const groupColors: Record<string, string> = {
    identity: 'bg-muted/80 text-foreground',
    classification: 'bg-muted/80 text-foreground',
    stock: 'bg-muted/80 text-foreground',
    pricing: 'bg-muted/80 text-foreground',
    meta: 'bg-muted/80 text-foreground',
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const start = (pageSafe - 1) * pageSize + 1;
    const end = Math.min(pageSafe * pageSize, sortedItems.length);
    return (
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Showing {start} to {end} of {sortedItems.length} items
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (pageSafe <= 3) pn = i + 1;
              else if (pageSafe >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = pageSafe - 2 + i;
              return (
                <Button
                  key={pn}
                  variant={pageSafe === pn ? 'default' : 'outline'}
                  size="sm"
                  className="w-9 rounded-[10px]"
                  onClick={() => setPage(pn)}
                >
                  {pn}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn('border-border rounded-[10px]', isPopOut && 'h-full')}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ListOrdered className="h-5 w-5" />
          Retail price list
          {isPopOut ? (
            <Badge variant="outline" className="font-normal">
              Pop-out
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(isPopOut && 'flex h-[calc(100%-4rem)] flex-col')}>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => clearError?.()}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="rounded-[10px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total value</p>
                  <p className="mt-1 text-2xl font-bold">
                    {loading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded-[8px]" />
                    ) : (
                      formatCurrency(stats.totalValue)
                    )}
                  </p>
                </div>
                <DollarSign className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[10px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Low stock</p>
                  <p className="mt-1 text-2xl font-bold">
                    {loading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded-[8px]" />
                    ) : (
                      stats.lowStockCount.toLocaleString()
                    )}
                  </p>
                </div>
                <AlertTriangle className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[10px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Out of stock</p>
                  <p className="mt-1 text-2xl font-bold">
                    {loading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded-[8px]" />
                    ) : (
                      stats.outOfStockCount.toLocaleString()
                    )}
                  </p>
                </div>
                <AlertCircle className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[10px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Critical stock</p>
                  <p className="mt-1 text-2xl font-bold">
                    {loading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded-[8px]" />
                    ) : (
                      stats.criticalStockCount.toLocaleString()
                    )}
                  </p>
                </div>
                <Activity className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[10px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Line items</p>
                  <p className="mt-1 text-2xl font-bold">
                    {loading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded-[8px]" />
                    ) : (
                      stats.totalProducts.toLocaleString()
                    )}
                  </p>
                </div>
                <Package className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[10px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Unique SKUs</p>
                  <p className="mt-1 text-2xl font-bold">
                    {loading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded-[8px]" />
                    ) : (
                      stats.totalSkus.toLocaleString()
                    )}
                  </p>
                </div>
                <BarChart3 className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search by name or SKU"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-[10px] pl-9"
            />
          </div>
          <SearchableSupplierSelect
            suppliers={supplierOptions}
            value={supplierId}
            onValueChange={setSupplierId}
            placeholder="All suppliers"
            showAllOption
            allOptionValue="all"
            className="w-[220px]"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>
                  {c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {stockStatuses.map(s => (
                <SelectItem key={s} value={s}>
                  {stockStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px] rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locationOptions.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Min price"
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            className="w-24 rounded-[10px]"
          />
          <Input
            placeholder="Max price"
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            className="w-24 rounded-[10px]"
          />
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
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            onClick={handleExportCSV}
            disabled={loading || sortedItems.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <span className="text-muted-foreground ml-auto text-sm">
            {sortedItems.length.toLocaleString()} items
          </span>
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[10px]"
              onClick={() => setColumnDialogOpen(true)}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Manage Columns
            </Button>
            {!isPopOut ? (
              <Button variant="outline" size="sm" className="rounded-[10px]" onClick={handlePopOut}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Pop Out
              </Button>
            ) : null}
            <Button
              variant={showGroupHeaders ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 rounded-[10px]"
              onClick={() => setShowGroupHeaders(!showGroupHeaders)}
            >
              Group Headers
            </Button>
            {Object.keys(columnWidths).length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground rounded-[10px]"
                onClick={() => setColumnWidths({})}
              >
                Reset widths
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-[10px] border border-border p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={density === 'normal' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 rounded-[8px] p-0"
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
                    className="h-7 w-7 rounded-[8px] p-0"
                    onClick={() => setDensity('compact')}
                  >
                    <Rows2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compact</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={density === 'dense' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 rounded-[8px] p-0"
                    onClick={() => setDensity('dense')}
                  >
                    <AlignJustify className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dense</TooltipContent>
              </Tooltip>
            </div>
            <Button
              type="button"
              size="sm"
              className="rounded-[10px]"
              onClick={() => void saveChanges()}
              disabled={saving || dirtyRows.length === 0}
            >
              <Save className="mr-1.5 h-4 w-4" />
              Save{dirtyRows.length > 0 ? ` (${dirtyRows.length})` : ''}
            </Button>
          </div>
        </div>

        <ColumnManagementDialog
          open={columnDialogOpen}
          onOpenChange={setColumnDialogOpen}
          columns={columns}
          onColumnsChange={setColumns}
          defaultColumns={DEFAULT_COLUMNS}
        />

        <div
          ref={tableContainerRef}
          className={cn(
            'relative overflow-auto rounded-[10px] border border-border',
            isPopOut ? 'min-h-0 flex-1' : 'max-h-[70vh]',
            resizingColumn && 'cursor-col-resize select-none',
          )}
        >
          <TooltipProvider delayDuration={300}>
            <Table className="border-collapse">
              <TableHeader className="bg-background sticky top-0 z-30">
                {showGroupHeaders ? (
                  <TableRow className="h-6 border-b-0 hover:bg-transparent">
                    {columnGroups.map((group, idx) => (
                      <TableHead
                        key={`group-${group.group}-${idx}`}
                        colSpan={group.colSpan}
                        className={cn(
                          'px-1 py-1 text-center text-[10px] font-semibold',
                          groupColors[group.group] || 'bg-muted',
                        )}
                      >
                        {group.label}
                      </TableHead>
                    ))}
                  </TableRow>
                ) : null}
                <TableRow className={cn(densityStyles.rowHeight, 'hover:bg-transparent')}>
                  {visibleColumns.map((col, idx) => renderHeaderCell(col, idx))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="text-muted-foreground py-12 text-center text-sm"
                    >
                      Loading inventory…
                    </TableCell>
                  </TableRow>
                ) : paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="text-muted-foreground py-12 text-center text-sm"
                    >
                      No rows match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map(row => (
                    <TableRow
                      key={row.id}
                      className={cn('group', densityStyles.rowHeight, 'hover:bg-muted/50')}
                    >
                      {visibleColumns.map((col, colIdx) => renderBodyCell(col, row, colIdx))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>

        {renderPagination()}
      </CardContent>
    </Card>
  );
}
