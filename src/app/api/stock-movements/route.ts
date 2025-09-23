import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const CreateStockMovementSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  type: z.enum(['inbound', 'outbound', 'transfer', 'adjustment']),
  subType: z.enum(['purchase', 'sale', 'return', 'damage', 'theft', 'correction', 'cycle_count', 'warehouse_transfer']).optional(),
  quantity: z.number().min(0.01, 'Quantity must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  lotNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  totalValue: z.number().optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional()
})

const SearchStockMovementsSchema = z.object({
  itemId: z.string().optional(),
  type: z.array(z.enum(['inbound', 'outbound', 'transfer', 'adjustment'])).optional(),
  subType: z.array(z.string()).optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
  performedBy: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  referenceNumber: z.string().optional(),
  minQuantity: z.number().optional(),
  maxQuantity: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['timestamp', 'quantity', 'value', 'type', 'itemName']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Mock database
let mockStockMovements = [
  {
    id: 'mov_001',
    itemId: 'item_001',
    itemName: 'Dell XPS 13 Laptop (i7, 16GB)',
    itemSku: 'DELL-XPS13-001',
    type: 'inbound',
    subType: 'purchase',
    quantity: 30,
    reason: 'Purchase Order Receipt',
    fromLocationId: null,
    fromLocationName: null,
    toLocationId: 'loc_001',
    toLocationName: 'Main Warehouse - A-1-2-3',
    warehouseId: 'wh_001',
    warehouseName: 'Main Warehouse',
    lotNumber: null,
    batchNumber: 'BATCH-2024-001',
    expiryDate: null,
    referenceNumber: 'PO-2024-0850',
    unitCost: 1299.99,
    totalValue: 38999.70,
    performedBy: 'warehouse.clerk@company.com',
    performedByName: 'Jane Doe',
    timestamp: new Date('2024-09-20T10:00:00'),
    notes: 'Received in good condition, all items inspected',
    createdAt: new Date('2024-09-20T10:00:00'),
    updatedAt: new Date('2024-09-20T10:00:00')
  },
  {
    id: 'mov_002',
    itemId: 'item_001',
    itemName: 'Dell XPS 13 Laptop (i7, 16GB)',
    itemSku: 'DELL-XPS13-001',
    type: 'outbound',
    subType: 'sale',
    quantity: 5,
    reason: 'Sales Order Fulfillment',
    fromLocationId: 'loc_001',
    fromLocationName: 'Main Warehouse - A-1-2-3',
    toLocationId: null,
    toLocationName: null,
    warehouseId: 'wh_001',
    warehouseName: 'Main Warehouse',
    lotNumber: null,
    batchNumber: 'BATCH-2024-001',
    expiryDate: null,
    referenceNumber: 'SO-2024-1420',
    unitCost: 1299.99,
    totalValue: 6499.95,
    performedBy: 'picker.jane@company.com',
    performedByName: 'John Smith',
    timestamp: new Date('2024-09-21T14:30:00'),
    notes: 'Picked for customer order #1420',
    createdAt: new Date('2024-09-21T14:30:00'),
    updatedAt: new Date('2024-09-21T14:30:00')
  },
  {
    id: 'mov_003',
    itemId: 'item_001',
    itemName: 'Dell XPS 13 Laptop (i7, 16GB)',
    itemSku: 'DELL-XPS13-001',
    type: 'adjustment',
    subType: 'cycle_count',
    quantity: 2,
    reason: 'Cycle count adjustment - found discrepancy',
    fromLocationId: null,
    fromLocationName: null,
    toLocationId: 'loc_001',
    toLocationName: 'Main Warehouse - A-1-2-3',
    warehouseId: 'wh_001',
    warehouseName: 'Main Warehouse',
    lotNumber: null,
    batchNumber: null,
    expiryDate: null,
    referenceNumber: 'CC-2024-0045',
    unitCost: 1299.99,
    totalValue: 2599.98,
    performedBy: 'inventory.manager@company.com',
    performedByName: 'Mike Johnson',
    timestamp: new Date('2024-09-22T09:15:00'),
    notes: 'Physical count showed 2 more units than system records',
    createdAt: new Date('2024-09-22T09:15:00'),
    updatedAt: new Date('2024-09-22T09:15:00')
  }
]

// GET /api/stock-movements - List stock movements with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryParams = {
      itemId: searchParams.get('itemId') || undefined,
      type: searchParams.get('type')?.split(',') || undefined,
      subType: searchParams.get('subType')?.split(',') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      performedBy: searchParams.get('performedBy') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      referenceNumber: searchParams.get('referenceNumber') || undefined,
      minQuantity: searchParams.get('minQuantity') ? parseFloat(searchParams.get('minQuantity')!) : undefined,
      maxQuantity: searchParams.get('maxQuantity') ? parseFloat(searchParams.get('maxQuantity')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'timestamp',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    }

    const validatedParams = SearchStockMovementsSchema.parse(queryParams)

    // Apply filters
    let filteredMovements = mockStockMovements.filter(movement => {
      // Item filter
      if (validatedParams.itemId && movement.itemId !== validatedParams.itemId) {
        return false
      }

      // Type filter
      if (validatedParams.type && validatedParams.type.length > 0) {
        if (!validatedParams.type.includes(movement.type)) return false
      }

      // SubType filter
      if (validatedParams.subType && validatedParams.subType.length > 0) {
        if (!movement.subType || !validatedParams.subType.includes(movement.subType)) return false
      }

      // Warehouse filter
      if (validatedParams.warehouseId && movement.warehouseId !== validatedParams.warehouseId) {
        return false
      }

      // Location filter
      if (validatedParams.locationId) {
        const matchesLocation = movement.fromLocationId === validatedParams.locationId ||
                              movement.toLocationId === validatedParams.locationId
        if (!matchesLocation) return false
      }

      // Performed by filter
      if (validatedParams.performedBy && movement.performedBy !== validatedParams.performedBy) {
        return false
      }

      // Date range filter
      if (validatedParams.dateFrom) {
        const fromDate = new Date(validatedParams.dateFrom)
        if (movement.timestamp < fromDate) return false
      }

      if (validatedParams.dateTo) {
        const toDate = new Date(validatedParams.dateTo)
        toDate.setHours(23, 59, 59, 999) // End of day
        if (movement.timestamp > toDate) return false
      }

      // Reference number filter
      if (validatedParams.referenceNumber) {
        const refMatch = movement.referenceNumber?.toLowerCase().includes(validatedParams.referenceNumber.toLowerCase())
        if (!refMatch) return false
      }

      // Quantity range filter
      if (validatedParams.minQuantity !== undefined && movement.quantity < validatedParams.minQuantity) {
        return false
      }

      if (validatedParams.maxQuantity !== undefined && movement.quantity > validatedParams.maxQuantity) {
        return false
      }

      return true
    })

    // Apply sorting
    filteredMovements.sort((a, b) => {
      let aValue: any, bValue: any

      switch (validatedParams.sortBy) {
        case 'timestamp':
          aValue = a.timestamp
          bValue = b.timestamp
          break
        case 'quantity':
          aValue = a.quantity
          bValue = b.quantity
          break
        case 'value':
          aValue = a.totalValue || 0
          bValue = b.totalValue || 0
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'itemName':
          aValue = a.itemName
          bValue = b.itemName
          break
        default:
          aValue = a.timestamp
          bValue = b.timestamp
      }

      if (aValue < bValue) return validatedParams.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return validatedParams.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Apply pagination
    const total = filteredMovements.length
    const totalPages = Math.ceil(total / validatedParams.limit)
    const offset = (validatedParams.page - 1) * validatedParams.limit
    const paginatedMovements = filteredMovements.slice(offset, offset + validatedParams.limit)

    // Calculate summary metrics
    const metrics = {
      totalMovements: mockStockMovements.length,
      inboundMovements: mockStockMovements.filter(m => m.type === 'inbound').length,
      outboundMovements: mockStockMovements.filter(m => m.type === 'outbound').length,
      transferMovements: mockStockMovements.filter(m => m.type === 'transfer').length,
      adjustmentMovements: mockStockMovements.filter(m => m.type === 'adjustment').length,
      totalValue: mockStockMovements.reduce((sum, m) => sum + (m.totalValue || 0), 0),
      averageMovementValue: mockStockMovements.length > 0 ?
        mockStockMovements.reduce((sum, m) => sum + (m.totalValue || 0), 0) / mockStockMovements.length : 0
    }

    return NextResponse.json({
      success: true,
      data: paginatedMovements,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1
      },
      metrics,
      filters: validatedParams
    })

  } catch (error) {
    console.error('Error fetching stock movements:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/stock-movements - Create new stock movement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateStockMovementSchema.parse(body)

    // Validate location requirements based on movement type
    if (validatedData.type === 'transfer') {
      if (!validatedData.fromLocationId || !validatedData.toLocationId) {
        return NextResponse.json({
          success: false,
          error: 'Transfer movements require both from and to locations',
          details: { fromLocationId: validatedData.fromLocationId, toLocationId: validatedData.toLocationId }
        }, { status: 400 })
      }
    } else if (validatedData.type === 'inbound') {
      if (!validatedData.toLocationId) {
        return NextResponse.json({
          success: false,
          error: 'Inbound movements require a destination location',
          details: { toLocationId: validatedData.toLocationId }
        }, { status: 400 })
      }
    } else if (validatedData.type === 'outbound') {
      if (!validatedData.fromLocationId) {
        return NextResponse.json({
          success: false,
          error: 'Outbound movements require a source location',
          details: { fromLocationId: validatedData.fromLocationId }
        }, { status: 400 })
      }
    }

    // Calculate total value if not provided
    const totalValue = validatedData.totalValue ||
                      (validatedData.unitCost ? validatedData.quantity * validatedData.unitCost : 0)

    // Mock location and item data lookup
    const mockItemData = {
      'item_001': {
        name: 'Dell XPS 13 Laptop (i7, 16GB)',
        sku: 'DELL-XPS13-001'
      }
    }

    const mockLocationData = {
      'loc_001': {
        name: 'Main Warehouse - A-1-2-3',
        warehouseId: 'wh_001',
        warehouseName: 'Main Warehouse'
      }
    }

    const itemInfo = mockItemData[validatedData.itemId as keyof typeof mockItemData] || {
      name: 'Unknown Item',
      sku: 'UNKNOWN'
    }

    const fromLocationInfo = validatedData.fromLocationId ?
      mockLocationData[validatedData.fromLocationId as keyof typeof mockLocationData] : null

    const toLocationInfo = validatedData.toLocationId ?
      mockLocationData[validatedData.toLocationId as keyof typeof mockLocationData] : null

    const newMovement = {
      id: `mov_${Date.now()}`,
      ...validatedData,
      itemName: itemInfo.name,
      itemSku: itemInfo.sku,
      fromLocationName: fromLocationInfo?.name || null,
      toLocationName: toLocationInfo?.name || null,
      warehouseId: toLocationInfo?.warehouseId || fromLocationInfo?.warehouseId || 'wh_001',
      warehouseName: toLocationInfo?.warehouseName || fromLocationInfo?.warehouseName || 'Main Warehouse',
      totalValue,
      performedBy: validatedData.performedBy || 'api_user@company.com',
      performedByName: 'API User',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockStockMovements.unshift(newMovement) // Add to beginning for recent-first sorting

    return NextResponse.json({
      success: true,
      data: newMovement,
      message: 'Stock movement recorded successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating stock movement:', error)

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

// DELETE /api/stock-movements - Batch delete stock movements (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, reason } = body

    if (!Array.isArray(ids)) {
      return NextResponse.json({
        success: false,
        error: 'IDs must be an array'
      }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({
        success: false,
        error: 'Deletion reason is required'
      }, { status: 400 })
    }

    const deletedMovements = []
    const notFoundIds = []

    for (const id of ids) {
      const movementIndex = mockStockMovements.findIndex(m => m.id === id)
      if (movementIndex === -1) {
        notFoundIds.push(id)
        continue
      }

      const deletedMovement = mockStockMovements[movementIndex]
      mockStockMovements.splice(movementIndex, 1)
      deletedMovements.push({
        ...deletedMovement,
        deletedAt: new Date(),
        deletionReason: reason
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: deletedMovements,
        notFound: notFoundIds
      },
      message: `${deletedMovements.length} stock movements deleted successfully${notFoundIds.length > 0 ? `, ${notFoundIds.length} not found` : ''}`
    })

  } catch (error) {
    console.error('Error batch deleting stock movements:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}