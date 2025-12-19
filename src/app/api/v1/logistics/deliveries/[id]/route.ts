import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DeliveryService } from '@/lib/services/logistics';
import { getOrgId } from '../../../sales/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    const delivery = await DeliveryService.getDeliveryById(id, orgId);

    if (!delivery) {
      return NextResponse.json(
        {
          success: false,
          error: 'Delivery not found',
        },
        { status: 404 }
      );
    }

    // Get delivery items
    const items = await DeliveryService.getDeliveryItems(id);

    return NextResponse.json({
      success: true,
      data: {
        ...delivery,
        items,
      },
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delivery',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    await DeliveryService.deleteDelivery(id, orgId);

    return NextResponse.json({
      success: true,
      message: 'Delivery deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete delivery',
      },
      { status: 500 }
    );
  }
}

