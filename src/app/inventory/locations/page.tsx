"use client";

/**
 * Inventory Locations Management Page
 * Manage stock locations (warehouses, supplier locations, consignment storage)
 */

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Filter, MapPin, Info } from 'lucide-react';
import { LocationsTable } from '@/components/inventory/LocationsTable';
import { LocationDialog } from '@/components/inventory/LocationDialog';
import type { StockLocation } from '@/types/nxt-spp';

export default function LocationsPage() {
  const { toast } = useToast();

  // UI State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle create new location
  const handleCreateNew = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

  // Handle edit location
  const handleEdit = (location: StockLocation) => {
    setEditingLocation(location);
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = (success?: boolean) => {
    setDialogOpen(false);
    setEditingLocation(null);

    if (success) {
      // Refresh the table
      setRefreshKey((prev) => prev + 1);

      toast({
        title: editingLocation ? 'Location Updated' : 'Location Created',
        description: editingLocation
          ? 'Location has been updated successfully'
          : 'New location has been created successfully',
      });
    }
  };

  // Handle delete success
  const handleDeleteSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    toast({
      title: 'Location Deleted',
      description: 'Location has been removed successfully',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <MapPin className="h-8 w-8 text-primary" />
              Inventory Locations
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage warehouses, supplier locations, and consignment storage
            </p>
          </div>
          <Button onClick={handleCreateNew} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>

        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Locations represent physical or virtual storage areas for inventory. Define internal warehouses,
            supplier locations for dropshipping, or consignment storage facilities.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="internal">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Internal</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Supplier</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="consignment">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Consignment</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Locations Table */}
        <Card>
          <CardContent className="p-0">
            <LocationsTable
              searchQuery={searchQuery}
              typeFilter={typeFilter === 'all' ? undefined : (typeFilter as 'internal' | 'supplier' | 'consignment')}
              statusFilter={statusFilter === 'all' ? undefined : statusFilter === 'active'}
              refreshKey={refreshKey}
              onEdit={handleEdit}
              onDeleteSuccess={handleDeleteSuccess}
            />
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <LocationDialog
        open={dialogOpen}
        location={editingLocation}
        onClose={handleDialogClose}
      />
    </AppLayout>
  );
}
