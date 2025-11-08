/**
 * AI Supplier Discovery API
 * Natural language powered supplier search and matching
 */

import { NextRequest, NextResponse } from 'next/server';
import { SupplierIntelligenceService } from '@/services/ai/SupplierIntelligenceService';
import { authenticateRequest } from '@/lib/ai/api-utils';
import { getSupplierDiscoveryConfig } from '@/lib/ai/supplier-discovery-config';

export async function POST(request: NextRequest) {
  try {
    // Authenticate and get organization ID
    const user = await authenticateRequest(request);
    const orgId = user.org_id;

    // Load configuration from database
    const config = await getSupplierDiscoveryConfig(orgId);

    // Initialize the AI service with config
    const supplierIntelligence = new SupplierIntelligenceService(config);

    const body = await request.json();

    // Validate request
    const validationError = validateDiscoveryRequest(body);
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validationError
      }, { status: 400 });
    }

    console.log('🤖 AI Supplier Discovery initiated:', body.query);

    // Execute AI-powered supplier discovery
    const result = await supplierIntelligence.discoverSuppliers({
      query: body.query,
      category: body.requirements?.category,
      location: body.requirements?.location,
      certifications: body.requirements?.certifications,
      capacity: body.requirements?.capacity,
      priceRange: body.requirements?.priceRange
    });

    // Apply filters if provided
    let filteredSuppliers = result.suppliers || [];

    if (body.filters?.existingSuppliers === false) {
      // Filter out existing suppliers (placeholder logic)
      filteredSuppliers = filteredSuppliers.filter((s: { id: string }) => !s.id.startsWith('existing_'));
    }

    if (body.filters?.verified) {
      filteredSuppliers = filteredSuppliers.filter((s: { riskScore: number }) => s.riskScore < 0.5);
    }

    if (body.filters?.riskLevel) {
      const riskThresholds: Record<string, number> = {
        'low': 0.3,
        'medium': 0.6,
        'high': 1.0
      };
      const maxRisk = riskThresholds[body.filters.riskLevel as string];
      filteredSuppliers = filteredSuppliers.filter((s: { riskScore: number }) => s.riskScore <= maxRisk);
    }

    console.log(`✅ Found ${filteredSuppliers.length} matching suppliers`);

    return NextResponse.json({
      success: true,
      data: {
        suppliers: filteredSuppliers,
        searchMetadata: {
          queryProcessed: body.query,
          totalResults: filteredSuppliers.length,
          searchTime: result.metadata?.processingTime || 0,
          confidence: result.metadata?.searchConfidence || result.metadata?.confidence || 0
        },
        filters: body.filters || {},
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ AI Supplier Discovery failed:', error);

    return NextResponse.json({
      success: false,
      error: 'AI supplier discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'AI_DISCOVERY_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({
        success: false,
        error: 'Supplier ID is required'
      }, { status: 400 });
    }

    console.log('🔍 Finding similar suppliers for:', supplierId);

    // Find similar suppliers
    const similarSuppliers = await supplierIntelligence.findSimilarSuppliers(supplierId);

    return NextResponse.json({
      success: true,
      data: {
        supplierId,
        similarSuppliers,
        count: similarSuppliers.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Similar supplier search failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to find similar suppliers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Validation function
function validateDiscoveryRequest(body: any): string | null {
  if (!body.query || typeof body.query !== 'string') {
    return 'Query is required and must be a string';
  }

  if (body.query.length < 3) {
    return 'Query must be at least 3 characters long';
  }

  if (body.query.length > 500) {
    return 'Query must be less than 500 characters';
  }

  if (!body.requirements || typeof body.requirements !== 'object') {
    return 'Requirements object is required';
  }

  if (!body.requirements.category || !Array.isArray(body.requirements.category)) {
    return 'At least one category is required';
  }

  if (body.requirements.category.length === 0) {
    return 'At least one category must be specified';
  }

  // Validate capacity range if provided
  if (body.requirements.capacity) {
    const { min, max } = body.requirements.capacity;
    if (typeof min !== 'number' || typeof max !== 'number' || min < 0 || max < min) {
      return 'Invalid capacity range';
    }
  }

  // Validate price range if provided
  if (body.requirements.priceRange) {
    const { min, max } = body.requirements.priceRange;
    if (typeof min !== 'number' || typeof max !== 'number' || min < 0 || max < min) {
      return 'Invalid price range';
    }
  }

  return null;
}