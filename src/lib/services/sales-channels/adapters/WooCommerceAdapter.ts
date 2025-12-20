/**
 * WooCommerce Channel Adapter
 *
 * Handles integration with WooCommerce stores via REST API
 */

import { BaseChannelAdapter, type ChannelConfig, type SyncResult, type ChannelOrder } from './BaseAdapter';
import type { ChannelProduct } from '../ChannelProductService';

export interface WooCommerceConfig extends ChannelConfig {
  api_url: string; // e.g., https://example.com/wp-json/wc/v3
  consumer_key: string;
  consumer_secret: string;
}

export class WooCommerceAdapter extends BaseChannelAdapter {
  private apiUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(config: WooCommerceConfig) {
    super(config);
    this.apiUrl = config.api_url;
    this.consumerKey = config.consumer_key;
    this.consumerSecret = config.consumer_secret;
  }

  private getAuthHeader(): string {
    // WooCommerce uses Basic Auth with consumer_key:consumer_secret
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WooCommerce API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/system_status');
      return true;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error);
      return false;
    }
  }

  async syncProducts(products: ChannelProduct[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      errors: [],
    };

    for (const product of products) {
      try {
        result.itemsProcessed++;

        const wooProduct = {
          name: product.title_override || 'Product Name', // Would need to fetch from core.product
          type: 'simple',
          regular_price: String(product.price_override || 0),
          description: product.description_override || '',
          short_description: '',
          sku: product.channel_sku || '',
          manage_stock: true,
          stock_quantity: 0, // Would need to fetch from stock allocation
          images: (product.image_urls || []).map(url => ({ src: url })),
          categories: product.channel_category ? [{ name: product.channel_category }] : [],
          tags: (product.tags || []).map(tag => ({ name: tag })),
          meta_data: Object.entries(product.metadata || {}).map(([key, value]) => ({
            key,
            value: String(value),
          })),
        };

        if (product.channel_product_id) {
          // Update existing product
          await this.request(`/products/${product.channel_product_id}`, {
            method: 'PUT',
            body: JSON.stringify(wooProduct),
          });
        } else {
          // Create new product
          const created = await this.request<{ id: number }>('/products', {
            method: 'POST',
            body: JSON.stringify(wooProduct),
          });
          // Store the created ID in channel_product_id
          // This would need to be updated via ChannelProductService
        }

        result.itemsSucceeded++;
      } catch (error) {
        result.itemsFailed++;
        result.errors?.push(`Product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.itemsFailed === 0;
    return result;
  }

  async fetchOrders(since?: Date): Promise<ChannelOrder[]> {
    try {
      const params = new URLSearchParams();
      if (since) {
        params.append('after', since.toISOString());
      }
      params.append('per_page', '100');
      params.append('orderby', 'date');
      params.append('order', 'desc');

      const orders = await this.request<Array<{
        id: number;
        number: string;
        status: string;
        currency: string;
        total: string;
        subtotal: string;
        total_tax: string;
        shipping_total: string;
        discount_total: string;
        payment_method_title: string;
        shipping: {
          method_title: string;
          address_1: string;
          address_2: string;
          city: string;
          state: string;
          postcode: string;
          country: string;
        };
        billing: {
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          address_1: string;
          address_2: string;
          city: string;
          state: string;
          postcode: string;
          country: string;
        };
        line_items: Array<{
          id: number;
          product_id: number;
          sku: string;
          name: string;
          quantity: number;
          price: string;
          subtotal: string;
          total_tax: string;
          total: string;
          meta_data: Array<{ key: string; value: string }>;
        }>;
        date_created: string;
      }>>(`/orders?${params.toString()}`);

      return orders.map(order => ({
        external_order_id: String(order.id),
        order_number: order.number,
        order_status: order.status,
        currency: order.currency,
        subtotal: parseFloat(order.subtotal),
        tax_amount: parseFloat(order.total_tax),
        shipping_amount: parseFloat(order.shipping_total),
        discount_amount: parseFloat(order.discount_total),
        total_amount: parseFloat(order.total),
        payment_method: order.payment_method_title,
        shipping_method: order.shipping.method_title,
        billing_address: {
          first_name: order.billing.first_name,
          last_name: order.billing.last_name,
          email: order.billing.email,
          phone: order.billing.phone,
          address_1: order.billing.address_1,
          address_2: order.billing.address_2,
          city: order.billing.city,
          state: order.billing.state,
          postcode: order.billing.postcode,
          country: order.billing.country,
        },
        shipping_address: {
          address_1: order.shipping.address_1,
          address_2: order.shipping.address_2,
          city: order.shipping.city,
          state: order.shipping.state,
          postcode: order.shipping.postcode,
          country: order.shipping.country,
        },
        customer_info: {
          email: order.billing.email,
          phone: order.billing.phone,
          first_name: order.billing.first_name,
          last_name: order.billing.last_name,
        },
        order_metadata: {
          date_created: order.date_created,
        },
        items: order.line_items.map(item => ({
          channel_product_id: String(item.product_id),
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit_price: parseFloat(item.price),
          subtotal: parseFloat(item.subtotal),
          tax_amount: parseFloat(item.total_tax),
          total: parseFloat(item.total),
          metadata: Object.fromEntries(item.meta_data.map(m => [m.key, m.value])),
        })),
      }));
    } catch (error) {
      console.error('Error fetching WooCommerce orders:', error);
      throw error;
    }
  }

  async updateInventory(channelProductId: string, quantity: number): Promise<void> {
    try {
      await this.request(`/products/${channelProductId}`, {
        method: 'PUT',
        body: JSON.stringify({
          manage_stock: true,
          stock_quantity: quantity,
        }),
      });
    } catch (error) {
      console.error('Error updating WooCommerce inventory:', error);
      throw error;
    }
  }

  async createWebhook(url: string, events: string[]): Promise<string> {
    try {
      const webhook = await this.request<{ id: number }>('/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          name: 'MantisNXT Order Sync',
          status: 'active',
          topic: 'order.created',
          delivery_url: url,
        }),
      });

      return String(webhook.id);
    } catch (error) {
      console.error('Error creating WooCommerce webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.request(`/webhooks/${webhookId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting WooCommerce webhook:', error);
      throw error;
    }
  }
}

