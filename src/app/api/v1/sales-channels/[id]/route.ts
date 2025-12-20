import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ChannelService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

const updateChannelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
  sync_method: z.enum(['webhook', 'polling', 'both']).optional(),
  sync_interval_minutes: z.number().int().positive().optional(),
  webhook_url: z.string().url().optional().nullable(),
  webhook_secret: z.string().optional().nullable(),
  api_config: z.record(z.unknown()).optional(),
  stock_allocation_type: z.enum(['reserved', 'virtual', 'both']).optional(),
  auto_sync_products: z.boolean().optional(),
  auto_sync_orders: z.boolean().optional(),
  updated_by: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const channel = await ChannelService.getChannelById(params.id, orgId);

    if (!channel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: channel,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales-channels/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sales channel',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = updateChannelSchema.parse(body);

    const channel = await ChannelService.updateChannel(params.id, orgId, validated);

    return NextResponse.json({
      success: true,
      data: channel,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error in PUT /api/v1/sales-channels/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sales channel',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    await ChannelService.deleteChannel(params.id, orgId);

    return NextResponse.json({
      success: true,
      message: 'Channel deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/v1/sales-channels/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete sales channel',
      },
      { status: 500 }
    );
  }
}

