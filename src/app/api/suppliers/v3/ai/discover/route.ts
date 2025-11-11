/**
 * AI Supplier Discovery API v3
 * Advanced AI integration for supplier discovery and data enrichment
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository'
import { AISupplierDiscoveryService } from '@/lib/suppliers/services/AISupplierDiscoveryService'
import type {
  AISupplierDiscovery,
  APIResponse
} from '@/lib/suppliers/types/SupplierDomain'

// Initialize services
const repository = new PostgreSQLSupplierRepository()
const aiService = new AISupplierDiscoveryService()

// Validation Schema
const DiscoveryRequestSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters'),
  industry: z.string().optional(),
  location: z.string().optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  certifications: z.array(z.string()).optional(),

  // Search preferences
  includeInternational: z.boolean().default(false),
  maxResults: z.number().min(1).max(50).default(10),
  minConfidence: z.number().min(0).max(1).default(0.7),

  // Data sources to use
  sources: z.array(z.enum(['web', 'duns', 'companies_house', 'sars', 'custom'])).default(['web'])
})

const EnrichmentRequestSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  fields: z.array(z.enum(['financial', 'risk', 'sustainability', 'market_position', 'competitors'])).optional()
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

function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(response)
}

// POST /api/suppliers/v3/ai/discover - Discover new suppliers using AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = DiscoveryRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return createErrorResponse(
        `Validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`
      )
    }

    const discoveryRequest: AISupplierDiscovery = validationResult.data

    // Check if we have existing suppliers matching the query first
    const existingSuppliers = await repository.search(discoveryRequest.query, {
      category: discoveryRequest.industry ? [discoveryRequest.industry] : undefined,
      limit: 5
    })

    // Use AI service to discover new suppliers
    const aiMatches = await aiService.discoverSuppliers(discoveryRequest)

    // Filter out matches that already exist in our database
    const newMatches = aiMatches.filter(match =>
      !existingSuppliers.suppliers.some(existing =>
        existing.name.toLowerCase() === match.supplier.name.toLowerCase() ||
        existing.businessInfo.taxId === match.supplier.businessInfo.taxId
      )
    )

    // Sort by confidence score
    const sortedMatches = newMatches.sort((a, b) => b.confidence - a.confidence)

    const result = {
      existingSuppliers: existingSuppliers.suppliers,
      newDiscoveries: sortedMatches.slice(0, discoveryRequest.maxResults),
      searchMetadata: {
        query: discoveryRequest.query,
        totalExisting: existingSuppliers.total,
        newFound: sortedMatches.length,
        sources: discoveryRequest.sources,
        timestamp: new Date().toISOString()
      }
    }

    return createSuccessResponse(result, `Found ${sortedMatches.length} new suppliers`)
  } catch (error) {
    console.error('Error in supplier discovery:', error)
    return createErrorResponse(
      `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}

// PUT /api/suppliers/v3/ai/discover - Enrich existing supplier data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = EnrichmentRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return createErrorResponse(
        `Validation failed: ${validationResult.error.issues.map(e => e.message).join(', ')}`
      )
    }

    const { supplierId, fields } = validationResult.data

    // Check if supplier exists
    const supplier = await repository.findById(supplierId)
    if (!supplier) {
      return createErrorResponse('Supplier not found', 404)
    }

    // Use AI service to enrich supplier data
    const enrichmentData = await aiService.enrichSupplierData(supplier, fields)

    // Store enrichment data
    // In a real implementation, you'd save this to a supplier_enrichment table
    const result = {
      supplierId,
      originalData: {
        name: supplier.name,
        category: supplier.category,
        tier: supplier.tier
      },
      enrichmentData,
      confidence: enrichmentData.confidence || 0.8,
      lastUpdated: new Date().toISOString()
    }

    return createSuccessResponse(result, 'Supplier data enriched successfully')
  } catch (error) {
    console.error('Error in supplier enrichment:', error)
    return createErrorResponse(
      `Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}

// GET /api/suppliers/v3/ai/discover - Get discovery suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const location = searchParams.get('location')

    // Get category-based suggestions
    const suggestions = await aiService.getDiscoverySuggestions({
      category,
      location
    })

    const result = {
      suggestions,
      popularCategories: [
        'Audio Equipment',
        'Musical Instruments',
        'Electronics',
        'Manufacturing',
        'Technology Services'
      ],
      popularLocations: [
        'South Africa',
        'Germany',
        'United States',
        'China',
        'United Kingdom'
      ],
      searchTips: [
        'Use specific product names for better results',
        'Include location for regional suppliers',
        'Specify certifications for compliance requirements',
        'Use industry terms for accurate categorization'
      ]
    }

    return createSuccessResponse(result)
  } catch (error) {
    console.error('Error getting discovery suggestions:', error)
    return createErrorResponse(
      `Failed to get suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
