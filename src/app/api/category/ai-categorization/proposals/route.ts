export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { listProposedCategories } from '@/lib/cmm/proposed-categories';

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get('status');
    const status =
      statusParam === 'approved' || statusParam === 'rejected' ? statusParam : 'pending';

    const proposals = await listProposedCategories(status);

    return NextResponse.json({
      success: true,
      status,
      proposals,
    });
  } catch (error) {
    console.error('[API] Error listing proposed categories:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch proposed categories',
      },
      { status: 500 }
    );
  }
}

