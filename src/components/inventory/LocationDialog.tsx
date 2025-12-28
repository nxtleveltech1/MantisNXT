'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import type { StockLocation } from '@/types/nxt-spp';
import { SearchableSupplierSelect } from '@/components/shared/SearchableSupplierSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LocationDialogProps {
  open: boolean;
  location: StockLocation | null;
  onClose: (success?: boolean) => void;
}

export function LocationDialog({ open, location, onClose }: LocationDialogProps) {
  const isEdit = !!location;

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'internal' | 'supplier' | 'consignment'>('internal');
  const [supplierId, setSupplierId] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [supplierFetchError, setSupplierFetchError] = useState<string | null>(null);
  const [hasLoadedSuppliers, setHasLoadedSuppliers] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load location data when editing
  useEffect(() => {
    if (location) {
      setName(location.name);
      setType(location.type as 'internal' | 'supplier' | 'consignment');
      setSupplierId(location.supplier_id || '');
      setAddress(location.address || '');
      setIsActive(location.is_active);
    } else {
      // Reset form for new location
      setName('');
      setType('internal');
      setSupplierId('');
      setAddress('');
      setIsActive(true);
    }
    setError(null);
  }, [location, open]);

  // Load suppliers when dialog opens (once per session)
  useEffect(() => {
    if (!open || hasLoadedSuppliers) {
      return;
    }

    let isMounted = true;

    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true);
      setSupplierFetchError(null);
      try {
        const params = new URLSearchParams({
          status: 'active',
          limit: '1000',
          sortBy: 'name',
          sortOrder: 'asc',
        });
        const response = await fetch(`/api/suppliers?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load suppliers');
        }
        const result = await response.json();
        const options = Array.isArray(result?.data)
          ? result.data
              .map((item: Record<string, unknown>) => {
                const id = String(
                  item.id ?? item.supplier_id ?? item.supplierId ?? item.uuid ?? ''
                ).trim();
                if (!id) return null;
                const displayName =
                  (item.name as string) ||
                  (item.company_name as string) ||
                  (item.displayName as string) ||
                  `Supplier ${id.substring(0, 8)}…`;
                return { id, name: displayName };
              })
              .filter(
                (
                  item: { id: string; name: string } | null
                ): item is {
                  id: string;
                  name: string;
                } => Boolean(item)
              )
          : [];

        if (isMounted) {
          setSuppliers(options);
          setHasLoadedSuppliers(true);
        }
      } catch (error) {
        console.error('Failed to load suppliers for location dialog:', error);
        if (isMounted) {
          setSupplierFetchError(
            error instanceof Error ? error.message : 'Failed to load suppliers'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingSuppliers(false);
        }
      }
    };

    void fetchSuppliers();

    return () => {
      isMounted = false;
    };
  }, [open, hasLoadedSuppliers]);

  // Ensure the currently selected supplier exists in dropdown
  useEffect(() => {
    if (!supplierId) {
      return;
    }

    setSuppliers(prev => {
      if (prev.some(supplier => supplier.id === supplierId)) {
        return prev;
      }
      const fallbackLabel = `Supplier ${supplierId.substring(0, 8)}…`;
      return [...prev, { id: supplierId, name: fallbackLabel }];
    });
  }, [supplierId]);

  // Clear supplier selection if type changes away from supplier
  useEffect(() => {
    if (type !== 'supplier') {
      setSupplierId('');
    }
  }, [type]);

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers]
  );

  // Validate form
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Location name is required';
    }

    if (name.trim().length > 200) {
      return 'Location name must be 200 characters or less';
    }

    if (!type) {
      return 'Location type is required';
    }

    if (type === 'supplier' && !supplierId.trim()) {
      return 'Supplier is required for supplier locations';
    }

    if (address.length > 500) {
      return 'Address must be 500 characters or less';
    }

    return null;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        type,
        supplier_id: type === 'supplier' ? supplierId || null : null,
        address: address.trim() || null,
        is_active: isActive,
      };

      const url = isEdit
        ? `/api/inventory/locations/${location.location_id}`
        : '/api/inventory/locations';

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Failed to save location');
      }

      // Success
      onClose(true);
    } catch (error) {
      console.error('Error saving location:', error);
      setError(error instanceof Error ? error.message : 'Failed to save location');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (!isSubmitting) {
      onClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Location' : 'Create New Location'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the location details below'
                : 'Add a new warehouse, supplier location, or consignment storage facility'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Location Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Main Warehouse, NYC Distribution Center"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isSubmitting}
                maxLength={200}
                required
              />
              <p className="text-muted-foreground text-xs">{name.length}/200 characters</p>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Location Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={value => setType(value as any)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Internal</span>
                      <span className="text-muted-foreground text-xs">
                        Owned warehouse or storage facility
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Supplier</span>
                      <span className="text-muted-foreground text-xs">
                        Supplier-managed location for dropshipping
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="consignment">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Consignment</span>
                      <span className="text-muted-foreground text-xs">
                        Consignment or third-party storage
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Supplier ID (conditional) */}
            {type === 'supplier' && (
              <div>
                <SearchableSupplierSelect
                  suppliers={sortedSuppliers}
                  value={supplierId}
                  onValueChange={setSupplierId}
                  placeholder="Select supplier"
                  disabled={isSubmitting || isLoadingSuppliers}
                  loading={isLoadingSuppliers}
                  error={supplierFetchError || undefined}
                  label="Supplier"
                  required={true}
                  id="supplier_id"
                />
                <p className="text-muted-foreground text-xs mt-2">
                  Supplier-managed locations require a linked supplier.
                </p>
              </div>
            )}

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Full address including street, city, state, and postal code"
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                maxLength={500}
              />
              <p className="text-muted-foreground text-xs">{address.length}/500 characters</p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active
                </Label>
                <p className="text-muted-foreground text-xs">
                  Inactive locations won't appear in location selection dropdowns
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Location' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
