import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const CreateWarehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required')
  }),
  capacity: z.object({
    volume: z.number().min(0, 'Volume must be non-negative'),
    weight: z.number().min(0, 'Weight must be non-negative'),
    pallets: z.number().min(0, 'Pallets must be non-negative')
  }),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
  timezone: z.string().default('UTC'),
  operatingHours: z.object({
    monday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    tuesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    wednesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    thursday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    friday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    saturday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    sunday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    })
  }).optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    managerName: z.string().optional()
  }).optional()
})

const UpdateWarehouseSchema = CreateWarehouseSchema.partial()

const SearchWarehousesSchema = z.object({
  query: z.string().optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'code', 'city', 'capacity', 'utilization']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Mock database
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
      volume: 50000, // cubic meters
      weight: 100000, // kg
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

// GET /api/warehouses - List warehouses with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryParams = {
      query: searchParams.get('query') || undefined,
      isActive: searchParams.get('isActive') === 'true' || undefined,
      isPrimary: searchParams.get('isPrimary') === 'true' || undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      country: searchParams.get('country') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'asc'
    }

    const validatedParams = SearchWarehousesSchema.parse(queryParams)

    // Apply filters
    let filteredWarehouses = mockWarehouseData.filter(warehouse => {
      // Text search
      if (validatedParams.query) {
        const query = validatedParams.query.toLowerCase()
        const matchesQuery =
          warehouse.name.toLowerCase().includes(query) ||
          warehouse.code.toLowerCase().includes(query) ||
          warehouse.address.city.toLowerCase().includes(query) ||
          warehouse.address.state.toLowerCase().includes(query)

        if (!matchesQuery) return false
      }

      // Status filters
      if (validatedParams.isActive !== undefined && warehouse.isActive !== validatedParams.isActive) {
        return false
      }

      if (validatedParams.isPrimary !== undefined && warehouse.isPrimary !== validatedParams.isPrimary) {
        return false
      }

      // Location filters
      if (validatedParams.city && warehouse.address.city !== validatedParams.city) {
        return false
      }

      if (validatedParams.state && warehouse.address.state !== validatedParams.state) {
        return false
      }

      if (validatedParams.country && warehouse.address.country !== validatedParams.country) {
        return false
      }

      return true
    })

    // Apply sorting
    if (validatedParams.sortBy) {
      filteredWarehouses.sort((a, b) => {
        let aValue: any, bValue: any

        switch (validatedParams.sortBy) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'code':
            aValue = a.code
            bValue = b.code
            break
          case 'city':
            aValue = a.address.city
            bValue = b.address.city
            break
          case 'capacity':
            aValue = a.capacity.volume
            bValue = b.capacity.volume
            break
          case 'utilization':
            aValue = (a.utilization.volume / a.capacity.volume) * 100
            bValue = (b.utilization.volume / b.capacity.volume) * 100
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
    const total = filteredWarehouses.length
    const totalPages = Math.ceil(total / validatedParams.limit)
    const offset = (validatedParams.page - 1) * validatedParams.limit
    const paginatedWarehouses = filteredWarehouses.slice(offset, offset + validatedParams.limit)

    // Calculate summary metrics
    const metrics = {
      totalWarehouses: mockWarehouseData.length,
      activeWarehouses: mockWarehouseData.filter(w => w.isActive).length,
      totalCapacity: mockWarehouseData.reduce((sum, w) => sum + w.capacity.volume, 0),
      totalUtilization: mockWarehouseData.reduce((sum, w) => sum + w.utilization.volume, 0),
      averageUtilizationRate: mockWarehouseData.length > 0 ?
        mockWarehouseData.reduce((sum, w) => sum + (w.utilization.volume / w.capacity.volume), 0) / mockWarehouseData.length * 100 : 0
    }

    return NextResponse.json({
      success: true,
      data: paginatedWarehouses,
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
    console.error('Error fetching warehouses:', error)

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

// POST /api/warehouses - Create new warehouse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateWarehouseSchema.parse(body)

    // Check if code already exists
    const existingWarehouse = mockWarehouseData.find(w => w.code === validatedData.code)
    if (existingWarehouse) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse code already exists',
        details: { code: validatedData.code }
      }, { status: 409 })
    }

    // If this is being set as primary, update existing primary
    if (validatedData.isPrimary) {
      mockWarehouseData.forEach(w => {
        if (w.isPrimary) w.isPrimary = false
      })
    }

    const newWarehouse = {
      id: `wh_${Date.now()}`,
      ...validatedData,
      utilization: {
        volume: 0,
        weight: 0,
        pallets: 0
      },
      zones: [],
      performance: {
        pickingAccuracy: 0,
        averagePickTime: 0,
        shippingAccuracy: 0,
        receivingEfficiency: 0,
        inventoryTurnover: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'api_user@company.com'
    }

    mockWarehouseData.push(newWarehouse)

    return NextResponse.json({
      success: true,
      data: newWarehouse,
      message: 'Warehouse created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating warehouse:', error)

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

// PUT /api/warehouses - Batch update warehouses
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { warehouses } = body

    if (!Array.isArray(warehouses)) {
      return NextResponse.json({
        success: false,
        error: 'Warehouses must be an array'
      }, { status: 400 })
    }

    const updatedWarehouses = []
    const errors = []

    for (const updateData of warehouses) {
      try {
        const validatedData = UpdateWarehouseSchema.parse(updateData)

        if (!validatedData.id) {
          errors.push({ id: updateData.id, error: 'ID is required for updates' })
          continue
        }

        const warehouseIndex = mockWarehouseData.findIndex(w => w.id === validatedData.id)
        if (warehouseIndex === -1) {
          errors.push({ id: validatedData.id, error: 'Warehouse not found' })
          continue
        }

        // Handle primary warehouse logic
        if (validatedData.isPrimary) {
          mockWarehouseData.forEach(w => {
            if (w.id !== validatedData.id && w.isPrimary) {
              w.isPrimary = false
            }
          })
        }

        const existingWarehouse = mockWarehouseData[warehouseIndex]
        const updatedWarehouse = {
          ...existingWarehouse,
          ...validatedData,
          updatedAt: new Date()
        }

        mockWarehouseData[warehouseIndex] = updatedWarehouse
        updatedWarehouses.push(updatedWarehouse)

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
        updated: updatedWarehouses,
        errors
      },
      message: `${updatedWarehouses.length} warehouses updated successfully${errors.length > 0 ? `, ${errors.length} errors` : ''}`
    })

  } catch (error) {
    console.error('Error batch updating warehouses:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/warehouses - Batch delete warehouses
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

    const deletedWarehouses = []
    const notFoundIds = []
    const blockedIds = []

    for (const id of ids) {
      const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id)
      if (warehouseIndex === -1) {
        notFoundIds.push(id)
        continue
      }

      const warehouse = mockWarehouseData[warehouseIndex]

      // Check if warehouse is primary
      if (warehouse.isPrimary) {
        blockedIds.push({ id, reason: 'Cannot delete primary warehouse' })
        continue
      }

      // Check if warehouse has active inventory
      if (warehouse.utilization.volume > 0) {
        blockedIds.push({ id, reason: 'Cannot delete warehouse with active inventory' })
        continue
      }

      const deletedWarehouse = mockWarehouseData[warehouseIndex]
      mockWarehouseData.splice(warehouseIndex, 1)
      deletedWarehouses.push(deletedWarehouse)
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: deletedWarehouses,
        notFound: notFoundIds,
        blocked: blockedIds
      },
      message: `${deletedWarehouses.length} warehouses deleted successfully${blockedIds.length > 0 ? `, ${blockedIds.length} blocked` : ''}${notFoundIds.length > 0 ? `, ${notFoundIds.length} not found` : ''}`
    })

  } catch (error) {
    console.error('Error batch deleting warehouses:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}