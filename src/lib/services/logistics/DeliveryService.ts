/**
 * Delivery Service
 *
 * Handles CRUD operations for deliveries
 */

import { query } from '@/lib/database/unified-connection';
import type {
  Delivery,
  DeliveryInsert,
  DeliveryStatus,
  DeliveryItem,
} from '@/types/logistics';

export class DeliveryService {
  /**
   * Get deliveries with pagination and filters
   */
  static async getDeliveries(
    orgId: string,
    limit = 50,
    offset = 0,
    filters?: {
      status?: DeliveryStatus;
      quotation_id?: string;
      sales_order_id?: string;
      customer_id?: string;
      courier_provider_id?: string;
    }
  ): Promise<{ data: Delivery[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.quotation_id) {
        conditions.push(`quotation_id = $${paramIndex}`);
        params.push(filters.quotation_id);
        paramIndex++;
      }

      if (filters?.sales_order_id) {
        conditions.push(`sales_order_id = $${paramIndex}`);
        params.push(filters.sales_order_id);
        paramIndex++;
      }

      if (filters?.customer_id) {
        conditions.push(`customer_id = $${paramIndex}`);
        params.push(filters.customer_id);
        paramIndex++;
      }

      if (filters?.courier_provider_id) {
        conditions.push(`courier_provider_id = $${paramIndex}`);
        params.push(filters.courier_provider_id);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM deliveries ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get deliveries
      params.push(limit, offset);
      const querySql = `SELECT * FROM deliveries
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

      const result = await query<Delivery>(querySql, params);

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      throw error;
    }
  }

  /**
   * Get delivery by ID
   */
  static async getDeliveryById(id: string, orgId: string): Promise<Delivery | null> {
    try {
      const result = await query<Delivery>(
        'SELECT * FROM deliveries WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching delivery:', error);
      throw error;
    }
  }

  /**
   * Get delivery by tracking number
   */
  static async getDeliveryByTrackingNumber(
    trackingNumber: string,
    orgId: string
  ): Promise<Delivery | null> {
    try {
      const result = await query<Delivery>(
        'SELECT * FROM deliveries WHERE tracking_number = $1 AND org_id = $2',
        [trackingNumber, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching delivery by tracking number:', error);
      throw error;
    }
  }

  /**
   * Get delivery items
   */
  static async getDeliveryItems(deliveryId: string): Promise<DeliveryItem[]> {
    try {
      const result = await query<DeliveryItem>(
        'SELECT * FROM delivery_items WHERE delivery_id = $1 ORDER BY id',
        [deliveryId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching delivery items:', error);
      throw error;
    }
  }

  /**
   * Create a new delivery
   * Automatically reserves inventory if not dropshipping
   */
  static async createDelivery(data: DeliveryInsert): Promise<Delivery> {
    try {
      // Generate delivery number if not provided
      let deliveryNumber = data.delivery_number;
      if (!deliveryNumber) {
        const numberResult = await query<{ delivery_number: string }>(
          'SELECT generate_delivery_number($1) as delivery_number',
          [data.org_id]
        );
        deliveryNumber = numberResult.rows[0]?.delivery_number || '';
      }

      const insertSql = `
        INSERT INTO deliveries (
          org_id, delivery_number, status, quotation_id, sales_order_id,
          customer_id, customer_name, customer_phone, customer_email,
          pickup_address, pickup_contact_name, pickup_contact_phone, pickup_lat, pickup_lng,
          delivery_address, delivery_contact_name, delivery_contact_phone, delivery_lat, delivery_lng,
          courier_provider_id, service_tier_id, tracking_number,
          package_type, weight_kg, dimensions_length_cm, dimensions_width_cm, dimensions_height_cm, declared_value,
          requires_signature, is_fragile, is_insured, special_instructions,
          cost_quoted, cost_actual, currency,
          requested_pickup_date, requested_delivery_date, estimated_delivery_date,
          is_dropshipping, supplier_id, supplier_shipping_address,
          metadata, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43
        )
        RETURNING *
      `;

      const result = await query<Delivery>(insertSql, [
        data.org_id,
        deliveryNumber,
        data.status || 'pending',
        data.quotation_id || null,
        data.sales_order_id || null,
        data.customer_id || null,
        data.customer_name || null,
        data.customer_phone || null,
        data.customer_email || null,
        JSON.stringify(data.pickup_address),
        data.pickup_contact_name || null,
        data.pickup_contact_phone || null,
        data.pickup_lat || null,
        data.pickup_lng || null,
        JSON.stringify(data.delivery_address),
        data.delivery_contact_name || null,
        data.delivery_contact_phone || null,
        data.delivery_lat || null,
        data.delivery_lng || null,
        data.courier_provider_id || null,
        data.service_tier_id || null,
        data.tracking_number || null,
        data.package_type || null,
        data.weight_kg || null,
        data.dimensions_length_cm || null,
        data.dimensions_width_cm || null,
        data.dimensions_height_cm || null,
        data.declared_value || null,
        data.requires_signature || false,
        data.is_fragile || false,
        data.is_insured || false,
        data.special_instructions || null,
        data.cost_quoted || null,
        data.cost_actual || null,
        data.currency || 'ZAR',
        data.requested_pickup_date || null,
        data.requested_delivery_date || null,
        data.estimated_delivery_date || null,
        data.is_dropshipping || false,
        data.supplier_id || null,
        data.supplier_shipping_address ? JSON.stringify(data.supplier_shipping_address) : null,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
        data.created_by || null,
      ]);

      const delivery = result.rows[0];

      // Reserve inventory if not dropshipping
      if (!data.is_dropshipping && delivery.id) {
        await this.reserveInventoryForDelivery(delivery.id, data.org_id);
      }

      return delivery;
    } catch (error) {
      console.error('Error creating delivery:', error);
      throw error;
    }
  }

  /**
   * Update delivery
   */
  static async updateDelivery(
    id: string,
    orgId: string,
    updates: Partial<DeliveryInsert> & { updated_by?: string }
  ): Promise<Delivery> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.tracking_number !== undefined) {
        fields.push(`tracking_number = $${paramIndex++}`);
        values.push(updates.tracking_number);
      }

      if (updates.cost_actual !== undefined) {
        fields.push(`cost_actual = $${paramIndex++}`);
        values.push(updates.cost_actual);
      }

      if (updates.actual_pickup_date !== undefined) {
        fields.push(`actual_pickup_date = $${paramIndex++}`);
        values.push(updates.actual_pickup_date);
      }

      if (updates.actual_delivery_date !== undefined) {
        fields.push(`actual_delivery_date = $${paramIndex++}`);
        values.push(updates.actual_delivery_date);
      }

      if (updates.estimated_delivery_date !== undefined) {
        fields.push(`estimated_delivery_date = $${paramIndex++}`);
        values.push(updates.estimated_delivery_date);
      }

      if (updates.updated_by !== undefined) {
        fields.push(`updated_by = $${paramIndex++}`);
        values.push(updates.updated_by);
      }

      if (fields.length === 0) {
        // No updates, return existing
        return (await this.getDeliveryById(id, orgId))!;
      }

      values.push(id, orgId);
      const updateSql = `
        UPDATE deliveries
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex++} AND org_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await query<Delivery>(updateSql, values);

      if (result.rows.length === 0) {
        throw new Error('Delivery not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating delivery:', error);
      throw error;
    }
  }

  /**
   * Update delivery status
   * Automatically releases inventory if status changes to cancelled
   */
  static async updateDeliveryStatus(
    id: string,
    orgId: string,
    status: DeliveryStatus,
    updatedBy?: string
  ): Promise<Delivery> {
    // Get current delivery to check status change
    const currentDelivery = await this.getDeliveryById(id, orgId);
    if (!currentDelivery) {
      throw new Error('Delivery not found');
    }

    // Release inventory if status changes to cancelled
    if (status === 'cancelled' && currentDelivery.status !== 'cancelled') {
      await this.releaseInventoryForDelivery(id, orgId);
    }

    return this.updateDelivery(id, orgId, { status, updated_by: updatedBy });
  }

  /**
   * Delete delivery
   * Automatically releases inventory allocations
   */
  static async deleteDelivery(id: string, orgId: string): Promise<void> {
    try {
      // Release inventory before deleting
      await this.releaseInventoryForDelivery(id, orgId);

      await query('DELETE FROM deliveries WHERE id = $1 AND org_id = $2', [id, orgId]);
    } catch (error) {
      console.error('Error deleting delivery:', error);
      throw error;
    }
  }

  /**
   * Reserve inventory for a delivery
   * Called when delivery is created (non-dropshipping)
   */
  static async reserveInventoryForDelivery(
    deliveryId: string,
    orgId: string
  ): Promise<void> {
    try {
      // Get delivery items
      const items = await this.getDeliveryItems(deliveryId);

      if (items.length === 0) {
        return; // No items to allocate
      }

      // Get delivery to check if dropshipping
      const delivery = await this.getDeliveryById(deliveryId, orgId);
      if (!delivery || delivery.is_dropshipping) {
        return; // Skip allocation for dropshipping
      }

      // Reserve inventory for each item
      for (const item of items) {
        if (!item.product_id) {
          continue; // Skip items without product_id
        }

        // Get inventory item
        const inventoryResult = await query<{
          id: string;
          stock_qty: number;
          reserved_qty: number;
        }>(
          `SELECT id, stock_qty, reserved_qty 
           FROM inventory_item 
           WHERE id = $1 AND org_id = $2 
           FOR UPDATE`,
          [item.product_id, orgId]
        );

        if (inventoryResult.rows.length === 0) {
          console.warn(`Inventory item not found: ${item.product_id}`);
          continue;
        }

        const inventoryItem = inventoryResult.rows[0];
        const availableQty = inventoryItem.stock_qty - inventoryItem.reserved_qty;
        const quantityToReserve = Math.min(
          Number(item.quantity),
          availableQty
        );

        if (quantityToReserve <= 0) {
          throw new Error(
            `Insufficient available inventory for product ${item.product_id}. Available: ${availableQty}, Required: ${item.quantity}`
          );
        }

        // Update reserved quantity
        const newReservedQty = inventoryItem.reserved_qty + quantityToReserve;

        await query(
          `UPDATE inventory_item 
           SET reserved_qty = $1, updated_at = NOW() 
           WHERE id = $2`,
          [newReservedQty, item.product_id]
        );

        // Create stock movement record
        await query(
          `INSERT INTO stock_movements (item_id, type, quantity, reason, reference, timestamp)
           VALUES ($1, 'adjustment', $2, 'delivery_reservation', $3, NOW())`,
          [item.product_id, quantityToReserve, deliveryId]
        );

        // Link to existing inventory allocations if they exist
        // (for supplier allocations that are being used for this delivery)
        const existingAllocationsResult = await query<{ id: string }>(
          `SELECT id FROM inventory_allocations 
           WHERE inventory_item_id = $1 
             AND org_id = $2 
             AND allocated_qty > 0
           ORDER BY created_at ASC
           LIMIT 1`,
          [item.product_id, orgId]
        );

        if (existingAllocationsResult.rows.length > 0) {
          const allocationId = existingAllocationsResult.rows[0].id;
          await query(
            `INSERT INTO delivery_inventory_allocations (delivery_id, inventory_allocation_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (delivery_id, inventory_allocation_id) DO UPDATE
             SET quantity = delivery_inventory_allocations.quantity + $3`,
            [deliveryId, allocationId, quantityToReserve]
          );
        }
      }
    } catch (error) {
      console.error('Error reserving inventory for delivery:', error);
      throw error;
    }
  }

  /**
   * Release inventory for a delivery
   * Called when delivery is cancelled or deleted
   */
  static async releaseInventoryForDelivery(
    deliveryId: string,
    orgId: string
  ): Promise<void> {
    try {
      // Get delivery to check if dropshipping
      const delivery = await this.getDeliveryById(deliveryId, orgId);
      if (!delivery || delivery.is_dropshipping) {
        return; // Skip release for dropshipping
      }

      // Get linked inventory allocations
      const allocationsResult = await query<{
        inventory_allocation_id: string;
        quantity: number;
        inventory_item_id: string;
      }>(
        `SELECT dia.inventory_allocation_id, dia.quantity, ia.inventory_item_id
         FROM delivery_inventory_allocations dia
         JOIN inventory_allocations ia ON dia.inventory_allocation_id = ia.id
         WHERE dia.delivery_id = $1`,
        [deliveryId]
      );

      // Release inventory for each allocation
      for (const allocation of allocationsResult.rows) {
        // Get current inventory item state
        const inventoryResult = await query<{
          id: string;
          reserved_qty: number;
        }>(
          `SELECT id, reserved_qty 
           FROM inventory_item 
           WHERE id = $1 AND org_id = $2 
           FOR UPDATE`,
          [allocation.inventory_item_id, orgId]
        );

        if (inventoryResult.rows.length === 0) {
          continue;
        }

        const inventoryItem = inventoryResult.rows[0];
        const newReservedQty = Math.max(
          0,
          inventoryItem.reserved_qty - allocation.quantity
        );

        // Update reserved quantity
        await query(
          `UPDATE inventory_item 
           SET reserved_qty = $1, updated_at = NOW() 
           WHERE id = $2`,
          [newReservedQty, allocation.inventory_item_id]
        );

        // Create stock movement record
        await query(
          `INSERT INTO stock_movements (item_id, type, quantity, reason, reference, timestamp)
           VALUES ($1, 'adjustment', -$2, 'delivery_cancellation', $3, NOW())`,
          [allocation.inventory_item_id, allocation.quantity, deliveryId]
        );
      }

      // Also release based on delivery items (in case allocations weren't linked)
      const items = await this.getDeliveryItems(deliveryId);
      for (const item of items) {
        if (!item.product_id) {
          continue;
        }

        // Check if already released via allocations
        const alreadyReleased = allocationsResult.rows.some(
          (a) => a.inventory_item_id === item.product_id
        );
        if (alreadyReleased) {
          continue;
        }

        // Release directly
        const inventoryResult = await query<{
          id: string;
          reserved_qty: number;
        }>(
          `SELECT id, reserved_qty 
           FROM inventory_item 
           WHERE id = $1 AND org_id = $2 
           FOR UPDATE`,
          [item.product_id, orgId]
        );

        if (inventoryResult.rows.length === 0) {
          continue;
        }

        const inventoryItem = inventoryResult.rows[0];
        const quantityToRelease = Number(item.quantity);
        const newReservedQty = Math.max(
          0,
          inventoryItem.reserved_qty - quantityToRelease
        );

        await query(
          `UPDATE inventory_item 
           SET reserved_qty = $1, updated_at = NOW() 
           WHERE id = $2`,
          [newReservedQty, item.product_id]
        );

        await query(
          `INSERT INTO stock_movements (item_id, type, quantity, reason, reference, timestamp)
           VALUES ($1, 'adjustment', -$2, 'delivery_cancellation', $3, NOW())`,
          [item.product_id, quantityToRelease, deliveryId]
        );
      }

      // Delete delivery inventory allocation links
      await query(
        'DELETE FROM delivery_inventory_allocations WHERE delivery_id = $1',
        [deliveryId]
      );
    } catch (error) {
      console.error('Error releasing inventory for delivery:', error);
      throw error;
    }
  }
}

