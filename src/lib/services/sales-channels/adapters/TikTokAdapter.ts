/**
 * TikTok Channel Adapter
 *
 * Handles integration with TikTok Shop API
 */

import { BaseChannelAdapter, type ChannelConfig, type SyncResult, type ChannelOrder } from './BaseAdapter';
import type { ChannelProduct } from '../ChannelProductService';

export interface TikTokConfig extends ChannelConfig {
  access_token: string;
  app_key: string;
  app_secret: string;
  shop_id?: string;
}

export class TikTokAdapter extends BaseChannelAdapter {
  private accessToken: string;
  private appKey: string;
  private appSecret: string;
  private shopId?: string;
  private apiUrl = 'https://open-api.tiktokglobalshop.com';

  constructor(config: TikTokConfig) {
    super(config);
    this.accessToken = config.access_token;
    this.appKey = config.app_key;
    this.appSecret = config.app_secret;
    this.shopId = config.shop_id;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Shop-Id': this.shopId || '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TikTok API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple API call
      await this.request('/shop/get_shop_info');
      return true;
    } catch (error) {
      console.error('TikTok connection test failed:', error);
      return false;
    }
  }

  async syncProducts(products: ChannelProduct[]): Promise<SyncResult> {
    // TikTok Shop product sync would use TikTok Shop API
    // This is a placeholder implementation
    return {
      success: true,
      itemsProcessed: products.length,
      itemsSucceeded: 0,
      itemsFailed: 0,
      errors: ['TikTok product sync not yet implemented'],
    };
  }

  async fetchOrders(since?: Date): Promise<ChannelOrder[]> {
    // TikTok orders would come via webhooks or API polling
    // This is a placeholder implementation
    return [];
  }

  async updateInventory(channelProductId: string, quantity: number): Promise<void> {
    // TikTok Shop inventory update
    throw new Error('TikTok inventory update not yet implemented');
  }

  async createWebhook(url: string, events: string[]): Promise<string> {
    try {
      const webhook = await this.request<{ data: { webhook_id: string } }>('/webhook/register', {
        method: 'POST',
        body: JSON.stringify({
          webhook_url: url,
          event_list: events,
        }),
      });

      return webhook.data.webhook_id;
    } catch (error) {
      console.error('Error creating TikTok webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.request('/webhook/unregister', {
        method: 'POST',
        body: JSON.stringify({
          webhook_id: webhookId,
        }),
      });
    } catch (error) {
      console.error('Error deleting TikTok webhook:', error);
      throw error;
    }
  }
}

