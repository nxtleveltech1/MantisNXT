/**
 * Unified Supplier API v3 - Production-Ready Implementation
 * Replaces all conflicting supplier endpoints with single, robust API
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/database'
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository'
import { SupplierService } from '@/lib/suppliers/services/SupplierService'
import type {
  CreateSupplierData,
  UpdateSupplierData,
  SupplierFilters,
  APIResponse,
  PaginatedAPIResponse
} from '@/lib/suppliers/types/SupplierDomain'

// Initialize services
const repository = new PostgreSQLSupplierRepository()
const supplierService = new SupplierService(repository)

// Validation Schemas
const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  code: z.string().min(3, 'Supplier code must be at least 3 characters'),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),
  tier: z.enum(['strategic', 'preferred', 'approved', 'conditional']),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),

  businessInfo: z.object({
    legalName: z.string().min(1, 'Legal name is required'),
    taxId: z.string().min(1, 'Tax ID is required'),
    registrationNumber: z.string().min(1, 'Registration number is required'),
    website: z.string().url().optional(),
    foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
    employeeCount: z.number().min(1).optional(),
    annualRevenue: z.number().min(0).optional(),
    currency: z.string().length(3, 'Currency must be 3 characters').default('ZAR')
  }),

  contacts: z.array(z.object({
    type: z.enum(['primary', 'billing', 'technical', 'sales', 'support']),
    name: z.string().min(1, 'Contact name is required'),
    title: z.string().min(1, 'Contact title is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    mobile: z.string().optional(),
    department: z.string().optional(),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true)
  })).min(1, 'At least one contact is required'),

  addresses: z.array(z.object({
    type: z.enum(['headquarters', 'billing', 'shipping', 'warehouse', 'manufacturing']),
    name: z.string().optional(),
    addressLine1: z.string().min(1, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true)
  })).min(1, 'At least one address is required'),

  notes: z.string().optional()
})

const UpdateSupplierSchema = CreateSupplierSchema.partial()

const SupplierFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(['active', 'inactive', 'pending', 'suspended'])).optional(),
  tier: z.array(z.enum(['strategic', 'preferred', 'approved', 'conditional'])).optional(),
  category: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  country: z.array(z.string()).optional(),
  state: z.array(z.string()).optional(),
  city: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxRating: z.number().min(0).max(5).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(50),
  sortBy: z.enum(['name', 'code', 'status', 'tier', 'rating', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Error handling utility
function createErrorResponse(message: string, status: number = 400, details?: any): NextResponse {
  const response: APIResponse<null> = {
    success: false,
    data: null,
    error: message,
    timestamp: new Date().toISOString()
  }

  if (details) {
    response.details = details
  }

  return NextResponse.json(response, { status })
}

function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(response)
}

function createPaginatedResponse<T>(data: T, pagination: any, message?: string): NextResponse {
  const response: PaginatedAPIResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination
  }

  return NextResponse.json(response)
}

// GET /api/suppliers/v3 - List suppliers with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const rawFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status')?.split(',') || undefined,
      tier: searchParams.get('tier')?.split(',') || undefined,
      category: searchParams.get('category')?.split(',') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      country: searchParams.get('country')?.split(',') || undefined,
      state: searchParams.get('state')?.split(',') || undefined,
      city: searchParams.get('city')?.split(',') || undefined,
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
      maxRating: searchParams.get('maxRating') ? parseFloat(searchParams.get('maxRating')!) : undefined,
      createdAfter: searchParams.get('createdAfter') || undefined,
      createdBefore: searchParams.get('createdBefore') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      sortBy: searchParams.get('sortBy') || 'name',
      sortOrder: searchParams.get('sortOrder') || 'asc'
    }

    const validationResult = SupplierFiltersSchema.safeParse(rawFilters)
    if (!validationResult.success) {
      return createErrorResponse(
        'Invalid query parameters',
        400,
        validationResult.error.issues
      )
    }

    const filters: SupplierFilters = validationResult.data

    // Convert date strings to Date objects
    if (filters.createdAfter) {
      filters.createdAfter = new Date(filters.createdAfter)
    }
    if (filters.createdBefore) {
      filters.createdBefore = new Date(filters.createdBefore)
    }

    const result = await supplierService.getSuppliers(filters)

    return createPaginatedResponse(
      result.suppliers,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1
      },
      `Retrieved ${result.suppliers.length} suppliers`
    )
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return createErrorResponse(
      'Failed to fetch suppliers',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

// POST /api/suppliers/v3 - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = CreateSupplierSchema.safeParse(body)
    if (!validationResult.success) {
      return createErrorResponse(
        'Validation failed',
        400,
        validationResult.error.issues
      )
    }

    const supplierData: CreateSupplierData = validationResult.data

    // Business logic validation
    const validation = await supplierService.validateSupplierData(supplierData)
    if (!validation.isValid) {
      return createErrorResponse(
        'Business validation failed',
        400,
        validation.errors
      )
    }

    const supplier = await supplierService.createSupplier(supplierData)

    return createSuccessResponse(supplier, 'Supplier created successfully')
  } catch (error) {
    console.error('Error creating supplier:', error)

    // Handle specific business errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return createErrorResponse('Supplier code already exists', 409)
      }
      if (error.message.includes('validation')) {
        return createErrorResponse('Validation error', 400, { error: error.message })
      }
    }

    return createErrorResponse(
      'Failed to create supplier',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

// PUT /api/suppliers/v3 - Batch operations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle different batch operation types
    if (body.operation === 'bulk_update') {
      const { updates } = body

      if (!Array.isArray(updates)) {
        return createErrorResponse('Updates must be an array')
      }

      const results = await supplierService.updateManySuppliers(updates)
      return createSuccessResponse(results, `Updated ${results.length} suppliers`)
    }

    if (body.operation === 'bulk_delete') {
      const { ids } = body

      if (!Array.isArray(ids)) {
        return createErrorResponse('IDs must be an array')
      }

      await supplierService.deleteManySuppliers(ids)
      return createSuccessResponse(null, `Deleted ${ids.length} suppliers`)
    }

    return createErrorResponse('Unknown batch operation')
  } catch (error) {
    console.error('Error in batch operation:', error)
    return createErrorResponse(
      'Batch operation failed',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

// DELETE /api/suppliers/v3 - Batch delete (alternative to PUT)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return createErrorResponse('Must provide array of supplier IDs to delete')
    }

    await supplierService.deleteManySuppliers(ids)
    return createSuccessResponse(null, `Deleted ${ids.length} suppliers`)
  } catch (error) {
    console.error('Error deleting suppliers:', error)
    return createErrorResponse(
      'Failed to delete suppliers',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}
