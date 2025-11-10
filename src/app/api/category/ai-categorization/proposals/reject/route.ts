export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { rejectProposedCategory } from '@/lib/cmm/proposed-categories';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposed_category_id, reason } = body || {};

    if (!proposed_category_id || typeof proposed_category_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'proposed_category_id is required',
        },
        { status: 400 }
      );
    }

    const result = await rejectProposedCategory({
      proposedCategoryId: proposed_category_id,
      reason: typeof reason === 'string' ? reason : null,
    });

    return NextResponse.json({
      success: true,
      affected_products: result.affected_products,
    });
  } catch (error) {
    console.error('[API] Error rejecting proposed category:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject proposed category',
      },
      { status: 500 }
    );
  }
}

