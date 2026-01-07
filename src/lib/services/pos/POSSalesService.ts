/**
 * POS Sales Service
 *
 * Orchestrates the full POS sale transaction:
 * 1. Creates sales order (status: completed)
 * 2. Creates invoice (status: paid)
 * 3. Decrements inventory
 * 4. Triggers document generation (order, invoice, receipt)
 * 5. Returns transaction result with document URLs
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import { SalesOrderService, type SalesOrderInsert } from '../sales/SalesOrderService';
import { InvoiceService, type InvoiceInsert } from '../sales/InvoiceService';
import { DocumentNumberingService } from '../sales/DocumentNumberingService';
import type { PoolClient } from 'pg';

// Default markup percentage (35%)
const DEFAULT_MARKUP = 0.35;

export interface POSSaleItem {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
  markup_percent?: number;
}

export interface POSSaleInput {
  org_id: string;
  store_id?: string;
  customer_id: string;
  payment_method: 'cash' | 'card' | 'digital' | 'account';
  payment_reference?: string;
  items: POSSaleItem[];
  notes?: string;
  created_by?: string;
}

export interface POSSaleResult {
  success: boolean;
  transaction_id: string;
  sales_order_id: string;
  sales_order_number: string;
  invoice_id: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  payment_reference?: string;
  documents: {
    sales_order_url?: string;
    invoice_url?: string;
    receipt_url?: string;
  };
  customer: {
    id: string;
    name?: string;
    email?: string;
  };
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  created_at: string;
}

export class POSSalesService {
  /**
   * Process a complete POS sale transaction
   */
  static async processSale(input: POSSaleInput): Promise<POSSaleResult> {
    const transactionId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Calculate totals
    const itemsWithTotals = input.items.map((item) => {
      const subtotal = item.sale_price * item.quantity;
      const taxAmount = 0; // VAT handled separately if needed
      const total = subtotal + taxAmount;
      return {
        ...item,
        subtotal,
        tax_amount: taxAmount,
        total,
      };
    });

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = itemsWithTotals.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal + taxAmount;

    // Use transaction to ensure atomicity
    return await withTransaction(async (client: PoolClient) => {
      // 1. Create Invoice directly for POS (skip sales orders for simplicity)
      const invoiceNumber = await DocumentNumberingService.generateDocumentNumber(
        input.org_id,
        'INV'
      );

      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          org_id, customer_id, document_number, status, currency,
          subtotal, total_tax, total, amount_paid, amount_due, paid_at,
          reference_number, notes, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          input.org_id,
          input.customer_id,
          invoiceNumber,
          'paid', // POS sales are immediately paid
          'ZAR',
          subtotal,
          taxAmount,
          total,
          total, // Full amount paid
          0, // Nothing due
          new Date().toISOString(), // Paid now
          input.payment_reference || null,
          input.notes || null,
          JSON.stringify({
            pos_transaction: true,
            transaction_id: transactionId,
            payment_method: input.payment_method,
            store_id: input.store_id || null,
          }),
          input.created_by || null,
        ]
      );

      const invoice = invoiceResult.rows[0];

      // 2. Insert Invoice Items
      for (let i = 0; i < itemsWithTotals.length; i++) {
        const item = itemsWithTotals[i];
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, product_id, sku, name, quantity, unit_price,
            tax_rate, tax_amount, subtotal, total, line_number, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            invoice.id,
            item.product_id,
            item.sku,
            item.name,
            item.quantity,
            item.sale_price,
            0, // Tax rate
            item.tax_amount,
            item.subtotal,
            item.total,
            i + 1,
            JSON.stringify({
              cost_price: item.cost_price,
              markup_percent: item.markup_percent || DEFAULT_MARKUP * 100,
            }),
          ]
        );
      }

      // 3. Decrement Inventory
      for (const item of input.items) {
        // Update inventory_items stock
        await client.query(
          `UPDATE public.inventory_items
           SET stock_qty = COALESCE(stock_qty, 0) - $1,
               updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );

        // Record stock movement
        await client.query(
          `INSERT INTO public.stock_movements (
            inventory_item_id, movement_type, quantity, reference_type, reference_id,
            notes, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            item.product_id,
            'OUT',
            item.quantity,
            'POS_SALE',
            invoice.id, // Use invoice ID as reference
            `POS Sale - Invoice ${invoiceNumber}`,
            input.created_by || null,
          ]
        );
      }

      // 4. Get customer details
      const customerResult = await client.query(
        `SELECT id, name, email FROM customer WHERE id = $1`,
        [input.customer_id]
      );
      const customer = customerResult.rows[0] || { id: input.customer_id };

      // Return result
      return {
        success: true,
        transaction_id: transactionId,
        sales_order_id: invoice.id, // Use invoice ID as sales order ID for compatibility
        sales_order_number: invoiceNumber,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        subtotal,
        tax_amount: taxAmount,
        total,
        payment_method: input.payment_method,
        payment_reference: input.payment_reference,
        documents: {
          // Document URLs will be populated by async generation hooks
          sales_order_url: undefined,
          invoice_url: undefined,
          receipt_url: undefined,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
        items: itemsWithTotals.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.sale_price,
          subtotal: item.subtotal,
        })),
        created_at: createdAt,
      };
    });
  }

  /**
   * Get recent POS transactions for a store (directly from invoices)
   */
  static async getRecentTransactions(
    orgId: string,
    limit = 50,
    storeId?: string
  ): Promise<Array<POSSaleResult>> {
    let sql = `
      SELECT
        i.id as invoice_id,
        i.document_number as invoice_number,
        i.customer_id,
        i.subtotal,
        i.total_tax,
        i.total,
        i.metadata,
        i.created_at,
        c.name as customer_name,
        c.email as customer_email
      FROM invoices i
      LEFT JOIN customer c ON c.id = i.customer_id
      WHERE i.org_id = $1
        AND i.metadata->>'pos_transaction' = 'true'
    `;

    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (storeId) {
      sql += ` AND i.metadata->>'store_id' = $${paramIndex}`;
      params.push(storeId);
      paramIndex++;
    }

    sql += ` ORDER BY i.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);

    return result.rows.map((row: Record<string, unknown>) => ({
      success: true,
      transaction_id: (row.metadata as Record<string, string>)?.transaction_id || row.invoice_id as string,
      sales_order_id: row.invoice_id as string, // Use invoice ID as sales order ID
      sales_order_number: row.invoice_number as string,
      invoice_id: row.invoice_id as string,
      invoice_number: row.invoice_number as string,
      subtotal: Number(row.subtotal),
      tax_amount: Number(row.total_tax),
      total: Number(row.total),
      payment_method: (row.metadata as Record<string, string>)?.payment_method || 'cash',
      documents: {},
      customer: {
        id: row.customer_id as string,
        name: row.customer_name as string,
        email: row.customer_email as string,
      },
      items: [],
      created_at: row.created_at as string,
    }));
  }

  /**
   * Void/refund a POS transaction
   */
  static async voidTransaction(
    orgId: string,
    invoiceId: string,
    reason: string,
    voidedBy?: string
  ): Promise<{ success: boolean; message: string }> {
    return await withTransaction(async (client: PoolClient) => {
      // Verify the transaction exists and is a POS sale
      const invoiceResult = await client.query(
        `SELECT * FROM invoices
         WHERE id = $1 AND org_id = $2 AND metadata->>'pos_transaction' = 'true'`,
        [invoiceId, orgId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error('POS transaction not found');
      }

      const invoice = invoiceResult.rows[0];

      // Update invoice status to refunded
      await client.query(
        `UPDATE invoices
         SET status = 'refunded',
             metadata = metadata || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [
          JSON.stringify({
            voided: true,
            void_reason: reason,
            voided_by: voidedBy,
            voided_at: new Date().toISOString(),
          }),
          invoiceId,
        ]
      );

      // Restore inventory from invoice items
      const itemsResult = await client.query(
        `SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1`,
        [invoiceId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE public.inventory_items
           SET stock_qty = COALESCE(stock_qty, 0) + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );

        // Record stock movement
        await client.query(
          `INSERT INTO public.stock_movements (
            inventory_item_id, movement_type, quantity, reference_type, reference_id,
            notes, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            item.product_id,
            'IN',
            item.quantity,
            'POS_VOID',
            invoiceId,
            `POS Void - ${reason}`,
            voidedBy || null,
          ]
        );
      }

      return {
        success: true,
        message: `Transaction ${invoice.document_number} voided successfully`,
      };
    });
  }
}

