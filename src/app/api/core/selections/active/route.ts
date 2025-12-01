import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';

/**
 * GET /api/core/selections/active
 * Get the currently active inventory selection
 */
export async function GET(request: NextRequest) {
  try {
    const activeSelection = await inventorySelectionService.getActiveSelection();

    if (activeSelection) {
      return NextResponse.json({
        success: true,
        data: activeSelection,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No active selection found',
      });
    }
  } catch (error) {
    console.error('Error fetching active selection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch active selection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
