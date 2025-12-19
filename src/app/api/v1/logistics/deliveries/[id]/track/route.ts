import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DeliveryTrackingService } from '@/lib/services/logistics/DeliveryTrackingService';
import { getOrgId } from '@/app/api/v1/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    // Get comprehensive tracking info (includes provider polling)
    const trackingInfo = await DeliveryTrackingService.getTrackingInfo(id, orgId);

    return NextResponse.json({
      success: true,
      data: trackingInfo,
    });
  } catch (error) {
    console.error('Error fetching tracking information:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tracking information',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually trigger status polling from provider
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    // Poll provider for latest status
    const result = await DeliveryTrackingService.pollProviderForStatus(id, orgId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error polling provider for status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to poll provider',
      },
      { status: 500 }
    );
  }
}

