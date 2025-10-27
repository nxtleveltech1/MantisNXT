import { http, HttpResponse } from 'msw'

const mockInventoryData = [
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
    unitCost: 1299.99,
    unitPrice: 1599.99,
    currency: 'USD',
    unit: 'pcs',
    status: 'active',
    supplierId: 'sup_001',
    supplierName: 'Dell Technologies',
    supplierSku: 'XPS13-I7-16GB',
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
    alerts: [],
    lastStockUpdate: new Date('2024-09-22T10:30:00'),
    lastOrderDate: new Date('2024-09-15'),
    nextDeliveryDate: new Date('2024-09-30'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-09-22'),
    createdBy: 'admin@company.com',
    tags: ['laptop', 'premium', 'dell'],
    notes: 'High-demand item, monitor stock levels closely'
  },
  {
    id: 'item_002',
    sku: 'LOW-STOCK-TEST',
    name: 'Low Stock Test Item',
    description: 'Item for testing low stock scenarios',
    category: 'Test',
    currentStock: 2,
    reservedStock: 0,
    availableStock: 2,
    reorderPoint: 5,
    maxStock: 20,
    minStock: 1,
    unitCost: 10.00,
    unitPrice: 15.00,
    currency: 'USD',
    unit: 'pcs',
    status: 'low_stock',
    locations: [{
      id: 'loc_002',
      warehouseId: 'wh_001',
      warehouseName: 'Main Warehouse',
      zone: 'B',
      aisle: '1',
      shelf: '1',
      bin: '1',
      locationCode: 'B-1-1-1',
      quantity: 2,
      reservedQuantity: 0,
      isDefault: true,
      isPrimary: true
    }],
    primaryLocationId: 'loc_002',
    batchTracking: false,
    lots: [],
    alerts: [{
      id: 'alert_001',
      type: 'low_stock',
      severity: 'warning',
      message: 'Stock level below reorder point',
      isActive: true,
      createdAt: new Date()
    }],
    lastStockUpdate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test@company.com',
    tags: ['test', 'low-stock'],
    notes: 'Test item for low stock alerts'
  },
  {
    id: 'item_003',
    sku: 'OUT-OF-STOCK-TEST',
    name: 'Out of Stock Test Item',
    description: 'Item for testing out of stock scenarios',
    category: 'Test',
    currentStock: 0,
    reservedStock: 0,
    availableStock: 0,
    reorderPoint: 5,
    maxStock: 20,
    minStock: 1,
    unitCost: 25.00,
    unitPrice: 35.00,
    currency: 'USD',
    unit: 'pcs',
    status: 'out_of_stock',
    locations: [{
      id: 'loc_003',
      warehouseId: 'wh_001',
      warehouseName: 'Main Warehouse',
      zone: 'C',
      aisle: '1',
      shelf: '1',
      bin: '1',
      locationCode: 'C-1-1-1',
      quantity: 0,
      reservedQuantity: 0,
      isDefault: true,
      isPrimary: true
    }],
    primaryLocationId: 'loc_003',
    batchTracking: false,
    lots: [],
    alerts: [{
      id: 'alert_002',
      type: 'out_of_stock',
      severity: 'critical',
      message: 'Item is completely out of stock',
      isActive: true,
      createdAt: new Date()
    }],
    lastStockUpdate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test@company.com',
    tags: ['test', 'out-of-stock'],
    notes: 'Test item for out of stock scenarios'
  }
]

export const inventoryHandlers = [
  // GET /api/inventory - List inventory items
  http.get('/api/inventory', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const query = url.searchParams.get('query')
    const category = url.searchParams.get('category')?.split(',')
    const status = url.searchParams.get('status')?.split(',')
    const lowStock = url.searchParams.get('lowStock') === 'true'
    const outOfStock = url.searchParams.get('outOfStock') === 'true'

    let filteredItems = [...mockInventoryData]

    // Apply filters
    if (query) {
      const q = query.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      )
    }

    if (category && category.length > 0) {
      filteredItems = filteredItems.filter(item => category.includes(item.category))
    }

    if (status && status.length > 0) {
      filteredItems = filteredItems.filter(item => status.includes(item.status))
    }

    if (lowStock) {
      filteredItems = filteredItems.filter(item => item.currentStock <= item.reorderPoint && item.currentStock > 0)
    }

    if (outOfStock) {
      filteredItems = filteredItems.filter(item => item.currentStock === 0)
    }

    // Apply pagination
    const total = filteredItems.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedItems = filteredItems.slice(offset, offset + limit)

    const metrics = {
      totalItems: mockInventoryData.length,
      totalValue: mockInventoryData.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0),
      lowStockItems: mockInventoryData.filter(item => item.currentStock <= item.reorderPoint && item.currentStock > 0).length,
      outOfStockItems: mockInventoryData.filter(item => item.currentStock === 0).length,
      averageValue: mockInventoryData.length > 0 ?
        mockInventoryData.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0) / mockInventoryData.length : 0
    }

    return HttpResponse.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      metrics
    })
  }),

  // GET /api/inventory/[id] - Get specific inventory item
  http.get('/api/inventory/:id', ({ params }) => {
    const { id } = params
    const item = mockInventoryData.find(item => item.id === id)

    if (!item) {
      return HttpResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

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

    return HttpResponse.json({
      success: true,
      data: {
        ...item,
        stockMovements,
        analytics: {
          stockTurnover: 4.2,
          daysInStock: 87,
          velocity: 'medium',
          lastMovementDate: new Date('2024-09-21T14:30:00'),
          averageMonthlyConsumption: 12
        }
      }
    })
  }),

  // POST /api/inventory - Create new inventory item
  http.post('/api/inventory', async ({ request }) => {
    const body = await request.json()

    // Check if SKU already exists
    const existingItem = mockInventoryData.find(item => item.sku === body.sku)
    if (existingItem) {
      return HttpResponse.json(
        {
          success: false,
          error: 'SKU already exists',
          details: { sku: body.sku }
        },
        { status: 409 }
      )
    }

    const newItem = {
      id: `item_${Date.now()}`,
      ...body,
      reservedStock: 0,
      availableStock: body.currentStock,
      locations: [{
        id: `loc_${Date.now()}`,
        warehouseId: 'wh_001',
        warehouseName: 'Main Warehouse',
        zone: 'A',
        aisle: '1',
        shelf: '1',
        bin: '1',
        locationCode: 'A-1-1-1',
        quantity: body.currentStock,
        reservedQuantity: 0,
        isDefault: true,
        isPrimary: true
      }],
      lots: [],
      alerts: [],
      status: body.currentStock > 0 ? 'active' : 'out_of_stock',
      lastStockUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'api_user@company.com'
    }

    mockInventoryData.push(newItem)

    return HttpResponse.json({
      success: true,
      data: newItem,
      message: 'Inventory item created successfully'
    }, { status: 201 })
  }),

  // PUT /api/inventory/[id] - Update specific inventory item
  http.put('/api/inventory/:id', async ({ params, request }) => {
    const { id } = params
    const body = await request.json()

    const itemIndex = mockInventoryData.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    const existingItem = mockInventoryData[itemIndex]
    const updatedItem = {
      ...existingItem,
      ...body,
      updatedAt: new Date()
    }

    mockInventoryData[itemIndex] = updatedItem

    return HttpResponse.json({
      success: true,
      data: updatedItem,
      message: 'Inventory item updated successfully'
    })
  }),

  // DELETE /api/inventory/[id] - Delete specific inventory item
  http.delete('/api/inventory/:id', ({ params }) => {
    const { id } = params

    const itemIndex = mockInventoryData.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    const deletedItem = mockInventoryData[itemIndex]

    if (deletedItem.reservedStock > 0) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Cannot delete item with reserved stock',
          details: { reservedStock: deletedItem.reservedStock }
        },
        { status: 409 }
      )
    }

    mockInventoryData.splice(itemIndex, 1)

    return HttpResponse.json({
      success: true,
      data: deletedItem,
      message: 'Inventory item deleted successfully'
    })
  }),

  // POST /api/inventory/[id]/stock-adjustment - Adjust stock
  http.post('/api/inventory/:id/stock-adjustment', async ({ params, request }) => {
    const { id } = params
    const body = await request.json()

    const itemIndex = mockInventoryData.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    const existingItem = mockInventoryData[itemIndex]
    const newStock = existingItem.currentStock + body.adjustment

    if (newStock < 0) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Insufficient stock for adjustment',
          details: {
            currentStock: existingItem.currentStock,
            requestedAdjustment: body.adjustment,
            resultingStock: newStock
          }
        },
        { status: 409 }
      )
    }

    const updatedItem = {
      ...existingItem,
      currentStock: newStock,
      availableStock: newStock - existingItem.reservedStock,
      lastStockUpdate: new Date(),
      updatedAt: new Date()
    }

    if (newStock === 0) {
      updatedItem.status = 'out_of_stock'
    } else if (newStock <= updatedItem.reorderPoint) {
      updatedItem.status = 'low_stock'
    } else {
      updatedItem.status = 'active'
    }

    mockInventoryData[itemIndex] = updatedItem

    const stockMovement = {
      id: `mov_${Date.now()}`,
      itemId: id,
      type: body.adjustment > 0 ? 'inbound' : 'outbound',
      subType: 'adjustment',
      quantity: Math.abs(body.adjustment),
      reason: body.reason,
      referenceNumber: body.referenceNumber || `ADJ-${Date.now()}`,
      performedBy: 'api_user@company.com',
      timestamp: new Date(),
      notes: body.notes
    }

    return HttpResponse.json({
      success: true,
      data: {
        item: updatedItem,
        stockMovement,
        previousStock: existingItem.currentStock,
        newStock: updatedItem.currentStock,
        adjustment: body.adjustment
      },
      message: 'Stock adjustment completed successfully'
    })
  })
]