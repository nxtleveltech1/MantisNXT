import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Import mock data from parent route
let mockWarehouseData = [
  {
    id: 'wh_001',
    name: 'Main Warehouse',
    code: 'MW-001',
    address: {
      street: '123 Industrial Blvd',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'USA'
    },
    capacity: {
      volume: 50000,
      weight: 100000,
      pallets: 2000
    },
    utilization: {
      volume: 35000,
      weight: 75000,
      pallets: 1450
    },
    isActive: true,
    isPrimary: true,
    timezone: 'America/Chicago',
    operatingHours: {
      monday: { open: '08:00', close: '18:00', isOpen: true },
      tuesday: { open: '08:00', close: '18:00', isOpen: true },
      wednesday: { open: '08:00', close: '18:00', isOpen: true },
      thursday: { open: '08:00', close: '18:00', isOpen: true },
      friday: { open: '08:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '15:00', isOpen: true },
      sunday: { open: '00:00', close: '00:00', isOpen: false }
    },
    contactInfo: {
      phone: '+1-555-0123',
      email: 'warehouse@company.com',
      managerName: 'John Smith'
    },
    zones: [
      {
        id: 'zone_001',
        name: 'Zone A',
        code: 'A',
        warehouseId: 'wh_001',
        type: 'storage',
        capacity: { volume: 15000, weight: 30000, pallets: 600 },
        utilization: { volume: 12000, weight: 25000, pallets: 480 },
        aisles: [
          {
            id: 'aisle_001',
            name: 'Aisle 1',
            code: '1',
            zoneId: 'zone_001',
            shelves: [
              {
                id: 'shelf_001',
                name: 'Shelf A',
                code: 'A',
                aisleId: 'aisle_001',
                bins: [
                  {
                    id: 'bin_001',
                    code: 'A-1-A-1',
                    shelfId: 'shelf_001',
                    capacity: { volume: 10, weight: 50, items: 20 },
                    currentStock: 15,
                    status: 'available'
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    performance: {
      pickingAccuracy: 99.2,
      averagePickTime: 2.5,
      shippingAccuracy: 98.8,
      receivingEfficiency: 95.5,
      inventoryTurnover: 8.2
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-22'),
    createdBy: 'admin@company.com'
  }
]

// Validation schemas
const UpdateWarehouseSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  capacity: z.object({
    volume: z.number().min(0).optional(),
    weight: z.number().min(0).optional(),
    pallets: z.number().min(0).optional()
  }).optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  timezone: z.string().optional(),
  operatingHours: z.object({
    monday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }).optional(),
    tuesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }).optional(),
    wednesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }).optional(),
    thursday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }).optional(),
    friday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }).optional(),
    saturday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }).optional(),
    sunday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }).optional()
  }).optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    managerName: z.string().optional()
  }).optional()
})

const CreateZoneSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  type: z.enum(['storage', 'picking', 'receiving', 'shipping', 'quality_control']),
  capacity: z.object({
    volume: z.number().min(0),
    weight: z.number().min(0),
    pallets: z.number().min(0)
  }),
  temperatureControlled: z.boolean().default(false),
  temperatureRange: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  restrictions: z.array(z.string()).default([])
})

interface Params {
  id: string
}

// GET /api/warehouses/[id] - Get specific warehouse details
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params

    const warehouse = mockWarehouseData.find(w => w.id === id)

    if (!warehouse) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse not found'
      }, { status: 404 })
    }

    // Get recent warehouse activities (mock data)
    const recentActivities = [
      {
        id: 'act_001',
        type: 'stock_movement',
        action: 'inbound',
        itemName: 'Dell XPS 13 Laptop',
        quantity: 25,
        zone: 'Zone A',
        timestamp: new Date('2024-09-22T10:30:00'),
        performedBy: 'warehouse.clerk@company.com'
      },
      {
        id: 'act_002',
        type: 'zone_update',
        action: 'capacity_change',
        zone: 'Zone B',
        details: 'Capacity increased by 500 pallets',
        timestamp: new Date('2024-09-21T15:45:00'),
        performedBy: 'manager@company.com'
      }
    ]

    // Calculate utilization rates
    const utilizationRates = {
      volume: (warehouse.utilization.volume / warehouse.capacity.volume) * 100,
      weight: (warehouse.utilization.weight / warehouse.capacity.weight) * 100,
      pallets: (warehouse.utilization.pallets / warehouse.capacity.pallets) * 100
    }

    // Get performance trends (mock data)
    const performanceTrends = {
      pickingAccuracy: [
        { date: '2024-09-15', value: 98.8 },
        { date: '2024-09-16', value: 99.1 },
        { date: '2024-09-17', value: 99.3 },
        { date: '2024-09-18', value: 98.9 },
        { date: '2024-09-19', value: 99.2 },
        { date: '2024-09-20', value: 99.0 },
        { date: '2024-09-21', value: 99.2 }
      ],
      averagePickTime: [
        { date: '2024-09-15', value: 2.8 },
        { date: '2024-09-16', value: 2.6 },
        { date: '2024-09-17', value: 2.4 },
        { date: '2024-09-18', value: 2.7 },
        { date: '2024-09-19', value: 2.5 },
        { date: '2024-09-20', value: 2.6 },
        { date: '2024-09-21', value: 2.5 }
      ]
    }

    return NextResponse.json({
      success: true,
      data: {
        ...warehouse,
        utilizationRates,
        recentActivities,
        performanceTrends,
        analytics: {
          totalItems: 1250,
          uniqueSkus: 450,
          averageDaysInStock: 45,
          fastMovingItems: 125,
          slowMovingItems: 85,
          deadStock: 12
        }
      }
    })

  } catch (error) {
    console.error('Error fetching warehouse:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PUT /api/warehouses/[id] - Update specific warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params
    const body = await request.json()

    const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id)

    if (warehouseIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse not found'
      }, { status: 404 })
    }

    const validatedData = UpdateWarehouseSchema.parse(body)

    // Check if code change conflicts with existing warehouses
    if (validatedData.code) {
      const existingWarehouse = mockWarehouseData.find(w =>
        w.code === validatedData.code && w.id !== id
      )
      if (existingWarehouse) {
        return NextResponse.json({
          success: false,
          error: 'Warehouse code already exists',
          details: { code: validatedData.code }
        }, { status: 409 })
      }
    }

    // Handle primary warehouse logic
    if (validatedData.isPrimary) {
      mockWarehouseData.forEach(w => {
        if (w.id !== id && w.isPrimary) {
          w.isPrimary = false
        }
      })
    }

    const existingWarehouse = mockWarehouseData[warehouseIndex]
    const updatedWarehouse = {
      ...existingWarehouse,
      ...validatedData,
      // Merge nested objects properly
      address: validatedData.address ? { ...existingWarehouse.address, ...validatedData.address } : existingWarehouse.address,
      capacity: validatedData.capacity ? { ...existingWarehouse.capacity, ...validatedData.capacity } : existingWarehouse.capacity,
      operatingHours: validatedData.operatingHours ? { ...existingWarehouse.operatingHours, ...validatedData.operatingHours } : existingWarehouse.operatingHours,
      contactInfo: validatedData.contactInfo ? { ...existingWarehouse.contactInfo, ...validatedData.contactInfo } : existingWarehouse.contactInfo,
      updatedAt: new Date()
    }

    mockWarehouseData[warehouseIndex] = updatedWarehouse

    return NextResponse.json({
      success: true,
      data: updatedWarehouse,
      message: 'Warehouse updated successfully'
    })

  } catch (error) {
    console.error('Error updating warehouse:', error)

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

// DELETE /api/warehouses/[id] - Delete specific warehouse
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params

    const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id)

    if (warehouseIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse not found'
      }, { status: 404 })
    }

    const warehouse = mockWarehouseData[warehouseIndex]

    // Check if warehouse is primary
    if (warehouse.isPrimary) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete primary warehouse',
        details: { isPrimary: true }
      }, { status: 409 })
    }

    // Check if warehouse has active inventory
    if (warehouse.utilization.volume > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete warehouse with active inventory',
        details: {
          utilization: warehouse.utilization,
          message: 'Transfer or remove all inventory before deletion'
        }
      }, { status: 409 })
    }

    const deletedWarehouse = mockWarehouseData[warehouseIndex]
    mockWarehouseData.splice(warehouseIndex, 1)

    return NextResponse.json({
      success: true,
      data: deletedWarehouse,
      message: 'Warehouse deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting warehouse:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/warehouses/[id] - Add zone to warehouse
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params
    const body = await request.json()

    const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id)

    if (warehouseIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse not found'
      }, { status: 404 })
    }

    const validatedData = CreateZoneSchema.parse(body)
    const warehouse = mockWarehouseData[warehouseIndex]

    // Check if zone code already exists in this warehouse
    const existingZone = warehouse.zones.find(z => z.code === validatedData.code)
    if (existingZone) {
      return NextResponse.json({
        success: false,
        error: 'Zone code already exists in this warehouse',
        details: { code: validatedData.code }
      }, { status: 409 })
    }

    // Check if adding this zone would exceed warehouse capacity
    const totalZoneCapacity = warehouse.zones.reduce((sum, z) => sum + z.capacity.volume, 0) + validatedData.capacity.volume
    if (totalZoneCapacity > warehouse.capacity.volume) {
      return NextResponse.json({
        success: false,
        error: 'Zone capacity would exceed warehouse capacity',
        details: {
          warehouseCapacity: warehouse.capacity.volume,
          currentZoneTotal: warehouse.zones.reduce((sum, z) => sum + z.capacity.volume, 0),
          requestedCapacity: validatedData.capacity.volume,
          wouldExceedBy: totalZoneCapacity - warehouse.capacity.volume
        }
      }, { status: 409 })
    }

    const newZone = {
      id: `zone_${Date.now()}`,
      warehouseId: id,
      ...validatedData,
      utilization: {
        volume: 0,
        weight: 0,
        pallets: 0
      },
      aisles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    warehouse.zones.push(newZone)
    warehouse.updatedAt = new Date()

    mockWarehouseData[warehouseIndex] = warehouse

    return NextResponse.json({
      success: true,
      data: newZone,
      message: 'Zone added to warehouse successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding zone to warehouse:', error)

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