/**
 * Dropshipping Service
 *
 * Handles dropshipping detection and supplier shipping workflows
 */

import { query } from '@/lib/database/unified-connection';
import { DeliveryService } from './DeliveryService';
import type { Delivery, DeliveryInsert } from '@/types/logistics';

export class DropshippingService {
  /**
   * Detect if a delivery should be dropshipped
   * Checks if products have suppliers and no inventory allocation
   */
  static async detectDropshipping(
    orgId: string,
    quotationId?: string,
    salesOrderId?: string
  ): Promise<{ isDropshipping: boolean; supplierId?: string; supplierName?: string }> {
    try {
      if (!quotationId && !salesOrderId) {
        return { isDropshipping: false };
      }

      // Check quotation items for supplier products
      if (quotationId) {
        const quotationItemsResult = await query(
          `SELECT qi.*, sp.supplier_id, s.name as supplier_name
           FROM quotation_items qi
           LEFT JOIN supplier_product sp ON qi.supplier_product_id = sp.id
           LEFT JOIN supplier s ON sp.supplier_id = s.id
           WHERE qi.quotation_id = $1`,
          [quotationId]
        );

        if (quotationItemsResult.rows.length > 0) {
          // Check if any items have suppliers and no inventory allocation
          const itemsWithSuppliers = quotationItemsResult.rows.filter(
            (item: any) => item.supplier_id
          );

          if (itemsWithSuppliers.length > 0) {
            // Check inventory allocations
            const productIds = itemsWithSuppliers
              .map((item: any) => item.product_id)
              .filter(Boolean);

            if (productIds.length > 0) {
              const allocationsResult = await query(
                `SELECT COUNT(*) as count
                 FROM inventory_allocations
                 WHERE inventory_item_id = ANY($1::uuid[])
                   AND org_id = $2`,
                [productIds, orgId]
              );

              const allocationCount = parseInt(allocationsResult.rows[0]?.count || '0', 10);

              // If no allocations, likely dropshipping
              if (allocationCount === 0) {
                const firstSupplier = itemsWithSuppliers[0];
                return {
                  isDropshipping: true,
                  supplierId: firstSupplier.supplier_id,
                  supplierName: firstSupplier.supplier_name,
                };
              }
            }
          }
        }
      }

      // Similar check for sales order items
      if (salesOrderId) {
        const salesOrderItemsResult = await query(
          `SELECT soi.*, sp.supplier_id, s.name as supplier_name
           FROM sales_order_items soi
           LEFT JOIN supplier_product sp ON soi.product_id = sp.product_id
           LEFT JOIN supplier s ON sp.supplier_id = s.id
           WHERE soi.sales_order_id = $1`,
          [salesOrderId]
        );

        if (salesOrderItemsResult.rows.length > 0) {
          const itemsWithSuppliers = salesOrderItemsResult.rows.filter(
            (item: any) => item.supplier_id
          );

          if (itemsWithSuppliers.length > 0) {
            const firstSupplier = itemsWithSuppliers[0];
            return {
              isDropshipping: true,
              supplierId: firstSupplier.supplier_id,
              supplierName: firstSupplier.supplier_name,
            };
          }
        }
      }

      return { isDropshipping: false };
    } catch (error) {
      console.error('Error detecting dropshipping:', error);
      return { isDropshipping: false };
    }
  }

  /**
   * Create dropshipping delivery
   * Creates delivery with supplier shipping address
   */
  static async createDropshippingDelivery(
    orgId: string,
    deliveryData: DeliveryInsert,
    supplierId: string
  ): Promise<Delivery> {
    try {
      // Get supplier shipping address
      const supplierResult = await query(
        'SELECT shipping_address, name FROM supplier WHERE id = $1 AND org_id = $2',
        [supplierId, orgId]
      );

      if (supplierResult.rows.length === 0) {
        throw new Error('Supplier not found');
      }

      const supplier = supplierResult.rows[0];
      const supplierShippingAddress =
        supplier.shipping_address || deliveryData.pickup_address;

      // Create delivery with dropshipping flag
      const delivery = await DeliveryService.createDelivery({
        ...deliveryData,
        org_id: orgId,
        is_dropshipping: true,
        supplier_id: supplierId,
        supplier_shipping_address: supplierShippingAddress,
        pickup_address: supplierShippingAddress, // Supplier ships from their location
      });

      // TODO: Send notification to supplier
      // await this.notifySupplier(supplierId, delivery);

      return delivery;
    } catch (error) {
      console.error('Error creating dropshipping delivery:', error);
      throw error;
    }
  }

  /**
   * Notify supplier about dropshipping order
   * TODO: Implement supplier notification system
   */
  static async notifySupplier(supplierId: string, delivery: Delivery): Promise<void> {
    try {
      // TODO: Implement supplier notification
      // This could be:
      // - Email notification
      // - API webhook
      // - Integration with supplier portal
      console.log(`Notifying supplier ${supplierId} about delivery ${delivery.id}`);
    } catch (error) {
      console.error('Error notifying supplier:', error);
      throw error;
    }
  }

  /**
   * Get supplier shipping address
   */
  static async getSupplierShippingAddress(
    supplierId: string,
    orgId: string
  ): Promise<any> {
    try {
      const result = await query(
        'SELECT shipping_address FROM supplier WHERE id = $1 AND org_id = $2',
        [supplierId, orgId]
      );

      return result.rows[0]?.shipping_address || null;
    } catch (error) {
      console.error('Error fetching supplier shipping address:', error);
      throw error;
    }
  }
}

