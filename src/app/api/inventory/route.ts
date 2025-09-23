import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const CreateInventoryItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  currentStock: z.number().min(0, 'Current stock must be non-negative'),
  reorderPoint: z.number().min(0, 'Reorder point must be non-negative'),
  maxStock: z.number().min(0, 'Max stock must be non-negative'),
  minStock: z.number().min(0, 'Min stock must be non-negative'),
  unitCost: z.number().min(0, 'Unit cost must be non-negative'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  currency: z.string().default('USD'),
  unit: z.string().default('pcs'),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierSku: z.string().optional(),
  primaryLocationId: z.string(),
  batchTracking: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional()
})

const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial()

const SearchInventorySchema = z.object({
  query: z.string().optional(),
  category: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  warehouse: z.array(z.string()).optional(),
  supplier: z.array(z.string()).optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'sku', 'category', 'currentStock', 'value', 'lastStockUpdate', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

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

// GET /api/inventory - List inventory items with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category')?.split(',') || undefined,
      status: searchParams.get('status')?.split(',') || undefined,
      warehouse: searchParams.get('warehouse')?.split(',') || undefined,
      supplier: searchParams.get('supplier')?.split(',') || undefined,
      lowStock: searchParams.get('lowStock') === 'true' || undefined,
      outOfStock: searchParams.get('outOfStock') === 'true' || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'asc'
    }

    const validatedParams = SearchInventorySchema.parse(queryParams)

    // Apply filters
    let filteredItems = mockInventoryData.filter(item => {
      // Text search
      if (validatedParams.query) {
        const query = validatedParams.query.toLowerCase()
        const matchesQuery =
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.tags.some(tag => tag.toLowerCase().includes(query))

        if (!matchesQuery) return false
      }

      // Category filter
      if (validatedParams.category && validatedParams.category.length > 0) {
        if (!validatedParams.category.includes(item.category)) return false
      }

      // Status filter
      if (validatedParams.status && validatedParams.status.length > 0) {
        if (!validatedParams.status.includes(item.status)) return false
      }

      // Low stock filter
      if (validatedParams.lowStock && item.currentStock > item.reorderPoint) {
        return false
      }

      // Out of stock filter
      if (validatedParams.outOfStock && item.currentStock > 0) {
        return false
      }

      return true
    })

    // Apply sorting
    if (validatedParams.sortBy) {
      filteredItems.sort((a, b) => {
        let aValue: any, bValue: any

        switch (validatedParams.sortBy) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'sku':
            aValue = a.sku
            bValue = b.sku
            break
          case 'category':
            aValue = a.category
            bValue = b.category
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
            aValue = a.lastStockUpdate
            bValue = b.lastStockUpdate
            break
          case 'status':
            aValue = a.status
            bValue = b.status
            break
          default:
            aValue = a.name
            bValue = b.name
        }

        if (aValue < bValue) return validatedParams.sortOrder === 'asc' ? -1 : 1
        if (aValue > bValue) return validatedParams.sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const total = filteredItems.length
    const totalPages = Math.ceil(total / validatedParams.limit)
    const offset = (validatedParams.page - 1) * validatedParams.limit
    const paginatedItems = filteredItems.slice(offset, offset + validatedParams.limit)

    // Calculate metrics
    const metrics = {
      totalItems: mockInventoryData.length,
      totalValue: mockInventoryData.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0),
      lowStockItems: mockInventoryData.filter(item => item.currentStock <= item.reorderPoint).length,
      outOfStockItems: mockInventoryData.filter(item => item.currentStock === 0).length,
      averageValue: mockInventoryData.length > 0 ?
        mockInventoryData.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0) / mockInventoryData.length : 0
    }

    return NextResponse.json({
      success: true,
      data: paginatedItems,
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
    console.error('Error fetching inventory:', error)

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

// POST /api/inventory - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateInventoryItemSchema.parse(body)

    // Check if SKU already exists
    const existingItem = mockInventoryData.find(item => item.sku === validatedData.sku)
    if (existingItem) {
      return NextResponse.json({
        success: false,
        error: 'SKU already exists',
        details: { sku: validatedData.sku }
      }, { status: 409 })
    }

    // Create new item
    const newItem = {
      id: `item_${Date.now()}`,
      ...validatedData,
      reservedStock: 0,
      availableStock: validatedData.currentStock,
      locations: [{
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
      alerts: [],
      status: validatedData.currentStock > 0 ? 'active' : 'out_of_stock',
      lastStockUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'api_user@company.com'
    }

    mockInventoryData.push(newItem)

    // Generate stock alerts if needed
    const alerts = []
    if (newItem.currentStock <= newItem.reorderPoint) {
      alerts.push({
        id: `alert_${Date.now()}`,
        type: newItem.currentStock === 0 ? 'out_of_stock' : 'low_stock',
        severity: 'warning',
        title: `${newItem.currentStock === 0 ? 'Out of Stock' : 'Low Stock'} Alert`,
        message: `${newItem.name} ${newItem.currentStock === 0 ? 'is out of stock' : 'is running low'}`,
        isActive: true,
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: newItem,
      alerts,
      message: 'Inventory item created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating inventory item:', error)

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

// PUT /api/inventory - Batch update inventory items
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body

    if (!Array.isArray(items)) {
      return NextResponse.json({
        success: false,
        error: 'Items must be an array'
      }, { status: 400 })
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
        const updatedItem = {
          ...existingItem,
          ...validatedData,
          availableStock: validatedData.currentStock !== undefined ?
            validatedData.currentStock - existingItem.reservedStock :
            existingItem.availableStock,
          updatedAt: new Date()
        }

        mockInventoryData[itemIndex] = updatedItem
        updatedItems.push(updatedItem)

      } catch (error) {
        errors.push({
          id: updateData.id,
          error: error instanceof z.ZodError ? error.errors : 'Invalid data'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        updated: updatedItems,
        errors
      },
      message: `${updatedItems.length} items updated successfully${errors.length > 0 ? `, ${errors.length} errors` : ''}`
    })

  } catch (error) {
    console.error('Error batch updating inventory:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/inventory - Batch delete inventory items
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids)) {
      return NextResponse.json({
        success: false,
        error: 'IDs must be an array'
      }, { status: 400 })
    }

    const deletedItems = []
    const notFoundIds = []

    for (const id of ids) {
      const itemIndex = mockInventoryData.findIndex(item => item.id === id)
      if (itemIndex === -1) {
        notFoundIds.push(id)
        continue
      }

      const deletedItem = mockInventoryData[itemIndex]
      mockInventoryData.splice(itemIndex, 1)
      deletedItems.push(deletedItem)
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: deletedItems,
        notFound: notFoundIds
      },
      message: `${deletedItems.length} items deleted successfully${notFoundIds.length > 0 ? `, ${notFoundIds.length} not found` : ''}`
    })

  } catch (error) {
    console.error('Error batch deleting inventory:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}