/**
 * Channel Service
 *
 * Handles CRUD operations for sales channels
 */

import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES } from '@/lib/db/schema-contract';

export interface SalesChannel {
  id: string;
  org_id: string;
  channel_type: 'woocommerce' | 'whatsapp' | 'facebook' | 'instagram' | 'tiktok';
  name: string;
  is_active: boolean;
  sync_method: 'webhook' | 'polling' | 'both';
  sync_interval_minutes: number;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  api_config: Record<string, unknown>;
  stock_allocation_type: 'reserved' | 'virtual' | 'both';
  auto_sync_products: boolean;
  auto_sync_orders: boolean;
  last_sync_at?: string | null;
  last_order_sync_at?: string | null;
  sync_status: 'idle' | 'syncing' | 'error';
  error_message?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface SalesChannelInsert {
  org_id: string;
  channel_type: SalesChannel['channel_type'];
  name: string;
  is_active?: boolean;
  sync_method?: SalesChannel['sync_method'];
  sync_interval_minutes?: number;
  webhook_url?: string;
  webhook_secret?: string;
  api_config: Record<string, unknown>;
  stock_allocation_type?: SalesChannel['stock_allocation_type'];
  auto_sync_products?: boolean;
  auto_sync_orders?: boolean;
  created_by?: string;
}

export interface SalesChannelUpdate {
  name?: string;
  is_active?: boolean;
  sync_method?: SalesChannel['sync_method'];
  sync_interval_minutes?: number;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  api_config?: Record<string, unknown>;
  stock_allocation_type?: SalesChannel['stock_allocation_type'];
  auto_sync_products?: boolean;
  auto_sync_orders?: boolean;
  updated_by?: string;
}

export class ChannelService {
  static async getChannels(
    orgId: string,
    filters?: { channel_type?: string; is_active?: boolean }
  ): Promise<SalesChannel[]> {
    try {
      const conditions: string[] = [`${CORE_TABLES.SALES_CHANNEL.split('.')[1]}.org_id = $1`];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.channel_type) {
        conditions.push(`channel_type = $${paramIndex}`);
        params.push(filters.channel_type);
        paramIndex++;
      }

      if (filters?.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex}`);
        params.push(filters.is_active);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query<SalesChannel>(
        `SELECT * FROM ${CORE_TABLES.SALES_CHANNEL} ${whereClause} ORDER BY created_at DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching sales channels:', error);
      throw error;
    }
  }

  static async getChannelById(id: string, orgId: string): Promise<SalesChannel | null> {
    try {
      const result = await query<SalesChannel>(
        `SELECT * FROM ${CORE_TABLES.SALES_CHANNEL} WHERE id = $1 AND org_id = $2`,
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching sales channel:', error);
      throw error;
    }
  }

  static async createChannel(data: SalesChannelInsert): Promise<SalesChannel> {
    try {
      const result = await query<SalesChannel>(
        `INSERT INTO ${CORE_TABLES.SALES_CHANNEL} (
          org_id, channel_type, name, is_active, sync_method, sync_interval_minutes,
          webhook_url, webhook_secret, api_config, stock_allocation_type,
          auto_sync_products, auto_sync_orders, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *`,
        [
          data.org_id,
          data.channel_type,
          data.name,
          data.is_active ?? true,
          data.sync_method ?? 'polling',
          data.sync_interval_minutes ?? 15,
          data.webhook_url || null,
          data.webhook_secret || null,
          JSON.stringify(data.api_config),
          data.stock_allocation_type ?? 'virtual',
          data.auto_sync_products ?? false,
          data.auto_sync_orders ?? true,
          data.created_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating sales channel:', error);
      throw error;
    }
  }

  static async updateChannel(
    id: string,
    orgId: string,
    data: SalesChannelUpdate
  ): Promise<SalesChannel> {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(data.is_active);
      }
      if (data.sync_method !== undefined) {
        updates.push(`sync_method = $${paramIndex++}`);
        params.push(data.sync_method);
      }
      if (data.sync_interval_minutes !== undefined) {
        updates.push(`sync_interval_minutes = $${paramIndex++}`);
        params.push(data.sync_interval_minutes);
      }
      if (data.webhook_url !== undefined) {
        updates.push(`webhook_url = $${paramIndex++}`);
        params.push(data.webhook_url);
      }
      if (data.webhook_secret !== undefined) {
        updates.push(`webhook_secret = $${paramIndex++}`);
        params.push(data.webhook_secret);
      }
      if (data.api_config !== undefined) {
        updates.push(`api_config = $${paramIndex++}`);
        params.push(JSON.stringify(data.api_config));
      }
      if (data.stock_allocation_type !== undefined) {
        updates.push(`stock_allocation_type = $${paramIndex++}`);
        params.push(data.stock_allocation_type);
      }
      if (data.auto_sync_products !== undefined) {
        updates.push(`auto_sync_products = $${paramIndex++}`);
        params.push(data.auto_sync_products);
      }
      if (data.auto_sync_orders !== undefined) {
        updates.push(`auto_sync_orders = $${paramIndex++}`);
        params.push(data.auto_sync_orders);
      }
      if (data.updated_by !== undefined) {
        updates.push(`updated_by = $${paramIndex++}`);
        params.push(data.updated_by);
      }

      if (updates.length === 0) {
        const channel = await this.getChannelById(id, orgId);
        if (!channel) {
          throw new Error('Channel not found');
        }
        return channel;
      }

      updates.push(`updated_at = NOW()`);
      params.push(id, orgId);

      const result = await query<SalesChannel>(
        `UPDATE ${CORE_TABLES.SALES_CHANNEL} 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Channel not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating sales channel:', error);
      throw error;
    }
  }

  static async deleteChannel(id: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM ${CORE_TABLES.SALES_CHANNEL} WHERE id = $1 AND org_id = $2`,
        [id, orgId]
      );

      if (result.rowCount === 0) {
        throw new Error('Channel not found');
      }
    } catch (error) {
      console.error('Error deleting sales channel:', error);
      throw error;
    }
  }

  static async updateSyncStatus(
    id: string,
    status: 'idle' | 'syncing' | 'error',
    errorMessage?: string | null
  ): Promise<void> {
    try {
      await query(
        `UPDATE ${CORE_TABLES.SALES_CHANNEL} 
         SET sync_status = $1, error_message = $2, updated_at = NOW()
         WHERE id = $3`,
        [status, errorMessage || null, id]
      );
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw error;
    }
  }

  static async updateLastSyncTime(id: string, syncType: 'products' | 'orders'): Promise<void> {
    try {
      const column = syncType === 'products' ? 'last_sync_at' : 'last_order_sync_at';
      await query(
        `UPDATE ${CORE_TABLES.SALES_CHANNEL} 
         SET ${column} = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
    } catch (error) {
      console.error('Error updating last sync time:', error);
      throw error;
    }
  }
}

