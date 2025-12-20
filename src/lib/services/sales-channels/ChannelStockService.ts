/**
 * Channel Stock Service
 *
 * Handles stock allocation logic (reserved/virtual)
 */

import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES } from '@/lib/db/schema-contract';

export interface ChannelStockAllocation {
  id: string;
  channel_id: string;
  product_id: string;
  location_id?: string | null;
  org_id: string;
  allocation_type: 'reserved' | 'virtual';
  allocated_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock_level: number;
  max_stock_level?: number | null;
  auto_replenish: boolean;
  last_allocated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelStockAllocationInsert {
  channel_id: string;
  product_id: string;
  location_id?: string | null;
  org_id: string;
  allocation_type: 'reserved' | 'virtual';
  allocated_quantity?: number;
  reserved_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number | null;
  auto_replenish?: boolean;
}

export interface ChannelStockAllocationUpdate {
  allocation_type?: 'reserved' | 'virtual';
  allocated_quantity?: number;
  reserved_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number | null;
  auto_replenish?: boolean;
}

export class ChannelStockService {
  static async getStockAllocations(
    channelId: string,
    orgId: string,
    filters?: { product_id?: string; location_id?: string | null }
  ): Promise<ChannelStockAllocation[]> {
    try {
      const conditions: string[] = [`channel_id = $1`, `org_id = $2`];
      const params: unknown[] = [channelId, orgId];
      let paramIndex = 3;

      if (filters?.product_id) {
        conditions.push(`product_id = $${paramIndex++}`);
        params.push(filters.product_id);
      }

      if (filters?.location_id !== undefined) {
        if (filters.location_id === null) {
          conditions.push(`location_id IS NULL`);
        } else {
          conditions.push(`location_id = $${paramIndex++}`);
          params.push(filters.location_id);
        }
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<ChannelStockAllocation>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_STOCK_ALLOCATION} ${whereClause} ORDER BY created_at DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching stock allocations:', error);
      throw error;
    }
  }

  static async getStockAllocationById(
    id: string,
    channelId: string,
    orgId: string
  ): Promise<ChannelStockAllocation | null> {
    try {
      const result = await query<ChannelStockAllocation>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_STOCK_ALLOCATION} 
         WHERE id = $1 AND channel_id = $2 AND org_id = $3`,
        [id, channelId, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching stock allocation:', error);
      throw error;
    }
  }

  static async getStockAllocationByProduct(
    channelId: string,
    productId: string,
    locationId: string | null,
    orgId: string
  ): Promise<ChannelStockAllocation | null> {
    try {
      const conditions: string[] = [
        `channel_id = $1`,
        `product_id = $2`,
        `org_id = $4`,
      ];
      const params: unknown[] = [channelId, productId, orgId];

      if (locationId === null) {
        conditions.push(`location_id IS NULL`);
      } else {
        conditions.push(`location_id = $3`);
        params.splice(2, 0, locationId);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<ChannelStockAllocation>(
        `SELECT * FROM ${CORE_TABLES.CHANNEL_STOCK_ALLOCATION} ${whereClause}`,
        params
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching stock allocation by product:', error);
      throw error;
    }
  }

  static async createStockAllocation(
    data: ChannelStockAllocationInsert
  ): Promise<ChannelStockAllocation> {
    try {
      const result = await query<ChannelStockAllocation>(
        `INSERT INTO ${CORE_TABLES.CHANNEL_STOCK_ALLOCATION} (
          channel_id, product_id, location_id, org_id, allocation_type,
          allocated_quantity, reserved_quantity, min_stock_level, max_stock_level,
          auto_replenish, last_allocated_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
        RETURNING *`,
        [
          data.channel_id,
          data.product_id,
          data.location_id || null,
          data.org_id,
          data.allocation_type,
          data.allocated_quantity ?? 0,
          data.reserved_quantity ?? 0,
          data.min_stock_level ?? 0,
          data.max_stock_level || null,
          data.auto_replenish ?? false,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating stock allocation:', error);
      throw error;
    }
  }

  static async updateStockAllocation(
    id: string,
    channelId: string,
    orgId: string,
    data: ChannelStockAllocationUpdate
  ): Promise<ChannelStockAllocation> {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (data.allocation_type !== undefined) {
        updates.push(`allocation_type = $${paramIndex++}`);
        params.push(data.allocation_type);
      }
      if (data.allocated_quantity !== undefined) {
        updates.push(`allocated_quantity = $${paramIndex++}`);
        params.push(data.allocated_quantity);
      }
      if (data.reserved_quantity !== undefined) {
        updates.push(`reserved_quantity = $${paramIndex++}`);
        params.push(data.reserved_quantity);
      }
      if (data.min_stock_level !== undefined) {
        updates.push(`min_stock_level = $${paramIndex++}`);
        params.push(data.min_stock_level);
      }
      if (data.max_stock_level !== undefined) {
        updates.push(`max_stock_level = $${paramIndex++}`);
        params.push(data.max_stock_level);
      }
      if (data.auto_replenish !== undefined) {
        updates.push(`auto_replenish = $${paramIndex++}`);
        params.push(data.auto_replenish);
      }

      if (updates.length === 0) {
        const allocation = await this.getStockAllocationById(id, channelId, orgId);
        if (!allocation) {
          throw new Error('Stock allocation not found');
        }
        return allocation;
      }

      updates.push(`last_allocated_at = NOW()`, `updated_at = NOW()`);
      params.push(id, channelId, orgId);

      const result = await query<ChannelStockAllocation>(
        `UPDATE ${CORE_TABLES.CHANNEL_STOCK_ALLOCATION} 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} AND channel_id = $${paramIndex + 1} AND org_id = $${paramIndex + 2}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Stock allocation not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating stock allocation:', error);
      throw error;
    }
  }

  static async deleteStockAllocation(
    id: string,
    channelId: string,
    orgId: string
  ): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM ${CORE_TABLES.CHANNEL_STOCK_ALLOCATION} 
         WHERE id = $1 AND channel_id = $2 AND org_id = $3`,
        [id, channelId, orgId]
      );

      if (result.rowCount === 0) {
        throw new Error('Stock allocation not found');
      }
    } catch (error) {
      console.error('Error deleting stock allocation:', error);
      throw error;
    }
  }

  static async allocateStock(
    channelId: string,
    productId: string,
    locationId: string | null,
    quantity: number,
    allocationType: 'reserved' | 'virtual',
    orgId: string
  ): Promise<ChannelStockAllocation> {
    try {
      // Check if allocation exists
      let allocation = await this.getStockAllocationByProduct(
        channelId,
        productId,
        locationId,
        orgId
      );

      if (!allocation) {
        // Create new allocation
        allocation = await this.createStockAllocation({
          channel_id: channelId,
          product_id: productId,
          location_id: locationId,
          org_id: orgId,
          allocation_type: allocationType,
          allocated_quantity: allocationType === 'virtual' ? quantity : 0,
          reserved_quantity: allocationType === 'reserved' ? quantity : 0,
        });
      } else {
        // Update existing allocation
        const updateData: ChannelStockAllocationUpdate = {};
        if (allocationType === 'virtual') {
          updateData.allocated_quantity = allocation.allocated_quantity + quantity;
        } else {
          updateData.reserved_quantity = allocation.reserved_quantity + quantity;
        }

        allocation = await this.updateStockAllocation(
          allocation.id,
          channelId,
          orgId,
          updateData
        );
      }

      return allocation;
    } catch (error) {
      console.error('Error allocating stock:', error);
      throw error;
    }
  }

  static async deallocateStock(
    channelId: string,
    productId: string,
    locationId: string | null,
    quantity: number,
    orgId: string
  ): Promise<ChannelStockAllocation> {
    try {
      const allocation = await this.getStockAllocationByProduct(
        channelId,
        productId,
        locationId,
        orgId
      );

      if (!allocation) {
        throw new Error('Stock allocation not found');
      }

      const updateData: ChannelStockAllocationUpdate = {};
      if (allocation.allocation_type === 'virtual') {
        updateData.allocated_quantity = Math.max(
          0,
          allocation.allocated_quantity - quantity
        );
      } else {
        updateData.reserved_quantity = Math.max(0, allocation.reserved_quantity - quantity);
      }

      return await this.updateStockAllocation(allocation.id, channelId, orgId, updateData);
    } catch (error) {
      console.error('Error deallocating stock:', error);
      throw error;
    }
  }

  static async checkAvailability(
    channelId: string,
    productId: string,
    locationId: string | null,
    quantity: number,
    orgId: string
  ): Promise<{ available: boolean; availableQuantity: number }> {
    try {
      const allocation = await this.getStockAllocationByProduct(
        channelId,
        productId,
        locationId,
        orgId
      );

      if (!allocation) {
        // No allocation means unlimited availability for virtual, or check actual stock
        return { available: true, availableQuantity: Infinity };
      }

      const availableQuantity = allocation.available_quantity;
      return {
        available: availableQuantity >= quantity,
        availableQuantity,
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }
}

