/**
 * Channel Product Service
 *
 * Manages product-channel mappings and syncing
 */

import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES } from '@/lib/db/schema-contract';

export interface ChannelProduct {
  id: string;
  channel_id: string;
  product_id: string;
  org_id: string;
  channel_product_id?: string | null;
  channel_sku?: string | null;
  is_active: boolean;
  sync_enabled: boolean;
  price_override?: number | null;
  title_override?: string | null;
  description_override?: string | null;
  image_urls?: string[] | null;
  channel_category?: string | null;
  tags?: string[] | null;
  metadata: Record<string, unknown>;
  last_synced_at?: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelProductInsert {
  channel_id: string;
  product_id: string;
  org_id: string;
  channel_product_id?: string;
  channel_sku?: string;
  is_active?: boolean;
  sync_enabled?: boolean;
  price_override?: number;
  title_override?: string;
  description_override?: string;
  image_urls?: string[];
  channel_category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ChannelProductUpdate {
  channel_product_id?: string | null;
  channel_sku?: string | null;
  is_active?: boolean;
  sync_enabled?: boolean;
  price_override?: number | null;
  title_override?: string | null;
  description_override?: string | null;
  image_urls?: string[] | null;
  channel_category?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown>;
}

export class ChannelProductService {
  static async getChannelProducts(
    channelId: string,
    orgId: string,
    filters?: { is_active?: boolean; sync_enabled?: boolean }
  ): Promise<ChannelProduct[]> {
    try {
      const conditions: string[] = [
        `channel_id = $1`,
        `org_id = $2`,
      ];
      const params: unknown[] = [channelId, orgId];
      let paramIndex = 3;

      if (filters?.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        params.push(filters.is_active);
      }

      if (filters?.sync_enabled !== undefined) {
        conditions.push(`sync_enabled = $${paramIndex++}`);
        params.push(filters.sync_enabled);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<ChannelProduct>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_PRODUCT} ${whereClause} ORDER BY created_at DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching channel products:', error);
      throw error;
    }
  }

  static async getChannelProductById(
    id: string,
    channelId: string,
    orgId: string
  ): Promise<ChannelProduct | null> {
    try {
      const result = await query<ChannelProduct>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_PRODUCT} 
         WHERE id = $1 AND channel_id = $2 AND org_id = $3`,
        [id, channelId, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching channel product:', error);
      throw error;
    }
  }

  static async getChannelProductByProductId(
    channelId: string,
    productId: string,
    orgId: string
  ): Promise<ChannelProduct | null> {
    try {
      const result = await query<ChannelProduct>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_PRODUCT} 
         WHERE channel_id = $1 AND product_id = $2 AND org_id = $3`,
        [channelId, productId, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching channel product by product ID:', error);
      throw error;
    }
  }

  static async createChannelProduct(data: ChannelProductInsert): Promise<ChannelProduct> {
    try {
      const result = await query<ChannelProduct>(
        `INSERT INTO ${CORE_TABLES.CHANNEL_PRODUCT} (
          channel_id, product_id, org_id, channel_product_id, channel_sku,
          is_active, sync_enabled, price_override, title_override, description_override,
          image_urls, channel_category, tags, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
          data.channel_id,
          data.product_id,
          data.org_id,
          data.channel_product_id || null,
          data.channel_sku || null,
          data.is_active ?? true,
          data.sync_enabled ?? true,
          data.price_override || null,
          data.title_override || null,
          data.description_override || null,
          data.image_urls || null,
          data.channel_category || null,
          data.tags || null,
          JSON.stringify(data.metadata || {}),
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating channel product:', error);
      throw error;
    }
  }

  static async updateChannelProduct(
    id: string,
    channelId: string,
    orgId: string,
    data: ChannelProductUpdate
  ): Promise<ChannelProduct> {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (data.channel_product_id !== undefined) {
        updates.push(`channel_product_id = $${paramIndex++}`);
        params.push(data.channel_product_id);
      }
      if (data.channel_sku !== undefined) {
        updates.push(`channel_sku = $${paramIndex++}`);
        params.push(data.channel_sku);
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(data.is_active);
      }
      if (data.sync_enabled !== undefined) {
        updates.push(`sync_enabled = $${paramIndex++}`);
        params.push(data.sync_enabled);
      }
      if (data.price_override !== undefined) {
        updates.push(`price_override = $${paramIndex++}`);
        params.push(data.price_override);
      }
      if (data.title_override !== undefined) {
        updates.push(`title_override = $${paramIndex++}`);
        params.push(data.title_override);
      }
      if (data.description_override !== undefined) {
        updates.push(`description_override = $${paramIndex++}`);
        params.push(data.description_override);
      }
      if (data.image_urls !== undefined) {
        updates.push(`image_urls = $${paramIndex++}`);
        params.push(data.image_urls);
      }
      if (data.channel_category !== undefined) {
        updates.push(`channel_category = $${paramIndex++}`);
        params.push(data.channel_category);
      }
      if (data.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        params.push(data.tags);
      }
      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        params.push(JSON.stringify(data.metadata));
      }

      if (updates.length === 0) {
        const product = await this.getChannelProductById(id, channelId, orgId);
        if (!product) {
          throw new Error('Channel product not found');
        }
        return product;
      }

      updates.push(`updated_at = NOW()`);
      params.push(id, channelId, orgId);

      const result = await query<ChannelProduct>(
        `UPDATE ${CORE_TABLES.CHANNEL_PRODUCT} 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} AND channel_id = $${paramIndex + 1} AND org_id = $${paramIndex + 2}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Channel product not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating channel product:', error);
      throw error;
    }
  }

  static async deleteChannelProduct(
    id: string,
    channelId: string,
    orgId: string
  ): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM ${CORE_TABLES.CHANNEL_PRODUCT} 
         WHERE id = $1 AND channel_id = $2 AND org_id = $3`,
        [id, channelId, orgId]
      );

      if (result.rowCount === 0) {
        throw new Error('Channel product not found');
      }
    } catch (error) {
      console.error('Error deleting channel product:', error);
      throw error;
    }
  }

  static async updateSyncStatus(
    id: string,
    status: 'pending' | 'synced' | 'error',
    errorMessage?: string | null
  ): Promise<void> {
    try {
      await query(
        `UPDATE ${CORE_TABLES.CHANNEL_PRODUCT} 
         SET sync_status = $1, error_message = $2, last_synced_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [status, errorMessage || null, id]
      );
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw error;
    }
  }

  static async bulkCreateChannelProducts(
    channelId: string,
    orgId: string,
    products: Omit<ChannelProductInsert, 'channel_id' | 'org_id'>[]
  ): Promise<ChannelProduct[]> {
    try {
      const created: ChannelProduct[] = [];

      for (const product of products) {
        const channelProduct = await this.createChannelProduct({
          ...product,
          channel_id: channelId,
          org_id: orgId,
        });
        created.push(channelProduct);
      }

      return created;
    } catch (error) {
      console.error('Error bulk creating channel products:', error);
      throw error;
    }
  }
}

