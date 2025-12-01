'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  Calendar,
  DollarSign,
  Truck,
  Scale,
  Ruler,
  Clock,
  Globe,
  Barcode,
  Tag,
} from 'lucide-react';
import type { Product } from '@/lib/types/inventory';
import { format } from 'date-fns';

interface ProductDetailsDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
}: ProductDetailsDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'MMM dd, yyyy');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Details
          </DialogTitle>
          <DialogDescription>Complete information for {product.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Product Name</p>
                    <p className="text-lg font-semibold">{product.name}</p>
                  </div>
                  {product.description && (
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Description</p>
                      <p className="text-sm">{product.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Category</p>
                    <Badge variant="outline" className="mt-1">
                      {product.category.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Status</p>
                    <Badge
                      variant={product.status === 'active' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {product.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {product.sku && (
                    <div className="flex items-center gap-2">
                      <Barcode className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">SKU</p>
                        <code className="bg-muted rounded px-2 py-1 text-sm">{product.sku}</code>
                      </div>
                    </div>
                  )}
                  {product.barcode && (
                    <div className="flex items-center gap-2">
                      <Barcode className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Barcode</p>
                        <code className="bg-muted rounded px-2 py-1 text-sm">
                          {product.barcode}
                        </code>
                      </div>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex items-center gap-2">
                      <Tag className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Brand</p>
                        <p className="text-sm">{product.brand}</p>
                      </div>
                    </div>
                  )}
                  {product.model_number && (
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Model Number</p>
                      <p className="text-sm">{product.model_number}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Pricing & Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Unit Cost</p>
                    <p className="text-xl font-bold">{formatCurrency(product.unit_cost_zar)}</p>
                    <p className="text-muted-foreground text-xs">per {product.unit_of_measure}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Unit of Measure</p>
                    <p className="text-lg font-semibold">{product.unit_of_measure}</p>
                  </div>
                </div>

                {product.minimum_order_quantity && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Min Order Qty</p>
                      <p className="text-lg font-semibold">
                        {product.minimum_order_quantity} {product.unit_of_measure}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Physical Properties */}
          {(product.weight_kg || product.dimensions_cm || product.shelf_life_days) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5" />
                  Physical Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {product.weight_kg && (
                    <div className="flex items-center gap-3">
                      <Scale className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Weight</p>
                        <p className="text-sm">{product.weight_kg} kg</p>
                      </div>
                    </div>
                  )}

                  {product.dimensions_cm && (
                    <div className="flex items-center gap-3">
                      <Ruler className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Dimensions</p>
                        <p className="text-sm">{product.dimensions_cm} cm</p>
                      </div>
                    </div>
                  )}

                  {product.shelf_life_days && (
                    <div className="flex items-center gap-3">
                      <Clock className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Shelf Life</p>
                        <p className="text-sm">{product.shelf_life_days} days</p>
                      </div>
                    </div>
                  )}
                </div>

                {product.storage_requirements && (
                  <div className="mt-4">
                    <p className="text-muted-foreground mb-2 text-sm font-medium">
                      Storage Requirements
                    </p>
                    <p className="bg-muted rounded-lg p-3 text-sm">
                      {product.storage_requirements}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Supply Chain Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5" />
                Supply Chain Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {product.lead_time_days && (
                  <div className="flex items-center gap-3">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Lead Time</p>
                      <p className="text-sm">{product.lead_time_days} days</p>
                    </div>
                  </div>
                )}

                {product.country_of_origin && (
                  <div className="flex items-center gap-3">
                    <Globe className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Country of Origin</p>
                      <p className="text-sm">{product.country_of_origin}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Created</p>
                  <p className="text-sm">{formatDate(product.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Last Updated</p>
                  <p className="text-sm">{formatDate(product.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
