/**
 * POST /api/core/selections/[id]/activate - Activate an inventory selection
 *
 * Activates the specified selection with proper business rule enforcement.
 *
 * **Business Rules**:
 * 1. Only ONE selection can have status='active' at a time
 * 2. Selection must have at least one selected item
 * 3. Selection must exist and not already be active
 *
 * Request Body:
 * - deactivate_others: boolean (optional, default: false)
 *   - If true, automatically archives other active selections
 *   - If false, returns error if another selection is active
 *
 * **Side Effects**:
 * - Archives other active selections (if deactivate_others=true)
 * - Invalidates caches for:
 *   - /api/core/selections/active
 *   - /api/serve/nxt-soh
 *   - /api/spp/dashboard/metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';
import { z } from 'zod';

const RequestBodySchema = z.object({
  deactivate_others: z.boolean().default(false)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Parse params
    const { id: selectionId } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid selection ID format'
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { deactivate_others } = RequestBodySchema.parse(body);

    // Activate selection
    const activatedSelection = await inventorySelectionService.activateSelection(
      selectionId,
      deactivate_others
    );

    // Get enriched metadata for response
    const metadata = await inventorySelectionService.getActiveSelectionWithMetadata();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...activatedSelection,
          item_count: metadata.item_count,
          inventory_value: metadata.inventory_value
        },
        message: 'Selection activated successfully. All stock queries now reflect this selection.'
      },
      {
        // Invalidate caches
        headers: {
          'Cache-Control': 'no-store',
          'X-Cache-Tags': 'selections,nxt-soh,dashboard-metrics'
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('[API] Activate selection error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle business rule violations
    const errorMessage = error instanceof Error ? error.message : 'Failed to activate selection';

    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes('Cannot activate selection: another selection')) {
      statusCode = 409; // Conflict
    } else if (errorMessage.includes('not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('Cannot activate empty selection')) {
      statusCode = 400; // Bad Request
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}
