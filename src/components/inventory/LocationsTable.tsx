'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StockLocation } from '@/types/nxt-spp';
import { formatDistanceToNow } from 'date-fns';

interface LocationsTableProps {
  searchQuery?: string;
  typeFilter?: 'internal' | 'supplier' | 'consignment';
  statusFilter?: boolean;
  refreshKey?: number;
  onEdit: (location: StockLocation) => void;
  onDeleteSuccess: () => void;
}

interface LocationsResponse {
  success: boolean;
  data: StockLocation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function LocationsTable({
  searchQuery,
  typeFilter,
  statusFilter,
  refreshKey = 0,
  onEdit,
  onDeleteSuccess,
}: LocationsTableProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<StockLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch locations
  const { data, isLoading, error, refetch } = useQuery<LocationsResponse>({
    queryKey: ['locations', page, pageSize, searchQuery, typeFilter, statusFilter, refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter !== undefined) params.append('is_active', statusFilter.toString());

      const response = await fetch(`/api/inventory/locations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
  });

  // Handle delete confirmation
  const handleDeleteClick = (location: StockLocation) => {
    setDeletingLocation(location);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingLocation) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/inventory/locations/${deletingLocation.location_id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Failed to delete location');
      }

      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingLocation(null);
      onDeleteSuccess();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete location',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'outline'; icon: React.ReactNode }
    > = {
      internal: { variant: 'default', icon: <Building2 className="mr-1 h-3 w-3" /> },
      supplier: { variant: 'secondary', icon: <Package className="mr-1 h-3 w-3" /> },
      consignment: { variant: 'outline', icon: <MapPin className="mr-1 h-3 w-3" /> },
    };

    const config = variants[type] || variants.internal;

    return (
      <Badge variant={config.variant} className="flex w-fit items-center">
        {config.icon}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load locations. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const locations = data?.data || [];
  const pagination = data?.pagination;

  // Empty state
  if (locations.length === 0) {
    return (
      <div className="p-12 text-center">
        <MapPin className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No locations found</h3>
        <p className="text-muted-foreground">
          {searchQuery || typeFilter || statusFilter !== undefined
            ? 'Try adjusting your filters'
            : 'Create your first location to get started'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map(location => (
              <TableRow key={location.location_id}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>{getTypeBadge(location.type)}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {location.address || (
                    <span className="text-muted-foreground text-sm">No address</span>
                  )}
                </TableCell>
                <TableCell>
                  {location.is_active ? (
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(location.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(location)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(location)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="text-muted-foreground text-sm">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} locations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingLocation?.name}</strong>? This will
              deactivate the location. It can be reactivated later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
