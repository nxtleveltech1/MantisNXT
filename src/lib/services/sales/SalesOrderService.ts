/**
 * Sales Order Service
 *
 * Handles CRUD operations for sales orders (both manual and inbound)
 */

import { query } from '@/lib/database/unified-connection';
import { DocumentNumberingService } from './DocumentNumberingService';

export interface SalesOrder {
  id: string;
  org_id: string;
  connector_id?: string | null;
  external_id?: string | null;
  customer_id?: string | null;
  document_number?: string | null;
  order_number?: string | null;
  status?: string | null;
  status_enum?: 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';
  currency?: string | null;
  total?: number | null;
  total_tax?: number | null;
  quotation_id?: string | null;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
  payment_method?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  notes?: string | null;
  valid_until?: string | null;
  reference_number?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
  modified_at?: string | null;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id?: string | null;
  product_external_id?: string | null;
  sku?: string | null;
  name?: string | null;
  quantity: number;
  price?: number | null;
  subtotal?: number | null;
  total?: number | null;
  tax?: number | null;
  metadata?: Record<string, unknown>;
}

export interface SalesOrderInsert {
  org_id: string;
  customer_id: string;
  document_number?: string;
  status_enum?: SalesOrder['status_enum'];
  currency?: string;
  quotation_id?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  notes?: string | null;
  valid_until?: string | null;
  reference_number?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  items: Omit<SalesOrderItem, 'id' | 'sales_order_id'>[];
}

export interface SalesOrderUpdate {
  status_enum?: SalesOrder['status_enum'];
  currency?: string;
  notes?: string | null;
  valid_until?: string | null;
  reference_number?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  updated_by?: string | null;
  items?: Omit<SalesOrderItem, 'id' | 'sales_order_id'>[];
}

export class SalesOrderService {
  static async getSalesOrders(
    orgId: string,
    limit = 50,
    offset = 0,
    filters?: { status?: string; customer_id?: string; manual_only?: boolean }
  ): Promise<{ data: SalesOrder[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.status) {
        conditions.push(`(status = $${paramIndex} OR status_enum::text = $${paramIndex})`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.customer_id) {
        conditions.push(`customer_id = $${paramIndex}`);
        params.push(filters.customer_id);
        paramIndex++;
      }

      // Filter for manual orders (no connector_id) if requested
      if (filters?.manual_only) {
        conditions.push('connector_id IS NULL');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM sales_orders ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get sales orders
      params.push(limit, offset);
      const result = await query<SalesOrder>(
        `SELECT * FROM sales_orders
         ${whereClause}
         ORDER BY COALESCE(created_at, modified_at) DESC NULLS LAST
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      throw error;
    }
  }

  static async getSalesOrderById(id: string, orgId: string): Promise<SalesOrder | null> {
    try {
      const result = await query<SalesOrder>(
        'SELECT * FROM sales_orders WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching sales order:', error);
      throw error;
    }
  }

  static async getSalesOrderItems(salesOrderId: string): Promise<SalesOrderItem[]> {
    try {
      const result = await query<SalesOrderItem>(
        'SELECT * FROM sales_order_items WHERE sales_order_id = $1 ORDER BY id',
        [salesOrderId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching sales order items:', error);
      throw error;
    }
  }

  static async createSalesOrder(data: SalesOrderInsert): Promise<SalesOrder> {
    try {
      // Generate document number if not provided
      let documentNumber = data.document_number;
      if (!documentNumber) {
        documentNumber = await DocumentNumberingService.generateDocumentNumber(data.org_id, 'SO');
      }

      // Calculate totals from items
      const subtotal = data.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const totalTax = data.items.reduce((sum, item) => sum + (item.tax || 0), 0);
      const total = subtotal + totalTax;

      // Insert sales order
      const orderResult = await query<SalesOrder>(
        `INSERT INTO sales_orders (
          org_id, customer_id, document_number, status_enum, currency, total, total_tax,
          quotation_id, billing, shipping, notes, valid_until, reference_number, metadata, created_by, created_at, modified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING *`,
        [
          data.org_id,
          data.customer_id,
          documentNumber,
          data.status_enum || 'draft',
          data.currency || 'ZAR',
          total,
          totalTax,
          data.quotation_id || null,
          data.billing_address ? JSON.stringify(data.billing_address) : '{}',
          data.shipping_address ? JSON.stringify(data.shipping_address) : '{}',
          data.notes || null,
          data.valid_until || null,
          data.reference_number || null,
          data.metadata ? JSON.stringify(data.metadata) : '{}',
          data.created_by || null,
        ]
      );

      const salesOrder = orderResult.rows[0];

      // Insert items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await query(
            `INSERT INTO sales_order_items (
              sales_order_id, product_id, sku, name, quantity, price, subtotal, total, tax, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              salesOrder.id,
              item.product_id || null,
              item.sku || null,
              item.name || null,
              item.quantity,
              item.price || null,
              item.subtotal || null,
              item.total || null,
              item.tax || null,
              item.metadata ? JSON.stringify(item.metadata) : '{}',
            ]
          );
        }
      }

      // Auto-create delivery if quotation had delivery options
      if (data.quotation_id) {
        try {
          const deliveryOptionsResult = await query(
            'SELECT * FROM quotation_delivery_options WHERE quotation_id = $1',
            [data.quotation_id]
          );

          if (deliveryOptionsResult.rows.length > 0) {
            const deliveryOptions = deliveryOptionsResult.rows[0];
            const { DeliveryService } = await import('@/lib/services/logistics');

            // Get quotation to get customer info
            const quotationResult = await query(
              'SELECT customer_id FROM quotations WHERE id = $1',
              [data.quotation_id]
            );
            const quotation = quotationResult.rows[0];

            if (quotation) {
              // Create delivery record
              await DeliveryService.createDelivery({
                org_id: data.org_id,
                quotation_id: data.quotation_id,
                sales_order_id: salesOrder.id,
                customer_id: quotation.customer_id || data.customer_id,
                delivery_address: deliveryOptions.delivery_address || {},
                delivery_contact_name: deliveryOptions.delivery_contact_name,
                delivery_contact_phone: deliveryOptions.delivery_contact_phone,
                service_tier_id: deliveryOptions.service_tier_id,
                courier_provider_id: deliveryOptions.preferred_courier_provider_id,
                special_instructions: deliveryOptions.special_instructions,
                status: 'pending',
                created_by: data.created_by,
              });

              // Save delivery options for sales order
              await query(
                `INSERT INTO sales_order_delivery_options (
                  sales_order_id, delivery_address, delivery_contact_name, delivery_contact_phone,
                  service_tier_id, courier_provider_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (sales_order_id) DO UPDATE SET
                  delivery_address = EXCLUDED.delivery_address,
                  delivery_contact_name = EXCLUDED.delivery_contact_name,
                  delivery_contact_phone = EXCLUDED.delivery_contact_phone,
                  service_tier_id = EXCLUDED.service_tier_id,
                  courier_provider_id = EXCLUDED.courier_provider_id,
                  updated_at = now()`,
                [
                  salesOrder.id,
                  JSON.stringify(deliveryOptions.delivery_address || {}),
                  deliveryOptions.delivery_contact_name || null,
                  deliveryOptions.delivery_contact_phone || null,
                  deliveryOptions.service_tier_id || null,
                  deliveryOptions.preferred_courier_provider_id || null,
                ]
              );
            }
          }
        } catch (deliveryError) {
          console.error('Error creating delivery from quotation:', deliveryError);
          // Don't fail sales order creation if delivery creation fails
        }
      }

      return salesOrder;
    } catch (error) {
      console.error('Error creating sales order:', error);
      throw error;
    }
  }

  static async updateSalesOrder(
    id: string,
    orgId: string,
    updates: SalesOrderUpdate
  ): Promise<SalesOrder> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.status_enum !== undefined) {
        setClauses.push(`status_enum = $${paramIndex}`);
        values.push(updates.status_enum);
        paramIndex++;
      }

      if (updates.currency !== undefined) {
        setClauses.push(`currency = $${paramIndex}`);
        values.push(updates.currency);
        paramIndex++;
      }

      if (updates.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex}`);
        values.push(updates.notes);
        paramIndex++;
      }

      if (updates.valid_until !== undefined) {
        setClauses.push(`valid_until = $${paramIndex}`);
        values.push(updates.valid_until);
        paramIndex++;
      }

      if (updates.reference_number !== undefined) {
        setClauses.push(`reference_number = $${paramIndex}`);
        values.push(updates.reference_number);
        paramIndex++;
      }

      if (updates.billing_address !== undefined) {
        setClauses.push(`billing = $${paramIndex}`);
        values.push(JSON.stringify(updates.billing_address));
        paramIndex++;
      }

      if (updates.shipping_address !== undefined) {
        setClauses.push(`shipping = $${paramIndex}`);
        values.push(JSON.stringify(updates.shipping_address));
        paramIndex++;
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      if (updates.updated_by !== undefined) {
        setClauses.push(`updated_by = $${paramIndex}`);
        values.push(updates.updated_by);
        paramIndex++;
      }

      if (setClauses.length === 0 && !updates.items) {
        return (await this.getSalesOrderById(id, orgId))!;
      }

      if (setClauses.length > 0) {
        values.push(id, orgId);
        await query(
          `UPDATE sales_orders
           SET ${setClauses.join(', ')}, modified_at = NOW()
           WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}`,
          values
        );
      }

      // Update items if provided
      if (updates.items !== undefined) {
        // Delete existing items
        await query('DELETE FROM sales_order_items WHERE sales_order_id = $1', [id]);

        // Calculate new totals
        const subtotal = updates.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const totalTax = updates.items.reduce((sum, item) => sum + (item.tax || 0), 0);
        const total = subtotal + totalTax;

        // Update totals
        await query(
          'UPDATE sales_orders SET total = $1, total_tax = $2, modified_at = NOW() WHERE id = $3',
          [total, totalTax, id]
        );

        // Insert new items
        for (const item of updates.items) {
          await query(
            `INSERT INTO sales_order_items (
              sales_order_id, product_id, sku, name, quantity, price, subtotal, total, tax, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              id,
              item.product_id || null,
              item.sku || null,
              item.name || null,
              item.quantity,
              item.price || null,
              item.subtotal || null,
              item.total || null,
              item.tax || null,
              item.metadata ? JSON.stringify(item.metadata) : '{}',
            ]
          );
        }
      }

      const result = await query<SalesOrder>(
        'SELECT * FROM sales_orders WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      if (result.rows.length === 0) {
        throw new Error('Sales order not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating sales order:', error);
      throw error;
    }
  }

  static async deleteSalesOrder(id: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM sales_orders WHERE id = $1 AND org_id = $2 AND connector_id IS NULL',
        [id, orgId]
      );

      if (result.rowCount === 0) {
        throw new Error('Sales order not found, access denied, or cannot delete inbound orders');
      }
    } catch (error) {
      console.error('Error deleting sales order:', error);
      throw error;
    }
  }
}

