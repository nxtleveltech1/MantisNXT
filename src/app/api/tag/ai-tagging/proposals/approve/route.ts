export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { approveProposedTag } from '@/lib/cmm/proposed-tags';

interface ApproveBody {
  tag_proposal_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApproveBody = await request.json();
    if (!body.tag_proposal_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'tag_proposal_id is required',
        },
        { status: 400 }
      );
    }

    const result = await approveProposedTag({
      tagProposalId: body.tag_proposal_id,
      approvedBy: 'api_user',
    });

    return NextResponse.json({
      success: true,
      tag_id: result.tag_id,
      affected_products: result.affected_products,
    });
  } catch (error) {
    console.error('[API] Error approving proposed tag:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve proposed tag',
      },
      { status: 500 }
    );
  }
}





