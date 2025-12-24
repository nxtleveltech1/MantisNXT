'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  X,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { CustomerTable } from '@/components/customers/CustomerTable';
import type { ColumnDefinition } from '@/components/customers/ColumnSelector';
import { ColumnSelector } from '@/components/customers/ColumnSelector';
import type { FilterValue } from '@/components/customers/FilterPanel';
import { FilterPanel } from '@/components/customers/FilterPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ExportColumn } from '@/lib/utils/export';
import { ExportUtils } from '@/lib/utils/export';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  segment: string | null;
  status: string | null;
  lifetime_value: number | null;
  acquisition_date: string | null;
  last_interaction_date: string | null;
  tags: string[] | null;
  created_at: string;
}

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { id: 'name', label: 'Name', defaultVisible: true },
  { id: 'email', label: 'Email', defaultVisible: true },
  { id: 'phone', label: 'Phone', defaultVisible: false },
  { id: 'company', label: 'Company', defaultVisible: true },
  { id: 'segment', label: 'Segment', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'lifetime_value', label: 'Lifetime Value', defaultVisible: true },
  { id: 'acquisition_date', label: 'Acquisition Date', defaultVisible: false },
  { id: 'last_interaction_date', label: 'Last Interaction', defaultVisible: true },
  { id: 'tags', label: 'Tags', defaultVisible: false },
];

const QUICK_FILTERS = [
  { id: 'active', label: 'Active Customers', filter: { status: ['active'] } },
  { id: 'high_value', label: 'High Value (>$20k)', filter: { lifetimeValueMin: 20000 } },
  { id: 'recent', label: 'Recent Activity (30 days)', filter: {} },
];

/**
 * Customers Page
 *
 * Completely redesigned customer management interface
 * Features:
 * - Advanced data table with TanStack Table
 * - Column show/hide and reordering
 * - Multi-column sorting
 * - Advanced filtering (segment, status, value, dates)
 * - Global search with debouncing
 * - Quick filter pills
 * - Summary statistics with visual indicators
 * - Export to CSV/Excel
 * - Pagination with size selector
 * - Responsive design (mobile/tablet/desktop)
 * - Loading states and error handling
 * - Optimistic UI updates
 */
export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<FilterValue>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMN_DEFINITIONS.filter(col => col.defaultVisible).map(col => col.id)
  );
  const [refreshing, setRefreshing] = useState(false);

  // Load column preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customerListColumns');
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved columns:', e);
      }
    }
  }, []);

  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem('customerListColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch customers with server-side search
  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearch]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const response = await fetch(`/api/v1/customers?limit=1000${searchParam}`);
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data);
      } else {
        toast.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Error loading customers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
    toast.success('Customers refreshed');
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/customers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        toast.success('Customer deleted successfully');
      } else {
        toast.error('Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Error deleting customer');
    }
  };

  // Apply filters (search is now handled server-side)
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Apply segment filter
    if (filters.segment && filters.segment.length > 0) {
      result = result.filter(c => c.segment && filters.segment!.includes(c.segment));
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter(c => c.status && filters.status!.includes(c.status));
    }

    // Apply lifetime value range
    if (filters.lifetimeValueMin !== undefined) {
      result = result.filter(c => (c.lifetime_value || 0) >= filters.lifetimeValueMin!);
    }
    if (filters.lifetimeValueMax !== undefined) {
      result = result.filter(c => (c.lifetime_value || 0) <= filters.lifetimeValueMax!);
    }

    // Apply acquisition date range
    if (filters.acquisitionDateFrom) {
      result = result.filter(
        c =>
          c.acquisition_date &&
          new Date(c.acquisition_date) >= new Date(filters.acquisitionDateFrom!)
      );
    }
    if (filters.acquisitionDateTo) {
      result = result.filter(
        c =>
          c.acquisition_date && new Date(c.acquisition_date) <= new Date(filters.acquisitionDateTo!)
      );
    }

    // Apply last interaction date range
    if (filters.lastInteractionFrom) {
      result = result.filter(
        c =>
          c.last_interaction_date &&
          new Date(c.last_interaction_date) >= new Date(filters.lastInteractionFrom!)
      );
    }
    if (filters.lastInteractionTo) {
      result = result.filter(
        c =>
          c.last_interaction_date &&
          new Date(c.last_interaction_date) <= new Date(filters.lastInteractionTo!)
      );
    }

    return result;
  }, [customers, debouncedSearch, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const totalValue = customers.reduce((sum, c) => sum + (c.lifetime_value || 0), 0);
    const avgValue = total > 0 ? totalValue / total : 0;

    const segments = customers.reduce(
      (acc, c) => {
        const seg = c.segment || 'unknown';
        acc[seg] = (acc[seg] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      active,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      totalValue,
      avgValue,
      segments,
    };
  }, [customers]);

  // Export handlers
  const handleExportCSV = () => {
    const exportColumns: ExportColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'segment', label: 'Segment' },
      { key: 'status', label: 'Status' },
      {
        key: 'lifetime_value',
        label: 'Lifetime Value',
        format: v => ExportUtils.formatCurrency(v),
      },
      {
        key: 'acquisition_date',
        label: 'Acquisition Date',
        format: v => ExportUtils.formatDate(v),
      },
      {
        key: 'last_interaction_date',
        label: 'Last Interaction',
        format: v => ExportUtils.formatDate(v),
      },
      {
        key: 'tags',
        label: 'Tags',
        format: v => ExportUtils.formatArray(v),
      },
    ];

    ExportUtils.exportToCSV(filteredCustomers, exportColumns, 'customers');
    toast.success('Customers exported to CSV');
  };

  const handleExportExcel = () => {
    const exportColumns: ExportColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'segment', label: 'Segment' },
      { key: 'status', label: 'Status' },
      {
        key: 'lifetime_value',
        label: 'Lifetime Value',
        format: v => ExportUtils.formatCurrency(v),
      },
      {
        key: 'acquisition_date',
        label: 'Acquisition Date',
        format: v => ExportUtils.formatDate(v),
      },
      {
        key: 'last_interaction_date',
        label: 'Last Interaction',
        format: v => ExportUtils.formatDate(v),
      },
      {
        key: 'tags',
        label: 'Tags',
        format: v => ExportUtils.formatArray(v),
      },
    ];

    ExportUtils.exportToExcel(filteredCustomers, exportColumns, 'customers', 'Customers');
    toast.success('Customers exported to Excel');
  };

  const handleQuickFilter = (quickFilter: (typeof QUICK_FILTERS)[0]) => {
    setFilters(quickFilter.filter);
  };

  const activeFiltersCount = Object.values(filters).filter(
    v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  if (loading) {
    return (
      <AppLayout title="Customers" breadcrumbs={[{ label: 'Customers' }]}>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading customers...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Customers"
      breadcrumbs={[{ label: 'Customer Engagement', href: '/' }, { label: 'Customers' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="mt-2 text-gray-600">Manage and analyze your customer relationships</p>
          </div>
          <Button onClick={() => router.push('/customers/new')} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Customer
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-background border-border rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Customers</p>
                <p className="mt-2 text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-chart-1/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <Users className="text-chart-1 h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-background border-border rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Active Customers</p>
                <p className="text-chart-2 mt-2 text-3xl font-bold">{stats.activePercentage}%</p>
                <p className="text-muted-foreground mt-1 text-xs">{stats.active} active</p>
              </div>
              <div className="bg-chart-2/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <Activity className="text-chart-2 h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-background border-border rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Lifetime Value</p>
                <p className="text-chart-3 mt-2 text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(stats.totalValue)}
                </p>
              </div>
              <div className="bg-chart-3/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <DollarSign className="text-chart-3 h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-background border-border rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Avg Lifetime Value</p>
                <p className="text-chart-4 mt-2 text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(stats.avgValue)}
                </p>
              </div>
              <div className="bg-chart-4/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <TrendingUp className="text-chart-4 h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Segment Breakdown */}
        <div className="bg-background border-border rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">Customer Segments</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.segments).map(([segment, count]) => {
              return (
                <Badge key={segment} variant="secondary" className="px-4 py-2 text-sm font-medium">
                  {segment}: {count}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Search, Filters, and Actions */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform" />
            <input
              type="text"
              placeholder="Search customers by name, email, company, or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border-border bg-background focus:ring-ring w-full rounded-lg border py-2.5 pr-10 pl-10 focus:border-transparent focus:ring-2"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transform"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <ColumnSelector
              columns={COLUMN_DEFINITIONS}
              visibleColumns={visibleColumns}
              onVisibilityChange={setVisibleColumns}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <div className="relative">
                  <Download className="h-4 w-4" />
                  Export
                  <select
                    onChange={e => {
                      if (e.target.value === 'csv') handleExportCSV();
                      if (e.target.value === 'excel') handleExportExcel();
                      e.target.value = '';
                    }}
                    className="absolute inset-0 w-full cursor-pointer opacity-0"
                  >
                    <option value="">Select format</option>
                    <option value="csv">Export as CSV</option>
                    <option value="excel">Export as Excel</option>
                  </select>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center text-sm font-medium text-gray-700">
            Quick Filters:
          </span>
          {QUICK_FILTERS.map(qf => (
            <Button
              key={qf.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter(qf)}
              className="gap-2"
            >
              {qf.label}
            </Button>
          ))}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({})}
              className="text-red-600 hover:text-red-700"
            >
              Clear Filters ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters({})}
        />

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {debouncedSearch ? (
              <>
                Showing <span className="text-foreground font-semibold">{filteredCustomers.length}</span> results
                <span className="text-muted-foreground"> for &quot;{debouncedSearch}&quot;</span>
              </>
            ) : (
              <>
                Showing{' '}
                <span className="text-foreground font-semibold">{filteredCustomers.length}</span> of{' '}
                <span className="text-foreground font-semibold">{customers.length}</span> customers
              </>
            )}
          </p>
        </div>

        {/* Customer Table */}
        <CustomerTable
          customers={filteredCustomers}
          visibleColumns={visibleColumns}
          onDeleteCustomer={handleDeleteCustomer}
          onRefresh={handleRefresh}
        />
      </div>
    </AppLayout>
  );
}
