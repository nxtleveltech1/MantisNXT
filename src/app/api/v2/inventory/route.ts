/**
 * Enhanced Inventory API v2 with authentication, validation, and comprehensive features
 */

import { NextRequest } from 'next/server'
import { ApiMiddleware, RequestContext } from '@/lib/api/middleware'
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  InventorySearchSchema,
  BulkOperationSchema,
  EnhancedInventoryItem
} from '@/lib/api/validation'

// Enhanced mock database with more comprehensive data
export let mockInventoryData: EnhancedInventoryItem[] = [
  {
    id: 'item_001',
    sku: 'DELL-XPS13-001',
    name: 'Dell XPS 13 Laptop (i7, 16GB)',
    description: 'Premium ultrabook with Intel i7 processor and 16GB RAM, perfect for professional work',
    category: 'Electronics',
    subcategory: 'Laptops',
    currentStock: 25,
    reservedStock: 3,
    reorderPoint: 10,
    maxStock: 50,
    minStock: 5,
    unitCost: 1299.99,
    unitPrice: 1599.99,
    currency: 'USD',
    unit: 'pcs',
    weight: 2.8,
    dimensions: {
      length: 29.5,
      width: 19.8,
      height: 1.7,
      unit: 'cm'
    },
    supplierId: 'sup_001',
    supplierName: 'Dell Technologies',
    supplierSku: 'XPS13-I7-16GB',
    primaryLocationId: 'loc_001',
    locations: [{
      id: 'loc_001',
      warehouseId: 'wh_001',
      warehouseName: 'Main Warehouse',
      zone: 'A',
      aisle: '1',
      shelf: '2',
      bin: '3',
      locationCode: 'A-1-2-3',
      quantity: 25,
      reservedQuantity: 3,
      isDefault: true,
      isPrimary: true
    }],
    batchTracking: false,
    serialTracking: false,
    expirationTracking: false,
    lots: [],
    qualityGrade: 'A',
    certifications: ['CE', 'FCC', 'ENERGY_STAR'],
    tags: ['laptop', 'premium', 'dell', 'business'],
    notes: 'High-demand item, monitor stock levels closely',
    customFields: {
      warranty: '3 years',
      supplier_rating: '5 stars'
    },
    status: 'active',
    isActive: true,
    lastStockUpdate: '2024-09-22T10:30:00Z',
    lastOrderDate: '2024-09-15T08:00:00Z',
    nextDeliveryDate: '2024-09-30T12:00:00Z',
    createdBy: 'admin@company.com',
    updatedBy: 'admin@company.com'
  },
  {
    id: 'item_002',
    sku: 'HP-ELITE-802',
    name: 'HP EliteBook 840 G8',
    description: 'Professional business laptop with enterprise security features',
    category: 'Electronics',
    subcategory: 'Laptops',
    currentStock: 8,
    reservedStock: 2,
    reorderPoint: 15,
    maxStock: 40,
    minStock: 10,
    unitCost: 1199.99,
    unitPrice: 1499.99,
    currency: 'USD',
    unit: 'pcs',
    weight: 2.5,
    dimensions: {
      length: 32.4,
      width: 20.4,
      height: 1.9,
      unit: 'cm'
    },
    supplierId: 'sup_002',
    supplierName: 'HP Inc.',
    supplierSku: 'ELITE840-G8-I7',
    primaryLocationId: 'loc_002',
    locations: [{
      id: 'loc_002',
      warehouseId: 'wh_001',
      warehouseName: 'Main Warehouse',
      zone: 'A',
      aisle: '2',
      shelf: '1',
      bin: '4',
      locationCode: 'A-2-1-4',
      quantity: 8,
      reservedQuantity: 2,
      isDefault: true,
      isPrimary: true
    }],
    batchTracking: false,
    serialTracking: true,
    expirationTracking: false,
    lots: [],
    qualityGrade: 'A',
    certifications: ['CE', 'FCC', 'EPEAT'],
    tags: ['laptop', 'business', 'hp', 'security'],
    notes: 'Low stock - reorder soon',
    customFields: {
      warranty: '3 years',
      security_features: 'TPM 2.0, Fingerprint reader'
    },
    status: 'low_stock',
    isActive: true,
    lastStockUpdate: '2024-09-21T14:20:00Z',
    lastOrderDate: '2024-09-10T10:30:00Z',
    nextDeliveryDate: '2024-10-05T14:00:00Z',
    createdBy: 'manager@company.com',
    updatedBy: 'admin@company.com'
  }
]

// Helper functions
function generateStockAlerts(item: EnhancedInventoryItem) {
  const alerts = []

  if (item.currentStock === 0) {
    alerts.push({
      id: `alert_${Date.now()}`,
      type: 'out_of_stock',
      severity: 'critical',
      title: 'Out of Stock Alert',
      message: `${item.name} is out of stock`,
      itemId: item.id,
      isActive: true,
      createdAt: new Date().toISOString()
    })
  } else if (item.currentStock <= item.reorderPoint) {
    alerts.push({
      id: `alert_${Date.now()}`,
      type: 'low_stock',
      severity: 'warning',
      title: 'Low Stock Alert',
      message: `${item.name} is running low (${item.currentStock} remaining)`,
      itemId: item.id,
      isActive: true,
      createdAt: new Date().toISOString()
    })
  }

  return alerts
}

function calculateInventoryMetrics(items: EnhancedInventoryItem[]) {
  const totalItems = items.length
  const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0)
  const lowStockItems = items.filter(item => item.currentStock <= item.reorderPoint).length
  const outOfStockItems = items.filter(item => item.currentStock === 0).length
  const activeItems = items.filter(item => item.isActive).length

  const categoryDistribution = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const supplierDistribution = items.reduce((acc, item) => {
    if (item.supplierName) {
      acc[item.supplierName] = (acc[item.supplierName] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return {
    totalItems,
    activeItems,
    totalValue,
    averageValue: totalItems > 0 ? totalValue / totalItems : 0,
    lowStockItems,
    outOfStockItems,
    stockTurnover: 0, // Would calculate based on movement history
    categoryDistribution,
    supplierDistribution,
    lastUpdated: new Date().toISOString()
  }
}

function applyInventoryFilters(items: EnhancedInventoryItem[], filters: any) {
  return items.filter(item => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const searchFields = [
        item.name, item.sku, item.description, item.category,
        item.subcategory, item.supplierName, ...item.tags
      ].filter(Boolean)

      const matches = searchFields.some(field =>
        field?.toLowerCase().includes(query)
      )
      if (!matches) return false
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.includes(item.category)) return false
    }

    // Subcategory filter
    if (filters.subcategory && filters.subcategory.length > 0) {
      if (!item.subcategory || !filters.subcategory.includes(item.subcategory)) return false
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(item.status)) return false
    }

    // Supplier filter
    if (filters.supplier && filters.supplier.length > 0) {
      if (!item.supplierName || !filters.supplier.includes(item.supplierName)) return false
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag: string) =>
        item.tags.some(itemTag => itemTag.toLowerCase().includes(tag.toLowerCase()))
      )
      if (!hasMatchingTag) return false
    }

    // Stock level filters
    if (filters.lowStock && item.currentStock > item.reorderPoint) return false
    if (filters.outOfStock && item.currentStock > 0) return false
    if (filters.hasLots && (!item.lots || item.lots.length === 0)) return false

    // Price range filters
    if (filters.priceMin && item.unitPrice < filters.priceMin) return false
    if (filters.priceMax && item.unitPrice > filters.priceMax) return false

    // Stock quantity filters
    if (filters.stockMin && item.currentStock < filters.stockMin) return false
    if (filters.stockMax && item.currentStock > filters.stockMax) return false

    // Date filters
    if (filters.createdAfter && new Date(item.createdAt || 0) < new Date(filters.createdAfter)) return false
    if (filters.createdBefore && new Date(item.createdAt || 0) > new Date(filters.createdBefore)) return false
    if (filters.updatedAfter && new Date(item.updatedAt || 0) < new Date(filters.updatedAfter)) return false
    if (filters.updatedBefore && new Date(item.updatedAt || 0) > new Date(filters.updatedBefore)) return false

    return true
  })
}

function sortInventoryItems(items: EnhancedInventoryItem[], sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc') {
  if (!sortBy) return items

  return items.sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'sku':
        aValue = a.sku.toLowerCase()
        bValue = b.sku.toLowerCase()
        break
      case 'category':
        aValue = a.category.toLowerCase()
        bValue = b.category.toLowerCase()
        break
      case 'currentStock':
        aValue = a.currentStock
        bValue = b.currentStock
        break
      case 'value':
        aValue = a.currentStock * a.unitCost
        bValue = b.currentStock * b.unitCost
        break
      case 'lastStockUpdate':
        aValue = new Date(a.lastStockUpdate || 0)
        bValue = new Date(b.lastStockUpdate || 0)
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'createdAt':
        aValue = new Date(a.createdAt || 0)
        bValue = new Date(b.createdAt || 0)
        break
      case 'updatedAt':
        aValue = new Date(a.updatedAt || 0)
        bValue = new Date(b.updatedAt || 0)
        break
      default:
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })
}

// GET /api/v2/inventory - List inventory items with advanced filtering and pagination
export const GET = ApiMiddleware.withValidation(
  InventorySearchSchema.extend({ validateQuery: true, validateBody: false }),
  { validateQuery: true, validateBody: false }
)(async (request: NextRequest, context: RequestContext, params) => {
  try {
    // Apply filters
    let filteredItems = applyInventoryFilters(mockInventoryData, params)

    // Apply sorting
    filteredItems = sortInventoryItems(filteredItems, params.sortBy, params.sortOrder)

    // Apply pagination
    const total = filteredItems.length
    const totalPages = Math.ceil(total / params.limit)
    const offset = (params.page - 1) * params.limit
    const paginatedItems = filteredItems.slice(offset, offset + params.limit)

    // Calculate metrics
    const metrics = calculateInventoryMetrics(mockInventoryData)
    const filteredMetrics = calculateInventoryMetrics(filteredItems)

    // Generate alerts for low/out of stock items
    const alerts = paginatedItems.flatMap(generateStockAlerts)

    return ApiMiddleware.createSuccessResponse(
      {
        items: paginatedItems,
        alerts,
        metrics: {
          ...metrics,
          filtered: filteredMetrics
        }
      },
      `Retrieved ${paginatedItems.length} inventory items`,
      {
        processingTime: Date.now() - Date.now()
      },
      {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1
      }
    )

  } catch (error) {
    console.error('Error fetching inventory:', error)
    throw error
  }
})

// POST /api/v2/inventory - Create new inventory item
export const POST = ApiMiddleware.withValidation(CreateInventoryItemSchema)(
  async (request: NextRequest, context: RequestContext, validatedData) => {
    try {
      // Check if SKU already exists
      const existingItem = mockInventoryData.find(item => item.sku === validatedData.sku)
      if (existingItem) {
        return ApiMiddleware.createErrorResponse(
          'SKU already exists',
          409,
          {
            sku: validatedData.sku,
            existingItemId: existingItem.id
          }
        )
      }

      // Calculate available stock
      const availableStock = validatedData.currentStock - (validatedData.reservedStock || 0)

      // Determine status based on stock levels
      let status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock' | 'low_stock' = 'active'
      if (validatedData.currentStock === 0) {
        status = 'out_of_stock'
      } else if (validatedData.currentStock <= validatedData.reorderPoint) {
        status = 'low_stock'
      }

      // Create new item
      const newItem: EnhancedInventoryItem = {
        id: `item_${Date.now()}`,
        ...validatedData,
        reservedStock: validatedData.reservedStock || 0,
        locations: validatedData.locations || [{
          id: `loc_${Date.now()}`,
          warehouseId: 'wh_001',
          warehouseName: 'Main Warehouse',
          zone: 'A',
          aisle: '1',
          shelf: '1',
          bin: '1',
          locationCode: 'A-1-1-1',
          quantity: validatedData.currentStock,
          reservedQuantity: 0,
          isDefault: true,
          isPrimary: true
        }],
        lots: [],
        status,
        isActive: validatedData.isActive ?? true,
        lastStockUpdate: new Date().toISOString(),
        createdBy: context.user?.email,
        updatedBy: context.user?.email,
        customFields: validatedData.customFields || {}
      }

      mockInventoryData.push(newItem)

      // Generate stock alerts if needed
      const alerts = generateStockAlerts(newItem)

      return ApiMiddleware.createSuccessResponse(
        {
          item: newItem,
          alerts
        },
        'Inventory item created successfully'
      )

    } catch (error) {
      console.error('Error creating inventory item:', error)
      throw error
    }
  }
)

// PUT /api/v2/inventory - Batch update inventory items
export const PUT = ApiMiddleware.withBulkOperation()(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const body = await request.json()
      const { items } = body

      if (!Array.isArray(items)) {
        return ApiMiddleware.createErrorResponse(
          'Items must be an array',
          400
        )
      }

      const updatedItems = []
      const errors = []

      for (const updateData of items) {
        try {
          const validatedData = UpdateInventoryItemSchema.parse(updateData)

          if (!validatedData.id) {
            errors.push({ id: updateData.id, error: 'ID is required for updates' })
            continue
          }

          const itemIndex = mockInventoryData.findIndex(item => item.id === validatedData.id)
          if (itemIndex === -1) {
            errors.push({ id: validatedData.id, error: 'Item not found' })
            continue
          }

          // Update item
          const existingItem = mockInventoryData[itemIndex]
          const updatedItem: EnhancedInventoryItem = {
            ...existingItem,
            ...validatedData,
            updatedBy: context.user?.email,
            updatedAt: new Date().toISOString()
          }

          // Recalculate status if stock changed
          if (validatedData.currentStock !== undefined) {
            if (updatedItem.currentStock === 0) {
              updatedItem.status = 'out_of_stock'
            } else if (updatedItem.currentStock <= updatedItem.reorderPoint) {
              updatedItem.status = 'low_stock'
            } else {
              updatedItem.status = 'active'
            }

            updatedItem.lastStockUpdate = new Date().toISOString()
          }

          mockInventoryData[itemIndex] = updatedItem
          updatedItems.push(updatedItem)

        } catch (error) {
          errors.push({
            id: updateData.id,
            error: error instanceof Error ? error.message : 'Invalid data'
          })
        }
      }

      return ApiMiddleware.createSuccessResponse(
        {
          updated: updatedItems,
          errors
        },
        `${updatedItems.length} items updated successfully${errors.length > 0 ? `, ${errors.length} errors` : ''}`
      )

    } catch (error) {
      console.error('Error batch updating inventory:', error)
      throw error
    }
  }
)

// DELETE /api/v2/inventory - Batch delete inventory items
export const DELETE = ApiMiddleware.withBulkOperation()(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const body = await request.json()
      const { ids } = body

      if (!Array.isArray(ids)) {
        return ApiMiddleware.createErrorResponse(
          'IDs must be an array',
          400
        )
      }

      const deletedItems = []
      const notFoundIds = []
      const blockedIds = []

      for (const id of ids) {
        const itemIndex = mockInventoryData.findIndex(item => item.id === id)
        if (itemIndex === -1) {
          notFoundIds.push(id)
          continue
        }

        const item = mockInventoryData[itemIndex]

        // Check if item has reserved stock (business rule)
        if (item.reservedStock > 0) {
          blockedIds.push({
            id,
            reason: `Cannot delete item with reserved stock (${item.reservedStock} reserved)`
          })
          continue
        }

        const deletedItem = mockInventoryData[itemIndex]
        mockInventoryData.splice(itemIndex, 1)
        deletedItems.push(deletedItem)
      }

      return ApiMiddleware.createSuccessResponse(
        {
          deleted: deletedItems,
          notFound: notFoundIds,
          blocked: blockedIds
        },
        `${deletedItems.length} items deleted successfully${blockedIds.length > 0 ? `, ${blockedIds.length} blocked` : ''}${notFoundIds.length > 0 ? `, ${notFoundIds.length} not found` : ''}`
      )

    } catch (error) {
      console.error('Error batch deleting inventory:', error)
      throw error
    }
  }
)