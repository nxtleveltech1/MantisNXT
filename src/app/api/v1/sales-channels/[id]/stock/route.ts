import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ChannelStockService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id') || undefined;
    const locationId = searchParams.get('location_id') || undefined;

    const allocations = await ChannelStockService.getStockAllocations(params.id, orgId, {
      product_id: productId,
      location_id: locationId === 'null' ? null : locationId,
    });

    return NextResponse.json({
      success: true,
      data: allocations,
      total: allocations.length,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales-channels/[id]/stock:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stock allocations',
      },
      { status: 500 }
    );
  }
}

