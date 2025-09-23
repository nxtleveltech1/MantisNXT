import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const CreatePricelistSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  name: z.string().min(1, 'Pricelist name is required'),
  description: z.string().optional(),
  effectiveFrom: z.string().min(1, 'Effective date is required'),
  effectiveTo: z.string().optional(),
  currency: z.string().default('USD'),
  items: z.array(z.object({
    sku: z.string().min(1, 'SKU is required'),
    supplierSku: z.string().optional(),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    minimumQuantity: z.number().min(1, 'Minimum quantity must be positive').optional(),
    maximumQuantity: z.number().optional(),
    leadTimeDays: z.number().min(0).optional(),
    notes: z.string().optional()
  })).min(1, 'At least one item is required'),
  isActive: z.boolean().default(true),
  version: z.string().optional(),
  replaceExisting: z.boolean().default(false)
})

const UpdatePricelistSchema = CreatePricelistSchema.partial().extend({
  id: z.string().min(1, 'Pricelist ID is required')
})

const SearchPricelistsSchema = z.object({
  supplierId: z.string().optional(),
  isActive: z.boolean().optional(),
  effectiveDate: z.string().optional(),
  currency: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'effectiveFrom', 'itemCount', 'lastUpdated']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Mock database for pricelists
let mockPricelistData: any[] = [
  {
    id: 'price_001',
    supplierId: 'sup_001',
    supplierName: 'Dell Technologies',
    name: 'Q4 2024 Enterprise Pricing',
    description: 'Corporate pricing for Q4 2024 with volume discounts',
    effectiveFrom: new Date('2024-10-01'),
    effectiveTo: new Date('2024-12-31'),
    currency: 'USD',
    isActive: true,
    version: '2.1',
    itemCount: 145,
    totalValue: 2847650.00,
    averagePrice: 19639.66,
    lastUpdated: new Date('2024-09-20'),
    createdAt: new Date('2024-09-01'),
    createdBy: 'admin@company.com',
    items: [
      {
        id: 'item_001',
        sku: 'DELL-XPS13-001',
        supplierSku: 'XPS13-I7-16GB',
        unitPrice: 1299.99,
        minimumQuantity: 1,
        maximumQuantity: 50,
        leadTimeDays: 7,
        notes: 'Enterprise pricing with 2% early payment discount'
      },
      {
        id: 'item_002',
        sku: 'DELL-MON27-001',
        supplierSku: 'U2722DE',
        unitPrice: 549.99,
        minimumQuantity: 1,
        maximumQuantity: 100,
        leadTimeDays: 5,
        notes: 'Includes 3-year premium support'
      }
    ],
    approvalStatus: 'approved',
    approvedBy: 'procurement@company.com',
    approvedAt: new Date('2024-09-22'),
    analytics: {
      utilizationRate: 78.5,
      averageOrderValue: 15840.00,
      topItemBySku: 'DELL-XPS13-001',
      priceVariance: 2.3,
      lastOrderDate: new Date('2024-09-15')
    }
  }
]

// GET /api/suppliers/pricelists - List pricelists with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryParams = {
      supplierId: searchParams.get('supplierId') || undefined,
      isActive: searchParams.get('isActive') === 'true' || undefined,
      effectiveDate: searchParams.get('effectiveDate') || undefined,
      currency: searchParams.get('currency') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    }

    const validatedParams = SearchPricelistsSchema.parse(queryParams)

    // Apply filters
    let filteredPricelists = mockPricelistData.filter(pricelist => {
      // Supplier filter
      if (validatedParams.supplierId && pricelist.supplierId !== validatedParams.supplierId) {
        return false
      }

      // Active status filter
      if (validatedParams.isActive !== undefined && pricelist.isActive !== validatedParams.isActive) {
        return false
      }

      // Effective date filter
      if (validatedParams.effectiveDate) {
        const filterDate = new Date(validatedParams.effectiveDate)
        if (pricelist.effectiveFrom > filterDate || (pricelist.effectiveTo && pricelist.effectiveTo < filterDate)) {
          return false
        }
      }

      // Currency filter
      if (validatedParams.currency && pricelist.currency !== validatedParams.currency) {
        return false
      }

      return true
    })

    // Apply sorting
    if (validatedParams.sortBy) {
      filteredPricelists.sort((a, b) => {
        let aValue: any, bValue: any

        switch (validatedParams.sortBy) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'effectiveFrom':
            aValue = a.effectiveFrom
            bValue = b.effectiveFrom
            break
          case 'itemCount':
            aValue = a.itemCount
            bValue = b.itemCount
            break
          case 'lastUpdated':
            aValue = a.lastUpdated
            bValue = b.lastUpdated
            break
          default:
            aValue = a.lastUpdated
            bValue = b.lastUpdated
        }

        if (aValue < bValue) return validatedParams.sortOrder === 'asc' ? -1 : 1
        if (aValue > bValue) return validatedParams.sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const total = filteredPricelists.length
    const totalPages = Math.ceil(total / validatedParams.limit)
    const offset = (validatedParams.page - 1) * validatedParams.limit
    const paginatedPricelists = filteredPricelists.slice(offset, offset + validatedParams.limit)

    // Calculate metrics
    const metrics = {
      totalPricelists: mockPricelistData.length,
      activePricelists: mockPricelistData.filter(p => p.isActive).length,
      totalItems: mockPricelistData.reduce((sum, p) => sum + p.itemCount, 0),
      totalValue: mockPricelistData.reduce((sum, p) => sum + p.totalValue, 0),
      averageItemsPerPricelist: mockPricelistData.length > 0 ?
        mockPricelistData.reduce((sum, p) => sum + p.itemCount, 0) / mockPricelistData.length : 0,
      currencyDistribution: mockPricelistData.reduce((acc, p) => {
        acc[p.currency] = (acc[p.currency] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      data: paginatedPricelists,
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
    console.error('Error fetching pricelists:', error)

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

// POST /api/suppliers/pricelists - Create new pricelist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreatePricelistSchema.parse(body)

    // Validate supplier exists (in real app, check database)
    // For mock, we'll assume supplier exists

    // Check for duplicate name for the same supplier
    const existingPricelist = mockPricelistData.find(p =>
      p.supplierId === validatedData.supplierId &&
      p.name === validatedData.name &&
      p.isActive
    )

    if (existingPricelist && !validatedData.replaceExisting) {
      return NextResponse.json({
        success: false,
        error: 'Active pricelist with this name already exists for this supplier',
        details: {
          name: validatedData.name,
          existingId: existingPricelist.id
        }
      }, { status: 409 })
    }

    // If replacing existing, deactivate the old one
    if (existingPricelist && validatedData.replaceExisting) {
      existingPricelist.isActive = false
      existingPricelist.updatedAt = new Date()
      existingPricelist.replacedBy = `price_${Date.now()}`
    }

    // Calculate metrics for the new pricelist
    const totalValue = validatedData.items.reduce((sum, item) => sum + item.unitPrice, 0)
    const averagePrice = validatedData.items.length > 0 ? totalValue / validatedData.items.length : 0

    // Create new pricelist
    const newPricelist = {
      id: `price_${Date.now()}`,
      supplierId: validatedData.supplierId,
      supplierName: 'Supplier Name', // In real app, fetch from supplier table
      name: validatedData.name,
      description: validatedData.description || '',
      effectiveFrom: new Date(validatedData.effectiveFrom),
      effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
      currency: validatedData.currency,
      isActive: validatedData.isActive,
      version: validatedData.version || '1.0',
      itemCount: validatedData.items.length,
      totalValue,
      averagePrice,
      items: validatedData.items.map(item => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...item
      })),
      approvalStatus: 'pending',
      approvedBy: null,
      approvedAt: null,
      lastUpdated: new Date(),
      createdAt: new Date(),
      createdBy: 'api_user@company.com',
      analytics: {
        utilizationRate: 0,
        averageOrderValue: 0,
        topItemBySku: validatedData.items[0]?.sku || '',
        priceVariance: 0,
        lastOrderDate: null
      }
    }

    mockPricelistData.push(newPricelist)

    // Generate import summary
    const importSummary = {
      pricelistId: newPricelist.id,
      itemsImported: validatedData.items.length,
      totalValue: newPricelist.totalValue,
      averagePrice: newPricelist.averagePrice,
      categories: [...new Set(validatedData.items.map(item => 'General'))].length, // Simplified
      duplicatesFound: 0, // Would be calculated during import
      validationIssues: 0,
      estimatedLeadTime: validatedData.items.reduce((avg, item) =>
        avg + (item.leadTimeDays || 7), 0) / validatedData.items.length,
      recommendations: [
        'Review pricing for competitive positioning',
        'Set up automated reorder points',
        'Consider volume discount negotiations'
      ]
    }

    return NextResponse.json({
      success: true,
      data: newPricelist,
      importSummary,
      message: 'Pricelist created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating pricelist:', error)

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

// PUT /api/suppliers/pricelists - Update existing pricelist
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UpdatePricelistSchema.parse(body)

    const pricelistIndex = mockPricelistData.findIndex(p => p.id === validatedData.id)
    if (pricelistIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Pricelist not found'
      }, { status: 404 })
    }

    const existingPricelist = mockPricelistData[pricelistIndex]

    // Check for approval status - can't modify approved pricelists
    if (existingPricelist.approvalStatus === 'approved' && !validatedData.isActive === false) {
      return NextResponse.json({
        success: false,
        error: 'Cannot modify approved pricelist. Create a new version instead.'
      }, { status: 409 })
    }

    // Recalculate metrics if items are updated
    let totalValue = existingPricelist.totalValue
    let averagePrice = existingPricelist.averagePrice
    let itemCount = existingPricelist.itemCount

    if (validatedData.items) {
      totalValue = validatedData.items.reduce((sum, item) => sum + item.unitPrice, 0)
      averagePrice = validatedData.items.length > 0 ? totalValue / validatedData.items.length : 0
      itemCount = validatedData.items.length
    }

    const updatedPricelist = {
      ...existingPricelist,
      ...validatedData,
      totalValue,
      averagePrice,
      itemCount,
      items: validatedData.items ? validatedData.items.map(item => ({
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...item
      })) : existingPricelist.items,
      lastUpdated: new Date(),
      version: validatedData.items ?
        `${existingPricelist.version.split('.')[0]}.${parseInt(existingPricelist.version.split('.')[1]) + 1}` :
        existingPricelist.version
    }

    mockPricelistData[pricelistIndex] = updatedPricelist

    return NextResponse.json({
      success: true,
      data: updatedPricelist,
      message: 'Pricelist updated successfully'
    })

  } catch (error) {
    console.error('Error updating pricelist:', error)

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

// DELETE /api/suppliers/pricelists - Delete pricelist
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pricelistId = searchParams.get('id')

    if (!pricelistId) {
      return NextResponse.json({
        success: false,
        error: 'Pricelist ID is required'
      }, { status: 400 })
    }

    const pricelistIndex = mockPricelistData.findIndex(p => p.id === pricelistId)
    if (pricelistIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Pricelist not found'
      }, { status: 404 })
    }

    const pricelist = mockPricelistData[pricelistIndex]

    // Check if pricelist is in use (has orders, etc.)
    // For this mock, we'll allow deletion but mark as soft delete
    if (pricelist.analytics.utilizationRate > 0) {
      // Soft delete - mark as inactive instead of removing
      pricelist.isActive = false
      pricelist.deletedAt = new Date()
      pricelist.deletedBy = 'api_user@company.com'

      return NextResponse.json({
        success: true,
        message: 'Pricelist deactivated (soft delete) due to existing usage',
        data: { id: pricelistId, action: 'deactivated' }
      })
    } else {
      // Hard delete - completely remove
      mockPricelistData.splice(pricelistIndex, 1)

      return NextResponse.json({
        success: true,
        message: 'Pricelist deleted successfully',
        data: { id: pricelistId, action: 'deleted' }
      })
    }

  } catch (error) {
    console.error('Error deleting pricelist:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}