import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ChannelService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

const createChannelSchema = z.object({
  channel_type: z.enum(['woocommerce', 'whatsapp', 'facebook', 'instagram', 'tiktok']),
  name: z.string().min(1).max(200),
  is_active: z.boolean().optional(),
  sync_method: z.enum(['webhook', 'polling', 'both']).optional(),
  sync_interval_minutes: z.number().int().positive().optional(),
  webhook_url: z.string().url().optional().nullable(),
  webhook_secret: z.string().optional().nullable(),
  api_config: z.record(z.unknown()),
  stock_allocation_type: z.enum(['reserved', 'virtual', 'both']).optional(),
  auto_sync_products: z.boolean().optional(),
  auto_sync_orders: z.boolean().optional(),
  created_by: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const channelType = searchParams.get('channel_type') || undefined;
    const isActive = searchParams.get('is_active');
    const isActiveBool = isActive ? isActive === 'true' : undefined;

    const channels = await ChannelService.getChannels(orgId, {
      channel_type: channelType,
      is_active: isActiveBool,
    });

    return NextResponse.json({
      success: true,
      data: channels,
      total: channels.length,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales-channels:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sales channels',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createChannelSchema.parse(body);

    const channel = await ChannelService.createChannel({
      ...validated,
      org_id: orgId,
    });

    return NextResponse.json(
      {
        success: true,
        data: channel,
      },
      { status: 201 }
    );
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

    console.error('Error in POST /api/v1/sales-channels:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create sales channel',
      },
      { status: 500 }
    );
  }
}

