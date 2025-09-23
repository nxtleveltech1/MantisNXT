/**
 * Individual Inventory Item API v2 - GET, PUT, DELETE for specific items
 */

import { NextRequest } from 'next/server'
import { ApiMiddleware, RequestContext } from '@/lib/api/middleware'
import { UpdateInventoryItemSchema, EnhancedInventoryItem } from '@/lib/api/validation'

// Import the same mock data (in production this would be from a database)
import { mockInventoryData } from '../route'

// GET /api/v2/inventory/[id] - Get specific inventory item
export const GET = ApiMiddleware.withAuth(
  async (request: NextRequest, context: RequestContext, { params }: { params: { id: string } }) => {
    try {
      const { id } = params

      const item = mockInventoryData.find(item => item.id === id)
      if (!item) {
        return ApiMiddleware.createErrorResponse(
          'Inventory item not found',
          404,
          { requestedId: id }
        )
      }

      // Generate stock alerts for this item
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

      // Calculate related statistics
      const categoryItems = mockInventoryData.filter(i => i.category === item.category)
      const supplierItems = item.supplierId
        ? mockInventoryData.filter(i => i.supplierId === item.supplierId)
        : []

      const relatedData = {
        categoryStats: {
          totalInCategory: categoryItems.length,
          averagePrice: categoryItems.reduce((sum, i) => sum + i.unitPrice, 0) / categoryItems.length,
          averageStock: categoryItems.reduce((sum, i) => sum + i.currentStock, 0) / categoryItems.length
        },
        supplierStats: item.supplierId ? {
          totalFromSupplier: supplierItems.length,
          averageLeadTime: 7, // Would be calculated from supplier data
          lastOrderDate: item.lastOrderDate
        } : null,
        stockMovements: [], // Would fetch recent stock movements
        priceHistory: [], // Would fetch price change history
        similarItems: mockInventoryData
          .filter(i => i.category === item.category && i.id !== item.id)
          .slice(0, 5)
          .map(i => ({
            id: i.id,
            sku: i.sku,
            name: i.name,
            unitPrice: i.unitPrice,
            currentStock: i.currentStock
          }))
      }

      return ApiMiddleware.createSuccessResponse(
        {
          item,
          alerts,
          related: relatedData
        },
        'Inventory item retrieved successfully'
      )

    } catch (error) {
      console.error('Error fetching inventory item:', error)
      throw error
    }
  },
  { requiredPermissions: ['read'] }
)

// PUT /api/v2/inventory/[id] - Update specific inventory item
export const PUT = ApiMiddleware.withValidation(UpdateInventoryItemSchema)(
  async (request: NextRequest, context: RequestContext, validatedData, { params }: { params: { id: string } }) => {
    try {
      const { id } = params

      const itemIndex = mockInventoryData.findIndex(item => item.id === id)
      if (itemIndex === -1) {
        return ApiMiddleware.createErrorResponse(
          'Inventory item not found',
          404,
          { requestedId: id }
        )
      }

      // Check if SKU conflict exists (if SKU is being updated)
      if (validatedData.sku) {
        const existingItem = mockInventoryData.find(item =>
          item.sku === validatedData.sku && item.id !== id
        )
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
      }

      const existingItem = mockInventoryData[itemIndex]

      // Track what fields are being updated for audit purposes
      const changedFields = Object.keys(validatedData).filter(key =>
        validatedData[key] !== existingItem[key]
      )

      // Update item
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
        } else if (updatedItem.status === 'out_of_stock' || updatedItem.status === 'low_stock') {
          updatedItem.status = 'active'
        }

        updatedItem.lastStockUpdate = new Date().toISOString()
      }

      // Update reserved stock calculation if needed
      if (validatedData.currentStock !== undefined || validatedData.reservedStock !== undefined) {
        // Ensure reserved stock doesn't exceed current stock
        if (updatedItem.reservedStock > updatedItem.currentStock) {
          return ApiMiddleware.createErrorResponse(
            'Reserved stock cannot exceed current stock',
            400,
            {
              currentStock: updatedItem.currentStock,
              reservedStock: updatedItem.reservedStock
            }
          )
        }
      }

      mockInventoryData[itemIndex] = updatedItem

      // Generate stock alerts if needed
      const alerts = []
      if (updatedItem.currentStock === 0) {
        alerts.push({
          id: `alert_${Date.now()}`,
          type: 'out_of_stock',
          severity: 'critical',
          title: 'Out of Stock Alert',
          message: `${updatedItem.name} is now out of stock`,
          itemId: updatedItem.id,
          isActive: true,
          createdAt: new Date().toISOString()
        })
      } else if (updatedItem.currentStock <= updatedItem.reorderPoint) {
        alerts.push({
          id: `alert_${Date.now()}`,
          type: 'low_stock',
          severity: 'warning',
          title: 'Low Stock Alert',
          message: `${updatedItem.name} is running low (${updatedItem.currentStock} remaining)`,
          itemId: updatedItem.id,
          isActive: true,
          createdAt: new Date().toISOString()
        })
      }

      // Create audit trail entry
      const auditEntry = {
        id: `audit_${Date.now()}`,
        itemId: updatedItem.id,
        action: 'update',
        changedFields,
        previousValues: Object.fromEntries(
          changedFields.map(field => [field, existingItem[field]])
        ),
        newValues: Object.fromEntries(
          changedFields.map(field => [field, updatedItem[field]])
        ),
        performedBy: context.user?.email,
        timestamp: new Date().toISOString(),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress
      }

      return ApiMiddleware.createSuccessResponse(
        {
          item: updatedItem,
          alerts,
          audit: auditEntry,
          changedFields
        },
        'Inventory item updated successfully'
      )

    } catch (error) {
      console.error('Error updating inventory item:', error)
      throw error
    }
  },
  { requiredPermissions: ['write'] }
)

// DELETE /api/v2/inventory/[id] - Delete specific inventory item
export const DELETE = ApiMiddleware.withAuth(
  async (request: NextRequest, context: RequestContext, { params }: { params: { id: string } }) => {
    try {
      const { id } = params

      const itemIndex = mockInventoryData.findIndex(item => item.id === id)
      if (itemIndex === -1) {
        return ApiMiddleware.createErrorResponse(
          'Inventory item not found',
          404,
          { requestedId: id }
        )
      }

      const item = mockInventoryData[itemIndex]

      // Business rule checks before deletion
      const blockers = []

      // Check if item has reserved stock
      if (item.reservedStock > 0) {
        blockers.push(`Item has reserved stock (${item.reservedStock} units)`)
      }

      // Check if item has pending orders (would check against orders database)
      // For demo purposes, we'll simulate this check
      const hasPendingOrders = false // Would be: await checkPendingOrders(item.id)
      if (hasPendingOrders) {
        blockers.push('Item has pending purchase orders')
      }

      // Check if item has recent stock movements (business rule: can't delete items with activity in last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      if (item.lastStockUpdate && new Date(item.lastStockUpdate) > thirtyDaysAgo) {
        blockers.push('Item has recent stock activity (within 30 days)')
      }

      if (blockers.length > 0) {
        return ApiMiddleware.createErrorResponse(
          'Cannot delete inventory item',
          400,
          {
            blockers,
            suggestion: 'Consider deactivating the item instead of deleting it'
          }
        )
      }

      // Soft delete option - set status to inactive instead of actual deletion
      const { searchParams } = new URL(request.url)
      const force = searchParams.get('force') === 'true'
      const softDelete = searchParams.get('soft') === 'true'

      if (softDelete) {
        // Soft delete - just deactivate
        item.isActive = false
        item.status = 'inactive'
        item.updatedBy = context.user?.email
        item.updatedAt = new Date().toISOString()

        return ApiMiddleware.createSuccessResponse(
          {
            item,
            deletionType: 'soft'
          },
          'Inventory item deactivated successfully'
        )
      }

      if (!force && (item.currentStock > 0 || item.reservedStock > 0)) {
        return ApiMiddleware.createErrorResponse(
          'Cannot delete item with stock',
          400,
          {
            currentStock: item.currentStock,
            reservedStock: item.reservedStock,
            suggestion: 'Use ?force=true to force deletion or ?soft=true for soft delete'
          }
        )
      }

      // Perform actual deletion
      const deletedItem = mockInventoryData[itemIndex]
      mockInventoryData.splice(itemIndex, 1)

      // Create audit trail entry
      const auditEntry = {
        id: `audit_${Date.now()}`,
        itemId: deletedItem.id,
        action: 'delete',
        deletedItem: { ...deletedItem },
        performedBy: context.user?.email,
        timestamp: new Date().toISOString(),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        forced: force
      }

      return ApiMiddleware.createSuccessResponse(
        {
          deletedItem,
          audit: auditEntry,
          deletionType: 'hard'
        },
        'Inventory item deleted successfully'
      )

    } catch (error) {
      console.error('Error deleting inventory item:', error)
      throw error
    }
  },
  { requiredPermissions: ['delete'] }
)