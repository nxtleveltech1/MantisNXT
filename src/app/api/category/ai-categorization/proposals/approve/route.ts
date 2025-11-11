export const runtime = 'nodejs';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { approveProposedCategory } from '@/lib/cmm/proposed-categories';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposed_category_id, parent_category_id } = body || {};

    if (!proposed_category_id || typeof proposed_category_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'proposed_category_id is required',
        },
        { status: 400 }
      );
    }

    const result = await approveProposedCategory({
      proposedCategoryId: proposed_category_id,
      parentCategoryId:
        typeof parent_category_id === 'string' && parent_category_id.length > 0
          ? parent_category_id
          : null,
    });

    return NextResponse.json({
      success: true,
      category_id: result.category_id,
      affected_products: result.affected_products,
    });
  } catch (error) {
    console.error('[API] Error approving proposed category:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve proposed category',
      },
      { status: 500 }
    );
  }
}


