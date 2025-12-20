/**
 * Instagram Channel Adapter
 *
 * Handles integration with Instagram Shopping API
 */

import { BaseChannelAdapter, type ChannelConfig, type SyncResult, type ChannelOrder } from './BaseAdapter';
import type { ChannelProduct } from '../ChannelProductService';

export interface InstagramConfig extends ChannelConfig {
  access_token: string;
  instagram_business_account_id: string;
  page_id: string;
}

export class InstagramAdapter extends BaseChannelAdapter {
  private accessToken: string;
  private instagramBusinessAccountId: string;
  private pageId: string;
  private apiUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: InstagramConfig) {
    super(config);
    this.accessToken = config.access_token;
    this.instagramBusinessAccountId = config.instagram_business_account_id;
    this.pageId = config.page_id;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Instagram API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request(`/${this.instagramBusinessAccountId}`);
      return true;
    } catch (error) {
      console.error('Instagram connection test failed:', error);
      return false;
    }
  }

  async syncProducts(products: ChannelProduct[]): Promise<SyncResult> {
    // Instagram Shopping product sync would use Facebook Commerce API
    // This is a placeholder implementation
    return {
      success: true,
      itemsProcessed: products.length,
      itemsSucceeded: 0,
      itemsFailed: 0,
      errors: ['Instagram product sync not yet implemented'],
    };
  }

  async fetchOrders(since?: Date): Promise<ChannelOrder[]> {
    // Instagram orders would come via webhooks
    // This is a placeholder implementation
    return [];
  }

  async updateInventory(channelProductId: string, quantity: number): Promise<void> {
    // Instagram Shopping inventory update
    throw new Error('Instagram inventory update not yet implemented');
  }

  async createWebhook(url: string, events: string[]): Promise<string> {
    try {
      const webhook = await this.request<{ id: string }>(`/${this.pageId}/subscribed_apps`, {
        method: 'POST',
        body: JSON.stringify({
          subscribed_fields: events,
        }),
      });

      // Note: Webhook URL configuration is done separately in Facebook Developer Console
      return webhook.id;
    } catch (error) {
      console.error('Error creating Instagram webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.request(`/${this.pageId}/subscribed_apps/${webhookId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting Instagram webhook:', error);
      throw error;
    }
  }
}

