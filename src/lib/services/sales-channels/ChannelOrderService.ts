/**
 * Channel Order Service
 *
 * Processes incoming orders and maps to internal sales orders
 */

import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES } from '@/lib/db/schema-contract';
import { SalesOrderService } from '@/lib/services/sales';

export interface ChannelOrder {
  id: string;
  channel_id: string;
  org_id: string;
  external_order_id: string;
  sales_order_id?: string | null;
  customer_id?: string | null;
  order_status: string;
  internal_status?: string | null;
  order_number?: string | null;
  currency: string;
  subtotal?: number | null;
  tax_amount?: number | null;
  shipping_amount?: number | null;
  discount_amount?: number | null;
  total_amount: number;
  payment_status?: string | null;
  payment_method?: string | null;
  shipping_method?: string | null;
  billing_address: Record<string, unknown>;
  shipping_address: Record<string, unknown>;
  customer_info: Record<string, unknown>;
  order_metadata: Record<string, unknown>;
  synced_at: string;
  processed_at?: string | null;
  error_message?: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChannelOrderItem {
  id: string;
  channel_order_id: string;
  channel_product_id?: string | null;
  product_id?: string | null;
  sku?: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  variant_info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChannelOrderInsert {
  channel_id: string;
  org_id: string;
  external_order_id: string;
  order_status: string;
  order_number?: string;
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
  items: Omit<ChannelOrderItem, 'id' | 'channel_order_id' | 'created_at'>[];
}

export interface ChannelOrderUpdate {
  order_status?: string;
  internal_status?: string;
  sales_order_id?: string | null;
  customer_id?: string | null;
  processed_at?: string | null;
  error_message?: string | null;
  retry_count?: number;
}

export class ChannelOrderService {
  static async getChannelOrders(
    channelId: string,
    orgId: string,
    filters?: { order_status?: string; internal_status?: string; processed?: boolean }
  ): Promise<ChannelOrder[]> {
    try {
      const conditions: string[] = [`channel_id = $1`, `org_id = $2`];
      const params: unknown[] = [channelId, orgId];
      let paramIndex = 3;

      if (filters?.order_status) {
        conditions.push(`order_status = $${paramIndex++}`);
        params.push(filters.order_status);
      }

      if (filters?.internal_status) {
        conditions.push(`internal_status = $${paramIndex++}`);
        params.push(filters.internal_status);
      }

      if (filters?.processed !== undefined) {
        if (filters.processed) {
          conditions.push(`processed_at IS NOT NULL`);
        } else {
          conditions.push(`processed_at IS NULL`);
        }
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<ChannelOrder>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_ORDER} ${whereClause} ORDER BY synced_at DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching channel orders:', error);
      throw error;
    }
  }

  static async getChannelOrderById(
    id: string,
    channelId: string,
    orgId: string
  ): Promise<ChannelOrder | null> {
    try {
      const result = await query<ChannelOrder>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_ORDER} 
         WHERE id = $1 AND channel_id = $2 AND org_id = $3`,
        [id, channelId, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching channel order:', error);
      throw error;
    }
  }

  static async getChannelOrderByExternalId(
    channelId: string,
    externalOrderId: string,
    orgId: string
  ): Promise<ChannelOrder | null> {
    try {
      const result = await query<ChannelOrder>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_ORDER} 
         WHERE channel_id = $1 AND external_order_id = $2 AND org_id = $3`,
        [channelId, externalOrderId, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching channel order by external ID:', error);
      throw error;
    }
  }

  static async getChannelOrderItems(channelOrderId: string): Promise<ChannelOrderItem[]> {
    try {
      const result = await query<ChannelOrderItem>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_ORDER_ITEM} 
         WHERE channel_order_id = $1 ORDER BY created_at`,
        [channelOrderId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching channel order items:', error);
      throw error;
    }
  }

  static async createChannelOrder(data: ChannelOrderInsert): Promise<ChannelOrder> {
    try {
      // Check if order already exists
      const existing = await this.getChannelOrderByExternalId(
        data.channel_id,
        data.external_order_id,
        data.org_id
      );

      if (existing) {
        return existing;
      }

      const result = await query<ChannelOrder>(
        `INSERT INTO ${CORE_TABLES.CHANNEL_ORDER} (
          channel_id, org_id, external_order_id, order_status, order_number,
          currency, subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
          payment_status, payment_method, shipping_method,
          billing_address, shipping_address, customer_info, order_metadata,
          synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW(), NOW())
        RETURNING *`,
        [
          data.channel_id,
          data.org_id,
          data.external_order_id,
          data.order_status,
          data.order_number || null,
          data.currency || 'ZAR',
          data.subtotal || null,
          data.tax_amount || null,
          data.shipping_amount || null,
          data.discount_amount || null,
          data.total_amount,
          data.payment_status || null,
          data.payment_method || null,
          data.shipping_method || null,
          JSON.stringify(data.billing_address || {}),
          JSON.stringify(data.shipping_address || {}),
          JSON.stringify(data.customer_info || {}),
          JSON.stringify(data.order_metadata || {}),
        ]
      );

      const channelOrder = result.rows[0];

      // Insert order items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await query(
            `INSERT INTO ${CORE_TABLES.CHANNEL_ORDER_ITEM} (
              channel_order_id, channel_product_id, product_id, sku, name,
              quantity, unit_price, subtotal, tax_amount, total, variant_info, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
            [
              channelOrder.id,
              item.channel_product_id || null,
              item.product_id || null,
              item.sku || null,
              item.name,
              item.quantity,
              item.unit_price,
              item.subtotal,
              item.tax_amount || 0,
              item.total,
              JSON.stringify(item.variant_info || {}),
              JSON.stringify(item.metadata || {}),
            ]
          );
        }
      }

      return channelOrder;
    } catch (error) {
      console.error('Error creating channel order:', error);
      throw error;
    }
  }

  static async updateChannelOrder(
    id: string,
    channelId: string,
    orgId: string,
    data: ChannelOrderUpdate
  ): Promise<ChannelOrder> {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (data.order_status !== undefined) {
        updates.push(`order_status = $${paramIndex++}`);
        params.push(data.order_status);
      }
      if (data.internal_status !== undefined) {
        updates.push(`internal_status = $${paramIndex++}`);
        params.push(data.internal_status);
      }
      if (data.sales_order_id !== undefined) {
        updates.push(`sales_order_id = $${paramIndex++}`);
        params.push(data.sales_order_id);
      }
      if (data.customer_id !== undefined) {
        updates.push(`customer_id = $${paramIndex++}`);
        params.push(data.customer_id);
      }
      if (data.processed_at !== undefined) {
        updates.push(`processed_at = $${paramIndex++}`);
        params.push(data.processed_at);
      }
      if (data.error_message !== undefined) {
        updates.push(`error_message = $${paramIndex++}`);
        params.push(data.error_message);
      }
      if (data.retry_count !== undefined) {
        updates.push(`retry_count = $${paramIndex++}`);
        params.push(data.retry_count);
      }

      if (updates.length === 0) {
        const order = await this.getChannelOrderById(id, channelId, orgId);
        if (!order) {
          throw new Error('Channel order not found');
        }
        return order;
      }

      updates.push(`updated_at = NOW()`);
      params.push(id, channelId, orgId);

      const result = await query<ChannelOrder>(
        `UPDATE ${CORE_TABLES.CHANNEL_ORDER} 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} AND channel_id = $${paramIndex + 1} AND org_id = $${paramIndex + 2}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Channel order not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating channel order:', error);
      throw error;
    }
  }

  static async processChannelOrder(
    channelOrderId: string,
    channelId: string,
    orgId: string,
    customerId?: string
  ): Promise<{ channelOrder: ChannelOrder; salesOrderId: string }> {
    try {
      const channelOrder = await this.getChannelOrderById(channelOrderId, channelId, orgId);
      if (!channelOrder) {
        throw new Error('Channel order not found');
      }

      if (channelOrder.sales_order_id) {
        // Already processed
        return {
          channelOrder,
          salesOrderId: channelOrder.sales_order_id,
        };
      }

      const items = await this.getChannelOrderItems(channelOrderId);

      // Map channel order items to sales order items
      const salesOrderItems = items.map(item => ({
        product_id: item.product_id || undefined,
        sku: item.sku || undefined,
        name: item.name,
        quantity: item.quantity,
        price: item.unit_price,
        subtotal: item.subtotal,
        total: item.total,
        tax: item.tax_amount,
        metadata: item.metadata,
      }));

      // Map order status
      const statusMap: Record<string, 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed'> = {
        pending: 'pending',
        processing: 'processing',
        shipped: 'shipped',
        delivered: 'delivered',
        cancelled: 'cancelled',
        completed: 'completed',
      };

      const internalStatus = statusMap[channelOrder.order_status.toLowerCase()] || 'pending';

      // Get or create customer if needed
      let finalCustomerId = customerId || channelOrder.customer_id;
      
      // If no customer ID, try to find or create from customer_info
      if (!finalCustomerId && channelOrder.customer_info) {
        // TODO: Implement customer lookup/creation from customer_info
        // For now, we'll require a customer_id or skip order processing
        throw new Error('Customer ID is required to process order');
      }

      if (!finalCustomerId) {
        throw new Error('Customer ID is required to process order');
      }

      // Create internal sales order
      const salesOrder = await SalesOrderService.createSalesOrder({
        org_id: orgId,
        customer_id: finalCustomerId,
        document_number: channelOrder.order_number || undefined,
        status_enum: internalStatus,
        currency: channelOrder.currency,
        billing_address: channelOrder.billing_address,
        shipping_address: channelOrder.shipping_address,
        notes: `Order from ${channelOrder.external_order_id}`,
        reference_number: channelOrder.external_order_id,
        metadata: {
          channel_id: channelId,
          channel_order_id: channelOrderId,
          ...channelOrder.order_metadata,
        },
        items: salesOrderItems,
      });

      // Update channel order with sales order ID
      const updatedChannelOrder = await this.updateChannelOrder(
        channelOrderId,
        channelId,
        orgId,
        {
          sales_order_id: salesOrder.id,
          customer_id: finalCustomerId,
          internal_status: internalStatus,
          processed_at: new Date().toISOString(),
        }
      );

      return {
        channelOrder: updatedChannelOrder,
        salesOrderId: salesOrder.id,
      };
    } catch (error) {
      console.error('Error processing channel order:', error);
      throw error;
    }
  }
}

