export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { listProposedTags } from '@/lib/cmm/proposed-tags';

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get('status');
    const status =
      statusParam === 'approved' || statusParam === 'rejected' ? statusParam : 'pending';

    const proposals = await listProposedTags(status);

    return NextResponse.json({
      success: true,
      status,
      proposals,
    });
  } catch (error) {
    console.error('[API] Error listing proposed tags:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch proposed tags',
      },
      { status: 500 }
    );
  }
}







