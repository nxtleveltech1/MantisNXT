'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSupplierSelect } from '@/components/shared/SearchableSupplierSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Settings2,
  RefreshCw,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import {
  ColumnManagementDialog,
  type ColumnDef,
} from '@/components/catalog/ColumnManagementDialog';
import { useColumnManagement } from '@/hooks/useColumnManagement';
import { StandardPagination } from '@/components/shared/StandardPagination';
import { cn } from '@/lib/utils';
import { buildApiUrl } from '@/lib/utils/api-url';

interface Product {
  supplier_product_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  supplier_name: string;
  category_name: string | null;
  proposed_category_name?: string | null;
  proposed_category_status?: string | null;
  ai_categorization_status: string;
  ai_confidence: number | null;
  ai_provider: string | null;
  ai_categorized_at: string | null;
}

interface ProductsTableProps {
  refreshTrigger?: number;
}

interface Stats {
  total_products: number;
  categorized_count: number;
  categorized_percentage: number;
  pending_count: number;
  pending_review_count: number;
  failed_count: number;
  avg_confidence: number | null;
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
}

// Default column configuration
const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'sku', label: 'SKU', visible: true, order: 1, align: 'left', sortable: false },
  { key: 'name', label: 'Product Name', visible: true, order: 2, align: 'left', sortable: true },
  { key: 'supplier', label: 'Supplier', visible: true, order: 3, align: 'left', sortable: true },
  { key: 'category', label: 'Category', visible: true, order: 4, align: 'left', sortable: false },
  { key: 'proposed', label: 'Proposed', visible: true, order: 5, align: 'left', sortable: false },
  { key: 'status', label: 'Status', visible: true, order: 6, align: 'left', sortable: false },
  {
    key: 'confidence',
    label: 'Confidence',
    visible: true,
    order: 7,
    align: 'left',
    sortable: true,
  },
  { key: 'provider', label: 'Provider', visible: true, order: 8, align: 'left', sortable: false },
  { key: 'date', label: 'Date', visible: true, order: 9, align: 'left', sortable: true },
];

export const ProductsTable = memo(function ProductsTable({ refreshTrigger }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confidenceMin, setConfidenceMin] = useState<string>('');
  const [confidenceMax, setConfidenceMax] = useState<string>('');
  const [sortBy, setSortBy] = useState('categorized_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ supplier_id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<
    Array<{ category_id?: string; id?: string; name: string }>
  >([]);

  // Column management
  const { columns, setColumns, visibleColumns } = useColumnManagement(
    'ai_categorization_products_table_columns',
    DEFAULT_COLUMNS
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        sort_by: sortBy,
        sort_order: sortDir,
      });

      if (search) params.set('search', search);
      if (supplierId && supplierId !== 'all') params.set('supplier_id', supplierId);
      if (categoryId && categoryId !== 'all') {
        if (categoryId.startsWith('raw:')) {
          // Handle raw categories if needed
        } else {
          params.set('category_id', categoryId);
        }
      }
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (confidenceMin) params.set('confidence_min', confidenceMin);
      if (confidenceMax) params.set('confidence_max', confidenceMax);

      const response = await fetch(
        buildApiUrl(`/api/category/ai-categorization/products?${params}`)
      );
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [
    limit,
    page,
    search,
    supplierId,
    categoryId,
    statusFilter,
    confidenceMin,
    confidenceMax,
    sortBy,
    sortDir,
  ]);

  // Fetch stats/metrics
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/api/category/ai-categorization/stats`));
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load filter data (suppliers and categories)
  useEffect(() => {
    (async () => {
      try {
        const [sres, cres] = await Promise.all([
          fetch(buildApiUrl('/api/catalog/suppliers')),
          fetch(buildApiUrl('/api/catalog/categories')),
        ]);
        const sjson = await sres.json();
        const cjson = await cres.json();
        if (sjson.success) setSuppliers(sjson.data || []);
        if (Array.isArray(cjson)) {
          setCategories(cjson);
        } else if (cjson.success) {
          setCategories(cjson.data || []);
        }
      } catch (e) {
        console.error('Failed to load filter data:', e);
      }
    })();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshTrigger]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            Completed
          </Badge>
        );
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'pending_review':
        return (
          <Badge variant="default" className="bg-amber-500">
            Pending Review
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default" className="bg-blue-500">
            Processing
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }, []);

  const getConfidenceBadge = useCallback((confidence: number | null) => {
    if (!confidence) return <span className="text-muted-foreground">-</span>;

    const percentage = (confidence * 100).toFixed(0);
    if (confidence >= 0.8) {
      return (
        <Badge variant="default" className="bg-green-500">
          {percentage}%
        </Badge>
      );
    }
    if (confidence >= 0.6) {
      return <Badge variant="secondary">{percentage}%</Badge>;
    }
    return <Badge variant="destructive">{percentage}%</Badge>;
  }, []);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // Helper to get sort key for a column
  const getSortKey = (columnKey: string): string => {
    const sortMap: Record<string, string> = {
      name: 'name_from_supplier',
      supplier: 'supplier_name',
      confidence: 'ai_confidence',
      date: 'ai_categorized_at',
    };
    return sortMap[columnKey] || columnKey;
  };

  // Helper to render table header cell
  const renderHeaderCell = useCallback((column: ColumnDef) => {
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
  }, []);

  // Helper to render table body cell
  const renderBodyCell = useCallback(
    (column: ColumnDef, product: Product) => {
      const className = cn(
        column.align === 'right' && 'text-right',
        column.align === 'center' && 'text-center'
      );

      switch (column.key) {
        case 'sku':
          return (
            <TableCell key={column.key} className={cn(className, 'font-mono text-xs')}>
              {product.supplier_sku}
            </TableCell>
          );
        case 'name':
          return (
            <TableCell key={column.key} className={cn(className, 'max-w-xs truncate')}>
              {product.name_from_supplier}
            </TableCell>
          );
        case 'supplier':
          return (
            <TableCell key={column.key} className={cn(className, 'text-sm')}>
              {product.supplier_name}
            </TableCell>
          );
        case 'category':
          return (
            <TableCell key={column.key} className={cn(className, 'text-sm')}>
              {product.category_name || (
                <span className="text-muted-foreground">Uncategorized</span>
              )}
            </TableCell>
          );
        case 'proposed':
          return (
            <TableCell key={column.key} className={cn(className, 'text-sm')}>
              {product.proposed_category_name ? (
                <span className="text-amber-600 italic dark:text-amber-400">
                  {product.proposed_category_name}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          );
        case 'status':
          return (
            <TableCell key={column.key} className={className}>
              {getStatusBadge(product.ai_categorization_status)}
            </TableCell>
          );
        case 'confidence':
          return (
            <TableCell key={column.key} className={className}>
              {getConfidenceBadge(product.ai_confidence)}
            </TableCell>
          );
        case 'provider':
          return (
            <TableCell key={column.key} className={cn(className, 'text-muted-foreground text-xs')}>
              {product.ai_provider || '-'}
            </TableCell>
          );
        case 'date':
          return (
            <TableCell key={column.key} className={cn(className, 'text-muted-foreground text-xs')}>
              {product.ai_categorized_at
                ? new Date(product.ai_categorized_at).toLocaleDateString()
                : '-'}
            </TableCell>
          );
        default:
          return (
            <TableCell key={column.key} className={className}>
              -
            </TableCell>
          );
      }
    },
    [getStatusBadge, getConfidenceBadge]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          AI Categorized Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">TOTAL PRODUCTS</p>
                  <p className="mt-1 text-2xl font-bold">
                    {statsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      stats?.total_products.toLocaleString() || '0'
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
                  <p className="text-muted-foreground text-sm">CATEGORIZED</p>
                  <p className="mt-1 text-2xl font-bold">
                    {statsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      `${stats?.categorized_count.toLocaleString() || '0'} (${stats?.categorized_percentage.toFixed(1) || '0'}%)`
                    )}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">PENDING</p>
                  <p className="mt-1 text-2xl font-bold">
                    {statsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      stats?.pending_count.toLocaleString() || '0'
                    )}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">AVG CONFIDENCE</p>
                  <p className="mt-1 text-2xl font-bold">
                    {statsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : stats?.avg_confidence !== null && stats?.avg_confidence !== undefined ? (
                      `${(stats.avg_confidence * 100).toFixed(0)}%`
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Bar */}
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Min confidence"
            value={confidenceMin}
            onChange={e => setConfidenceMin(e.target.value)}
            className="w-32"
            type="number"
            min="0"
            max="1"
            step="0.01"
          />
          <Input
            placeholder="Max confidence"
            value={confidenceMax}
            onChange={e => setConfidenceMax(e.target.value)}
            className="w-32"
            type="number"
            min="0"
            max="1"
            step="0.01"
          />
          <Button variant="outline" onClick={() => fetchProducts()} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <div className="text-muted-foreground ml-auto text-sm">
            {total.toLocaleString()} items
          </div>
        </div>

        {/* Column Management */}
        <div className="mb-2 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setColumnDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage Columns
          </Button>
          <ColumnManagementDialog
            open={columnDialogOpen}
            onOpenChange={setColumnDialogOpen}
            columns={columns}
            onColumnsChange={setColumns}
            defaultColumns={DEFAULT_COLUMNS}
          />
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>{visibleColumns.map(column => renderHeaderCell(column))}</TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="py-8 text-center">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map(product => (
                  <TableRow key={product.supplier_product_id}>
                    {visibleColumns.map(column => renderBodyCell(column, product))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <StandardPagination
          page={page}
          pageCount={pageCount}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </CardContent>
    </Card>
  );
});
