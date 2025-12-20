/**
 * WhatsApp Channel Adapter
 *
 * Handles integration with WhatsApp Business API
 */

import { BaseChannelAdapter, type ChannelConfig, type SyncResult, type ChannelOrder } from './BaseAdapter';
import type { ChannelProduct } from '../ChannelProductService';

export interface WhatsAppConfig extends ChannelConfig {
  access_token: string;
  phone_number_id: string;
  business_account_id: string;
}

export class WhatsAppAdapter extends BaseChannelAdapter {
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private apiUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: WhatsAppConfig) {
    super(config);
    this.accessToken = config.access_token;
    this.phoneNumberId = config.phone_number_id;
    this.businessAccountId = config.business_account_id;
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
      throw new Error(`WhatsApp API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request(`/${this.phoneNumberId}`);
      return true;
    } catch (error) {
      console.error('WhatsApp connection test failed:', error);
      return false;
    }
  }

  async syncProducts(products: ChannelProduct[]): Promise<SyncResult> {
    // WhatsApp Business API doesn't have a traditional product catalog
    // Products would be sent as messages or via catalog API
    // This is a placeholder implementation
    return {
      success: true,
      itemsProcessed: products.length,
      itemsSucceeded: 0,
      itemsFailed: 0,
      errors: ['WhatsApp product sync not yet implemented'],
    };
  }

  async fetchOrders(since?: Date): Promise<ChannelOrder[]> {
    // WhatsApp orders would come via webhooks or message parsing
    // This is a placeholder implementation
    return [];
  }

  async updateInventory(channelProductId: string, quantity: number): Promise<void> {
    // WhatsApp doesn't have traditional inventory management
    // This would update catalog items if using WhatsApp Catalog API
    throw new Error('WhatsApp inventory update not yet implemented');
  }

  async createWebhook(url: string, events: string[]): Promise<string> {
    try {
      const webhook = await this.request<{ id: string }>(`/${this.businessAccountId}/subscribed_apps`, {
        method: 'POST',
        body: JSON.stringify({
          subscribed_fields: events,
        }),
      });

      // Note: Webhook URL configuration is done separately in Facebook Developer Console
      return webhook.id;
    } catch (error) {
      console.error('Error creating WhatsApp webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.request(`/${this.businessAccountId}/subscribed_apps/${webhookId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting WhatsApp webhook:', error);
      throw error;
    }
  }
}

