import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Mock database - In a real app, this would be your database connection
let mockInventoryData = [
  {
    id: 'item_001',
    sku: 'DELL-XPS13-001',
    name: 'Dell XPS 13 Laptop (i7, 16GB)',
    description: 'Premium ultrabook with Intel i7 processor and 16GB RAM',
    category: 'Electronics',
    subcategory: 'Laptops',
    currentStock: 25,
    reservedStock: 3,
    availableStock: 22,
    reorderPoint: 10,
    maxStock: 50,
    minStock: 5,
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
    primaryLocationId: 'loc_001',
    batchTracking: false,
    lots: [],
    supplierId: 'sup_001',
    supplierName: 'Dell Technologies',
    supplierSku: 'XPS13-I7-16GB',
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
    status: 'active',
    alerts: [],
    lastStockUpdate: new Date('2024-09-22T10:30:00'),
    lastOrderDate: new Date('2024-09-15'),
    nextDeliveryDate: new Date('2024-09-30'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-09-22'),
    createdBy: 'admin@company.com',
    tags: ['laptop', 'premium', 'dell'],
    notes: 'High-demand item, monitor stock levels closely'
  }
]

// Validation schemas
const UpdateInventoryItemSchema = z.object({
  sku: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  currentStock: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  currency: z.string().optional(),
  unit: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierSku: z.string().optional(),
  primaryLocationId: z.string().optional(),
  batchTracking: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
})

const StockAdjustmentSchema = z.object({
  adjustment: z.number(),
  reason: z.string().min(1, 'Reason is required'),
  locationId: z.string().optional(),
  lotNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional()
})

interface Params {
  id: string
}

// GET /api/inventory/[id] - Get specific inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params

    const item = mockInventoryData.find(item => item.id === id)

    if (!item) {
      return NextResponse.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 })
    }

    // Get stock movement history for this item (mock data)
    const stockMovements = [
      {
        id: 'mov_001',
        type: 'inbound',
        quantity: 30,
        reason: 'Purchase Order Receipt',
        timestamp: new Date('2024-09-20T10:00:00'),
        performedBy: 'warehouse.clerk@company.com',
        referenceNumber: 'PO-2024-0850'
      },
      {
        id: 'mov_002',
        type: 'outbound',
        quantity: -5,
        reason: 'Sales Order Fulfillment',
        timestamp: new Date('2024-09-21T14:30:00'),
        performedBy: 'picker.jane@company.com',
        referenceNumber: 'SO-2024-1420'
      }
    ]

    // Get related alerts for this item
    const alerts = [
      {
        id: 'alert_001',
        type: 'low_stock',
        severity: 'warning',
        message: 'Stock level approaching reorder point',
        isActive: item.currentStock <= item.reorderPoint,
        createdAt: new Date('2024-09-22T08:00:00')
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        stockMovements,
        alerts: alerts.filter(alert => alert.isActive),
        analytics: {
          stockTurnover: 4.2,
          daysInStock: 87,
          velocity: 'medium',
          lastMovementDate: new Date('2024-09-21T14:30:00'),
          averageMonthlyConsumption: 12
        }
      }
    })

  } catch (error) {
    console.error('Error fetching inventory item:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PUT /api/inventory/[id] - Update specific inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params
    const body = await request.json()

    const itemIndex = mockInventoryData.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 })
    }

    const validatedData = UpdateInventoryItemSchema.parse(body)

    // Check if SKU change conflicts with existing items
    if (validatedData.sku) {
      const existingItem = mockInventoryData.find(item =>
        item.sku === validatedData.sku && item.id !== id
      )
      if (existingItem) {
        return NextResponse.json({
          success: false,
          error: 'SKU already exists for another item',
          details: { sku: validatedData.sku }
        }, { status: 409 })
      }
    }

    const existingItem = mockInventoryData[itemIndex]
    const updatedItem = {
      ...existingItem,
      ...validatedData,
      availableStock: validatedData.currentStock !== undefined ?
        validatedData.currentStock - existingItem.reservedStock :
        existingItem.availableStock,
      updatedAt: new Date()
    }

    // Update status based on stock levels
    if (validatedData.currentStock !== undefined) {
      if (validatedData.currentStock === 0) {
        updatedItem.status = 'out_of_stock'
      } else if (validatedData.currentStock <= updatedItem.reorderPoint) {
        updatedItem.status = 'low_stock'
      } else {
        updatedItem.status = 'active'
      }
    }

    mockInventoryData[itemIndex] = updatedItem

    // Generate alerts if stock levels require attention
    const alerts = []
    if (updatedItem.currentStock <= updatedItem.reorderPoint) {
      alerts.push({
        id: `alert_${Date.now()}`,
        type: updatedItem.currentStock === 0 ? 'out_of_stock' : 'low_stock',
        severity: updatedItem.currentStock === 0 ? 'critical' : 'warning',
        title: `${updatedItem.currentStock === 0 ? 'Out of Stock' : 'Low Stock'} Alert`,
        message: `${updatedItem.name} ${updatedItem.currentStock === 0 ? 'is out of stock' : 'is running low'}`,
        isActive: true,
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      alerts,
      message: 'Inventory item updated successfully'
    })

  } catch (error) {
    console.error('Error updating inventory item:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/inventory/[id] - Delete specific inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params

    const itemIndex = mockInventoryData.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 })
    }

    const deletedItem = mockInventoryData[itemIndex]

    // Check if item has reserved stock or active orders
    if (deletedItem.reservedStock > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete item with reserved stock',
        details: { reservedStock: deletedItem.reservedStock }
      }, { status: 409 })
    }

    // Soft delete in production - here we'll actually remove it
    mockInventoryData.splice(itemIndex, 1)

    return NextResponse.json({
      success: true,
      data: deletedItem,
      message: 'Inventory item deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting inventory item:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/inventory/[id]/stock-adjustment - Adjust stock for specific item
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params
    const body = await request.json()

    const itemIndex = mockInventoryData.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 })
    }

    const validatedData = StockAdjustmentSchema.parse(body)
    const existingItem = mockInventoryData[itemIndex]

    // Calculate new stock level
    const newStock = existingItem.currentStock + validatedData.adjustment

    if (newStock < 0) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient stock for adjustment',
        details: {
          currentStock: existingItem.currentStock,
          requestedAdjustment: validatedData.adjustment,
          resultingStock: newStock
        }
      }, { status: 409 })
    }

    // Update item
    const updatedItem = {
      ...existingItem,
      currentStock: newStock,
      availableStock: newStock - existingItem.reservedStock,
      lastStockUpdate: new Date(),
      updatedAt: new Date()
    }

    // Update status based on new stock level
    if (newStock === 0) {
      updatedItem.status = 'out_of_stock'
    } else if (newStock <= updatedItem.reorderPoint) {
      updatedItem.status = 'low_stock'
    } else {
      updatedItem.status = 'active'
    }

    mockInventoryData[itemIndex] = updatedItem

    // Create stock movement record
    const stockMovement = {
      id: `mov_${Date.now()}`,
      itemId: id,
      type: validatedData.adjustment > 0 ? 'inbound' : 'outbound',
      subType: 'adjustment',
      quantity: Math.abs(validatedData.adjustment),
      reason: validatedData.reason,
      locationId: validatedData.locationId || existingItem.primaryLocationId,
      lotNumber: validatedData.lotNumber,
      referenceNumber: validatedData.referenceNumber || `ADJ-${Date.now()}`,
      unitCost: existingItem.unitCost,
      totalValue: Math.abs(validatedData.adjustment) * existingItem.unitCost,
      performedBy: 'api_user@company.com', // In real app, get from auth
      timestamp: new Date(),
      notes: validatedData.notes
    }

    // Generate alerts if needed
    const alerts = []
    if (updatedItem.currentStock <= updatedItem.reorderPoint) {
      alerts.push({
        id: `alert_${Date.now()}`,
        type: updatedItem.currentStock === 0 ? 'out_of_stock' : 'low_stock',
        severity: updatedItem.currentStock === 0 ? 'critical' : 'warning',
        title: `${updatedItem.currentStock === 0 ? 'Out of Stock' : 'Low Stock'} Alert`,
        message: `${updatedItem.name} ${updatedItem.currentStock === 0 ? 'is out of stock after adjustment' : 'is running low after adjustment'}`,
        isActive: true,
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        item: updatedItem,
        stockMovement,
        previousStock: existingItem.currentStock,
        newStock: updatedItem.currentStock,
        adjustment: validatedData.adjustment
      },
      alerts,
      message: 'Stock adjustment completed successfully'
    })

  } catch (error) {
    console.error('Error adjusting stock:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}