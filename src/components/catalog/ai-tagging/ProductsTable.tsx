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
  TrendingUp,
  Tags,
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
  ai_tagging_status: string;
  ai_tag_confidence: number | null;
  ai_tag_provider: string | null;
  ai_tagged_at: string | null;
  assigned_tags?: Array<{ tag_id: string; tag_name: string; tag_category: string | null }> | null;
}

interface ProductsTableProps {
  refreshTrigger?: number;
}

interface TaggingStatsOverview {
  total_products: number;
  tagged_count: number;
  tagged_percentage: number;
  pending_count: number;
  pending_review_count: number;
  failed_count: number;
  avg_confidence: number | null;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'sku', label: 'SKU', visible: true, order: 1, align: 'left', sortable: false },
  { key: 'name', label: 'Product Name', visible: true, order: 2, align: 'left', sortable: true },
  { key: 'supplier', label: 'Supplier', visible: true, order: 3, align: 'left', sortable: true },
  { key: 'tags', label: 'Tags', visible: true, order: 4, align: 'left', sortable: false },
  { key: 'status', label: 'Status', visible: true, order: 5, align: 'left', sortable: false },
  {
    key: 'confidence',
    label: 'Confidence',
    visible: true,
    order: 6,
    align: 'left',
    sortable: true,
  },
  { key: 'provider', label: 'Provider', visible: true, order: 7, align: 'left', sortable: false },
  { key: 'date', label: 'Date', visible: true, order: 8, align: 'left', sortable: true },
];

export const TagProductsTable = memo(function TagProductsTable({
  refreshTrigger,
}: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confidenceMin, setConfidenceMin] = useState<string>('');
  const [confidenceMax, setConfidenceMax] = useState<string>('');
  const [sortBy, setSortBy] = useState('tagged_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [stats, setStats] = useState<TaggingStatsOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ supplier_id: string; name: string }[]>([]);

  const { columns, setColumns, visibleColumns } = useColumnManagement(
    'ai_tagging_products_table_columns',
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
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (confidenceMin) params.set('confidence_min', confidenceMin);
      if (confidenceMax) params.set('confidence_max', confidenceMax);

      const response = await fetch(buildApiUrl(`/api/tag/ai-tagging/products?${params}`));

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(
          `Failed to fetch products: ${response.status} ${response.statusText}`,
          errorText
        );
        setProducts([]);
        setTotal(0);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      } else {
        console.error('API returned unsuccessful response:', data.message || 'Unknown error');
        setProducts([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch tagged products:', error);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    limit,
    page,
    search,
    supplierId,
    statusFilter,
    confidenceMin,
    confidenceMax,
    sortBy,
    sortDir,
  ]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/api/tag/ai-tagging/stats`));
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch tagging stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const supplierRes = await fetch(buildApiUrl('/api/catalog/suppliers'));
        const supplierJson = await supplierRes.json();
        if (supplierJson.success) {
          setSuppliers(supplierJson.data || []);
        }
      } catch (e) {
        console.error('Failed to load supplier list:', e);
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
    if (confidence === null || confidence === undefined)
      return <span className="text-muted-foreground">-</span>;

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

  const getSortKey = (columnKey: string): string => {
    const sortMap: Record<string, string> = {
      name: 'name',
      supplier: 'supplier',
      confidence: 'confidence',
      date: 'tagged_at',
    };
    return sortMap[columnKey] || 'tagged_at';
  };

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
        case 'tags':
          return (
            <TableCell key={column.key} className={cn(className, 'text-sm')}>
              {product.assigned_tags && product.assigned_tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {product.assigned_tags.slice(0, 3).map(tag => (
                    <Badge key={tag.tag_id} variant="outline" className="text-xs">
                      {tag.tag_name}
                    </Badge>
                  ))}
                  {product.assigned_tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{product.assigned_tags.length - 3}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">No tags</span>
              )}
            </TableCell>
          );
        case 'status':
          return (
            <TableCell key={column.key} className={className}>
              {getStatusBadge(product.ai_tagging_status)}
            </TableCell>
          );
        case 'confidence':
          return (
            <TableCell key={column.key} className={className}>
              {getConfidenceBadge(product.ai_tag_confidence)}
            </TableCell>
          );
        case 'provider':
          return (
            <TableCell key={column.key} className={cn(className, 'text-muted-foreground text-xs')}>
              {product.ai_tag_provider || '-'}
            </TableCell>
          );
        case 'date':
          return (
            <TableCell key={column.key} className={cn(className, 'text-muted-foreground text-xs')}>
              {product.ai_tagged_at ? new Date(product.ai_tagged_at).toLocaleDateString() : '-'}
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
          <Tags className="h-5 w-5" />
          AI Tagged Products
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                  <p className="text-muted-foreground text-sm">TAGGED</p>
                  <p className="mt-1 text-2xl font-bold">
                    {statsLoading ? (
                      <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
                    ) : (
                      `${stats?.tagged_count.toLocaleString() || '0'} (${stats?.tagged_percentage.toFixed(1) || '0'}%)`
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
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <LabelInput
              label="Search Products"
              value={search}
              onChange={setSearch}
              placeholder="Search by SKU or name..."
            />
          </div>
          <div className="flex-1">
            <SearchableSupplierSelect
              suppliers={suppliers.map(supplier => ({
                id: supplier.supplier_id,
                supplier_id: supplier.supplier_id,
                name: supplier.name,
              }))}
              value={supplierId}
              onValueChange={setSupplierId}
              placeholder="All Suppliers"
              showAllOption={true}
              allOptionValue="all"
            />
          </div>
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchProducts()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="icon" onClick={() => setColumnDialogOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <Input
            type="number"
            placeholder="Min confidence"
            value={confidenceMin}
            onChange={e => setConfidenceMin(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max confidence"
            value={confidenceMax}
            onChange={e => setConfidenceMax(e.target.value)}
          />
        </div>

        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>{visibleColumns.map(renderHeaderCell)}</TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="text-muted-foreground py-8 text-center"
                  >
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No products found with the current filters.
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

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Select value={limit.toString()} onValueChange={value => setLimit(parseInt(value, 10))}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <StandardPagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>

        <ColumnManagementDialog
          open={columnDialogOpen}
          onOpenChange={setColumnDialogOpen}
          columns={columns}
          onColumnsChange={setColumns}
        />
      </CardContent>
    </Card>
  );
});

function LabelInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
