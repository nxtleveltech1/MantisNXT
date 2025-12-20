import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ChannelService } from '@/lib/services/sales-channels';
import {
  WooCommerceAdapter,
  WhatsAppAdapter,
  FacebookAdapter,
  InstagramAdapter,
  TikTokAdapter,
} from '@/lib/services/sales-channels/adapters';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

export async function POST(
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

    // Create appropriate adapter based on channel type
    let adapter;
    const apiConfig = channel.api_config as Record<string, unknown>;

    switch (channel.channel_type) {
      case 'woocommerce':
        adapter = new WooCommerceAdapter({
          api_url: apiConfig.api_url as string,
          consumer_key: apiConfig.consumer_key as string,
          consumer_secret: apiConfig.consumer_secret as string,
        });
        break;
      case 'whatsapp':
        adapter = new WhatsAppAdapter({
          access_token: apiConfig.access_token as string,
          phone_number_id: apiConfig.phone_number_id as string,
          business_account_id: apiConfig.business_account_id as string,
        });
        break;
      case 'facebook':
        adapter = new FacebookAdapter({
          access_token: apiConfig.access_token as string,
          page_id: apiConfig.page_id as string,
        });
        break;
      case 'instagram':
        adapter = new InstagramAdapter({
          access_token: apiConfig.access_token as string,
          instagram_business_account_id: apiConfig.instagram_business_account_id as string,
          page_id: apiConfig.page_id as string,
        });
        break;
      case 'tiktok':
        adapter = new TikTokAdapter({
          access_token: apiConfig.access_token as string,
          app_key: apiConfig.app_key as string,
          app_secret: apiConfig.app_secret as string,
          shop_id: apiConfig.shop_id as string,
        });
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported channel type',
          },
          { status: 400 }
        );
    }

    const connected = await adapter.testConnection();

    // Update sync status
    await ChannelService.updateSyncStatus(
      params.id,
      connected ? 'idle' : 'error',
      connected ? null : 'Connection test failed'
    );

    return NextResponse.json({
      success: connected,
      connected,
      message: connected ? 'Connection successful' : 'Connection failed',
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/sales-channels/[id]/test-connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test connection',
        connected: false,
      },
      { status: 500 }
    );
  }
}

