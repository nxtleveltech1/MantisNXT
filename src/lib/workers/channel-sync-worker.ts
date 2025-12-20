/**
 * Channel Sync Worker
 *
 * Background worker for polling-based order sync and product sync
 * This should be run as a scheduled job (e.g., via cron or a job queue)
 */

import { ChannelService, ChannelOrderService, ChannelProductService } from '@/lib/services/sales-channels';
import {
  WooCommerceAdapter,
  WhatsAppAdapter,
  FacebookAdapter,
  InstagramAdapter,
  TikTokAdapter,
} from '@/lib/services/sales-channels/adapters';
import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES } from '@/lib/db/schema-contract';

interface SyncLog {
  channel_id: string;
  sync_type: 'products' | 'orders' | 'inventory';
  status: 'success' | 'error' | 'partial';
  items_processed: number;
  items_succeeded: number;
  items_failed: number;
  error_message?: string | null;
  started_at: Date;
  completed_at?: Date;
}

export class ChannelSyncWorker {
  /**
   * Sync all active channels
   */
  static async syncAllChannels(orgId?: string): Promise<void> {
    try {
      // Get all active channels
      const conditions = orgId ? ['is_active = true', `org_id = $1`] : ['is_active = true'];
      const params = orgId ? [orgId] : [];

      const result = await query<{
        id: string;
        org_id: string;
        channel_type: string;
        sync_method: string;
        sync_interval_minutes: number;
        auto_sync_products: boolean;
        auto_sync_orders: boolean;
        last_order_sync_at: string | null;
      }>(
        `SELECT id, org_id, channel_type, sync_method, sync_interval_minutes, 
         auto_sync_products, auto_sync_orders, last_order_sync_at
         FROM ${CORE_TABLES.SALES_CHANNEL} 
         WHERE ${conditions.join(' AND ')}`,
        params
      );

      const channels = result.rows;

      for (const channel of channels) {
        try {
          // Check if it's time to sync (based on sync_interval_minutes)
          const shouldSync = this.shouldSyncChannel(channel);
          if (!shouldSync) {
            continue;
          }

          // Sync orders if enabled
          if (channel.auto_sync_orders && (channel.sync_method === 'polling' || channel.sync_method === 'both')) {
            await this.syncChannelOrders(channel.id, channel.org_id, channel.channel_type);
          }

          // Sync products if enabled
          if (channel.auto_sync_products) {
            await this.syncChannelProducts(channel.id, channel.org_id, channel.channel_type);
          }
        } catch (error) {
          console.error(`Error syncing channel ${channel.id}:`, error);
          await ChannelService.updateSyncStatus(
            channel.id,
            'error',
            error instanceof Error ? error.message : 'Sync failed'
          );
        }
      }
    } catch (error) {
      console.error('Error in syncAllChannels:', error);
      throw error;
    }
  }

  /**
   * Check if channel should be synced based on interval
   */
  private static shouldSyncChannel(channel: {
    sync_interval_minutes: number;
    last_order_sync_at: string | null;
  }): boolean {
    if (!channel.last_order_sync_at) {
      return true; // Never synced, sync now
    }

    const lastSync = new Date(channel.last_order_sync_at);
    const now = new Date();
    const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);

    return minutesSinceLastSync >= channel.sync_interval_minutes;
  }

  /**
   * Sync orders for a specific channel
   */
  static async syncChannelOrders(
    channelId: string,
    orgId: string,
    channelType: string
  ): Promise<SyncLog> {
    const syncLog: SyncLog = {
      channel_id: channelId,
      sync_type: 'orders',
      status: 'success',
      items_processed: 0,
      items_succeeded: 0,
      items_failed: 0,
      started_at: new Date(),
    };

    try {
      await ChannelService.updateSyncStatus(channelId, 'syncing', null);

      const channel = await ChannelService.getChannelById(channelId, orgId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const adapter = this.createAdapter(channelType, channel.api_config as Record<string, unknown>);
      if (!adapter) {
        throw new Error(`Unsupported channel type: ${channelType}`);
      }

      // Determine since date
      const since = channel.last_order_sync_at
        ? new Date(channel.last_order_sync_at)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Fetch orders
      const orders = await adapter.fetchOrders(since);
      syncLog.items_processed = orders.length;

      // Process each order
      for (const order of orders) {
        try {
          const mappedOrder = adapter.mapChannelOrderToInternal(order);
          await ChannelOrderService.createChannelOrder({
            ...mappedOrder,
            channel_id: channelId,
            org_id: orgId,
          });
          syncLog.items_succeeded++;
        } catch (error) {
          syncLog.items_failed++;
          syncLog.error_message = `${syncLog.error_message || ''}${syncLog.error_message ? '; ' : ''}Order ${order.external_order_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      syncLog.status = syncLog.items_failed === 0 ? 'success' : syncLog.items_failed < syncLog.items_processed ? 'partial' : 'error';
      syncLog.completed_at = new Date();

      // Update channel sync status
      await ChannelService.updateSyncStatus(
        channelId,
        syncLog.status === 'success' ? 'idle' : 'error',
        syncLog.error_message || null
      );
      await ChannelService.updateLastSyncTime(channelId, 'orders');

      // Log sync operation
      await this.logSync(syncLog);

      return syncLog;
    } catch (error) {
      syncLog.status = 'error';
      syncLog.error_message = error instanceof Error ? error.message : 'Unknown error';
      syncLog.completed_at = new Date();

      await ChannelService.updateSyncStatus(channelId, 'error', syncLog.error_message);
      await this.logSync(syncLog);

      throw error;
    }
  }

  /**
   * Sync products for a specific channel
   */
  static async syncChannelProducts(
    channelId: string,
    orgId: string,
    channelType: string
  ): Promise<SyncLog> {
    const syncLog: SyncLog = {
      channel_id: channelId,
      sync_type: 'products',
      status: 'success',
      items_processed: 0,
      items_succeeded: 0,
      items_failed: 0,
      started_at: new Date(),
    };

    try {
      await ChannelService.updateSyncStatus(channelId, 'syncing', null);

      const channel = await ChannelService.getChannelById(channelId, orgId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const adapter = this.createAdapter(channelType, channel.api_config as Record<string, unknown>);
      if (!adapter) {
        throw new Error(`Unsupported channel type: ${channelType}`);
      }

      // Get all active channel products
      const channelProducts = await ChannelProductService.getChannelProducts(channelId, orgId, {
        sync_enabled: true,
        is_active: true,
      });

      syncLog.items_processed = channelProducts.length;

      // Sync products
      const result = await adapter.syncProducts(channelProducts);
      syncLog.items_succeeded = result.itemsSucceeded;
      syncLog.items_failed = result.itemsFailed;
      syncLog.error_message = result.errors && result.errors.length > 0 ? result.errors.join('; ') : null;

      // Update sync status for each product
      for (let i = 0; i < channelProducts.length; i++) {
        const product = channelProducts[i];
        const status = i < result.itemsSucceeded ? 'synced' : 'error';
        const errorMessage = result.errors?.[i - result.itemsSucceeded] || null;
        await ChannelProductService.updateSyncStatus(product.id, status, errorMessage);
      }

      syncLog.status = result.success ? 'success' : syncLog.items_failed < syncLog.items_processed ? 'partial' : 'error';
      syncLog.completed_at = new Date();

      // Update channel sync status
      await ChannelService.updateSyncStatus(
        channelId,
        syncLog.status === 'success' ? 'idle' : 'error',
        syncLog.error_message || null
      );
      await ChannelService.updateLastSyncTime(channelId, 'products');

      // Log sync operation
      await this.logSync(syncLog);

      return syncLog;
    } catch (error) {
      syncLog.status = 'error';
      syncLog.error_message = error instanceof Error ? error.message : 'Unknown error';
      syncLog.completed_at = new Date();

      await ChannelService.updateSyncStatus(channelId, 'error', syncLog.error_message);
      await this.logSync(syncLog);

      throw error;
    }
  }

  /**
   * Create adapter instance based on channel type
   */
  private static createAdapter(channelType: string, apiConfig: Record<string, unknown>) {
    switch (channelType) {
      case 'woocommerce':
        return new WooCommerceAdapter({
          api_url: apiConfig.api_url as string,
          consumer_key: apiConfig.consumer_key as string,
          consumer_secret: apiConfig.consumer_secret as string,
        });
      case 'whatsapp':
        return new WhatsAppAdapter({
          access_token: apiConfig.access_token as string,
          phone_number_id: apiConfig.phone_number_id as string,
          business_account_id: apiConfig.business_account_id as string,
        });
      case 'facebook':
        return new FacebookAdapter({
          access_token: apiConfig.access_token as string,
          page_id: apiConfig.page_id as string,
        });
      case 'instagram':
        return new InstagramAdapter({
          access_token: apiConfig.access_token as string,
          instagram_business_account_id: apiConfig.instagram_business_account_id as string,
          page_id: apiConfig.page_id as string,
        });
      case 'tiktok':
        return new TikTokAdapter({
          access_token: apiConfig.access_token as string,
          app_key: apiConfig.app_key as string,
          app_secret: apiConfig.app_secret as string,
          shop_id: apiConfig.shop_id as string,
        });
      default:
        return null;
    }
  }

  /**
   * Log sync operation to database
   */
  private static async logSync(syncLog: SyncLog): Promise<void> {
    try {
      await query(
        `INSERT INTO ${CORE_TABLES.CHANNEL_SYNC_LOG} (
          channel_id, sync_type, status, items_processed, items_succeeded, items_failed,
          error_message, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          syncLog.channel_id,
          syncLog.sync_type,
          syncLog.status,
          syncLog.items_processed,
          syncLog.items_succeeded,
          syncLog.items_failed,
          syncLog.error_message || null,
          syncLog.started_at,
          syncLog.completed_at || null,
        ]
      );
    } catch (error) {
      console.error('Error logging sync operation:', error);
      // Don't throw - logging failure shouldn't break the sync
    }
  }
}

