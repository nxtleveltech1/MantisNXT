/**
 * GET /api/core/selections/active - Get current active inventory selection
 *
 * Returns the currently active inventory selection with enriched metadata.
 * Only ONE selection can have status='active' at a time.
 *
 * Response includes:
 * - Selection metadata
 * - Count of selected items
 * - Total inventory value (if available)
 *
 * **Business Rule**: This endpoint provides the single source of truth
 * for which selection is currently active across the system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';

export async function GET(request: NextRequest) {
  try {
    // Get active selection with enriched metadata
    const result = await inventorySelectionService.getActiveSelectionWithMetadata();

    if (!result.selection) {
      return NextResponse.json(
        {
          success: true,
          data: null,
          message: 'No active selection exists. Create and activate a selection to enable NXT SOH.'
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=30'
          }
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...result.selection,
          item_count: result.item_count,
          inventory_value: result.inventory_value
        }
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=60'
        }
      }
    );
  } catch (error) {
    console.error('[API] Get active selection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active selection'
      },
      { status: 500 }
    );
  }
}
