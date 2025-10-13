/**
 * Supplier Export API v3 - Production-Ready Export System
 * Replaces broken export functionality with working backend implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/database'
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository'
import { SupplierExportService } from '@/lib/suppliers/services/SupplierExportService'
import type {
  SupplierFilters,
  ExportRequest,
  APIResponse
} from '@/lib/suppliers/types/SupplierDomain'

// Initialize services
  const repository = new PostgreSQLSupplierRepository()
const exportService = new SupplierExportService(repository)

// Validation Schema
const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf', 'json']),
  template: z.enum(['basic', 'detailed', 'performance', 'compliance']).default('basic'),

  // Filter options
  filters: z.object({
    search: z.string().optional(),
    status: z.array(z.enum(['active', 'inactive', 'pending', 'suspended'])).optional(),
    tier: z.array(z.enum(['strategic', 'preferred', 'approved', 'conditional'])).optional(),
    category: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    country: z.array(z.string()).optional(),
    minRating: z.number().min(0).max(5).optional(),
    maxRating: z.number().min(0).max(5).optional(),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional()
  }).default({}),

  // Include options
  includePerformance: z.boolean().default(false),
  includeContacts: z.boolean().default(false),
  includeAddresses: z.boolean().default(false),

  // Metadata
  title: z.string().optional(),
  description: z.string().optional()
})

function createErrorResponse(message: string, status: number = 400): NextResponse {
  const response: APIResponse<null> = {
    success: false,
    data: null,
    error: message,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(response, { status })
}

// POST /api/suppliers/v3/export - Export suppliers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = ExportRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return createErrorResponse(
        `Validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`
      )
    }

    const exportRequest: ExportRequest = validationResult.data

    // Convert date strings to Date objects if present
    if (exportRequest.filters.createdAfter) {
      exportRequest.filters.createdAfter = new Date(exportRequest.filters.createdAfter)
    }
    if (exportRequest.filters.createdBefore) {
      exportRequest.filters.createdBefore = new Date(exportRequest.filters.createdBefore)
    }

    const exportResult = await exportService.exportSuppliers(exportRequest)

    // Return file as download
    return new NextResponse(exportResult.data, {
      status: 200,
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.size.toString(),
        'X-Export-Record-Count': exportResult.recordCount.toString(),
        'X-Export-Timestamp': new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error exporting suppliers:', error)
    return createErrorResponse(
      `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}

// GET /api/suppliers/v3/export - Quick export with query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const format = searchParams.get('format') as 'csv' | 'excel' | 'pdf' | 'json' || 'csv'
    const template = searchParams.get('template') as 'basic' | 'detailed' | 'performance' | 'compliance' || 'basic'

    // Build filters from query params
    const filters: SupplierFilters = {}

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',') as any
    }
    if (searchParams.get('tier')) {
      filters.tier = searchParams.get('tier')!.split(',') as any
    }
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')!.split(',')
    }

    const exportRequest: ExportRequest = {
      format,
      template,
      filters,
      includePerformance: searchParams.get('includePerformance') === 'true',
      includeContacts: searchParams.get('includeContacts') === 'true',
      includeAddresses: searchParams.get('includeAddresses') === 'true'
    }

    const exportResult = await exportService.exportSuppliers(exportRequest)

    return new NextResponse(exportResult.data, {
      status: 200,
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.size.toString(),
        'X-Export-Record-Count': exportResult.recordCount.toString()
      }
    })
  } catch (error) {
    console.error('Error in quick export:', error)
    return createErrorResponse(
      `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
