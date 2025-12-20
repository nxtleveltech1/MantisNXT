/**
 * Base Channel Adapter Interface
 *
 * Defines the contract for all channel-specific adapters
 */

import type { ChannelProduct } from '../ChannelProductService';
import type { ChannelOrderInsert } from '../ChannelOrderService';

export interface ChannelConfig {
  api_key?: string;
  api_secret?: string;
  api_url?: string;
  consumer_key?: string;
  consumer_secret?: string;
  access_token?: string;
  [key: string]: unknown;
}

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errors?: string[];
}

export interface ChannelOrder {
  external_order_id: string;
  order_number?: string;
  order_status: string;
  currency?: string;
  subtotal?: number;
  tax_amount?: number;
  shipping_amount?: number;
  discount_amount?: number;
  total_amount: number;
  payment_status?: string;
  payment_method?: string;
  shipping_method?: string;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  customer_info?: Record<string, unknown>;
  order_metadata?: Record<string, unknown>;
  items: Array<{
    channel_product_id?: string;
    product_id?: string;
    sku?: string;
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    tax_amount?: number;
    total: number;
    variant_info?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Base abstract class for channel adapters
 */
export abstract class BaseChannelAdapter {
  protected config: ChannelConfig;

  constructor(config: ChannelConfig) {
    this.config = config;
  }

  /**
   * Test connection to the channel API
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Sync products to the channel
   */
  abstract syncProducts(products: ChannelProduct[]): Promise<SyncResult>;

  /**
   * Fetch orders from the channel
   */
  abstract fetchOrders(since?: Date): Promise<ChannelOrder[]>;

  /**
   * Update inventory/stock for a product
   */
  abstract updateInventory(channelProductId: string, quantity: number): Promise<void>;

  /**
   * Create a webhook for order notifications
   */
  abstract createWebhook(url: string, events: string[]): Promise<string>;

  /**
   * Delete a webhook
   */
  abstract deleteWebhook(webhookId: string): Promise<void>;

  /**
   * Map channel order to internal format
   */
  mapChannelOrderToInternal(channelOrder: ChannelOrder): ChannelOrderInsert {
    return {
      external_order_id: channelOrder.external_order_id,
      order_number: channelOrder.order_number,
      order_status: channelOrder.order_status,
      currency: channelOrder.currency,
      subtotal: channelOrder.subtotal,
      tax_amount: channelOrder.tax_amount,
      shipping_amount: channelOrder.shipping_amount,
      discount_amount: channelOrder.discount_amount,
      total_amount: channelOrder.total_amount,
      payment_status: channelOrder.payment_status,
      payment_method: channelOrder.payment_method,
      shipping_method: channelOrder.shipping_method,
      billing_address: channelOrder.billing_address,
      shipping_address: channelOrder.shipping_address,
      customer_info: channelOrder.customer_info,
      order_metadata: channelOrder.order_metadata,
      items: channelOrder.items.map(item => ({
        channel_product_id: item.channel_product_id,
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        total: item.total,
        variant_info: item.variant_info,
        metadata: item.metadata,
      })),
    };
  }
}

