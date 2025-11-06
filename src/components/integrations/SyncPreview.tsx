'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Search, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncItem {
  id: string | number;
  name: string;
  lastModified?: string;
  preview?: string;
  [key: string]: any;
}

interface SyncPreviewData {
  newItems: SyncItem[];
  updatedItems: SyncItem[];
  deletedItems: SyncItem[];
  totalNew: number;
  totalUpdated: number;
  totalDeleted: number;
}

interface SyncPreviewProps {
  isOpen: boolean;
  syncType: 'woocommerce' | 'odoo';
  entityType: string;
  onConfirm: (config: SyncConfig) => void;
  onCancel: () => void;
}

interface SyncConfig {
  includeNew: boolean;
  includeUpdated: boolean;
  includeDeleted: boolean;
  selectedIds?: (string | number)[];
}

const ITEMS_PER_PAGE = 20;

// Skeleton loader component
const SkeletonRow: React.FC<{ columns: number }> = ({ columns }) => (
  <TableRow>
    {Array.from({ length: columns }).map((_, i) => (
      <TableCell key={i}>
        <div className="h-4 bg-muted rounded animate-pulse" />
      </TableCell>
    ))}
  </TableRow>
);

// Individual item row component (memoized for performance)
const SyncItemRow = React.memo(
  ({
    item,
    isSelected,
    onSelect,
  }: {
    item: SyncItem;
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select item ${item.id}`}
        />
      </TableCell>
      <TableCell className="font-medium">{item.id}</TableCell>
      <TableCell>{item.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {item.lastModified ? new Date(item.lastModified).toLocaleDateString() : '-'}
      </TableCell>
      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
        {item.preview ? item.preview.substring(0, 50) : '-'}
      </TableCell>
    </TableRow>
  )
);

SyncItemRow.displayName = 'SyncItemRow';

// Table section component (memoized)
const SyncItemsTable = React.memo(
  ({
    items,
    totalCount,
    isLoading,
    selectedIds,
    onSelectItem,
    onLoadMore,
  }: {
    items: SyncItem[];
    totalCount: number;
    isLoading: boolean;
    selectedIds: Set<string | number>;
    onSelectItem: (id: string | number) => void;
    onLoadMore: () => void;
  }) => (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only">Select all</span>
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <SkeletonRow columns={5} />
                <SkeletonRow columns={5} />
                <SkeletonRow columns={5} />
              </>
            ) : items.length > 0 ? (
              items.map((item) => (
                <SyncItemRow
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={() => onSelectItem(item.id)}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No items to sync
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && items.length > 0 && items.length < totalCount && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more...
            </>
          ) : (
            `Load More (${items.length}/${totalCount})`
          )}
        </Button>
      )}
    </div>
  )
);

SyncItemsTable.displayName = 'SyncItemsTable';

export const SyncPreview: React.FC<SyncPreviewProps> = ({
  isOpen,
  syncType,
  entityType,
  onConfirm,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SyncPreviewData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNew, setSelectedNew] = useState<Set<string | number>>(new Set());
  const [selectedUpdated, setSelectedUpdated] = useState<Set<string | number>>(new Set());
  const [selectedDeleted, setSelectedDeleted] = useState<Set<string | number>>(new Set());
  const [includeNew, setIncludeNew] = useState(true);
  const [includeUpdated, setIncludeUpdated] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  // Fetch sync preview data
  useEffect(() => {
    if (!isOpen || !syncType || !entityType) return;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/integrations/sync/preview?action=fetch&sync_type=${syncType}&entity_type=${entityType}&orgId=org-default`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              syncType,
              entityType,
              orgId: 'org-default',
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
          setSelectedNew(new Set(result.data.newItems.map((item: SyncItem) => item.id)));
          setSelectedUpdated(new Set(result.data.updatedItems.map((item: SyncItem) => item.id)));
        } else {
          throw new Error(result.error || 'Failed to load preview data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, syncType, entityType]);

  const handleSelectItem = useCallback(
    (type: 'new' | 'updated' | 'deleted', id: string | number) => {
      const setState =
        type === 'new'
          ? setSelectedNew
          : type === 'updated'
            ? setSelectedUpdated
            : setSelectedDeleted;

      setState((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    },
    []
  );

  const handleConfirm = () => {
    onConfirm({
      includeNew,
      includeUpdated,
      includeDeleted,
      selectedIds: [
        ...(includeNew ? Array.from(selectedNew) : []),
        ...(includeUpdated ? Array.from(selectedUpdated) : []),
        ...(includeDeleted ? Array.from(selectedDeleted) : []),
      ],
    });
  };

  // Filter items based on search
  const filterItems = (items: SyncItem[]): SyncItem[] => {
    if (!searchTerm) return items;
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.id).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (!data && !loading && !error) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Sync Preview</span>
            <Badge variant="secondary" className="capitalize">
              {syncType === 'woocommerce' ? 'WooCommerce' : 'Odoo'} - {entityType}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Review the items that will be synced before confirming the operation
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setError(null);
                      setData(null);
                      // Re-fetch will happen automatically
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search sync items"
              />
            </div>

            {/* Sync items tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="new" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  New
                  <Badge variant="secondary" className="ml-1">
                    {data.totalNew}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="updated" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Updated
                  <Badge variant="secondary" className="ml-1">
                    {data.totalUpdated}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="deleted" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Deleted
                  <Badge variant="destructive" className="ml-1">
                    {data.totalDeleted}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="space-y-4">
                <SyncItemsTable
                  items={filterItems(data.newItems)}
                  totalCount={data.totalNew}
                  isLoading={loading}
                  selectedIds={selectedNew}
                  onSelectItem={(id) => handleSelectItem('new', id)}
                  onLoadMore={() => {
                    // Load more implementation would go here
                  }}
                />
              </TabsContent>

              <TabsContent value="updated" className="space-y-4">
                <SyncItemsTable
                  items={filterItems(data.updatedItems)}
                  totalCount={data.totalUpdated}
                  isLoading={loading}
                  selectedIds={selectedUpdated}
                  onSelectItem={(id) => handleSelectItem('updated', id)}
                  onLoadMore={() => {
                    // Load more implementation would go here
                  }}
                />
              </TabsContent>

              <TabsContent value="deleted" className="space-y-4">
                <SyncItemsTable
                  items={filterItems(data.deletedItems)}
                  totalCount={data.totalDeleted}
                  isLoading={loading}
                  selectedIds={selectedDeleted}
                  onSelectItem={(id) => handleSelectItem('deleted', id)}
                  onLoadMore={() => {
                    // Load more implementation would go here
                  }}
                />
              </TabsContent>
            </Tabs>

            {/* Sync options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sync Configuration</CardTitle>
                <CardDescription>Choose which item types to sync</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-new"
                    checked={includeNew}
                    onCheckedChange={(checked) => setIncludeNew(checked === true)}
                    aria-label="Include new items in sync"
                  />
                  <Label htmlFor="include-new" className="font-normal cursor-pointer">
                    Include New Items ({data.totalNew})
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-updated"
                    checked={includeUpdated}
                    onCheckedChange={(checked) => setIncludeUpdated(checked === true)}
                    aria-label="Include updated items in sync"
                  />
                  <Label htmlFor="include-updated" className="font-normal cursor-pointer">
                    Include Updated Items ({data.totalUpdated})
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-deleted"
                    checked={includeDeleted}
                    onCheckedChange={(checked) => setIncludeDeleted(checked === true)}
                    aria-label="Include deleted items in sync"
                  />
                  <Label htmlFor="include-deleted" className="font-normal cursor-pointer">
                    Include Deleted Items ({data.totalDeleted})
                  </Label>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !data}
            className={cn(
              'gap-2',
              loading && 'opacity-70'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Sync Selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SyncPreview;
