export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rejectProposedTag } from '@/lib/cmm/proposed-tags';

interface RejectBody {
  tag_proposal_id: string;
  reason?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: RejectBody = await request.json();
    if (!body.tag_proposal_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'tag_proposal_id is required',
        },
        { status: 400 }
      );
    }

    const result = await rejectProposedTag({
      tagProposalId: body.tag_proposal_id,
      reason: body.reason ?? null,
      rejectedBy: 'api_user',
    });

    return NextResponse.json({
      success: true,
      affected_products: result.affected_products,
    });
  } catch (error) {
    console.error('[API] Error rejecting proposed tag:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject proposed tag',
      },
      { status: 500 }
    );
  }
}
