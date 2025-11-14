'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


import { AlertCircle, CheckCircle2, Clock, Download, Loader2, Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: 'sync' | 'preview' | 'orchestrate' | 'cancel';
  entityType: string;
  syncType: 'woocommerce' | 'odoo';
  status: 'completed' | 'failed' | 'partial' | 'cancelled';
  recordCount: number;
  createdCount?: number;
  updatedCount?: number;
  deletedCount?: number;
  failedCount?: number;
  duration: number; // milliseconds
  errorMessage?: string;
}

interface ActivityLogProps {
  orgId: string;
  entityType?: string;
}

const STORAGE_KEY = 'sync_activity_log';
const MAX_ENTRIES_PER_ORG = 1000;
const POLL_INTERVAL = 10000; // 10 seconds

// Storage utility functions
const loadActivityLog = (orgId: string): ActivityLogEntry[] => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${orgId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveActivityLog = (orgId: string, entries: ActivityLogEntry[]) => {
  try {
    const limited = entries.slice(0, MAX_ENTRIES_PER_ORG);
    localStorage.setItem(`${STORAGE_KEY}_${orgId}`, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to save activity log:', error);
  }
};

// Format milliseconds to readable time
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

// Get status badge variant and icon
const getStatusInfo = (status: string) => {
  const info: Record<string, { variant: string; icon: React.ReactNode; label: string }> = {
    completed: {
      variant: 'secondary',
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: 'Completed',
    },
    failed: {
      variant: 'destructive',
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Failed',
    },
    partial: {
      variant: 'outline',
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'Partial',
    },
    cancelled: {
      variant: 'secondary',
      icon: <Clock className="h-4 w-4" />,
      label: 'Cancelled',
    },
  };

  return info[status] || info.completed;
};

// Memoized action badge component
const ActionBadge = React.memo(({ action }: { action: string }) => {
  const actionMap: Record<string, string> = {
    sync: 'Sync',
    preview: 'Preview',
    orchestrate: 'Orchestrate',
    cancel: 'Cancel',
  };

  return (
    <Badge variant="outline" className="font-normal">
      {actionMap[action] || action}
    </Badge>
  );
});

ActionBadge.displayName = 'ActionBadge';

// Memoized entity type badge component
const EntityTypeBadge = React.memo(({ type }: { type: string }) => {
  const colorMap: Record<string, string> = {
    products: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    orders: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    customers: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    invoices: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  };

  return (
    <span
      className={cn('inline-block px-2 py-1 rounded text-xs font-medium', colorMap[type] || colorMap.products)}
    >
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
});

EntityTypeBadge.displayName = 'EntityTypeBadge';

// Memoized table row component
const ActivityRow = React.memo(
  ({
    entry,
    onShowDetails,
  }: {
    entry: ActivityLogEntry;
    onShowDetails: (entry: ActivityLogEntry) => void;
  }) => {
    const statusInfo = getStatusInfo(entry.status);
    const timestamp = new Date(entry.timestamp);

    return (
      <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => onShowDetails(entry)}>
        <TableCell className="text-sm">
          {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString()}
        </TableCell>
        <TableCell>
          <ActionBadge action={entry.action} />
        </TableCell>
        <TableCell>
          <EntityTypeBadge type={entry.entityType} />
        </TableCell>
        <TableCell>
          <Badge variant={statusInfo.variant as unknown} className="gap-1">
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </TableCell>
        <TableCell className="text-right text-sm">{entry.recordCount}</TableCell>
        <TableCell className="text-right text-sm text-muted-foreground">
          {formatDuration(entry.duration)}
        </TableCell>
        <TableCell>
          {entry.errorMessage && (
            <span
              className="text-xs text-muted-foreground truncate max-w-xs block"
              title={entry.errorMessage}
            >
              {entry.errorMessage.substring(0, 40)}...
            </span>
          )}
        </TableCell>
      </TableRow>
    );
  }
);

ActivityRow.displayName = 'ActivityRow';

// Details modal component
const DetailsModal = React.memo(
  ({
    entry,
    isOpen,
    onClose,
  }: {
    entry: ActivityLogEntry | null;
    isOpen: boolean;
    onClose: () => void;
  }) => {
    if (!isOpen || !entry) return null;

    const statusInfo = getStatusInfo(entry.status);

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Activity Details</span>
                  <Badge variant={statusInfo.variant as unknown} className="gap-1">
                    {statusInfo.icon}
                    {statusInfo.label}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {new Date(entry.timestamp).toLocaleString()}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close details"
              >
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Action</p>
                <p className="font-medium capitalize">{entry.action}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entity Type</p>
                <p className="font-medium">{entry.entityType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sync Type</p>
                <p className="font-medium">{entry.syncType === 'woocommerce' ? 'WooCommerce' : 'Odoo'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{formatDuration(entry.duration)}</p>
              </div>
            </div>

            {/* Summary stats */}
            {(entry.createdCount !== undefined ||
              entry.updatedCount !== undefined ||
              entry.deletedCount !== undefined) && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{entry.recordCount}</p>
                  </div>
                  {entry.createdCount !== undefined && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-2xl font-bold text-green-600">{entry.createdCount}</p>
                    </div>
                  )}
                  {entry.updatedCount !== undefined && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Updated</p>
                      <p className="text-2xl font-bold text-blue-600">{entry.updatedCount}</p>
                    </div>
                  )}
                  {entry.deletedCount !== undefined && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Deleted</p>
                      <p className="text-2xl font-bold text-amber-600">{entry.deletedCount}</p>
                    </div>
                  )}
                  {entry.failedCount !== undefined && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-destructive">{entry.failedCount}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error message */}
            {entry.errorMessage && (
              <div className="border-t pt-4 bg-destructive/5 border border-destructive/20 p-3 rounded">
                <p className="text-sm font-semibold text-destructive mb-2">Error</p>
                <p className="text-sm text-muted-foreground break-words">{entry.errorMessage}</p>
              </div>
            )}

            {/* Close button */}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

DetailsModal.displayName = 'DetailsModal';

export const ActivityLog: React.FC<ActivityLogProps> = ({ orgId, entityType }) => {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState(entityType || 'all');
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Load initial data and set up polling
  useEffect(() => {
    let cancelled = false
    let lastErrorKey = ''
    async function loadData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/integrations/sync/activity?orgId=${orgId}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as unknown))
          const key = `${res.status}:${body?.error || ''}`
          // stop repeated hammering when circuit is open
          if (key === lastErrorKey) {
            setLoading(false)
            return
          }
          lastErrorKey = key
          throw new Error(body?.error || `HTTP ${res.status}`)
        }
        const json = await res.json()
        const entries = (json.data || []).map((row: unknown) => {
          const a = String(row.action || '').toLowerCase()
          const action = a.includes('preview') ? 'preview' : a.includes('orchestrate') ? 'orchestrate' : a.includes('cancel') ? 'cancel' : 'sync'
          return {
            id: String(row.id ?? crypto.randomUUID()),
            timestamp: row.started_at || row.created_at || new Date().toISOString(),
            action,
            entityType: row.entity_type || 'unknown',
            syncType: row.sync_type || 'unknown',
            status: (row.status || 'completed'),
            recordCount: row.record_count || 0,
            duration: row.duration_ms || 0,
            errorMessage: row.error_message || undefined,
          }
        })
        if (!cancelled) setEntries(entries)
      } catch (e: unknown) {
        if (!cancelled) setError(e?.message || 'Failed to load activity')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [orgId])

  // Filter entries based on criteria
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (entry) =>
          entry.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.errorMessage?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((entry) => entry.status === statusFilter);
    }

    // Entity type filter
    if (entityFilter !== 'all') {
      result = result.filter((entry) => entry.entityType === entityFilter);
    }

    // Date filter
    const now = Date.now();
    const filters: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    if (dateFilter !== 'all' && filters[dateFilter]) {
      result = result.filter((entry) => now - new Date(entry.timestamp).getTime() <= filters[dateFilter]);
    }

    // Sort by timestamp descending (newest first)
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries, searchTerm, statusFilter, dateFilter, entityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = [
      'Timestamp',
      'Action',
      'Entity Type',
      'Status',
      'Record Count',
      'Duration',
      'Created',
      'Updated',
      'Deleted',
      'Failed',
      'Error Message',
    ];

    const rows = filteredEntries.map((entry) => [
      entry.timestamp,
      entry.action,
      entry.entityType,
      entry.status,
      entry.recordCount,
      formatDuration(entry.duration),
      entry.createdCount || '-',
      entry.updatedCount || '-',
      entry.deletedCount || '-',
      entry.failedCount || '-',
      `"${(entry.errorMessage || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sync-activity-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [filteredEntries]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label htmlFor="search" className="text-sm mb-2 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by ID, entity type..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status filter */}
            <div>
              <Label htmlFor="status" className="text-sm mb-2 block">
                Status
              </Label>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity type filter */}
            <div>
              <Label htmlFor="entity" className="text-sm mb-2 block">
                Entity Type
              </Label>
              <Select value={entityFilter} onValueChange={(value) => {
                setEntityFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger id="entity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date filter */}
            <div>
              <Label htmlFor="date" className="text-sm mb-2 block">
                Date Range
              </Label>
              <Select value={dateFilter} onValueChange={(value) => {
                setDateFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger id="date">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription className="mt-1">
              {filteredEntries.length} of {entries.length} entries
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredEntries.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading && !entries.length ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs found
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntries.map((entry) => (
                      <ActivityRow
                        key={entry.id}
                        entry={entry}
                        onShowDetails={() => setSelectedEntry(entry)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                  setItemsPerPage(parseInt(v));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details modal */}
      <DetailsModal
        entry={selectedEntry}
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
};

export default ActivityLog;
