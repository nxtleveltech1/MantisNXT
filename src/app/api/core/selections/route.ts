/**
 * /api/core/selections - Inventory selection management
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';
import { InventorySelectionSchema } from '@/types/nxt-spp';
import { z } from 'zod';

/**
 * POST /api/core/selections - Create new inventory selection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = InventorySelectionSchema.parse(body);

    const selection = await inventorySelectionService.createSelection(validated);

    return NextResponse.json({
      success: true,
      selection
    });
  } catch (error) {
    console.error('Create selection error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create selection'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/core/selections - List inventory selections
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') as any || undefined,
      created_by: searchParams.get('created_by') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const result = await inventorySelectionService.listSelections(filters);

    return NextResponse.json({
      success: true,
      ...result,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit)
      }
    });
  } catch (error) {
    console.error('List selections error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list selections'
      },
      { status: 500 }
    );
  }
}
