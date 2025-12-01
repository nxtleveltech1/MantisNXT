'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import type { InventoryItem, InventoryAdjustmentFormData } from '@/lib/types/inventory';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';

const adjustmentSchema = z.object({
  adjustment_type: z.enum(['increase', 'decrease'], {
    required_error: 'Adjustment type is required',
  }),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  reason_code: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  unit_cost_zar: z.coerce.number().positive().optional(),
});

interface StockAdjustmentDialogProps {
  inventoryItem: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StockAdjustmentDialog({
  inventoryItem,
  open,
  onOpenChange,
}: StockAdjustmentDialogProps) {
  const { products, adjustInventory, loading } = useInventoryStore();
  const { addNotification } = useNotificationStore();

  const product = products.find(p => p.id === inventoryItem.product_id);

  const form = useForm<InventoryAdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      inventory_item_id: inventoryItem.id,
      adjustment_type: 'increase',
      quantity: 1,
      reason_code: '',
      notes: '',
      unit_cost_zar: inventoryItem.cost_per_unit_zar,
    },
  });

  const watchedValues = form.watch();
  const adjustmentType = watchedValues.adjustment_type;
  const quantity = watchedValues.quantity || 0;

  const newStock =
    adjustmentType === 'increase'
      ? inventoryItem.current_stock + quantity
      : Math.max(0, inventoryItem.current_stock - quantity);

  const newValue = newStock * (watchedValues.unit_cost_zar || inventoryItem.cost_per_unit_zar);

  const onSubmit = async (data: InventoryAdjustmentFormData) => {
    try {
      await adjustInventory(data);
      addNotification({
        type: 'success',
        title: 'Stock adjusted',
        message: `Stock for ${product?.name} has been successfully adjusted`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to adjust stock',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const reasonCodes = [
    { value: 'receiving', label: 'Stock Receiving' },
    { value: 'damage', label: 'Damage/Breakage' },
    { value: 'theft', label: 'Theft/Loss' },
    { value: 'expired', label: 'Expired Items' },
    { value: 'count_correction', label: 'Cycle Count Correction' },
    { value: 'return', label: 'Customer Return' },
    { value: 'transfer', label: 'Location Transfer' },
    { value: 'production', label: 'Production Use' },
    { value: 'sample', label: 'Sample/Demo' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            Adjust the stock level for {product?.name}. This will create a stock movement record.
          </DialogDescription>
        </DialogHeader>

        {/* Current Stock Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Stock Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Product</p>
                <p className="font-medium">{product?.name}</p>
                <p className="text-muted-foreground text-xs">SKU: {product?.sku || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Location</p>
                <p className="font-medium">{inventoryItem.location}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Current Stock</p>
                <p className="text-lg font-bold">
                  {inventoryItem.current_stock} {product?.unit_of_measure}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Current Value</p>
                <p className="text-lg font-bold">{formatCurrency(inventoryItem.total_value_zar)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Unit Cost</p>
                <p className="text-lg font-bold">
                  {formatCurrency(inventoryItem.cost_per_unit_zar)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="adjustment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adjustment Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="increase">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Increase Stock
                            </div>
                          </SelectItem>
                          <SelectItem value="decrease">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              Decrease Stock
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="Enter quantity" {...field} />
                      </FormControl>
                      <FormDescription>
                        Amount to {adjustmentType} in {product?.unit_of_measure}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_cost_zar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost (ZAR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Enter unit cost" {...field} />
                      </FormControl>
                      <FormDescription>Leave unchanged to use current cost</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="reason_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reasonCodes.map(reason => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter additional notes (optional)"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Adjustment Preview */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Adjustment Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">New Stock Level</p>
                    <p
                      className={`text-lg font-bold ${
                        adjustmentType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {newStock} {product?.unit_of_measure}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {adjustmentType === 'increase' ? '+' : '-'}
                      {quantity} {product?.unit_of_measure}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">New Total Value</p>
                    <p className="text-lg font-bold">{formatCurrency(newValue)}</p>
                    <p className="text-muted-foreground text-xs">
                      Change: {formatCurrency(newValue - inventoryItem.total_value_zar)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Stock Status</p>
                    <Badge
                      variant={
                        newStock === 0
                          ? 'destructive'
                          : newStock <= inventoryItem.reorder_point
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {newStock === 0
                        ? 'Out of Stock'
                        : newStock <= inventoryItem.reorder_point
                          ? 'Low Stock'
                          : 'In Stock'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adjusting Stock...' : 'Apply Adjustment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
