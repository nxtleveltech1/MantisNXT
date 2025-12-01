export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { approveAllProposedTags } from '@/lib/cmm/proposed-tags';

export async function POST(request: NextRequest) {
  try {
    const result = await approveAllProposedTags({
      approvedBy: 'api_user',
    });

    return NextResponse.json({
      success: true,
      approved_count: result.approved_count,
      total_affected_products: result.total_affected_products,
    });
  } catch (error) {
    console.error('[API] Error approving all proposed tags:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve all proposed tags',
      },
      { status: 500 }
    );
  }
}





