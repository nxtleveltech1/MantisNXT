import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ChannelOrderService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const orderStatus = searchParams.get('order_status') || undefined;
    const internalStatus = searchParams.get('internal_status') || undefined;
    const processed = searchParams.get('processed');
    const processedBool = processed ? processed === 'true' : undefined;

    const orders = await ChannelOrderService.getChannelOrders(params.id, orgId, {
      order_status: orderStatus,
      internal_status: internalStatus,
      processed: processedBool,
    });

    return NextResponse.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales-channels/[id]/orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch channel orders',
      },
      { status: 500 }
    );
  }
}

