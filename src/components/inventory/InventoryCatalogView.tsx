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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RefreshCw,
  Package,
  AlertTriangle,
  AlertCircle,
  Activity,
  Settings2,
  ExternalLink,
  Rows3,
  Rows2,
  AlignJustify,
  Download,
  Plus,
  DollarSign,
  MoreHorizontal,
  Eye,
  Edit,
  BarChart3,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchableSupplierSelect } from '@/components/shared/SearchableSupplierSelect';
import {
  ColumnManagementDialog,
  type ColumnDef,
  type TableDensity,
} from '@/components/catalog/ColumnManagementDialog';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { deriveStockStatus } from '@/lib/utils/inventory-metrics';
import type { InventoryItem, Product, Supplier } from '@/lib/types/inventory';
import AddProductDialog from './AddProductDialog';
import AddProductsModeDialog from './AddProductsModeDialog';
import MultiProductSelectorDialog from './MultiProductSelectorDialog';
import EditProductDialog from './EditProductDialog';
import StockAdjustmentDialog from './StockAdjustmentDialog';
import ProductProfileBySKU from './ProductProfileBySKU';

// ---------------------------------------------------------------------------
// Column definitions — inventory-specific, SPP-style groups
// ---------------------------------------------------------------------------
const DEFAULT_COLUMNS: ColumnDef[] = [
  // Identity — sticky left
  { key: 'supplier', label: 'Supplier', visible: true, order: 1, align: 'left', sortable: true, width: 160, minWidth: 100, maxWidth: 200, sticky: 'left', group: 'identity' },
  { key: 'sku', label: 'SKU', visible: true, order: 2, align: 'left', sortable: true, width: 120, minWidth: 80, maxWidth: 150, sticky: 'left', group: 'identity' },
  { key: 'name', label: 'Product Name', visible: true, order: 3, align: 'left', sortable: true, width: 220, minWidth: 150, maxWidth: 300, sticky: 'left', group: 'identity' },
  { key: 'description', label: 'Description', visible: false, order: 4, align: 'left', sortable: false, width: 200, minWidth: 100, group: 'identity' },
  // Classification
  { key: 'category', label: 'Category', visible: true, order: 5, align: 'left', sortable: true, width: 110, minWidth: 80, group: 'classification' },
  { key: 'tags', label: 'Tags', visible: true, order: 6, align: 'left', sortable: false, width: 140, minWidth: 100, group: 'classification' },
  { key: 'location', label: 'Location', visible: true, order: 7, align: 'left', sortable: true, width: 140, minWidth: 80, group: 'classification' },
  // Stock
  { key: 'current_stock', label: 'Current Stock', visible: true, order: 8, align: 'right', sortable: true, width: 100, minWidth: 70, group: 'stock' },
  { key: 'stock_status', label: 'Stock Status', visible: true, order: 9, align: 'left', sortable: true, width: 100, minWidth: 80, group: 'stock' },
  { key: 'reorder_point', label: 'Reorder Point', visible: false, order: 10, align: 'right', sortable: false, width: 90, minWidth: 60, group: 'stock' },
  // Pricing
  { key: 'cost_ex_vat', label: 'Unit Cost', visible: true, order: 11, align: 'right', sortable: true, width: 90, minWidth: 70, group: 'pricing' },
  { key: 'rsp', label: 'RSP', visible: true, order: 12, align: 'right', sortable: true, width: 80, minWidth: 60, group: 'pricing' },
  { key: 'selling_price', label: 'Selling Price', visible: true, order: 13, align: 'right', sortable: true, width: 100, minWidth: 70, group: 'pricing' },
  { key: 'value', label: 'Value', visible: true, order: 14, align: 'right', sortable: true, width: 100, minWidth: 70, group: 'pricing' },
  // Actions — sticky right
  { key: 'actions', label: 'Actions', visible: true, order: 15, align: 'center', sortable: false, width: 80, minWidth: 60, sticky: 'right' },
];

// ---------------------------------------------------------------------------
// Density config (matches CatalogTable)
// ---------------------------------------------------------------------------
const DENSITY_CONFIG = {
  normal: { cellPadding: 'px-3 py-3', fontSize: 'text-sm', rowHeight: 'h-12' },
  compact: { cellPadding: 'px-2 py-1.5', fontSize: 'text-xs', rowHeight: 'h-9' },
  dense: { cellPadding: 'px-1.5 py-1', fontSize: 'text-xs', rowHeight: 'h-7' },
} as const;

// ---------------------------------------------------------------------------
// localStorage helpers (distinct keys from catalog)
// ---------------------------------------------------------------------------
const STORAGE_KEY_COLUMNS = 'inventory_table_columns';
const STORAGE_KEY_DENSITY = 'inventory_table_density';
const STORAGE_KEY_WIDTHS = 'inventory_table_column_widths';

function loadDensity(): TableDensity {
  if (typeof window === 'undefined') return 'compact';
  try {
    const s = localStorage.getItem(STORAGE_KEY_DENSITY);
    if (s && ['normal', 'compact', 'dense'].includes(s)) return s as TableDensity;
  } catch { /* noop */ }
  return 'compact';
}
function saveDensity(d: TableDensity) {
  try { localStorage.setItem(STORAGE_KEY_DENSITY, d); } catch { /* noop */ }
}

function loadWidths(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try { const s = localStorage.getItem(STORAGE_KEY_WIDTHS); return s ? JSON.parse(s) : {}; } catch { return {}; }
}
function saveWidths(w: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(w)); } catch { /* noop */ }
}

function loadColumns(): ColumnDef[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  try {
    const s = localStorage.getItem(STORAGE_KEY_COLUMNS);
    if (!s) return DEFAULT_COLUMNS;
    const parsed = JSON.parse(s) as ColumnDef[];
    const defaultMap = new Map(DEFAULT_COLUMNS.map(c => [c.key, c]));
    const storedMap = new Map(parsed.map(c => [c.key, c]));
    return DEFAULT_COLUMNS.map(d => {
      const stored = storedMap.get(d.key);
      return stored ? { ...d, ...stored, order: stored.order ?? d.order } : d;
    }).sort((a, b) => a.order - b.order);
  } catch { return DEFAULT_COLUMNS; }
}
function saveColumns(cols: ColumnDef[]) {
  try { localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(cols)); } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
function formatCost(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return '-';
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `R ${withSpaces}.${decPart}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface InventoryCatalogViewProps {
  isPopOut?: boolean;
  initialParams?: URLSearchParams;
}

export default function InventoryCatalogView({ isPopOut = false, initialParams }: InventoryCatalogViewProps) {
  const getInitial = useCallback(
    (key: string, fallback: string) => initialParams?.get(key) ?? fallback,
    [initialParams],
  );

  // Inventory store
  const {
    items,
    products,
    suppliers,
    locations: locationOptions,
    loading,
    error,
    fetchItems,
    fetchProducts,
    fetchSuppliers,
    fetchLocations,
    deleteProduct,
    clearError,
  } = useInventoryStore();
  const { addNotification } = useNotificationStore();

  // --- Filter state ---
  const [search, setSearch] = useState(() => getInitial('search', ''));
  const [supplierId, setSupplierId] = useState(() => getInitial('supplier_id', 'all'));
  const [categoryFilter, setCategoryFilter] = useState(() => getInitial('category', 'all'));
  const [statusFilter, setStatusFilter] = useState(() => getInitial('status', 'all'));
  const [locationFilter, setLocationFilter] = useState(() => getInitial('location_id', 'all'));
  const [priceMin, setPriceMin] = useState(() => getInitial('price_min', ''));
  const [priceMax, setPriceMax] = useState(() => getInitial('price_max', ''));

  // --- Table state ---
  const [columns, setColumns] = useState<ColumnDef[]>(() => loadColumns());
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [density, setDensity] = useState<TableDensity>(() => loadDensity());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => loadWidths());
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState({ left: 0, right: 0 });
  const [showGroupHeaders, setShowGroupHeaders] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortBy, setSortBy] = useState('supplier_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // --- Selection / dialog state ---
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAddMode, setShowAddMode] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingInventoryItemId, setEditingInventoryItemId] = useState<string | null>(null);
  const [editingProductHoldLocation, setEditingProductHoldLocation] = useState<string | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<InventoryItem | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // --- Persist ---
  useEffect(() => { saveColumns(columns); }, [columns]);
  useEffect(() => { saveDensity(density); }, [density]);
  useEffect(() => { saveWidths(columnWidths); }, [columnWidths]);

  // --- Data loading ---
  const loadData = useCallback(async () => {
    try {
      await Promise.all([fetchItems(), fetchProducts(), fetchSuppliers(), fetchLocations()]);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to load inventory data', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [fetchItems, fetchProducts, fetchSuppliers, fetchLocations, addNotification]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Enrichment (same logic as InventoryManagement) ---
  const enrichedItems = useMemo(() => {
    return items.map((item: InventoryItem) => {
      const normalizedRsp = Number((item as Record<string, unknown>).rsp ?? (item as Record<string, unknown>).sale_price ?? 0);
      const matchedProduct = products.find((p: Product) => p.id === (item as Record<string, unknown>).product_id);
      const baseProduct: Product = (matchedProduct || (item as Record<string, unknown>).product || {
        id: (item as Record<string, unknown>).product_id || item.id,
        supplier_id: (item as Record<string, unknown>).supplier?.id ?? (item as Record<string, unknown>).supplier_id ?? null,
        name: (item as Record<string, unknown>).product?.name || (item as Record<string, unknown>).name || 'Unknown Product',
        description: (item as Record<string, unknown>).product?.description || (item as Record<string, unknown>).description || '',
        category: (item as Record<string, unknown>).product?.category || (item as Record<string, unknown>).category || 'Uncategorized',
        sku: (item as Record<string, unknown>).product?.sku || (item as Record<string, unknown>).sku || (item as Record<string, unknown>).supplier_sku || '-',
        unit_of_measure: (item as Record<string, unknown>).product?.unit_of_measure || (item as Record<string, unknown>).unit || 'each',
        status: (item as Record<string, unknown>).status || 'active',
        unit_cost_zar: Number((item as Record<string, unknown>).cost_per_unit_zar ?? (item as Record<string, unknown>).cost_price ?? 0),
        unit_price_zar: normalizedRsp,
      }) as Product;

      const matchedSupplier = suppliers.find((s: Supplier) => s.id === (baseProduct as Record<string, unknown>).supplier_id);
      const baseSupplier: Supplier | undefined = (matchedSupplier || (item as Record<string, unknown>).supplier || ((item as Record<string, unknown>).supplier_name ? {
        id: (item as Record<string, unknown>).supplier?.id ?? (item as Record<string, unknown>).supplier_id ?? 'unknown',
        name: (item as Record<string, unknown>).supplier_name as string,
        status: ((item as Record<string, unknown>).supplier_status as string) || 'unknown',
      } : undefined)) as Supplier | undefined;

      const normalizedCost = Number((item as Record<string, unknown>).cost_per_unit_zar ?? (item as Record<string, unknown>).cost_price ?? (baseProduct as Record<string, unknown>).unit_cost_zar ?? 0);
      const normalizedStock = Number((item as Record<string, unknown>).current_stock ?? (item as Record<string, unknown>).currentStock ?? (item as Record<string, unknown>).stock_qty ?? 0);
      const normalizedValue = Number(
        (item as Record<string, unknown>).total_value_zar ??
        (item as Record<string, unknown>).totalValueZar ??
        (item as Record<string, unknown>).totalValue ??
        normalizedStock * normalizedCost,
      );
      const resolvedLocation = (typeof (item as Record<string, unknown>).location === 'string' && ((item as Record<string, unknown>).location as string).trim()) ||
        (typeof (baseProduct as Record<string, unknown>).location === 'string' && ((baseProduct as Record<string, unknown>).location as string).trim()) || undefined;
      const resolvedLocationId = (item as Record<string, unknown>).location_id ?? (baseProduct as Record<string, unknown>).location_id ?? '';

      const stockStatus = ((item as Record<string, unknown>).stock_status as string) || deriveStockStatus(
        normalizedStock,
        Number((item as Record<string, unknown>).reorder_point || 0),
        Number((item as Record<string, unknown>).max_stock_level || 0),
      );

      return {
        ...item,
        product: baseProduct,
        supplier: baseSupplier,
        cost_per_unit_zar: normalizedCost,
        total_value_zar: normalizedValue,
        current_stock: normalizedStock,
        supplier_name: baseSupplier?.name || ((item as Record<string, unknown>).supplier_name as string) || 'Unknown Supplier',
        supplier_status: baseSupplier?.status || ((item as Record<string, unknown>).supplier_status as string) || 'inactive',
        stock_status: stockStatus,
        rsp: normalizedRsp,
        selling_price: Number((item as Record<string, unknown>).selling_price ?? 0) || undefined,
        location: resolvedLocation,
        location_id: resolvedLocationId,
        reorder_point: Number((item as Record<string, unknown>).reorder_point || 0),
      };
    });
  }, [items, products, suppliers]);

  // --- Filtering ---
  const filteredItems = useMemo(() => {
    let result = enrichedItems;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        (item.product?.name ?? '').toLowerCase().includes(q) ||
        (item.product?.sku ?? '').toLowerCase().includes(q) ||
        (item.supplier_name ?? '').toLowerCase().includes(q),
      );
    }

    if (supplierId !== 'all') {
      result = result.filter(item => ((item as Record<string, unknown>).supplier_id ?? item.supplier?.id) === supplierId);
    }

    if (categoryFilter !== 'all') {
      result = result.filter(item => (item.product?.category ?? '').toLowerCase() === categoryFilter.toLowerCase());
    }

    if (statusFilter !== 'all') {
      result = result.filter(item => item.stock_status === statusFilter);
    }

    if (locationFilter !== 'all') {
      result = result.filter(item => {
        const id = String(item.location_id ?? '');
        const name = String(item.location ?? '');
        return id === locationFilter || name === locationFilter;
      });
    }

    if (priceMin) {
      const min = parseFloat(priceMin);
      if (Number.isFinite(min)) result = result.filter(item => item.cost_per_unit_zar >= min);
    }
    if (priceMax) {
      const max = parseFloat(priceMax);
      if (Number.isFinite(max)) result = result.filter(item => item.cost_per_unit_zar <= max);
    }

    return result;
  }, [enrichedItems, search, supplierId, categoryFilter, statusFilter, locationFilter, priceMin, priceMax]);

  // --- Sorting ---
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortBy) {
        case 'supplier_name': aVal = a.supplier_name ?? ''; bVal = b.supplier_name ?? ''; break;
        case 'sku': aVal = a.product?.sku ?? ''; bVal = b.product?.sku ?? ''; break;
        case 'name': aVal = a.product?.name ?? ''; bVal = b.product?.name ?? ''; break;
        case 'category': aVal = a.product?.category ?? ''; bVal = b.product?.category ?? ''; break;
        case 'location': aVal = a.location ?? ''; bVal = b.location ?? ''; break;
        case 'current_stock': aVal = a.current_stock; bVal = b.current_stock; break;
        case 'stock_status': aVal = a.stock_status ?? ''; bVal = b.stock_status ?? ''; break;
        case 'cost_ex_vat': aVal = a.cost_per_unit_zar; bVal = b.cost_per_unit_zar; break;
        case 'rsp': aVal = a.rsp; bVal = b.rsp; break;
        case 'selling_price': aVal = a.selling_price ?? a.rsp ?? 0; bVal = b.selling_price ?? b.rsp ?? 0; break;
        case 'value': aVal = a.total_value_zar; bVal = b.total_value_zar; break;
        default: break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [filteredItems, sortBy, sortDir]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  useEffect(() => { setPage(1); }, [search, supplierId, categoryFilter, statusFilter, locationFilter, priceMin, priceMax]);

  // --- Stats ---
  const stats = useMemo(() => {
    const totalValue = filteredItems.reduce((s, i) => s + (i.total_value_zar || 0), 0);
    const lowStockCount = filteredItems.filter(i => i.current_stock <= i.reorder_point && i.current_stock > 0).length;
    const outOfStockCount = filteredItems.filter(i => i.current_stock === 0).length;
    const criticalStockCount = filteredItems.filter(i => i.current_stock < 10 && i.current_stock > 0).length;
    return { totalValue, lowStockCount, outOfStockCount, criticalStockCount, totalItems: filteredItems.length };
  }, [filteredItems]);

  // --- Derived filter options ---
  const categories = useMemo(() => [...new Set(enrichedItems.map(i => i.product?.category).filter(Boolean))].sort() as string[], [enrichedItems]);
  const stockStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'overstocked'];
  const stockStatusLabels: Record<string, string> = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock', overstocked: 'Overstocked' };

  // --- Column visibility helpers ---
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

  const getColumnWidth = useCallback((col: ColumnDef) => columnWidths[col.key] || col.width || 100, [columnWidths]);
  const densityStyles = DENSITY_CONFIG[density];

  // --- Column groups ---
  const columnGroups = useMemo(() => {
    const groups: { group: string; label: string; colSpan: number; startIdx: number }[] = [];
    const groupLabels: Record<string, string> = { identity: 'Identity', classification: 'Classification', stock: 'Stock', pricing: 'Pricing', meta: 'Meta' };
    let currentGroup: string | undefined;
    let span = 0;
    let startIdx = 0;

    visibleColumns.forEach((col, idx) => {
      const g = col.group || 'other';
      if (g !== currentGroup) {
        if (currentGroup && span > 0) groups.push({ group: currentGroup, label: groupLabels[currentGroup] || currentGroup, colSpan: span, startIdx });
        currentGroup = g;
        span = 1;
        startIdx = idx;
      } else { span++; }
    });
    if (currentGroup && span > 0) groups.push({ group: currentGroup, label: groupLabels[currentGroup] || currentGroup, colSpan: span, startIdx });
    return groups;
  }, [visibleColumns]);

  // --- Scroll shadow tracking ---
  const handleScroll = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setScrollPosition({ left: scrollLeft, right: scrollWidth - clientWidth - scrollLeft });
    }
  }, []);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) { container.addEventListener('scroll', handleScroll); handleScroll(); return () => container.removeEventListener('scroll', handleScroll); }
  }, [handleScroll]);

  // --- Column resize ---
  const handleResizeStart = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    const startX = e.clientX;
    const column = columns.find(c => c.key === columnKey);
    const startWidth = columnWidths[columnKey] || column?.width || 100;
    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(column?.minWidth || 50, startWidth + delta);
      setColumnWidths(prev => ({ ...prev, [columnKey]: Math.min(newWidth, column?.maxWidth || 500) }));
    };
    const onUp = () => { setResizingColumn(null); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [columns, columnWidths]);

  // --- Sort key mapping ---
  const getSortKey = (columnKey: string): string => {
    const map: Record<string, string> = { supplier: 'supplier_name', sku: 'sku', name: 'name', category: 'category', location: 'location', current_stock: 'current_stock', stock_status: 'stock_status', cost_ex_vat: 'cost_ex_vat', rsp: 'rsp', selling_price: 'selling_price', value: 'value' };
    return map[columnKey] || columnKey;
  };

  // --- Pop out ---
  const handlePopOut = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (supplierId !== 'all') params.set('supplier_id', supplierId);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (locationFilter !== 'all') params.set('location_id', locationFilter);
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    const url = `/inventory/popout?${params.toString()}`;
    const w = Math.min(1920, window.screen.width - 100);
    const h = Math.min(1080, window.screen.height - 100);
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    window.open(url, 'inventory-popout', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no`);
  }, [search, supplierId, categoryFilter, statusFilter, locationFilter, priceMin, priceMax]);

  // --- Export CSV ---
  const handleExportCSV = useCallback(() => {
    const exportData = sortedItems.map(item => ({
      Supplier: item.supplier_name || 'Unknown',
      SKU: item.product?.sku || '-',
      Product: item.product?.name || 'Unknown Product',
      Category: item.product?.category || '-',
      Location: item.location || '-',
      'Current Stock': item.current_stock || 0,
      'Stock Status': stockStatusLabels[item.stock_status] || item.stock_status || '-',
      'Unit Cost': item.cost_per_unit_zar || 0,
      RSP: item.rsp || 0,
      'Selling Price': item.selling_price ?? item.rsp ?? 0,
      Value: item.total_value_zar || 0,
    }));
    if (exportData.length === 0) return;
    const headers = Object.keys(exportData[0]);
    const csv = [
      headers.join(','),
      ...exportData.map(row => headers.map(h => { const v = (row as Record<string, unknown>)[h]; return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v); }).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification({ type: 'success', title: 'Export complete', message: `Exported ${exportData.length} items to CSV` });
  }, [sortedItems, addNotification]);

  // --- Delete handler ---
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    try {
      await deleteProduct(productId);
      await fetchItems();
      addNotification({ type: 'success', title: 'Product deleted', message: 'Product has been successfully deleted' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to delete product', message: err instanceof Error ? err.message : 'Unknown error occurred' });
    }
  };

  // --- Bulk delete ---
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} products?`)) return;
    try {
      await Promise.all(Array.from(selectedItems).map(id => deleteProduct(id)));
      await fetchItems();
      addNotification({ type: 'success', title: 'Products deleted', message: `Successfully deleted ${selectedItems.size} products` });
      setSelectedItems(new Set());
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to delete products', message: err instanceof Error ? err.message : 'Unknown error occurred' });
    }
  };

  // --- Render header cell ---
  const renderHeaderCell = (column: ColumnDef & { _stickyLeft?: number }, index: number) => {
    const width = getColumnWidth(column);
    const isSticky = column.sticky === 'left' || column.sticky === 'right';
    const isResizing = resizingColumn === column.key;
    const className = cn(
      densityStyles.cellPadding, densityStyles.fontSize,
      'relative select-none whitespace-nowrap font-medium',
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      column.sortable && 'cursor-pointer hover:bg-muted/50',
      isSticky && 'sticky z-20 bg-background',
      column.sticky === 'right' && 'right-0',
      column.sticky === 'left' && scrollPosition.left > 0 && index === visibleColumns.filter(c => c.sticky === 'left').length - 1 && 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
      column.sticky === 'right' && scrollPosition.right > 0 && 'shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]',
    );
    const handleSort = () => {
      if (column.sortable) {
        const key = getSortKey(column.key);
        setSortBy(key);
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      }
    };
    const style: React.CSSProperties = { width: `${width}px`, minWidth: `${column.minWidth || 50}px`, maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined };
    if (column.sticky === 'left' && column._stickyLeft !== undefined) style.left = `${column._stickyLeft}px`;

    return (
      <TableHead key={column.key} className={className} onClick={handleSort} style={style}>
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="truncate">{column.label}</span>
          {column.sortable && sortBy === getSortKey(column.key) && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </div>
        {column.key !== 'actions' && (
          <div
            className={cn('absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50', isResizing && 'bg-primary')}
            onMouseDown={(e) => handleResizeStart(column.key, e)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </TableHead>
    );
  };

  // --- Render body cell ---
  const renderBodyCell = (column: ColumnDef & { _stickyLeft?: number }, row: typeof enrichedItems[0], colIndex: number) => {
    const width = getColumnWidth(column);
    const isSticky = column.sticky === 'left' || column.sticky === 'right';
    const baseClassName = cn(
      densityStyles.cellPadding, densityStyles.fontSize, 'whitespace-nowrap',
      column.align === 'right' && 'text-right',
      column.align === 'center' && 'text-center',
      isSticky && 'sticky z-10 bg-background group-hover:bg-muted/50',
      column.sticky === 'right' && 'right-0',
      column.sticky === 'left' && scrollPosition.left > 0 && colIndex === visibleColumns.filter(c => c.sticky === 'left').length - 1 && 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
      column.sticky === 'right' && scrollPosition.right > 0 && 'shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]',
    );
    const cellStyle: React.CSSProperties = { width: `${width}px`, minWidth: `${column.minWidth || 50}px`, maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined };
    if (column.sticky === 'left' && column._stickyLeft !== undefined) cellStyle.left = `${column._stickyLeft}px`;

    switch (column.key) {
      case 'supplier':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <Tooltip><TooltipTrigger asChild>
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="truncate font-medium">{row.supplier_name || 'Unknown Supplier'}</span>
                {row.supplier_status !== 'active' && <Badge variant="secondary" className="text-[10px] px-1">inactive</Badge>}
              </div>
            </TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>{row.supplier_name || 'Unknown Supplier'}</p></TooltipContent></Tooltip>
          </TableCell>
        );
      case 'sku':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground font-mono')} style={cellStyle}>
            <span className="truncate">{row.product?.sku || '-'}</span>
          </TableCell>
        );
      case 'name':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <Tooltip><TooltipTrigger asChild><span className="block truncate">{row.product?.name || 'Unknown Product'}</span></TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md"><p>{row.product?.name || 'Unknown Product'}</p></TooltipContent></Tooltip>
          </TableCell>
        );
      case 'description':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground')} style={cellStyle}>
            <span className="block truncate">{row.product?.description || '-'}</span>
          </TableCell>
        );
      case 'category':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground')} style={cellStyle}>
            {row.product?.category ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{row.product.category.replace('_', ' ')}</Badge> : '-'}
          </TableCell>
        );
      case 'tags': {
        const tags: Array<{ name: string; tag_id?: string }> = (() => {
          const raw = (row.product as Record<string, unknown>)?.tags;
          if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
          if (typeof raw[0] === 'string') return (raw as string[]).map(t => ({ name: t, tag_id: t }));
          return raw as Array<{ name: string; tag_id?: string }>;
        })();
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            {tags.length > 0 ? (
              <div className="flex flex-nowrap gap-0.5 overflow-hidden">
                {tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={tag.tag_id || tag.name || idx} variant="secondary" className="text-[10px] px-1 py-0 truncate max-w-[60px]">{tag.name || tag.tag_id}</Badge>
                ))}
                {tags.length > 2 && <Badge variant="outline" className="text-[10px] px-1 py-0">+{tags.length - 2}</Badge>}
              </div>
            ) : <span className="text-muted-foreground">-</span>}
          </TableCell>
        );
      }
      case 'location':
        return (
          <TableCell key={column.key} className={cn(baseClassName, 'text-muted-foreground')} style={cellStyle}>
            <span className="truncate">{row.location || '-'}</span>
          </TableCell>
        );
      case 'current_stock':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <span className={cn(row.current_stock === 0 && 'text-red-600 font-semibold', row.current_stock > 0 && row.current_stock <= row.reorder_point && 'text-amber-600 font-semibold')}>
              {row.current_stock}
            </span>
          </TableCell>
        );
      case 'stock_status': {
        const getColor = (s: string) => {
          if (s === 'in_stock') return 'bg-green-500/10 text-green-700 border-green-500/20';
          if (s === 'low_stock') return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
          if (s === 'out_of_stock') return 'bg-red-500/10 text-red-700 border-red-500/20';
          if (s === 'overstocked') return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
          return '';
        };
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <Badge variant="outline" className={cn(getColor(row.stock_status), 'text-[10px] px-1.5 py-0')}>
              {stockStatusLabels[row.stock_status] || row.stock_status || '-'}
            </Badge>
          </TableCell>
        );
      }
      case 'reorder_point':
        return <TableCell key={column.key} className={cn(baseClassName, 'font-mono text-muted-foreground')} style={cellStyle}>{row.reorder_point}</TableCell>;
      case 'cost_ex_vat':
        return <TableCell key={column.key} className={cn(baseClassName, 'font-mono')} style={cellStyle}>{formatCost(row.cost_per_unit_zar)}</TableCell>;
      case 'rsp':
        return <TableCell key={column.key} className={cn(baseClassName, 'font-mono')} style={cellStyle}>{formatCost(row.rsp)}</TableCell>;
      case 'selling_price':
        return <TableCell key={column.key} className={cn(baseClassName, 'font-mono')} style={cellStyle}>{formatCost(row.selling_price ?? row.rsp ?? 0)}</TableCell>;
      case 'value':
        return <TableCell key={column.key} className={cn(baseClassName, 'font-mono')} style={cellStyle}>{formatCost(row.total_value_zar)}</TableCell>;
      case 'actions':
        return (
          <TableCell key={column.key} className={baseClassName} style={cellStyle}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={density === 'dense' ? 'h-6 w-6' : 'h-7 w-7'} onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className={density === 'dense' ? 'h-3 w-3' : 'h-4 w-4'} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingProduct(row.product || null)}>
                  <Eye className="mr-2 h-4 w-4" />View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setEditingProduct(row.product || null);
                  setEditingInventoryItemId(typeof row.id === 'string' ? row.id : row.id?.toString?.() ?? null);
                  setEditingProductHoldLocation((typeof row.location_id === 'string' && row.location_id) || (typeof row.location === 'string' ? row.location : null));
                }}>
                  <Edit className="mr-2 h-4 w-4" />Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAdjustingStock(row as unknown as InventoryItem)}>
                  <BarChart3 className="mr-2 h-4 w-4" />Adjust Stock
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDeleteProduct(row.id)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />Delete Product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        );
      default:
        return <TableCell key={column.key} className={baseClassName} style={cellStyle}>-</TableCell>;
    }
  };

  // --- Pagination renderer ---
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, sortedItems.length);
    return (
      <div className="mt-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Showing {start} to {end} of {sortedItems.length} items</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return <Button key={pn} variant={page === pn ? 'default' : 'outline'} size="sm" className="w-9" onClick={() => setPage(pn)}>{pn}</Button>;
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      </div>
    );
  };

  // --- Group header row colors ---
  const groupColors: Record<string, string> = {
    identity: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    classification: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    stock: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    pricing: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    meta: 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400',
  };

  return (
    <Card className={isPopOut ? 'h-full' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Management
          {isPopOut && <Badge variant="outline" className="ml-2">Pop-out View</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className={isPopOut ? 'h-[calc(100%-5rem)] flex flex-col' : ''}>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex items-center justify-between">
              <span>{typeof error === 'string' ? error : 'An inventory error occurred'}</span>
              <Button variant="outline" size="sm" onClick={clearError}>Dismiss</Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics row — SPP style */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">TOTAL VALUE</p>
                  <p className="mt-1 text-2xl font-bold">{loading ? <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" /> : formatCost(stats.totalValue)}</p>
                </div>
                <DollarSign className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">LOW STOCK ITEMS</p>
                  <p className="mt-1 text-2xl font-bold">{loading ? <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" /> : stats.lowStockCount.toLocaleString()}</p>
                </div>
                <AlertTriangle className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">OUT OF STOCK</p>
                  <p className="mt-1 text-2xl font-bold">{loading ? <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" /> : stats.outOfStockCount.toLocaleString()}</p>
                </div>
                <AlertCircle className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">CRITICAL STOCK</p>
                  <p className="mt-1 text-2xl font-bold">{loading ? <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" /> : stats.criticalStockCount.toLocaleString()}</p>
                </div>
                <Activity className="text-muted-foreground h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inline filter bar — single row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input placeholder="Search by name or SKU" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <SearchableSupplierSelect
            suppliers={suppliers.filter((s: Supplier) => s && s.id).map((s: Supplier) => ({ id: s.id, supplier_id: s.id, name: s.name }))}
            value={supplierId}
            onValueChange={setSupplierId}
            placeholder="All suppliers"
            showAllOption={true}
            allOptionValue="all"
            className="w-[220px]"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {stockStatuses.map(s => <SelectItem key={s} value={s}>{stockStatusLabels[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locationOptions.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Min price" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="w-24" />
          <Input placeholder="Max price" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="w-24" />
          <Button variant="outline" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={loading || sortedItems.length === 0}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
          <div className="text-muted-foreground ml-auto text-sm">{sortedItems.length.toLocaleString()} items</div>
        </div>

        {/* Bulk actions bar */}
        {selectedItems.size > 0 && (
          <div className="mb-2 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 p-3">
            <span className="text-sm font-medium">{selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash2 className="mr-2 h-4 w-4" />Delete Selected</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        {/* Table toolbar — Manage Columns, Pop Out, Group Headers, density, Add Product */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setColumnDialogOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />Manage Columns
            </Button>
            {!isPopOut && (
              <Button variant="outline" size="sm" onClick={handlePopOut}>
                <ExternalLink className="mr-2 h-4 w-4" />Pop Out
              </Button>
            )}
            <Tooltip><TooltipTrigger asChild>
              <Button variant={showGroupHeaders ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowGroupHeaders(!showGroupHeaders)} className="h-8">Group Headers</Button>
            </TooltipTrigger><TooltipContent>Toggle column group headers</TooltipContent></Tooltip>
            {Object.keys(columnWidths).length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setColumnWidths({})} className="text-muted-foreground">Reset widths</Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Density toggle */}
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              <Tooltip><TooltipTrigger asChild>
                <Button variant={density === 'normal' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setDensity('normal')}><Rows3 className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent>Normal density</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button variant={density === 'compact' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setDensity('compact')}><Rows2 className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent>Compact density</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button variant={density === 'dense' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setDensity('dense')}><AlignJustify className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent>Dense (maximum data)</TooltipContent></Tooltip>
            </div>
            <Button size="sm" onClick={() => setShowAddMode(true)}>
              <Plus className="mr-2 h-4 w-4" />Add Product
            </Button>
          </div>
        </div>

        <ColumnManagementDialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen} columns={columns} onColumnsChange={setColumns} defaultColumns={DEFAULT_COLUMNS} />

        {/* Table */}
        <div
          ref={tableContainerRef}
          className={cn(
            'overflow-auto rounded-md border relative',
            isPopOut ? 'flex-1' : 'max-h-[70vh]',
            resizingColumn && 'cursor-col-resize select-none',
          )}
        >
          <TooltipProvider delayDuration={300}>
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 z-30 bg-background">
                {showGroupHeaders && (
                  <TableRow className="h-6 border-b-0">
                    {columnGroups.map((group, idx) => {
                      const firstCol = visibleColumns[group.startIdx];
                      const lastCol = visibleColumns[group.startIdx + group.colSpan - 1];
                      const isLeftSticky = firstCol?.sticky === 'left';
                      const isRightSticky = lastCol?.sticky === 'right';
                      return (
                        <TableHead
                          key={`group-${group.group}-${idx}`}
                          colSpan={group.colSpan}
                          className={cn(
                            'text-center text-[10px] font-semibold uppercase tracking-wider py-1 px-1',
                            groupColors[group.group] || 'bg-muted',
                            isLeftSticky && 'sticky left-0 z-20',
                            isRightSticky && 'sticky right-0 z-20',
                          )}
                        >
                          {group.label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                )}
                <TableRow className={densityStyles.rowHeight}>
                  {visibleColumns.map((col, idx) => renderHeaderCell(col, idx))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map(row => (
                  <TableRow key={row.id} className={cn('cursor-pointer group', densityStyles.rowHeight, 'hover:bg-muted/50')}>
                    {visibleColumns.map((col, colIdx) => renderBodyCell(col, row, colIdx))}
                  </TableRow>
                ))}
                {paginatedItems.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="text-muted-foreground py-12 text-center text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="text-muted-foreground/50 h-12 w-12" />
                        <p className="font-medium">No inventory items found</p>
                        <p className="text-muted-foreground text-xs">Try adjusting your search or filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {loading && paginatedItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span className="text-muted-foreground text-sm">Loading inventory...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>

        {renderPagination()}

        {/* Dialogs */}
        <AddProductsModeDialog open={showAddMode} onOpenChange={setShowAddMode} onChoose={mode => { setShowAddMode(false); if (mode === 'single') setShowAddProduct(true); if (mode === 'multi') setShowMultiSelect(true); }} />
        <AddProductDialog open={showAddProduct} onOpenChange={setShowAddProduct} />
        <MultiProductSelectorDialog open={showMultiSelect} onOpenChange={setShowMultiSelect} />
        {editingProduct && editingInventoryItemId && (
          <EditProductDialog
            product={editingProduct}
            inventoryItemId={editingInventoryItemId}
            open={!!editingProduct}
            holdLocation={editingProductHoldLocation ?? undefined}
            locations={locationOptions}
            onOpenChange={open => { if (!open) { setEditingProduct(null); setEditingInventoryItemId(null); setEditingProductHoldLocation(null); } }}
          />
        )}
        {adjustingStock && <StockAdjustmentDialog inventoryItem={adjustingStock} open={!!adjustingStock} onOpenChange={open => !open && setAdjustingStock(null)} />}
        {viewingProduct && <ProductProfileBySKU product={viewingProduct} open={!!viewingProduct} onOpenChange={open => !open && setViewingProduct(null)} />}
      </CardContent>
    </Card>
  );
}
