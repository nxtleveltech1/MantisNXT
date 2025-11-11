/**
 * POST /api/core/selections/workflow - Execute selection workflow (select/deselect/approve)
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';
import { SelectionWorkflowRequestSchema } from '@/types/nxt-spp';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SelectionWorkflowRequestSchema.parse(body);

    const result = await inventorySelectionService.executeWorkflow(validated);

    return NextResponse.json({
      ...result
    }, {
      status: result.success ? 200 : 500
    });
  } catch (error) {
    console.error('Selection workflow error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Workflow execution failed'
      },
      { status: 500 }
    );
  }
}
