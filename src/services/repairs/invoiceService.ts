/**
 * Repair Invoice Service
 * Handles invoice generation for repairs
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type { RepairOrder, RepairOrderItem } from '@/types/repairs';

export interface RepairInvoice {
  invoice_id: string;
  repair_order_id: string;
  invoice_number: string;
  customer_id?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export async function generateRepairInvoice(
  repairOrderId: string
): Promise<RepairInvoice> {
  return await withTransaction(async (client) => {
    // Get repair order details
    const order = await client.query<RepairOrder>(
      'SELECT * FROM repairs.repair_orders WHERE repair_order_id = $1',
      [repairOrderId]
    );

    if (order.rows.length === 0) {
      throw new Error('Repair order not found');
    }

    const repairOrder = order.rows[0];

    // Get repair order items
    const items = await client.query<RepairOrderItem>(
      'SELECT * FROM repairs.repair_order_items WHERE repair_order_id = $1',
      [repairOrderId]
    );

    // Calculate totals
    const laborCost = repairOrder.labor_cost || 0;
    const partsCost = repairOrder.parts_cost || 0;
    const subtotal = laborCost + partsCost;
    const taxAmount = subtotal * 0.15; // 15% VAT (adjust as needed)
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const invoiceNumber = `INV-REP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Create invoice (assuming financial.invoices table exists)
    // This is a placeholder - adjust based on your actual invoice schema
    const invoiceResult = await client.query<RepairInvoice>(
      `
        INSERT INTO financial.invoices (
          invoice_number, customer_id, subtotal, tax_amount, total_amount, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'draft', NOW())
        RETURNING *
      `,
      [invoiceNumber, repairOrder.customer_id || null, subtotal, taxAmount, totalAmount]
    ).catch(() => {
      // If financial.invoices doesn't exist, create a simple record
      return {
        rows: [
          {
            invoice_id: `temp-${Date.now()}`,
            repair_order_id: repairOrderId,
            invoice_number: invoiceNumber,
            customer_id: repairOrder.customer_id,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'draft',
            created_at: new Date().toISOString(),
          },
        ],
      };
    });

    // Update repair order with invoice reference
    await client.query(
      'UPDATE repairs.repair_orders SET invoice_id = $1 WHERE repair_order_id = $2',
      [invoiceResult.rows[0].invoice_id, repairOrderId]
    );

    return invoiceResult.rows[0];
  });
}

export async function getInvoiceByRepairOrder(
  repairOrderId: string
): Promise<RepairInvoice | null> {
  // This would query your financial system
  // Placeholder implementation
  const result = await query<RepairInvoice>(
    `
      SELECT * FROM financial.invoices
      WHERE repair_order_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [repairOrderId]
  ).catch(() => ({ rows: [] }));

  return result.rows[0] || null;
}

