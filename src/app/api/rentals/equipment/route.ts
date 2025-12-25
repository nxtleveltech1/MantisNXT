// UPDATE: [2025-01-27] Fixed equipment API to default to active equipment for proper listing
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as equipmentService from '@/services/rentals/equipmentService';
import { z } from 'zod';

const createEquipmentSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(500),
  equipment_type: z.string().min(1).max(50),
  category_id: z.string().uuid().optional(),
  brand: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  serial_number: z.string().max(200).optional(),
  barcode: z.string().max(100).optional(),
  rental_rate_daily: z.number().nonnegative().optional(),
  rental_rate_weekly: z.number().nonnegative().optional(),
  rental_rate_monthly: z.number().nonnegative().optional(),
  security_deposit: z.number().nonnegative().optional(),
  technical_specs: z.record(z.unknown()).optional(),
  compatibility_info: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const equipment_type = searchParams.get('equipment_type') || undefined;
    const availability_status = searchParams.get('availability_status') as
      | 'available'
      | 'rented'
      | 'maintenance'
      | 'retired'
      | undefined;
    
    // Validate category_id is a valid UUID if provided
    let category_id: string | undefined = undefined;
    const categoryIdParam = searchParams.get('category_id');
    if (categoryIdParam) {
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(categoryIdParam)) {
        category_id = categoryIdParam;
      }
      // If invalid UUID, just ignore it rather than erroring
    }
    
    const is_active = searchParams.get('is_active') === 'true' ? true : undefined;
    
    // Validate limit and offset are valid numbers
    let limit: number | undefined = undefined;
    const limitParam = searchParams.get('limit');
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
      }
    }
    
    let offset: number | undefined = undefined;
    const offsetParam = searchParams.get('offset');
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      }
    }

    // Don't filter by is_active by default - show all equipment unless explicitly filtered
    const equipment = await equipmentService.listEquipment({
      equipment_type,
      availability_status,
      category_id,
      is_active: is_active !== undefined ? is_active : undefined, // Show all unless specified
      limit: limit || 1000, // Default to 1000 if not specified
      offset,
    });

    return NextResponse.json({ success: true, data: equipment });
  } catch (error) {
    console.error('Error in GET /api/rentals/equipment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch equipment',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      console.warn('[POST /api/rentals/equipment] Authentication failed - no user returned from verifyAuth');
      return NextResponse.json(
        { 
          success: false, 
          error: 'UNAUTHORIZED', 
          message: 'Authentication required. Please ensure you are logged in.' 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createEquipmentSchema.parse(body);

    const equipment = await equipmentService.createEquipment(validated, user.id);

    return NextResponse.json({ success: true, data: equipment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('[POST /api/rentals/equipment] Validation error:', error.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('[POST /api/rentals/equipment] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create equipment',
      },
      { status: 500 }
    );
  }
}

