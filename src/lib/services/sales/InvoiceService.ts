/**
 * Invoice Service
 *
 * Handles CRUD operations for invoices
 */

import { query } from '@/lib/database/unified-connection';
import { DocumentNumberingService } from './DocumentNumberingService';

export interface Invoice {
  id: string;
  org_id: string;
  customer_id: string;
  sales_order_id?: string | null;
  proforma_invoice_id?: string | null;
  document_number: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'refunded';
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  due_date?: string | null;
  paid_at?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string | null;
  supplier_product_id?: string | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  line_number?: number | null;
  metadata?: Record<string, unknown>;
}

export interface InvoiceInsert {
  org_id: string;
  customer_id: string;
  sales_order_id?: string | null;
  proforma_invoice_id?: string | null;
  document_number?: string;
  status?: Invoice['status'];
  currency?: string;
  due_date?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

export interface InvoiceUpdate {
  status?: Invoice['status'];
  currency?: string;
  amount_paid?: number;
  due_date?: string | null;
  paid_at?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  updated_by?: string | null;
  items?: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

export class InvoiceService {
  static async getInvoices(
    orgId: string,
    limit = 50,
    offset = 0,
    filters?: { status?: string; customer_id?: string; sales_order_id?: string; overdue?: boolean }
  ): Promise<{ data: Invoice[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.customer_id) {
        conditions.push(`customer_id = $${paramIndex}`);
        params.push(filters.customer_id);
        paramIndex++;
      }

      if (filters?.sales_order_id) {
        conditions.push(`sales_order_id = $${paramIndex}`);
        params.push(filters.sales_order_id);
        paramIndex++;
      }

      if (filters?.overdue) {
        conditions.push(`status IN ('sent', 'partially_paid') AND due_date < CURRENT_DATE`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM invoices ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get invoices
      params.push(limit, offset);
      const result = await query<Invoice>(
        `SELECT * FROM invoices
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  static async getInvoiceById(id: string, orgId: string): Promise<Invoice | null> {
    try {
      const result = await query<Invoice>(
        'SELECT * FROM invoices WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  static async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    try {
      const result = await query<InvoiceItem>(
        'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY line_number, id',
        [invoiceId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      throw error;
    }
  }

  static async createInvoice(data: InvoiceInsert): Promise<Invoice> {
    try {
      // Generate document number if not provided
      let documentNumber = data.document_number;
      if (!documentNumber) {
        documentNumber = await DocumentNumberingService.generateDocumentNumber(data.org_id, 'INV');
      }

      // Insert invoice
      const invoiceResult = await query<Invoice>(
        `INSERT INTO invoices (
          org_id, customer_id, sales_order_id, proforma_invoice_id, document_number, status, currency,
          due_date, reference_number, notes, billing_address, shipping_address, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          data.org_id,
          data.customer_id,
          data.sales_order_id || null,
          data.proforma_invoice_id || null,
          documentNumber,
          data.status || 'draft',
          data.currency || 'USD',
          data.due_date || null,
          data.reference_number || null,
          data.notes || null,
          data.billing_address ? JSON.stringify(data.billing_address) : '{}',
          data.shipping_address ? JSON.stringify(data.shipping_address) : '{}',
          data.metadata ? JSON.stringify(data.metadata) : '{}',
          data.created_by || null,
        ]
      );

      const invoice = invoiceResult.rows[0];

      // Insert items
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          await query(
            `INSERT INTO invoice_items (
              invoice_id, product_id, supplier_product_id, sku, name, description,
              quantity, unit_price, tax_rate, tax_amount, subtotal, total, line_number, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              invoice.id,
              item.product_id || null,
              item.supplier_product_id || null,
              item.sku || null,
              item.name,
              item.description || null,
              item.quantity,
              item.unit_price,
              item.tax_rate || 0,
              item.tax_amount || 0,
              item.subtotal,
              item.total,
              item.line_number || i + 1,
              item.metadata ? JSON.stringify(item.metadata) : '{}',
            ]
          );
        }
      }

      // Totals are calculated by trigger, fetch updated invoice
      const updatedResult = await query<Invoice>(
        'SELECT * FROM invoices WHERE id = $1',
        [invoice.id]
      );

      return updatedResult.rows[0];
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  static async updateInvoice(id: string, orgId: string, updates: InvoiceUpdate): Promise<Invoice> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }

      if (updates.currency !== undefined) {
        setClauses.push(`currency = $${paramIndex}`);
        values.push(updates.currency);
        paramIndex++;
      }

      if (updates.amount_paid !== undefined) {
        setClauses.push(`amount_paid = $${paramIndex}`);
        values.push(updates.amount_paid);
        paramIndex++;
      }

      if (updates.due_date !== undefined) {
        setClauses.push(`due_date = $${paramIndex}`);
        values.push(updates.due_date);
        paramIndex++;
      }

      if (updates.paid_at !== undefined) {
        setClauses.push(`paid_at = $${paramIndex}`);
        values.push(updates.paid_at);
        paramIndex++;
      }

      if (updates.reference_number !== undefined) {
        setClauses.push(`reference_number = $${paramIndex}`);
        values.push(updates.reference_number);
        paramIndex++;
      }

      if (updates.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex}`);
        values.push(updates.notes);
        paramIndex++;
      }

      if (updates.billing_address !== undefined) {
        setClauses.push(`billing_address = $${paramIndex}`);
        values.push(JSON.stringify(updates.billing_address));
        paramIndex++;
      }

      if (updates.shipping_address !== undefined) {
        setClauses.push(`shipping_address = $${paramIndex}`);
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
        return (await this.getInvoiceById(id, orgId))!;
      }

      if (setClauses.length > 0) {
        values.push(id, orgId);
        await query(
          `UPDATE invoices
           SET ${setClauses.join(', ')}
           WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}`,
          values
        );
      }

      // Update items if provided
      if (updates.items !== undefined) {
        // Delete existing items
        await query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

        // Insert new items
        for (let i = 0; i < updates.items.length; i++) {
          const item = updates.items[i];
          await query(
            `INSERT INTO invoice_items (
              invoice_id, product_id, supplier_product_id, sku, name, description,
              quantity, unit_price, tax_rate, tax_amount, subtotal, total, line_number, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              id,
              item.product_id || null,
              item.supplier_product_id || null,
              item.sku || null,
              item.name,
              item.description || null,
              item.quantity,
              item.unit_price,
              item.tax_rate || 0,
              item.tax_amount || 0,
              item.subtotal,
              item.total,
              item.line_number || i + 1,
              item.metadata ? JSON.stringify(item.metadata) : '{}',
            ]
          );
        }
      }

      // Recalculate amount_due if amount_paid was updated
      if (updates.amount_paid !== undefined) {
        await query('SELECT calculate_invoice_totals($1)', [id]);
      }

      // Fetch updated invoice
      const updatedResult = await query<Invoice>(
        'SELECT * FROM invoices WHERE id = $1',
        [id]
      );

      return updatedResult.rows[0];
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  static async deleteInvoice(id: string, orgId: string): Promise<void> {
    try {
      const result = await query('DELETE FROM invoices WHERE id = $1 AND org_id = $2', [id, orgId]);

      if (result.rowCount === 0) {
        throw new Error('Invoice not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }
}

