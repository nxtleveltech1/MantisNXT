/**
 * Unified Supplier API v3 - Production-Ready Implementation
 * Replaces all conflicting supplier endpoints with single, robust API
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  APIResponse,
  PaginatedAPIResponse
} from '@/lib/suppliers/types/SupplierDomain'
import { listSuppliers, upsertSupplier, deactivateSupplier } from '@/services/ssot/supplierService'

// SSOT services used directly

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

const STATUS_VALUES = ['active', 'inactive', 'pending', 'suspended'] as const
const TIER_VALUES = ['strategic', 'preferred', 'approved', 'conditional'] as const

const SupplierFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(STATUS_VALUES)).optional(),
  tier: z.array(z.enum(TIER_VALUES)).optional(),
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

    // Parse and normalize query parameters (tolerate tier values in status)
    const rawStatus = (searchParams.get('status')?.split(',') || []).filter(Boolean)
    const rawTier = (searchParams.get('tier')?.split(',') || []).filter(Boolean)
    const statusOnly = rawStatus.filter((v) => (STATUS_VALUES as readonly string[]).includes(v)) as typeof STATUS_VALUES[number][]
    const tierFromStatus = rawStatus.filter((v) => (TIER_VALUES as readonly string[]).includes(v)) as typeof TIER_VALUES[number][]
    const tierOnly = rawTier.filter((v) => (TIER_VALUES as readonly string[]).includes(v)) as typeof TIER_VALUES[number][]
    const tierNormalized = Array.from(new Set([...tierOnly, ...tierFromStatus])) as typeof TIER_VALUES[number][]

    const rawFilters = {
      search: searchParams.get('search') || undefined,
      status: statusOnly.length ? statusOnly : undefined,
      tier: tierNormalized.length ? tierNormalized : undefined,
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

    const page = validationResult.data.page
    const limit = validationResult.data.limit
    const result = await listSuppliers({
      search: validationResult.data.search,
      status: validationResult.data.status as any,
      page,
      limit,
      sortBy: validationResult.data.sortBy as any,
      sortOrder: validationResult.data.sortOrder,
    })

    return createPaginatedResponse(
      result.data,
      {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page * limit < result.total,
        hasPrev: page > 1
      },
      `Retrieved ${result.data.length} suppliers`
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

    const created = await upsertSupplier({
      name: validationResult.data.name,
      code: validationResult.data.code,
      status: validationResult.data.status,
      currency: validationResult.data.businessInfo?.currency,
      contact: validationResult.data.contacts?.[0]
        ? {
            email: validationResult.data.contacts[0].email,
            phone: validationResult.data.contacts[0].phone,
            website: validationResult.data.businessInfo?.website,
          }
        : undefined,
    })

    return createSuccessResponse(created, 'Supplier created in canonical layer')
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

      const updated: any[] = []
      for (const u of updates) {
        const res = await upsertSupplier({ id: u.id, name: u.data?.name, status: u.data?.status })
        updated.push(res)
      }
      return createSuccessResponse(updated, `Updated ${updated.length} suppliers`)
    }

    if (body.operation === 'bulk_delete') {
      const { ids } = body

      if (!Array.isArray(ids)) {
        return createErrorResponse('IDs must be an array')
      }

      for (const id of ids) {
        await deactivateSupplier(id)
      }
      return createSuccessResponse(null, `Deactivated ${ids.length} suppliers`)
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

    for (const id of ids) {
      await deactivateSupplier(id)
    }
    return createSuccessResponse(null, `Deactivated ${ids.length} suppliers`)
  } catch (error) {
    console.error('Error deleting suppliers:', error)
    return createErrorResponse(
      'Failed to delete suppliers',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}
