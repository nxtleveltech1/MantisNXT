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

    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());

    // Validate webhook signature if secret is configured
    if (channel.webhook_secret) {
      // Channel-specific signature validation would go here
      // This is a placeholder - each adapter should implement its own validation
    }

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

    // Process webhook based on event type
    // This is a simplified handler - actual implementation would vary by channel
    const eventType = body.type || body.event || headers['x-webhook-event'] || 'order.created';

    if (eventType.includes('order') || eventType.includes('Order')) {
      // For WooCommerce, the order data might be in the webhook payload
      if (channel.channel_type === 'woocommerce' && body.order) {
        // Map WooCommerce order from webhook payload
        const wooOrder = body.order;
        const mappedOrder: any = {
          external_order_id: String(wooOrder.id),
          order_number: wooOrder.number,
          order_status: wooOrder.status,
          currency: wooOrder.currency,
          subtotal: parseFloat(wooOrder.subtotal || 0),
          tax_amount: parseFloat(wooOrder.total_tax || 0),
          shipping_amount: parseFloat(wooOrder.shipping_total || 0),
          discount_amount: parseFloat(wooOrder.discount_total || 0),
          total_amount: parseFloat(wooOrder.total),
          payment_method: wooOrder.payment_method_title,
          billing_address: wooOrder.billing || {},
          shipping_address: wooOrder.shipping || {},
          customer_info: {
            email: wooOrder.billing?.email,
            phone: wooOrder.billing?.phone,
            first_name: wooOrder.billing?.first_name,
            last_name: wooOrder.billing?.last_name,
          },
          items: (wooOrder.line_items || []).map((item: any) => ({
            channel_product_id: String(item.product_id),
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unit_price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal),
            tax_amount: parseFloat(item.total_tax || 0),
            total: parseFloat(item.total),
          })),
        };

        await ChannelOrderService.createChannelOrder({
          ...mappedOrder,
          channel_id: params.id,
          org_id: orgId,
        });
      } else {
        // For other channels, fetch the order from the channel
        const orders = await adapter.fetchOrders();
        
        if (orders.length > 0) {
          // Process the most recent order (or find the specific one from webhook data)
          const orderData = orders[0];
          const mappedOrder = adapter.mapChannelOrderToInternal(orderData);

          await ChannelOrderService.createChannelOrder({
            ...mappedOrder,
            channel_id: params.id,
            org_id: orgId,
          });
        }
      }
    }

    // Update last order sync time
    await ChannelService.updateLastSyncTime(params.id, 'orders');

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process webhook',
      },
      { status: 500 }
    );
  }
}

