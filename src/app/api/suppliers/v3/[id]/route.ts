/**
 * Individual Supplier Operations API v3
 * Handle single supplier CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/database'
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository'
import { SupplierService } from '@/lib/suppliers/services/SupplierService'
import type {
  UpdateSupplierData,
  APIResponse
} from '@/lib/suppliers/types/SupplierDomain'
import { CacheInvalidator } from '@/lib/cache/invalidation'

// Initialize services
const repository = new PostgreSQLSupplierRepository()
const supplierService = new SupplierService(repository)

// Validation Schema for updates
const UpdateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  tier: z.enum(['strategic', 'preferred', 'approved', 'conditional']).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),

  businessInfo: z.object({
    legalName: z.string().min(1).optional(),
    website: z.string().url().optional(),
    foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
    employeeCount: z.number().min(1).optional(),
    annualRevenue: z.number().min(0).optional(),
    currency: z.string().length(3).optional()
  }).optional(),

  contacts: z.array(z.object({
    type: z.enum(['primary', 'billing', 'technical', 'sales', 'support']),
    name: z.string().min(1),
    title: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
    mobile: z.string().optional(),
    department: z.string().optional(),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true)
  })).optional(),

  addresses: z.array(z.object({
    type: z.enum(['headquarters', 'billing', 'shipping', 'warehouse', 'manufacturing']),
    name: z.string().optional(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true)
  })).optional(),

  notes: z.string().optional()
})

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

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/suppliers/v3/[id] - Get supplier by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return createErrorResponse('Supplier ID is required')
    }

    const supplier = await supplierService.getSupplierById(id)

    if (!supplier) {
      return createErrorResponse('Supplier not found', 404)
    }

    return createSuccessResponse(supplier)
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return createErrorResponse(
      'Failed to fetch supplier',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

// PUT /api/suppliers/v3/[id] - Update supplier
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return createErrorResponse('Supplier ID is required')
    }

    const body = await request.json()

    const validationResult = UpdateSupplierSchema.safeParse(body)
    if (!validationResult.success) {
      return createErrorResponse(
        'Validation failed',
        400,
        validationResult.error.issues
      )
    }

    const updateData: UpdateSupplierData = validationResult.data

    // Check if supplier exists
    const existingSupplier = await supplierService.getSupplierById(id)
    if (!existingSupplier) {
      return createErrorResponse('Supplier not found', 404)
    }

    // Business logic validation
    const validation = await supplierService.validateSupplierUpdate(id, updateData)
    if (!validation.isValid) {
      return createErrorResponse(
        'Business validation failed',
        400,
        validation.errors
      )
    }

    const updatedSupplier = await supplierService.updateSupplier(id, updateData)

    // Invalidate cache after successful update
    CacheInvalidator.invalidateSupplier(id, updatedSupplier.name)

    return createSuccessResponse(updatedSupplier, 'Supplier updated successfully')
  } catch (error) {
    console.error('Error updating supplier:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse('Supplier not found', 404)
      }
      if (error.message.includes('validation')) {
        return createErrorResponse('Validation error', 400, { error: error.message })
      }
    }

    return createErrorResponse(
      'Failed to update supplier',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

// DELETE /api/suppliers/v3/[id] - Delete supplier
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return createErrorResponse('Supplier ID is required')
    }

    // Check if supplier exists
    const existingSupplier = await supplierService.getSupplierById(id)
    if (!existingSupplier) {
      return createErrorResponse('Supplier not found', 404)
    }

    // Check if supplier can be deleted (business rules)
    const canDelete = await supplierService.canDeleteSupplier(id)
    if (!canDelete.allowed) {
      return createErrorResponse(
        'Cannot delete supplier',
        409,
        { reason: canDelete.reason }
      )
    }

    // Get supplier name before deletion (for cache invalidation)
    const supplierName = existingSupplier.name

    await supplierService.deleteSupplier(id)

    // Invalidate cache after successful deletion
    CacheInvalidator.invalidateSupplier(id, supplierName)

    return createSuccessResponse(null, 'Supplier deleted successfully')
  } catch (error) {
    console.error('Error deleting supplier:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse('Supplier not found', 404)
      }
      if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        return createErrorResponse(
          'Cannot delete supplier - has associated records',
          409
        )
      }
    }

    return createErrorResponse(
      'Failed to delete supplier',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}
