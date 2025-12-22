import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as partsService from '@/services/repairs/partsService';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const location_id = searchParams.get('location_id') || undefined;
    const low_stock_only = searchParams.get('low_stock_only') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const parts = await partsService.listParts({
      location_id,
      low_stock_only,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: parts });
  } catch (error) {
    console.error('Error in GET /api/repairs/parts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch parts',
      },
      { status: 500 }
    );
  }
}

