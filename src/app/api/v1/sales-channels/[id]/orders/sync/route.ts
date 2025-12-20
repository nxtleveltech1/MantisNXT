import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ChannelService, ChannelOrderService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';
import {
  WooCommerceAdapter,
  WhatsAppAdapter,
  FacebookAdapter,
  InstagramAdapter,
  TikTokAdapter,
} from '@/lib/services/sales-channels/adapters';

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

    // Update sync status
    await ChannelService.updateSyncStatus(params.id, 'syncing', null);

    // Create appropriate adapter
    const apiConfig = channel.api_config as Record<string, unknown>;
    let adapter;

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

    // Determine since date (last order sync or default to 24 hours ago)
    const since = channel.last_order_sync_at
      ? new Date(channel.last_order_sync_at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch orders from channel
    const orders = await adapter.fetchOrders(since);

    let processed = 0;
    let errors: string[] = [];

    // Process each order
    for (const order of orders) {
      try {
        const mappedOrder = adapter.mapChannelOrderToInternal(order);
        await ChannelOrderService.createChannelOrder({
          ...mappedOrder,
          channel_id: params.id,
          org_id: orgId,
        });
        processed++;
      } catch (error) {
        errors.push(
          `Order ${order.external_order_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update sync status
    await ChannelService.updateSyncStatus(
      params.id,
      errors.length === 0 ? 'idle' : errors.length < orders.length ? 'error' : 'error',
      errors.length > 0 ? errors.join('; ') : null
    );
    await ChannelService.updateLastSyncTime(params.id, 'orders');

    return NextResponse.json({
      success: true,
      processed,
      total: orders.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error('Error syncing orders:', error);
    await ChannelService.updateSyncStatus(
      params.id,
      'error',
      error instanceof Error ? error.message : 'Failed to sync orders'
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync orders',
      },
      { status: 500 }
    );
  }
}

