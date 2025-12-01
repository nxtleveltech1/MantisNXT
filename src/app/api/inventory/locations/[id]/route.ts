/**
 * GET/PUT/DELETE /api/inventory/locations/[id]
 *
 * Individual location operations
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { locationService } from '@/lib/services/LocationService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/inventory/locations/[id]
 * Get a single location by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const location = await locationService.getLocationById(id);

    if (!location) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: location,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching location:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch location',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/locations/[id]
 * Update a location
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if location exists
    const existing = await locationService.getLocationById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    // Validate type change
    if (body.type && !['internal', 'supplier', 'consignment'].includes(body.type)) {
      return NextResponse.json({ success: false, error: 'Invalid location type' }, { status: 400 });
    }

    // Business rule: supplier_id required for type='supplier'
    const finalType = body.type || existing.type;
    const finalSupplierId =
      body.supplier_id !== undefined ? body.supplier_id : existing.supplier_id;
    if (finalType === 'supplier' && !finalSupplierId) {
      return NextResponse.json(
        { success: false, error: 'supplier_id is required for location type "supplier"' },
        { status: 400 }
      );
    }

    // Check name uniqueness if name is being changed
    if (body.name && body.name !== existing.name) {
      const isUnique = await locationService.isLocationNameUnique(body.name, existing.org_id, id);
      if (!isUnique) {
        return NextResponse.json(
          { success: false, error: 'Location name already exists' },
          { status: 409 }
        );
      }
    }

    // Update location
    const location = await locationService.updateLocation(id, {
      name: body.name,
      type: body.type,
      supplier_id: body.supplier_id,
      address: body.address,
      metadata: body.metadata,
      is_active: body.is_active,
    });

    return NextResponse.json({
      success: true,
      data: location,
      message: 'Location updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating location:', error);

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

    // Handle not found errors
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location not found',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update location',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/locations/[id]
 * Delete a location (soft delete by default)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Check if location exists
    const existing = await locationService.getLocationById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    // Get hard_delete flag from query params
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard_delete') === 'true';

    // Delete location
    await locationService.deleteLocation(id, hardDelete);

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Location permanently deleted' : 'Location deactivated',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting location:', error);

    // Handle constraint errors
    if (errorMessage.includes('stock records exist') || errorMessage.includes('Cannot delete')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete location',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    // Handle not found errors
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location not found',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete location',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
