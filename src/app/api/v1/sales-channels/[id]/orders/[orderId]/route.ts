import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ChannelOrderService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const order = await ChannelOrderService.getChannelOrderById(
      params.orderId,
      params.id,
      orgId
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel order not found',
        },
        { status: 404 }
      );
    }

    const items = await ChannelOrderService.getChannelOrderItems(params.orderId);

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items,
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales-channels/[id]/orders/[orderId]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch channel order',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();
    const customerId = body.customer_id as string | undefined;

    const result = await ChannelOrderService.processChannelOrder(
      params.orderId,
      params.id,
      orgId,
      customerId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/sales-channels/[id]/orders/[orderId]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process channel order',
      },
      { status: 500 }
    );
  }
}

