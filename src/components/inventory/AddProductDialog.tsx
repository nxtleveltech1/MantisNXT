"use client"

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInventoryStore } from '@/lib/stores/inventory-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import type { ProductFormData } from '@/lib/types/inventory'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.enum([
    'raw_materials',
    'components',
    'finished_goods',
    'consumables',
    'services',
    'packaging',
    'tools',
    'safety_equipment'
  ], { required_error: 'Category is required' }),
  sku: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  unit_cost_zar: z.coerce.number().positive('Unit cost must be positive'),
  lead_time_days: z.coerce.number().optional(),
  minimum_order_quantity: z.coerce.number().optional(),
  supplier_id: z.string().min(1, 'Supplier is required'),
  barcode: z.string().optional(),
  weight_kg: z.coerce.number().optional(),
  dimensions_cm: z.string().optional(),
  shelf_life_days: z.coerce.number().optional(),
  storage_requirements: z.string().optional(),
  country_of_origin: z.string().optional(),
  brand: z.string().optional(),
  model_number: z.string().optional()
})

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { suppliers, addProduct, loading } = useInventoryStore()
  const { addNotification } = useNotificationStore()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      unit_of_measure: '',
      unit_cost_zar: 0,
      supplier_id: '',
      barcode: '',
      country_of_origin: 'South Africa',
      brand: '',
      model_number: ''
    }
  })

  const onSubmit = async (data: ProductFormData) => {
    try {
      await addProduct(data)
      addNotification({
        type: 'success',
        title: 'Product added',
        message: `${data.name} has been successfully added to your inventory`
      })
      form.reset()
      onOpenChange(false)
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to add product',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  const categories = [
    { value: 'raw_materials', label: 'Raw Materials' },
    { value: 'components', label: 'Components' },
    { value: 'finished_goods', label: 'Finished Goods' },
    { value: 'consumables', label: 'Consumables' },
    { value: 'services', label: 'Services' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'tools', label: 'Tools' },
    { value: 'safety_equipment', label: 'Safety Equipment' }
  ]

  const commonUnits = [
    'Each', 'Piece', 'Set', 'Kit', 'Meter', 'Kilogram', 'Liter', 'Square Meter',
    'Cubic Meter', 'Hour', 'Day', 'Box', 'Case', 'Pallet', 'Roll', 'Sheet'
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory. Fill in the required information below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
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
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.filter(s => s.status === 'active').map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Product Details</h3>

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter SKU (optional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Stock Keeping Unit - leave blank to auto-generate
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter barcode (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter brand name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter model number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pricing & Quantity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing & Quantity</h3>

                <FormField
                  control={form.control}
                  name="unit_cost_zar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost (ZAR) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_of_measure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {commonUnits.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Or type a custom unit in the field
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimum_order_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter minimum order quantity"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Physical Properties */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Physical Properties</h3>

                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="Enter weight in kg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dimensions_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimensions (cm)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="L x W x H (e.g., 10x20x5)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shelf_life_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shelf Life (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter shelf life in days"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>

                <FormField
                  control={form.control}
                  name="country_of_origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country of Origin</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter country of origin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lead_time_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter lead time in days"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storage_requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Requirements</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter storage requirements"
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding Product...' : 'Add Product'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}