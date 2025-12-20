import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ChannelService, ChannelProductService } from '@/lib/services/sales-channels';
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

    // Get all active channel products
    const channelProducts = await ChannelProductService.getChannelProducts(params.id, orgId, {
      sync_enabled: true,
      is_active: true,
    });

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

    // Sync products
    const result = await adapter.syncProducts(channelProducts);

    // Update sync status for each product
    for (let i = 0; i < channelProducts.length; i++) {
      const product = channelProducts[i];
      const status = i < result.itemsSucceeded ? 'synced' : 'error';
      const errorMessage = result.errors?.[i - result.itemsSucceeded] || null;
      await ChannelProductService.updateSyncStatus(product.id, status, errorMessage);
    }

    // Update channel sync status
    await ChannelService.updateSyncStatus(
      params.id,
      result.success ? 'idle' : 'error',
      result.errors && result.errors.length > 0 ? result.errors.join('; ') : null
    );
    await ChannelService.updateLastSyncTime(params.id, 'products');

    return NextResponse.json({
      success: result.success,
      itemsProcessed: result.itemsProcessed,
      itemsSucceeded: result.itemsSucceeded,
      itemsFailed: result.itemsFailed,
      errors: result.errors,
    });
  } catch (error: unknown) {
    console.error('Error syncing products:', error);
    await ChannelService.updateSyncStatus(
      params.id,
      'error',
      error instanceof Error ? error.message : 'Failed to sync products'
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync products',
      },
      { status: 500 }
    );
  }
}

