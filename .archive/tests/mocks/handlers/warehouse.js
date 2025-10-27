import { http, HttpResponse } from 'msw'

const mockWarehouses = [
  {
    id: 'wh_001',
    name: 'Main Warehouse',
    code: 'MAIN',
    address: {
      street: '123 Industrial Blvd',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'USA'
    },
    capacity: 10000,
    currentUtilization: 8500,
    zones: [
      { id: 'zone_a', name: 'Zone A', code: 'A', capacity: 2000, currentStock: 1800 },
      { id: 'zone_b', name: 'Zone B', code: 'B', capacity: 2000, currentStock: 1600 },
      { id: 'zone_c', name: 'Zone C', code: 'C', capacity: 2000, currentStock: 1700 },
      { id: 'zone_d', name: 'Zone D', code: 'D', capacity: 2000, currentStock: 1500 },
      { id: 'zone_e', name: 'Zone E', code: 'E', capacity: 2000, currentStock: 1900 }
    ],
    status: 'active',
    manager: 'John Smith',
    contact: {
      phone: '+1-555-0123',
      email: 'john.smith@company.com'
    },
    operatingHours: {
      monday: { open: '08:00', close: '18:00' },
      tuesday: { open: '08:00', close: '18:00' },
      wednesday: { open: '08:00', close: '18:00' },
      thursday: { open: '08:00', close: '18:00' },
      friday: { open: '08:00', close: '18:00' },
      saturday: { open: '09:00', close: '15:00' },
      sunday: { closed: true }
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-22')
  },
  {
    id: 'wh_002',
    name: 'Distribution Center',
    code: 'DIST',
    address: {
      street: '456 Logistics Way',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62702',
      country: 'USA'
    },
    capacity: 8000,
    currentUtilization: 4960,
    zones: [
      { id: 'zone_f', name: 'Zone F', code: 'F', capacity: 2000, current

: 1240 },
      { id: 'zone_g', name: 'Zone G', code: 'G', capacity: 2000, currentStock: 1240 },
      { id: 'zone_h', name: 'Zone H', code: 'H', capacity: 2000, currentStock: 1240 },
      { id: 'zone_i', name: 'Zone I', code: 'I', capacity: 2000, currentStock: 1240 }
    ],
    status: 'active',
    manager: 'Jane Doe',
    contact: {
      phone: '+1-555-0124',
      email: 'jane.doe@company.com'
    },
    operatingHours: {
      monday: { open: '06:00', close: '20:00' },
      tuesday: { open: '06:00', close: '20:00' },
      wednesday: { open: '06:00', close: '20:00' },
      thursday: { open: '06:00', close: '20:00' },
      friday: { open: '06:00', close: '20:00' },
      saturday: { open: '08:00', close: '16:00' },
      sunday: { closed: true }
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-09-22')
  }
]

export const warehouseHandlers = [
  // GET /api/warehouses - List warehouses
  http.get('/api/warehouses', () => {
    return HttpResponse.json({
      success: true,
      data: mockWarehouses,
      total: mockWarehouses.length
    })
  }),

  // GET /api/warehouses/[id] - Get specific warehouse
  http.get('/api/warehouses/:id', ({ params }) => {
    const { id } = params
    const warehouse = mockWarehouses.find(w => w.id === id)

    if (!warehouse) {
      return HttpResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      )
    }

    // Add additional warehouse details
    const warehouseDetails = {
      ...warehouse,
      locations: [
        {
          id: 'loc_001',
          warehouseId: warehouse.id,
          zone: 'A',
          aisle: '1',
          shelf: '2',
          bin: '3',
          locationCode: 'A-1-2-3',
          capacity: 100,
          currentStock: 75,
          itemCount: 25
        },
        {
          id: 'loc_002',
          warehouseId: warehouse.id,
          zone: 'B',
          aisle: '1',
          shelf: '1',
          bin: '1',
          locationCode: 'B-1-1-1',
          capacity: 50,
          currentStock: 30,
          itemCount: 15
        }
      ],
      recentActivity: [
        {
          id: 'activity_001',
          type: 'stock_adjustment',
          description: 'Stock adjustment for item SKU-001',
          timestamp: new Date('2024-09-22T10:30:00'),
          user: 'warehouse.clerk@company.com'
        },
        {
          id: 'activity_002',
          type: 'item_received',
          description: 'Received shipment PO-2024-0850',
          timestamp: new Date('2024-09-21T14:00:00'),
          user: 'receiving.manager@company.com'
        }
      ]
    }

    return HttpResponse.json({
      success: true,
      data: warehouseDetails
    })
  }),

  // POST /api/warehouses - Create new warehouse
  http.post('/api/warehouses', async ({ request }) => {
    const body = await request.json()

    const newWarehouse = {
      id: `wh_${Date.now()}`,
      ...body,
      currentUtilization: 0,
      zones: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockWarehouses.push(newWarehouse)

    return HttpResponse.json({
      success: true,
      data: newWarehouse,
      message: 'Warehouse created successfully'
    }, { status: 201 })
  }),

  // PUT /api/warehouses/[id] - Update warehouse
  http.put('/api/warehouses/:id', async ({ params, request }) => {
    const { id } = params
    const body = await request.json()

    const warehouseIndex = mockWarehouses.findIndex(w => w.id === id)

    if (warehouseIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      )
    }

    const updatedWarehouse = {
      ...mockWarehouses[warehouseIndex],
      ...body,
      updatedAt: new Date()
    }

    mockWarehouses[warehouseIndex] = updatedWarehouse

    return HttpResponse.json({
      success: true,
      data: updatedWarehouse,
      message: 'Warehouse updated successfully'
    })
  }),

  // DELETE /api/warehouses/[id] - Delete warehouse
  http.delete('/api/warehouses/:id', ({ params }) => {
    const { id } = params

    const warehouseIndex = mockWarehouses.findIndex(w => w.id === id)

    if (warehouseIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      )
    }

    const deletedWarehouse = mockWarehouses[warehouseIndex]
    mockWarehouses.splice(warehouseIndex, 1)

    return HttpResponse.json({
      success: true,
      data: deletedWarehouse,
      message: 'Warehouse deleted successfully'
    })
  })
]