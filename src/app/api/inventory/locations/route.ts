/**
 * GET/POST /api/inventory/locations
 *
 * List and create inventory locations
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { locationService } from '@/lib/services/LocationService';
import type { LocationSearchParams } from '@/lib/services/LocationService';

/**
 * GET /api/inventory/locations
 * List locations with optional filtering, pagination, and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const params: LocationSearchParams = {
      org_id: searchParams.get('org_id') || undefined,
      type: (searchParams.get('type') as 'internal' | 'supplier' | 'consignment') || undefined,
      is_active:
        searchParams.get('is_active') !== null
          ? searchParams.get('is_active') === 'true'
          : undefined,
      search: searchParams.get('search') || undefined,
      supplier_id: searchParams.get('supplier_id') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy:
        (searchParams.get('sortBy') as 'name' | 'type' | 'created_at' | 'updated_at') || 'name',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    };

    const result = await locationService.searchLocations(params);

    return NextResponse.json({
      success: true,
      data: result.locations,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[GET /api/inventory/locations] Error fetching locations:', {
      error: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
    });

    // Ensure we always return a valid JSON response
    try {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch locations',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    } catch (jsonError) {
      // Fallback if JSON serialization fails
      console.error(
        '[GET /api/inventory/locations] Failed to serialize error response:',
        jsonError
      );
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch locations',
          details: 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}

/**
 * POST /api/inventory/locations
 * Create a new location
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      );
    }

    if (!body.type || !['internal', 'supplier', 'consignment'].includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid location type is required (internal, supplier, or consignment)',
        },
        { status: 400 }
      );
    }

    // Business rule: supplier_id required for type='supplier'
    if (body.type === 'supplier' && !body.supplier_id) {
      return NextResponse.json(
        { success: false, error: 'supplier_id is required for location type "supplier"' },
        { status: 400 }
      );
    }

    // Check if name is unique
    const isUnique = await locationService.isLocationNameUnique(body.name, body.org_id);
    if (!isUnique) {
      return NextResponse.json(
        { success: false, error: 'Location name already exists' },
        { status: 409 }
      );
    }

    // Create location
    const location = await locationService.createLocation({
      org_id: body.org_id,
      name: body.name,
      type: body.type,
      supplier_id: body.supplier_id || null,
      address: body.address || null,
      metadata: body.metadata || {},
      is_active: body.is_active ?? true,
    });

    return NextResponse.json(
      {
        success: true,
        data: location,
        message: 'Location created successfully',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating location:', error);

    // Handle validation errors
    if (errorMessage.includes('required') || errorMessage.includes('invalid')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create location',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
