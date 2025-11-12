"use client"

import React, { useEffect, useMemo, useState } from 'react'
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
import type { Product, ProductFormData } from '@/lib/types/inventory'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .transform(value => value.trim())
    .pipe(z.string().min(1, 'Category is required')),
  location_id: z
    .string()
    .optional()
    .transform(value => {
      const trimmed = (value ?? '').trim()
      return trimmed.length > 0 ? trimmed : undefined
    }),
  sku: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  unit_cost_zar: z.coerce.number().positive('Unit cost must be positive'),
  lead_time_days: z.coerce.number().optional(),
  minimum_order_quantity: z.coerce.number().optional(),
  barcode: z.string().optional(),
  weight_kg: z.coerce.number().optional(),
  dimensions_cm: z.string().optional(),
  shelf_life_days: z.coerce.number().optional(),
  storage_requirements: z.string().optional(),
  country_of_origin: z.string().optional(),
  brand: z.string().optional(),
  model_number: z.string().optional()
})

type LocationOption = {
  id: string
  name: string
}

interface EditProductDialogProps {
  product: Product
  inventoryItemId: string
  open: boolean
  holdLocation?: string
  locations: (LocationOption | string)[]
  onOpenChange: (open: boolean) => void
}

type CategoryOption = {
  id: string
  name: string
}

export default function EditProductDialog({ product, inventoryItemId, open, holdLocation, locations, onOpenChange }: EditProductDialogProps) {
  const { updateProduct, loading } = useInventoryStore()
  const { addNotification } = useNotificationStore()
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const form = useForm<Partial<ProductFormData>>({
    resolver: zodResolver(productSchema.partial()),
    defaultValues: {
      name: product.name,
      description: product.description || '',
      category: product.category,
      location_id: (holdLocation || product.location_id || product.location || '').toString(),
      sku: product.sku || '',
      unit_of_measure: product.unit_of_measure,
      unit_cost_zar: product.unit_cost_zar,
      lead_time_days: product.lead_time_days || undefined,
      minimum_order_quantity: product.minimum_order_quantity || undefined,
      barcode: product.barcode || '',
      weight_kg: product.weight_kg || undefined,
      dimensions_cm: product.dimensions_cm || '',
      shelf_life_days: product.shelf_life_days || undefined,
      storage_requirements: product.storage_requirements || '',
      country_of_origin: product.country_of_origin || '',
      brand: product.brand || '',
      model_number: product.model_number || ''
    }
  })

  useEffect(() => {
    let isCancelled = false

    const loadCategories = async () => {
      try {
        setCategoryLoading(true)
        setCategoryError(null)

        const response = await fetch('/api/catalog/categories')
        if (!response.ok) {
          throw new Error(`Failed to fetch categories (${response.status})`)
        }

        const payload = await response.json()
        const rawList = Array.isArray(payload?.data) ? payload.data : []

        const mapped = rawList
          .map((item: { id?: unknown; category_id?: unknown; name?: unknown }) => {
            const name = typeof item?.name === 'string' ? item.name.trim() : ''
            if (!name) return null
            const idCandidate = item?.id ?? item?.category_id ?? name
            return { id: String(idCandidate), name }
          })
          .filter((item): item is CategoryOption => Boolean(item?.name))

        const productCategory = (product.category || '').trim()
        const hasProductCategory = productCategory
          ? mapped.some(option => option.name.toLowerCase() === productCategory.toLowerCase())
          : false

        const merged = hasProductCategory || !productCategory
          ? mapped
          : [{ id: `existing:${productCategory}`, name: productCategory }, ...mapped]

        if (!isCancelled) {
          setCategoryOptions(merged)
        }
      } catch (error) {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : 'Failed to fetch categories'
          setCategoryError(message)
          const productCategory = (product.category || '').trim()
          if (productCategory) {
            setCategoryOptions(prev => {
              if (prev.some(option => option.name === productCategory)) {
                return prev
              }
              return [{ id: `existing:${productCategory}`, name: productCategory }, ...prev]
            })
          }
        }
      } finally {
        if (!isCancelled) {
          setCategoryLoading(false)
        }
      }
    }

    void loadCategories()

    return () => {
      isCancelled = true
    }
  }, [product.id, product.category])

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || '',
        category: product.category,
        location_id: (holdLocation || product.location_id || product.location || '').toString(),
        sku: product.sku || '',
        unit_of_measure: product.unit_of_measure,
        unit_cost_zar: product.unit_cost_zar,
        lead_time_days: product.lead_time_days || undefined,
        minimum_order_quantity: product.minimum_order_quantity || undefined,
        barcode: product.barcode || '',
        weight_kg: product.weight_kg || undefined,
        dimensions_cm: product.dimensions_cm || '',
        shelf_life_days: product.shelf_life_days || undefined,
        storage_requirements: product.storage_requirements || '',
        country_of_origin: product.country_of_origin || '',
        brand: product.brand || '',
        model_number: product.model_number || ''
      })
    }
  }, [product, form])

  const locationOptions = useMemo(() => {
    const normalize = (item: LocationOption | string | undefined | null): LocationOption | null => {
      if (!item) return null
      if (typeof item === 'string') {
        const value = item.trim()
        return value ? { id: value, name: value } : null
      }
      const id = typeof item.id === 'string' ? item.id.trim() : ''
      const name = typeof item.name === 'string' ? item.name.trim() : ''
      if (!id && !name) return null
      const resolvedId = id || name
      return resolvedId ? { id: resolvedId, name: name || resolvedId } : null
    }

    const unique = new Map<string, LocationOption>()

    for (const location of locations) {
      const normalized = normalize(location)
      if (normalized && !unique.has(normalized.id)) {
        unique.set(normalized.id, normalized)
      }
    }

    const currentId = (holdLocation || product.location_id || product.location || '').toString().trim()
    if (currentId && !unique.has(currentId)) {
      const currentName = typeof product.location === 'string' && product.location.trim()
        ? product.location.trim()
        : currentId
      unique.set(currentId, { id: currentId, name: currentName })
    }

    return Array.from(unique.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
  }, [locations, holdLocation, product.location, product.location_id])

  const onSubmit = async (data: Partial<ProductFormData>) => {
    if (!inventoryItemId) {
      addNotification({
        type: 'error',
        title: 'Unable to update product',
        message: 'Missing inventory reference for this product'
      })
      return
    }

    try {
      await updateProduct(inventoryItemId, data)
      addNotification({
        type: 'success',
        title: 'Product updated',
        message: `${data.name || product.name} has been successfully updated`
      })
      onOpenChange(false)
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  const commonUnits = [
    'Each', 'Piece', 'Set', 'Kit', 'Meter', 'Kilogram', 'Liter', 'Square Meter',
    'Cubic Meter', 'Hour', 'Day', 'Box', 'Case', 'Pallet', 'Roll', 'Sheet'
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product information. Only modified fields will be saved.
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
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={categoryLoading ? 'Loading categories...' : 'Select category'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryLoading && (
                            <SelectItem value={field.value ?? ''} disabled>
                              Loading categories...
                            </SelectItem>
                          )}
                          {!categoryLoading && categoryOptions.length === 0 && (
                            <SelectItem value={field.value ?? ''} disabled>
                              No categories available
                            </SelectItem>
                          )}
                          {!categoryLoading &&
                            categoryOptions.map(category => (
                              <SelectItem key={category.id} value={category.name}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {categoryError && (
                        <p className="text-sm text-destructive">{categoryError}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={locationOptions.length ? 'Select location' : 'No locations available'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locationOptions.length === 0 ? (
                            <SelectItem value={field.value ?? ''} disabled>
                              No locations available
                            </SelectItem>
                          ) : (
                            locationOptions.map(location => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))
                          )}
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
                        <Input placeholder="Enter SKU" {...field} />
                      </FormControl>
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
                        <Input placeholder="Enter barcode" {...field} />
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
                {loading ? 'Updating Product...' : 'Update Product'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}